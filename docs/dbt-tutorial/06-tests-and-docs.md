# 6. 테스트와 문서화

## Generic 테스트

YAML에서 컬럼 단위로 선언합니다.

```yaml
# models/staging/_stg_models.yml
version: 2

models:
  - name: stg_users
    description: "정제된 사용자 테이블"
    columns:
      - name: user_id
        description: "사용자 고유 ID"
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - unique
      - name: status
        tests:
          - accepted_values:
              values: ['active', 'inactive', 'banned']
      - name: team_id
        tests:
          - relationships:
              to: ref('stg_teams')
              field: team_id
```

### 기본 제공 테스트 4가지

| 테스트 | 설명 |
|--------|------|
| `unique` | 중복 값 없음 |
| `not_null` | NULL 값 없음 |
| `accepted_values` | 허용된 값만 존재 |
| `relationships` | 외래키 무결성 |

## Singular 테스트 (커스텀)

SQL 파일로 직접 테스트를 작성합니다. **결과가 0행이면 통과**.

```sql
-- tests/assert_positive_event_count.sql
-- fct_daily_events에 음수 이벤트 카운트가 없는지 확인
SELECT
    user_id,
    event_date,
    event_count
FROM {{ ref('fct_daily_events') }}
WHERE event_count < 0
```

## 테스트 실행

```bash
dbt test                          # 전체 테스트
dbt test --select stg_users       # 특정 모델 테스트
dbt test --select test_type:generic  # generic 테스트만
dbt test --select test_type:singular # singular 테스트만
```

실행 결과 예시:

```
Found 8 tests, running with 4 threads.

Pass 6   Warn 1   Error 1   Skip 0   Total 8

Completed with 1 error and 1 warning:

Failure in test unique_stg_users_user_id (models/staging/_stg_models.yml)
  Got 3 results, configured to fail if != 0
```

## 문서화

### 모델 문서 작성

```yaml
# models/marts/_mart_models.yml
version: 2

models:
  - name: fct_daily_events
    description: |
      일별 사용자 이벤트 집계 테이블.
      매일 dbt run으로 갱신됩니다.

      **주의**: event_type이 'test'인 항목은 제외되어 있습니다.
    columns:
      - name: user_id
        description: "사용자 ID (stg_users 참조)"
      - name: event_date
        description: "이벤트 발생일 (UTC)"
      - name: event_count
        description: "해당 일자의 이벤트 수"
```

### 문서 사이트 생성

```bash
dbt docs generate   # 문서 JSON 생성
dbt docs serve      # 로컬에서 문서 사이트 열기 (localhost:8080)
```

!!! tip "Lineage 그래프"
    `dbt docs serve`로 열리는 사이트 우측 하단의 파란 아이콘을 클릭하면
    모델 간 의존성을 시각적으로 확인할 수 있는 **DAG(Lineage Graph)**를 볼 수 있습니다.

## Source Freshness

```bash
dbt source freshness   # source의 데이터 신선도 체크
```

```
# 출력 예시:
Source raw.events:
  max_loaded_at: 2024-01-15 10:30:00
  snapshotted_at: 2024-01-15 14:00:00
  age: 3.5 hours
  status: PASS (warn_after: 12h, error_after: 24h)
```

## 직접 체험해보기

테스트 실행과 문서 생성 결과를 확인해보세요.

<div class="interactive-terminal" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Terminal</span>
  </div>
  <div class="terminal-body" id="term-test6">
    <span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>
  </div>
  <div class="terminal-buttons">
    <button onclick="runCommand('test', 'term-test6')">dbt test</button>
    <button onclick="runCommand('docs', 'term-test6')">dbt docs generate</button>
    <button onclick="clearTerminal('term-test6')" class="btn-clear">Clear</button>
  </div>
</div>

!!! note "다음 단계"
    테스트와 문서화를 마스터했다면, [실전 팁](07-tips.md)에서 실무에서 유용한 패턴을 배워보세요.
