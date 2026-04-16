# 3. Operator 완전정복

이 챕터는 이 튜토리얼의 **중심**입니다.
Operator의 개념, 내부 동작, 대표 Operator 사용법, 그리고 Airflow 3의 TaskFlow API까지 깊게 다룹니다.

---

## 1. Operator란?

DAG가 "**워크플로우의 설계도**"라면, Operator는 그 설계도 안에서 **"무엇을 할지를 정의하는 템플릿"**입니다.

공식 문서의 표현을 빌리면:

> **An Operator is a template for a predefined Task.**

흐름으로 정리하면:

```
Operator (클래스)           — 예: BashOperator
    │
    │ 인스턴스화
    ▼
Task (DAG 안의 노드)         — 예: BashOperator(task_id="hello", ...)
    │
    │ DAG Run 실행 시점
    ▼
Task Instance (실제 실행)    — 2026-04-16 09:00의 hello
```

- **Operator**: "이 유형의 작업은 어떻게 하는가"를 정의한 Python 클래스
- **Task**: Operator를 인스턴스화해서 DAG 안에 박아 넣은 노드 (파라미터가 고정된 상태)
- **Task Instance**: 특정 DAG Run에서 Task가 실제로 실행된 하나의 사례

!!! tip "비유"
    Operator는 **레시피**, Task는 **그 레시피로 만든 요리의 '주문'**, Task Instance는 **오늘 점심에 실제로 만든 한 접시**입니다.

---

## 2. Operator의 3가지 분류

Operator는 개념적으로 세 종류로 나뉩니다.

| 분류 | 설명 | 대표 Operator |
|------|------|---------------|
| **Action Operator** | 실제 작업을 "수행"하는 Operator | `BashOperator`, `PythonOperator`, `SQLExecuteQueryOperator`, `EmailOperator` |
| **Transfer Operator** | 시스템 A → 시스템 B로 데이터를 "옮기는" Operator | `S3ToRedshiftOperator`, `GCSToBigQueryOperator` |
| **Sensor** | 특정 조건이 만족될 때까지 "기다리는" Operator | `FileSensor`, `ExternalTaskSensor`, `S3KeySensor` |

세 분류의 공통 조상은 **`BaseOperator`**입니다 (Sensor는 `BaseSensorOperator` 경유). 모든 Operator는 `execute(context)` 메서드를 가지고, 그 안에 고유 로직이 담깁니다.

---

## 3. BaseOperator 구조

Custom Operator를 만들려면 `BaseOperator`의 구조를 알아야 합니다. 여기서는 개념만 훑고, 자세한 구현은 [챕터 4](04-custom-operators.md)에서 다룹니다.

```python
from airflow.sdk import BaseOperator

class HelloOperator(BaseOperator):
    template_fields = ("name",)   # Jinja 템플릿을 허용할 인자 선언

    def __init__(self, name: str, **kwargs):
        super().__init__(**kwargs)   # task_id, retries 등 상위에 위임
        self.name = name

    def execute(self, context):
        message = f"Hello {self.name}!"
        print(message)
        return message              # 리턴값은 자동으로 XCom에 저장
```

핵심 메서드:

| 메서드 | 호출 시점 | 역할 |
|--------|-----------|------|
| `__init__` | **DAG 파싱마다 호출** | 파라미터만 저장. 무거운 작업 금지 |
| `execute(context)` | **Task 실행 시 한 번** | 실제 로직 |
| `on_kill()` | Task 강제 종료 시 | 자원 정리 (DB 연결 종료 등) |
| `pre_execute` / `post_execute` | execute 전/후 | 훅 |

Airflow 3에서 `BaseOperator`는 **`airflow.sdk`**에 있습니다.

```python
# ❌ Airflow 2
from airflow.models import BaseOperator

# ✅ Airflow 3 (권장)
from airflow.sdk import BaseOperator
```

---

## 4. Provider 패키지 구조

Airflow 3부터 **Operator는 대부분 Provider 패키지로 분리**되었습니다. "Airflow 본체는 얇게, 각 외부 시스템 연동은 따로 설치"라는 철학입니다.

### 설치 예시

```bash
pip install apache-airflow==3.0.0
pip install apache-airflow-providers-standard      # Bash/Python/Empty 등 기본
pip install apache-airflow-providers-amazon        # S3, Redshift, Athena, Glue 등
pip install apache-airflow-providers-postgres      # PostgresHook, 관련 Operator
pip install apache-airflow-providers-slack         # SlackWebhookOperator
pip install apache-airflow-providers-cncf-kubernetes  # KubernetesPodOperator
pip install apache-airflow-providers-http          # HttpOperator, HttpSensor
pip install apache-airflow-providers-docker        # DockerOperator
```

### Import 경로 패턴

```python
from airflow.providers.<provider_name>.operators.<module> import <Operator>
```

예:

```python
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.amazon.aws.operators.s3 import S3CopyObjectOperator
from airflow.providers.postgres.operators.postgres import SQLExecuteQueryOperator
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
```

Docker 이미지로 띄운 Airflow 공식 이미지에는 주요 Provider가 이미 포함되어 있습니다. 필요한 Provider가 빠져 있으면 직접 `pip install`.

---

## 5. 대표 Operator 상세

이제 실무에서 가장 자주 만나는 Operator들을 하나씩 살펴봅니다.

### 5-1. BashOperator

**쉘 명령/스크립트**를 실행합니다. 가장 기본이지만 가장 많이 쓰입니다.

```python
from airflow.providers.standard.operators.bash import BashOperator

task = BashOperator(
    task_id="run_script",
    bash_command="python /opt/scripts/etl.py --date {{ ds }}",
    env={"PYTHONPATH": "/opt/scripts"},   # 추가 환경변수
    append_env=True,                      # 기본 env에 덧붙임
    cwd="/opt/scripts",                   # 작업 디렉토리
    retries=2,
)
```

**주요 포인트:**

- `bash_command`는 **Jinja 템플릿 적용**됨 (`{{ ds }}` 등 사용 가능)
- **반드시 공백 또는 개행으로 끝나야 함** — `bash_command="echo hi"`는 OK지만, 파일 경로 하나만 쓰면 Airflow가 그 **파일 내용을** 템플릿으로 읽는 기능이 있어서 혼란이 생깁니다. 주의.
- 종료 코드 0이면 성공, 0이 아니면 실패
- 표준출력은 Task 로그로 캡처

!!! tip "스크립트 파일을 템플릿으로 불러오기"
    ```python
    BashOperator(
        task_id="run_sql_script",
        bash_command="scripts/etl.sh ",  # 끝에 공백 → 파일을 템플릿으로 렌더링
    )
    ```
    `scripts/etl.sh` 안의 `{{ ds }}` 등도 치환됩니다.

---

### 5-2. PythonOperator와 @task

**Python 함수를 실행**합니다. 실무에서 가장 많이 쓰는 두 가지 방식입니다.

#### (a) 전통적 PythonOperator

```python
from airflow.providers.standard.operators.python import PythonOperator

def extract(**context):
    ds = context["ds"]
    print(f"extracting for {ds}")
    return {"rows": 100}

task = PythonOperator(
    task_id="extract",
    python_callable=extract,
    op_kwargs={"threshold": 10},   # 함수에 넘길 추가 인자
)
```

- `python_callable`에 파이썬 함수 전달
- `op_args`, `op_kwargs`로 추가 인자
- 함수의 리턴값은 XCom에 자동 저장
- Context는 **`**context`**로 받습니다 (Airflow 3에서는 `provide_context`가 사라짐)

#### (b) @task (TaskFlow API) — 권장

```python
from airflow.sdk import dag, task
from pendulum import datetime

@dag(start_date=datetime(2026, 1, 1), schedule="@daily", catchup=False)
def pipeline():

    @task
    def extract() -> dict:
        return {"rows": 100}

    @task
    def transform(data: dict) -> int:
        return data["rows"] * 2

    @task
    def load(rows: int):
        print(f"loaded {rows}")

    load(transform(extract()))

pipeline()
```

**@task의 장점:**

- DAG 의존성이 **Python 함수 호출 그래프**로 자연스럽게 표현됨
- XCom push/pull이 **암묵적으로 처리**됨
- 타입 힌트가 살아 있음
- 단위 테스트가 쉬움

!!! info "@task vs PythonOperator"
    공식 문서도 단순 파이썬 실행은 **`@task`를 권장**합니다.
    다만 `@task`는 Jinja 템플릿이 인자에 바로 적용되지 않으므로, 복잡한 템플릿 로직은 여전히 전통 방식이 편한 경우가 있습니다.

#### @task의 변형

| 데코레이터 | 설명 |
|------------|------|
| `@task` | 기본 Python 실행 |
| `@task.virtualenv` | 격리된 venv에서 실행 (의존성 충돌 회피) |
| `@task.external_python` | 외부에 이미 있는 Python 인터프리터 사용 |
| `@task.docker` | 도커 컨테이너에서 실행 |
| `@task.kubernetes` | K8s Pod에서 실행 |
| `@task.branch` | 분기용 (아래 BranchPythonOperator 참고) |
| `@task.short_circuit` | False 리턴 시 다운스트림 전부 스킵 |
| `@task.sensor` | 커스텀 센서 |

```python
@task.virtualenv(requirements=["pandas==2.2.0"])
def analyze():
    import pandas as pd
    ...
```

---

### 5-3. SQLExecuteQueryOperator

**DB에 SQL을 실행**합니다. Airflow 2.x 시절의 `PostgresOperator`, `MySqlOperator`, `SnowflakeOperator` 등이 **Airflow 2.8 이후 `SQLExecuteQueryOperator`로 통합**되었고, Airflow 3에서도 이것이 정석입니다.

```python
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

SQLExecuteQueryOperator(
    task_id="aggregate_daily",
    conn_id="warehouse_postgres",
    sql="""
        INSERT INTO mart.daily_sales
        SELECT date, sum(amount) FROM raw.sales
        WHERE date = '{{ ds }}'
        GROUP BY date
    """,
    autocommit=True,
)
```

**주요 포인트:**

- `conn_id`: Airflow Connection 이름 (DB 종류는 Connection이 결정)
- `sql`: 문자열, 리스트(여러 문장), 또는 `.sql` 파일 경로 모두 가능
- Jinja 템플릿 자동 적용
- 결과를 XCom으로 받으려면 `return_last=True` 등 추가 설정

---

### 5-4. EmailOperator / SmtpNotifier

메일 전송. Airflow 3에서는 **Notifier 객체**로 추상화하는 방향도 권장됩니다.

```python
from airflow.providers.smtp.operators.smtp import EmailOperator

EmailOperator(
    task_id="notify_done",
    to=["team@example.com"],
    subject="[ETL] {{ ds }} 완료",
    html_content="<p>일간 ETL이 정상 종료되었습니다.</p>",
)
```

실패 알림용으로는 `on_failure_callback`에 SmtpNotifier/SlackNotifier를 거는 패턴이 더 일반적입니다.

---

### 5-5. HttpOperator / HttpSensor

**외부 REST API 호출**.

```python
from airflow.providers.http.operators.http import HttpOperator

HttpOperator(
    task_id="call_api",
    http_conn_id="my_api",
    endpoint="/v1/refresh",
    method="POST",
    data='{"full": true}',
    headers={"Content-Type": "application/json"},
    response_check=lambda resp: resp.status_code == 200,
    log_response=True,
)
```

- `http_conn_id`의 Connection에 host/auth 설정
- `response_check`가 False면 Task 실패 처리
- 응답 본문은 XCom에 저장됨

---

### 5-6. EmptyOperator / LatestOnlyOperator

**실제로 아무 일도 안 하는** Operator들. 흐름 제어에 유용합니다.

```python
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.latest_only import LatestOnlyOperator
```

| Operator | 용도 |
|----------|------|
| `EmptyOperator` | "시작점/종료점/그룹 경계"를 시각적으로 표시 (과거 `DummyOperator` 후계) |
| `LatestOnlyOperator` | 가장 최근 DAG Run에서만 downstream 실행. 백필 시 자동 스킵 |

```python
start = EmptyOperator(task_id="start")
end   = EmptyOperator(task_id="end")

start >> [t1, t2, t3] >> end
```

---

### 5-7. BranchPythonOperator / @task.branch

**조건부 분기**. Python 함수가 반환하는 task_id만 실행되고, 나머지는 skip됩니다.

```python
from airflow.sdk import task
from airflow.providers.standard.operators.empty import EmptyOperator

@task.branch
def choose(**context):
    if context["ds"].endswith("-01"):
        return "monthly_path"
    return "daily_path"

with DAG(...) as dag:
    branch = choose()
    daily   = EmptyOperator(task_id="daily_path")
    monthly = EmptyOperator(task_id="monthly_path")
    done    = EmptyOperator(task_id="done", trigger_rule="none_failed_min_one_success")

    branch >> [daily, monthly] >> done
```

- 선택되지 않은 분기는 **`skipped` 상태**가 됨
- 그대로 두면 downstream도 skip되므로, 합류 지점은 **`trigger_rule="none_failed_min_one_success"`**로 설정

---

### 5-8. ShortCircuitOperator / @task.short_circuit

`False`를 리턴하면 **downstream 전체를 skip**합니다.

```python
@task.short_circuit
def data_exists(**context):
    # 데이터가 없으면 이후 단계 전체 생략
    return check_source_has_rows()
```

!!! tip "Branch vs ShortCircuit"
    - **Branch**: 여러 경로 중 하나를 선택
    - **ShortCircuit**: 조건 실패 시 이후를 전부 생략

---

### 5-9. TriggerDagRunOperator

**다른 DAG을 트리거**합니다. DAG 간 연결을 코드로 표현할 때 씁니다.

```python
from airflow.providers.standard.operators.trigger_dagrun import TriggerDagRunOperator

TriggerDagRunOperator(
    task_id="trigger_downstream",
    trigger_dag_id="analytics_dag",
    conf={"date": "{{ ds }}"},       # 다른 DAG에 넘길 파라미터
    wait_for_completion=True,        # 끝날 때까지 대기
    poke_interval=60,
)
```

!!! info "Asset이 더 나은 대안일 수 있음"
    단순히 "A 끝나면 B 실행"이라면, TriggerDagRunOperator 대신 **Asset 기반 스케줄링**([챕터 2 §8](02-dag-basics.md#8-asset))이 더 깔끔합니다. 결합도가 낮고 lineage가 자연스럽게 드러납니다.

---

### 5-10. Sensor 계열

**특정 조건이 참이 될 때까지 기다리는** Operator. 파일 도착, 다른 DAG 완료, S3 key 존재 등.

대표 Sensor:

| Sensor | 조건 |
|--------|------|
| `FileSensor` | 로컬 파일 존재 |
| `S3KeySensor` | S3 오브젝트 존재 |
| `ExternalTaskSensor` | 다른 DAG의 특정 Task 완료 |
| `SqlSensor` | SQL이 참을 리턴 |
| `DateTimeSensor` | 특정 시각 도달 |
| `HttpSensor` | HTTP 응답 기준 충족 |

```python
from airflow.providers.standard.sensors.filesystem import FileSensor

FileSensor(
    task_id="wait_for_file",
    filepath="/data/input/today.csv",
    poke_interval=60,                 # 1분마다 체크
    timeout=60 * 60 * 2,              # 2시간 대기 후 실패
    mode="reschedule",                # ⭐ 중요
)
```

#### Sensor의 3가지 mode

| mode | 설명 | 언제 쓰나 |
|------|------|-----------|
| `poke` | Worker 슬롯을 점유한 채 계속 체크 | 짧은 대기 (몇 분) |
| `reschedule` | 체크 후 슬롯을 비우고 재스케줄링 | 긴 대기 (시간 단위) — **기본값 권장** |
| `deferrable=True` | Triggerer가 이벤트 감시, Worker 자원 완전히 해방 | 수천 개 센서 동시 운영 |

!!! warning "poke 모드 남용 주의"
    `mode="poke"`인 Sensor 100개가 동시에 대기하면 Worker 슬롯 100개가 그대로 점유됩니다. 긴 대기는 반드시 `reschedule` 또는 `deferrable=True`로 두세요.

---

### 5-11. KubernetesPodOperator

**Task를 K8s Pod으로 띄워 실행**합니다. 의존성 격리, 대형 작업의 리소스 분리에 유용.

```python
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

KubernetesPodOperator(
    task_id="ml_training",
    name="train-model",
    namespace="airflow-jobs",
    image="myrepo/ml-trainer:1.2.3",
    cmds=["python"],
    arguments=["train.py", "--date", "{{ ds }}"],
    env_vars={"MODEL_NAME": "churn-v2"},
    resources={
        "request_cpu": "2",
        "request_memory": "8Gi",
        "limit_memory": "16Gi",
    },
    get_logs=True,
    is_delete_operator_pod=True,
)
```

**장점:**

- 각 Task가 자체 이미지/의존성으로 실행 → Airflow 워커 환경 오염 X
- 리소스 요청을 Task별로 지정 (메모리 큰 작업만 따로 큰 Pod)
- K8s 스케일링 기능 그대로 활용

**KubernetesExecutor와의 차이:**

- **KubernetesExecutor**: 모든 Task가 Pod으로 실행됨 (Executor 레벨)
- **KubernetesPodOperator**: 특정 Task만 Pod으로 실행 (Operator 레벨). 다른 Executor와 혼용 가능

---

### 5-12. DockerOperator

도커 컨테이너로 Task 실행. K8s가 없는 환경에서 의존성 격리가 필요할 때 사용.

```python
from airflow.providers.docker.operators.docker import DockerOperator

DockerOperator(
    task_id="run_in_docker",
    image="myrepo/etl:1.0",
    command="python etl.py --date {{ ds }}",
    auto_remove=True,
    mount_tmp_dir=False,
    network_mode="bridge",
)
```

---

### 5-13. Transfer Operator

"A → B로 데이터 이동"을 캡슐화한 Operator들. 이름이 `XToY` 패턴입니다.

대표 예:

| Operator | 용도 |
|----------|------|
| `S3ToRedshiftOperator` | S3 → Redshift COPY |
| `GCSToBigQueryOperator` | GCS → BigQuery 적재 |
| `PostgresToGCSOperator` | Postgres 쿼리 → GCS export |
| `MySqlToGCSOperator` | MySQL 쿼리 → GCS export |
| `LocalFilesystemToS3Operator` | 로컬 파일 → S3 업로드 |

```python
from airflow.providers.amazon.aws.transfers.s3_to_redshift import S3ToRedshiftOperator

S3ToRedshiftOperator(
    task_id="load_to_redshift",
    schema="public",
    table="events",
    s3_bucket="my-bucket",
    s3_key="events/{{ ds }}/",
    copy_options=["CSV", "IGNOREHEADER 1"],
    redshift_conn_id="redshift",
    aws_conn_id="aws_default",
)
```

Transfer Operator가 없으면 BashOperator나 PythonOperator로 직접 구현해야 하므로, 가능한 기존 Transfer Operator를 찾아 쓰는 게 효율적입니다.

---

## 6. Deferrable Operator

**Airflow 2.2에 도입되어 Airflow 3에서 중심적인 패턴이 된 기능**입니다.

### 문제: 오래 기다리는 Task가 워커를 점유

Sensor나 외부 작업(예: BigQuery 쿼리 수분 대기, K8s Pod 완료 대기) 때문에 Worker 슬롯이 하염없이 묶이는 문제가 있었습니다.

### 해결: Triggerer에게 "대기"를 위임

Deferrable Operator는 "외부 이벤트를 기다려야 할 때 스스로를 defer(보류)"합니다. 그러면 Worker 슬롯이 즉시 해제되고, **Triggerer**라는 가벼운 프로세스가 이벤트를 감시하다가 조건이 만족되면 다시 Task를 재개시킵니다.

```
Worker        Triggerer         External System
  │             │                    │
  │ execute()   │                    │
  ├────────────>│ (Trigger 등록, defer)
  │             │                    │
  │  <Worker 슬롯 즉시 해제>         │
  │             │                    │
  │             │ poll                │
  │             ├──────────────────> │
  │             │ <──── event ───────│
  │             │                    │
  │<────────────┤ resume              │
  │ resume handler 실행 (짧게)        │
  │             │                    │
```

### 사용법

대부분의 주요 Operator/Sensor가 `deferrable=True`를 지원합니다.

```python
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor

S3KeySensor(
    task_id="wait_data",
    bucket_name="my-bucket",
    bucket_key="raw/{{ ds }}/",
    deferrable=True,                 # ⭐
    poke_interval=60,
)
```

```python
KubernetesPodOperator(
    ...,
    deferrable=True,
)
```

### 효과

- Worker 슬롯 100개였던 환경에서 수천 개 Task의 대기를 동시 처리 가능
- 운영 비용/자원 절감
- Airflow 3에서는 **Deferrable이 권장 기본값**이 되어가는 추세

!!! info "Triggerer 활성화"
    Docker Compose 공식 설정에는 `airflow-triggerer`가 이미 포함되어 있습니다. 직접 운영한다면 `airflow triggerer` 프로세스를 반드시 띄워야 Deferrable이 작동합니다.

---

## 7. 템플릿 렌더링 (template_fields)

Operator 파라미터가 **Jinja 템플릿**으로 처리되려면, 해당 Operator 클래스가 `template_fields`에 그 속성을 선언해야 합니다.

```python
class MyOperator(BaseOperator):
    template_fields = ("query", "output_path")

    def __init__(self, query, output_path, **kwargs):
        super().__init__(**kwargs)
        self.query = query
        self.output_path = output_path
```

이렇게 선언된 `query`와 `output_path`는 Task 실행 전에 `{{ ds }}`, `{{ params.xxx }}` 등이 치환됩니다.

### 렌더링 타이밍

```
DAG 파싱        →  Task 실행 직전            →  execute()
  │                 │                            │
  Operator 인스턴스화  template_fields 렌더링     self.query에는
  (원본 문자열 상태)    (Jinja → 최종 문자열)     렌더된 결과가 들어있음
```

`__init__`에서 본 `self.query`는 **아직 렌더링 전**, `execute`에서 본 `self.query`는 **렌더링 후**입니다. 이 차이가 Custom Operator 작성 시 가장 자주 실수하는 부분입니다 ([챕터 4](04-custom-operators.md)에서 자세히).

### 유용한 관련 속성

| 속성 | 용도 |
|------|------|
| `template_fields` | 렌더링 대상 인자 이름들 |
| `template_fields_renderers` | UI에서 문법 하이라이팅 (`{"query": "sql"}` 등) |
| `template_ext` | 인자가 이 확장자 파일 경로일 때 파일 내용을 읽어 렌더 (`.sql`, `.json` 등) |

```python
class MySqlRunner(BaseOperator):
    template_fields = ("sql",)
    template_fields_renderers = {"sql": "sql"}
    template_ext = (".sql",)
```

---

## 8. trigger_rule: Task 실행 조건 세밀 제어

기본적으로 Task는 **upstream이 모두 성공**해야 실행됩니다. 이 조건은 `trigger_rule`로 바꿀 수 있습니다.

| trigger_rule | 실행 조건 |
|--------------|-----------|
| `all_success` | (기본) 모든 upstream 성공 |
| `all_failed` | 모든 upstream 실패 |
| `all_done` | 모든 upstream 완료 (성공/실패 무관) |
| `one_success` | 하나라도 성공 |
| `one_failed` | 하나라도 실패 |
| `none_failed` | 실패 없음 (성공 또는 skip) |
| `none_failed_min_one_success` | 실패 없이 하나라도 성공 |
| `none_skipped` | 스킵 없음 |
| `always` | 언제나 실행 |

### 대표 사용 패턴

**1) 실패 시 알림 Task** — `one_failed`

```python
t1 >> t2 >> t3
notify_failure = EmailOperator(..., trigger_rule="one_failed")
[t1, t2, t3] >> notify_failure
```

**2) 무조건 돌아야 하는 정리 Task** — `all_done`

```python
cleanup = BashOperator(task_id="cleanup", bash_command="rm -rf /tmp/job", trigger_rule="all_done")
```

**3) 분기 합류 지점** — `none_failed_min_one_success`

```python
branch >> [pathA, pathB] >> merge  # merge에 none_failed_min_one_success 지정
```

---

## 9. Pool / Priority / Concurrency

### Pool: 리소스별 동시 실행 제한

외부 시스템에 부하를 줄 수 있는 Task를 그룹화해 동시 실행 수를 제한합니다.

```python
# UI > Admin > Pools에서 pool 생성: "snowflake_pool" with 4 slots

SQLExecuteQueryOperator(
    task_id="heavy_query",
    conn_id="snowflake",
    sql="...",
    pool="snowflake_pool",
    pool_slots=1,
)
```

이러면 `snowflake_pool`을 쓰는 모든 Task가 동시에 최대 4개까지만 실행됩니다.

### priority_weight: 같은 Pool 안에서 우선순위

```python
BashOperator(..., priority_weight=100)   # 기본 1
```

### max_active_tis_per_dag / max_active_tis_per_dagrun

같은 Task의 동시 실행 수 제한 (백필 시 유용).

---

## 10. 언제 어떤 Operator를 쓸까?

| 상황 | 선택 |
|------|------|
| 간단한 쉘 명령 | `BashOperator` |
| Python 함수 실행 | **`@task`** (권장) 또는 `PythonOperator` |
| 격리된 의존성으로 Python 실행 | `@task.virtualenv` 또는 `@task.docker` |
| DB에 SQL 실행 | `SQLExecuteQueryOperator` |
| 외부 REST API | `HttpOperator` |
| 파일/키/조건 대기 | `*Sensor` + `deferrable=True` |
| 크고 격리된 작업 | `KubernetesPodOperator` |
| 데이터 이동 (A→B) | Transfer Operator 먼저 검색 |
| 조건 분기 | `@task.branch` |
| 이후 단계 생략 | `@task.short_circuit` |
| 다른 DAG 연결 | **Asset** (권장) 또는 `TriggerDagRunOperator` |
| 실패/성공 알림 | Notifier 또는 `on_*_callback` |

---

## 11. 전체 흐름 정리

한 DAG을 예시로 지금까지 다룬 내용을 묶어봅니다.

```python
from datetime import timedelta
from pendulum import datetime

from airflow.sdk import DAG, task, task_group
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.sensors.filesystem import FileSensor
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.http.operators.http import HttpOperator


with DAG(
    dag_id="mixed_operators_demo",
    start_date=datetime(2026, 1, 1, tz="Asia/Seoul"),
    schedule="0 4 * * *",
    catchup=False,
    default_args={
        "retries": 2,
        "retry_delay": timedelta(minutes=5),
        "execution_timeout": timedelta(minutes=30),
    },
    tags=["demo"],
) as dag:

    start = EmptyOperator(task_id="start")

    # Sensor — 파일 도착 대기 (deferrable)
    wait_file = FileSensor(
        task_id="wait_file",
        filepath="/data/input/{{ ds }}.csv",
        poke_interval=60,
        timeout=60 * 60,
        mode="reschedule",
    )

    # BashOperator — 간단한 전처리
    preprocess = BashOperator(
        task_id="preprocess",
        bash_command="python /scripts/clean.py --date {{ ds }}",
    )

    # TaskFlow — Python 변환 로직
    @task
    def summarize(ds: str = None) -> dict:
        from airflow.sdk import get_current_context
        ctx = get_current_context()
        ds = ds or ctx["ds"]
        return {"date": ds, "rows": 1234}

    summary = summarize()

    # SQL 실행
    load_sql = SQLExecuteQueryOperator(
        task_id="load_sql",
        conn_id="warehouse",
        sql="""
            INSERT INTO mart.daily_summary (date, rows)
            VALUES ('{{ ds }}', {{ ti.xcom_pull(task_ids='summarize')['rows'] }})
        """,
    )

    # 외부 API 통지
    notify_api = HttpOperator(
        task_id="notify_api",
        http_conn_id="notifier_api",
        endpoint="/etl/done",
        method="POST",
        data='{"dag": "mixed_operators_demo", "date": "{{ ds }}"}',
    )

    end = EmptyOperator(task_id="end", trigger_rule="none_failed_min_one_success")

    start >> wait_file >> preprocess >> summary >> load_sql >> notify_api >> end
```

---

## 정리

- **Operator = 템플릿**, Task는 인스턴스, Task Instance는 실행된 것
- 분류: **Action / Transfer / Sensor**
- Airflow 3에서는 Operator 대부분이 **Provider 패키지**로 분리
- Python 실행은 **`@task` (TaskFlow)**가 현대적 정석
- 오래 기다리는 Task는 **Deferrable**로
- `template_fields`, `trigger_rule`, `pool` 3종은 실무 튜닝의 핵심

!!! note "다음 단계"
    기본 Operator를 다 훑었으니 이제 **나만의 Operator**를 만들 차례입니다.
    [Custom Operator 만들기](04-custom-operators.md)에서 plugins 구조와 BaseOperator 상속 패턴을 자세히 다룹니다.
