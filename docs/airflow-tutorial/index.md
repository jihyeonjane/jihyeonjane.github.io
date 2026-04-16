# Airflow Tutorial

Apache Airflow는 데이터 파이프라인을 **코드(Python)로 작성하고 스케줄링·모니터링**할 수 있는 대표적인 워크플로우 오케스트레이션 도구입니다.

이 튜토리얼은 **Airflow 3.x**를 기준으로, 기본 개념부터 Operator의 내부 동작과 Custom Operator 제작까지 단계별로 정리합니다.

## 목차

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [Airflow란?](01-what-is-airflow.md) | 개념, 아키텍처, Airflow 3의 변화 |
| 2 | [DAG 작성 기초](02-dag-basics.md) | DAG/Task, schedule, 의존성, XCom, Assets |
| 3 | [Operator 완전정복](03-operators.md) | 개념, 종류, 대표 Operator 상세, TaskFlow API |
| 4 | [Custom Operator 만들기](04-custom-operators.md) | plugins 구조, BaseOperator 상속, 실전 예제 |
| 5 | [Hook & Connection](05-hooks-connections.md) | Hook의 역할, Connection 관리, Custom Hook |

!!! tip "사전 준비"
    - Python 기본 문법 (클래스, 데코레이터, 타입 힌트)
    - 터미널(CLI) 사용 경험
    - Docker / Docker Compose (로컬 실습용)
    - (선택) Kubernetes 기초 — K8s Executor 파트 이해에 도움

!!! info "Airflow 버전 안내"
    이 튜토리얼은 **Airflow 3.0+**을 기준으로 작성되었습니다.
    Airflow 2.x와 차이가 큰 부분(Task SDK, Asset, DAG Versioning, `execution_date` → `logical_date` 등)은 본문에서 별도로 표시합니다.

!!! note "학습 순서 안내"
    Operator 개념(챕터 3)과 Custom Operator(챕터 4)가 이 튜토리얼의 핵심입니다.
    Airflow를 처음 접한다면 1~2장을 꼼꼼히 읽고, 이미 2.x 경험이 있다면 1장의 "Airflow 3에서 달라진 점"만 훑어본 뒤 3장부터 시작해도 좋습니다.
