# MCP Tutorial

MCP(Model Context Protocol)를 처음 접하는 분들을 위한 튜토리얼입니다.
개념 이해부터 직접 서버를 만들어보는 PoC까지, 단계별로 실습할 수 있도록 구성했습니다.

## 목차

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [MCP란?](01-what-is-mcp.md) | MCP 개념, 등장 배경, 기존 방식과의 차이 |
| 2 | [아키텍처](02-architecture.md) | 클라이언트-서버 구조, 프로토콜, 핵심 개념 (Tools, Resources, Prompts) |
| 3 | [개발 환경 설정](03-dev-setup.md) | SDK 설치, 프로젝트 초기화, 디버깅 도구 |
| 4 | [첫 번째 MCP 서버](04-first-server.md) | Tool 정의부터 클라이언트 연동까지 step-by-step |
| 5 | [PoC: 나만의 MCP 서버](05-poc.md) | 실전 유스케이스 — DB 조회 MCP 서버 구축 |

!!! tip "사전 준비"
    - Python 3.10+ 또는 Node.js 18+ 설치
    - LLM 클라이언트 (Claude Desktop, VS Code + Copilot 등)
    - 터미널(CLI) 사용 경험
