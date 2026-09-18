# Kafka

> 원본 재생목록:
> [JSCODE — Kafka 입문·실전](https://www.youtube.com/playlist?list=PLtUgHNmvcs6p3304vUg6ywvUIAIe5K4WP) (2025.08, 17편) ·
> [데브원영 — 아파치 카프카](https://www.youtube.com/playlist?list=PL3Re5Ri5rZmkY46j6WcJXQYRlDRZSUQ1j) (2019~2023, 26편)

!!! warning "실습 영상 선택 기준 (2026년 기준)"
    데브원영 재생목록의 설치·CLI·애플리케이션 실습 영상(2019~2020)은 **ZooKeeper 기반 Kafka 2.x** 시절 내용입니다.
    Kafka는 4.0(2025)부터 ZooKeeper가 완전히 제거되어(KRaft 전환) 설치·실행 명령이 달라졌기 때문에,
    최신 Kafka로 그대로 따라 하면 명령이 안 맞습니다.
    **환경 구축·기본 실습은 2025년 업로드인 JSCODE 강의를 축으로** 하고,
    데브원영 재생목록에서는 시대를 타지 않는 **개념 영상만 선별**해서 보강합니다.

## Phase 1. 이론 기초 — JSCODE (2025)

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 1 | [1.1 왜 Kafka를 배워야 하나](https://youtu.be/_E6tlgpoJUI) | 3:43 | 도입 | |
| 2 | [1.2 Kafka란? 메시지 큐란?](https://youtu.be/3Dy6CZw0sNM) ⭐ | 13:34 | MQ 개념부터 — 기초 다지기 | |
| 3 | [2.1 Kafka 기본 구조 (Topic, Producer, Consumer)](https://youtu.be/LiU1p4bYpYE) ⭐ | 3:48 | 핵심 구성요소 | |
| 4 | [2.4 어디까지 읽었는지 기억하기 (Consumer Offset)](https://youtu.be/20TUSPCRPxo) ⭐ | 14:02 | 오프셋 — CDC 파이프라인 이해의 핵심 | |

## Phase 2. 개념 심화 — 데브원영 선별 (시대 불문 유효한 것만)

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 5 | [토픽 — 데이터가 저장되는 곳](https://youtu.be/7QfEpRTRdIQ) | 4:22 | 토픽·파티션 구조 | |
| 6 | [Broker, Replication, ISR — 핵심요소 3가지](https://youtu.be/qpEEoGpWVig) ⭐ | 6:33 | 복제와 고가용성 — 운영 관점 필수 | |
| 7 | [프로듀서 개념](https://youtu.be/aAu0FE3nvbk) | 7:27 | acks, key 파티셔닝 | |
| 8 | [컨슈머 개념과 역할](https://youtu.be/rBVCvv9skT4) | 9:56 | 컨슈머 그룹, 리밸런싱 | |
| 9 | [파티셔너의 역할](https://youtu.be/-vKiNUH5OT8) | 4:29 | 어떤 파티션으로 가는가 | |
| 10 | [컨슈머 Lag이란?](https://youtu.be/D7C_CFjrzBk) ⭐ | 3:05 | 파이프라인 모니터링 핵심 지표 | |
| 11 | [Exactly-once 처리 방법](https://youtu.be/d_PaalNcLm8) ⭐ | 3:25 | 2023년 영상 — 멱등성·트랜잭션 프로듀서 | |
| 12 | [기본개념 및 생태계 총정리 (T아카데미)](https://youtu.be/catN_YhV6To) | 36:10 | Phase 1~2 복습 겸 종합 (선택) | |

## Phase 3. 환경 구축과 기본 실습 — JSCODE (2025)

최신 Kafka 기준의 실습. Spring Boot(Java) 예제지만 **흐름을 이해한 뒤 Python(confluent-kafka)으로 똑같이 재현**해 보면 그 자체가 좋은 스터디가 됩니다.

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 13 | [1.3 설치 환경 구성 (feat. EC2)](https://youtu.be/eGXy1r9j3DM) | 3:51 | 환경 준비 | |
| 14 | [1.4 AWS EC2에 Kafka 설치·실행](https://youtu.be/xuTuOWVG93Q) ⭐ | 16:37 | 최신 버전 기준 설치 | |
| 15 | [2.2 토픽 생성·조회·삭제](https://youtu.be/xafTYlirL0Y) ⭐ | 5:26 | CLI 기본기 | |
| 16 | [2.3 메시지 보내고 받기](https://youtu.be/pz51Jz08g98) ⭐ | 10:35 | producer/consumer CLI | |
| 17 | [2.5~2.9 Spring Boot 연동 실습 (5편)](https://youtu.be/WPRpkX4RbbY) | 49:14 | 애플리케이션에서 쓰는 흐름 — Python으로 재현 과제 | |

## Phase 4. 실패 처리와 생태계

| # | 영상 | 길이 | 포인트 | 정리 |
|---|------|------|--------|------|
| 18 | [3.1 실패한 메시지 재시도 (JSCODE)](https://youtu.be/GAd4ptn26Aw) ⭐ | 8:28 | 재시도 설계 | |
| 19 | [3.2~3.3 재시도도 실패한 메시지 보관·사후 처리 (JSCODE, 2편)](https://youtu.be/87XG-c84gno) ⭐ | 14:48 | DLQ 패턴 — 파이프라인 신뢰성의 핵심 | |
| 20 | [Kafka Connect — 데이터 파이프라인을 가장 효율적으로 (데브원영)](https://youtu.be/UURmOj6Eaoo) ⭐ | 7:11 | **[Debezium](debezium.md)의 기반이 되는 프레임워크** | |
| 21 | [Kafka Streams — 실시간 데이터 처리 (데브원영)](https://youtu.be/vKxhPUUEDmM) | 8:31 | 스트림 처리 개요 | |
| 22 | [람다 아키텍처? 카파 아키텍처? (데브원영)](https://youtu.be/U5G-i73Wb6U) ⭐ | 6:46 | 빅데이터 플랫폼 아키텍처 관점 | |

---

!!! info "다음 단계: Debezium"
    Kafka 커리큘럼을 마치면 [Debezium (CDC) 커리큘럼](debezium.md)으로 이어집니다.
    Phase 4의 Kafka Connect 영상이 선수 지식입니다.

## 제외한 영상과 이유

- **데브원영 설치·실행·CLI·앱 개발 실습** (homebrew 설치, AWS 클러스터 설치, T아카데미 CLI/프로듀서/컨슈머/파이프라인 실습 4편, 2019~2020) — ZooKeeper 기반 Kafka 2.x 명령이라 최신 버전과 불일치. 같은 내용을 JSCODE(2025)가 최신 기준으로 커버
- **Burrow (Lag 모니터링 도구)** — Lag 개념 영상으로 충분, 도구는 실제 운영 시점에
- **Confluent Cloud 소개, 책 홍보, Kafka 탄생 스토리** — 교양/홍보성
