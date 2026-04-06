# 3. 프로젝트 구조

## 디렉토리 레이아웃

`dbt init`을 실행하면 아래 구조가 자동 생성됩니다.

```
my_project/
├── dbt_project.yml       ← 프로젝트 전체 설정 (핵심)
├── README.md
│
├── models/               ← SQL 파일을 여기에 작성 (가장 많이 쓰는 폴더)
│   └── example/
│       ├── my_first_dbt_model.sql
│       └── my_second_dbt_model.sql
│
├── seeds/                ← CSV 파일을 DB에 올릴 때 사용
├── macros/               ← 반복되는 SQL을 함수처럼 만들 때
├── tests/                ← 데이터 품질 검증 SQL
├── snapshots/            ← 데이터 변경 이력 추적 (SCD Type 2)
└── analyses/             ← 분석용 SQL (dbt run 대상 아님)
```

## 실제로 자주 쓰는 건?

| 폴더/파일 | 사용 빈도 | 용도 |
| --- | --- | --- |
| `models/` | ★★★★★ | SQL 작성, 테이블/뷰 생성 |
| `dbt_project.yml` | ★★★★ | 프로젝트 설정 |
| `seeds/` | ★★★ | 기준 데이터 CSV 업로드 |
| `macros/` | ★★ | 반복 SQL 함수화 |
| 나머지 | ★ | 심화 단계에서 |

## models 폴더를 살펴보자

models 폴더는 보통 레이어별로 나눕니다. 꼭 아래처럼 하지 않아도 되지만, 권장되는 패턴입니다.

```
models/
├── sources.yml              ← 원천 테이블 등록
│
├── staging/                 ← 1단계: 원천 데이터 그대로 정제만
│   ├── _stg_models.yml      ← staging 모델 문서/테스트
│   ├── stg_users.sql
│   └── stg_events.sql
│
├── intermediate/            ← 2단계: staging 조합/가공 (선택사항)
│   └── int_user_events.sql
│
└── marts/                   ← 3단계: 최종 분석용 테이블
    ├── _mart_models.yml
    ├── dim_users.sql
    └── fct_daily_events.sql
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

## Materialization 종류 (맛보기)

| 유형 | 설명 | 사용 시점 |
|------|------|----------|
| `view` | SQL 뷰 생성 | staging, 가벼운 변환 |
| `table` | 물리 테이블 생성 | marts, 자주 조회하는 데이터 |
| `incremental` | 신규 데이터만 추가 | 대용량, 시계열 데이터 |
| `ephemeral` | CTE로 인라인 | 중간 변환, 재사용 로직 |

!!! tip "더 자세한 내용은 [5. Materialization 심화](05-materialization.md)에서 다룹니다."

!!! tip "네이밍 컨벤션"
    - `stg_` : staging 모델 (원천 정제)
    - `int_` : intermediate 모델 (중간 변환)
    - `dim_` : dimension 테이블 (마스터)
    - `fct_` : fact 테이블 (트랜잭션/이벤트)

!!! note "다음 단계"
    프로젝트 구조를 이해했다면, [모델 작성](04-models.md)에서 실제 SQL을 작성해보세요.
