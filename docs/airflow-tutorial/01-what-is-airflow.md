# 1. Airflow란?

## Apache Airflow

**Apache Airflow**는 데이터 파이프라인을 **Python 코드로 작성(authoring)**하고, 이를 **스케줄링·실행·모니터링**하는 오픈소스 워크플로우 오케스트레이션 플랫폼입니다.

한 문장으로 요약하면:

> **"파이썬 코드로 작성된 작업 흐름(DAG)을 정해진 시간에, 정해진 순서로 실행시켜 주는 매니저"**

Airbnb가 2014년 내부 도구로 시작해 2016년 Apache 재단에 기부했고, 현재는 데이터 엔지니어링 분야의 사실상 표준 스케줄러로 자리 잡았습니다.

## 왜 Airflow를 사용하나?

### 1. Workflow as Code

모든 파이프라인이 Python 파일로 정의됩니다. 설정 GUI에서 박스를 끌어다 만드는 방식이 아니라, `.py` 파일로 존재하기 때문에 Git으로 버전 관리하고 코드 리뷰가 가능합니다.

```python
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from pendulum import datetime

with DAG(
    dag_id="hello_airflow",
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
) as dag:
    task = BashOperator(
        task_id="say_hello",
        bash_command="echo 'Hello, Airflow 3!'",
    )
```

위 한 파일이 곧 "매일 한 번 `echo 'Hello, Airflow 3!'`를 실행하는 파이프라인"입니다.

### 2. 강력한 스케줄러

- 크론식 스케줄(`0 9 * * *`), preset(`@daily`, `@hourly`), 커스텀 Timetable 모두 지원
- 실패 시 자동 재시도, 지연 경고, Backfill(과거 구간 재실행)
- 의존성 기반 실행 (A 완료 → B 실행)

### 3. 풍부한 Provider 생태계

AWS, GCP, Azure, Snowflake, Databricks, dbt, Slack, Notion, Kafka 등 **수백 개의 Provider 패키지**가 이미 존재합니다. 대부분의 외부 시스템 연동은 Operator를 하나 import하면 끝납니다.

### 4. 웹 UI와 관측성

- DAG/Task 실행 상태를 시각적으로 확인 (Grid view, Graph view)
- 로그 조회, 수동 트리거, 일시정지, 재실행이 UI에서 가능
- 메트릭을 StatsD/OpenTelemetry로 내보내 외부 모니터링과 연동

### 5. 확장성

- 한 대에서 돌리는 **LocalExecutor**부터, Celery·Kubernetes를 사용한 분산 실행까지 동일한 DAG 코드로 확장 가능
- Airflow 3에서는 원격 환경에서 작업을 실행할 수 있는 **Edge Executor**도 추가

## 어디에 쓰이나?

| 용도 | 예시 |
|------|------|
| **ETL/ELT 배치** | 매일 새벽 2시 로그 집계 → 웨어하우스 적재 |
| **ML 파이프라인** | 데이터 전처리 → 학습 → 평가 → 배포 |
| **리포트 자동화** | 주간 지표 집계 → Slack/메일 발송 |
| **데이터 품질 검증** | dbt test, Great Expectations 자동 실행 |
| **외부 API 연동 작업** | 서드파티 API 호출 → DB 저장 → 변환 |
| **인프라 작업** | 매월 백업, 로그 아카이빙, 리소스 청소 |

!!! warning "Airflow가 적합하지 않은 경우"
    - **실시간 스트리밍** (밀리초 단위 처리) → Kafka Streams, Flink 사용
    - **밀리초 단위 트리거가 필요한 이벤트 기반 처리** → 람다/SQS 사용
    - **단순한 크론 하나짜리 스크립트** → 그냥 crontab이 낫습니다
    Airflow는 **"배치/마이크로 배치 워크플로우 전반을 관리해야 할 때"** 빛을 발합니다.

## 핵심 개념: DAG와 Task

Airflow를 이해하려면 두 단어만 알면 됩니다.

### DAG (Directed Acyclic Graph)

**방향이 있고(Directed), 순환하지 않는(Acyclic) 그래프**라는 수학적 개념에서 온 이름입니다. 우리말로는 "작업들의 실행 순서를 정의한 설계도"쯤 됩니다.

```
[추출] ──▶ [변환] ──▶ [적재] ──▶ [알림]
                 │
                 └──▶ [검증]
```

- **방향이 있다**: 화살표로 "이 작업 다음에 저 작업" 순서가 명확
- **순환하지 않는다**: A → B → A 같은 무한 루프가 없음

DAG는 Python 파일 하나에 정의되고, Airflow는 `dags/` 폴더의 모든 파일을 주기적으로 스캔해서 DAG 목록을 관리합니다.

### Task

DAG 안의 각 **작업 단위**. 네모 상자 하나가 Task 하나입니다. Task는 "Operator의 인스턴스"로 생성됩니다 — 자세한 내용은 [챕터 3](03-operators.md)에서 다룹니다.

```python
# task1, task2는 각각 Task (= BashOperator의 인스턴스)
task1 = BashOperator(task_id="extract", bash_command="...")
task2 = BashOperator(task_id="transform", bash_command="...")

# 의존성: task1 먼저, 그 다음 task2
task1 >> task2
```

### DAG Run과 Task Instance

- **DAG Run**: 특정 시점(`logical_date`)에 실제로 실행된 DAG 하나의 인스턴스. 2026-04-16 09:00 DAG Run, 2026-04-17 09:00 DAG Run 각각이 별개의 DAG Run입니다.
- **Task Instance**: 특정 DAG Run 안에서 특정 Task가 실행된 하나의 단위. "DAG Run × Task" 조합.

```
DAG: daily_etl
├── DAG Run (2026-04-16 09:00)
│   ├── Task Instance: extract  [success]
│   ├── Task Instance: transform [success]
│   └── Task Instance: load      [failed]
└── DAG Run (2026-04-17 09:00)
    ├── Task Instance: extract  [success]
    ├── Task Instance: transform [running]
    └── Task Instance: load      [scheduled]
```

## Airflow 아키텍처

Airflow는 여러 개의 프로세스(컴포넌트)가 협력해서 동작합니다.

```
┌──────────────────────────────────────────────────────────────┐
│                        Metadata DB                            │
│   (Postgres/MySQL: DAG 정의, 실행 이력, XCom, Connection 등)  │
└──────────────────────────────────────────────────────────────┘
         ▲            ▲            ▲            ▲
         │            │            │            │
    ┌────┴────┐  ┌────┴─────┐  ┌───┴────┐  ┌────┴─────┐
    │ API     │  │Scheduler │  │ DAG    │  │Triggerer │
    │ Server  │  │          │  │Processor│  │          │
    │ (UI/API)│  │ (실행    │  │(DAG    │  │(Deferred │
    │         │  │ 지시)    │  │ 파싱)  │  │  대기)   │
    └─────────┘  └──────────┘  └────────┘  └──────────┘
                       │
                       ▼
                 ┌───────────┐
                 │  Worker   │  ← Task를 실제로 실행
                 │ (Local/   │
                 │  Celery/  │
                 │  K8s/Edge)│
                 └───────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| **Metadata DB** | DAG 정의, 실행 상태, 로그 위치, 변수, 커넥션 등 모든 상태 저장 (Postgres 권장) |
| **API Server** | 웹 UI + REST API 제공. Airflow 3에서 기존 Webserver가 일반 API 서버로 재설계됨 |
| **Scheduler** | DAG Run/Task Instance를 언제 실행할지 결정하고 Executor에 지시 |
| **DAG Processor** | `dags/` 폴더의 Python 파일을 주기적으로 파싱해서 DB에 반영. **Airflow 3에서 독립 프로세스로 분리** |
| **Triggerer** | Deferrable Operator가 "대기 중"일 때 이벤트를 감시하는 경량 프로세스 (Worker 자원 절약) |
| **Worker** | Task를 실제로 실행. Executor 종류에 따라 프로세스/컨테이너/Pod 등 다양 |
| **Executor** | Worker에게 일을 분배하는 방식 (Local, Celery, Kubernetes, Edge 등) |

### 실행 흐름 (대표적인 시나리오)

```
1. DAG Processor가 dags/*.py 파싱 → Metadata DB에 DAG 구조 저장
2. Scheduler가 "지금 실행할 DAG Run/Task가 있는지" DB를 체크
3. 실행 시점이 된 Task를 Executor에 전달
4. Executor가 Worker에 Task 배정
5. Worker가 Task 실행 → 결과/로그를 DB와 로그 저장소에 기록
6. 사용자는 API Server(웹 UI)에서 상태 확인
```

## Executor 종류

Executor는 "Task를 어디서 어떻게 실행할 것인가"를 결정합니다.

| Executor | 설명 | 용도 |
|----------|------|------|
| **LocalExecutor** | 같은 머신에서 프로세스로 실행 | 개발/소규모 운영 |
| **CeleryExecutor** | Celery + Redis/RabbitMQ로 원격 워커에 분산 | 중대규모 (전통적인 VM 기반) |
| **KubernetesExecutor** | Task마다 Pod을 새로 띄워 실행 | 격리/탄력적 확장이 필요한 환경 |
| **EdgeExecutor** ⭐ | 원격 Edge Worker가 API로 작업을 가져가 실행 | 네트워크 제약 환경, 멀티 리전 (Airflow 3 신규) |

!!! info "Airflow 3 변경사항"
    - **SequentialExecutor 삭제**: 로컬 개발은 `LocalExecutor`로 통일
    - **CeleryKubernetesExecutor / LocalKubernetesExecutor 삭제**: 여러 Executor를 동시에 쓰려면 "Multiple Executor Configuration"으로 선언 가능
    - **EdgeExecutor 신규**: 원격 워커가 API를 통해 작업을 pull하는 방식 (방화벽 환경에 유용)

## Airflow 3에서 달라진 점 (요약)

Airflow 3.0은 2025년 4월 공식 릴리즈된 메이저 버전으로, 과거 2.x 사용자도 반드시 알고 넘어가야 할 변경이 많습니다.

### 🆕 신규 기능

| 기능 | 설명 |
|------|------|
| **Task SDK (`airflow.sdk`)** | DAG 작성자용 안정 API. `DAG`, `task`, `BaseOperator` 등을 여기서 import |
| **DAG Versioning** | 같은 DAG의 여러 버전이 공존. 과거 Run이 당시 버전의 코드 기준으로 보임 |
| **Asset (← Dataset)** | 데이터 중심 스케줄링. "테이블 X가 업데이트되면 DAG B 실행" |
| **EdgeExecutor** | 원격 워커용 Executor |
| **React 기반 새 UI** | Flask-AppBuilder 기반 UI 교체, 모던하고 빠름 |
| **Task Execution API** | Worker가 Metadata DB에 직접 붙지 않고 API를 통함 (보안/격리 향상) |

### ⚠️ 제거/변경된 것

| 항목 | 변경 내용 |
|------|-----------|
| `schedule_interval`, `timetable` | **`schedule`로 통일** |
| `execution_date` | **`logical_date`로 이름 변경**, `{{ execution_date }}` 매크로도 대체 |
| `tomorrow_ds`, `yesterday_ds`, `prev_ds`, `next_ds` | **제거** (필요하면 `data_interval_start` 등 활용) |
| **SubDAG** | **제거** — TaskGroup, Asset, Data-Aware Scheduling으로 대체 |
| **SLA** | **제거** — 향후 Deadline Alerts로 대체 예정 |
| `catchup_by_default` | 기본값이 `True` → **`False`** |
| **SequentialExecutor** | 제거 |
| **CeleryKubernetesExecutor/LocalKubernetesExecutor** | 제거 (Multiple Executor Configuration 사용) |
| **Webserver** | `airflow webserver` → **`airflow api-server`** |
| **DAG Processor** | Scheduler에 내장되어 있던 것이 **독립 프로세스**로 분리 (`airflow dag-processor`) |
| **기본 Auth Manager** | Flask-AppBuilder → **Simple Auth** (필요 시 FAB/Keycloak 등으로 교체) |

### 🔀 Import 경로 변화

Airflow 3에서는 기본 Operator들도 모두 `airflow-providers-standard` 패키지로 이동했습니다.

```python
# Airflow 2 (과거)
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.models import BaseOperator

# Airflow 3 (권장)
from airflow.sdk import DAG, task, BaseOperator
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
```

DAG 작성자가 쓰는 API는 모두 **`airflow.sdk`** 아래로 모았습니다. 이 SDK는 하위 호환성을 장기적으로 보장하는 "공식 창구"로 설계되었습니다.

## 설치와 실행 (간단)

Airflow를 빠르게 띄우는 가장 쉬운 방법은 공식 Docker Compose를 쓰는 것입니다.

```bash
# 1. 공식 docker-compose.yaml 다운로드
mkdir airflow && cd airflow
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/3.0.0/docker-compose.yaml'

# 2. 필요한 디렉토리 생성
mkdir -p ./dags ./logs ./plugins ./config

# 3. 초기화 및 기동
docker compose up airflow-init
docker compose up -d

# 4. 웹 UI 접속
# http://localhost:8080  (기본 계정: airflow / airflow)
```

기동되면 다음 프로세스들이 컨테이너로 올라옵니다:

- `airflow-apiserver` (웹 UI + API)
- `airflow-scheduler`
- `airflow-dag-processor`
- `airflow-worker` (기본 CeleryExecutor 구성 기준)
- `airflow-triggerer`
- `postgres`, `redis`

!!! tip "로컬 디렉토리 매핑"
    `./dags`, `./plugins`, `./config` 디렉토리가 컨테이너의 `/opt/airflow/` 아래로 마운트됩니다.
    로컬에서 `.py` 파일을 수정하면 자동으로 컨테이너에도 반영되므로, 이 폴더만 기억하면 됩니다.

## 참고 자료

- [Apache Airflow 공식 문서](https://airflow.apache.org/docs/apache-airflow/stable/)
- [Airflow 3.0 Release Notes](https://airflow.apache.org/docs/apache-airflow/3.0.0/release_notes.html)
- [Upgrading to Airflow 3](https://airflow.apache.org/docs/apache-airflow/3.0.0/installation/upgrading_to_airflow3.html)
- [Airflow Providers 목록](https://airflow.apache.org/docs/apache-airflow-providers/packages-ref.html)

!!! note "다음 단계"
    개념을 잡았다면, [DAG 작성 기초](02-dag-basics.md)로 넘어가세요.
