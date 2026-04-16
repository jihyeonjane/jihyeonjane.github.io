# 2. DAG 작성 기초

이 챕터에서는 **DAG 파일 하나를 제대로 쓰는 법**을 다룹니다.
이 챕터를 마치면 "schedule, default_args, 의존성, XCom, Assets" 같은 용어를 보고 바로 떠올릴 수 있게 됩니다.

---

## 1. 최소한의 DAG

가장 단순한 DAG 파일은 다음과 같습니다.

```python
# dags/minimal_dag.py
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from pendulum import datetime

with DAG(
    dag_id="minimal_dag",
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["tutorial"],
) as dag:
    BashOperator(
        task_id="hello",
        bash_command="echo 'Hello from Airflow 3'",
    )
```

구성 요소:

1. **`DAG` 객체** — 워크플로우 자체를 정의
2. **Task** — DAG 안에서 실제로 돌아가는 작업 (여기서는 `BashOperator`)
3. **의존성** — 여기서는 Task가 하나뿐이라 따로 선언 없음

`dags/` 폴더에 이 파일을 넣으면 **DAG Processor**가 파싱해서 메타DB에 등록하고, Scheduler가 매일 한 번씩 실행합니다.

!!! info "왜 `pendulum.datetime`?"
    Airflow는 내부적으로 시간대를 다루기 위해 [pendulum](https://pendulum.eustace.io/)을 사용합니다.
    Python 표준 `datetime`도 동작하지만, pendulum을 쓰면 timezone 처리가 안전합니다.

---

## 2. DAG 선언 방식 3가지

DAG를 정의하는 방법은 세 가지입니다. 기능 차이는 없고 스타일 차이입니다.

### (a) Context Manager (권장)

```python
with DAG("my_dag", start_date=datetime(2026, 1, 1), schedule="@daily") as dag:
    task1 = BashOperator(task_id="t1", bash_command="echo A")
    task2 = BashOperator(task_id="t2", bash_command="echo B")
    task1 >> task2
```

`with` 블록 안에서 생성된 Task는 자동으로 이 DAG에 속하게 됩니다. 가장 보편적인 방식.

### (b) 명시적 파라미터 (예전 스타일)

```python
dag = DAG("my_dag", start_date=datetime(2026, 1, 1), schedule="@daily")

task1 = BashOperator(task_id="t1", bash_command="echo A", dag=dag)
task2 = BashOperator(task_id="t2", bash_command="echo B", dag=dag)
task1 >> task2
```

모든 Task에 `dag=dag`를 넘겨야 해서 번거로움.

### (c) @dag 데코레이터 (TaskFlow 스타일)

```python
from airflow.sdk import dag, task

@dag(start_date=datetime(2026, 1, 1), schedule="@daily", catchup=False)
def my_dag():
    @task
    def hello():
        print("hi")

    hello()

my_dag()
```

TaskFlow API와 잘 어울리는 방식. Python 함수 호출처럼 DAG를 작성할 수 있습니다. 자세한 내용은 [챕터 3](03-operators.md)에서 다룹니다.

---

## 3. DAG의 핵심 파라미터

```python
DAG(
    dag_id="my_dag",                  # 유일한 식별자
    description="일간 사용자 집계",     # 설명
    start_date=datetime(2026, 1, 1),  # 언제부터 스케줄링할지
    end_date=None,                    # 언제 이후로 스케줄링 중단할지
    schedule="0 9 * * *",             # 실행 주기
    catchup=False,                    # 과거 밀린 Run을 자동 실행할지
    max_active_runs=1,                # 동시에 돌 수 있는 DAG Run 수
    max_active_tasks=16,              # DAG 내 동시 실행 Task 수
    default_args={...},               # 모든 Task에 공통 적용될 기본값
    params={...},                     # DAG Run 파라미터 (UI에서 수정 가능)
    tags=["etl", "daily"],            # 검색/필터용 태그
    doc_md="...",                     # UI에 표시될 DAG 문서 (마크다운)
)
```

### start_date와 catchup

Airflow의 가장 혼동되는 지점. 초보자가 꼭 겪는 실수가 여기서 나옵니다.

- `start_date`: **DAG가 "언제부터 존재했다고 간주할지"** 기준. 그 이전 데이터는 스케줄되지 않습니다.
- `catchup=True`: DAG 활성화 시점에 start_date부터 현재까지의 **밀린 Run을 모두 생성**
- `catchup=False`: 밀린 건 건너뛰고 **다음 예정 Run만** 생성

!!! warning "Airflow 3에서 catchup 기본값 변경"
    과거에는 `catchup_by_default=True`가 기본이었습니다. 의도치 않게 과거 백필이 폭발적으로 트리거되는 사고가 잦아서, **Airflow 3에서는 기본값이 `False`로 변경**되었습니다.
    백필이 필요한 경우에만 명시적으로 `catchup=True`를 주세요.

### schedule 표현법

Airflow 2에서 `schedule_interval`과 `timetable`로 나뉘어 있던 파라미터가 Airflow 3에서는 **`schedule` 하나로 통합**되었습니다.

| 형태 | 예시 | 의미 |
|------|------|------|
| **cron** | `"0 9 * * *"` | 매일 09:00 |
| **preset** | `"@daily"`, `"@hourly"`, `"@weekly"`, `"@monthly"` | 잘 알려진 주기 |
| **timedelta** | `timedelta(hours=6)` | 6시간마다 |
| **Timetable** | `CronTriggerTimetable("0 9 * * *", timezone="Asia/Seoul")` | 고급 스케줄 |
| **Asset list** | `[asset_a, asset_b]` | 이 Asset들이 업데이트되면 실행 |
| **`None`** | `None` | 수동 트리거만 |

!!! info "CronTriggerTimetable이 기본"
    Airflow 3부터 `"0 9 * * *"` 같은 cron 문자열은 기본적으로 `CronTriggerTimetable`로 해석됩니다 (설정값 `create_cron_data_intervals=False`). "스케줄 시점 = 실행 시점"으로 직관적으로 동작합니다.

---

## 4. default_args

DAG 안의 **모든 Task에 공통으로 적용**되는 기본값입니다. Task마다 같은 값을 반복하지 않도록 묶어둡니다.

```python
from datetime import timedelta

default_args = {
    "owner": "data-team",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
    "execution_timeout": timedelta(hours=1),
}

with DAG(
    "daily_etl",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
) as dag:
    ...
```

Task 쪽에서 같은 파라미터를 다시 지정하면 **Task 쪽 값이 우선**합니다.

### 자주 쓰는 default_args 항목

| 키 | 설명 |
|----|------|
| `owner` | Task 소유자 (UI 표시용) |
| `retries` | 실패 시 재시도 횟수 |
| `retry_delay` | 재시도 간격 |
| `retry_exponential_backoff` | 재시도 간격을 2배씩 늘릴지 여부 |
| `max_retry_delay` | backoff 상한 |
| `execution_timeout` | Task 최대 실행 시간, 초과 시 실패 처리 |
| `on_failure_callback` | 실패 시 호출될 함수 |
| `on_success_callback` | 성공 시 호출될 함수 |
| `email` / `email_on_failure` | 이메일 알림 |
| `depends_on_past` | 같은 Task의 이전 Run이 성공해야 실행 |

---

## 5. Task 의존성

Task들 사이의 실행 순서는 **`>>` / `<<` 연산자**로 선언합니다.

```python
t1 = BashOperator(task_id="extract", ...)
t2 = BashOperator(task_id="transform", ...)
t3 = BashOperator(task_id="load", ...)

# 직렬
t1 >> t2 >> t3

# 동치
t3 << t2 << t1
```

### 분기/병렬

```python
t1 >> [t2, t3] >> t4   # t1 이후 t2, t3 병렬 → 둘 다 끝나면 t4

extract >> [validate, log_raw]
validate >> transform >> load
log_raw >> archive
```

### 메서드 방식

```python
t1.set_downstream(t2)
t2.set_upstream(t1)
chain(t1, t2, t3)                 # airflow.sdk.chain
chain_linear(t1, [t2, t3], t4)    # 가장 표현적
```

### TaskGroup (SubDAG 대체)

Airflow 3에서 **SubDAG이 완전히 제거**되었습니다. 대신 **TaskGroup**을 쓰면 UI에서 여러 Task를 하나의 박스로 묶어 보여줍니다.

```python
from airflow.sdk import task_group

with DAG(...) as dag:
    extract = BashOperator(task_id="extract", ...)

    @task_group(group_id="validations")
    def validations():
        BashOperator(task_id="check_row_count", bash_command="...")
        BashOperator(task_id="check_nulls", bash_command="...")

    load = BashOperator(task_id="load", ...)

    extract >> validations() >> load
```

TaskGroup은 단순 시각적 그룹핑일 뿐 별도 DAG Run을 만들지 않습니다. SubDAG의 대부분 단점(스케줄링 복잡도, 동시성 제한)이 해결됩니다.

---

## 6. Context와 템플릿 변수

Task가 실행될 때 Airflow는 **실행 시점에 대한 메타데이터(Context)**를 주입합니다. Jinja 템플릿 `{{ ... }}`으로 접근하거나, Python 함수에서 `get_current_context()`로 가져올 수 있습니다.

### 자주 쓰는 템플릿 변수

| 변수 | 설명 |
|------|------|
| `{{ ds }}` | DAG Run의 논리 날짜 (YYYY-MM-DD) |
| `{{ ds_nodash }}` | 위와 동일, 하이픈 제거 (YYYYMMDD) |
| `{{ logical_date }}` | 논리 시각(pendulum DateTime). ⚠️ 과거 `execution_date`의 새 이름 |
| `{{ data_interval_start }}` | 데이터 구간 시작 |
| `{{ data_interval_end }}` | 데이터 구간 끝 |
| `{{ run_id }}` | DAG Run ID |
| `{{ dag.dag_id }}` | DAG ID |
| `{{ task.task_id }}` | Task ID |
| `{{ var.value.MY_VAR }}` | Airflow Variable 값 |
| `{{ conn.MY_CONN.host }}` | Connection 속성 |
| `{{ params.xxx }}` | DAG params 값 |

### BashOperator에서 템플릿 사용

```python
BashOperator(
    task_id="run_etl",
    bash_command="python /scripts/etl.py --date {{ ds }}",
)
```

### PythonOperator/TaskFlow에서 Context 가져오기

```python
from airflow.sdk import task, get_current_context

@task
def run_etl():
    ctx = get_current_context()
    ds = ctx["ds"]
    print(f"logical date = {ds}")
```

!!! warning "Airflow 3에서 사라진 컨텍스트 변수"
    `execution_date`, `tomorrow_ds`, `yesterday_ds`, `prev_ds`, `next_ds`, `prev_execution_date`, `next_execution_date` 등은 **제거**되었습니다.
    필요 시 `data_interval_start`, `data_interval_end`, `logical_date`로 대체하세요.

---

## 7. XCom: Task 간 데이터 전달

**XCom(Cross-Communication)**은 Task끼리 작은 데이터를 주고받는 메커니즘입니다. Python 함수의 return 값이나 `xcom_push`로 저장되고, 다른 Task가 `xcom_pull`로 꺼내 씁니다.

### TaskFlow 방식 (권장)

```python
from airflow.sdk import dag, task
from pendulum import datetime

@dag(start_date=datetime(2026, 1, 1), schedule="@daily", catchup=False)
def xcom_example():

    @task
    def extract() -> dict:
        return {"rows": 1234, "status": "ok"}

    @task
    def load(data: dict):
        print(f"loaded {data['rows']} rows")

    load(extract())

xcom_example()
```

`extract()`의 리턴값은 자동으로 XCom에 저장되고, `load(extract())` 연결만으로 의존성과 데이터 전달이 동시에 이뤄집니다.

### 전통적인 방식

```python
def push(**context):
    context["ti"].xcom_push(key="row_count", value=1234)

def pull(**context):
    value = context["ti"].xcom_pull(key="row_count", task_ids="push")
    print(value)
```

### XCom 사용 시 주의

- **크기 제한**: 기본 XCom 백엔드는 Metadata DB를 사용하므로 **작은 메타데이터 전달용**입니다. 큰 데이터(파케이 파일, 대용량 DataFrame)는 절대 XCom으로 넘기지 말고 S3 경로나 테이블 이름만 XCom으로, 실제 데이터는 외부 스토리지에 두세요.
- **Custom XCom Backend**: S3/GCS로 XCom을 저장하도록 백엔드를 바꿀 수 있습니다.

---

## 8. Asset (데이터 기반 스케줄링)

Airflow 2.4에서 **Dataset**으로 도입됐던 기능이, Airflow 3에서 **Asset**으로 이름이 바뀌고 크게 확장되었습니다.

"시간"이 아니라 "**데이터가 업데이트되면**"을 트리거로 하는 스케줄링 방식입니다.

```python
from airflow.sdk import Asset, DAG, task
from pendulum import datetime

# 자산 정의: URI로 식별
users_table = Asset("s3://mybucket/users.parquet")

# 생산자 DAG: 이 Asset을 업데이트
with DAG("producer", start_date=datetime(2026, 1, 1), schedule="@daily") as d1:
    @task(outlets=[users_table])
    def build_users():
        # ... 실제 작업 ...
        print("users.parquet 갱신")
    build_users()

# 소비자 DAG: users_table이 업데이트되면 자동 실행
with DAG("consumer", start_date=datetime(2026, 1, 1), schedule=[users_table]) as d2:
    @task
    def downstream_analysis():
        print("users.parquet 기반 분석 실행")
    downstream_analysis()
```

### Asset의 장점

- DAG 간 결합이 "스케줄 시간 일치"가 아니라 **실제 데이터 흐름** 기준
- Lineage가 자연스럽게 드러남 (producer → asset → consumer)
- SubDAG/TriggerDagRunOperator로 해결하던 워크플로우 연결 패턴이 훨씬 깔끔해짐

!!! info "Dataset → Asset"
    기존 Airflow 2의 `Dataset` 코드는 deprecation 경로로 일정 기간 호환됩니다. 새 프로젝트는 `Asset`으로 시작하세요.

---

## 9. 재시도, 타임아웃, 알림

운영에서 꼭 고려해야 하는 3종 세트입니다.

```python
from datetime import timedelta

BashOperator(
    task_id="my_task",
    bash_command="...",
    retries=3,                                 # 실패 시 3번 재시도
    retry_delay=timedelta(minutes=5),          # 5분 간격
    retry_exponential_backoff=True,            # 5분 → 10분 → 20분 순으로
    max_retry_delay=timedelta(hours=1),        # backoff 상한
    execution_timeout=timedelta(minutes=30),   # 30분 초과 시 실패
    on_failure_callback=notify_slack,          # 실패 시 호출
)
```

### Callback 예시

```python
def notify_slack(context):
    ti = context["task_instance"]
    msg = f":x: {ti.dag_id}.{ti.task_id} failed at {ti.start_date}"
    # ... Slack 전송 로직 ...
```

!!! warning "SLA는 Airflow 3에서 제거됨"
    Airflow 2의 `sla` 파라미터는 **Airflow 3에서 제거**되었습니다. 향후 "Deadline Alerts"로 대체될 예정이며, 당분간은 `execution_timeout` + `on_failure_callback` 조합으로 운영하는 패턴이 일반적입니다.

---

## 10. Variable / Connection / Param

Airflow는 DAG 코드 바깥에 값을 보관하는 세 가지 메커니즘을 제공합니다.

| 구분 | 용도 | 접근 |
|------|------|------|
| **Variable** | 일반 key-value 설정 | `Variable.get("X")` 또는 `{{ var.value.X }}` |
| **Connection** | 외부 시스템 접속 정보 (DB, API 등) | Hook/Operator에서 `conn_id`로 지정 |
| **Params** | DAG Run별로 달라지는 입력값, UI에서 수정 가능 | `{{ params.xxx }}` |

```python
from airflow.sdk import Variable

db_name = Variable.get("TARGET_DB", default="analytics")
```

```python
with DAG(
    ...,
    params={
        "country": "kr",
        "dry_run": False,
    },
) as dag:
    BashOperator(
        task_id="run",
        bash_command="python etl.py --country {{ params.country }}",
    )
```

---

## 11. 실전: 완성도 높은 DAG 예시

지금까지 배운 걸 모두 합친 예시입니다.

```python
# dags/daily_sales_etl.py
from datetime import timedelta
from pendulum import datetime

from airflow.sdk import DAG, task, task_group, get_current_context
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator


default_args = {
    "owner": "analytics",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(minutes=30),
}

with DAG(
    dag_id="daily_sales_etl",
    description="일간 매출 집계 파이프라인 (예시)",
    start_date=datetime(2026, 1, 1, tz="Asia/Seoul"),
    schedule="0 3 * * *",             # 매일 03:00 KST
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["etl", "sales", "daily"],
    doc_md="""
    ### daily_sales_etl
    매일 새벽 3시에 전일 매출 데이터를 집계합니다.
    - 입력: `raw.sales_events`
    - 출력: `mart.daily_sales`
    """,
) as dag:

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    @task
    def extract() -> dict:
        ctx = get_current_context()
        ds = ctx["ds"]
        # 실제로는 쿼리/다운로드 수행, 여기서는 메타만 반환
        return {"date": ds, "rows": 1234}

    @task_group(group_id="validate")
    def validate(data):
        @task
        def check_rows(d):
            assert d["rows"] > 0, "no rows"
        @task
        def check_freshness(d):
            print(f"data for {d['date']} ok")
        check_rows(data)
        check_freshness(data)

    @task
    def load(data: dict):
        print(f"loaded {data['rows']} rows for {data['date']}")

    extracted = extract()
    start >> extracted
    validate(extracted) >> load(extracted) >> end
```

이 DAG는:

- 시간대(`Asia/Seoul`)를 명시
- 재시도·타임아웃·소유자를 default_args로 묶음
- EmptyOperator로 시작/끝을 표시해 Graph view 가독성 향상
- TaskFlow로 데이터 흐름을 Python처럼 표현
- TaskGroup으로 검증 단계를 UI에 하나로 묶음
- `doc_md`로 DAG 설명을 UI에 노출

---

## 정리

| 항목 | 핵심 포인트 |
|------|-------------|
| DAG 선언 | `with DAG(...) as dag:` 또는 `@dag` |
| schedule | cron / preset / timedelta / Timetable / Asset / None |
| catchup | **Airflow 3 기본값 False** |
| default_args | 공통 파라미터 묶기, Task 쪽 지정이 우선 |
| 의존성 | `>>`, `<<`, `chain`, TaskGroup |
| Context | Jinja `{{ ds }}` or `get_current_context()` |
| XCom | 작은 데이터만, 큰 데이터는 외부 스토리지 경로만 |
| Asset | 데이터 기반 스케줄링, Dataset 후계 |

!!! note "다음 단계"
    이제 DAG의 구조를 잡았으니, **그 안을 채우는 Operator들**을 본격적으로 파헤칠 차례입니다.
    [Operator 완전정복](03-operators.md)에서 Operator의 종류와 내부 동작, TaskFlow API까지 자세히 다룹니다.
