# [참고] ClickHouse 구조의 이해

dbt에서 ClickHouse를 사용할 때 알아야 할 핵심 아키텍처 개념을 정리합니다.

---

## 1. ClickHouse란?

> **"엄청 많은 데이터를 엄청 빠르게 읽는 데 특화된 DB"**

일반적인 서비스용 RDB와 ClickHouse는 목적 자체가 다릅니다.

| 구분 | 일반 RDB (PostgreSQL, MySQL) | ClickHouse |
|------|------------------------------|------------|
| **저장 방식** | Row 기반 (행 단위 저장) | Column 기반 (열 단위 저장) |
| **강점** | 쓰기 (INSERT/UPDATE/DELETE) | 읽기 (SELECT, 집계) |
| **주 용도** | 서비스 DB (사용자 요청 처리) | 분석 DB (대규모 데이터 집계) |
| **비유** | 편의점 (소량 다품종, 빠른 출입) | 대형 창고 (대량 보관, 한번에 꺼내기) |
| **행 수정** | 빠름 (개별 행 접근 최적화) | 느림 (컬럼 단위라 행 수정 비효율) |
| **집계 쿼리** | 느림 (모든 컬럼 읽어야 함) | 빠름 (필요 컬럼만 읽음) |

!!! tip "왜 dbt + ClickHouse인가?"
    dbt는 SELECT 기반 변환 도구이고, ClickHouse는 SELECT(읽기)에 최적화된 DB입니다.
    **"읽기 특화 도구 + 읽기 특화 DB"** 조합이라 궁합이 좋습니다.

---

## 2. ClickHouse 클러스터 구조

ClickHouse는 단일 서버로도 빠르지만, 대규모 데이터를 처리할 때는 **클러스터**로 구성합니다.

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **Shard (샤드)** | 데이터를 여러 노드에 나눠 저장 (수평 확장) |
| **Replica (레플리카)** | 같은 데이터를 여러 노드에 복제 (고가용성) |
| **Distributed Table** | 모든 샤드를 묶어서 조회하는 가상 테이블 |

### INSERT 데이터 분배 과정

아래 애니메이션은 자동으로 반복됩니다. 6명의 사용자 데이터가 shard key(`user_id % 2`)에 따라 각 Shard의 Replica로 분배되는 과정을 보여줍니다.

<div class="ch-anim" markdown="0">
  <div class="ch-anim-title">INSERT 시 데이터 분배 흐름 (자동 반복)</div>
  <div class="ch-anim-client">
    <div class="ch-anim-client-box">💻 INSERT INTO users VALUES (...) — shard_key: user_id % 2</div>
  </div>
  <div class="ch-anim-packets">
    <div class="ch-packet ch-packet-s2">user_id=1 alice → 홀수</div>
    <div class="ch-packet ch-packet-s1">user_id=2 bob → 짝수</div>
    <div class="ch-packet ch-packet-s2">user_id=3 charlie → 홀수</div>
    <div class="ch-packet ch-packet-s1">user_id=4 dave → 짝수</div>
    <div class="ch-packet ch-packet-s2">user_id=5 eve → 홀수</div>
    <div class="ch-packet ch-packet-s1">user_id=6 frank → 짝수</div>
  </div>
  <div class="ch-anim-shards">
    <div class="ch-anim-shard ch-anim-shard1">
      <div class="ch-anim-shard-title">Shard 1 (짝수: user_id % 2 = 0)</div>
      <div class="ch-anim-replicas">
        <div class="ch-anim-replica">
          <div class="ch-anim-replica-title">Replica A</div>
          <div class="ch-anim-row">bob (id=2)</div>
          <div class="ch-anim-row">dave (id=4)</div>
          <div class="ch-anim-row">frank (id=6)</div>
        </div>
        <div class="ch-anim-sync">
          <div class="ch-anim-sync-arrow">⟷ sync</div>
        </div>
        <div class="ch-anim-replica">
          <div class="ch-anim-replica-title">Replica B</div>
          <div class="ch-anim-row">bob (id=2)</div>
          <div class="ch-anim-row">dave (id=4)</div>
          <div class="ch-anim-row">frank (id=6)</div>
        </div>
      </div>
    </div>
    <div class="ch-anim-shard ch-anim-shard2">
      <div class="ch-anim-shard-title">Shard 2 (홀수: user_id % 2 = 1)</div>
      <div class="ch-anim-replicas">
        <div class="ch-anim-replica">
          <div class="ch-anim-replica-title">Replica A</div>
          <div class="ch-anim-row">alice (id=1)</div>
          <div class="ch-anim-row">charlie (id=3)</div>
          <div class="ch-anim-row">eve (id=5)</div>
        </div>
        <div class="ch-anim-sync">
          <div class="ch-anim-sync-arrow">⟷ sync</div>
        </div>
        <div class="ch-anim-replica">
          <div class="ch-anim-replica-title">Replica B</div>
          <div class="ch-anim-row">alice (id=1)</div>
          <div class="ch-anim-row">charlie (id=3)</div>
          <div class="ch-anim-row">eve (id=5)</div>
        </div>
      </div>
    </div>
  </div>
  <div class="ch-anim-legend">
    <div class="ch-anim-legend-item"><strong>Shard</strong>: 데이터를 나눠 저장 (수평 확장)</div>
    <div class="ch-anim-legend-item"><strong>Replica</strong>: 같은 데이터 복제 (장애 대비)</div>
    <div class="ch-anim-legend-item"><strong>sync</strong>: Replica 간 자동 동기화</div>
  </div>
</div>

### 전체 구조 다이어그램

<div class="ch-diagram" markdown="0">
  <div class="ch-title">ClickHouse 클러스터 — 2 Shards × 2 Replicas</div>
  <div class="ch-client-box">
    <div class="ch-box-icon">💻</div>
    <div class="ch-box-label">Client / BI 도구</div>
  </div>
  <div class="ch-arrow-down">▼</div>
  <div class="ch-dist-box">
    <div class="ch-box-icon">🔀</div>
    <div class="ch-box-label">Distributed Table</div>
    <div class="ch-box-sub">모든 Shard에 쿼리 분산 (데이터 없음, 라우터 역할)</div>
  </div>
  <div class="ch-arrow-fork">
    <div class="ch-arrow-left">◀──────</div>
    <div class="ch-arrow-right">──────▶</div>
  </div>
  <div class="ch-shards">
    <div class="ch-shard ch-shard1">
      <div class="ch-shard-title">Shard 1 <span class="ch-shard-key">user_id % 2 = 0 (짝수)</span></div>
      <div class="ch-replicas">
        <div class="ch-replica">
          <div class="ch-replica-title">Replica A</div>
          <div class="ch-replica-data">bob (2), dave (4), frank (6)</div>
        </div>
        <div class="ch-sync">⟷ sync</div>
        <div class="ch-replica">
          <div class="ch-replica-title">Replica B</div>
          <div class="ch-replica-data">bob (2), dave (4), frank (6)</div>
        </div>
      </div>
    </div>
    <div class="ch-shard ch-shard2">
      <div class="ch-shard-title">Shard 2 <span class="ch-shard-key">user_id % 2 = 1 (홀수)</span></div>
      <div class="ch-replicas">
        <div class="ch-replica">
          <div class="ch-replica-title">Replica A</div>
          <div class="ch-replica-data">alice (1), charlie (3), eve (5)</div>
        </div>
        <div class="ch-sync">⟷ sync</div>
        <div class="ch-replica">
          <div class="ch-replica-title">Replica B</div>
          <div class="ch-replica-data">alice (1), charlie (3), eve (5)</div>
        </div>
      </div>
    </div>
  </div>
  <div class="ch-diagram-notes">
    <div class="ch-note-item">🟢 <strong>장애 대응</strong>: Replica A가 죽어도 Replica B가 즉시 응답</div>
    <div class="ch-note-item">🔵 <strong>수평 확장</strong>: 데이터가 늘면 Shard를 추가</div>
    <div class="ch-note-item">🟡 <strong>Distributed</strong>: 클라이언트는 샤딩을 의식하지 않고 전체 데이터 조회 가능</div>
  </div>
</div>

### 클러스터 동작 데모

**다음 ▶** 버튼으로 INSERT 데이터 분배와 SELECT 조회 과정을 단계별로 확인하세요.

<div class="flow-demo" id="ch-cluster" data-mode="ch-cluster" markdown="0">
  <div class="flow-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">ClickHouse 클러스터 동작</span>
  </div>
  <div class="flow-panels" style="flex-direction:column;">
    <div class="flow-panel" style="border-right:none;">
      <div class="flow-panel-label" style="background:#89b4fa33;color:#89b4fa;">Client</div>
      <div class="flow-steps" id="ch-cluster-client-steps"></div>
    </div>
    <div style="display:flex; gap:12px; padding:0 12px 12px;">
      <div style="flex:1; background:#181825; border-radius:8px; padding:10px;">
        <div class="flow-panel-label" style="background:#a6e3a133;color:#a6e3a1;">Shard 1 (짝수 user_id)</div>
        <div id="ch-cluster-shard1-area"></div>
        <div style="font-size:10px; color:#6c7086; margin-top:6px;">Replica 1-A, Replica 1-B (자동 동기화)</div>
      </div>
      <div style="flex:1; background:#181825; border-radius:8px; padding:10px;">
        <div class="flow-panel-label" style="background:#f9e2af33;color:#f9e2af;">Shard 2 (홀수 user_id)</div>
        <div id="ch-cluster-shard2-area"></div>
        <div style="font-size:10px; color:#6c7086; margin-top:6px;">Replica 2-A, Replica 2-B (자동 동기화)</div>
      </div>
    </div>
    <div style="padding:0 12px 12px;">
      <div class="flow-panel-label" style="background:#cba6f733;color:#cba6f7;">Distributed Table (쿼리 결과)</div>
      <div id="ch-cluster-result-area"></div>
    </div>
  </div>
  <div class="flow-controls">
    <button class="btn-prev" onclick="chClusterPrev()">◀ 이전</button>
    <button class="btn-next" onclick="chClusterNext()">다음 ▶</button>
    <button class="btn-reset" onclick="chClusterReset()">처음으로</button>
    <span class="flow-step-counter" id="ch-cluster-counter"></span>
    <div class="flow-note" id="ch-cluster-note"></div>
  </div>
</div>

!!! note "Shard Key란?"
    어떤 데이터가 어느 샤드로 갈지 결정하는 기준입니다.
    위 예시에서는 `user_id % 2`를 사용하여 짝수는 Shard 1, 홀수는 Shard 2로 보냅니다.

---

## 3. Local vs Distributed 테이블

ClickHouse에서 "테이블"이라고 불리는 것이 실제로는 3가지 역할로 나뉩니다.

| 종류 | 역할 | 데이터 보유 | 설명 |
|------|------|:-----------:|------|
| **Local Table** | 실제 데이터 저장소 | O | 각 샤드 노드에 실제 데이터가 있음 |
| **Distributed Table** | 라우터 | X | 쿼리를 모든 샤드로 전달하는 가상 테이블 |
| **View (FINAL)** | 중복 제거 래퍼 | X | Distributed + 중복 제거를 감싼 뷰 |

### Local vs Distributed 조회 데모

같은 데이터를 Local / Distributed로 조회하면 결과가 어떻게 달라지는지 확인하세요.

<div class="flow-demo" id="ch-local-dist" data-mode="ch-local-dist" markdown="0">
  <div class="flow-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Local vs Distributed 테이블 조회</span>
  </div>
  <div class="flow-panels" style="flex-direction:column;">
    <div class="flow-panel" style="border-right:none;">
      <div class="flow-panel-label" style="background:#89b4fa33;color:#89b4fa;">Query</div>
      <div class="flow-steps" id="ch-local-dist-query-steps"></div>
    </div>
    <div style="display:flex; gap:12px; padding:0 12px 12px;">
      <div style="flex:1; background:#181825; border-radius:8px; padding:10px;" id="ch-ld-shard1-box">
        <div class="flow-panel-label" style="background:#a6e3a133;color:#a6e3a1;">Shard 1</div>
        <div id="ch-ld-shard1-area"></div>
      </div>
      <div style="flex:1; background:#181825; border-radius:8px; padding:10px;" id="ch-ld-shard2-box">
        <div class="flow-panel-label" style="background:#f9e2af33;color:#f9e2af;">Shard 2</div>
        <div id="ch-ld-shard2-area"></div>
      </div>
    </div>
    <div style="padding:0 12px 12px;">
      <div class="flow-panel-label" style="background:#cba6f733;color:#cba6f7;">조회 결과</div>
      <div id="ch-ld-result-area"></div>
    </div>
  </div>
  <div class="flow-controls">
    <button class="btn-prev" onclick="chLocalDistPrev()">◀ 이전</button>
    <button class="btn-next" onclick="chLocalDistNext()">다음 ▶</button>
    <button class="btn-reset" onclick="chLocalDistReset()">처음으로</button>
    <span class="flow-step-counter" id="ch-local-dist-counter"></span>
    <div class="flow-note" id="ch-local-dist-note"></div>
  </div>
</div>

!!! warning "Local 테이블 직접 조회 주의"
    Local 테이블을 직접 조회하면 **해당 샤드의 데이터만** 보입니다.
    전체 데이터가 필요하면 반드시 Distributed 테이블이나 View를 통해 조회하세요.

---

## 4. ClickHouse Materialized View의 두 종류

ClickHouse의 MV는 일반 DB의 MV와 다릅니다. 그리고 ClickHouse 내에서도 **2가지 종류**가 있습니다.

### Incremental MV (전통적 방식)

```sql
CREATE MATERIALIZED VIEW mv_daily_users
ENGINE = SummingMergeTree()
ORDER BY event_date
AS
SELECT event_date, count() AS user_count
FROM events_local  -- Local 테이블을 소스로 지정
GROUP BY event_date
```

- Source 테이블에 **INSERT가 발생할 때 자동 트리거**
- **새로 들어온 배치(batch)만** 처리 (과거 데이터 재처리 안 함)
- JOIN, Window 함수 등 사용 불가 (배치 단위이므로)
- dbt의 `materialized='materialized_view'`가 이 방식

### Refreshable MV (ClickHouse 23.4+)

```sql
CREATE MATERIALIZED VIEW mv_daily_summary
REFRESH EVERY 1 HOUR
ENGINE = MergeTree()
ORDER BY event_date
AS
SELECT event_date,
       count() AS total_events,
       uniq(user_id) AS unique_users
FROM events_distributed FINAL  -- Distributed + FINAL 사용 가능
GROUP BY event_date
```

- ClickHouse 스케줄러가 **주기적으로 전체 재계산**
- JOIN, FINAL, Window 함수 등 **자유롭게 사용 가능**
- Airflow 없이 ClickHouse 자체적으로 스케줄링
- dbt에서 직접 지원하지 않음 (raw SQL 필요)

### 두 MV 비교

| 구분 | Incremental MV | Refreshable MV |
|------|:-------------:|:--------------:|
| **트리거 방식** | INSERT 이벤트 | 시간 스케줄 |
| **처리 범위** | 새 배치만 | 전체 재계산 |
| **JOIN 지원** | X | O |
| **FINAL 지원** | X | O |
| **Window 함수** | X | O |
| **dbt 지원** | `materialized_view` | 미지원 (raw SQL) |
| **Airflow 필요** | 불필요 | 불필요 |
| **적합한 경우** | 단순 집계, 실시간 | 복잡한 변환, 주기적 |

!!! tip "어떤 MV를 써야 할까?"
    - **단순 집계** (count, sum 등) → Incremental MV
    - **JOIN이나 FINAL이 필요한 복잡한 변환** → Refreshable MV 또는 dbt incremental 모델

---

## 5. dbt 모델의 Input 테이블 선택 가이드

dbt 모델을 작성할 때, ClickHouse의 어떤 테이블을 `FROM`에 써야 할까요?

### 세 가지 테이블 역할 복습

| 테이블 | 역할 | 중복 제거 | 전체 데이터 |
|--------|------|:---------:|:-----------:|
| `events_local` | 실제 데이터 (샤드별) | X | X (해당 샤드만) |
| `events_distributed` | 라우터 (전체 샤드) | X | O |
| `events_view` (FINAL) | 라우터 + 중복 제거 | O | O |

### dbt 모델별 권장 Input

| dbt materialization | 권장 Input | 이유 |
|:-------------------:|:----------:|------|
| `view` | View (FINAL) | 중복 제거 + 전체 데이터 필요 |
| `table` | View (FINAL) | 전체 데이터 기반 재생성 |
| `incremental` | View (FINAL) | WHERE 조건으로 범위 제한 + 중복 제거 |
| `materialized_view` | **Local Table** | MV 트리거가 Local INSERT에만 반응 |

!!! warning "materialized_view는 반드시 Local 테이블을 Input으로!"
    ClickHouse의 Incremental MV는 **Local 테이블에 INSERT가 발생할 때만 트리거**됩니다.

    - Distributed 테이블을 소스로 지정하면 → 트리거가 발생하지 않음
    - View (FINAL)을 소스로 지정하면 → 뷰이므로 INSERT 이벤트 자체가 없음

    따라서 `materialized='materialized_view'`를 사용할 때는 반드시 Local 테이블을 `FROM`에 지정해야 합니다.

```sql
-- dbt 모델 예시: materialized_view
{{ config(materialized='materialized_view') }}

SELECT event_date, count() AS event_count
FROM {{ source('raw', 'events_local') }}  -- Local 테이블!
GROUP BY event_date
```

```sql
-- dbt 모델 예시: incremental
{{ config(
    materialized='incremental',
    unique_key='event_date'
) }}

SELECT event_date, uniq(user_id) AS unique_users
FROM {{ source('raw', 'events_view') }}  -- View (FINAL)!
{% if is_incremental() %}
  WHERE event_date >= today() - 1
{% endif %}
GROUP BY event_date
```

---

## 6. FINAL과 WHERE 성능

"FINAL을 쓰면 느리지 않을까?" 라는 걱정이 있을 수 있습니다.

### Partition Pruning은 FINAL과 무관

```sql
SELECT * FROM events_distributed FINAL
WHERE event_date = '2026-04-01'
```

위 쿼리의 동작:

1. **WHERE 조건으로 파티션 선택** → `2026-04-01` 파티션만 읽음 (pruning)
2. **선택된 파티션 내에서 FINAL 적용** → 해당 파티션의 중복만 제거

!!! note "핵심 포인트"
    - `WHERE`에 의한 **파티션 pruning은 FINAL 유무와 관계없이** 동일하게 작동합니다
    - FINAL은 **이미 선택된 파티션 안에서만** 중복 제거 오버헤드를 추가합니다
    - 전체 테이블을 스캔하는 것이 아닙니다

### dbt incremental + WHERE + FINAL = 효율적이고 정확한 조합

```sql
-- dbt incremental 모델이 실제로 하는 일
SELECT event_date, count() AS cnt
FROM events_view  -- Distributed FINAL
WHERE event_date >= '2026-04-05'  -- 파티션 pruning
GROUP BY event_date
```

| 단계 | 동작 | 성능 영향 |
|------|------|----------|
| 1. WHERE | 필요한 파티션만 선택 | 불필요한 파티션 읽기 제거 |
| 2. FINAL | 선택된 파티션 내 중복 제거 | 소량 오버헤드 (파티션 범위 내) |
| 3. 집계 | 정확한 데이터로 계산 | 중복 없이 정확한 결과 |

!!! tip "결론"
    **dbt incremental + WHERE 조건 + Distributed FINAL** 조합은:

    - **효율적**: WHERE로 읽는 범위를 제한하므로 FINAL 비용도 제한됨
    - **정확**: 중복 제거된 데이터로 계산하므로 결과가 정확함
    - **안전**: 전체 데이터를 다시 계산하지 않으므로 리소스 절약

---

[← Materialization 심화로 돌아가기](05-materialization.md)
