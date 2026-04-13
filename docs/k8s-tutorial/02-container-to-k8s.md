# 2. 컨테이너에서 쿠버네티스로

## 컨테이너의 한계 — 왜 오케스트레이션이 필요한가

1장에서 컨테이너의 장점을 살펴봤습니다. 하지만 실제 프로덕션 환경에서 컨테이너만으로 서비스를 운영하면 금방 벽에 부딪힙니다. 컨테이너 **하나**를 실행하는 건 쉽지만, **수십~수백 개**를 안정적으로 운영하는 것은 전혀 다른 문제입니다.

### 컨테이너 수십 개 관리의 어려움

간단한 마이크로서비스 아키텍처를 생각해봅시다. API 서버, 워커, 데이터베이스, 캐시, 메시지 큐, 프론트엔드 — 각각 컨테이너로 실행하면 최소 6개입니다. 여기에 스테이징, QA 환경까지 합치면 수십 개가 됩니다.

```bash
# 수동으로 컨테이너를 관리한다면...
docker run -d --name api-1 -p 8080:8080 my-api:v2.1
docker run -d --name api-2 -p 8081:8080 my-api:v2.1
docker run -d --name api-3 -p 8082:8080 my-api:v2.1
docker run -d --name worker-1 my-worker:v1.3
docker run -d --name worker-2 my-worker:v1.3
docker run -d --name redis -p 6379:6379 redis:7
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16
# ... 이걸 서버 3대에 걸쳐서 반복?
```

위 명령어를 수동으로 실행하고 관리하는 것은 현실적으로 불가능합니다. 서버가 2대, 3대로 늘어나면 **어떤 컨테이너가 어떤 서버에서 돌고 있는지**조차 파악하기 어렵습니다.

### 수동 재시작, 로드밸런싱, 스케일링

컨테이너가 죽으면 어떻게 될까요?

```
[서버 A]                    [서버 B]
├── api-1 ✅                ├── api-3 ✅
├── api-2 ❌ (OOM killed)   ├── worker-2 ✅
├── worker-1 ✅             └── postgres ✅
└── redis ✅
```

`api-2`가 메모리 부족으로 죽었습니다. 누군가가 이를 **감지하고**, SSH로 접속해서, **수동으로 재시작**해야 합니다. 새벽 3시에 이런 일이 발생하면?

!!! warning "수동 운영의 문제점"
    - **장애 감지**: 컨테이너가 죽었는지 어떻게 알 수 있나?
    - **자동 복구**: 죽은 컨테이너를 자동으로 다시 띄울 수 있나?
    - **로드밸런싱**: 살아있는 api-1, api-3에만 트래픽을 보낼 수 있나?
    - **스케일링**: 트래픽 급증 시 api를 5개로 늘릴 수 있나?

`docker-compose`가 이 문제를 일부 해결해주지만, **단일 서버**에서만 동작합니다. 여러 서버에 걸친 컨테이너 관리는 여전히 수동입니다.

### 서비스 디스커버리, 설정 관리, 롤링 업데이트

서비스 간 통신도 문제입니다. `api` 컨테이너가 `redis`와 `postgres`에 접근해야 하는데, IP가 바뀌면 어떻게 할까요?

```
# 기존: 하드코딩된 설정
REDIS_HOST=192.168.1.10
POSTGRES_HOST=192.168.1.11

# redis 컨테이너가 다른 서버로 옮겨지면?
# → 모든 api 컨테이너의 환경변수를 수동으로 변경해야 함
```

배포도 까다롭습니다. `my-api:v2.1`에서 `my-api:v2.2`로 업데이트할 때:

1. 새 버전 컨테이너를 띄운다
2. 헬스체크가 통과하면 트래픽을 전환한다
3. 이전 버전 컨테이너를 내린다
4. 문제가 생기면 롤백한다

이 모든 과정을 **수동으로** 하는 것은 실수와 장애의 원인이 됩니다.

!!! info "정리: 컨테이너만으로는 부족한 것들"
    | 문제 | 설명 |
    | --- | --- |
    | 스케줄링 | 어떤 컨테이너를 어떤 서버에 배치할지 |
    | 자동 복구 | 죽은 컨테이너를 자동으로 재시작 |
    | 서비스 디스커버리 | 컨테이너 간 통신 경로 자동 관리 |
    | 로드밸런싱 | 트래픽을 살아있는 인스턴스에 분산 |
    | 롤링 업데이트 | 무중단 배포 |
    | 설정/시크릿 관리 | 환경변수, 비밀번호 등 중앙 관리 |
    | 오토스케일링 | 부하에 따른 자동 확장/축소 |

    이것들을 해결하는 것이 바로 **컨테이너 오케스트레이션**입니다.

---

## 컨테이너 오케스트레이션 도구 비교

컨테이너 오케스트레이션 도구는 여러 가지가 있습니다. 각각의 특징을 비교해봅시다.

### Docker Swarm

Docker에 내장된 오케스트레이션 기능입니다. Docker CLI를 그대로 사용할 수 있어 학습 곡선이 낮습니다.

```bash
# Docker Swarm 초기화
docker swarm init

# 서비스 생성 (컨테이너 3개 자동 분산)
docker service create --name api --replicas 3 -p 8080:8080 my-api:v2.1

# 스케일 업
docker service scale api=5
```

!!! tip "Docker Swarm의 장단점"
    - 장점: Docker만 알면 바로 사용 가능, 설정이 간단
    - 단점: 기능이 제한적, 대규모 환경에 부적합, Docker 커뮤니티에서 사실상 중단

### Kubernetes (K8s)

Google이 내부에서 사용하던 Borg 시스템을 기반으로 만든 오픈소스 오케스트레이션 플랫폼입니다. 현재 업계 표준(de facto standard)입니다.

### HashiCorp Nomad

HashiCorp에서 만든 워크로드 스케줄러입니다. 컨테이너뿐 아니라 Java JAR, 바이너리 등도 스케줄링할 수 있습니다.

### Amazon ECS

AWS 전용 컨테이너 오케스트레이션 서비스입니다. AWS 생태계와 깊이 통합되어 있습니다.

### 비교 테이블

| 항목 | Docker Swarm | Kubernetes | Nomad | ECS |
| --- | --- | --- | --- | --- |
| 개발사 | Docker | CNCF (Google 기원) | HashiCorp | AWS |
| 학습 곡선 | 낮음 | 높음 | 중간 | 중간 |
| 생태계 | 작음 | 매우 큼 | 중간 | AWS 한정 |
| 확장성 | 수백 노드 | 수천 노드 | 수천 노드 | AWS 제한 내 |
| 클라우드 종속 | 없음 | 없음 | 없음 | AWS 종속 |
| 커뮤니티 | 축소 중 | 매우 활발 | 보통 | AWS 포럼 |
| 프로덕션 채택률 | 낮음 | 매우 높음 | 중간 | AWS 내 높음 |
| 자동 복구 | 기본 지원 | 강력한 지원 | 지원 | 지원 |
| 서비스 메시 | 제한적 | Istio, Linkerd 등 | Consul Connect | App Mesh |

!!! tip "결론"
    대부분의 경우 **Kubernetes가 가장 합리적인 선택**입니다.

    - 클라우드 벤더 독립적 (EKS, GKE, AKS 어디서든 동작)
    - 거대한 생태계 (Helm, Argo CD, Prometheus 등)
    - 채용 시장에서도 K8s 경험이 가장 많이 요구됨
    - 이 튜토리얼에서도 Kubernetes를 중심으로 진행합니다

---

## Kubernetes란?

### 역사: Google Borg에서 K8s까지

Kubernetes(쿠버네티스)는 그리스어로 **"조타수"** 또는 **"항해사"**를 뜻합니다. 로고가 배의 키(helm)인 이유도 여기에 있습니다.

```
2003-2004  Google 내부에서 Borg 시스템 개발
           → 매주 수십억 개의 컨테이너를 관리

2013       Google, Borg의 후속 시스템 Omega 논문 발표

2014.06    Google, Kubernetes를 오픈소스로 공개
           → Borg/Omega의 15년 운영 경험을 반영

2015.07    CNCF(Cloud Native Computing Foundation)에 기부
           → 벤더 중립적 거버넌스 확보

2018~      EKS, GKE, AKS 등 관리형 서비스 보편화
           → 사실상 업계 표준(de facto standard) 확립
```

!!! info "K8s라는 약칭"
    Kubernetes를 줄여서 **K8s**라고 씁니다. K와 s 사이에 8글자가 있기 때문입니다:
    `K-[ubernete]-s` → `K8s`. 이 표기법을 **numeronym**이라고 합니다.
    비슷한 예: internationalization → i18n

### 선언형(Declarative) vs 명령형(Imperative)

Kubernetes의 가장 핵심적인 철학은 **선언형(Declarative)** 접근 방식입니다. "어떻게 해라(How)"가 아니라 **"이런 상태여야 한다(What)"**를 선언합니다.

**명령형 — "이렇게 해라"**

```bash
# 명령형: 각 단계를 직접 지시
docker run -d --name api-1 my-api:v2.1
docker run -d --name api-2 my-api:v2.1
docker run -d --name api-3 my-api:v2.1
# api-2가 죽으면 → 직접 확인하고 직접 재시작
docker start api-2
```

**선언형 — "이 상태를 유지해라"**

```yaml
# 선언형: 원하는 상태(Desired State)를 선언
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3          # (1)!
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: my-api:v2.1
        ports:
        - containerPort: 8080
```

1. "api 컨테이너가 항상 3개 실행되어야 한다"고 선언하면, K8s가 알아서 관리합니다. 1개가 죽으면 자동으로 새로 띄우고, 4개가 되면 1개를 내립니다.

!!! tip "선언형의 핵심"
    선언형 시스템에서는 **현재 상태(Current State)**와 **원하는 상태(Desired State)**의 차이를 지속적으로 감시하고, 차이가 발생하면 자동으로 맞춰줍니다. 이것을 **Reconciliation Loop**라고 합니다.

    ```
    원하는 상태: replicas=3
    현재 상태:   2개 실행 중 (1개 죽음)
    → K8s 자동 감지 → 새 Pod 1개 생성 → 다시 3개
    ```

| 방식 | 특징 | 예시 |
| --- | --- | --- |
| 명령형 (Imperative) | 각 단계를 직접 명령 | `docker run`, `docker stop` |
| 선언형 (Declarative) | 원하는 최종 상태만 기술 | YAML 파일로 Deployment 정의 |

### K8s가 해결하는 문제들

앞에서 다뤘던 컨테이너의 한계를 K8s가 어떻게 해결하는지 정리해봅시다.

| 문제 | Docker만 사용 | Kubernetes |
| --- | --- | --- |
| 컨테이너 배치 | 수동으로 서버 지정 | **스케줄러**가 리소스 기반으로 자동 배치 |
| 장애 복구 | 수동 재시작 | **Self-healing** — 자동 감지, 자동 재시작 |
| 서비스 디스커버리 | IP 하드코딩 | **Service** 리소스로 DNS 기반 자동 라우팅 |
| 로드밸런싱 | 외부 LB 별도 구성 | **Service**가 내장 로드밸런서 제공 |
| 롤링 업데이트 | 수동 배포 | **Deployment**가 무중단 롤링 업데이트 |
| 롤백 | 수동 복구 | `kubectl rollout undo` 한 줄 |
| 설정 관리 | 환경변수 파일 | **ConfigMap**, **Secret** 리소스 |
| 오토스케일링 | 불가 | **HPA** (Horizontal Pod Autoscaler) |
| 스토리지 관리 | docker volume | **PV/PVC** (Persistent Volume) |

---

## K8s 설치 옵션

Kubernetes를 설치하는 방법은 용도에 따라 다양합니다. 크게 **로컬 개발용**, **클라우드 관리형**, **온프레미스**로 나뉩니다.

### 로컬 개발용

로컬에서 학습하거나 개발할 때 사용하는 경량 K8s 환경입니다.

**minikube** — 가장 대표적인 로컬 K8s 도구입니다. VM 또는 컨테이너 위에 단일 노드 클러스터를 생성합니다.

```bash
# macOS에서 설치
brew install minikube

# 클러스터 시작
minikube start
```

**kind (Kubernetes in Docker)** — Docker 컨테이너를 K8s 노드로 사용합니다. 멀티 노드 클러스터를 쉽게 구성할 수 있어 CI/CD 환경에서 많이 사용됩니다.

```bash
# 설치
brew install kind

# 클러스터 생성
kind create cluster --name my-cluster
```

**k3d** — 경량 K8s 배포판인 k3s를 Docker 위에서 실행합니다. 리소스 소모가 적고 빠릅니다.

```bash
# 설치
brew install k3d

# 클러스터 생성 (서버 1개 + 에이전트 2개)
k3d cluster create my-cluster --servers 1 --agents 2
```

**Docker Desktop** — Docker Desktop에 내장된 K8s입니다. 설정에서 체크박스 하나로 활성화할 수 있습니다.

### 클라우드 관리형 (Managed K8s)

클라우드 프로바이더가 **컨트롤 플레인(Master)**을 관리해주는 서비스입니다. 프로덕션에서 가장 많이 사용됩니다.

| 서비스 | 프로바이더 | 특징 |
| --- | --- | --- |
| **EKS** | AWS | AWS 서비스(ALB, IAM, ECR)와 깊은 통합 |
| **GKE** | Google Cloud | K8s 창시자답게 가장 빠른 신규 기능 지원 |
| **AKS** | Azure | Azure AD 통합, Windows 컨테이너 지원 |

```bash
# EKS 클러스터 생성 예시 (eksctl 사용)
eksctl create cluster \
  --name my-cluster \
  --region ap-northeast-2 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3
```

### 온프레미스

직접 서버에 K8s를 설치하는 방식입니다. 보안 규제가 엄격하거나 클라우드를 사용할 수 없는 환경에서 사용합니다.

- **kubeadm**: K8s 공식 설치 도구. 수동 설정이 많지만 가장 유연합니다.
- **Rancher**: 웹 UI로 멀티 클러스터를 관리할 수 있는 플랫폼입니다.
- **Kubespray**: Ansible 기반 K8s 설치 자동화 도구입니다.

### 설치 옵션 비교 테이블

| 도구 | 용도 | 난이도 | 프로덕션 적합도 | 멀티 노드 | 비용 |
| --- | --- | --- | --- | --- | --- |
| minikube | 학습, 로컬 개발 | 매우 쉬움 | ❌ | ❌ 단일 노드 | 무료 |
| kind | 로컬 개발, CI/CD | 쉬움 | ❌ | ✅ | 무료 |
| k3d | 로컬 개발, 경량 환경 | 쉬움 | △ (k3s 기반) | ✅ | 무료 |
| Docker Desktop | 로컬 개발 | 매우 쉬움 | ❌ | ❌ | 무료/유료 |
| EKS | AWS 프로덕션 | 중간 | ✅ | ✅ | 유료 |
| GKE | GCP 프로덕션 | 중간 | ✅ | ✅ | 유료 |
| AKS | Azure 프로덕션 | 중간 | ✅ | ✅ | 유료 |
| kubeadm | 온프레미스 | 높음 | ✅ | ✅ | 서버 비용 |
| Rancher | 온프레미스 멀티 클러스터 | 중간 | ✅ | ✅ | 무료/유료 |

!!! tip "이 튜토리얼에서는 minikube를 사용합니다"
    학습 목적으로는 **minikube**가 가장 적합합니다. 설치가 간단하고, 단일 노드지만 K8s의 모든 핵심 기능을 사용할 수 있습니다. 이후 챕터에서도 minikube 환경을 기준으로 실습을 진행합니다.

---

## minikube로 첫 번째 클러스터 만들기

### 사전 준비

minikube는 VM 또는 컨테이너 런타임이 필요합니다. Docker Desktop이 설치되어 있다면 바로 사용할 수 있습니다.

```bash
# Docker가 설치되어 있는지 확인
docker version
```

### minikube 설치

```bash
# macOS (Homebrew)
brew install minikube

# Linux (x86-64)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 설치 확인
minikube version
```

### 클러스터 시작

```bash
# 기본 설정으로 클러스터 시작 (Docker 드라이버 사용)
minikube start

# 출력 예시:
# 😄  minikube v1.33.0 on Darwin 14.0
# ✨  Automatically selected the docker driver
# 📌  Using Docker Desktop driver with root privileges
# 🧯  Creating docker container (CPUs=2, Memory=4000MB, Disk=20000MB) ...
# 🐳  Preparing Kubernetes v1.30.0 on Docker 26.0.1 ...
# 🔎  Verifying Kubernetes components...
# 🌟  Enabled addons: storage-provisioner, default-storageclass
# 🏄  Done! kubectl is now configured to use "minikube" cluster
```

!!! info "리소스 설정"
    기본값이 부족하다면 CPU와 메모리를 지정할 수 있습니다:

    ```bash
    minikube start --cpus=4 --memory=8192 --disk-size=30g
    ```

### kubectl 설치 및 기본 명령어

`kubectl`은 Kubernetes 클러스터와 통신하는 CLI 도구입니다. K8s 작업의 거의 모든 것이 `kubectl`을 통해 이루어집니다.

```bash
# macOS (Homebrew)
brew install kubectl

# 설치 확인
kubectl version --client

# 또는 minikube 내장 kubectl 사용
minikube kubectl -- version --client
```

클러스터가 정상적으로 동작하는지 확인해봅시다.

```bash
# 클러스터 정보 확인
kubectl cluster-info
# Kubernetes control plane is running at https://127.0.0.1:55000
# CoreDNS is running at https://127.0.0.1:55000/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

# 노드 목록 확인
kubectl get nodes
# NAME       STATUS   ROLES           AGE   VERSION
# minikube   Ready    control-plane   60s   v1.30.0

# 현재 실행 중인 Pod 확인 (시스템 Pod 포함)
kubectl get pods -A
# NAMESPACE     NAME                               READY   STATUS    RESTARTS   AGE
# kube-system   coredns-7db6d8ff4d-xxxxx           1/1     Running   0          60s
# kube-system   etcd-minikube                      1/1     Running   0          75s
# kube-system   kube-apiserver-minikube            1/1     Running   0          75s
# kube-system   kube-controller-manager-minikube   1/1     Running   0          75s
# kube-system   kube-proxy-xxxxx                   1/1     Running   0          60s
# kube-system   kube-scheduler-minikube            1/1     Running   0          75s
# kube-system   storage-provisioner                1/1     Running   0          74s
```

!!! tip "kubectl 자동완성 설정"
    kubectl 명령어가 길기 때문에 자동완성을 설정하면 편리합니다:

    ```bash
    # zsh 사용자
    echo 'source <(kubectl completion zsh)' >> ~/.zshrc
    echo 'alias k=kubectl' >> ~/.zshrc
    echo 'complete -o default -F __start_kubectl k' >> ~/.zshrc
    source ~/.zshrc

    # 이제 k get pods 처럼 축약해서 사용 가능
    k get pods
    ```

### 자주 쓰는 kubectl 명령어

| 명령어 | 설명 |
| --- | --- |
| `kubectl get <리소스>` | 리소스 목록 조회 |
| `kubectl describe <리소스> <이름>` | 리소스 상세 정보 |
| `kubectl create -f <파일>` | YAML 파일로 리소스 생성 |
| `kubectl apply -f <파일>` | YAML 파일로 리소스 생성/수정 (선언형) |
| `kubectl delete <리소스> <이름>` | 리소스 삭제 |
| `kubectl logs <Pod이름>` | Pod 로그 확인 |
| `kubectl exec -it <Pod이름> -- bash` | Pod 내부 접속 |

### 첫 번째 Pod 실행: nginx

드디어 K8s 위에서 첫 번째 컨테이너를 실행할 차례입니다. nginx 웹서버를 Pod로 띄워봅시다.

**방법 1: 명령어로 바로 실행 (명령형)**

```bash
# nginx Pod 생성
kubectl run my-nginx --image=nginx:1.25 --port=80

# Pod 상태 확인
kubectl get pods
# NAME       READY   STATUS    RESTARTS   AGE
# my-nginx   1/1     Running   0          10s

# Pod 상세 정보 확인
kubectl describe pod my-nginx
```

**방법 2: YAML 파일로 실행 (선언형)** — 권장

```yaml
# my-nginx-pod.yaml
apiVersion: v1
kind: Pod                   # (1)!
metadata:
  name: my-nginx            # (2)!
  labels:
    app: nginx
spec:
  containers:
  - name: nginx             # (3)!
    image: nginx:1.25       # (4)!
    ports:
    - containerPort: 80     # (5)!
```

1. `kind: Pod` — 생성할 리소스 유형이 Pod임을 지정합니다.
2. `name: my-nginx` — Pod의 이름입니다. 클러스터 내에서 고유해야 합니다.
3. `name: nginx` — Pod 안에서 실행되는 컨테이너의 이름입니다.
4. `image: nginx:1.25` — Docker Hub에서 nginx 1.25 이미지를 가져옵니다.
5. `containerPort: 80` — 컨테이너가 리슨하는 포트를 선언합니다.

```bash
# YAML 파일로 Pod 생성
kubectl apply -f my-nginx-pod.yaml

# Pod 상태 확인
kubectl get pods
# NAME       READY   STATUS    RESTARTS   AGE
# my-nginx   1/1     Running   0          5s

# nginx 동작 확인 (포트 포워딩)
kubectl port-forward pod/my-nginx 8080:80
# Forwarding from 127.0.0.1:8080 -> 80
```

!!! info "포트 포워딩으로 접속 확인"
    `port-forward`를 실행한 상태에서 새 터미널을 열고:

    ```bash
    curl http://localhost:8080
    # <!DOCTYPE html>
    # <html>
    # <head>
    # <title>Welcome to nginx!</title>
    # ...
    ```

    브라우저에서 `http://localhost:8080`으로 접속해도 nginx 기본 페이지가 보입니다.

### Pod 로그 확인 및 내부 접속

```bash
# Pod 로그 확인
kubectl logs my-nginx
# 127.0.0.1 - - [13/Apr/2026:00:00:00 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.4.0"

# Pod 내부로 접속 (컨테이너 안에서 명령어 실행)
kubectl exec -it my-nginx -- bash
root@my-nginx:/# cat /etc/nginx/nginx.conf
root@my-nginx:/# exit
```

### 정리 (리소스 삭제)

실습이 끝나면 생성한 리소스를 정리합니다.

```bash
# Pod 삭제
kubectl delete pod my-nginx

# 또는 YAML 파일로 삭제
kubectl delete -f my-nginx-pod.yaml

# 클러스터 중지 (리소스 보존)
minikube stop

# 클러스터 완전 삭제
minikube delete
```

---

## 이 장에서 배운 것

!!! info "핵심 정리"
    1. **컨테이너만으로는 프로덕션 운영이 어렵다** — 수동 관리, 장애 복구, 스케일링 등의 문제가 발생합니다.
    2. **컨테이너 오케스트레이션**이 이 문제를 해결하며, **Kubernetes가 사실상 표준**입니다.
    3. K8s는 **선언형(Declarative)** 방식으로 동작합니다 — 원하는 상태를 정의하면 K8s가 알아서 유지합니다.
    4. 로컬 학습에는 **minikube**가 가장 적합합니다.
    5. `kubectl`은 K8s와 소통하는 핵심 CLI 도구입니다.

다음 장에서는 **K8s 아키텍처**를 자세히 살펴봅니다. 컨트롤 플레인, 워커 노드, etcd 등 K8s를 구성하는 핵심 컴포넌트들이 어떻게 협력하는지 알아봅시다.
