# 6. 워크로드 리소스

Kubernetes에서 **워크로드(Workload)**란 클러스터 위에서 실행되는 애플리케이션을 의미합니다.
이 챕터에서는 Pod를 시작으로, Pod를 관리하는 상위 컨트롤러들(ReplicaSet, Deployment, StatefulSet, DaemonSet, Job, CronJob)까지 깊이 있게 다룹니다.

---

## 1. Pod 심화

### Pod = 최소 배포 단위

Pod는 Kubernetes에서 **생성하고 관리할 수 있는 가장 작은 배포 단위**입니다.
하나의 Pod 안에는 하나 이상의 컨테이너가 포함되며, 같은 Pod 내의 컨테이너들은 다음을 공유합니다:

- **네트워크 네임스페이스** — 동일한 IP 주소, 포트 공간
- **스토리지 볼륨** — `emptyDir` 등을 통한 파일 공유
- **IPC 네임스페이스** — 프로세스 간 통신 가능

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: simple-pod
  labels:
    app: myapp
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
```

!!! info "Pod를 직접 만들지 않는 이유"
    실무에서는 Pod를 직접 생성하는 일이 거의 없습니다.
    Deployment, StatefulSet 등 상위 컨트롤러가 Pod를 대신 생성하고 관리합니다.
    단독 Pod는 노드 장애 시 재생성되지 않기 때문입니다.

---

### Multi-container Pod 패턴

하나의 Pod에 여러 컨테이너를 넣는 대표적인 패턴 3가지입니다.

| 패턴 | 역할 | 예시 |
|------|------|------|
| **Sidecar** | 메인 컨테이너를 보조하는 기능 추가 | 로그 수집기(Fluentd), 서비스 메시(Envoy) |
| **Ambassador** | 메인 컨테이너의 네트워크 연결을 대리 | 로컬 프록시로 외부 DB 연결 |
| **Adapter** | 메인 컨테이너의 출력을 표준 형식으로 변환 | 모니터링 메트릭을 Prometheus 포맷으로 변환 |

#### Sidecar 패턴 예시

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-example
spec:
  containers:
    - name: app
      image: myapp:1.0
      volumeMounts:
        - name: log-volume
          mountPath: /var/log/app

    - name: log-collector
      image: fluentd:latest
      volumeMounts:
        - name: log-volume
          mountPath: /var/log/app
          readOnly: true

  volumes:
    - name: log-volume
      emptyDir: {}
```

위 예시에서 `app` 컨테이너가 `/var/log/app`에 로그를 기록하면, `log-collector` 컨테이너가 같은 볼륨을 읽어 외부 로그 시스템으로 전송합니다.

#### Ambassador 패턴 예시

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ambassador-example
spec:
  containers:
    - name: app
      image: myapp:1.0
      env:
        - name: DB_HOST
          value: "localhost"  # ambassador를 통해 접속
        - name: DB_PORT
          value: "5432"

    - name: db-proxy
      image: haproxy:2.8
      ports:
        - containerPort: 5432
```

메인 애플리케이션은 `localhost:5432`로 접속하지만, 실제로는 Ambassador 컨테이너(HAProxy)가 적절한 외부 데이터베이스로 라우팅합니다.

#### Adapter 패턴 예시

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: adapter-example
spec:
  containers:
    - name: app
      image: legacy-app:1.0
      volumeMounts:
        - name: metrics-volume
          mountPath: /var/metrics

    - name: metrics-adapter
      image: prometheus-adapter:1.0
      volumeMounts:
        - name: metrics-volume
          mountPath: /var/metrics
          readOnly: true
      ports:
        - containerPort: 9090

  volumes:
    - name: metrics-volume
      emptyDir: {}
```

레거시 애플리케이션의 독자적인 메트릭 포맷을 Adapter 컨테이너가 Prometheus가 이해할 수 있는 포맷으로 변환합니다.

---

### Init Container

Init Container는 **메인 컨테이너가 시작되기 전에 실행되는 초기화 전용 컨테이너**입니다.
모든 Init Container가 성공적으로 완료되어야만 메인 컨테이너가 시작됩니다.

**사용 사례:**

- 설정 파일 다운로드 또는 생성
- 데이터베이스 스키마 마이그레이션 대기
- 외부 서비스가 준비될 때까지 대기
- 보안 토큰 발급

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-container-example
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          until nc -z db-service 5432; do
            echo "Waiting for database..."
            sleep 2
          done
          echo "Database is ready!"

    - name: setup-config
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          echo '{"db_host": "db-service", "db_port": 5432}' > /config/app.json
      volumeMounts:
        - name: config-volume
          mountPath: /config

  containers:
    - name: app
      image: myapp:1.0
      volumeMounts:
        - name: config-volume
          mountPath: /config
          readOnly: true

  volumes:
    - name: config-volume
      emptyDir: {}
```

!!! tip "Init Container vs Sidecar"
    Init Container는 **순서대로 하나씩** 실행되며, 모두 완료된 후 메인 컨테이너가 시작됩니다.
    반면 Sidecar는 메인 컨테이너와 **동시에** 실행됩니다.
    "준비 작업"은 Init Container, "상시 보조"는 Sidecar가 적합합니다.

---

### Pod Lifecycle

Pod는 생성부터 종료까지 다음과 같은 상태(Phase)를 거칩니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Pod Lifecycle</div>
  <div class="k8s-lifecycle">
    <div class="k8s-state k8s-state-pending">Pending</div>
    <div class="k8s-arrow">&rarr;</div>
    <div class="k8s-state k8s-state-running">Running</div>
    <div class="k8s-arrow">&rarr;</div>
    <div class="k8s-branch">
      <div class="k8s-state k8s-state-succeeded">Succeeded</div>
      <div class="k8s-branch-or">or</div>
      <div class="k8s-state k8s-state-failed">Failed</div>
    </div>
  </div>
  <div class="k8s-lifecycle-detail">
    <div class="k8s-detail-row">
      <div class="k8s-detail-label k8s-state-pending">Pending</div>
      <div class="k8s-detail-desc">스케줄링 대기, 이미지 다운로드 중</div>
    </div>
    <div class="k8s-detail-row">
      <div class="k8s-detail-label k8s-state-running">Running</div>
      <div class="k8s-detail-desc">하나 이상의 컨테이너가 실행 중</div>
    </div>
    <div class="k8s-detail-row">
      <div class="k8s-detail-label k8s-state-succeeded">Succeeded</div>
      <div class="k8s-detail-desc">모든 컨테이너가 정상 종료 (exit 0)</div>
    </div>
    <div class="k8s-detail-row">
      <div class="k8s-detail-label k8s-state-failed">Failed</div>
      <div class="k8s-detail-desc">하나 이상의 컨테이너가 비정상 종료</div>
    </div>
    <div class="k8s-detail-row">
      <div class="k8s-detail-label k8s-state-unknown">Unknown</div>
      <div class="k8s-detail-desc">노드와 통신 불가 (네트워크 장애 등)</div>
    </div>
  </div>
</div>

각 Phase의 세부 설명:

| Phase | 설명 | 일반적인 원인 |
|-------|------|--------------|
| **Pending** | Pod가 API 서버에 등록되었으나 아직 노드에 스케줄되지 않음 | 이미지 Pull 중, 리소스 부족, nodeSelector 불일치 |
| **Running** | Pod가 노드에 바인딩되고, 하나 이상의 컨테이너가 실행 중 | 정상 상태 |
| **Succeeded** | Pod 내 모든 컨테이너가 성공적으로 종료됨 | Job 완료 |
| **Failed** | Pod 내 하나 이상의 컨테이너가 실패로 종료됨 | OOMKilled, 프로세스 에러 |
| **Unknown** | Pod 상태를 확인할 수 없음 | 노드 장애, 네트워크 문제 |

!!! warning "CrashLoopBackOff는 Phase가 아닙니다"
    `CrashLoopBackOff`는 Pod의 Phase가 아니라 **컨테이너의 상태(State)**입니다.
    컨테이너가 반복적으로 시작 → 실패 → 재시작될 때 kubelet이 재시작 간격을 점점 늘리는 것을 의미합니다.
    `kubectl describe pod <name>`으로 구체적인 실패 원인을 확인하세요.

---

### Resource Requests & Limits

Kubernetes는 CPU와 메모리 리소스를 **요청(Requests)**과 **제한(Limits)** 두 단계로 관리합니다.

| 구분 | 의미 | 스케줄링 | 런타임 |
|------|------|---------|--------|
| **Requests** | 컨테이너가 **보장받아야** 하는 최소 리소스 | 스케줄러가 이 값을 기준으로 노드 선택 | 항상 이 만큼은 사용 가능 |
| **Limits** | 컨테이너가 사용할 수 있는 **최대** 리소스 | 관여하지 않음 | 초과 시 CPU throttling 또는 OOMKill |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-example
spec:
  containers:
    - name: app
      image: myapp:1.0
      resources:
        requests:
          cpu: "250m"       # 0.25 vCPU
          memory: "128Mi"   # 128 MiB
        limits:
          cpu: "500m"       # 0.5 vCPU
          memory: "256Mi"   # 256 MiB
```

!!! info "CPU 단위"
    - `1` = 1 vCPU (AWS), 1 Core (베어메탈)
    - `250m` = 0.25 vCPU (millicore 단위)
    - `100m` = 0.1 vCPU

!!! info "메모리 단위"
    - `Mi` = Mebibyte (1 MiB = 1,048,576 bytes) — **권장**
    - `Gi` = Gibibyte (1 GiB = 1,073,741,824 bytes)
    - `M` = Megabyte (1 MB = 1,000,000 bytes)

**CPU vs 메모리의 차이:**

- **CPU 초과** — throttling만 발생하며 컨테이너는 계속 실행됩니다.
- **메모리 초과** — OOMKiller에 의해 컨테이너가 **즉시 종료**됩니다.

---

### QoS 클래스 (Quality of Service)

Kubernetes는 Pod에 설정된 리소스 Requests/Limits 조합에 따라 자동으로 QoS 클래스를 부여합니다.
노드의 메모리가 부족할 때, QoS 클래스에 따라 **어떤 Pod를 먼저 제거(evict)할지** 결정합니다.

| QoS 클래스 | 조건 | Eviction 우선순위 |
|-----------|------|------------------|
| **Guaranteed** | 모든 컨테이너의 Requests = Limits (CPU, Memory 모두) | 가장 마지막에 제거 (가장 안전) |
| **Burstable** | Requests < Limits이거나, 일부 컨테이너만 설정 | 중간 |
| **BestEffort** | Requests와 Limits 모두 미설정 | 가장 먼저 제거 (가장 위험) |

#### Guaranteed 예시

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "256Mi"
  limits:
    cpu: "500m"      # requests와 동일
    memory: "256Mi"  # requests와 동일
```

#### Burstable 예시

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "128Mi"
  limits:
    cpu: "500m"      # requests보다 큼
    memory: "256Mi"  # requests보다 큼
```

#### BestEffort 예시

```yaml
# resources 섹션이 아예 없음
containers:
  - name: app
    image: myapp:1.0
```

!!! tip "실무 권장 사항"
    - 프로덕션 워크로드에는 반드시 Requests와 Limits를 설정하세요.
    - 중요한 서비스에는 **Guaranteed** QoS를 사용하세요.
    - `LimitRange` 오브젝트를 네임스페이스에 설정하면 기본 리소스 값을 강제할 수 있습니다.

---

### Pod 우선순위와 선점 (Priority & Preemption)

클러스터 리소스가 부족할 때, **우선순위가 높은 Pod가 낮은 Pod를 밀어내고 스케줄링**될 수 있습니다.
이것을 **선점(Preemption)**이라고 합니다.

**설정 방법:**

1단계: PriorityClass 생성

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "프로덕션 핵심 서비스용"
```

2단계: Pod에 PriorityClass 지정

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
spec:
  priorityClassName: high-priority
  containers:
    - name: app
      image: myapp:1.0
```

!!! warning "선점 주의사항"
    선점이 발생하면 낮은 우선순위의 Pod가 **강제 종료**됩니다.
    gracefulTermination이 보장되지 않을 수 있으므로, 애플리케이션에서 SIGTERM 핸들링을 반드시 구현하세요.

---

## 2. ReplicaSet

### ReplicaSet이란?

ReplicaSet은 **지정된 수의 Pod 복제본이 항상 실행 중인 상태를 유지**하는 컨트롤러입니다.
Pod가 삭제되거나 노드가 장애를 일으키면 자동으로 새 Pod를 생성합니다.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: myapp-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:1.0
```

### 동작 원리

1. `selector.matchLabels`에 해당하는 Pod 수를 지속적으로 감시
2. 현재 Pod 수 < `replicas` → 새 Pod 생성
3. 현재 Pod 수 > `replicas` → 초과 Pod 삭제

### 왜 직접 사용하지 않는가?

!!! warning "ReplicaSet을 직접 사용하지 마세요"
    ReplicaSet은 **롤링 업데이트, 롤백 기능이 없습니다.**
    이미지 버전을 변경하려면 기존 ReplicaSet을 삭제하고 새로 만들어야 합니다.
    **Deployment**가 ReplicaSet을 자동으로 생성·관리하므로, 거의 모든 경우에 Deployment를 사용합니다.

---

## 3. Deployment

Deployment는 가장 많이 사용하는 워크로드 컨트롤러입니다.
내부적으로 **ReplicaSet을 관리**하며, 롤링 업데이트와 롤백 기능을 제공합니다.

### 실전 YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # 최대 1개 추가 Pod 허용
      maxUnavailable: 0     # 항상 3개 이상 유지
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:2.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

### Rolling Update 전략

기본 전략으로, **기존 Pod를 점진적으로 새 버전으로 교체**합니다.

| 파라미터 | 의미 | 기본값 |
|---------|------|--------|
| `maxSurge` | 원하는 replicas 수 대비 **추가로 생성할 수 있는** Pod 수 | 25% |
| `maxUnavailable` | 업데이트 중 **사용 불가능한 상태가 허용되는** Pod 수 | 25% |

**replicas=3, maxSurge=1, maxUnavailable=0인 경우의 업데이트 과정:**

```
단계 1: v1 Pod 3개 + v2 Pod 1개 생성 (총 4개)
단계 2: v2 Pod 1개 Ready → v1 Pod 1개 종료 (총 3개)
단계 3: v2 Pod 2개 생성 → v1 Pod 1개 종료
단계 4: v2 Pod 3개 Ready → 업데이트 완료
```

!!! tip "무중단 배포 설정"
    `maxUnavailable: 0`으로 설정하면 항상 원하는 수 이상의 Pod가 Running 상태를 유지합니다.
    이때 `maxSurge: 1` 이상이어야 업데이트가 진행됩니다 (둘 다 0이면 교착 상태).

### Recreate 전략

모든 기존 Pod를 먼저 종료한 뒤, 새 버전의 Pod를 생성합니다.
**다운타임이 발생**하지만, 두 버전이 동시에 실행되면 안 되는 경우에 사용합니다.

```yaml
spec:
  strategy:
    type: Recreate
```

**사용 사례:**

- 데이터베이스 스키마 변경이 이전 버전과 호환되지 않는 경우
- 볼륨을 ReadWriteOnce로 마운트하는 경우 (동시 접근 불가)

### 롤백

배포 후 문제가 발생하면 이전 버전으로 즉시 돌아갈 수 있습니다.

```bash
# 현재 롤아웃 상태 확인
kubectl rollout status deployment/myapp-deployment

# 롤아웃 히스토리 확인
kubectl rollout history deployment/myapp-deployment

# 바로 이전 버전으로 롤백
kubectl rollout undo deployment/myapp-deployment

# 특정 리비전으로 롤백
kubectl rollout undo deployment/myapp-deployment --to-revision=2

# 롤아웃 일시 중지 / 재개
kubectl rollout pause deployment/myapp-deployment
kubectl rollout resume deployment/myapp-deployment
```

!!! info "리비전 히스토리"
    Deployment는 기본적으로 최근 10개의 ReplicaSet(리비전)을 보관합니다.
    `spec.revisionHistoryLimit`으로 이 수를 조절할 수 있습니다.

---

## 4. StatefulSet

### Deployment와의 차이

StatefulSet은 **상태를 가진(Stateful) 애플리케이션**을 위한 컨트롤러입니다.
Deployment와 달리 다음을 보장합니다:

| 특성 | Deployment | StatefulSet |
|------|-----------|-------------|
| Pod 이름 | 랜덤 해시 (`myapp-7d9f4b-x2k8z`) | 순서 인덱스 (`myapp-0`, `myapp-1`, `myapp-2`) |
| 네트워크 ID | 불안정 (재생성 시 변경) | 안정적 (Headless Service와 조합) |
| 스토리지 | Pod 삭제 시 PVC도 삭제 가능 | Pod 삭제해도 PVC 유지 |
| 생성/삭제 순서 | 동시 (병렬) | 순서 보장 (0 → 1 → 2) |
| 롤링 업데이트 | 임의 순서 | 역순 (2 → 1 → 0) |

### 데이터베이스 배포에 적합한 이유

1. **안정적 네트워크 ID** — 각 Pod가 고유한 DNS 이름을 가지므로, 클러스터 멤버 간 통신이 예측 가능합니다.
2. **순서 보장** — Primary가 먼저 시작된 후 Replica가 시작되는 순서를 보장합니다.
3. **영구 볼륨** — Pod가 재시작되어도 동일한 PersistentVolumeClaim에 재연결됩니다.

### Headless Service와의 관계

StatefulSet은 반드시 **Headless Service** (`clusterIP: None`)와 함께 사용합니다.
이를 통해 각 Pod가 고유한 DNS 레코드를 갖게 됩니다.

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

예를 들어 `mydb-0.mydb-headless.default.svc.cluster.local`로 특정 Pod에 직접 접근할 수 있습니다.

### YAML 예시

```yaml
# 1. Headless Service
apiVersion: v1
kind: Service
metadata:
  name: mydb-headless
  labels:
    app: mydb
spec:
  clusterIP: None
  selector:
    app: mydb
  ports:
    - port: 5432
      targetPort: 5432
---
# 2. StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mydb
spec:
  serviceName: mydb-headless    # Headless Service 이름 지정 필수
  replicas: 3
  selector:
    matchLabels:
      app: mydb
  template:
    metadata:
      labels:
        app: mydb
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data

  volumeClaimTemplates:          # Pod마다 독립 PVC 자동 생성
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

위 StatefulSet이 배포되면 다음 리소스가 생성됩니다:

- Pod: `mydb-0`, `mydb-1`, `mydb-2` (순서대로 생성)
- PVC: `data-mydb-0`, `data-mydb-1`, `data-mydb-2` (각 Pod 전용)
- DNS: `mydb-0.mydb-headless.default.svc.cluster.local` 등

!!! warning "StatefulSet 삭제 시 주의"
    StatefulSet을 삭제해도 **PVC는 자동으로 삭제되지 않습니다.**
    데이터를 보존하기 위한 의도적인 설계이므로, PVC는 별도로 삭제해야 합니다.

---

## 5. DaemonSet

### 모든 노드에 하나씩 배포

DaemonSet은 **클러스터의 모든 노드(또는 특정 노드)에 Pod를 하나씩 배포**하는 컨트롤러입니다.
새 노드가 추가되면 자동으로 Pod가 생성되고, 노드가 제거되면 Pod도 함께 삭제됩니다.

### 유스케이스

| 유스케이스 | 대표 도구 |
|-----------|----------|
| 로그 수집 | Fluentd, Fluent Bit, Filebeat |
| 모니터링 에이전트 | Prometheus Node Exporter, Datadog Agent |
| 네트워크 플러그인 | Calico, Cilium, Weave Net |
| 스토리지 데몬 | Ceph, GlusterFS |
| 보안 에이전트 | Falco, Sysdig |

### YAML 예시

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule    # control-plane 노드에도 배포
      containers:
        - name: fluentd
          image: fluentd:v1.16
          resources:
            requests:
              cpu: "100m"
              memory: "200Mi"
            limits:
              cpu: "200m"
              memory: "400Mi"
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
```

!!! tip "특정 노드에만 배포하기"
    `nodeSelector` 또는 `nodeAffinity`를 사용하면 특정 라벨이 있는 노드에만 DaemonSet Pod를 배포할 수 있습니다.
    ```yaml
    spec:
      template:
        spec:
          nodeSelector:
            disk: ssd
    ```

---

## 6. Job & CronJob

### Job — 일회성 작업

Job은 **지정된 횟수만큼 Pod를 성공적으로 완료**시키는 컨트롤러입니다.
일반 Pod와 달리, 완료된 후에도 로그 확인을 위해 Pod가 바로 삭제되지 않습니다.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  backoffLimit: 3          # 최대 재시도 횟수
  activeDeadlineSeconds: 600  # 전체 Job 타임아웃 (10분)
  template:
    spec:
      restartPolicy: Never   # Job에서는 Never 또는 OnFailure만 가능
      containers:
        - name: migrate
          image: myapp-migrate:1.0
          command: ["python", "manage.py", "migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
```

### Job 핵심 파라미터

| 파라미터 | 설명 | 기본값 |
|---------|------|--------|
| `completions` | 성공적으로 완료해야 하는 Pod 수 | 1 |
| `parallelism` | 동시에 실행할 수 있는 Pod 수 | 1 |
| `backoffLimit` | 실패 시 최대 재시도 횟수 | 6 |
| `activeDeadlineSeconds` | Job 전체 실행 시간 제한 (초) | 제한 없음 |
| `ttlSecondsAfterFinished` | 완료 후 자동 삭제까지 대기 시간 (초) | 삭제하지 않음 |

#### 병렬 처리 예시

10개의 작업을 3개씩 병렬로 처리:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processing
spec:
  completions: 10     # 총 10개 Pod 성공 필요
  parallelism: 3      # 최대 3개 동시 실행
  backoffLimit: 5
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: worker
          image: batch-worker:1.0
```

### CronJob — 주기적 작업

CronJob은 **cron 스케줄에 따라 Job을 반복 생성**하는 컨트롤러입니다.
Linux crontab과 동일한 형식의 스케줄을 사용합니다.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 2 * * *"           # 매일 새벽 2시
  concurrencyPolicy: Forbid        # 이전 Job이 실행 중이면 새 Job 생성 금지
  successfulJobsHistoryLimit: 3    # 성공한 Job 히스토리 보관 수
  failedJobsHistoryLimit: 3        # 실패한 Job 히스토리 보관 수
  startingDeadlineSeconds: 300     # 스케줄 시간 후 5분 이내에 시작 못하면 스킵
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: report-generator:1.0
              command:
                - python
                - generate_report.py
              resources:
                requests:
                  cpu: "500m"
                  memory: "512Mi"
                limits:
                  cpu: "1"
                  memory: "1Gi"
```

### Cron 스케줄 표현식

```
┌───────────── 분 (0 - 59)
│ ┌───────────── 시 (0 - 23)
│ │ ┌───────────── 일 (1 - 31)
│ │ │ ┌───────────── 월 (1 - 12)
│ │ │ │ ┌───────────── 요일 (0 - 6, 일요일=0)
│ │ │ │ │
* * * * *
```

자주 사용하는 예시:

| 스케줄 | 의미 |
|--------|------|
| `*/5 * * * *` | 5분마다 |
| `0 * * * *` | 매시 정각 |
| `0 2 * * *` | 매일 새벽 2시 |
| `0 0 * * 1` | 매주 월요일 자정 |
| `0 0 1 * *` | 매월 1일 자정 |

### ConcurrencyPolicy

| 정책 | 설명 |
|------|------|
| **Allow** (기본) | 이전 Job이 실행 중이어도 새 Job을 생성 |
| **Forbid** | 이전 Job이 실행 중이면 새 Job 생성을 건너뜀 |
| **Replace** | 이전 Job을 취소하고 새 Job으로 교체 |

!!! tip "실무 권장 사항"
    - 데이터 처리 Job에는 `concurrencyPolicy: Forbid`를 사용하여 중복 실행을 방지하세요.
    - `ttlSecondsAfterFinished`를 설정하여 완료된 Job Pod가 무한히 남아있지 않도록 하세요.
    - `activeDeadlineSeconds`로 무한 실행을 방지하세요.

---

## 워크로드 리소스 비교 요약

| 리소스 | 용도 | Pod 수 | 상태 유지 | 스케줄링 |
|--------|------|--------|----------|---------|
| **Pod** | 최소 단위 | 1 | - | 단독 실행 |
| **ReplicaSet** | 복제본 유지 | N개 (고정) | X | 직접 사용 비권장 |
| **Deployment** | 무상태 앱 배포 | N개 (고정) | X | 롤링 업데이트 |
| **StatefulSet** | 상태 유지 앱 | N개 (순서 보장) | O | 순서대로 생성/삭제 |
| **DaemonSet** | 노드당 1개 | 노드 수만큼 | X | 모든 노드 배포 |
| **Job** | 일회성 작업 | 완료까지 | X | completions 기반 |
| **CronJob** | 반복 작업 | 스케줄마다 Job 생성 | X | cron 표현식 |

---

## 핵심 명령어 모음

```bash
# Pod 조회 및 상세 정보
kubectl get pods -o wide
kubectl describe pod <pod-name>
kubectl logs <pod-name> -c <container-name>   # 멀티 컨테이너 시 -c 지정

# Deployment 관리
kubectl create deployment myapp --image=myapp:1.0 --replicas=3
kubectl scale deployment myapp --replicas=5
kubectl set image deployment/myapp app=myapp:2.0

# 롤아웃 관리
kubectl rollout status deployment/myapp
kubectl rollout history deployment/myapp
kubectl rollout undo deployment/myapp

# StatefulSet 조회
kubectl get statefulset
kubectl get pvc   # 연관된 PersistentVolumeClaim 확인

# DaemonSet 조회
kubectl get daemonset -n kube-system

# Job / CronJob 관리
kubectl get jobs
kubectl get cronjobs
kubectl create job manual-run --from=cronjob/daily-report  # CronJob에서 수동 실행

# 리소스 사용량 확인 (metrics-server 필요)
kubectl top pods
kubectl top nodes
```

!!! info "다음 챕터 예고"
    다음 챕터에서는 **서비스(Service)와 네트워킹**을 다룹니다.
    ClusterIP, NodePort, LoadBalancer, Ingress를 통해 Pod에 접근하는 방법을 알아봅니다.
