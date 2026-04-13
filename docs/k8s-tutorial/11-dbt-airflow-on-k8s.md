# 11. Bonus: dbt + Airflow on Kubernetes

챕터 1~10에서 Kubernetes의 핵심 개념을 학습했습니다. 이번 보너스 챕터에서는 데이터 엔지니어링의 핵심 도구인 **Airflow**와 **dbt**를 Kubernetes 위에 배포하는 실전 방법을 다룹니다.

!!! info "이 챕터의 대상 독자"
    - Kubernetes 기본 개념(Pod, Deployment, Service, Volume, Secret)을 이해하고 있는 분
    - Airflow 또는 dbt를 사용해본 경험이 있거나, 곧 도입하려는 데이터 엔지니어
    - 프로덕션 환경에서 데이터 파이프라인을 안정적으로 운영하고 싶은 분

!!! warning "사전 지식"
    이 챕터는 챕터 5(YAML 매니페스트), 6(워크로드), 7(네트워킹), 8(스토리지와 설정)의 내용을 기반으로 합니다.
    해당 챕터를 먼저 학습한 뒤 진행하세요.

---

## Part 1: RBAC & ServiceAccount

Airflow가 Kubernetes 위에서 동작할 때 가장 먼저 부딪히는 문제는 **권한**입니다. KubernetesExecutor를 사용하면 Airflow Scheduler가 **각 Task를 독립 Pod으로 동적 생성**하는데, 이를 위해서는 적절한 Kubernetes API 권한이 필요합니다.

---

### 1.1 ServiceAccount란?

Kubernetes에서 Pod 안의 프로세스가 API Server와 통신할 때, **사람(User)**이 아닌 **서비스 계정(ServiceAccount)**으로 인증합니다.

#### 기본 ServiceAccount vs 커스텀 ServiceAccount

| 항목 | 기본(default) ServiceAccount | 커스텀 ServiceAccount |
|------|------|------|
| **생성 방식** | Namespace 생성 시 자동 생성 | 직접 생성 |
| **권한** | 거의 없음 (API discovery 정도) | 필요한 만큼 RBAC으로 부여 |
| **토큰** | 자동 마운트 (`/var/run/secrets/kubernetes.io/serviceaccount/token`) | 동일 |
| **사용 시나리오** | 별도 권한이 필요 없는 일반 앱 | Airflow처럼 K8s API를 호출하는 앱 |

!!! danger "기본 ServiceAccount에 권한을 주지 마세요"
    기본 ServiceAccount에 강력한 권한을 부여하면, 해당 Namespace의 **모든 Pod**이 그 권한을 갖게 됩니다.
    반드시 전용 ServiceAccount를 만들어 필요한 Pod에만 바인딩하세요.

#### 커스텀 ServiceAccount 생성

```yaml
# airflow-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: airflow-worker
  namespace: airflow
  labels:
    app: airflow
    component: worker
```

```bash
kubectl apply -f airflow-sa.yaml
kubectl get serviceaccount -n airflow
```

#### Pod에 ServiceAccount 바인딩하기

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: airflow-scheduler
  namespace: airflow
spec:
  serviceAccountName: airflow-worker  # (1)!
  containers:
    - name: scheduler
      image: apache/airflow:2.9.0
```

1. `serviceAccountName` 필드로 커스텀 ServiceAccount를 지정합니다. 지정하지 않으면 `default` ServiceAccount가 사용됩니다.

---

### 1.2 RBAC 완전 정복

**RBAC(Role-Based Access Control)**은 Kubernetes에서 "누가(Subject), 무엇을(Resource), 어떻게(Verb) 할 수 있는가"를 정의하는 권한 체계입니다.

#### Role vs ClusterRole

| 항목 | Role | ClusterRole |
|------|------|------|
| **범위** | 특정 Namespace 내 | 클러스터 전체 |
| **사용 사례** | "airflow NS에서만 Pod 관리" | "모든 NS에서 Node 조회" |
| **바인딩** | RoleBinding으로 연결 | ClusterRoleBinding 또는 RoleBinding |

```yaml
# airflow-role.yaml — Namespace 범위의 Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: airflow-pod-manager
  namespace: airflow
rules:
  - apiGroups: [""]              # (1)!
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch"]
  - apiGroups: [""]
    resources: ["pods/log"]      # (2)!
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create", "get"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch"]
```

1. `""` (빈 문자열)은 Core API Group을 의미합니다. Pod, Service, ConfigMap 등이 여기에 속합니다.
2. `pods/log`는 Pod의 로그를 조회하는 하위 리소스(subresource)입니다.

```yaml
# ClusterRole 예시 — 클러스터 범위
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: airflow-node-reader
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get", "list"]
```

#### RoleBinding vs ClusterRoleBinding

```yaml
# airflow-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: airflow-pod-manager-binding
  namespace: airflow
subjects:
  - kind: ServiceAccount
    name: airflow-worker         # (1)!
    namespace: airflow
roleRef:
  kind: Role
  name: airflow-pod-manager      # (2)!
  apiGroup: rbac.authorization.k8s.io
```

1. 위에서 만든 ServiceAccount를 Subject로 지정합니다.
2. 위에서 만든 Role을 참조합니다.

```yaml
# ClusterRoleBinding 예시
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: airflow-node-reader-binding
subjects:
  - kind: ServiceAccount
    name: airflow-worker
    namespace: airflow
roleRef:
  kind: ClusterRole
  name: airflow-node-reader
  apiGroup: rbac.authorization.k8s.io
```

!!! tip "최소 권한 원칙 (Principle of Least Privilege)"
    RBAC을 설정할 때 항상 **필요한 최소한의 권한만** 부여하세요.

    - `verbs: ["*"]` 대신 실제 필요한 동작만 나열
    - `resources: ["*"]` 대신 필요한 리소스만 나열
    - ClusterRole보다 Role을 먼저 고려 (범위를 좁게)
    - 주기적으로 사용하지 않는 권한 제거

#### 권한 검증

```bash
# airflow-worker ServiceAccount가 pods를 create할 수 있는지 확인
kubectl auth can-i create pods \
  --as=system:serviceaccount:airflow:airflow-worker \
  -n airflow
# 출력: yes

# pods를 delete할 수 있는지 확인
kubectl auth can-i delete pods \
  --as=system:serviceaccount:airflow:airflow-worker \
  -n airflow
# 출력: yes

# secrets를 get할 수 있는지 확인 (부여하지 않았으므로)
kubectl auth can-i get secrets \
  --as=system:serviceaccount:airflow:airflow-worker \
  -n airflow
# 출력: no
```

---

### 1.3 Namespace 전략

데이터 파이프라인 환경에서는 **환경별 격리**가 중요합니다. Namespace를 활용하면 dev/stg/prd를 같은 클러스터에서도 안전하게 분리할 수 있습니다.

#### 환경별 Namespace 분리

```bash
kubectl create namespace airflow-dev
kubectl create namespace airflow-stg
kubectl create namespace airflow-prd
```

#### ResourceQuota — Namespace별 리소스 상한

```yaml
# resourcequota-dev.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: airflow-dev-quota
  namespace: airflow-dev
spec:
  hard:
    requests.cpu: "4"            # (1)!
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"                   # (2)!
    persistentvolumeclaims: "5"
```

1. dev 환경에서는 총 CPU 요청량을 4코어로 제한합니다.
2. 동시에 실행 가능한 Pod 수를 20개로 제한합니다. KubernetesExecutor 사용 시 Task마다 Pod이 생성되므로 이 값을 적절히 설정해야 합니다.

```yaml
# resourcequota-prd.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: airflow-prd-quota
  namespace: airflow-prd
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 64Gi
    limits.cpu: "64"
    limits.memory: 128Gi
    pods: "200"
    persistentvolumeclaims: "20"
```

#### LimitRange — Pod/Container별 기본값과 상한

```yaml
# limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: airflow-limit-range
  namespace: airflow-prd
spec:
  limits:
    - type: Container
      default:                   # (1)!
        cpu: 500m
        memory: 512Mi
      defaultRequest:            # (2)!
        cpu: 100m
        memory: 128Mi
      max:                       # (3)!
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
```

1. `default`: 컨테이너에 limits가 명시되지 않았을 때 적용되는 기본 limits
2. `defaultRequest`: 컨테이너에 requests가 명시되지 않았을 때 적용되는 기본 requests
3. `max`: 한 컨테이너가 사용할 수 있는 최대 리소스. 이를 초과하면 Pod 생성이 거부됩니다.

---

## Part 2: Airflow on Kubernetes

### 2.1 Airflow 아키텍처 on K8s

Apache Airflow를 Kubernetes 위에 배포하면, 각 컴포넌트가 별도의 Pod으로 실행됩니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Airflow on Kubernetes 아키텍처</div>
  <div class="k8s-arch-grid">
    <div class="k8s-arch-section k8s-airflow-core">
      <div class="k8s-section-label">Airflow Core Components</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🌐</div>
          <div class="k8s-comp-name">Webserver</div>
          <div class="k8s-comp-desc">UI 대시보드<br>DAG 상태 모니터링<br>Deployment (replicas: 2)</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">⏱️</div>
          <div class="k8s-comp-name">Scheduler</div>
          <div class="k8s-comp-desc">DAG 파싱 &amp; Task 스케줄링<br>KubernetesExecutor로 Pod 생성<br>Deployment (replicas: 2)</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔔</div>
          <div class="k8s-comp-name">Triggerer</div>
          <div class="k8s-comp-desc">Deferrable Operator 처리<br>비동기 이벤트 대기<br>Deployment (replicas: 1)</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-arrow">
      <div class="k8s-arrow-line">▼ &nbsp; Scheduler가 Task마다 Worker Pod 생성 &nbsp; ▼</div>
    </div>
    <div class="k8s-arch-section k8s-airflow-workers">
      <div class="k8s-section-label">Worker Pods (KubernetesExecutor)</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">⚙️</div>
          <div class="k8s-comp-name">Worker Pod A</div>
          <div class="k8s-comp-desc">dbt run --select staging<br>Task 완료 후 자동 삭제</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">⚙️</div>
          <div class="k8s-comp-name">Worker Pod B</div>
          <div class="k8s-comp-desc">python etl_script.py<br>Task 완료 후 자동 삭제</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">⚙️</div>
          <div class="k8s-comp-name">Worker Pod C</div>
          <div class="k8s-comp-desc">spark-submit job.py<br>Task 완료 후 자동 삭제</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-section k8s-airflow-infra">
      <div class="k8s-section-label">Infrastructure</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🗄️</div>
          <div class="k8s-comp-name">PostgreSQL</div>
          <div class="k8s-comp-desc">Metadata DB<br>DAG/Task 상태 저장<br>StatefulSet or 외부 RDS</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📂</div>
          <div class="k8s-comp-name">Git-Sync Sidecar</div>
          <div class="k8s-comp-desc">Git → DAG 파일 동기화<br>Scheduler/Webserver에 Sidecar</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">☁️</div>
          <div class="k8s-comp-name">S3 / GCS</div>
          <div class="k8s-comp-desc">Remote Logging<br>Task 로그 영구 저장</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
/* Airflow on K8s Diagram — Catppuccin Mocha */
.k8s-airflow-core {
  background: rgba(137, 180, 250, 0.08);
  border: 1px solid rgba(137, 180, 250, 0.3);
}
.k8s-airflow-core .k8s-section-label { color: #89b4fa; }
.k8s-airflow-workers {
  background: rgba(166, 227, 161, 0.08);
  border: 1px solid rgba(166, 227, 161, 0.3);
}
.k8s-airflow-workers .k8s-section-label { color: #a6e3a1; }
.k8s-airflow-infra {
  background: rgba(249, 226, 175, 0.08);
  border: 1px solid rgba(249, 226, 175, 0.3);
}
.k8s-airflow-infra .k8s-section-label { color: #f9e2af; }
</style>

**각 컴포넌트의 역할:**

| 컴포넌트 | K8s 리소스 | 역할 |
|----------|-----------|------|
| **Webserver** | Deployment + Service | UI 제공, DAG/Task 상태 조회 |
| **Scheduler** | Deployment | DAG 파싱, Task 스케줄링, Worker Pod 생성 |
| **Triggerer** | Deployment | Deferrable Operator의 비동기 이벤트 처리 |
| **Worker** | 동적 Pod (KubernetesExecutor) | 실제 Task 실행, 완료 후 자동 삭제 |
| **Metadata DB** | StatefulSet 또는 외부 DB | DAG/Task 상태, 변수, 커넥션 등 저장 |
| **Redis** | StatefulSet (CeleryExecutor 전용) | Celery 메시지 브로커 |

---

### 2.2 Executor 선택

Airflow의 **Executor**는 Task를 어떻게 실행할지 결정하는 핵심 설정입니다.

| 항목 | LocalExecutor | CeleryExecutor | KubernetesExecutor |
|------|--------------|---------------|-------------------|
| **Task 실행 방식** | Scheduler 프로세스 내 subprocess | Celery Worker (별도 프로세스) | 독립 Pod |
| **병렬 실행** | 제한적 (단일 머신) | 높음 (Worker 수에 비례) | 매우 높음 (노드 수에 비례) |
| **리소스 격리** | 없음 | Worker 단위 | Task 단위 (Pod) |
| **스케일링** | 불가 | Worker 수 조절 | 자동 (Task마다 Pod) |
| **추가 인프라** | 없음 | Redis + Celery Worker | 없음 |
| **유휴 리소스** | Scheduler 항상 실행 | Worker 항상 실행 | Task 없으면 Pod 없음 |
| **Task별 이미지** | 불가 | 불가 | 가능 (Task마다 다른 이미지) |
| **적합한 환경** | 개발/소규모 | 대규모 + 빠른 시작 | K8s 네이티브 환경 |

#### KubernetesExecutor 동작 원리

KubernetesExecutor를 사용하면 **각 Task가 독립적인 Pod으로 실행**됩니다.

```
Scheduler가 Task를 스케줄링
        │
        ▼
K8s API에 Pod 생성 요청 (ServiceAccount 권한 필요!)
        │
        ▼
Worker Pod 생성 → Task 실행
        │
        ▼
Task 완료 → Pod 상태를 Scheduler에 보고
        │
        ▼
Worker Pod 자동 삭제 (설정에 따라 유지 가능)
```

!!! tip "왜 KubernetesExecutor인가?"
    - **리소스 효율**: Task가 없으면 Worker Pod도 없음 → 유휴 리소스 최소화
    - **Task별 격리**: 각 Task가 독립 Pod이므로, 메모리 누수나 라이브러리 충돌 없음
    - **Task별 이미지**: dbt Task는 dbt 이미지, Spark Task는 Spark 이미지로 실행 가능
    - **자동 스케일링**: Node Autoscaler와 연동하면 Task 부하에 따라 노드 자동 확장

!!! warning "KubernetesExecutor의 단점"
    - **콜드 스타트**: Pod 생성 + 이미지 Pull에 10~30초 소요 (짧은 Task에는 오버헤드)
    - **RBAC 설정 필수**: Scheduler가 Pod를 생성/삭제할 권한 필요 (Part 1 참고)
    - **디버깅 난이도**: Task Pod가 사라지므로 로그 확인이 어려움 → Remote Logging 필수

---

### 2.3 Official Airflow Helm Chart

Apache Airflow 공식 Helm Chart는 프로덕션 수준의 Airflow를 쉽게 배포할 수 있게 해줍니다.

#### 설치

```bash
# Helm repo 추가
helm repo add apache-airflow https://airflow.apache.org
helm repo update

# 기본 설치 (테스트용)
helm install airflow apache-airflow/airflow \
  --namespace airflow \
  --create-namespace

# values 파일로 커스텀 설치
helm install airflow apache-airflow/airflow \
  --namespace airflow-prd \
  --create-namespace \
  -f values-prd.yaml
```

#### values.yaml 핵심 설정

```yaml
# values-prd.yaml — 프로덕션 환경 Airflow Helm Chart 설정
# ──────────────────────────────────────────────────────

# 1) Executor 타입
# ─────────────────
executor: KubernetesExecutor     # (1)!

# 2) Airflow 이미지 설정
# ─────────────────────
images:
  airflow:
    repository: my-registry.example.com/airflow  # (2)!
    tag: "2.9.0-custom"
    pullPolicy: IfNotPresent
  gitSync:
    repository: registry.k8s.io/git-sync/git-sync
    tag: "v4.2.1"

# 3) Webserver 설정
# ─────────────────
webserver:
  replicas: 2                    # (3)!
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "1"
      memory: 2Gi
  service:
    type: ClusterIP              # (4)!
  livenessProbe:
    initialDelaySeconds: 15
    periodSeconds: 10
  readinessProbe:
    initialDelaySeconds: 15
    periodSeconds: 10
  env:
    - name: AIRFLOW__WEBSERVER__EXPOSE_CONFIG
      value: "false"             # (5)!

# 4) Scheduler 설정
# ─────────────────
scheduler:
  replicas: 2                    # (6)!
  resources:
    requests:
      cpu: "1"
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 4Gi

# 5) Triggerer 설정
# ─────────────────
triggerer:
  enabled: true
  replicas: 1
  resources:
    requests:
      cpu: 250m
      memory: 512Mi

# 6) PostgreSQL 설정 (Metadata DB)
# ─────────────────────────────────
postgresql:
  enabled: false                 # (7)!

data:
  metadataConnection:
    user: airflow
    pass: ""
    protocol: postgresql
    host: my-postgres.example.com
    port: 5432
    db: airflow_metadata
    sslmode: require
  metadataSecretName: airflow-metadata-secret  # (8)!

# 7) Redis 설정
# ─────────────
redis:
  enabled: false                 # (9)!

# 8) Worker 설정 (KubernetesExecutor용)
# ──────────────────────────────────────
workers:
  serviceAccount:
    name: airflow-worker         # (10)!

# 9) ServiceAccount 설정
# ──────────────────────
serviceAccount:
  create: true
  name: airflow-worker
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/airflow-s3-access  # (11)!

# 10) DAG 동기화 (git-sync)
# ─────────────────────────
dags:
  persistence:
    enabled: false
  gitSync:
    enabled: true                # (12)!
    repo: https://github.com/myorg/airflow-dags.git
    branch: main
    subPath: dags
    wait: 60                     # (13)!
    containerName: git-sync
    resources:
      requests:
        cpu: 50m
        memory: 64Mi

# 11) 환경변수 추가
# ─────────────────
env:
  - name: AIRFLOW__CORE__LOAD_EXAMPLES
    value: "false"
  - name: AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION
    value: "true"

extraEnv: |
  - name: AIRFLOW__LOGGING__REMOTE_LOGGING
    value: "true"
  - name: AIRFLOW__LOGGING__REMOTE_BASE_LOG_FOLDER
    value: "s3://my-airflow-logs/prd"

# 12) 추가 Volume / VolumeMount
# ─────────────────────────────
extraVolumes:
  - name: dbt-profiles
    secret:
      secretName: dbt-profiles-secret

extraVolumeMounts:
  - name: dbt-profiles
    mountPath: /opt/dbt/profiles
    readOnly: true

# 13) Ingress 설정
# ────────────────
ingress:
  web:
    enabled: true
    ingressClassName: nginx
    hosts:
      - name: airflow.example.com
        tls:
          enabled: true
          secretName: airflow-tls-secret
```

1. `KubernetesExecutor`를 선택하면 Redis, Celery Worker가 불필요합니다.
2. pip 추가 패키지가 포함된 커스텀 이미지를 사용할 수 있습니다.
3. Webserver 2개로 고가용성을 확보합니다.
4. Ingress를 사용할 것이므로 ClusterIP로 설정합니다.
5. 보안을 위해 웹에서 설정 파일 노출을 비활성화합니다.
6. Airflow 2.x부터 Scheduler HA가 지원됩니다.
7. 프로덕션에서는 외부 관리형 DB(RDS 등)를 사용하는 것을 강력히 권장합니다.
8. DB 비밀번호를 Secret으로 관리합니다.
9. KubernetesExecutor에서는 Redis가 불필요합니다.
10. Part 1에서 만든 ServiceAccount를 지정합니다.
11. AWS EKS의 IRSA(IAM Roles for Service Accounts)로 S3 접근 권한을 부여합니다.
12. git-sync는 DAG 배포의 가장 권장되는 방식입니다.
13. 60초마다 Git 저장소에서 DAG를 동기화합니다.

#### 환경별 values 오버라이드 패턴

```bash
# 공통 설정
values.yaml           # 기본 values (모든 환경 공통)

# 환경별 오버라이드
values-dev.yaml       # executor: LocalExecutor, replicas: 1
values-stg.yaml       # executor: KubernetesExecutor, replicas: 1
values-prd.yaml       # executor: KubernetesExecutor, replicas: 2

# 설치 시 공통 + 환경별 오버라이드 적용
helm install airflow apache-airflow/airflow \
  -f values.yaml \
  -f values-prd.yaml \
  --namespace airflow-prd
```

---

### 2.4 DAG 배포 방식

DAG 파일을 Airflow Scheduler와 Webserver에 전달하는 방법은 크게 3가지입니다.

#### 방식 비교

| 방식 | 장점 | 단점 | 추천 상황 |
|------|------|------|----------|
| **git-sync (Sidecar)** | DAG만 수정하면 자동 반영, 이미지 재빌드 불필요 | Git 접근 설정 필요, 동기화 딜레이 | 프로덕션 환경 (권장) |
| **PVC (Persistent Volume)** | 단순한 구조 | 파일 업데이트 메커니즘 별도 필요, 멀티 노드에서 ReadWriteMany 필요 | 단순한 환경, NFS 사용 시 |
| **Docker 이미지에 포함** | 버전 관리 명확, 불변 배포 | DAG 수정마다 이미지 재빌드/재배포 필요 | CI/CD가 잘 갖춰진 환경 |

#### git-sync 상세 설정

```yaml
# values.yaml (git-sync 부분)
dags:
  gitSync:
    enabled: true
    repo: https://github.com/myorg/airflow-dags.git
    branch: main
    rev: HEAD
    depth: 1                     # (1)!
    maxFailures: 3               # (2)!
    subPath: dags                # (3)!
    wait: 60
    credentialsSecret: git-credentials  # (4)!
    sshKeySecret: ""
```

1. `depth: 1`로 shallow clone하여 디스크 사용량을 최소화합니다.
2. 연속 3번 실패하면 에러로 보고합니다.
3. Git 저장소 내 `dags/` 디렉토리만 동기화합니다.
4. private 저장소의 경우 인증 정보를 Secret으로 전달합니다.

```yaml
# git-credentials Secret
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: airflow-prd
type: Opaque
data:
  GIT_SYNC_USERNAME: bXl1c2Vy        # base64 encoded
  GIT_SYNC_PASSWORD: bXlwYXNz        # base64 encoded
```

!!! info "SSH Key 방식"
    HTTPS 인증 대신 SSH Key를 사용할 수도 있습니다.
    ```yaml
    dags:
      gitSync:
        sshKeySecret: airflow-ssh-secret
        repo: git@github.com:myorg/airflow-dags.git
        knownHosts: |
          github.com ssh-rsa AAAA...
    ```

---

### 2.5 KubernetesPodOperator 사용법

**KubernetesPodOperator**는 Airflow에서 **완전히 독립적인 Pod**을 생성하여 Task를 실행하는 Operator입니다. KubernetesExecutor와는 별개로, 어떤 Executor를 사용하든 활용할 수 있습니다.

!!! info "KubernetesExecutor vs KubernetesPodOperator"
    - **KubernetesExecutor**: Airflow의 **모든 Task**가 자동으로 별도 Pod에서 실행됨
    - **KubernetesPodOperator**: **특정 Task만** 별도 Pod에서 실행하도록 명시적으로 지정

    CeleryExecutor를 사용하면서도 특정 무거운 Task만 KubernetesPodOperator로 실행할 수 있습니다.

#### 왜 사용하는가?

- **환경 격리**: Task별로 다른 Docker 이미지 사용 (Python 3.9 vs 3.11, dbt vs Spark)
- **라이브러리 의존성 분리**: 충돌하는 패키지를 서로 다른 컨테이너에서 실행
- **리소스 세밀 제어**: Task별로 CPU/Memory 요청량을 다르게 설정
- **보안**: 민감한 작업을 격리된 환경에서 실행

#### 완전한 DAG 예시

```python
# dags/etl_pipeline.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
from kubernetes.client import models as k8s

# Volume 정의
dbt_profiles_volume = k8s.V1Volume(
    name="dbt-profiles",
    secret=k8s.V1SecretVolumeSource(secret_name="dbt-profiles-secret"),
)

dbt_profiles_mount = k8s.V1VolumeMount(
    name="dbt-profiles",
    mount_path="/home/dbt/.dbt",
    read_only=True,
)

default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="etl_pipeline",
    default_args=default_args,
    description="ETL pipeline using KubernetesPodOperator",
    schedule="0 6 * * *",        # 매일 06:00 UTC
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["etl", "dbt", "kubernetes"],
) as dag:

    # Task 1: 원천 데이터 추출
    extract = KubernetesPodOperator(
        task_id="extract_source_data",
        namespace="airflow-prd",
        image="my-registry.example.com/etl-extract:1.2.0",
        arguments=["python", "extract.py", "--date", "{{ ds }}"],  # (1)!
        env_vars={
            "SOURCE_DB_HOST": "{{ var.value.source_db_host }}",
            "BATCH_DATE": "{{ ds }}",
        },
        resources=k8s.V1ResourceRequirements(
            requests={"cpu": "500m", "memory": "1Gi"},
            limits={"cpu": "1", "memory": "2Gi"},
        ),
        is_delete_operator_pod=True,   # (2)!
        get_logs=True,                 # (3)!
        startup_timeout_seconds=300,
        name="extract-source-data",
    )

    # Task 2: dbt 실행
    dbt_run = KubernetesPodOperator(
        task_id="dbt_run",
        namespace="airflow-prd",
        image="my-registry.example.com/dbt-project:1.0.0",
        cmds=["dbt"],
        arguments=["run", "--target", "prd", "--select", "tag:daily"],
        volumes=[dbt_profiles_volume],
        volume_mounts=[dbt_profiles_mount],
        env_vars={
            "DBT_PROFILES_DIR": "/home/dbt/.dbt",
        },
        resources=k8s.V1ResourceRequirements(
            requests={"cpu": "1", "memory": "2Gi"},
            limits={"cpu": "2", "memory": "4Gi"},
        ),
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-run-daily",
    )

    # Task 3: dbt 테스트
    dbt_test = KubernetesPodOperator(
        task_id="dbt_test",
        namespace="airflow-prd",
        image="my-registry.example.com/dbt-project:1.0.0",
        cmds=["dbt"],
        arguments=["test", "--target", "prd", "--select", "tag:daily"],
        volumes=[dbt_profiles_volume],
        volume_mounts=[dbt_profiles_mount],
        env_vars={
            "DBT_PROFILES_DIR": "/home/dbt/.dbt",
        },
        resources=k8s.V1ResourceRequirements(
            requests={"cpu": "500m", "memory": "1Gi"},
            limits={"cpu": "1", "memory": "2Gi"},
        ),
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-test-daily",
    )

    extract >> dbt_run >> dbt_test
```

1. Airflow의 Jinja 템플릿으로 실행 날짜(`{{ ds }}`)를 인자로 전달할 수 있습니다.
2. `is_delete_operator_pod=True`로 설정하면 Task 완료 후 Pod이 자동 삭제됩니다.
3. `get_logs=True`로 설정하면 Pod의 stdout/stderr가 Airflow Task 로그에 표시됩니다.

#### pod_template_file 활용

반복되는 Pod 설정을 YAML 템플릿으로 분리할 수 있습니다.

```yaml
# pod_templates/dbt_pod_template.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: dbt
    managed-by: airflow
spec:
  serviceAccountName: airflow-worker
  containers:
    - name: base
      resources:
        requests:
          cpu: "1"
          memory: 2Gi
        limits:
          cpu: "2"
          memory: 4Gi
      volumeMounts:
        - name: dbt-profiles
          mountPath: /home/dbt/.dbt
          readOnly: true
      env:
        - name: DBT_PROFILES_DIR
          value: /home/dbt/.dbt
  volumes:
    - name: dbt-profiles
      secret:
        secretName: dbt-profiles-secret
  restartPolicy: Never
```

```python
# DAG에서 pod_template_file 사용
dbt_run = KubernetesPodOperator(
    task_id="dbt_run",
    namespace="airflow-prd",
    image="my-registry.example.com/dbt-project:1.0.0",
    cmds=["dbt"],
    arguments=["run", "--target", "prd"],
    pod_template_file="/opt/airflow/pod_templates/dbt_pod_template.yaml",
    is_delete_operator_pod=True,
    get_logs=True,
    name="dbt-run",
)
```

---

### 2.6 Airflow Remote Logging (S3)

KubernetesExecutor를 사용하면 **Worker Pod는 Task 완료 후 삭제**됩니다. 로컬 로그 파일도 함께 사라지므로, **Remote Logging은 필수**입니다.

#### 환경변수 방식 (values.yaml)

```yaml
# values.yaml
extraEnv: |
  - name: AIRFLOW__LOGGING__REMOTE_LOGGING
    value: "true"
  - name: AIRFLOW__LOGGING__REMOTE_LOG_CONN_ID
    value: "aws_default"
  - name: AIRFLOW__LOGGING__REMOTE_BASE_LOG_FOLDER
    value: "s3://my-airflow-logs/prd"
  - name: AIRFLOW__LOGGING__ENCRYPT_S3_LOGS
    value: "false"

# Connection 설정 (Secret으로 관리)
extraSecrets:
  airflow-connections:
    data: |
      AIRFLOW_CONN_AWS_DEFAULT: 'aws://?region_name=ap-northeast-2'
```

!!! tip "IRSA (IAM Roles for Service Accounts) 활용"
    AWS EKS 환경에서는 IRSA를 사용하면 Access Key 없이 IAM Role만으로 S3에 접근할 수 있습니다.
    ServiceAccount에 IAM Role을 매핑하면 됩니다.

    ```yaml
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/airflow-s3-access
    ```

#### GCS (Google Cloud Storage) 사용 시

```yaml
extraEnv: |
  - name: AIRFLOW__LOGGING__REMOTE_LOGGING
    value: "true"
  - name: AIRFLOW__LOGGING__REMOTE_BASE_LOG_FOLDER
    value: "gs://my-airflow-logs/prd"
  - name: AIRFLOW__LOGGING__GOOGLE_KEY_PATH
    value: "/opt/airflow/secrets/gcp-key.json"

extraVolumes:
  - name: gcp-key
    secret:
      secretName: gcp-sa-key

extraVolumeMounts:
  - name: gcp-key
    mountPath: /opt/airflow/secrets
    readOnly: true
```

---

### 2.7 Airflow 모니터링

프로덕션 환경에서는 Airflow 상태를 실시간으로 모니터링해야 합니다.

#### StatsD -> Prometheus -> Grafana 연동

```yaml
# values.yaml — 모니터링 설정
statsd:
  enabled: true                  # (1)!
  resources:
    requests:
      cpu: 50m
      memory: 64Mi

# StatsD Exporter가 Prometheus 포맷으로 변환
config:
  metrics:
    statsd_on: true
    statsd_host: localhost
    statsd_port: 8125
    statsd_prefix: airflow
```

1. Airflow는 StatsD 프로토콜로 메트릭을 내보냅니다. 공식 Helm Chart에는 StatsD Exporter가 포함되어 있어 Prometheus가 직접 스크랩할 수 있습니다.

#### Prometheus ServiceMonitor

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: airflow-statsd
  namespace: airflow-prd
  labels:
    release: prometheus          # Prometheus Operator의 selector와 매칭
spec:
  selector:
    matchLabels:
      component: statsd
  endpoints:
    - port: statsd-metrics
      interval: 30s
      path: /metrics
```

#### 핵심 모니터링 메트릭

| 메트릭 | 설명 | 경고 기준 |
|--------|------|----------|
| `airflow_dag_processing_total_parse_time` | DAG 파일 파싱 소요 시간 | > 30초이면 DAG 코드 최적화 필요 |
| `airflow_dagrun_duration_success` | DAG Run 성공 소요 시간 | 평소 대비 2배 이상이면 조사 |
| `airflow_task_duration` | 개별 Task 실행 시간 | 예상 범위 초과 시 알림 |
| `airflow_pool_open_slots` | Pool 사용 가능 슬롯 수 | 0이면 Task 대기 발생 |
| `airflow_scheduler_heartbeat` | Scheduler 생존 신호 | 60초 이상 없으면 Scheduler 다운 |
| `airflow_executor_running_tasks` | 현재 실행 중인 Task 수 | 급격한 증가/감소 모니터링 |
| `airflow_zombie_tasks_killed` | 좀비 Task 수 | 0이어야 정상. 잦으면 리소스 부족 의심 |

---

## Part 3: dbt on Kubernetes

### 3.1 dbt 실행 패턴 비교

dbt를 Kubernetes 환경에서 실행하는 방법은 여러 가지입니다. 상황에 따라 적합한 패턴을 선택하세요.

| 패턴 | 격리 수준 | 유연성 | 복잡도 | 추천 상황 |
|------|----------|--------|--------|----------|
| **K8s Job/CronJob** | 높음 (독립 Pod) | 중간 | 낮음 | Airflow 없이 dbt만 운영 |
| **KubernetesPodOperator** | 높음 (독립 Pod) | 높음 | 중간 | Airflow + dbt 통합 (권장) |
| **BashOperator (같은 Pod)** | 낮음 (Worker와 공유) | 낮음 | 낮음 | 간단한 테스트, dbt가 Worker 이미지에 포함 |
| **dbt Cloud API Operator** | 없음 (SaaS) | 낮음 | 낮음 | dbt Cloud 사용 시 |

---

### 3.2 dbt Docker 이미지 빌드

dbt를 Kubernetes에서 실행하려면, dbt-core와 프로젝트 코드가 포함된 Docker 이미지를 빌드해야 합니다.

#### Dockerfile (Multi-stage Build)

```dockerfile
# ──────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# pip 패키지 설치 (캐시 활용을 위해 requirements만 먼저 복사)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install \
    dbt-core==1.8.0 \
    dbt-postgres==1.8.0 \
    -r requirements.txt

# ──────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────
FROM python:3.11-slim AS runtime

# 보안: non-root 사용자 생성
RUN groupadd -r dbt && useradd -r -g dbt -d /home/dbt -m dbt

# Builder에서 설치된 패키지 복사
COPY --from=builder /install /usr/local

# dbt 프로젝트 코드 복사
COPY --chown=dbt:dbt dbt_project/ /home/dbt/project/

WORKDIR /home/dbt/project
USER dbt

# profiles.yml은 Secret으로 런타임 마운트 (이미지에 포함하지 않음!)
# 마운트 경로: /home/dbt/.dbt/profiles.yml

ENTRYPOINT ["dbt"]
CMD ["run"]
```

!!! danger "profiles.yml을 Docker 이미지에 절대 포함하지 마세요"
    `profiles.yml`에는 DB 접속 정보(호스트, 유저, 비밀번호)가 들어갑니다.
    이미지에 포함하면 이미지에 접근할 수 있는 누구나 DB 접속 정보를 볼 수 있습니다.
    반드시 Kubernetes Secret으로 런타임에 마운트하세요.

#### 빌드 & 푸시

```bash
# 빌드
docker build -t my-registry.example.com/dbt-project:1.0.0 .

# 푸시
docker push my-registry.example.com/dbt-project:1.0.0
```

#### requirements.txt 예시

```text
# requirements.txt
# dbt adapter는 Dockerfile에서 직접 설치하므로 여기에는 추가 패키지만
dbt-utils==1.1.1
elementary-data==0.14.0
```

---

### 3.3 dbt를 Job으로 실행하기

Airflow 없이 dbt만 Kubernetes에서 실행하려면 **Job** 또는 **CronJob**을 사용합니다.

#### 완전한 Job YAML

```yaml
# dbt-run-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dbt-run-daily-20240115
  namespace: data-pipelines
  labels:
    app: dbt
    run-type: daily
spec:
  backoffLimit: 3                # (1)!
  activeDeadlineSeconds: 3600    # (2)!
  ttlSecondsAfterFinished: 86400 # (3)!
  template:
    metadata:
      labels:
        app: dbt
        run-type: daily
    spec:
      serviceAccountName: dbt-runner
      restartPolicy: Never       # (4)!
      containers:
        - name: dbt
          image: my-registry.example.com/dbt-project:1.0.0
          command: ["dbt"]
          args:
            - "run"
            - "--target"
            - "prd"
            - "--select"
            - "tag:daily"
          env:
            - name: DBT_PROFILES_DIR
              value: /home/dbt/.dbt
            - name: DBT_TARGET
              value: prd
          envFrom:
            - secretRef:
                name: dbt-env-secrets  # (5)!
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
          volumeMounts:
            - name: dbt-profiles
              mountPath: /home/dbt/.dbt
              readOnly: true
      volumes:
        - name: dbt-profiles
          secret:
            secretName: dbt-profiles-secret
```

1. 실패 시 최대 3번까지 재시도합니다.
2. 전체 Job 실행 시간을 1시간(3600초)으로 제한합니다. 초과하면 강제 종료됩니다.
3. Job 완료 후 24시간(86400초) 뒤에 자동 정리됩니다.
4. Job에서는 `restartPolicy: Never`를 사용합니다. `OnFailure`를 쓰면 같은 Pod에서 재시작하지만, `Never`를 쓰면 새 Pod을 생성합니다.
5. DB 비밀번호 등을 환경변수로 주입합니다.

#### CronJob으로 주기적 실행

```yaml
# dbt-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dbt-run-daily
  namespace: data-pipelines
spec:
  schedule: "0 6 * * *"         # (1)!
  concurrencyPolicy: Forbid      # (2)!
  successfulJobsHistoryLimit: 3  # (3)!
  failedJobsHistoryLimit: 5
  startingDeadlineSeconds: 600   # (4)!
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600
      ttlSecondsAfterFinished: 172800
      template:
        metadata:
          labels:
            app: dbt
            run-type: daily-cron
        spec:
          serviceAccountName: dbt-runner
          restartPolicy: Never
          containers:
            - name: dbt
              image: my-registry.example.com/dbt-project:1.0.0
              command: ["dbt"]
              args: ["run", "--target", "prd", "--select", "tag:daily"]
              env:
                - name: DBT_PROFILES_DIR
                  value: /home/dbt/.dbt
              resources:
                requests:
                  cpu: "1"
                  memory: 2Gi
                limits:
                  cpu: "2"
                  memory: 4Gi
              volumeMounts:
                - name: dbt-profiles
                  mountPath: /home/dbt/.dbt
                  readOnly: true
          volumes:
            - name: dbt-profiles
              secret:
                secretName: dbt-profiles-secret
```

1. 매일 06:00 UTC에 실행됩니다.
2. `Forbid`: 이전 Job이 아직 실행 중이면 새 Job을 생성하지 않습니다. 데이터 파이프라인에서 중복 실행 방지에 유용합니다.
3. 성공한 Job 3개, 실패한 Job 5개의 이력을 유지합니다.
4. 예정된 시간으로부터 10분(600초) 내에 시작하지 못하면 해당 실행을 건너뜁니다.

```bash
# CronJob 상태 확인
kubectl get cronjob -n data-pipelines
kubectl get jobs -n data-pipelines --sort-by=.metadata.creationTimestamp

# 수동 트리거
kubectl create job dbt-manual-run --from=cronjob/dbt-run-daily -n data-pipelines
```

---

### 3.4 dbt + Airflow 통합

프로덕션 데이터 파이프라인에서는 dbt를 Airflow와 통합하여 다른 ETL Task와 의존 관계를 관리하는 것이 일반적입니다.

#### KubernetesPodOperator로 dbt 실행하는 DAG

```python
# dags/dbt_pipeline.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
from airflow.operators.python import PythonOperator
from kubernetes.client import models as k8s

# ─── 공통 설정 ───
DBT_IMAGE = "my-registry.example.com/dbt-project:1.0.0"
NAMESPACE = "airflow-prd"

dbt_volumes = [
    k8s.V1Volume(
        name="dbt-profiles",
        secret=k8s.V1SecretVolumeSource(secret_name="dbt-profiles-secret"),
    ),
]

dbt_volume_mounts = [
    k8s.V1VolumeMount(
        name="dbt-profiles",
        mount_path="/home/dbt/.dbt",
        read_only=True,
    ),
]

dbt_env = {
    "DBT_PROFILES_DIR": "/home/dbt/.dbt",
    "DBT_TARGET": "prd",
}

dbt_resources = k8s.V1ResourceRequirements(
    requests={"cpu": "1", "memory": "2Gi"},
    limits={"cpu": "2", "memory": "4Gi"},
)


# ─── 실패 콜백 ───
def on_failure_alert(context):
    """Task 실패 시 알림 (Slack, Email 등)"""
    task_instance = context["task_instance"]
    dag_id = context["dag"].dag_id
    task_id = task_instance.task_id
    execution_date = context["execution_date"]
    log_url = task_instance.log_url

    message = (
        f"[ALERT] Task Failed!\n"
        f"DAG: {dag_id}\n"
        f"Task: {task_id}\n"
        f"Execution Date: {execution_date}\n"
        f"Log: {log_url}"
    )
    # Slack webhook, email 등으로 발송
    print(message)


# ─── DAG 정의 ───
default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "on_failure_callback": on_failure_alert,
}

with DAG(
    dag_id="dbt_pipeline",
    default_args=default_args,
    description="dbt run/test pipeline on Kubernetes",
    schedule="0 7 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["dbt", "data-warehouse"],
) as dag:

    # 1. dbt deps — 패키지 설치
    dbt_deps = KubernetesPodOperator(
        task_id="dbt_deps",
        namespace=NAMESPACE,
        image=DBT_IMAGE,
        cmds=["dbt"],
        arguments=["deps"],
        volumes=dbt_volumes,
        volume_mounts=dbt_volume_mounts,
        env_vars=dbt_env,
        resources=dbt_resources,
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-deps",
    )

    # 2. dbt run — staging 모델
    dbt_run_staging = KubernetesPodOperator(
        task_id="dbt_run_staging",
        namespace=NAMESPACE,
        image=DBT_IMAGE,
        cmds=["dbt"],
        arguments=["run", "--select", "staging"],
        volumes=dbt_volumes,
        volume_mounts=dbt_volume_mounts,
        env_vars=dbt_env,
        resources=dbt_resources,
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-run-staging",
    )

    # 3. dbt run — mart 모델
    dbt_run_marts = KubernetesPodOperator(
        task_id="dbt_run_marts",
        namespace=NAMESPACE,
        image=DBT_IMAGE,
        cmds=["dbt"],
        arguments=["run", "--select", "marts"],
        volumes=dbt_volumes,
        volume_mounts=dbt_volume_mounts,
        env_vars=dbt_env,
        resources=dbt_resources,
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-run-marts",
    )

    # 4. dbt test — 전체 테스트
    dbt_test = KubernetesPodOperator(
        task_id="dbt_test",
        namespace=NAMESPACE,
        image=DBT_IMAGE,
        cmds=["dbt"],
        arguments=["test", "--select", "staging marts"],
        volumes=dbt_volumes,
        volume_mounts=dbt_volume_mounts,
        env_vars=dbt_env,
        resources=dbt_resources,
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-test",
    )

    # 5. dbt docs generate (선택)
    dbt_docs = KubernetesPodOperator(
        task_id="dbt_docs_generate",
        namespace=NAMESPACE,
        image=DBT_IMAGE,
        cmds=["dbt"],
        arguments=["docs", "generate"],
        volumes=dbt_volumes,
        volume_mounts=dbt_volume_mounts,
        env_vars=dbt_env,
        resources=dbt_resources,
        is_delete_operator_pod=True,
        get_logs=True,
        name="dbt-docs",
    )

    dbt_deps >> dbt_run_staging >> dbt_run_marts >> dbt_test >> dbt_docs
```

---

### 3.5 dbt profiles.yml Secret 관리

dbt의 `profiles.yml`에는 데이터베이스 접속 정보가 포함됩니다. 이 정보를 Kubernetes Secret으로 안전하게 관리하는 방법을 알아봅시다.

#### 방법 1: profiles.yml 전체를 Secret으로 관리

```yaml
# profiles.yml (평문 — 이 파일 자체를 Secret으로 저장)
my_project:
  target: prd
  outputs:
    dev:
      type: postgres
      host: "{{ env_var('DBT_DB_HOST') }}"      # (1)!
      port: 5432
      user: "{{ env_var('DBT_DB_USER') }}"
      password: "{{ env_var('DBT_DB_PASSWORD') }}"
      dbname: "{{ env_var('DBT_DB_NAME') }}"
      schema: analytics_dev
      threads: 4

    prd:
      type: postgres
      host: "{{ env_var('DBT_DB_HOST') }}"
      port: 5432
      user: "{{ env_var('DBT_DB_USER') }}"
      password: "{{ env_var('DBT_DB_PASSWORD') }}"
      dbname: "{{ env_var('DBT_DB_NAME') }}"
      schema: analytics
      threads: 8
```

1. dbt의 `env_var()` 함수를 사용하면, profiles.yml 안에서 환경변수를 참조할 수 있습니다. 이렇게 하면 profiles.yml 자체에는 실제 비밀번호가 포함되지 않습니다.

```yaml
# dbt-profiles-secret.yaml — profiles.yml을 Secret으로 생성
apiVersion: v1
kind: Secret
metadata:
  name: dbt-profiles-secret
  namespace: airflow-prd
type: Opaque
stringData:
  profiles.yml: |
    my_project:
      target: prd
      outputs:
        prd:
          type: postgres
          host: "{{ env_var('DBT_DB_HOST') }}"
          port: 5432
          user: "{{ env_var('DBT_DB_USER') }}"
          password: "{{ env_var('DBT_DB_PASSWORD') }}"
          dbname: "{{ env_var('DBT_DB_NAME') }}"
          schema: analytics
          threads: 8
```

```yaml
# dbt-env-secrets.yaml — DB 접속 정보를 환경변수 Secret으로 관리
apiVersion: v1
kind: Secret
metadata:
  name: dbt-env-secrets
  namespace: airflow-prd
type: Opaque
stringData:
  DBT_DB_HOST: warehouse.example.com
  DBT_DB_USER: dbt_user
  DBT_DB_PASSWORD: "super-secret-password-here"
  DBT_DB_NAME: analytics_db
```

```bash
# Secret 생성 (명령줄에서)
kubectl apply -f dbt-profiles-secret.yaml
kubectl apply -f dbt-env-secrets.yaml

# Secret 확인
kubectl get secrets -n airflow-prd
kubectl describe secret dbt-profiles-secret -n airflow-prd
```

#### 방법 2: 환경변수만으로 profiles.yml 구성

환경변수만으로 profiles.yml의 모든 값을 주입하는 패턴입니다.

```yaml
# Job에서 Secret 마운트 + 환경변수 주입
apiVersion: batch/v1
kind: Job
metadata:
  name: dbt-run-with-secrets
  namespace: data-pipelines
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: dbt
          image: my-registry.example.com/dbt-project:1.0.0
          command: ["dbt"]
          args: ["run", "--target", "prd"]
          env:
            - name: DBT_PROFILES_DIR
              value: /home/dbt/.dbt
          envFrom:
            - secretRef:
                name: dbt-env-secrets     # (1)!
          volumeMounts:
            - name: dbt-profiles
              mountPath: /home/dbt/.dbt
              readOnly: true
      volumes:
        - name: dbt-profiles
          secret:
            secretName: dbt-profiles-secret
```

1. `envFrom`을 사용하면 Secret의 모든 키-값 쌍이 환경변수로 주입됩니다.

!!! tip "Secret 관리 도구"
    프로덕션에서는 YAML 파일로 Secret을 직접 관리하기보다, 다음 도구를 사용하는 것이 안전합니다:

    - **Sealed Secrets**: Secret을 암호화하여 Git에 안전하게 저장
    - **External Secrets Operator**: AWS Secrets Manager, HashiCorp Vault 등 외부 저장소에서 자동 동기화
    - **SOPS (Secrets OPerationS)**: 파일 암호화 도구. Git에 암호화된 Secret 저장

---

## Part 4: 실전 아키텍처

### 4.1 전체 아키텍처 도식화

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Data Pipeline on Kubernetes — 전체 아키텍처</div>
  <div class="k8s-arch-grid">
    <div class="k8s-arch-section k8s-pipeline-source">
      <div class="k8s-section-label">Data Sources</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🗄️</div>
          <div class="k8s-comp-name">Application DB</div>
          <div class="k8s-comp-desc">PostgreSQL / MySQL<br>Service의 원천 데이터</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📡</div>
          <div class="k8s-comp-name">Event Stream</div>
          <div class="k8s-comp-desc">Kafka / Kinesis<br>실시간 이벤트 로그</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔗</div>
          <div class="k8s-comp-name">External API</div>
          <div class="k8s-comp-desc">REST / GraphQL<br>서드파티 데이터</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-arrow">
      <div class="k8s-arrow-line">▼ &nbsp; Extract &amp; Load (Airflow Task Pods) &nbsp; ▼</div>
    </div>
    <div class="k8s-arch-section k8s-pipeline-airflow">
      <div class="k8s-section-label">Airflow (Scheduler + KubernetesExecutor)</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">⏱️</div>
          <div class="k8s-comp-name">Scheduler Pod</div>
          <div class="k8s-comp-desc">Deployment (HA: 2 replicas)<br>DAG 파싱 &amp; Task 스케줄링</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🌐</div>
          <div class="k8s-comp-name">Webserver Pod</div>
          <div class="k8s-comp-desc">Deployment + Service + Ingress<br>UI 대시보드</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🗄️</div>
          <div class="k8s-comp-name">Metadata DB</div>
          <div class="k8s-comp-desc">외부 PostgreSQL (RDS)<br>DAG/Task 상태 저장</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-arrow">
      <div class="k8s-arrow-line">▼ &nbsp; KubernetesPodOperator &nbsp; ▼</div>
    </div>
    <div class="k8s-arch-section k8s-pipeline-dbt">
      <div class="k8s-section-label">dbt Worker Pods</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔧</div>
          <div class="k8s-comp-name">dbt run (staging)</div>
          <div class="k8s-comp-desc">Pod (동적 생성/삭제)<br>Secret에서 profiles.yml 마운트</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔧</div>
          <div class="k8s-comp-name">dbt run (marts)</div>
          <div class="k8s-comp-desc">Pod (동적 생성/삭제)<br>모델별 병렬 실행 가능</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">✅</div>
          <div class="k8s-comp-name">dbt test</div>
          <div class="k8s-comp-desc">Pod (동적 생성/삭제)<br>데이터 품질 검증</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-arrow">
      <div class="k8s-arrow-line">▼ &nbsp; Transform 결과 저장 &nbsp; ▼</div>
    </div>
    <div class="k8s-arch-section k8s-pipeline-warehouse">
      <div class="k8s-section-label">Data Warehouse &amp; BI</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">📊</div>
          <div class="k8s-comp-name">Data Warehouse</div>
          <div class="k8s-comp-desc">PostgreSQL / BigQuery / Snowflake<br>분석용 데이터 저장</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📈</div>
          <div class="k8s-comp-name">BI Tool</div>
          <div class="k8s-comp-desc">Superset / Metabase / Looker<br>대시보드 &amp; 시각화</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">☁️</div>
          <div class="k8s-comp-name">S3 / GCS</div>
          <div class="k8s-comp-desc">Airflow 로그 저장<br>Raw 데이터 아카이브</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
/* Data Pipeline Architecture Diagram — Catppuccin Mocha */
.k8s-pipeline-source {
  background: rgba(249, 226, 175, 0.08);
  border: 1px solid rgba(249, 226, 175, 0.3);
}
.k8s-pipeline-source .k8s-section-label { color: #f9e2af; }
.k8s-pipeline-airflow {
  background: rgba(137, 180, 250, 0.08);
  border: 1px solid rgba(137, 180, 250, 0.3);
}
.k8s-pipeline-airflow .k8s-section-label { color: #89b4fa; }
.k8s-pipeline-dbt {
  background: rgba(203, 166, 247, 0.08);
  border: 1px solid rgba(203, 166, 247, 0.3);
}
.k8s-pipeline-dbt .k8s-section-label { color: #cba6f7; }
.k8s-pipeline-warehouse {
  background: rgba(166, 227, 161, 0.08);
  border: 1px solid rgba(166, 227, 161, 0.3);
}
.k8s-pipeline-warehouse .k8s-section-label { color: #a6e3a1; }
</style>

#### K8s 리소스 매핑 요약

| 파이프라인 컴포넌트 | Kubernetes 리소스 | 비고 |
|-------------------|------------------|------|
| Airflow Webserver | Deployment + Service + Ingress | HA 2 replicas |
| Airflow Scheduler | Deployment | HA 2 replicas, ServiceAccount 필수 |
| Airflow Triggerer | Deployment | 1 replica |
| Airflow Metadata DB | 외부 관리형 DB (RDS) 또는 StatefulSet | 외부 DB 권장 |
| Worker Pod | 동적 Pod (KubernetesExecutor) | Task마다 생성/삭제 |
| dbt Pod | 동적 Pod (KubernetesPodOperator) | Secret 마운트 |
| DAG 파일 | git-sync Sidecar | Scheduler/Webserver에 부착 |
| DB 접속 정보 | Secret | profiles.yml + 환경변수 |
| Airflow 설정 | ConfigMap + 환경변수 | values.yaml에서 관리 |
| 로그 | S3/GCS (Remote Logging) | Pod 삭제 후에도 보존 |

---

### 4.2 프로덕션 체크리스트

Airflow + dbt를 프로덕션에 배포하기 전에 반드시 확인해야 할 항목들입니다.

#### RBAC 설정

```yaml
# 최종 RBAC 구성 — 모든 리소스를 한 파일에
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: airflow-worker
  namespace: airflow-prd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: airflow-pod-manager
  namespace: airflow-prd
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "create", "delete", "patch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create", "get"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["list", "watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: airflow-pod-manager-binding
  namespace: airflow-prd
subjects:
  - kind: ServiceAccount
    name: airflow-worker
    namespace: airflow-prd
roleRef:
  kind: Role
  name: airflow-pod-manager
  apiGroup: rbac.authorization.k8s.io
```

#### Resource 설정 가이드

| 컴포넌트 | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|------------|-----------|---------------|-------------|
| Webserver | 500m | 1 | 1Gi | 2Gi |
| Scheduler | 1 | 2 | 2Gi | 4Gi |
| Triggerer | 250m | 500m | 512Mi | 1Gi |
| dbt Worker | 1 | 2 | 2Gi | 4Gi |
| ETL Worker | 500m | 2 | 1Gi | 4Gi |
| git-sync | 50m | 100m | 64Mi | 128Mi |
| StatsD | 50m | 100m | 64Mi | 128Mi |

!!! warning "리소스 설정은 반드시 모니터링 후 조정하세요"
    위 값은 출발점일 뿐입니다. 실제 사용 패턴에 따라 Prometheus/Grafana로 리소스 사용량을 모니터링하고,
    `requests`는 평균 사용량에, `limits`는 피크 사용량에 맞추어 조정하세요.

#### PodDisruptionBudget (PDB) for Airflow Scheduler

노드 유지보수나 업데이트 시에도 Scheduler가 최소 1개 이상 실행되도록 보장합니다.

```yaml
# pdb-scheduler.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: airflow-scheduler-pdb
  namespace: airflow-prd
spec:
  minAvailable: 1                # (1)!
  selector:
    matchLabels:
      component: scheduler
      release: airflow
```

1. 최소 1개의 Scheduler Pod은 항상 실행 중이어야 합니다. `kubectl drain` 등으로 노드를 비울 때, 이 조건이 충족되지 않으면 eviction이 차단됩니다.

```yaml
# pdb-webserver.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: airflow-webserver-pdb
  namespace: airflow-prd
spec:
  minAvailable: 1
  selector:
    matchLabels:
      component: webserver
      release: airflow
```

#### Secret 관리 — External Secrets Operator 예시

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dbt-profiles-external
  namespace: airflow-prd
spec:
  refreshInterval: 1h            # (1)!
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: dbt-env-secrets        # (2)!
    creationPolicy: Owner
  data:
    - secretKey: DBT_DB_HOST
      remoteRef:
        key: prd/data-warehouse/credentials
        property: host
    - secretKey: DBT_DB_USER
      remoteRef:
        key: prd/data-warehouse/credentials
        property: username
    - secretKey: DBT_DB_PASSWORD
      remoteRef:
        key: prd/data-warehouse/credentials
        property: password
    - secretKey: DBT_DB_NAME
      remoteRef:
        key: prd/data-warehouse/credentials
        property: dbname
```

1. 1시간마다 외부 Secret Manager에서 값을 동기화합니다.
2. 이 ExternalSecret이 자동으로 `dbt-env-secrets`라는 이름의 Kubernetes Secret을 생성/갱신합니다.

#### Metadata DB 백업

Airflow의 Metadata DB에는 DAG 실행 이력, 변수, 커넥션 등 중요한 데이터가 저장됩니다. 정기 백업은 필수입니다.

```yaml
# metadata-db-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: airflow-db-backup
  namespace: airflow-prd
spec:
  schedule: "0 2 * * *"         # 매일 02:00 UTC
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: pg-dump
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - |
                  FILENAME="airflow_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
                  pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > /backup/$FILENAME
                  echo "Backup completed: $FILENAME"
              envFrom:
                - secretRef:
                    name: airflow-metadata-secret
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: airflow-backup-pvc
```

#### 최종 프로덕션 체크리스트

!!! tip "배포 전 점검표"
    **RBAC & 보안**

    - [ ] 전용 ServiceAccount 생성
    - [ ] 최소 권한 Role/RoleBinding 설정
    - [ ] `kubectl auth can-i`로 권한 검증
    - [ ] Secret으로 DB 접속 정보 관리
    - [ ] External Secrets Operator 또는 Sealed Secrets 설정

    **리소스 관리**

    - [ ] 모든 컴포넌트에 requests/limits 설정
    - [ ] ResourceQuota로 Namespace 리소스 상한 설정
    - [ ] LimitRange로 컨테이너 기본값 설정
    - [ ] PodDisruptionBudget 설정 (Scheduler, Webserver)

    **DAG 배포**

    - [ ] git-sync 설정 및 동기화 확인
    - [ ] Git 인증 (HTTPS token 또는 SSH key) 설정
    - [ ] subPath로 DAG 디렉토리 지정

    **로깅 & 모니터링**

    - [ ] Remote Logging (S3/GCS) 설정
    - [ ] IRSA 또는 GKE Workload Identity로 클라우드 접근 설정
    - [ ] StatsD → Prometheus → Grafana 연동
    - [ ] 주요 메트릭 알림 설정 (Scheduler heartbeat, Task 실패률)

    **데이터베이스**

    - [ ] 외부 관리형 DB (RDS/Cloud SQL) 사용
    - [ ] DB 백업 CronJob 설정
    - [ ] Connection pooling 설정 (PgBouncer)

    **네트워크**

    - [ ] Ingress + TLS 설정 (Webserver 접근)
    - [ ] NetworkPolicy로 불필요한 트래픽 차단

---

## 마무리

이번 보너스 챕터에서는 데이터 파이프라인의 핵심 도구인 Airflow와 dbt를 Kubernetes 위에 프로덕션 수준으로 배포하는 방법을 다뤘습니다.

핵심 요약:

1. **RBAC & ServiceAccount**: Airflow가 Pod를 동적으로 생성하려면 적절한 K8s API 권한이 필수
2. **KubernetesExecutor**: Task별 Pod 격리로 리소스 효율성과 안정성 확보
3. **Helm Chart**: 공식 Airflow Helm Chart로 복잡한 배포를 표준화
4. **dbt on K8s**: Secret 마운트로 접속 정보 보호, KubernetesPodOperator로 Airflow 통합
5. **프로덕션 체크리스트**: RBAC, 리소스 관리, Remote Logging, 모니터링, 백업까지

!!! info "더 깊이 알아보기"
    - [Apache Airflow Helm Chart 공식 문서](https://airflow.apache.org/docs/helm-chart/stable/index.html)
    - [Kubernetes RBAC 공식 문서](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
    - [dbt Core 공식 문서](https://docs.getdbt.com/docs/core/about-core-setup)
    - [External Secrets Operator](https://external-secrets.io/)
