# 2. 설치 및 설정

## dbt 설치

=== "pip (권장)"

    ```bash
    # 가상환경 생성
    python -m venv dbt-env
    source dbt-env/bin/activate

    # dbt-core + 어댑터 설치 (DB에 맞게 선택)
    pip install dbt-core dbt-postgres    # PostgreSQL
    pip install dbt-core dbt-bigquery    # BigQuery
    pip install dbt-core dbt-snowflake   # Snowflake
    pip install dbt-core dbt-clickhouse  # ClickHouse
    ```

=== "brew"

    ```bash
    brew install dbt-labs/dbt/dbt-postgres
    ```

설치 확인:

```bash
$ dbt --version
Core:
  - installed: 1.7.x
  - latest:    1.7.x

Plugins:
  - postgres: 1.7.x
```

## YAML 기초

dbt 설정은 **YAML** 파일로 관리합니다. 코드를 몰라도 읽을 수 있는 설정 형식이에요.

```yaml
# "이 프로젝트 이름은 my_project이고, 스레드는 4개 씁니다"
name: my_project
type: clickhouse
threads: 4
```

!!! warning "핵심 규칙 2가지"
    1. **들여쓰기(스페이스 2칸)**로 계층 구분 — 탭(Tab) 쓰면 에러남
    2. **콜론(`:`) 뒤에 반드시 공백** — `key:value` :x: / `key: value` :white_check_mark:

## 프로젝트 초기화

```bash
$ dbt init my_project

# 이런 질문들이 나옵니다:
# Which database would you like to use?
# [1] postgres
# [2] bigquery
# ...
```

## dbt의 핵심 YML 파일 4가지

| 파일 | 한 줄 요약 |
| --- | --- |
| `profiles.yml` | 어디(DB)에 연결할지 |
| `dbt_project.yml` | 프로젝트 기본 설정 |
| `sources.yml` | 원천 데이터 등록 |
| `schema.yml` | 내 모델 문서화 & 테스트 |

### profiles.yml — "어디에 연결할지"

DB 연결 정보를 담는 파일입니다.

!!! warning "위치 주의"
    `profiles.yml`은 dbt 프로젝트 폴더가 아닌 `~/.dbt/profiles.yml`에 위치합니다.

=== "PostgreSQL"

    ```yaml
    my_project:
      target: dev
      outputs:
        dev:
          type: postgres
          host: localhost
          user: myuser
          password: mypassword
          port: 5432
          dbname: mydb
          schema: dev_jane
          threads: 4
    ```

=== "ClickHouse"

    ```yaml
    my_project:
      target: dev
      outputs:
        dev:
          type: clickhouse
          host: clickhouse-host
          port: 8123
          user: default
          password: ""
          schema: default
          threads: 4
    ```

=== "BigQuery"

    ```yaml
    my_project:
      target: dev
      outputs:
        dev:
          type: bigquery
          method: oauth
          project: my-gcp-project
          dataset: dev_jane
          threads: 4
    ```

**포인트**: `target: dev`로 설정해두면 `dbt run` 시 자동으로 dev 환경에 실행. `dbt run --target prod`처럼 명시적으로 바꿀 수도 있음.

### dbt_project.yml — "프로젝트 전체 설정"

```yaml
name: my_project           # 프로젝트 이름 (profiles.yml과 일치)
version: '1.0.0'
profile: my_project        # 연결할 프로필 이름

model-paths: ["models"]    # SQL 파일 위치

models:
  my_project:
    +materialized: table    # 기본 저장 방식 (table / view)
```

### sources.yml — "원천 데이터 등록"

dbt가 참조할 원천 테이블을 등록합니다. `{{ source() }}` 문법으로 SQL에서 참조합니다.

```yaml
version: 2

sources:
  - name: raw_data           # 소스 그룹 이름
    database: my_database
    schema: raw
    tables:
      - name: users
        description: "유저 정보"
      - name: events
        description: "이벤트 로그"
```

### schema.yml — "모델 문서화 & 테스트"

내가 만든 모델에 설명과 테스트를 붙이는 파일입니다.

```yaml
version: 2

models:
  - name: stg_users            # SQL 파일명과 일치
    description: "정제된 유저 테이블"
    columns:
      - name: user_id
        description: "유저 고유 ID"
        tests:
          - unique
          - not_null
      - name: status
        description: "상태값"
```

## 연결 테스트

```bash
$ dbt debug

# 성공 시 출력:
#   Connection test: [OK connection ok]
#   All checks passed!
```

### 직접 체험해보기

아래 버튼을 눌러 `dbt debug` 실행 결과를 확인해보세요.

<div class="interactive-terminal" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Terminal</span>
  </div>
  <div class="terminal-body" id="term-setup">
    <span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>
  </div>
  <div class="terminal-buttons">
    <button onclick="runCommand('debug', 'term-setup')">dbt debug</button>
    <button onclick="clearTerminal('term-setup')" class="btn-clear">Clear</button>
  </div>
</div>

!!! tip "dev/prod 환경 분리"
    `target`을 `dev`와 `prod`로 나누어 환경별 설정을 관리하세요.
    ```yaml
    outputs:
      dev:
        schema: dev_jane    # 개발용
      prod:
        schema: analytics   # 운영용
    ```

!!! note "다음 단계"
    dbt 설치와 연결이 완료되었다면, [프로젝트 구조](03-project-structure.md)를 살펴보세요.
