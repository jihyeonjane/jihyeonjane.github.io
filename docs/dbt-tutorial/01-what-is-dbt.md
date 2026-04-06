# 1. dbt란?

## dbt (data build tool)

dbt는 데이터 웨어하우스 내에서 **데이터 변환(Transformation)**을 관리하는 도구입니다.

```
ELT 파이프라인에서의 위치:

  Extract → Load → [Transform] ← dbt가 담당하는 영역
```

!!! info "ETL vs ELT"
    - **ETL**: Extract → Transform → Load (전통적 방식)
    - **ELT**: Extract → Load → Transform (현대적 방식, dbt가 여기에 해당)

## 왜 dbt를 사용하나?

### Before dbt

```sql
-- 누가 만들었는지 모르는 수백 개의 SQL 파일...
-- 어떤 순서로 실행해야 하는지도 불명확
-- 테스트? 문서화? 없음!
```

### After dbt

- **버전 관리**: SQL을 Git으로 관리
- **의존성 관리**: 모델 간 참조 관계를 `ref()`로 명확히 정의
- **자동 테스트**: 데이터 품질 테스트를 코드로 작성
- **자동 문서화**: 리니지(Lineage) 그래프 자동 생성
- **재사용성**: Jinja 템플릿으로 DRY한 SQL 작성

## 핵심 개념

### 모델 (Model)
하나의 SQL 파일 = 하나의 모델 = 하나의 테이블/뷰

```sql
-- models/staging/stg_users.sql
SELECT
    id AS user_id,
    name AS user_name,
    created_at
FROM {{ source('raw', 'users') }}
```

### ref() 함수
모델 간 의존성을 정의하는 핵심 함수

```sql
-- models/marts/dim_users.sql
SELECT *
FROM {{ ref('stg_users') }}
WHERE user_name IS NOT NULL
```

### Lineage (리니지)
모델 간 참조 관계를 시각적으로 보여주는 DAG

```
raw.users → stg_users → dim_users → report_daily_users
                ↘ fct_user_events ↗
```

!!! note "다음 단계"
    dbt가 무엇인지 이해했다면, [설치 및 설정](02-setup.md)으로 넘어가세요.
