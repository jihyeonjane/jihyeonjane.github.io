# Debezium (CDC)

> 목표: **CDC(Change Data Capture)의 개념을 이해하고, Debezium으로 DB 변경 이벤트를 Kafka로 흘려보내는 파이프라인을 직접 실습**

!!! note "선수 지식"
    Debezium은 **Kafka Connect 위에서 동작하는 소스 커넥터**입니다.
    [Kafka 커리큘럼](kafka.md)의 Phase 4까지(특히 Kafka Connect 영상)를 먼저 진행하는 것을 추천합니다.

## Phase 1. CDC 개념

| # | 자료 | 포인트 | 정리 |
|---|------|--------|------|
| 1 | [Debezium 공식 — FAQ (What is CDC?)](https://debezium.io/documentation/faq/) | CDC가 왜 필요한가 — 배치 추출 vs 로그 기반 캡처 | |
| 2 | [Debezium Architecture](https://debezium.io/documentation/reference/stable/architecture.html) | Kafka Connect 기반 구조, 커넥터의 역할 | |
| 3 | (좋은 한국어 개념 영상 찾으면 추가) | binlog/WAL 기반 캡처 원리 | |

## Phase 2. 실습

| # | 자료 | 포인트 | 정리 |
|---|------|--------|------|
| 4 | [Debezium 공식 튜토리얼](https://debezium.io/documentation/reference/stable/tutorial.html) ⭐ | Docker Compose로 MySQL CDC 전체 흐름 실습 | |
| 5 | [MySQL Connector 문서](https://debezium.io/documentation/reference/stable/connectors/mysql.html) | 스냅샷 vs 스트리밍, 이벤트 포맷 | |

## Phase 3. 운영 관점 (실습 후)

| # | 주제 | 포인트 | 정리 |
|---|------|--------|------|
| 6 | 스냅샷 전략 | initial / incremental snapshot — 대용량 테이블 초기 적재 | |
| 7 | 스키마 변경 대응 | DDL 발생 시 이벤트가 어떻게 흘러가나 | |
| 8 | 장애·재시작 | 오프셋 관리, 중복 이벤트와 멱등 처리 | |

---

!!! tip "데이터 엔지니어링 관점 포인트"
    Debezium → Kafka → (Sink) 구조는 배치 ETL을 준실시간으로 바꾸는 대표 패턴입니다.
    실습하면서 "시간 단위 배치 수집을 CDC로 바꾸면 무엇이 달라지나"를
    각 Phase의 정리 글에서 함께 다룰 예정입니다.
