# 개발자 개념 장착

> 원본 재생목록: [개발자 개념 장착](https://www.youtube.com/playlist?list=PLhS_f8MeNY1nAE7iGvt6H6evycD_NRC4H) (전체 50편 중 28편 선별)

CS 기초 → 데이터베이스 → 분산 시스템 → 인프라 순으로 재배열한 커리큘럼입니다.
⭐ 표시는 데이터 엔지니어링 업무와 직결되는 우선 시청 추천 영상입니다.

## Module 1. 숫자 감각 — 성능을 가늠하는 기초 체력

레이턴시·처리량 감각은 파이프라인 병목을 판단하는 기본기입니다.

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 1 | [개발자가 알아야 할 숫자들](https://youtu.be/WbzMtyyOQpM) ⭐ | 19:16 | 레이턴시 수치 감각 — ETL 병목 추정의 기초 | |
| 2 | [메모리·SSD·HDD 레이턴시](https://youtu.be/jNwI1ABWmbQ) | 5:11 | 저장 계층별 속도 차이 — 캐시/스토리지 선택 근거 | |
| 3 | [속도(Time)와 용량(Volume)을 혼동하지 마라](https://youtu.be/63_ApTsEHhU) | 10:51 | 처리량 vs 지연시간 구분 | |
| 4 | [코드리뷰에서 "이거 O(N²)인데요" 들어봤나요?](https://youtu.be/YUM6PYeI5cc) | 9:34 | 시간복잡도 실전 감각 | |
| 5 | [습관적으로 쓰는 INT, 오버플로우 날 수 있다](https://youtu.be/KTPNTWn-uKE) | 7:55 | 데이터 타입 설계 — 테이블 스키마에 바로 적용 | |

## Module 2. 프로세스와 동시성

Spark executor, Airflow worker가 왜 그렇게 동작하는지 이해하는 바탕입니다.

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 6 | [프로세스 vs 스레드 — 메모리 구조 관점](https://youtu.be/gQ4c6IzhU9Q) ⭐ | 7:21 | Spark/Airflow 워커 모델 이해의 기초 | |
| 7 | [동시성과 병렬성](https://youtu.be/qCW-N-B7Mgc) | 7:21 | 분산 처리의 핵심 구분 | |
| 8 | [비동기 프로그래밍은 왜 쓰나](https://youtu.be/SI5CLk-fXFU) | 8:38 | Airflow deferrable, API 서버 이해에 필요 | |

## Module 3. 데이터베이스 핵심

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 9 | [트랜잭션 ACID](https://youtu.be/Jh8kG0aDG3c) ⭐ | 5:54 | 모든 DB 논의의 출발점 | |
| 10 | [트랜잭션 격리수준 4단계 완전 이해](https://youtu.be/yWO13BNyuw4) ⭐ | 12:19 | Dirty Read 등 — 정합성 이슈 디버깅에 직결 | |
| 11 | [DB 복구 메커니즘: Redo와 Undo](https://youtu.be/bhYE4hZY-NE) | 7:07 | WAL 개념 — Iceberg/Delta 로그 이해로 연결 | |
| 12 | [RDB 정규화 제대로 정리](https://youtu.be/KDkPizapEAA) | 8:36 | 정규화 개념 | |
| 13 | [1·2·3 정규화 8분 정리](https://youtu.be/tyBSrMhJtDY) | 8:52 | DW 모델링(비정규화)과 비교하며 보기 | |
| 14 | [비관적 락 vs 낙관적 락](https://youtu.be/oJrVl6QKzHw) | 5:31 | Iceberg의 낙관적 동시성 제어 이해의 바탕 | |
| 15 | [라이브락 — 락은 데드락만 있는 게 아니다](https://youtu.be/vS1orC3pmZU) | 9:07 | 락 심화 | |
| 16 | [실무에서는 이렇게 선택합니다. SQL vs NoSQL](https://youtu.be/ge5duJS0tms) ⭐ | 7:16 | 저장소 선택 기준 | |
| 17 | [읽기 성능과 쓰기 성능을 구분해서 설명하라](https://youtu.be/LGlsqP-dOGU) ⭐ | 12:45 | OLTP vs OLAP 감각 — ClickHouse가 왜 빠른지로 연결 | |

## Module 4. 대용량 데이터와 분산 시스템 ⭐ 최우선

데이터 엔지니어링 업무와 가장 직결되는 모듈입니다.

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 18 | [대량 데이터를 나누는 기술, 파티셔닝과 샤딩](https://youtu.be/lVRJv4qVWFo) ⭐ | 7:46 | Hive/Iceberg 파티션, ClickHouse 샤딩과 직결 | |
| 19 | [대규모 데이터 확장 전략: 샤딩과 리플리케이션](https://youtu.be/_N8THUCBX_w) ⭐ | 9:36 | ClickHouse 클러스터 구성의 이론 배경 | |
| 20 | [대규모 분산 시스템의 일관성 설계](https://youtu.be/UsTPRQ-nahY) ⭐ | 7:13 | 최종 일관성 — 분산 저장소 동작 이해 | |
| 21 | [JOIN이 더는 안 될 때, CQRS](https://youtu.be/FIZpKju2qLk) | 7:28 | 읽기/쓰기 분리 — DW·마트 분리와 같은 사상 | |
| 22 | [성능 튜닝의 양대 산맥: 캐시와 MQ](https://youtu.be/dVCB5jQAYMA) ⭐ | 6:58 | Kafka/Redis가 파이프라인에서 하는 역할 | |
| 23 | [이중 결제를 막자. 멱등키를 기억하라](https://youtu.be/lkc2JhJivGo) ⭐ | 4:31 | 멱등성 — ETL 재실행 설계의 핵심 개념 | |

## Module 5. 인프라·통신 기초 — 툴 만들기 대비

사내 데이터 툴(서버가 있는 무언가)을 기획할 때 필요한 최소한의 서버 지식입니다.

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 24 | [Docker와 VM, 실무에서는 이렇게 나눠 씁니다](https://youtu.be/0ToqmwZ-n3M) | 5:56 | K8s 튜토리얼 복습 겸 | |
| 25 | [Tier와 Layer의 차이](https://youtu.be/tLQ9xr0SyYc) | 5:32 | 아키텍처 용어 기초 | |
| 26 | [모듈러 모놀리스로 시작하라](https://youtu.be/3UJhhMultL4) ⭐ | 5:43 | 사내 툴 첫 구조로 유력한 선택지 | |
| 27 | [폴링, 롱폴링, SSE, 웹소켓](https://youtu.be/Xq3PmcK52vI) | 11:00 | 툴의 실시간 갱신(잡 상태 표시 등) 설계 시 필요 | |
| 28 | [쿠키, 세션, JWT — HTTP 상태 관리의 진화](https://youtu.be/lggnXKm-RyY) | 13:23 | 툴에 로그인 붙일 때 필요 | |

---

## 제외한 영상과 이유

- **Redis 실무 시리즈** (키 설계, 메시징, VS Code 확장 등 5편) — Redis를 직접 운영하게 되면 그때 추가
- **MSA 심화** (서비스 디스커버리, 서킷 브레이커, API 게이트웨이) — [아키텍처 커리큘럼](architecture.md)과 겹쳐서 그쪽에서 다룸
- **웹 역사/교양** (웹은 누가 만들었나, 사라진 웹 기술 등) — 재미용
- **면접 대비성** (일반화 vs 추상화 등) — 당장 목표와 무관
- **연속재생 몰아보기 3편** — 개별 영상과 내용 중복
- **Python List/Tuple 2편** — 유용하지만 이미 아는 내용일 가능성이 높아 보류. 필요하면 [List](https://youtu.be/xe7ufckTpkQ) / [Tuple](https://youtu.be/pVXYni2YbhU)
