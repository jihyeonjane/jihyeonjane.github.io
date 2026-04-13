# 3. Kubernetes 아키텍처

Kubernetes를 효과적으로 운영하려면 내부 구조를 이해해야 합니다. 이 챕터에서는 **클러스터의 전체 구조**, **각 컴포넌트의 역할**, **핵심 오브젝트**, 그리고 **선언형 모델**까지 깊이 있게 다룹니다.

---

## 1. 클러스터 전체 구조

Kubernetes 클러스터는 크게 **Control Plane(제어 평면)**과 **Worker Node(작업 노드)** 두 영역으로 나뉩니다.

- **Control Plane**: 클러스터의 "두뇌" 역할. 전체 상태를 관리하고 의사결정을 내림
- **Worker Node**: 실제 컨테이너(Pod)가 실행되는 "일꾼" 서버

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Control Plane                          │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌────────────┐  ┌────────────────┐   │   │
│  │  │kube-apiserver│  │   etcd     │  │kube-scheduler  │   │   │
│  │  │  (API 관문)   │  │ (상태 저장) │  │  (Pod 배치)    │   │   │
│  │  └──────┬───────┘  └────────────┘  └────────────────┘   │   │
│  │         │                                                │   │
│  │  ┌──────┴─────────────┐  ┌──────────────────────────┐   │   │
│  │  │kube-controller-mgr │  │cloud-controller-manager  │   │   │
│  │  │  (상태 조정)        │  │  (클라우드 연동)          │   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Worker Node 1│  │ Worker Node 2│  │ Worker Node 3│          │
│  │              │  │              │  │              │          │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │          │
│  │ │ kubelet  │ │  │ │ kubelet  │ │  │ │ kubelet  │ │          │
│  │ ├──────────┤ │  │ ├──────────┤ │  │ ├──────────┤ │          │
│  │ │kube-proxy│ │  │ │kube-proxy│ │  │ │kube-proxy│ │          │
│  │ ├──────────┤ │  │ ├──────────┤ │  │ ├──────────┤ │          │
│  │ │container │ │  │ │container │ │  │ │container │ │          │
│  │ │ runtime  │ │  │ │ runtime  │ │  │ │ runtime  │ │          │
│  │ ├──────────┤ │  │ ├──────────┤ │  │ ├──────────┤ │          │
│  │ │ Pod  Pod │ │  │ │ Pod  Pod │ │  │ │ Pod  Pod │ │          │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

!!! info "비유로 이해하기"
    **Control Plane** = 회사 본사 (경영진, 인사팀, 전략기획팀)
    **Worker Node** = 현장 공장 (실제 제품을 만드는 곳)
    **kube-apiserver** = 본사 접수 창구 (모든 요청은 여기를 거침)
    **etcd** = 본사 금고 (모든 중요 문서 보관)
    **kubelet** = 현장 관리자 (본사 지시를 받아 공장 운영)

### Control Plane과 Worker Node 비교

| 구분 | Control Plane | Worker Node |
|------|--------------|-------------|
| **역할** | 클러스터 관리 및 의사결정 | 실제 워크로드 실행 |
| **주요 컴포넌트** | apiserver, etcd, scheduler, controller-manager | kubelet, kube-proxy, container runtime |
| **장애 시 영향** | 새로운 배포/스케일링 불가 (기존 Pod는 유지) | 해당 노드의 Pod 중단 |
| **일반적인 수량** | 3대 (HA 구성) | 수십~수천 대 |
| **리소스 특성** | CPU/메모리 적당, 디스크 I/O 중요 (etcd) | CPU/메모리/GPU 등 워크로드에 따라 다양 |

---

## 2. Control Plane 컴포넌트 상세

Control Plane은 클러스터의 중앙 제어 시스템입니다. 각 컴포넌트가 협력하여 클러스터의 상태를 원하는 상태(Desired State)로 유지합니다.

### 2.1 kube-apiserver

**kube-apiserver**는 Kubernetes의 **중앙 API 게이트웨이**입니다. 클러스터와 통신하려는 모든 요청은 반드시 apiserver를 거쳐야 합니다.

```
사용자/kubectl ──▶ kube-apiserver ──▶ etcd
    │                    ▲
    │                    │
kubelet ────────────────┘
scheduler ──────────────┘
controller-manager ─────┘
```

**주요 역할:**

1. **RESTful API 제공**: 모든 Kubernetes 리소스에 대한 CRUD 엔드포인트
2. **인증(Authentication)**: 요청자가 누구인지 확인 (인증서, 토큰, OIDC 등)
3. **인가(Authorization)**: 요청자가 해당 작업을 할 수 있는지 확인 (RBAC)
4. **Admission Control**: 요청이 적절한지 검증 및 변환 (Webhook, 리소스 제한 등)
5. **etcd와의 유일한 통신 경로**: 다른 컴포넌트는 etcd에 직접 접근하지 않음

```bash
# kubectl이 API Server에 요청하는 과정 확인
kubectl get pods -v=6
# -v=6 옵션을 주면 실제 API 호출 URL과 응답 코드가 출력됨

# 직접 API Server에 REST 호출
kubectl proxy &
curl http://localhost:8001/api/v1/namespaces/default/pods
```

!!! tip "인증/인가 흐름"
    모든 API 요청은 다음 3단계를 순서대로 거칩니다:

    1. **Authentication** (인증) — "너 누구야?" → X.509 인증서, Bearer Token, OIDC
    2. **Authorization** (인가) — "이 작업 할 수 있어?" → RBAC, ABAC, Webhook
    3. **Admission Control** (승인 제어) — "요청 내용이 적절해?" → Mutating/Validating Webhook

```
API 요청 흐름:

kubectl apply -f deployment.yaml
        │
        ▼
┌─────────────────┐
│  Authentication  │ ← 인증서/토큰으로 사용자 확인
├─────────────────┤
│  Authorization   │ ← RBAC으로 권한 확인
├─────────────────┤
│ Admission Control│ ← 리소스 제한, 기본값 주입
├─────────────────┤
│  Validation      │ ← 스키마 유효성 검증
├─────────────────┤
│   etcd 저장      │ ← 최종 상태 저장
└─────────────────┘
```

### 2.2 etcd

**etcd**는 분산 키-값 저장소로, 클러스터의 **모든 상태 정보를 저장**합니다. Kubernetes의 "뇌"이자 "기억 장치"입니다.

**저장하는 정보:**

- 모든 Kubernetes 오브젝트 (Pod, Service, Deployment 등)
- 클러스터 설정 정보
- Secret, ConfigMap 데이터
- RBAC 정책
- 리스 정보 (Leader Election)

| 특성 | 설명 |
|------|------|
| **합의 알고리즘** | Raft 프로토콜 사용 (분산 합의) |
| **일관성** | Strong Consistency (강한 일관성) |
| **권장 노드 수** | 3 또는 5 (홀수 — 과반수 투표를 위해) |
| **장애 허용** | 3노드일 때 1대 장애, 5노드일 때 2대 장애까지 허용 |
| **데이터 포맷** | protobuf (바이너리 직렬화) |
| **접근 방식** | kube-apiserver만 접근 가능 |

!!! danger "etcd 장애 = 클러스터 장애"
    etcd가 완전히 중단되면 Kubernetes는 새로운 리소스를 생성하거나 기존 리소스를 수정할 수 없습니다. 프로덕션 환경에서는 반드시 **다중 노드 구성 + 정기 백업**을 해야 합니다.

```bash
# etcd 상태 확인 (클러스터 내부에서)
etcdctl endpoint status --write-out=table

# etcd에 저장된 키 목록 조회 (디버깅용)
etcdctl get /registry --prefix --keys-only | head -20

# etcd 스냅샷 백업
etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d).db
```

```
etcd Raft 합의 과정 (3노드):

  Client ──▶ Leader
               │
      ┌────────┼────────┐
      ▼        ▼        ▼
   etcd-1   etcd-2   etcd-3
   (Leader) (Follower)(Follower)
      │        │        │
      └── 2/3 동의 ──────┘
               │
          Commit 확정
```

### 2.3 kube-scheduler

**kube-scheduler**는 새로 생성된 Pod를 **어떤 Worker Node에 배치할지 결정**하는 컴포넌트입니다. Pod를 직접 실행하지는 않고, 배치할 노드만 결정합니다.

**스케줄링 과정:**

```
새 Pod 생성 (nodeName 미지정)
        │
        ▼
┌─────────────────────┐
│  1. Filtering (필터링) │ ← 부적합한 노드 제외
│  - 리소스 부족?       │
│  - taint/toleration? │
│  - nodeSelector?     │
│  - affinity 규칙?    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  2. Scoring (점수제)  │ ← 남은 노드에 점수 부여
│  - 리소스 균형 배분    │
│  - 이미지 캐시 존재?   │
│  - affinity 선호도?   │
│  - Pod 분산 배치?     │
└──────────┬──────────┘
           ▼
   최고 점수 노드에 바인딩
```

**Filtering 단계에서 확인하는 항목:**

| 필터 | 설명 |
|------|------|
| `PodFitsResources` | 노드에 요청한 CPU/메모리가 충분한가? |
| `PodFitsHostPorts` | 요청한 호스트 포트가 사용 가능한가? |
| `PodMatchNodeSelector` | nodeSelector 라벨과 일치하는가? |
| `PodToleratesNodeTaints` | 노드의 taint를 toleration하는가? |
| `CheckNodeUnschedulable` | 노드가 스케줄 가능 상태인가? |
| `PodAffinityFilter` | Pod affinity/anti-affinity 규칙을 만족하는가? |

!!! tip "스케줄러는 결정만 내린다"
    kube-scheduler는 "이 Pod는 Node-2에 배치한다"는 결정만 내리고 etcd에 기록합니다. 실제로 Pod를 실행하는 것은 해당 Node의 **kubelet**입니다.

### 2.4 kube-controller-manager

**kube-controller-manager**는 다양한 **컨트롤러**를 하나의 프로세스로 묶어 실행하는 컴포넌트입니다. 각 컨트롤러는 **Desired State(원하는 상태)**와 **Current State(현재 상태)**를 비교하여 차이를 조정합니다.

**주요 컨트롤러 목록:**

| 컨트롤러 | 역할 |
|----------|------|
| **ReplicaSet Controller** | 지정된 수의 Pod 복제본 유지 |
| **Deployment Controller** | 롤링 업데이트, 롤백 관리 |
| **Node Controller** | 노드 상태 모니터링, 응답 없는 노드 처리 |
| **Job Controller** | 일회성 작업(Job) 완료까지 관리 |
| **EndpointSlice Controller** | Service와 Pod 연결 정보 관리 |
| **ServiceAccount Controller** | 네임스페이스에 기본 ServiceAccount 생성 |
| **Namespace Controller** | 삭제된 네임스페이스의 리소스 정리 |

```
Deployment Controller 동작 예시:

  [Desired State]          [Current State]
   replicas: 3              running pods: 2
        │                         │
        └────── 비교 ──────────────┘
                 │
            차이 발견! (1개 부족)
                 │
                 ▼
        API Server에 Pod 생성 요청
                 │
                 ▼
        Scheduler가 노드 배정
                 │
                 ▼
        kubelet이 Pod 실행
                 │
                 ▼
        [Current State] → running pods: 3 ✓
```

!!! info "컨트롤러 패턴"
    모든 컨트롤러는 동일한 패턴을 따릅니다:

    1. **Watch**: API Server에서 관련 리소스의 변경 이벤트를 감시
    2. **Diff**: Desired State와 Current State를 비교
    3. **Act**: 차이가 있으면 상태를 맞추기 위한 액션 실행

    이 패턴을 **Reconciliation Loop(조정 루프)**라고 합니다.

### 2.5 cloud-controller-manager

**cloud-controller-manager(CCM)**는 Kubernetes를 **클라우드 프로바이더(AWS, GCP, Azure 등)**와 연동하는 컴포넌트입니다.

```
cloud-controller-manager
        │
        ├── Node Controller
        │   └── 클라우드 인스턴스 상태 확인, 삭제된 VM 감지
        │
        ├── Route Controller
        │   └── 클라우드 네트워크에 Pod CIDR 라우트 설정
        │
        └── Service Controller
            └── type: LoadBalancer 서비스 → 클라우드 LB 생성/삭제
```

| 클라우드 | CCM 프로바이더 | 주요 연동 |
|----------|---------------|----------|
| AWS | aws-cloud-controller-manager | EC2, ELB, VPC |
| GCP | gce-cloud-provider | GCE, Cloud Load Balancing |
| Azure | cloud-provider-azure | Azure VM, Azure LB |

!!! warning "온프레미스 환경에서는?"
    자체 데이터센터(온프레미스)에서는 cloud-controller-manager가 필요 없습니다. 대신 MetalLB 같은 도구로 LoadBalancer 기능을 대체하거나, NodePort/Ingress를 사용합니다.

---

## 3. Worker Node 컴포넌트 상세

Worker Node는 실제 애플리케이션 컨테이너가 실행되는 서버입니다. 각 Worker Node에는 3가지 핵심 컴포넌트가 실행됩니다.

### 3.1 kubelet

**kubelet**은 각 Worker Node에서 실행되는 **에이전트**입니다. Control Plane의 지시를 받아 Pod를 실제로 실행하고 관리합니다.

**주요 역할:**

1. **API Server와 통신**: 자신의 노드에 배정된 Pod 목록을 감시
2. **Pod 실행**: Container Runtime에 컨테이너 생성/삭제 지시
3. **상태 보고**: Pod와 Node의 상태를 API Server에 주기적으로 보고
4. **Liveness/Readiness Probe**: 컨테이너 헬스체크 실행
5. **리소스 모니터링**: CPU, 메모리, 디스크 사용량 추적

```
kubelet 동작 흐름:

API Server ──(이 노드에 Pod-A 배정)──▶ kubelet
                                         │
                                         ▼
                               Container Runtime에
                               컨테이너 생성 요청
                                         │
                                         ▼
                               컨테이너 실행 확인
                                         │
                                         ▼
                            API Server에 상태 보고
                            "Pod-A: Running ✓"
```

```bash
# kubelet 상태 확인
systemctl status kubelet

# kubelet 로그 확인
journalctl -u kubelet -f

# 노드의 kubelet이 보고하는 정보 확인
kubectl describe node <node-name>
```

!!! tip "kubelet은 Kubernetes 컴포넌트 중 유일하게 컨테이너가 아닌 시스템 프로세스로 실행됩니다"
    다른 Control Plane 컴포넌트(apiserver, scheduler 등)는 Static Pod로 실행될 수 있지만, kubelet 자체는 각 노드의 systemd 서비스로 동작합니다. kubelet이 없으면 컨테이너를 실행할 수 없기 때문입니다.

### 3.2 kube-proxy

**kube-proxy**는 각 노드에서 **네트워크 규칙을 관리**하는 컴포넌트입니다. Service 오브젝트를 기반으로 Pod 간 네트워크 트래픽을 라우팅합니다.

**동작 모드:**

| 모드 | 설명 | 성능 |
|------|------|------|
| **iptables** (기본) | iptables 규칙으로 패킷 라우팅 | Service/Pod 수가 많으면 느려짐 |
| **IPVS** | Linux IPVS(커널 레벨 L4 LB)로 라우팅 | 대규모 클러스터에 적합, 다양한 LB 알고리즘 지원 |
| **nftables** | nftables 기반 (K8s 1.29+) | iptables 대체, 더 나은 성능 |

```
Service → Pod 라우팅 예시 (iptables 모드):

Client Request
     │
     ▼
Service (ClusterIP: 10.96.0.1:80)
     │
     │  kube-proxy가 설정한 iptables 규칙에 따라
     │  랜덤하게 하나의 Pod로 전달
     │
     ├──▶ Pod-1 (10.244.1.5:8080)   ← 33%
     ├──▶ Pod-2 (10.244.2.8:8080)   ← 33%
     └──▶ Pod-3 (10.244.3.2:8080)   ← 33%
```

!!! info "kube-proxy 없이도 가능하다?"
    Cilium 같은 eBPF 기반 CNI 플러그인을 사용하면 kube-proxy 없이 커널 레벨에서 직접 라우팅을 처리할 수 있습니다. 이를 **kube-proxy replacement** 모드라고 합니다. 대규모 클러스터에서 성능 이점이 있습니다.

### 3.3 Container Runtime

**Container Runtime**은 실제로 **컨테이너를 생성하고 실행**하는 소프트웨어입니다. kubelet은 CRI(Container Runtime Interface)를 통해 Container Runtime과 통신합니다.

```
kubelet ──(CRI gRPC)──▶ Container Runtime ──▶ 컨테이너 실행
```

**주요 Container Runtime 비교:**

| Runtime | 설명 | 특징 |
|---------|------|------|
| **containerd** | Docker에서 분리된 경량 런타임 | 가장 널리 사용, CNCF 졸업 프로젝트 |
| **CRI-O** | Kubernetes 전용으로 설계된 런타임 | OCI 표준 준수, Red Hat/OpenShift 기본 |
| **Docker Engine** | dockershim 제거로 K8s 1.24부터 직접 사용 불가 | containerd를 내부적으로 사용 |

```
CRI 아키텍처:

kubelet
   │
   │ CRI (gRPC)
   ▼
containerd (또는 CRI-O)
   │
   │ OCI Runtime Spec
   ▼
runc (저수준 런타임)
   │
   ▼
Linux 컨테이너 (namespace, cgroups)
```

!!! warning "Docker는 더 이상 직접 지원되지 않는다"
    Kubernetes 1.24부터 dockershim이 제거되었습니다. 하지만 Docker로 빌드한 이미지는 OCI 표준을 따르므로 **containerd, CRI-O 어디에서든 실행 가능**합니다. "Docker 지원 중단"은 런타임 인터페이스 이야기이지, Docker 이미지가 못 쓰게 된 것이 아닙니다.

---

## 4. 인터랙티브 아키텍처 다이어그램

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Kubernetes 클러스터 아키텍처</div>
  <div class="k8s-arch-grid">
    <div class="k8s-arch-section k8s-control-plane">
      <div class="k8s-section-label">Control Plane</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔌</div>
          <div class="k8s-comp-name">kube-apiserver</div>
          <div class="k8s-comp-desc">API 게이트웨이<br>인증 / 인가 / 승인 제어</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🧠</div>
          <div class="k8s-comp-name">etcd</div>
          <div class="k8s-comp-desc">분산 키-값 저장소<br>클러스터 상태의 "뇌"</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📋</div>
          <div class="k8s-comp-name">kube-scheduler</div>
          <div class="k8s-comp-desc">Pod 배치 결정<br>Filtering → Scoring</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🔄</div>
          <div class="k8s-comp-name">controller-manager</div>
          <div class="k8s-comp-desc">상태 조정 (Reconciliation)<br>ReplicaSet / Deployment / Node</div>
        </div>
        <div class="k8s-component k8s-comp-cloud">
          <div class="k8s-comp-icon">☁️</div>
          <div class="k8s-comp-name">cloud-controller-mgr</div>
          <div class="k8s-comp-desc">클라우드 프로바이더 연동<br>LB / Route / Node</div>
        </div>
      </div>
    </div>
    <div class="k8s-arch-arrow">
      <div class="k8s-arrow-line">▼ &nbsp; kubelet이 API Server를 Watch &nbsp; ▼</div>
    </div>
    <div class="k8s-arch-section k8s-worker-node">
      <div class="k8s-section-label">Worker Node 1</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🤖</div>
          <div class="k8s-comp-name">kubelet</div>
          <div class="k8s-comp-desc">노드 에이전트<br>Pod 실행 / 상태 보고</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🌐</div>
          <div class="k8s-comp-name">kube-proxy</div>
          <div class="k8s-comp-desc">네트워크 규칙 관리<br>Service → Pod 라우팅</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📦</div>
          <div class="k8s-comp-name">containerd</div>
          <div class="k8s-comp-desc">컨테이너 런타임<br>OCI 표준 준수</div>
        </div>
      </div>
      <div class="k8s-pods-area">
        <div class="k8s-pod">Pod A</div>
        <div class="k8s-pod">Pod B</div>
        <div class="k8s-pod">Pod C</div>
      </div>
    </div>
    <div class="k8s-arch-section k8s-worker-node">
      <div class="k8s-section-label">Worker Node 2</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">🤖</div>
          <div class="k8s-comp-name">kubelet</div>
          <div class="k8s-comp-desc">노드 에이전트</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🌐</div>
          <div class="k8s-comp-name">kube-proxy</div>
          <div class="k8s-comp-desc">네트워크 규칙 관리</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">📦</div>
          <div class="k8s-comp-name">containerd</div>
          <div class="k8s-comp-desc">컨테이너 런타임</div>
        </div>
      </div>
      <div class="k8s-pods-area">
        <div class="k8s-pod">Pod D</div>
        <div class="k8s-pod">Pod E</div>
      </div>
    </div>
    <div class="k8s-arch-section k8s-external">
      <div class="k8s-section-label">외부 접근</div>
      <div class="k8s-components-row">
        <div class="k8s-component">
          <div class="k8s-comp-icon">👤</div>
          <div class="k8s-comp-name">kubectl</div>
          <div class="k8s-comp-desc">CLI 도구 → API Server</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">🖥️</div>
          <div class="k8s-comp-name">Dashboard</div>
          <div class="k8s-comp-desc">웹 UI → API Server</div>
        </div>
        <div class="k8s-component">
          <div class="k8s-comp-icon">⚙️</div>
          <div class="k8s-comp-name">CI/CD</div>
          <div class="k8s-comp-desc">자동화 파이프라인 → API Server</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
/* K8s Architecture Diagram — Catppuccin Mocha */
.k8s-diagram {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  margin: 1.5em 0;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  background: #1e1e2e;
}
.k8s-diagram-title {
  background: #313244;
  color: #cdd6f4;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: bold;
  border-bottom: 1px solid #45475a;
}
.k8s-arch-grid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.k8s-arch-section {
  border-radius: 8px;
  padding: 12px;
}
.k8s-control-plane {
  background: rgba(137, 180, 250, 0.08);
  border: 1px solid rgba(137, 180, 250, 0.3);
}
.k8s-worker-node {
  background: rgba(166, 227, 161, 0.08);
  border: 1px solid rgba(166, 227, 161, 0.3);
}
.k8s-external {
  background: rgba(249, 226, 175, 0.08);
  border: 1px solid rgba(249, 226, 175, 0.3);
}
.k8s-section-label {
  color: #cdd6f4;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #45475a;
}
.k8s-control-plane .k8s-section-label { color: #89b4fa; }
.k8s-worker-node .k8s-section-label { color: #a6e3a1; }
.k8s-external .k8s-section-label { color: #f9e2af; }
.k8s-components-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.k8s-component {
  background: #313244;
  border-radius: 6px;
  padding: 10px;
  flex: 1;
  min-width: 140px;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}
.k8s-component:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border-color: #89b4fa;
}
.k8s-comp-cloud {
  opacity: 0.7;
  border: 1px dashed #6c7086;
}
.k8s-comp-icon {
  font-size: 20px;
  margin-bottom: 4px;
}
.k8s-comp-name {
  color: #cdd6f4;
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 4px;
}
.k8s-comp-desc {
  color: #6c7086;
  font-size: 10px;
  line-height: 1.4;
}
.k8s-arch-arrow {
  text-align: center;
  padding: 4px 0;
}
.k8s-arrow-line {
  color: #6c7086;
  font-size: 11px;
}
.k8s-pods-area {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #45475a;
}
.k8s-pod {
  background: #45475a;
  color: #cdd6f4;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 10px;
  border-left: 3px solid #cba6f7;
}
</style>

---

## 5. 핵심 오브젝트 개요

Kubernetes의 모든 것은 **오브젝트(Object)**로 표현됩니다. 각 오브젝트는 YAML 또는 JSON으로 정의되며, API Server를 통해 etcd에 저장됩니다.

### 5.1 Pod

**Pod**는 Kubernetes에서 **배포 가능한 가장 작은 단위**입니다.

- 하나 이상의 컨테이너를 포함
- 같은 Pod 내 컨테이너는 네트워크(IP)와 스토리지를 공유
- 일반적으로 하나의 Pod에 하나의 메인 컨테이너 (사이드카 패턴 제외)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  labels:
    app: web
spec:
  containers:
    - name: web
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

### 5.2 ReplicaSet

**ReplicaSet**은 지정된 수의 **Pod 복제본(replica)을 항상 유지**합니다.

- Pod가 삭제되면 자동으로 새 Pod를 생성
- Pod가 초과되면 자동으로 제거
- 직접 사용하기보다 Deployment를 통해 간접적으로 사용

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-app-rs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.25
```

### 5.3 Deployment

**Deployment**는 ReplicaSet을 관리하며 **롤링 업데이트와 롤백**을 지원합니다. 실무에서 가장 많이 사용하는 오브젝트입니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 업데이트 중 최대 추가 Pod 수
      maxUnavailable: 0   # 업데이트 중 최소 가용 Pod 보장
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.25
```

```bash
# 롤링 업데이트 (이미지 변경)
kubectl set image deployment/my-app web=nginx:1.26

# 업데이트 상태 확인
kubectl rollout status deployment/my-app

# 롤백
kubectl rollout undo deployment/my-app

# 히스토리 확인
kubectl rollout history deployment/my-app
```

### 5.4 Service

**Service**는 Pod 집합에 대한 **안정적인 네트워크 엔드포인트**를 제공합니다. Pod는 언제든 생성/삭제될 수 있지만, Service의 IP와 DNS는 유지됩니다.

| 타입 | 설명 | 접근 범위 |
|------|------|----------|
| **ClusterIP** (기본) | 클러스터 내부 IP 할당 | 클러스터 내부만 |
| **NodePort** | 각 노드의 고정 포트 개방 | 외부 접근 가능 (노드IP:포트) |
| **LoadBalancer** | 클라우드 LB 연동 | 외부 접근 가능 (LB IP) |
| **ExternalName** | 외부 DNS를 CNAME으로 매핑 | DNS 레벨 리다이렉트 |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  type: ClusterIP
  selector:
    app: web          # 이 라벨을 가진 Pod들로 트래픽 전달
  ports:
    - port: 80        # Service 포트
      targetPort: 8080 # Pod 컨테이너 포트
```

### 5.5 Namespace

**Namespace**는 하나의 클러스터를 **논리적으로 분리**하는 가상 클러스터입니다.

- 팀별, 환경별(dev/staging/prod) 리소스 격리
- 리소스 할당량(ResourceQuota) 설정 가능
- 네트워크 정책(NetworkPolicy)으로 Namespace 간 통신 제어

```bash
# Namespace 목록
kubectl get namespaces

# 기본 제공 Namespace
# default         — 별도 지정 없으면 여기에 생성
# kube-system     — K8s 시스템 컴포넌트
# kube-public     — 공개 리소스 (보통 비어있음)
# kube-node-lease — 노드 Heartbeat 정보
```

### 오브젝트 간 관계

```
Namespace
 └── Deployment
      └── ReplicaSet
           └── Pod (x N)
                └── Container (x M)

Service ──(label selector)──▶ Pod 집합에 트래픽 전달

Ingress ──▶ Service ──▶ Pod
```

| 오브젝트 | 관리 대상 | 핵심 기능 |
|----------|----------|----------|
| **Pod** | 컨테이너 | 실행 단위 |
| **ReplicaSet** | Pod | 복제본 수 유지 |
| **Deployment** | ReplicaSet | 롤링 업데이트, 롤백 |
| **Service** | Pod 집합 | 안정적 네트워크 접근 |
| **Namespace** | 모든 리소스 | 논리적 격리 |

---

## 6. K8s API와 선언형 모델

Kubernetes의 가장 중요한 철학은 **선언형(Declarative) 모델**입니다. "어떻게(How) 해라"가 아니라 "어떤 상태(What)여야 한다"를 선언합니다.

### 6.1 Desired State vs Current State

```
┌────────────────────────┐      ┌────────────────────────┐
│     Desired State      │      │     Current State      │
│   (원하는 상태)         │      │   (현재 상태)           │
│                        │      │                        │
│  replicas: 3           │      │  running pods: 2       │
│  image: nginx:1.26     │      │  image: nginx:1.25     │
│  cpu: 500m             │      │  cpu: 500m             │
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
            └──────── 비교 (Diff) ───────────┘
                         │
                         ▼
              Controller가 차이를 감지하고
              Current State를 Desired State에 맞춤
```

**명령형(Imperative) vs 선언형(Declarative):**

| 방식 | 명령 예시 | 특징 |
|------|----------|------|
| **명령형** | `kubectl run nginx --image=nginx` | "이걸 실행해라" — 한 번 실행, 상태 추적 안 됨 |
| **명령형 오브젝트** | `kubectl create -f pod.yaml` | "이 파일로 만들어라" — 이미 있으면 에러 |
| **선언형** | `kubectl apply -f pod.yaml` | "이 상태여야 한다" — 없으면 생성, 있으면 업데이트 |

!!! tip "프로덕션에서는 항상 선언형을 사용하세요"
    `kubectl apply -f`는 **멱등성(idempotent)**을 보장합니다. 같은 명령을 여러 번 실행해도 결과가 동일합니다. GitOps 방식에서는 Git 저장소에 YAML 파일을 관리하고, ArgoCD나 Flux 같은 도구가 자동으로 `apply`합니다.

### 6.2 Reconciliation Loop (조정 루프)

**Reconciliation Loop**는 Kubernetes의 핵심 동작 원리입니다. 모든 컨트롤러는 끊임없이 다음 루프를 반복합니다:

```
          ┌──────────────────────────────────┐
          │                                  │
          ▼                                  │
   ┌──────────────┐                          │
   │   Observe    │  현재 상태 관찰           │
   │  (관찰)       │  (API Server Watch)      │
   └──────┬───────┘                          │
          │                                  │
          ▼                                  │
   ┌──────────────┐                          │
   │    Diff      │  Desired vs Current      │
   │  (비교)       │  차이점 분석              │
   └──────┬───────┘                          │
          │                                  │
          ▼                                  │
   ┌──────────────┐                          │
   │    Act       │  차이를 해소하는 액션      │
   │  (실행)       │  (Pod 생성/삭제/업데이트)  │
   └──────┬───────┘                          │
          │                                  │
          └──────────────────────────────────┘
              무한 반복 (Level-triggered)
```

**실제 예시 - Deployment replicas 변경:**

```bash
# 1. Desired State 변경
kubectl scale deployment/my-app --replicas=5

# 2. 내부에서 일어나는 일:
#    Deployment Controller: "replicas가 3→5로 바뀌었다"
#    → ReplicaSet Controller에 Pod 2개 추가 요청
#    → Scheduler: 새 Pod 2개를 적절한 노드에 배정
#    → kubelet: 배정된 노드에서 컨테이너 생성
#    → Current State가 Desired State와 일치할 때까지 반복
```

!!! info "Level-triggered vs Edge-triggered"
    Kubernetes 컨트롤러는 **Level-triggered** 방식입니다. "이벤트가 발생했을 때" 반응하는 것이 아니라, "현재 상태가 원하는 상태와 다른 동안 계속" 반응합니다. 컨트롤러가 잠시 다운되었다가 복구되어도, 현재 상태를 다시 확인하고 차이를 조정합니다. 이벤트를 놓칠 걱정이 없습니다.

### 6.3 kubectl이 API Server와 통신하는 과정

`kubectl`은 사용자의 명령을 REST API 호출로 변환하여 API Server에 전달합니다.

```
kubectl apply -f deployment.yaml
        │
        │ 1. kubeconfig 파일에서 클러스터/인증 정보 로드
        │    (~/.kube/config)
        ▼
   ┌─────────────┐
   │  kubectl    │
   │  CLI 도구    │
   └──────┬──────┘
          │
          │ 2. YAML → JSON 변환
          │ 3. HTTPS REST API 호출
          │    POST /apis/apps/v1/namespaces/default/deployments
          ▼
   ┌─────────────┐
   │kube-apiserver│
   │              │──▶ 4. 인증 → 인가 → Admission → 검증
   └──────┬───────┘
          │
          │ 5. etcd에 오브젝트 저장
          ▼
   ┌─────────────┐
   │    etcd     │
   └─────────────┘
          │
          │ 6. Watch 이벤트 발생
          ▼
   Controller/Scheduler/kubelet이 감지 → 실행
```

```bash
# kubeconfig 확인
kubectl config view

# API 리소스 목록 확인
kubectl api-resources

# 특정 리소스의 API 버전 확인
kubectl api-versions

# API 호출 상세 로그 (-v 레벨: 0~9)
kubectl get pods -v=8
# v=6: API URL과 응답 코드
# v=7: + 요청 헤더
# v=8: + 요청/응답 본문
# v=9: + curl 명령어
```

**kubeconfig 구조:**

```yaml
apiVersion: v1
kind: Config
clusters:
  - name: my-cluster
    cluster:
      server: https://192.168.1.100:6443
      certificate-authority: /path/to/ca.crt
users:
  - name: admin
    user:
      client-certificate: /path/to/admin.crt
      client-key: /path/to/admin.key
contexts:
  - name: my-context
    context:
      cluster: my-cluster
      user: admin
      namespace: default
current-context: my-context
```

---

## 7. 전체 흐름: Pod가 생성되기까지

지금까지 배운 모든 컴포넌트가 어떻게 협력하는지, `kubectl apply`부터 Pod 실행까지의 전체 과정을 따라가 봅시다.

```
사용자: kubectl apply -f deployment.yaml (replicas: 3)
  │
  ▼
① kube-apiserver
   - 인증/인가/Admission 통과
   - Deployment 오브젝트를 etcd에 저장
  │
  ▼
② Deployment Controller (kube-controller-manager 내부)
   - 새 Deployment 감지
   - ReplicaSet 오브젝트 생성 → API Server → etcd 저장
  │
  ▼
③ ReplicaSet Controller (kube-controller-manager 내부)
   - 새 ReplicaSet 감지
   - Pod 3개 생성 요청 → API Server → etcd 저장
   - 이때 Pod의 nodeName은 비어 있음 (Pending 상태)
  │
  ▼
④ kube-scheduler
   - nodeName이 비어있는 Pod 감지
   - Filtering → Scoring → 최적 노드 선택
   - Pod의 nodeName 필드를 업데이트 → API Server → etcd 저장
  │
  ▼
⑤ kubelet (해당 Worker Node)
   - 자기 노드에 배정된 새 Pod 감지
   - Container Runtime(containerd)에 컨테이너 생성 지시
   - 컨테이너 실행 확인 후 상태 보고 → API Server → etcd 저장
   - Pod 상태: Pending → ContainerCreating → Running
  │
  ▼
⑥ kube-proxy
   - Service가 있다면 iptables/IPVS 규칙 업데이트
   - 트래픽이 새 Pod로도 라우팅되도록 설정
```

!!! tip "모든 통신은 API Server를 거친다"
    위 과정에서 컴포넌트 간 직접 통신은 없습니다. 모든 상태 변경은 **API Server → etcd** 경로를 거치고, 다른 컴포넌트는 **API Server의 Watch 메커니즘**으로 변경을 감지합니다. 이 설계 덕분에 각 컴포넌트를 독립적으로 확장하거나 교체할 수 있습니다.

---

## 정리

| 영역 | 컴포넌트 | 한 줄 요약 |
|------|----------|-----------|
| **Control Plane** | kube-apiserver | 모든 요청의 관문, 인증/인가/Admission 처리 |
| | etcd | 클러스터 상태 저장소 (Raft 합의, 강한 일관성) |
| | kube-scheduler | Pod를 적절한 노드에 배치 (Filtering → Scoring) |
| | kube-controller-manager | Desired State를 유지하는 조정 루프 실행 |
| | cloud-controller-manager | 클라우드 리소스(LB, Route) 연동 |
| **Worker Node** | kubelet | 노드 에이전트, Pod 실행 및 상태 보고 |
| | kube-proxy | Service → Pod 네트워크 라우팅 |
| | Container Runtime | 컨테이너 실행 (containerd, CRI-O) |
| **핵심 개념** | 선언형 모델 | "어떻게" 대신 "어떤 상태여야 한다"를 선언 |
| | Reconciliation Loop | 현재 상태를 원하는 상태로 끊임없이 조정 |

!!! info "다음 챕터 예고"
    다음 챕터에서는 **kubectl 명령어**를 실습하면서 실제로 Pod, Deployment, Service를 생성하고 관리하는 방법을 배웁니다.
