# 3. 개발 환경 설정

## SDK 선택

MCP 서버는 **Python** 또는 **TypeScript**로 개발할 수 있습니다.

=== "Python (권장)"

    ```bash
    # Python 3.10 이상 필요
    python --version

    # uv 설치 (패키지 매니저 — pip보다 빠름)
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

=== "TypeScript"

    ```bash
    # Node.js 18 이상 필요
    node --version

    # npm 또는 npx 사용
    npm --version
    ```

## 프로젝트 초기화

=== "Python"

    ```bash
    # 프로젝트 디렉토리 생성
    mkdir my-mcp-server && cd my-mcp-server

    # uv로 프로젝트 초기화
    uv init

    # MCP SDK 설치
    uv add "mcp[cli]"
    ```

    설치 후 프로젝트 구조:

    ```
    my-mcp-server/
    ├── pyproject.toml      # 프로젝트 설정 + 의존성
    ├── .python-version     # Python 버전
    └── main.py             # 서버 코드 (직접 생성)
    ```

=== "TypeScript"

    ```bash
    # 프로젝트 디렉토리 생성
    mkdir my-mcp-server && cd my-mcp-server

    # npm 초기화
    npm init -y

    # MCP SDK 설치
    npm install @modelcontextprotocol/sdk
    npm install -D typescript @types/node

    # TypeScript 초기화
    npx tsc --init
    ```

    설치 후 프로젝트 구조:

    ```
    my-mcp-server/
    ├── package.json
    ├── tsconfig.json
    ├── node_modules/
    └── src/
        └── index.ts        # 서버 코드 (직접 생성)
    ```

## 최소 서버 코드

설치 확인을 위한 "Hello World" MCP 서버입니다.

=== "Python"

    ```python
    # main.py
    from mcp.server.fastmcp import FastMCP

    # 서버 인스턴스 생성
    mcp = FastMCP("My First Server")

    # 간단한 Tool 정의
    @mcp.tool()
    def hello(name: str) -> str:
        """인사를 합니다."""
        return f"안녕하세요, {name}님!"

    # 서버 실행
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
      name: "My First Server",
      version: "1.0.0",
    });

    // 간단한 Tool 정의
    server.tool(
      "hello",
      "인사를 합니다.",
      { name: z.string() },
      async ({ name }) => ({
        content: [{ type: "text", text: `안녕하세요, ${name}님!` }],
      })
    );

    // 서버 실행
    const transport = new StdioServerTransport();
    await server.connect(transport);
    ```

## 동작 확인 — MCP Inspector

**MCP Inspector**는 서버를 테스트할 수 있는 웹 기반 디버깅 도구입니다.

=== "Python"

    ```bash
    # Inspector로 서버 실행
    mcp dev main.py
    ```

=== "TypeScript"

    ```bash
    npx @modelcontextprotocol/inspector node dist/index.js
    ```

브라우저에서 Inspector가 열리면:

1. **Tools** 탭 클릭
2. `hello` Tool 확인
3. `name` 파라미터에 값 입력 후 **Run** 클릭
4. 결과 확인

```
입력:  { "name": "Jane" }
출력:  "안녕하세요, Jane님!"
```

!!! tip "Inspector 활용"
    개발 중 Tool의 입출력을 바로 확인할 수 있어,
    LLM 클라이언트에 연결하기 전에 서버 동작을 검증하기 좋습니다.

## Claude Desktop 연동

서버가 동작하면, Claude Desktop에 연결해봅니다.

**1. 설정 파일 열기**

```bash
# macOS
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**2. 서버 등록**

=== "Python"

    ```json
    {
      "mcpServers": {
        "my-first-server": {
          "command": "uv",
          "args": ["run", "--directory", "/path/to/my-mcp-server", "main.py"]
        }
      }
    }
    ```

=== "TypeScript"

    ```json
    {
      "mcpServers": {
        "my-first-server": {
          "command": "node",
          "args": ["/path/to/my-mcp-server/dist/index.js"]
        }
      }
    }
    ```

**3. Claude Desktop 재시작**

재시작 후 채팅 입력란 옆에 **도구 아이콘**이 표시되면 연동 성공입니다.

```
사용자: "Jane에게 인사해줘"
Claude: hello Tool을 호출하겠습니다.
        → "안녕하세요, Jane님!"
```

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 도구 아이콘이 안 보임 | 설정 파일 경로 또는 JSON 문법 오류 | `claude_desktop_config.json` 재확인 |
| 서버 시작 실패 | Python/Node 경로 문제 | `command`에 절대 경로 사용 (예: `/usr/local/bin/uv`) |
| Tool 호출 시 에러 | 서버 코드 오류 | `mcp dev`로 먼저 테스트 |
| Inspector 접속 안 됨 | 포트 충돌 | `mcp dev main.py --port 6274` |

!!! info "다음 챕터"
    환경이 준비되었으니, **본격적인 MCP 서버**를 만들어봅시다.
