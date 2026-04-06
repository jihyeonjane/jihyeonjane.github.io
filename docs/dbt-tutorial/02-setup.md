# 2. 설치 및 설정

## dbt 설치

=== "pip (권장)"

    ```bash
    # 가상환경 생성
    python -m venv dbt-env
    source dbt-env/bin/activate

    # dbt-core + 어댑터 설치
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

## 프로젝트 초기화

```bash
$ dbt init my_project

# 이런 질문들이 나옵니다:
# Which database would you like to use?
# [1] postgres
# [2] bigquery
# ...
```

## profiles.yml 설정

dbt가 데이터베이스에 접속하기 위한 설정 파일입니다.

!!! warning "위치 주의"
    `profiles.yml`은 dbt 프로젝트 폴더가 아닌 `~/.dbt/profiles.yml`에 위치합니다.

=== "PostgreSQL"

    ```yaml
    # ~/.dbt/profiles.yml
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
    # ~/.dbt/profiles.yml
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
    # ~/.dbt/profiles.yml
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

## 연결 테스트

```bash
$ dbt debug

# 성공 시 출력:
#   Connection test: [OK connection ok]
#   All checks passed!
```

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
