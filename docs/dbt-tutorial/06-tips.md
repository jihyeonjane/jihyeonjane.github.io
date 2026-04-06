# 6. 실전 팁

## 개발 워크플로우

```bash
# 1. 모델 작성/수정
# 2. 컴파일해서 SQL 확인
dbt compile --select my_model

# 3. 실행
dbt run --select my_model

# 4. 테스트
dbt test --select my_model

# 5. 한 번에 실행 + 테스트
dbt build --select my_model
```

!!! tip "`dbt build` = `run` + `test`"
    `dbt build`는 모델 실행과 테스트를 의존성 순서대로 함께 수행합니다.

## 유용한 선택자 (Selector)

```bash
# 특정 모델과 모든 업스트림
dbt run --select +my_model

# 특정 모델과 모든 다운스트림
dbt run --select my_model+

# 특정 모델의 직접 업스트림만 (1단계)
dbt run --select 1+my_model

# 태그로 선택
dbt run --select tag:daily

# 폴더 전체
dbt run --select path:models/staging

# 변경된 모델만 (CI에서 유용)
dbt run --select state:modified+
```

## 자주 쓰는 매크로 패턴

### 날짜 스파인 (Date Spine)

```sql
-- macros/date_spine.sql
{% macro date_spine(start_date, end_date) %}
    WITH dates AS (
        SELECT
            DATE_ADD('{{ start_date }}', INTERVAL seq DAY) AS date_day
        FROM UNNEST(
            GENERATE_ARRAY(0, DATE_DIFF('{{ end_date }}', '{{ start_date }}', DAY))
        ) AS seq
    )
    SELECT * FROM dates
{% endmacro %}
```

### 환경별 분기

```sql
{% macro limit_data_in_dev(column_name, dev_days=3) %}
    {% if target.name == 'dev' %}
        WHERE {{ column_name }} >= DATE_SUB(CURRENT_DATE(), INTERVAL {{ dev_days }} DAY)
    {% endif %}
{% endmacro %}

-- 사용:
SELECT * FROM {{ ref('stg_events') }}
{{ limit_data_in_dev('event_at') }}
```

## packages.yml 활용

커뮤니티 패키지를 활용하면 생산성이 올라갑니다.

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: "1.1.1"
  - package: dbt-labs/codegen
    version: "0.12.1"
```

```bash
dbt deps   # 패키지 설치
```

### dbt_utils 유용 매크로

```sql
-- surrogate key 생성
{{ dbt_utils.generate_surrogate_key(['user_id', 'event_date']) }}

-- pivot
{{ dbt_utils.pivot('event_type', dbt_utils.get_column_values(ref('stg_events'), 'event_type')) }}

-- union 여러 소스
{{ dbt_utils.union_relations(
    relations=[ref('events_web'), ref('events_app')]
) }}
```

## 디버깅 팁

### 컴파일된 SQL 확인

```bash
dbt compile --select my_model
# target/compiled/ 에서 렌더링된 SQL 확인
cat target/compiled/my_project/models/marts/my_model.sql
```

### 로그 확인

```bash
dbt --debug run --select my_model   # 상세 로그
# logs/dbt.log 에서도 확인 가능
```

### 흔한 실수들

!!! warning "주의할 점"
    1. **ref() 안 쓰고 테이블명 직접 쓰기** → 의존성 꼬임
    2. **staging에서 비즈니스 로직 넣기** → 유지보수 어려움
    3. **incremental 모델에서 `is_incremental()` 빼먹기** → 첫 실행 에러
    4. **profiles.yml을 Git에 커밋하기** → 비밀번호 노출 위험

---

!!! success "튜토리얼 완료!"
    dbt의 기본기를 모두 다뤘습니다. 실제 프로젝트에 적용하면서 더 깊이 학습해보세요!
