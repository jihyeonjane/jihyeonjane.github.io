# 4. 모델 작성

## Source 정의

먼저 원천 테이블을 `source`로 등록합니다.

```yaml
# models/staging/_sources.yml
version: 2

sources:
  - name: raw
    database: my_database
    schema: raw_data
    tables:
      - name: users
        description: "사용자 원천 테이블"
      - name: events
        description: "이벤트 로그 테이블"
        loaded_at_field: created_at
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
```

## Staging 모델

원천 데이터를 1:1로 정제합니다.

```sql
-- models/staging/stg_users.sql
WITH source AS (
    SELECT * FROM {{ source('raw', 'users') }}
),

renamed AS (
    SELECT
        id          AS user_id,
        name        AS user_name,
        email,
        status,
        created_at,
        updated_at
    FROM source
)

SELECT * FROM renamed
```

!!! tip "staging 원칙"
    - 컬럼 rename, type cast만 수행
    - 비즈니스 로직 X
    - 원천 테이블당 1개의 staging 모델

## ref()로 모델 연결

```sql
-- models/intermediate/int_user_events.sql
WITH users AS (
    SELECT * FROM {{ ref('stg_users') }}
),

events AS (
    SELECT * FROM {{ ref('stg_events') }}
)

SELECT
    u.user_id,
    u.user_name,
    e.event_type,
    e.event_at
FROM users u
JOIN events e ON u.user_id = e.user_id
```

## Mart 모델

비즈니스 요구사항에 맞는 최종 테이블을 만듭니다.

```sql
-- models/marts/fct_daily_events.sql
WITH user_events AS (
    SELECT * FROM {{ ref('int_user_events') }}
)

SELECT
    user_id,
    user_name,
    DATE(event_at)  AS event_date,
    event_type,
    COUNT(*)        AS event_count
FROM user_events
GROUP BY 1, 2, 3, 4
```

## Jinja 활용

### 조건문

```sql
SELECT
    *,
    {% if target.name == 'dev' %}
        LIMIT 1000    -- 개발 환경에서는 1000건만
    {% endif %}
FROM {{ ref('stg_events') }}
```

### 반복문

```sql
{% set event_types = ['login', 'purchase', 'logout'] %}

SELECT
    user_id,
    {% for event_type in event_types %}
    COUNT(CASE WHEN event_type = '{{ event_type }}' THEN 1 END)
        AS {{ event_type }}_count
    {% if not loop.last %},{% endif %}
    {% endfor %}
FROM {{ ref('stg_events') }}
GROUP BY 1
```

### 매크로

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name) %}
    ROUND({{ column_name }} / 100.0, 2)
{% endmacro %}

-- 사용:
SELECT
    {{ cents_to_dollars('amount_cents') }} AS amount_dollars
FROM {{ ref('stg_payments') }}
```

## Incremental 모델

대용량 데이터를 효율적으로 처리합니다.

```sql
-- models/marts/fct_events.sql
{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='merge'
    )
}}

SELECT
    event_id,
    user_id,
    event_type,
    event_at
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
    -- 기존 테이블이 있으면 신규 데이터만 처리
    WHERE event_at > (SELECT MAX(event_at) FROM {{ this }})
{% endif %}
```

## 주요 dbt 명령어

```bash
dbt run                        # 모든 모델 실행
dbt run --select stg_users     # 특정 모델만 실행
dbt run --select staging.*     # staging 폴더 전체
dbt run --select +fct_daily_events  # 해당 모델 + 업스트림 전체
dbt run --full-refresh         # incremental 모델 전체 재빌드
```

!!! note "다음 단계"
    모델을 작성할 수 있게 되었다면, [테스트와 문서화](05-tests-and-docs.md)로 데이터 품질을 관리하는 방법을 배워보세요.
