# 5. Materialization 심화

dbt로 SQL을 실행하면 결과물이 DB에 저장됩니다. 이때 **어떤 방식으로 저장할지**를 `materialization`이라고 부릅니다.

## dbt ↔ DB 상호작용 시각화

아래에서 materialization 타입을 선택하고 **▶ 실행**을 누르면, dbt와 DB가 주고받는 과정을 단계별로 확인할 수 있습니다.

<div class="flow-demo" id="flow-mat" markdown="0">
  <div class="flow-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Materialization Flow</span>
  </div>
  <div class="flow-source">
    <div class="flow-source-label">dbt 모델 (SQL)</div>
    <code></code>
  </div>
  <div class="flow-panels">
    <div class="flow-panel flow-panel-dbt">
      <div class="flow-panel-label label-dbt">🔧 dbt</div>
      <div class="flow-steps"></div>
    </div>
    <div class="flow-panel flow-panel-db">
      <div class="flow-panel-label label-db">🗄️ Database</div>
      <div class="flow-steps"></div>
    </div>
  </div>
  <div class="flow-buttons">
    <button class="mat-btn active" data-type="view" onclick="selectMatType('flow-mat','view')">View</button>
    <button class="mat-btn" data-type="table" onclick="selectMatType('flow-mat','table')">Table</button>
    <button class="mat-btn" data-type="incremental" onclick="selectMatType('flow-mat','incremental')">Incremental</button>
    <button class="mat-btn" data-type="mv" onclick="selectMatType('flow-mat','mv')">Materialized View</button>
    <button class="btn-play" onclick="playFlow('flow-mat')">▶ 실행</button>
    <span class="flow-status"></span>
    <button class="btn-reset" onclick="resetFlow('flow-mat')">Reset</button>
  </div>
</div>

!!! tip "사용법"
    1. 위에서 materialization 타입 버튼을 선택하세요
    2. **▶ 실행** 버튼을 누르면 dbt와 DB 간의 상호작용이 순서대로 표시됩니다
    3. 각 단계의 번호 순서대로 따라가면 됩니다

---

## 1. View — "SQL을 저장해두고, 조회할 때마다 실행"

```sql
{{ config(materialized='view') }}

SELECT user_id, count(*) AS event_count
FROM {{ source('raw', 'events') }}
GROUP BY user_id
```

- `dbt run` 시: SQL 정의만 저장 (실제 데이터는 저장 안 됨)
- 조회할 때: 그 순간에 SQL이 실행되어 결과를 반환
- **장점**: 항상 최신 데이터를 볼 수 있음
- **단점**: 조회할 때마다 원천 테이블 전체를 계산 → 데이터가 많으면 느림
- **적합한 경우**: 데이터가 적거나, 빠르게 프로토타입을 확인하고 싶을 때

## 2. Table — "실행할 때 전체 재계산해서 저장"

```sql
{{ config(materialized='table') }}

SELECT user_id, count(*) AS event_count
FROM {{ source('raw', 'events') }}
GROUP BY user_id
```

- `dbt run` 시: 전체를 다시 계산해서 테이블로 저장 (기존 테이블 덮어씀)
- 조회할 때: 이미 저장된 테이블에서 바로 읽어옴 → 빠름
- **단점**: 데이터가 많으면 매번 전체 재계산 비용이 큼
- **적합한 경우**:
    - 소~중량 테이블 (로직이 단순한 경우)
    - 과거 데이터가 변하지 않는 dimension 테이블 (유저 정보, 컨텐츠 메타 등)
    - 항상 최신 스냅샷만 필요한 경우

```sql
-- dbt가 내부적으로 실행하는 것
DROP TABLE IF EXISTS my_schema.event_count;

CREATE TABLE my_schema.event_count AS
SELECT user_id, count(*) AS event_count
FROM raw.events
GROUP BY user_id;
```

## 3. Incremental — "새것만 처리해서 기존 테이블에 추가"

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='delete+insert',
    unique_key='event_date'
) }}

SELECT user_id, event_date, count(*) AS event_count
FROM {{ source('raw', 'events') }}

{% if is_incremental() %}
  WHERE event_date >= current_date - interval '1 day'
{% endif %}

GROUP BY user_id, event_date
```

- **처음 실행**: 전체 데이터 계산 (table과 동일)
- **이후 실행**: `WHERE` 조건에 해당하는 새 데이터만 처리해서 기존 테이블에 합침
- **장점**: 빠름. 전체를 매번 다시 계산하지 않아도 됨
- **단점**: 구현이 복잡. 늦게 들어온 데이터(late arriving) 처리에 주의 필요
- **적합한 경우**: 데이터 양이 많고, 주기적으로 배치 실행하는 대형 테이블

### 실제로 벌어지는 일

```
시나리오 1: 첫 실행 (테이블 없을 때)

is_incremental()이 false → WHERE 없이 전체 계산
→ CREATE TABLE + 전체 데이터 INSERT

---
시나리오 2: 이후 실행 (매일 배치)

is_incremental()이 true → WHERE 조건 활성화
→ Step 1: 새 데이터를 임시 테이블에 계산
→ Step 2: 본 테이블에서 해당 키의 기존 데이터 삭제
→ Step 3: 새 데이터 INSERT
→ Step 4: 임시 테이블 정리
```

### 과거 데이터를 일괄 마이그레이션 하고 싶다면?

```bash
dbt run --select my_model --vars '{"start_date": "2023-01-01", "end_date": "2023-12-31"}'
```

## 4. Ephemeral — "CTE로만 존재"

```sql
{{ config(materialized='ephemeral') }}

SELECT user_id, email
FROM {{ source('raw', 'users') }}
WHERE status = 'active'
```

- DB에 테이블/뷰가 생성되지 않음
- 다른 모델에서 `{{ ref() }}`로 참조하면 **CTE(WITH 절)**로 인라인됨
- **적합한 경우**: 중간 로직 정리용, 여러 모델에서 재사용하는 서브쿼리

## 5. Materialized View (ClickHouse 등)

일부 DB에서는 dbt를 통해 **Materialized View**를 직접 생성할 수 있습니다.

```sql
{{ config(materialized='materialized_view') }}

SELECT event_date, count(DISTINCT user_id) AS dau
FROM {{ source('raw', 'events') }}
GROUP BY event_date
```

- source 테이블에 데이터가 INSERT될 때마다 **자동으로 갱신** (스케줄러 불필요)
- **장점**: 실시간 반영
- **제약**: source 테이블 반드시 1개, 복잡한 JOIN/window function 불가

!!! warning "dbt config vs DB 실제 생성 객체"
    `materialized=` 설정은 **dbt만의 용어**입니다. DB의 Materialized View와 혼동 주의.

    | dbt 설정 | DB에 실제 생성되는 것 |
    | --- | --- |
    | `materialized='view'` | 일반 VIEW |
    | `materialized='table'` | 일반 TABLE |
    | `materialized='incremental'` | 일반 TABLE (부분 갱신) |
    | `materialized='materialized_view'` | Materialized View |

## 언제 뭘 써야 하나? — 판단 흐름도

```
데이터 양이 적은가?
├── YES → view 또는 table
└── NO → 실시간 갱신이 필요한가?
         ├── YES → source 1개 + 단순 집계인가?
         │         ├── YES → materialized_view
         │         └── NO → incremental
         └── NO → incremental
```

## 종류별 한눈에 비교

| 판단 기준 | view | table | incremental | MV |
| --- | --- | --- | --- | --- |
| 데이터 양 | 소량 | 소~중량 | 대량 | 무관 |
| source 테이블 수 | 무관 | 무관 | 무관 | 반드시 1개 |
| 복잡한 JOIN/window | 가능 | 가능 | 가능 | 불가 |
| 기존 행 수정 필요 | - | 가능 | 가능 | 불가 |
| 실행 주체 | dbt run | dbt run | dbt run | DB 자동 |
| 데이터 신선도 | 조회 시점 | 마지막 실행 | 마지막 실행 | 실시간 |
| 대표 용도 | 프로토타입 | 소규모 dimension | 대형 가공 테이블 | DAU/KPI |

### 직접 체험해보기

`dbt run`으로 모델을 실행하고, `dbt compile`로 렌더링된 SQL을 확인해보세요.

<div class="interactive-terminal" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Terminal</span>
  </div>
  <div class="terminal-body" id="term-mat">
    <span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>
  </div>
  <div class="terminal-buttons">
    <button onclick="runCommand('compile', 'term-mat')">dbt compile</button>
    <button onclick="runCommand('run', 'term-mat')">dbt run</button>
    <button onclick="clearTerminal('term-mat')" class="btn-clear">Clear</button>
  </div>
</div>

!!! note "다음 단계"
    Materialization을 이해했다면, [테스트와 문서화](06-tests-and-docs.md)로 데이터 품질을 관리하는 방법을 배워보세요.
