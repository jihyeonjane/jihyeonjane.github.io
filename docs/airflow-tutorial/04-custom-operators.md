# 4. Custom Operator 만들기

기본 Operator만으로 모든 작업이 해결되진 않습니다. 사내 시스템, 특수한 API, 반복되는 복합 로직을 한 줄로 정리하려면 **나만의 Operator**를 만들어야 합니다.

이 챕터에서는 `plugins/` 폴더 구조의 동작 원리부터 **BaseOperator 상속 패턴**, Hook과의 조합, 실전 예제까지 자세히 다룹니다.

---

## 1. 언제 Custom Operator를 만드는가?

다음 중 하나라도 해당하면 Custom Operator의 유혹이 시작됩니다.

| 상황 | 예시 |
|------|------|
| 같은 복합 로직이 여러 DAG에서 반복됨 | "S3에서 파일 받기 → 검증 → DB 적재" 세 단계 묶음 |
| 기본 Operator로 가능하지만 **반복 파라미터가 너무 많음** | 매번 동일한 인증/로깅/알림 코드를 BashOperator에 나열 |
| **사내 시스템 연동**이 표준화되어야 함 | 내부 API, 자체 인증을 붙인 외부 스토리지 |
| 팀 표준 (재시도, 알림, 감사 로그)을 **강제**하고 싶음 | DAG 작성자가 잊어도 기본 탑재 |
| 기존 Operator에 **기능 추가** | 기존 Operator 상속 후 훅 추가 |

반대로 다음 경우는 Custom Operator를 만들 필요가 없습니다.

- 한 번만 쓰는 로직 → 그냥 `@task`로 끝
- 기존 Operator로 이미 충분 → 파라미터 몇 개 더 넘기면 끝
- 로직이 여러 곳에서 쓰이지만 "파이썬 함수 하나"면 됨 → 공용 모듈 + `@task` 호출

!!! tip "Custom Operator의 판단 기준"
    *"이 로직에 이름을 붙이면, 읽는 사람이 바로 이해하겠는가?"* 라는 질문을 해보세요.
    `NotifySlackWithDagContext`처럼 이름만 보고 목적이 이해되면 Operator로 만들 가치가 있습니다.

---

## 2. `plugins/` 폴더의 동작 원리

### 왜 plugins 폴더가 있는가?

Airflow는 기동 시 다음 경로를 **자동으로 `PYTHONPATH`에 포함**시킵니다.

```
/opt/airflow/dags/       # DAG 정의
/opt/airflow/plugins/    # 사용자 확장 코드 (Operator, Hook, Sensor 등)
/opt/airflow/config/     # 설정/공용 모듈
```

따라서 `plugins/` 아래에 놓인 Python 모듈은 DAG 파일에서 그냥 `import`로 사용할 수 있습니다.

```
/opt/airflow/
├── dags/
│   └── my_dag.py                   # from custom_operators.xxx import YyyOperator
└── plugins/
    ├── __init__.py
    ├── custom_operators/
    │   ├── __init__.py
    │   ├── slack_alert_operator.py
    │   └── csv_to_postgres_operator.py
    └── hooks/
        ├── __init__.py
        └── internal_api_hook.py
```

### plugins 폴더의 두 가지 사용법

Airflow에서 `plugins/`는 **두 가지 방식**으로 쓰입니다. 혼동하기 쉬우니 확실히 구분해두세요.

#### (a) 단순 Python 패키지로 (권장, 대부분의 경우)

그냥 파이썬 코드를 놓고 DAG에서 import만 하면 됩니다. **Airflow 2.0 이후 이 방식이 표준**입니다.

```python
# plugins/custom_operators/hello_operator.py
from airflow.sdk import BaseOperator

class HelloOperator(BaseOperator):
    ...
```

```python
# dags/my_dag.py
from custom_operators.hello_operator import HelloOperator
```

#### (b) AirflowPlugin 클래스로 등록 (UI 확장이 필요할 때만)

UI 블루프린트, 커스텀 뷰, 메뉴, 매크로 같은 **Airflow UI/플랫폼 자체 확장**이 필요한 경우에만 사용합니다.

```python
# plugins/my_plugin.py
from airflow.plugins_manager import AirflowPlugin

class MyPlugin(AirflowPlugin):
    name = "my_plugin"
    macros = [my_macro]
    # flask_blueprints, appbuilder_views 등
```

!!! info "Operator 자체는 (a)로 충분"
    Operator/Hook/Sensor **자체는 AirflowPlugin 등록이 필요 없습니다**. 그냥 `plugins/` 아래 놓고 import만 하면 됩니다.
    과거 문서에서 AirflowPlugin에 `operators = [...]`로 등록하라는 예시를 볼 수 있는데, 현재 Airflow에서는 **비권장**되고 (a) 방식이 표준입니다.

### `/opt/airflow/plugins` 실제 구조 예시

현업에서 흔히 보는 구조:

```
plugins/
├── __init__.py
├── custom_operators/            # 팀이 만든 Operator들
│   ├── __init__.py
│   ├── slack_alert_operator.py
│   ├── csv_to_postgres_operator.py
│   └── api_to_s3_operator.py
├── operators/                   # 단순 래퍼/유틸성 Operator (팀 컨벤션에 따라 분리)
│   ├── __init__.py
│   └── logged_bash_operator.py
├── hooks/
│   ├── __init__.py
│   └── internal_api_hook.py
├── sensors/
│   └── internal_queue_sensor.py
└── utils/                       # Operator가 공용으로 쓰는 유틸
    ├── __init__.py
    └── notifications.py
```

여러 하위 폴더로 나누는 건 팀 컨벤션일 뿐 Airflow 동작과는 무관합니다.

---

## 3. 가장 단순한 Custom Operator

시작점부터 보겠습니다.

```python
# plugins/custom_operators/hello_operator.py
from airflow.sdk import BaseOperator


class HelloOperator(BaseOperator):
    """인사 메시지를 출력하는 간단한 Operator."""

    def __init__(self, name: str, **kwargs):
        super().__init__(**kwargs)
        self.name = name

    def execute(self, context):
        message = f"Hello, {self.name}!"
        self.log.info(message)
        return message
```

DAG에서 사용:

```python
# dags/hello_dag.py
from pendulum import datetime
from airflow.sdk import DAG
from custom_operators.hello_operator import HelloOperator

with DAG("hello_custom", start_date=datetime(2026, 1, 1), schedule="@daily", catchup=False) as dag:
    HelloOperator(task_id="say_hi", name="Airflow 3")
```

### 체크포인트

- `from airflow.sdk import BaseOperator` — Airflow 3 경로
- `__init__`에서 **`**kwargs`를 `super().__init__`**에 넘겨야 `task_id`, `retries`, `owner` 등 표준 파라미터가 작동
- `execute(context)`가 본체. `context`에는 DAG Run 정보가 들어옴
- `self.log`는 BaseOperator가 제공하는 `logging.Logger`. `print` 대신 이것 사용
- 리턴값은 **자동으로 XCom에 저장**

!!! warning "Airflow 2 잔재: `apply_defaults` 필요 없음"
    예전 튜토리얼에서 `@apply_defaults` 데코레이터를 `__init__` 위에 붙이는 예시가 많습니다.
    **Airflow 2.x에서 이미 불필요해졌고**, Airflow 3에서도 필요 없습니다. 붙이지 마세요.

---

## 4. Template Fields 제대로 쓰기

Custom Operator에서 가장 자주 실수하는 포인트입니다.

### 문제 상황

다음 코드는 **작동하지 않습니다**.

```python
class BadOperator(BaseOperator):
    def __init__(self, target_date: str, **kwargs):
        super().__init__(**kwargs)
        self.target_date = target_date

    def execute(self, context):
        print(f"processing {self.target_date}")
```

```python
BadOperator(task_id="bad", target_date="{{ ds }}")
```

실행 결과: `processing {{ ds }}` — Jinja 템플릿이 치환되지 않음.

### 해결: `template_fields` 선언

```python
class GoodOperator(BaseOperator):
    template_fields = ("target_date",)   # ⭐ 클래스 레벨 속성

    def __init__(self, target_date: str, **kwargs):
        super().__init__(**kwargs)
        self.target_date = target_date

    def execute(self, context):
        print(f"processing {self.target_date}")   # 2026-04-16
```

### 렌더링 타이밍 다시 확인

```
1. DAG 파싱      : GoodOperator.__init__(target_date="{{ ds }}")
                   → self.target_date = "{{ ds }}"  (아직 문자열 그대로)

2. Task 실행 직전: Airflow가 template_fields에 있는 속성을 Jinja로 렌더링
                   → self.target_date = "2026-04-16"

3. execute() 호출 : self.target_date는 이미 렌더링된 값
```

### 자주 쓰는 관련 속성

```python
class SqlRunnerOperator(BaseOperator):
    template_fields = ("sql", "params")
    template_fields_renderers = {"sql": "sql"}   # UI 문법 하이라이팅
    template_ext = (".sql",)                      # sql="queries/daily.sql"이면 파일 내용을 읽어 렌더
    ui_color = "#7fcdbb"                          # UI에서 이 Operator의 색상
```

- **`template_fields_renderers`**: UI에서 해당 필드의 코드 하이라이팅 언어 지정. `"sql"`, `"json"`, `"python"` 등
- **`template_ext`**: 해당 확장자의 파일 경로를 인자로 받으면 **파일 내용을 읽어 템플릿**으로 렌더. 긴 SQL을 별도 `.sql` 파일로 관리할 때 유용
- **`ui_color`**: Graph view에서 박스 색상

---

## 5. Hook과 조합하기

"**Operator는 작업 흐름, Hook은 외부 시스템 연결**"이 Airflow의 기본 설계입니다.
DB 쿼리, API 호출, 인증 같은 연결 로직은 Hook에 두고, Operator는 Hook을 사용하는 쪽에 집중합니다.

### Hook 사용 위치가 중요

```python
from airflow.providers.postgres.hooks.postgres import PostgresHook

# ❌ 나쁜 예: __init__에서 Hook 생성
class BadOperator(BaseOperator):
    def __init__(self, conn_id: str, **kwargs):
        super().__init__(**kwargs)
        self.hook = PostgresHook(postgres_conn_id=conn_id)  # ⚠️ DAG 파싱마다 생성됨

    def execute(self, context):
        self.hook.run("...")

# ✅ 좋은 예: execute에서 Hook 생성
class GoodOperator(BaseOperator):
    def __init__(self, conn_id: str, **kwargs):
        super().__init__(**kwargs)
        self.conn_id = conn_id

    def execute(self, context):
        hook = PostgresHook(postgres_conn_id=self.conn_id)  # Task 실행 시에만 생성
        hook.run("...")
```

**이유**: `__init__`은 DAG Processor가 DAG을 파싱할 때마다 수 분~수 초 간격으로 호출됩니다. 여기서 DB/API 연결을 만들면 평소에도 불필요한 커넥션이 발생합니다. Hook은 반드시 `execute` 안에서 생성하세요.

---

## 6. 실전 예제 1: SlackAlertOperator

"파이프라인 완료/실패를 Slack 채널로 알림"을 Operator로 뽑아본 예시입니다.

```python
# plugins/custom_operators/slack_alert_operator.py
from airflow.sdk import BaseOperator
from airflow.providers.slack.hooks.slack_webhook import SlackWebhookHook


class SlackAlertOperator(BaseOperator):
    """
    Slack 웹훅으로 알림 메시지를 전송하는 Operator.

    :param slack_conn_id: Slack 웹훅 Connection ID
    :param channel: 전송할 채널 (생략 시 Connection 기본 채널)
    :param message: 메시지 본문 (Jinja 템플릿 적용)
    :param username: 메시지 발신자 표시 이름
    """

    template_fields = ("message", "channel")
    template_fields_renderers = {"message": "md"}
    ui_color = "#e8d3ff"

    def __init__(
        self,
        *,
        slack_conn_id: str = "slack_default",
        channel: str | None = None,
        message: str,
        username: str = "Airflow",
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.slack_conn_id = slack_conn_id
        self.channel = channel
        self.message = message
        self.username = username

    def execute(self, context):
        hook = SlackWebhookHook(slack_webhook_conn_id=self.slack_conn_id)
        self.log.info("Sending Slack message to %s", self.channel or "(default)")
        hook.send(
            text=self.message,
            channel=self.channel,
            username=self.username,
        )
```

사용:

```python
from custom_operators.slack_alert_operator import SlackAlertOperator

SlackAlertOperator(
    task_id="notify_done",
    slack_conn_id="team_slack",
    channel="#data-alerts",
    message=":white_check_mark: `{{ dag.dag_id }}` 완료 — {{ ds }}",
)
```

### 포인트 해설

- `*`를 써서 **키워드 전용 인자**로 강제 → 호출부 가독성↑, 미래의 파라미터 추가에 유연
- `template_fields`로 `message`, `channel`을 템플릿 대상 지정
- `template_fields_renderers`는 UI에서 메시지를 마크다운으로 하이라이팅
- Hook은 **execute에서만** 인스턴스화
- 모든 로깅은 `self.log` 사용

---

## 7. 실전 예제 2: CsvToPostgresOperator

"CSV 파일을 로드해 DataFrame 검증 후 Postgres 테이블에 적재"하는 복합 Operator.

```python
# plugins/custom_operators/csv_to_postgres_operator.py
from pathlib import Path

import pandas as pd
from airflow.sdk import BaseOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook


class CsvToPostgresOperator(BaseOperator):
    """
    로컬 CSV 파일을 Postgres 테이블에 적재한다.

    :param csv_path: CSV 파일 경로 (Jinja 템플릿 적용)
    :param schema: 대상 스키마
    :param table: 대상 테이블
    :param postgres_conn_id: Postgres Connection ID
    :param truncate: True면 적재 전에 테이블 TRUNCATE
    :param required_columns: 필수 컬럼 리스트 (누락 시 실패)
    """

    template_fields = ("csv_path", "schema", "table")
    template_fields_renderers = {"csv_path": "jinja2"}
    ui_color = "#ffeaa7"

    def __init__(
        self,
        *,
        csv_path: str,
        schema: str,
        table: str,
        postgres_conn_id: str = "postgres_default",
        truncate: bool = False,
        required_columns: list[str] | None = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.csv_path = csv_path
        self.schema = schema
        self.table = table
        self.postgres_conn_id = postgres_conn_id
        self.truncate = truncate
        self.required_columns = required_columns or []

    def execute(self, context):
        path = Path(self.csv_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV not found: {path}")

        self.log.info("Reading %s", path)
        df = pd.read_csv(path)
        self.log.info("Loaded %s rows, %s columns", len(df), len(df.columns))

        missing = [c for c in self.required_columns if c not in df.columns]
        if missing:
            raise ValueError(f"Required columns missing: {missing}")

        hook = PostgresHook(postgres_conn_id=self.postgres_conn_id)
        target = f"{self.schema}.{self.table}"

        if self.truncate:
            self.log.info("Truncating %s", target)
            hook.run(f"TRUNCATE TABLE {target};")

        self.log.info("Inserting into %s", target)
        hook.insert_rows(
            table=target,
            rows=df.itertuples(index=False, name=None),
            target_fields=list(df.columns),
        )

        return {"target": target, "rows": len(df)}
```

사용:

```python
from custom_operators.csv_to_postgres_operator import CsvToPostgresOperator

CsvToPostgresOperator(
    task_id="load_users",
    csv_path="/data/input/users_{{ ds }}.csv",
    schema="raw",
    table="users",
    postgres_conn_id="warehouse_postgres",
    truncate=True,
    required_columns=["user_id", "email", "created_at"],
)
```

### 포인트 해설

- **검증 → 적재**의 전체 흐름이 한 Operator에 담김. DAG 작성자는 파라미터 몇 개만 넘기면 됨
- 필수 컬럼 검증을 내장 → 팀 표준 강제
- 리턴값이 XCom으로 자동 저장 → downstream이 `{{ ti.xcom_pull(task_ids='load_users')['rows'] }}`로 사용 가능
- `required_columns`처럼 **가변 기본값은 `None`으로 받고 메서드에서 `[]`로 변환** — Python의 가변 기본 인자 함정 회피

---

## 8. `on_kill` — 강제 종료 시 뒷정리

Task가 중단될 때 외부 리소스(쿼리, Pod, 파일 락 등)를 정리해야 한다면 `on_kill`을 구현합니다.

```python
class LongRunningQueryOperator(BaseOperator):
    def __init__(self, *, conn_id: str, sql: str, **kwargs):
        super().__init__(**kwargs)
        self.conn_id = conn_id
        self.sql = sql
        self._query_id = None

    def execute(self, context):
        hook = PostgresHook(postgres_conn_id=self.conn_id)
        conn = hook.get_conn()
        self._query_id = get_session_id(conn)
        try:
            with conn.cursor() as cur:
                cur.execute(self.sql)
        finally:
            conn.close()

    def on_kill(self):
        if self._query_id:
            self.log.info("Cancelling query %s", self._query_id)
            # pg_cancel_backend 등 외부 취소 로직
```

`on_kill`은 UI에서 Task를 Mark Failed / Clear할 때, 혹은 `execution_timeout` 초과 시 호출됩니다.

---

## 9. 기존 Operator 상속으로 확장하기

처음부터 만들 필요 없이, 기존 Operator를 상속해 파라미터/로깅/알림을 덧붙이는 패턴도 강력합니다.

```python
# plugins/custom_operators/logged_bash_operator.py
from airflow.providers.standard.operators.bash import BashOperator


class LoggedBashOperator(BashOperator):
    """실행 시각과 명령을 감사 로그로 찍는 BashOperator."""

    def execute(self, context):
        self.log.info(
            "[audit] dag=%s task=%s user=%s cmd=%s",
            context["dag"].dag_id,
            context["task"].task_id,
            context.get("task_instance").task.owner,
            self.bash_command,
        )
        return super().execute(context)
```

팀 전체에 감사 로그 표준이 필요하면, `BashOperator` 대신 `LoggedBashOperator`를 쓰도록 가이드하면 됩니다.

---

## 10. Custom Sensor 만들기

Sensor도 같은 패턴입니다. `BaseSensorOperator`를 상속해 `poke()`만 구현합니다.

```python
# plugins/sensors/row_count_sensor.py
from airflow.providers.standard.sensors.base import BaseSensorOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook


class RowCountSensor(BaseSensorOperator):
    """테이블의 행 수가 threshold 이상이 될 때까지 대기."""

    template_fields = ("table", "threshold")

    def __init__(self, *, table: str, threshold: int, conn_id: str, **kwargs):
        super().__init__(**kwargs)
        self.table = table
        self.threshold = threshold
        self.conn_id = conn_id

    def poke(self, context) -> bool:
        hook = PostgresHook(postgres_conn_id=self.conn_id)
        count = hook.get_first(f"SELECT COUNT(*) FROM {self.table}")[0]
        self.log.info("Current count: %s (threshold %s)", count, self.threshold)
        return count >= int(self.threshold)
```

```python
RowCountSensor(
    task_id="wait_until_loaded",
    table="raw.events",
    threshold=10_000,
    conn_id="warehouse_postgres",
    poke_interval=60,
    timeout=60 * 60,
    mode="reschedule",
)
```

---

## 11. Custom Hook 간단히

Operator에서 사내 API를 계속 호출한다면 **Hook으로 추상화**하세요. Hook은 "**Connection 정보 해석 + 외부 시스템 호출**"을 담당하는 재사용 유닛입니다.

```python
# plugins/hooks/internal_api_hook.py
import requests
from airflow.hooks.base import BaseHook


class InternalApiHook(BaseHook):
    """사내 API를 호출하는 Hook."""

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
        session = self.get_conn()
        resp = session.post(f"{session.base_url}/reports/{report_id}/refresh", timeout=30)
        resp.raise_for_status()
        return resp.json()
```

이 Hook을 이용한 Operator는 매우 얇아집니다.

```python
# plugins/custom_operators/refresh_report_operator.py
from airflow.sdk import BaseOperator
from hooks.internal_api_hook import InternalApiHook


class RefreshReportOperator(BaseOperator):
    template_fields = ("report_id",)

    def __init__(self, *, report_id: str, conn_id: str = "internal_api_default", **kwargs):
        super().__init__(**kwargs)
        self.report_id = report_id
        self.conn_id = conn_id

    def execute(self, context):
        hook = InternalApiHook(self.conn_id)
        return hook.refresh_report(self.report_id)
```

Hook은 [챕터 5](05-hooks-connections.md)에서 자세히 다룹니다.

---

## 12. Deferrable Custom Operator (고급)

긴 대기가 있는 Custom Operator는 **Triggerer를 활용**해 Worker 슬롯을 점유하지 않도록 만들 수 있습니다. 여기서는 뼈대만 소개합니다.

```python
from airflow.triggers.base import BaseTrigger, TriggerEvent
from airflow.sdk import BaseOperator


class MyTrigger(BaseTrigger):
    def __init__(self, url: str, interval: int):
        super().__init__()
        self.url = url
        self.interval = interval

    def serialize(self):
        return (
            "plugins.triggers.my_trigger.MyTrigger",
            {"url": self.url, "interval": self.interval},
        )

    async def run(self):
        import asyncio, aiohttp
        async with aiohttp.ClientSession() as s:
            while True:
                async with s.get(self.url) as r:
                    if r.status == 200:
                        data = await r.json()
                        if data.get("ready"):
                            yield TriggerEvent(data)
                            return
                await asyncio.sleep(self.interval)


class WaitForReportOperator(BaseOperator):
    template_fields = ("url",)

    def __init__(self, *, url: str, interval: int = 30, **kwargs):
        super().__init__(**kwargs)
        self.url = url
        self.interval = interval

    def execute(self, context):
        self.defer(
            trigger=MyTrigger(url=self.url, interval=self.interval),
            method_name="execute_complete",
        )

    def execute_complete(self, context, event=None):
        self.log.info("Report ready: %s", event)
        return event
```

- `execute`에서 **`self.defer(...)`**로 스스로를 보류
- Triggerer가 비동기로 이벤트 감시
- 조건 충족 시 `execute_complete`가 호출되어 Task 완료

Deferrable Operator는 **수천 개의 대기를 경제적으로 처리**할 수 있는 Airflow 3의 핵심 최적화 수단입니다.

---

## 13. 테스트

Custom Operator는 단위 테스트가 가능합니다. Airflow 전체를 띄울 필요 없습니다.

```python
# tests/test_hello_operator.py
from unittest.mock import MagicMock
from custom_operators.hello_operator import HelloOperator


def test_hello_operator_returns_message():
    op = HelloOperator(task_id="t", name="World")
    result = op.execute(context=MagicMock())
    assert result == "Hello, World!"
```

Operator가 Hook을 쓴다면 Hook을 mock하여 외부 의존성 없이 테스트할 수 있습니다.

```python
from unittest.mock import patch

@patch("custom_operators.slack_alert_operator.SlackWebhookHook")
def test_slack_alert_sends(mock_hook_cls):
    op = SlackAlertOperator(task_id="t", message="hi", slack_conn_id="x")
    op.execute(context={"ds": "2026-04-16"})
    mock_hook_cls.return_value.send.assert_called_once()
```

---

## 14. 패키징: Provider로 배포하기 (선택)

Custom Operator를 **여러 저장소/팀에서 공유**하려면 단순한 pip 패키지로 만들거나, 아예 **Airflow Provider 패키지** 규격을 따를 수 있습니다.

기본 Python 패키지:

```
my-airflow-extensions/
├── pyproject.toml
└── src/
    └── my_ext/
        ├── __init__.py
        └── operators/
            └── slack_alert.py
```

```bash
pip install git+https://github.com/myorg/my-airflow-extensions.git
```

이후 DAG에서 그냥 `from my_ext.operators.slack_alert import SlackAlertOperator`.

Provider 규격은 추가로 `get_provider_info()` 엔트리포인트, UI 메타데이터 등을 포함합니다. 외부에 공개하거나 여러 레포를 아우를 때 고려.

---

## 15. 정리

| 원칙 | 설명 |
|------|------|
| **BaseOperator 상속** | `from airflow.sdk import BaseOperator` |
| **`__init__`는 가볍게** | 파라미터만 저장, 연결/쿼리 절대 금지 |
| **`execute`가 본체** | 실제 작업은 여기서 |
| **`template_fields` 선언** | Jinja 템플릿이 적용될 속성 |
| **Hook은 execute에서 생성** | DAG 파싱 부하 방지 |
| **`self.log` 사용** | print 대신 로거 |
| **가능하면 기존 Operator 상속** | 처음부터 작성 < 검증된 것 확장 |
| **단위 테스트 작성** | Airflow 없이도 테스트 가능 |

### 사고 흐름

```
반복 로직 발견
   ↓
기존 Operator로 해결 가능? ── YES → 재사용으로 끝
   ↓ NO
기존 Operator 상속으로 해결? ── YES → 가볍게 확장
   ↓ NO
Hook이 우선 필요? ── YES → Hook부터 만들기
   ↓ 그리고/또는
BaseOperator 상속 Custom Operator 작성
   ↓
plugins/ 폴더에 배치, DAG에서 import
```

!!! note "다음 단계"
    Operator가 "무엇을 할지"라면, Hook은 "어디에 연결할지"입니다.
    [Hook & Connection](05-hooks-connections.md)에서 Hook/Connection 개념과 관리 방법을 정리합니다.
