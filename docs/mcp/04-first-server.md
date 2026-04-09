# 4. 첫 번째 MCP 서버

이번 챕터에서는 **메모 관리 MCP 서버**를 만듭니다.
Tool, Resource, Prompt를 모두 활용하는 실습입니다.

## 요구사항

| 기능 | MCP 유형 | 설명 |
|------|----------|------|
| 메모 추가 | Tool | 제목과 내용으로 메모 생성 |
| 메모 검색 | Tool | 키워드로 메모 검색 |
| 메모 목록 조회 | Resource | 저장된 전체 메모 목록 |
| 메모 요약 요청 | Prompt | 메모 내용을 요약하는 프롬프트 |

## 전체 코드

=== "Python"

    ```python
    # server.py
    from mcp.server.fastmcp import FastMCP

    mcp = FastMCP("Memo Server")

    # 인메모리 저장소
    memos: dict[str, str] = {}


    # ── Tools ──────────────────────────────────

    @mcp.tool()
    def add_memo(title: str, content: str) -> str:
        """새 메모를 추가합니다."""
        memos[title] = content
        return f"메모 '{title}' 저장 완료 (총 {len(memos)}건)"


    @mcp.tool()
    def search_memo(keyword: str) -> str:
        """키워드로 메모를 검색합니다."""
        results = [
            f"- {title}: {content}"
            for title, content in memos.items()
            if keyword.lower() in title.lower()
            or keyword.lower() in content.lower()
        ]
        if not results:
            return f"'{keyword}'에 해당하는 메모가 없습니다."
        return f"검색 결과 ({len(results)}건):\n" + "\n".join(results)


    # ── Resources ──────────────────────────────

    @mcp.resource("memo://list")
    def list_memos() -> str:
        """저장된 전체 메모 목록을 반환합니다."""
        if not memos:
            return "저장된 메모가 없습니다."
        lines = [f"- {title}: {content}" for title, content in memos.items()]
        return f"전체 메모 ({len(memos)}건):\n" + "\n".join(lines)


    # ── Prompts ────────────────────────────────

    @mcp.prompt()
    def summarize_memos() -> str:
        """저장된 메모들을 요약하는 프롬프트를 생성합니다."""
        if not memos:
            return "요약할 메모가 없습니다."
        memo_text = "\n".join(
            f"## {title}\n{content}" for title, content in memos.items()
        )
        return f"다음 메모들을 핵심만 간결하게 요약해주세요:\n\n{memo_text}"


    # ── 실행 ───────────────────────────────────

    if __name__ == "__main__":
        mcp.run()
    ```

=== "TypeScript"

    ```typescript
    // src/index.ts
    import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
    import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
    import { z } from "zod";

    const server = new McpServer({
      name: "Memo Server",
      version: "1.0.0",
    });

    // 인메모리 저장소
    const memos = new Map<string, string>();

    // ── Tools ──────────────────────────────────

    server.tool(
      "add_memo",
      "새 메모를 추가합니다.",
      { title: z.string(), content: z.string() },
      async ({ title, content }) => {
        memos.set(title, content);
        return {
          content: [{
            type: "text",
            text: `메모 '${title}' 저장 완료 (총 ${memos.size}건)`,
          }],
        };
      }
    );

    server.tool(
      "search_memo",
      "키워드로 메모를 검색합니다.",
      { keyword: z.string() },
      async ({ keyword }) => {
        const results: string[] = [];
        const kw = keyword.toLowerCase();
        for (const [title, content] of memos) {
          if (title.toLowerCase().includes(kw) || content.toLowerCase().includes(kw)) {
            results.push(`- ${title}: ${content}`);
          }
        }
        const text = results.length === 0
          ? `'${keyword}'에 해당하는 메모가 없습니다.`
          : `검색 결과 (${results.length}건):\n${results.join("\n")}`;
        return { content: [{ type: "text", text }] };
      }
    );

    // ── Resources ──────────────────────────────

    server.resource(
      "memo-list",
      "memo://list",
      async (uri) => {
        const lines = [...memos.entries()].map(([t, c]) => `- ${t}: ${c}`);
        const text = lines.length === 0
          ? "저장된 메모가 없습니다."
          : `전체 메모 (${lines.length}건):\n${lines.join("\n")}`;
        return { contents: [{ uri: uri.href, text, mimeType: "text/plain" }] };
      }
    );

    // ── 실행 ───────────────────────────────────

    const transport = new StdioServerTransport();
    await server.connect(transport);
    ```

## 코드 해설

### 1. 서버 초기화

```python
mcp = FastMCP("Memo Server")
```

서버 이름은 클라이언트에서 이 서버를 식별하는 데 사용됩니다.

### 2. Tool 정의

```python
@mcp.tool()
def add_memo(title: str, content: str) -> str:
    """새 메모를 추가합니다."""
```

- **데코레이터** `@mcp.tool()`로 함수를 Tool로 등록
- **docstring**이 Tool의 설명이 됨 → LLM이 이 설명을 보고 호출 여부를 판단
- **타입 힌트**가 파라미터 스키마로 자동 변환

### 3. Resource 정의

```python
@mcp.resource("memo://list")
def list_memos() -> str:
```

- **URI**(`memo://list`)로 리소스를 식별
- 클라이언트가 이 URI를 요청하면 데이터 반환

### 4. Prompt 정의

```python
@mcp.prompt()
def summarize_memos() -> str:
```

- 사용자가 선택할 수 있는 프롬프트 템플릿
- 현재 데이터를 기반으로 동적 프롬프트 생성

## 테스트

### Inspector로 테스트

```bash
mcp dev server.py
```

Inspector에서 순서대로 테스트합니다:

**Step 1 — 메모 추가**

```
Tool: add_memo
Input: { "title": "회의록", "content": "주간 회의 - API 설계 리뷰 완료" }
Output: "메모 '회의록' 저장 완료 (총 1건)"
```

**Step 2 — 메모 추가 (하나 더)**

```
Tool: add_memo
Input: { "title": "할일", "content": "MCP 서버 PoC 진행, 문서 작성" }
Output: "메모 '할일' 저장 완료 (총 2건)"
```

**Step 3 — 검색**

```
Tool: search_memo
Input: { "keyword": "MCP" }
Output: "검색 결과 (1건):
        - 할일: MCP 서버 PoC 진행, 문서 작성"
```

**Step 4 — 리소스 조회**

```
Resource: memo://list
Output: "전체 메모 (2건):
        - 회의록: 주간 회의 - API 설계 리뷰 완료
        - 할일: MCP 서버 PoC 진행, 문서 작성"
```

### Claude Desktop에서 테스트

설정 파일에 서버를 등록한 후:

```
사용자: "오늘 할일 메모해줘 — MCP 서버 PoC 완성하기"
Claude: add_memo Tool을 호출합니다.
        → 메모 '오늘 할일' 저장 완료

사용자: "메모에 MCP 관련 내용 있어?"
Claude: search_memo Tool을 호출합니다.
        → 검색 결과 (1건): 오늘 할일: MCP 서버 PoC 완성하기
```

## 실습 과제

직접 기능을 확장해보세요:

- [ ] `delete_memo` Tool 추가 — 제목으로 메모 삭제
- [ ] `memo://count` Resource 추가 — 총 메모 개수 반환
- [ ] 메모에 태그 기능 추가 — `add_memo(title, content, tags)` 후 태그로 검색

!!! info "다음 챕터"
    실전 유스케이스로 **DB를 조회하는 MCP 서버**를 만들어봅니다.
