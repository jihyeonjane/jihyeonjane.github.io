# 5. Hook & Connection

Operator가 "**무엇을 할지**"를 정의한다면, Hook은 "**어디에·어떻게 연결할지**"를 담당합니다. 이 챕터에서는 Hook/Connection의 역할, 관리 방식, 그리고 간단한 Custom Hook까지 정리합니다.

---

## 1. Hook이란?

**Hook**은 외부 시스템(DB, 클라우드, API 등)에 대한 연결을 **캡슐화한 Python 클래스**입니다.

```
DAG ──▶ Operator ──▶ Hook ──▶ 외부 시스템 (Postgres, S3, Slack 등)
          "무엇을"    "어떻게 붙나"
```

Hook이 맡는 일:

- Airflow **Connection**(접속 정보)을 읽어 인증/엔드포인트 구성
- 외부 시스템의 SDK/클라이언트 객체를 생성
- 자주 쓰는 작업을 메서드로 노출 (`run`, `get_first`, `insert_rows`, `get_conn` 등)

!!! tip "한 문장 요약"
    **Hook = 접속 레이어, Operator = 흐름 레이어.**
    둘을 분리해두면 같은 시스템에 여러 Operator가 재사용 가능하고, 테스트/교체도 쉬워집니다.

---

## 2. Connection이란?

**Connection**은 외부 시스템의 **접속 정보(호스트, 포트, 유저, 비밀번호, 추가 옵션 등)를 Airflow에 저장해두는 객체**입니다. Metadata DB 또는 Secret Backend에 저장되고, Hook이 `conn_id` 문자열로 참조합니다.

```
Connection "warehouse_postgres"
├── host: postgres.internal
├── port: 5432
├── login: etl_user
├── password: ****
├── schema: analytics
└── extra: {"sslmode": "require"}
```

### Connection의 장점

- 코드/DAG 파일에 **비밀번호가 하드코딩되지 않음**
- 환경별(dev/stg/prd) 동일 DAG 코드로 다른 Connection만 쓰면 됨
- UI/CLI/API로 관리 가능

---

## 3. Connection 관리 방법

Connection은 다음 네 경로 중 하나로 관리합니다.

### (a) 웹 UI

`Admin > Connections`에서 GUI로 추가/수정. 소규모 팀에서 간편.

### (b) CLI

```bash
airflow connections add 'warehouse_postgres' \
    --conn-type 'postgres' \
    --conn-host 'postgres.internal' \
    --conn-login 'etl_user' \
    --conn-password 'secret' \
    --conn-port 5432 \
    --conn-schema 'analytics' \
    --conn-extra '{"sslmode":"require"}'

airflow connections list
airflow connections delete warehouse_postgres
```

### (c) 환경변수

`AIRFLOW_CONN_<CONN_ID>` 규칙으로 OS 환경변수를 지정하면, 그 값이 해당 `conn_id`로 해석됩니다.

```bash
export AIRFLOW_CONN_WAREHOUSE_POSTGRES='postgresql://etl_user:secret@postgres.internal:5432/analytics?sslmode=require'
```

컨테이너/K8s 환경에서 자주 쓰이는 방식.

### (d) Secret Backend

AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault 등을 Airflow에 연결해 Connection/Variable을 가져오도록 설정할 수 있습니다.

```ini
# airflow.cfg
[secrets]
backend = airflow.providers.amazon.aws.secrets.secrets_manager.SecretsManagerBackend
backend_kwargs = {"connections_prefix": "airflow/connections"}
```

이러면 `AWS Secrets Manager`의 `airflow/connections/warehouse_postgres`에 저장된 값이 자동으로 Connection으로 쓰입니다. **프로덕션에서 가장 권장되는 방식**.

### 우선순위

여러 소스에 같은 `conn_id`가 있으면 아래 순서로 탐색합니다:

```
Secret Backend → 환경변수 → Metadata DB
```

---

## 4. Operator-Hook 역할 분리 예시

같은 목적(Postgres에 SQL 실행)을 **Hook만**, **Operator+Hook**, **Custom Operator**로 구현한 비교.

### Hook만 사용 (TaskFlow에서 직접)

```python
from airflow.sdk import task
from airflow.providers.postgres.hooks.postgres import PostgresHook

@task
def run_query():
    hook = PostgresHook(postgres_conn_id="warehouse_postgres")
    return hook.get_first("SELECT count(*) FROM mart.users")[0]
```

- 간단한 1회성 쿼리에 편함
- 반복 사용 시 보일러플레이트 증가

### 기본 Operator + Hook (표준)

```python
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

SQLExecuteQueryOperator(
    task_id="aggregate",
    conn_id="warehouse_postgres",
    sql="INSERT INTO mart.daily SELECT ... FROM raw.events WHERE date='{{ ds }}'",
)
```

- Operator가 내부적으로 적절한 Hook을 사용
- 99%의 경우 이걸로 충분

### Custom Operator + Custom Hook (특수 로직)

[챕터 4](04-custom-operators.md)의 `CsvToPostgresOperator` + `InternalApiHook`처럼, **사내 표준/복합 로직**이 필요할 때.

---

## 5. 대표 Hook 목록

자주 만나는 Hook들.

| Provider | Hook | 용도 |
|----------|------|------|
| `apache-airflow-providers-postgres` | `PostgresHook` | PostgreSQL |
| `apache-airflow-providers-mysql` | `MySqlHook` | MySQL |
| `apache-airflow-providers-common-sql` | `DbApiHook` | 범용 DB-API 2.0 |
| `apache-airflow-providers-amazon` | `S3Hook`, `RedshiftSQLHook`, `AthenaHook`, `GlueJobHook` | AWS |
| `apache-airflow-providers-google` | `GCSHook`, `BigQueryHook` | GCP |
| `apache-airflow-providers-snowflake` | `SnowflakeHook` | Snowflake |
| `apache-airflow-providers-http` | `HttpHook` | REST API |
| `apache-airflow-providers-slack` | `SlackWebhookHook`, `SlackHook` | Slack |
| `apache-airflow-providers-ssh` | `SSHHook` | SSH 실행 |
| `apache-airflow-providers-docker` | `DockerHook` | Docker |
| `apache-airflow-providers-cncf-kubernetes` | `KubernetesHook` | K8s API |

---

## 6. 자주 쓰는 Hook API 패턴

### PostgresHook 예시

```python
hook = PostgresHook(postgres_conn_id="warehouse_postgres")

# 1) 한 줄 결과만
row = hook.get_first("SELECT count(*) FROM users")

# 2) 여러 행
rows = hook.get_records("SELECT id, name FROM users LIMIT 100")

# 3) pandas DataFrame
df = hook.get_pandas_df("SELECT * FROM users WHERE created_at > %(since)s",
                       parameters={"since": "2026-01-01"})

# 4) 실행만 (INSERT/UPDATE/DDL)
hook.run("TRUNCATE TABLE raw.events;")

# 5) bulk insert
hook.insert_rows(table="raw.events",
                 rows=[("a", 1), ("b", 2)],
                 target_fields=["key", "value"])

# 6) raw connection 필요 시
with hook.get_conn() as conn:
    with conn.cursor() as cur:
        cur.execute("...")
```

### S3Hook 예시

```python
from airflow.providers.amazon.aws.hooks.s3 import S3Hook

s3 = S3Hook(aws_conn_id="aws_default")

s3.load_file(filename="/tmp/data.csv", key="raw/data.csv", bucket_name="my-bucket")
exists = s3.check_for_key(key="raw/data.csv", bucket_name="my-bucket")
obj = s3.get_key(key="raw/data.csv", bucket_name="my-bucket")
keys = s3.list_keys(bucket_name="my-bucket", prefix="raw/")
```

---

## 7. Custom Hook 간단 예시

[챕터 4](04-custom-operators.md)에서 예시로 만든 `InternalApiHook`을 다시 봅니다.

```python
# plugins/hooks/internal_api_hook.py
import requests
from airflow.hooks.base import BaseHook


class InternalApiHook(BaseHook):
    """사내 API 호출 Hook."""

    conn_name_attr = "conn_id"
    default_conn_name = "internal_api_default"
    conn_type = "http"
    hook_name = "Internal API"

    def __init__(self, conn_id: str = default_conn_name):
        super().__init__()
        self.conn_id = conn_id
        self._session: requests.Session | None = None

    def get_conn(self) -> requests.Session:
        if self._session is None:
            conn = self.get_connection(self.conn_id)
            session = requests.Session()
            session.headers.update({"Authorization": f"Bearer {conn.password}"})
            session.base_url = conn.host
            self._session = session
        return self._session

    def refresh_report(self, report_id: str) -> dict:
        s = self.get_conn()
        r = s.post(f"{s.base_url}/reports/{report_id}/refresh", timeout=30)
        r.raise_for_status()
        return r.json()
```

### Custom Hook 작성 체크리스트

- `BaseHook` 상속
- `conn_name_attr`, `default_conn_name`, `conn_type`, `hook_name` 클래스 속성으로 **UI에서 Connection 생성 시 타입 표시**
- `get_connection(conn_id)`으로 Connection 객체를 읽음
- 외부 클라이언트는 **지연 초기화**(lazy) — 첫 사용 시 생성, 재사용
- 외부 작업은 **명확한 이름의 메서드**로 노출 (`refresh_report`, `upload_file` 등)

---

## 8. Variable vs Connection

Airflow에는 비슷해 보이는 두 저장소가 있습니다.

| | Variable | Connection |
|---|----------|------------|
| **용도** | 일반 key-value | 외부 시스템 접속 정보 |
| **구조** | 단순 문자열(또는 JSON) | host/port/login/password/schema/extra |
| **접근** | `Variable.get("X")`, `{{ var.value.X }}` | `conn_id`로 Hook/Operator에 전달 |
| **Secret Backend 지원** | ✅ | ✅ |
| **언제** | 임계값, 플래그, 환경 구분 등 단순 값 | DB/API/스토리지 접속 |

```python
from airflow.sdk import Variable

threshold = int(Variable.get("ALERT_THRESHOLD", default="1000"))
```

!!! warning "Variable에 비밀번호 넣지 말기"
    비밀번호/토큰은 Connection의 `password` 필드에 넣거나 Secret Backend를 사용하세요. Variable에 그대로 두면 UI에서 읽힐 수 있습니다.

---

## 9. 운영 팁

### (a) Connection 이름 규칙

| 패턴 | 예시 |
|------|------|
| `<system>_<env>` | `postgres_prd`, `redshift_stg` |
| `<team>_<system>` | `analytics_snowflake` |
| `<purpose>_<system>` | `etl_writer_postgres`, `bi_reader_postgres` |

환경별로 Connection을 분리하면 dev/stg/prd 간 DAG 코드를 건드릴 필요가 없어집니다.

### (b) 최소 권한 원칙

- 읽기 전용 Connection과 쓰기 Connection을 분리
- 테스트/개발용은 별도 Connection으로

### (c) 재사용은 Hook에, 표준은 Custom Operator에

- 여러 Operator에서 같은 외부 시스템을 건드린다 → Hook
- 여러 DAG에서 같은 **흐름**을 반복한다 → Custom Operator
- 둘 다 필요하면 둘 다

---

## 10. 정리

- **Hook은 접속, Operator는 흐름**을 담당한다.
- Connection은 UI/CLI/env var/Secret Backend 중 하나로 관리하며, 프로덕션은 Secret Backend 권장.
- 99%의 경우 **기존 Provider의 Hook/Operator**로 충분하다. 직접 만들기 전에 검색 먼저.
- Custom Hook/Operator는 `plugins/` 아래 둔다. 단순 import만 하면 바로 사용 가능.

!!! note "이 튜토리얼을 마치며"
    여기까지 오셨다면 Airflow 3의 기본부터 Operator 설계, Custom Operator 제작까지 이해하신 것입니다.

    이후 추천 학습:

    - **Asset 기반 데이터 파이프라인** 설계
    - **DAG Versioning** 활용 — 안전한 DAG 리팩터링
    - **Deferrable Operator** 도입으로 리소스 최적화
    - **OpenLineage** 연동으로 lineage 자동 수집

    실전에서 막히는 부분이 나오면 [공식 문서](https://airflow.apache.org/docs/)와 해당 Provider의 문서를 참고하세요.
