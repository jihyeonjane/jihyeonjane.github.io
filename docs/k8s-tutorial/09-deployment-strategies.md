# 9. 배포 전략 (Deployment Strategies)

운영 환경에서 애플리케이션을 안전하게 배포하는 것은 쿠버네티스 활용의 핵심입니다. 이 챕터에서는 실전에서 사용되는 주요 배포 전략과 자동 스케일링, 그리고 배포 시 반드시 확인해야 할 체크리스트를 다룹니다.

---

## 1. Rolling Update (기본 전략)

Kubernetes Deployment의 **기본 배포 전략**입니다. 기존 Pod를 점진적으로 새 버전으로 교체하여 **다운타임 없이** 배포합니다.

### 동작 원리

Rolling Update는 새 Pod를 하나씩 생성하고, 정상 동작이 확인되면 기존 Pod를 하나씩 종료합니다. 전체 과정에서 항상 일정 수 이상의 Pod가 트래픽을 처리합니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Rolling Update 과정</div>
  <div class="k8s-deploy-stages">
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 1: 초기 상태</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
      </div>
      <div class="k8s-stage-desc">모든 Pod가 v1으로 동작 중</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 2: 새 Pod 생성</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-new k8s-pod-starting">v2</div>
      </div>
      <div class="k8s-stage-desc">maxSurge에 따라 v2 Pod 추가 생성</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 3: 교체 진행</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-terminating">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
      </div>
      <div class="k8s-stage-desc">v2가 Ready 되면 v1 하나를 종료</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 4: 계속 교체</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-old">v1</div>
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
      </div>
      <div class="k8s-stage-desc">v1 Pod를 하나씩 v2로 교체</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 5: 완료</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
        <div class="k8s-pod-icon k8s-pod-new">v2</div>
      </div>
      <div class="k8s-stage-desc">모든 Pod가 v2로 교체 완료</div>
    </div>
  </div>
</div>

### maxSurge / maxUnavailable 설정

Rolling Update의 속도와 안정성을 제어하는 두 가지 핵심 파라미터입니다.

| 파라미터 | 설명 | 기본값 |
|----------|------|--------|
| `maxSurge` | 원하는 replica 수 대비 **추가로 생성**할 수 있는 Pod 수 | 25% |
| `maxUnavailable` | 업데이트 중 **사용 불가능**할 수 있는 최대 Pod 수 | 25% |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # 최대 5개까지 Pod 생성 가능 (4+1)
      maxUnavailable: 1    # 최소 3개는 항상 가용
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:2.0.0
          ports:
            - containerPort: 8080
```

!!! tip "maxSurge와 maxUnavailable 조합 팁"
    - **안정성 우선**: `maxSurge: 1`, `maxUnavailable: 0` — 항상 전체 replica 유지, 느리지만 안전
    - **속도 우선**: `maxSurge: 50%`, `maxUnavailable: 50%` — 빠르게 교체, 순간 가용 Pod 감소 가능
    - **균형**: `maxSurge: 25%`, `maxUnavailable: 25%` — 기본값, 대부분의 경우 적절

### minReadySeconds

새 Pod가 Ready 상태가 된 후 **최소 대기 시간**(초)을 설정합니다. 이 시간 동안 문제가 발생하지 않아야 다음 단계로 진행합니다.

```yaml
spec:
  minReadySeconds: 10    # Ready 후 10초간 안정적이어야 진행
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

!!! warning "minReadySeconds를 설정하지 않으면"
    Pod가 Ready 즉시 다음 Pod 교체로 진행합니다. 애플리케이션이 Ready가 되었지만 실제로는 아직 초기화 중인 경우 장애가 발생할 수 있습니다.

### 롤백: kubectl rollout undo

배포 후 문제가 발견되면 이전 버전으로 즉시 롤백할 수 있습니다.

```bash
# 배포 상태 확인
kubectl rollout status deployment/my-app

# 배포 히스토리 확인
kubectl rollout history deployment/my-app

# 직전 버전으로 롤백
kubectl rollout undo deployment/my-app

# 특정 리비전으로 롤백
kubectl rollout undo deployment/my-app --to-revision=3

# 배포 일시 중지 / 재개
kubectl rollout pause deployment/my-app
kubectl rollout resume deployment/my-app
```

!!! info "revisionHistoryLimit"
    Deployment의 `spec.revisionHistoryLimit` (기본값 10)만큼 이전 ReplicaSet을 보관합니다. 너무 낮게 설정하면 롤백 대상이 부족할 수 있습니다.

---

## 2. Blue/Green 배포

### 개념 설명

Blue/Green 배포는 **두 개의 완전한 환경**(Blue = 현재 버전, Green = 새 버전)을 동시에 운영하고, 준비가 되면 트래픽을 한 번에 전환하는 방식입니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Blue/Green 배포 과정</div>
  <div class="k8s-deploy-stages">
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 1: Blue 운영 중</div>
      <div class="k8s-bluegreen-row">
        <div class="k8s-env-group k8s-env-active">
          <div class="k8s-env-label">Blue (v1) — LIVE</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
          </div>
        </div>
        <div class="k8s-env-group k8s-env-idle">
          <div class="k8s-env-label">Green (v2) — 대기</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-gray">-</div>
            <div class="k8s-pod-icon k8s-pod-gray">-</div>
            <div class="k8s-pod-icon k8s-pod-gray">-</div>
          </div>
        </div>
      </div>
      <div class="k8s-stage-desc">현재 Blue 환경이 트래픽 처리 중</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 2: Green 환경 준비</div>
      <div class="k8s-bluegreen-row">
        <div class="k8s-env-group k8s-env-active">
          <div class="k8s-env-label">Blue (v1) — LIVE</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue">v1</div>
          </div>
        </div>
        <div class="k8s-env-group k8s-env-ready">
          <div class="k8s-env-label">Green (v2) — 준비 완료</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
          </div>
        </div>
      </div>
      <div class="k8s-stage-desc">Green 환경에 v2를 배포하고 테스트</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 3: 트래픽 전환</div>
      <div class="k8s-bluegreen-row">
        <div class="k8s-env-group k8s-env-idle">
          <div class="k8s-env-label">Blue (v1) — 대기</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-blue k8s-pod-dim">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue k8s-pod-dim">v1</div>
            <div class="k8s-pod-icon k8s-pod-blue k8s-pod-dim">v1</div>
          </div>
        </div>
        <div class="k8s-env-group k8s-env-active">
          <div class="k8s-env-label">Green (v2) — LIVE</div>
          <div class="k8s-pods-row">
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
            <div class="k8s-pod-icon k8s-pod-green">v2</div>
          </div>
        </div>
      </div>
      <div class="k8s-stage-desc">Service selector를 변경하여 트래픽을 Green으로 전환</div>
    </div>
  </div>
</div>

### K8s에서 구현 방법

Kubernetes에서 Blue/Green은 **Service의 selector를 전환**하여 구현합니다.

**Step 1: Blue Deployment (현재 운영 중)**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: blue
  template:
    metadata:
      labels:
        app: my-app
        version: blue
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
```

**Step 2: Service — 현재 Blue를 가리킴**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app
    version: blue    # Blue를 가리킴
  ports:
    - port: 80
      targetPort: 8080
```

**Step 3: Green Deployment 배포**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: green
  template:
    metadata:
      labels:
        app: my-app
        version: green
    spec:
      containers:
        - name: my-app
          image: my-app:2.0.0
          ports:
            - containerPort: 8080
```

**Step 4: 트래픽 전환**

```bash
# Service의 selector를 green으로 변경
kubectl patch svc my-app-svc -p '{"spec":{"selector":{"version":"green"}}}'

# 문제 발생 시 즉시 롤백
kubectl patch svc my-app-svc -p '{"spec":{"selector":{"version":"blue"}}}'
```

### 장단점

| 구분 | 내용 |
|------|------|
| **장점** | 즉시 전환/롤백 가능, 다운타임 제로, 전환 전 Green 환경 충분히 테스트 가능 |
| **단점** | 리소스 2배 필요 (두 환경 동시 운영), 데이터베이스 스키마 변경 시 주의 필요 |
| **적합한 경우** | 빠른 롤백이 중요한 서비스, 배포 전 충분한 검증이 필요한 경우 |

---

## 3. Canary 배포

### 개념 설명

**소수의 사용자에게 먼저 새 버전을 노출**하고, 문제가 없으면 점진적으로 확대하는 방식입니다. "탄광의 카나리아"에서 이름이 유래되었습니다 — 위험을 미리 감지하는 역할입니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Canary 배포 과정</div>
  <div class="k8s-deploy-stages">
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 1: Canary 투입 (10%)</div>
      <div class="k8s-canary-row">
        <div class="k8s-traffic-bar">
          <div class="k8s-traffic-old" style="width:90%">90% 트래픽</div>
          <div class="k8s-traffic-new" style="width:10%">10%</div>
        </div>
        <div class="k8s-pods-row">
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
        </div>
      </div>
      <div class="k8s-stage-desc">v2 Pod 1개를 투입하여 에러율, 응답 시간 모니터링</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 2: 확대 (50%)</div>
      <div class="k8s-canary-row">
        <div class="k8s-traffic-bar">
          <div class="k8s-traffic-old" style="width:50%">50% 트래픽</div>
          <div class="k8s-traffic-new" style="width:50%">50%</div>
        </div>
        <div class="k8s-pods-row">
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-old">v1</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
        </div>
      </div>
      <div class="k8s-stage-desc">이상 없으면 v2 비율을 50%로 확대</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Step 3: 전체 전환 (100%)</div>
      <div class="k8s-canary-row">
        <div class="k8s-traffic-bar">
          <div class="k8s-traffic-new" style="width:100%">100% 트래픽</div>
        </div>
        <div class="k8s-pods-row">
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
          <div class="k8s-pod-icon k8s-pod-canary">v2</div>
        </div>
      </div>
      <div class="k8s-stage-desc">모든 트래픽을 v2로 전환 완료</div>
    </div>
  </div>
</div>

### K8s에서 구현 방법 (Replica 비율 조절)

가장 간단한 방식은 **같은 label을 공유하는 두 Deployment의 replica 비율**을 조절하는 것입니다.

**Stable Deployment (v1)**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
spec:
  replicas: 9    # 전체의 90%
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
```

**Canary Deployment (v2)**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
spec:
  replicas: 1    # 전체의 10%
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        version: v2
    spec:
      containers:
        - name: my-app
          image: my-app:2.0.0
```

**Service는 공통 label로 연결**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app    # version label 없이 → 두 Deployment 모두 대상
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Canary 비율 확대: v1 줄이고 v2 늘리기
kubectl scale deployment my-app-stable --replicas=5
kubectl scale deployment my-app-canary --replicas=5

# 전체 전환
kubectl scale deployment my-app-stable --replicas=0
kubectl scale deployment my-app-canary --replicas=10
```

!!! warning "Replica 비율 방식의 한계"
    트래픽 분배가 **Pod 수 비율에 의존**하기 때문에 정밀한 비율 제어가 어렵습니다. 예를 들어 1% Canary를 하려면 100개의 Pod가 필요합니다. 정밀 제어가 필요하면 Service Mesh를 사용합니다.

### Istio / Service Mesh로 고급 Canary

Istio를 사용하면 **Pod 수와 무관하게** 정밀한 트래픽 비율 제어가 가능합니다.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
    - my-app-svc
  http:
    - route:
        - destination:
            host: my-app-svc
            subset: stable
          weight: 95    # 95% → v1
        - destination:
            host: my-app-svc
            subset: canary
          weight: 5     # 5% → v2
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app-svc
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

!!! tip "Argo Rollouts"
    [Argo Rollouts](https://argoproj.github.io/rollouts/)를 사용하면 Canary 배포를 **자동화**할 수 있습니다. 단계별 트래픽 비율, 분석(metrics analysis), 자동 롤백을 선언적으로 정의할 수 있습니다.

---

## 4. A/B 테스팅

A/B 테스팅은 Canary와 유사하지만, **특정 조건의 사용자**에게만 새 버전을 노출합니다. HTTP 헤더, 쿠키, 지역 등의 조건으로 라우팅을 분기합니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">A/B 테스팅 — Ingress 기반 라우팅</div>
  <div class="k8s-deploy-stages">
    <div class="k8s-deploy-stage">
      <div class="k8s-ab-layout">
        <div class="k8s-ab-ingress">
          <div class="k8s-ab-ingress-label">Ingress Controller</div>
          <div class="k8s-ab-rules">
            <div class="k8s-ab-rule">
              <span class="k8s-ab-condition">Header: X-Version = beta</span>
              <span class="k8s-ab-arrow">&#8594;</span>
              <span class="k8s-ab-target k8s-ab-target-new">v2 Service</span>
            </div>
            <div class="k8s-ab-rule">
              <span class="k8s-ab-condition">Default (나머지 전체)</span>
              <span class="k8s-ab-arrow">&#8594;</span>
              <span class="k8s-ab-target k8s-ab-target-old">v1 Service</span>
            </div>
          </div>
        </div>
        <div class="k8s-ab-services">
          <div class="k8s-env-group k8s-env-active">
            <div class="k8s-env-label">v1 Service</div>
            <div class="k8s-pods-row">
              <div class="k8s-pod-icon k8s-pod-old">v1</div>
              <div class="k8s-pod-icon k8s-pod-old">v1</div>
              <div class="k8s-pod-icon k8s-pod-old">v1</div>
            </div>
          </div>
          <div class="k8s-env-group k8s-env-ready">
            <div class="k8s-env-label">v2 Service</div>
            <div class="k8s-pods-row">
              <div class="k8s-pod-icon k8s-pod-new">v2</div>
              <div class="k8s-pod-icon k8s-pod-new">v2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

### Ingress 기반 헤더/쿠키 라우팅

NGINX Ingress Controller의 annotation을 사용하여 구현합니다.

**기본 Ingress (v1)**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-v1
                port:
                  number: 80
```

**Canary Ingress (v2) — 헤더 기반**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Version"
    nginx.ingress.kubernetes.io/canary-by-header-value: "beta"
spec:
  ingressClassName: nginx
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-v2
                port:
                  number: 80
```

**쿠키 기반 라우팅**

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "beta-user"
    # cookie 값이 "always"이면 v2로 라우팅
```

**비율 기반 라우팅**

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"
    # 전체 트래픽의 20%를 v2로 라우팅
```

!!! info "A/B 테스팅 우선순위"
    NGINX Ingress에서 canary annotation의 우선순위는 다음과 같습니다:
    `canary-by-header` > `canary-by-cookie` > `canary-weight`

---

## 5. 배포 전략 비교

| 전략 | 다운타임 | 롤백 속도 | 리소스 비용 | 트래픽 제어 | 적합한 경우 |
|------|----------|-----------|-------------|-------------|-------------|
| **Rolling Update** | 없음 | 보통 | 낮음 | 불가 | 일반적인 배포 |
| **Blue/Green** | 없음 | 즉시 | 2배 | 전체 전환 | 빠른 롤백 필요 |
| **Canary** | 없음 | 빠름 | 약간 추가 | 비율 제어 | 위험 최소화 |
| **A/B 테스팅** | 없음 | 빠름 | 약간 추가 | 조건부 라우팅 | 기능 실험 |

---

## 6. Horizontal Pod Autoscaler (HPA)

배포 전략과 함께 **자동 스케일링**은 운영의 핵심입니다. HPA는 메트릭 기반으로 Pod 수를 자동 조절합니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">HPA 동작 원리</div>
  <div class="k8s-deploy-stages">
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">평상시: CPU 30%</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:30%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:30%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:30%"></div>
        </div>
      </div>
      <div class="k8s-stage-desc">3개 Pod, 평균 CPU 30% — 안정 상태</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">트래픽 급증: CPU 85%</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-warn">
          <div class="k8s-pod-metric" style="height:85%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-warn">
          <div class="k8s-pod-metric" style="height:85%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-warn">
          <div class="k8s-pod-metric" style="height:85%"></div>
        </div>
      </div>
      <div class="k8s-stage-desc">CPU 사용량이 목표(60%)를 초과 — HPA가 Scale-out 결정</div>
    </div>
    <div class="k8s-deploy-stage">
      <div class="k8s-stage-label">Scale-out 완료: CPU 45%</div>
      <div class="k8s-pods-row">
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-healthy">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-new">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-new">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
        <div class="k8s-pod-icon k8s-pod-new">
          <div class="k8s-pod-metric" style="height:45%"></div>
        </div>
      </div>
      <div class="k8s-stage-desc">6개 Pod로 확장 — 부하 분산으로 평균 CPU 45%로 안정화</div>
    </div>
  </div>
</div>

### CPU/Memory 기반 자동 스케일링

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60    # 평균 CPU 60% 유지 목표
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70    # 평균 메모리 70% 유지 목표
```

!!! warning "HPA 사용 시 필수 조건"
    HPA가 동작하려면 반드시 Pod에 **resource requests**가 설정되어 있어야 합니다. 또한 클러스터에 **Metrics Server**가 설치되어 있어야 합니다.

### 커스텀 메트릭

CPU/Memory 외에도 **요청 수(RPS), 큐 길이** 등 비즈니스 메트릭 기반으로 스케일링할 수 있습니다.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa-custom
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 50
  metrics:
    # Prometheus Adapter를 통한 커스텀 메트릭
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"    # Pod당 초당 100 요청 유지 목표
    # 외부 메트릭 (예: SQS 큐 길이)
    - type: External
      external:
        metric:
          name: sqs_queue_length
          selector:
            matchLabels:
              queue: my-app-tasks
        target:
          type: Value
          value: "50"    # 큐 길이가 50 이하가 되도록 스케일
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # 30초간 관찰 후 scale-up
      policies:
        - type: Percent
          value: 50          # 한 번에 최대 50% 증가
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # 5분간 관찰 후 scale-down
      policies:
        - type: Pods
          value: 2           # 한 번에 최대 2개씩 감소
          periodSeconds: 60
```

!!! tip "behavior 설정의 중요성"
    `scaleDown.stabilizationWindowSeconds`를 충분히 설정하지 않으면 트래픽 변동 시 **빈번한 scale-up/down 반복(flapping)**이 발생할 수 있습니다. 보통 scale-down은 5~10분의 안정화 시간을 권장합니다.

### HPA 확인 명령어

```bash
# HPA 상태 확인
kubectl get hpa

# 상세 정보 (현재 메트릭, 이벤트 등)
kubectl describe hpa my-app-hpa

# HPA 이벤트 모니터링
kubectl get events --field-selector involvedObject.name=my-app-hpa
```

---

## 7. 실전 배포 체크리스트

실무에서 안정적인 배포를 위해 반드시 설정해야 할 항목들입니다.

### Health Check (Probe 설정)

Kubernetes는 3가지 Probe로 Pod의 상태를 확인합니다.

| Probe | 역할 | 실패 시 동작 |
|-------|------|-------------|
| **livenessProbe** | Pod가 살아있는지 확인 | Pod 재시작 |
| **readinessProbe** | 트래픽을 받을 준비가 되었는지 확인 | Service에서 제외 |
| **startupProbe** | 초기 기동이 완료되었는지 확인 | 완료 전까지 다른 Probe 비활성화 |

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:2.0.0
      ports:
        - containerPort: 8080
      # 기동 완료 확인 (최대 5분 대기)
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        failureThreshold: 30
        periodSeconds: 10
      # 생존 확인
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 15
        timeoutSeconds: 3
        failureThreshold: 3
      # 트래픽 수신 준비 확인
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 0
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
```

!!! warning "livenessProbe와 readinessProbe를 같은 엔드포인트로 설정하지 마세요"
    readinessProbe 실패 = Service에서 제외(복구 가능), livenessProbe 실패 = Pod 재시작(강제 종료). 일시적인 부하로 응답이 느려진 경우, liveness 실패로 인한 재시작은 상황을 악화시킬 수 있습니다.

### Resource 설정

```yaml
spec:
  containers:
    - name: my-app
      resources:
        requests:
          cpu: "250m"       # 스케줄링 기준 (보장 자원)
          memory: "256Mi"
        limits:
          cpu: "1000m"      # 최대 사용 가능
          memory: "512Mi"   # 초과 시 OOMKill
```

!!! info "requests와 limits의 차이"
    - **requests**: 스케줄러가 노드 배치 시 참고하는 값. 이만큼의 자원은 보장됨
    - **limits**: 컨테이너가 사용할 수 있는 최대치. CPU는 throttle, Memory는 OOMKill

### PodDisruptionBudget (PDB)

노드 유지보수, 클러스터 업그레이드 시 **최소 가용 Pod 수**를 보장합니다.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2    # 항상 최소 2개 이상 유지
  # 또는: maxUnavailable: 1  # 최대 1개까지만 중단 허용
  selector:
    matchLabels:
      app: my-app
```

### Pod Anti-Affinity

Pod를 **다른 노드에 분산 배치**하여 단일 노드 장애 시에도 서비스를 유지합니다.

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - my-app
                topologyKey: kubernetes.io/hostname
```

!!! tip "preferred vs required"
    - `preferredDuringScheduling`: 가능하면 분산 배치 (노드 부족 시 같은 노드에도 배치)
    - `requiredDuringScheduling`: 반드시 분산 배치 (불가능하면 Pod가 Pending 상태)
    - 대부분의 경우 `preferred`를 사용하는 것이 안전합니다.

### Graceful Shutdown

Pod 종료 시 진행 중인 요청을 안전하게 완료합니다.

```yaml
spec:
  terminationGracePeriodSeconds: 60    # 기본 30초 → 60초로 증가
  containers:
    - name: my-app
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"]
            # Service에서 제거되기 전 5초 대기
```

### 모니터링 / 로깅

배포 후 반드시 모니터링해야 할 핵심 지표입니다.

| 항목 | 모니터링 방법 | 경고 기준 (예시) |
|------|---------------|-----------------|
| **에러율** | Prometheus + Grafana | 5xx 비율 > 1% |
| **응답 시간** | Prometheus histogram | p99 > 500ms |
| **Pod 재시작** | `kubectl get pods` / AlertManager | 재시작 횟수 증가 |
| **리소스 사용량** | Metrics Server / Prometheus | CPU > 80%, Memory > 85% |
| **HPA 이벤트** | `kubectl describe hpa` | 빈번한 scale 이벤트 |

```bash
# 배포 후 빠른 상태 확인 스크립트
kubectl rollout status deployment/my-app --timeout=300s

# Pod 상태 확인
kubectl get pods -l app=my-app -o wide

# 최근 이벤트 확인
kubectl get events --sort-by='.lastTimestamp' | head -20

# 로그 확인 (최근 배포된 Pod)
kubectl logs -l app=my-app --tail=100 -f
```

---

## 전체 배포 매니페스트 예시

위의 모든 체크리스트를 반영한 프로덕션 수준의 Deployment 예시입니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  minReadySeconds: 10
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      terminationGracePeriodSeconds: 60
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - my-app
                topologyKey: kubernetes.io/hostname
      containers:
        - name: my-app
          image: my-app:2.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 15
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

---

## 요약

| 배포 체크 항목 | 설정 여부 확인 |
|---------------|---------------|
| Strategy (Rolling / Blue-Green / Canary) | `spec.strategy` |
| Health Check (startup / liveness / readiness) | `spec.containers[].xxxProbe` |
| Resource requests / limits | `spec.containers[].resources` |
| PodDisruptionBudget | 별도 PDB 리소스 |
| Pod Anti-Affinity | `spec.affinity` |
| HPA (자동 스케일링) | 별도 HPA 리소스 |
| Graceful Shutdown | `terminationGracePeriodSeconds` + `preStop` |
| 모니터링 / 알림 | Prometheus + Grafana + AlertManager |

!!! tip "배포는 기술이 아니라 문화"
    좋은 배포 전략은 도구 설정만으로 완성되지 않습니다. **배포 전 체크리스트 확인, 모니터링 대시보드 관찰, 문제 발생 시 빠른 롤백 판단** — 이런 팀 문화가 함께해야 안정적인 서비스 운영이 가능합니다.


<style>
/* ===== K8s Deployment Strategy Diagrams ===== */
.k8s-diagram {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  margin: 1.5em 0;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  background: #1e1e2e;
  color: #cdd6f4;
}

.k8s-diagram-title {
  background: #313244;
  padding: 10px 16px;
  font-weight: bold;
  font-size: 14px;
  color: #89b4fa;
  border-bottom: 1px solid #45475a;
}

.k8s-deploy-stages {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.k8s-deploy-stage {
  background: #313244;
  border-radius: 8px;
  padding: 12px 16px;
  border-left: 3px solid #89b4fa;
}

.k8s-stage-label {
  font-weight: bold;
  color: #89b4fa;
  margin-bottom: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.k8s-stage-desc {
  color: #6c7086;
  font-size: 11px;
  margin-top: 8px;
  font-style: italic;
}

/* ===== Pod Icons ===== */
.k8s-pods-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.k8s-pod-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  transition: all 0.3s ease;
}

.k8s-pod-old {
  background: #585b70;
  color: #cdd6f4;
  border: 2px solid #6c7086;
}

.k8s-pod-new {
  background: #1e3a2f;
  color: #a6e3a1;
  border: 2px solid #a6e3a1;
}

.k8s-pod-canary {
  background: #3a2e1e;
  color: #f9e2af;
  border: 2px solid #f9e2af;
}

.k8s-pod-starting {
  opacity: 0.6;
  border-style: dashed;
}

.k8s-pod-terminating {
  background: #3a1e1e;
  color: #f38ba8;
  border: 2px dashed #f38ba8;
  opacity: 0.5;
}

.k8s-pod-blue {
  background: #1e2a3a;
  color: #89b4fa;
  border: 2px solid #89b4fa;
}

.k8s-pod-green {
  background: #1e3a2f;
  color: #a6e3a1;
  border: 2px solid #a6e3a1;
}

.k8s-pod-gray {
  background: #313244;
  color: #45475a;
  border: 2px dashed #45475a;
}

.k8s-pod-dim {
  opacity: 0.35;
}

.k8s-pod-healthy {
  background: #1e3a2f;
  color: #a6e3a1;
  border: 2px solid #a6e3a1;
  position: relative;
  overflow: hidden;
}

.k8s-pod-warn {
  background: #3a2e1e;
  color: #f9e2af;
  border: 2px solid #f9e2af;
  position: relative;
  overflow: hidden;
}

.k8s-pod-metric {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(166, 227, 161, 0.3);
  transition: height 0.3s;
}

.k8s-pod-warn .k8s-pod-metric {
  background: rgba(249, 226, 175, 0.3);
}

/* ===== Blue/Green Layout ===== */
.k8s-bluegreen-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.k8s-env-group {
  flex: 1;
  min-width: 140px;
  background: #1e1e2e;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.k8s-env-label {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #cdd6f4;
}

.k8s-env-active {
  border: 2px solid #a6e3a1;
}

.k8s-env-active .k8s-env-label {
  color: #a6e3a1;
}

.k8s-env-idle {
  border: 2px dashed #6c7086;
}

.k8s-env-idle .k8s-env-label {
  color: #6c7086;
}

.k8s-env-ready {
  border: 2px solid #f9e2af;
}

.k8s-env-ready .k8s-env-label {
  color: #f9e2af;
}

.k8s-env-group .k8s-pods-row {
  justify-content: center;
}

/* ===== Canary Traffic Bar ===== */
.k8s-canary-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.k8s-traffic-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  font-size: 10px;
  font-weight: bold;
}

.k8s-traffic-old {
  background: #585b70;
  color: #cdd6f4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease;
}

.k8s-traffic-new {
  background: #f9e2af;
  color: #1e1e2e;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease;
}

/* ===== A/B Testing Layout ===== */
.k8s-ab-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.k8s-ab-ingress {
  background: #1e1e2e;
  border: 2px solid #cba6f7;
  border-radius: 8px;
  padding: 12px;
}

.k8s-ab-ingress-label {
  color: #cba6f7;
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 10px;
  text-align: center;
}

.k8s-ab-rules {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.k8s-ab-rule {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 6px 10px;
  background: #313244;
  border-radius: 4px;
}

.k8s-ab-condition {
  color: #f5c0e8;
  flex: 1;
}

.k8s-ab-arrow {
  color: #6c7086;
}

.k8s-ab-target {
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
}

.k8s-ab-target-old {
  background: #585b70;
  color: #cdd6f4;
}

.k8s-ab-target-new {
  background: #1e3a2f;
  color: #a6e3a1;
}

.k8s-ab-services {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .k8s-pod-icon {
    width: 32px;
    height: 32px;
    font-size: 10px;
  }
  .k8s-bluegreen-row,
  .k8s-ab-services {
    flex-direction: column;
  }
  .k8s-ab-rule {
    flex-wrap: wrap;
  }
}
</style>
