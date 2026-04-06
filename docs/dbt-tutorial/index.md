# dbt Tutorial

dbt(data build tool)를 처음 접하는 분들을 위한 튜토리얼입니다.

## 목차

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [dbt란?](01-what-is-dbt.md) | dbt 개념, ETL vs ELT, 왜 사용하는지 |
| 2 | [설치 및 설정](02-setup.md) | dbt 설치, YAML 기초, 핵심 설정 파일 4가지 |
| 3 | [프로젝트 구조](03-project-structure.md) | 디렉토리 구조와 핵심 파일 |
| 4 | [모델 작성](04-models.md) | SQL 모델, ref, source, Jinja 활용 |
| 5 | [Materialization 심화](05-materialization.md) | view vs table vs incremental vs MV 판단 가이드 |
| 6 | [테스트와 문서화](06-tests-and-docs.md) | 데이터 테스트, 문서 생성 |
| 7 | [실전 팁](07-tips.md) | 실무에서 유용한 패턴과 팁 |
| 8 | [데모](07-demo.md) | dbt 명령어 실행 화면 (GIF) |
| 9 | [인터랙티브 데모](08-interactive-demo.md) | 버튼 클릭으로 dbt 명령어 체험 |

!!! tip "사전 준비"
    - SQL 기본 문법 이해
    - 터미널(CLI) 사용 경험
    - Python 설치 (pip 사용)
