# 3. 프로젝트 구조

## 디렉토리 레이아웃

```
my_project/
├── dbt_project.yml          # 프로젝트 설정 (이름, 버전, 경로 등)
├── models/
│   ├── staging/             # 원천 데이터 정제 (1:1 매핑)
│   │   ├── _sources.yml     # source 정의
│   │   ├── _stg_models.yml  # staging 모델 문서/테스트
│   │   ├── stg_users.sql
│   │   └── stg_events.sql
│   ├── intermediate/        # 중간 변환 (조인, 집계)
│   │   └── int_user_events.sql
│   └── marts/               # 최종 비즈니스 모델
│       ├── _mart_models.yml
│       ├── dim_users.sql
│       └── fct_daily_events.sql
├── tests/                   # 커스텀 테스트 SQL
├── macros/                  # 재사용 가능한 Jinja 매크로
├── seeds/                   # CSV로 로드할 정적 데이터
├── snapshots/               # SCD Type 2 스냅샷
└── analyses/                # 분석용 SQL (빌드 X)
```

## 핵심 파일: dbt_project.yml

```yaml
name: 'my_project'
version: '1.0.0'
config-version: 2

profile: 'my_project'   # profiles.yml의 프로필명과 매칭

model-paths: ["models"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]
analysis-paths: ["analyses"]

# 모델별 materialization 설정
models:
  my_project:
    staging:
      +materialized: view       # staging은 뷰로
      +schema: staging
    intermediate:
      +materialized: ephemeral  # 중간은 CTE로 (테이블 생성 X)
    marts:
      +materialized: table      # marts는 테이블로
      +schema: marts
```

## Materialization 종류

| 유형 | 설명 | 사용 시점 |
|------|------|----------|
| `view` | SQL 뷰 생성 | staging, 가벼운 변환 |
| `table` | 물리 테이블 생성 | marts, 자주 조회하는 데이터 |
| `incremental` | 신규 데이터만 추가 | 대용량, 시계열 데이터 |
| `ephemeral` | CTE로 인라인 | 중간 변환, 재사용 로직 |

!!! tip "네이밍 컨벤션"
    - `stg_` : staging 모델 (원천 정제)
    - `int_` : intermediate 모델 (중간 변환)
    - `dim_` : dimension 테이블 (마스터)
    - `fct_` : fact 테이블 (트랜잭션/이벤트)

!!! note "다음 단계"
    프로젝트 구조를 이해했다면, [모델 작성](04-models.md)에서 실제 SQL을 작성해보세요.
