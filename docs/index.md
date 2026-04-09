# Welcome

안녕하세요! **Jane의 기술 블로그**에 오신 것을 환영합니다.

Data Engineering과 SRE 관련 기술 자료를 공유합니다.

---

## Contents

### :material-database: dbt Tutorial

dbt(data build tool) 학습 자료입니다. 설치부터 실전 활용까지 단계별로 정리했습니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [dbt란?](dbt-tutorial/01-what-is-dbt.md) | dbt 개념, ETL vs ELT, 왜 사용하는지 |
| 2 | [설치 및 설정](dbt-tutorial/02-setup.md) | dbt 설치, YAML 기초, 핵심 설정 파일 4가지 |
| 3 | [프로젝트 구조](dbt-tutorial/03-project-structure.md) | 디렉토리 구조와 핵심 파일 |
| 4 | [모델 작성](dbt-tutorial/04-models.md) | SQL 모델, ref, source, Jinja 활용 |
| 5 | [Materialization 심화](dbt-tutorial/05-materialization.md) | view vs table vs incremental vs MV 판단 가이드 |
| 6 | [테스트와 문서화](dbt-tutorial/06-tests-and-docs.md) | 데이터 테스트, 문서 생성 |
| 7 | [실전 팁](dbt-tutorial/07-tips.md) | 실무에서 유용한 패턴과 팁 |
| 8 | [데모](dbt-tutorial/07-demo.md) | dbt 명령어 실행 화면 (GIF) |
| 9 | [인터랙티브 데모](dbt-tutorial/08-interactive-demo.md) | 버튼 클릭으로 dbt 명령어 체험 |
| 10 | [dbt에서 Semantic Layer까지](dbt-tutorial/09-semantic-layer.md) | 왜 dbt가 Semantic Layer, Ontology로 이어지는가 |

---

### :material-connection: MCP Tutorial

MCP(Model Context Protocol) 학습 자료입니다. 개념 이해부터 PoC까지 단계별로 정리했습니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [MCP란?](mcp/01-what-is-mcp.md) | MCP 개념, 등장 배경, 기존 방식과의 차이 |
| 2 | [아키텍처](mcp/02-architecture.md) | 클라이언트-서버 구조, Tools/Resources/Prompts |
| 3 | [개발 환경 설정](mcp/03-dev-setup.md) | SDK 설치, 프로젝트 초기화, Inspector |
| 4 | [첫 번째 MCP 서버](mcp/04-first-server.md) | 메모 관리 서버 — Tool/Resource/Prompt 실습 |
| 5 | [PoC: DB 조회 서버](mcp/05-poc.md) | SQLite 조회 MCP 서버 구축 |
