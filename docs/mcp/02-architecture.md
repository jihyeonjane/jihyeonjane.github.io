# 2. 아키텍처

## 전체 구조

MCP는 **클라이언트-서버** 아키텍처를 따릅니다.

```
┌──────────────────────────────────────────────────────┐
│                    MCP Host                           │
│  (Claude Desktop, IDE, 커스텀 앱 등)                    │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ MCP Client  │  │ MCP Client  │  │ MCP Client  │   │
│  │     A        │  │     B        │  │     C        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼──────────┘
          │                │                │
     ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
     │   MCP   │     │   MCP   │     │   MCP   │
     │ Server  │     │ Server  │     │ Server  │
     │  (DB)   │     │ (Slack) │     │ (Files) │
     └────┬────┘     └────┬────┘     └────┬────┘
          │                │                │
     ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
     │Database │     │Slack API│     │  Local   │
     │         │     │         │     │  Files   │
     └─────────┘     └─────────┘     └─────────┘
```

### 구성 요소

| 구성 요소 | 역할 | 예시 |
|-----------|------|------|
| **Host** | MCP 클라이언트를 실행하는 애플리케이션 | Claude Desktop, VS Code, 커스텀 앱 |
| **Client** | 서버와 1:1 연결을 유지하는 프로토콜 클라이언트 | Host 내부에서 자동 관리 |
| **Server** | 특정 기능을 제공하는 경량 프로그램 | DB 조회 서버, 파일 검색 서버 등 |

## 통신 방식 (Transport)

MCP는 두 가지 통신 방식을 지원합니다.

### 1. stdio (Standard I/O)

```
Host ──stdin/stdout──▶ Server (로컬 프로세스)
```

- 서버를 **로컬 자식 프로세스**로 실행
- stdin/stdout을 통해 JSON-RPC 메시지 교환
- 별도 네트워크 설정 불필요

!!! tip "언제 사용?"
    로컬 개발, CLI 도구, 데스크톱 앱 연동 시 가장 간편합니다.

### 2. SSE (Server-Sent Events) / Streamable HTTP

```
Host ──HTTP──▶ Server (원격 또는 로컬 HTTP 서버)
```

- HTTP 기반 통신
- 원격 서버 연결 가능
- 여러 클라이언트가 하나의 서버에 연결 가능

!!! tip "언제 사용?"
    원격 서버, 팀 공유 서버, 프로덕션 환경에서 사용합니다.

## 핵심 개념 3가지

MCP 서버는 세 가지 유형의 기능을 제공할 수 있습니다.

### Tools (도구)

> LLM이 **호출**할 수 있는 함수

- LLM이 판단하여 자동으로 호출
- 입력 파라미터와 반환값이 정의됨
- **실행(Action)** 중심

```python
# 예시: 날씨 조회 Tool
@server.tool()
async def get_weather(city: str) -> str:
    """주어진 도시의 현재 날씨를 조회합니다."""
    result = await fetch_weather_api(city)
    return f"{city}: {result['temp']}°C, {result['condition']}"
```

### Resources (리소스)

> LLM이 **읽을** 수 있는 데이터

- 파일, DB 레코드, API 응답 등 구조화된 데이터
- URI로 식별 (`file:///path`, `db://table/id` 등)
- **데이터 제공** 중심

```python
# 예시: 설정 파일 Resource
@server.resource("config://app")
async def get_config() -> str:
    """애플리케이션 설정 정보를 반환합니다."""
    with open("config.yaml") as f:
        return f.read()
```

### Prompts (프롬프트)

> **재사용 가능한 프롬프트 템플릿**

- 자주 쓰는 질문/지시 패턴을 미리 정의
- 사용자가 선택하여 LLM에 전달
- **UX 편의** 중심

```python
# 예시: 코드 리뷰 Prompt
@server.prompt()
async def code_review(language: str) -> str:
    """코드 리뷰 프롬프트를 생성합니다."""
    return f"""
    다음 {language} 코드를 리뷰해주세요.
    - 버그 가능성
    - 성능 개선점
    - 코드 스타일
    """
```

### 비교 정리

| | Tools | Resources | Prompts |
|---|---|---|---|
| **주체** | LLM이 호출 | 앱/사용자가 요청 | 사용자가 선택 |
| **방향** | 실행 (Action) | 조회 (Read) | 입력 (Template) |
| **비유** | 리모컨 버튼 | 책장의 책 | 매크로 단축키 |

## 메시지 흐름

실제로 Tool이 호출되는 과정을 살펴봅니다.

```
1. 사용자 → Host:  "서울 날씨 알려줘"
2. Host → LLM:     사용자 메시지 + 사용 가능한 Tool 목록 전달
3. LLM → Host:     "get_weather(city='Seoul') 호출 필요" 판단
4. Host → Client:  Tool 호출 요청
5. Client → Server: JSON-RPC 요청 전송
6. Server:          실제 API 호출 후 결과 반환
7. Server → Client: 결과 응답
8. Client → Host:   결과 전달
9. Host → LLM:      Tool 결과를 컨텍스트에 추가
10. LLM → 사용자:    "서울의 현재 기온은 18°C입니다."
```

!!! info "포인트"
    LLM은 직접 외부 API를 호출하지 않습니다.
    **MCP 서버가 대신 호출**하고, 결과만 LLM에게 전달합니다.

## 다음 단계

아키텍처를 이해했으니, 이제 **직접 개발 환경을 설정**해봅시다.
