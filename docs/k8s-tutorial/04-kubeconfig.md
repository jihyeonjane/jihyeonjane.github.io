# 4. kubeconfig 완전 정복

## kubeconfig란?

`kubectl`이 Kubernetes 클러스터와 통신하려면, **어떤 클러스터에**, **어떤 사용자로**, **어떻게 인증해서** 접속할지를 알아야 합니다. 이 모든 정보를 담고 있는 파일이 바로 **kubeconfig**입니다.

> **"kubeconfig는 kubectl의 주소록이자 신분증이다."**

`kubectl`은 명령을 실행할 때마다 kubeconfig를 읽어서 API 서버 주소, 인증 정보, 네임스페이스 등을 결정합니다. kubeconfig 없이는 `kubectl`이 어디에 접속해야 할지조차 알 수 없습니다.

### 기본 위치

kubeconfig의 기본 경로는 다음과 같습니다:

```
~/.kube/config
```

`kubectl`은 별도 설정이 없으면 항상 이 경로의 파일을 읽습니다.

!!! info "kubeconfig는 하나의 파일이 아닐 수도 있다"
    `KUBECONFIG` 환경변수를 사용하면 여러 파일을 동시에 참조할 수 있습니다.
    파일 경로를 `:`(Linux/macOS) 또는 `;`(Windows)로 구분합니다.

### KUBECONFIG 환경변수

기본 경로 대신 다른 kubeconfig 파일을 사용하고 싶을 때, `KUBECONFIG` 환경변수를 설정합니다.

```bash
# 단일 파일 지정
export KUBECONFIG=~/my-cluster-config

# 여러 파일 병합 (Linux/macOS)
export KUBECONFIG=~/.kube/config:~/.kube/config-dev:~/.kube/config-prod
```

`kubectl`은 `KUBECONFIG`에 나열된 모든 파일을 **메모리에서 하나로 병합**하여 사용합니다. 실제 파일은 변경되지 않습니다.

!!! tip "우선순위"
    kubeconfig 결정 순서는 다음과 같습니다:

    1. `--kubeconfig` 플래그 (명령어에 직접 지정)
    2. `KUBECONFIG` 환경변수
    3. 기본 경로 `~/.kube/config`

현재 kubectl이 어떤 설정을 사용하는지 확인하려면:

```bash
# 현재 활성 kubeconfig 전체 출력
kubectl config view

# 현재 context 확인
kubectl config current-context
```

---

## kubeconfig 구조 완전 해부

kubeconfig는 YAML 형식이며, 크게 **4가지 주요 섹션**으로 구성됩니다.

| 섹션 | 역할 | 핵심 질문 |
|------|------|-----------|
| `clusters` | 클러스터 접속 정보 | **어디에** 접속하는가? |
| `users` | 인증 정보 | **누구로** 접속하는가? |
| `contexts` | cluster + user + namespace 조합 | **어떤 조합으로** 접속하는가? |
| `current-context` | 현재 활성 context | **지금** 어떤 조합을 쓰는가? |

### 전체 YAML 예시

아래는 두 개의 클러스터(dev, prod)를 관리하는 kubeconfig 예시입니다. 각 줄을 하나씩 살펴보겠습니다.

```yaml
apiVersion: v1              # kubeconfig API 버전 (항상 v1)
kind: Config                # 리소스 종류 (항상 Config)
preferences: {}             # kubectl 동작 설정 (보통 비워둠)

clusters:                   # ── 클러스터 목록 ──
- name: dev-cluster         # 이 클러스터를 식별하는 이름 (자유 지정)
  cluster:
    server: https://dev-api.example.com:6443        # API 서버 주소
    certificate-authority-data: LS0tLS1CRUdJ...     # CA 인증서 (base64)

- name: prod-cluster
  cluster:
    server: https://prod-api.example.com:6443
    certificate-authority-data: LS0tLS1CRUdJ...
    # CA 인증서 파일 경로로도 지정 가능:
    # certificate-authority: /path/to/ca.crt

users:                      # ── 사용자(인증) 목록 ──
- name: dev-admin           # 사용자 식별 이름 (자유 지정)
  user:
    client-certificate-data: LS0tLS1CRUdJ...   # 클라이언트 인증서 (base64)
    client-key-data: LS0tLS1CRUdJ...           # 클라이언트 키 (base64)

- name: prod-deployer
  user:
    token: eyJhbGciOiJSUzI1NiIs...             # Bearer 토큰

contexts:                   # ── Context 목록 ──
- name: dev                 # context 이름 (kubectl config use-context에서 사용)
  context:
    cluster: dev-cluster    # clusters[].name 참조
    user: dev-admin         # users[].name 참조
    namespace: default      # 기본 네임스페이스 (생략 시 default)

- name: prod
  context:
    cluster: prod-cluster
    user: prod-deployer
    namespace: production

current-context: dev        # 현재 활성화된 context 이름
```

### clusters: 클러스터 접속 정보

`clusters` 섹션은 **API 서버의 위치와 신뢰할 CA 인증서**를 정의합니다.

```yaml
clusters:
- name: my-cluster              # 식별용 이름
  cluster:
    server: https://10.0.0.1:6443           # API 서버 엔드포인트
    certificate-authority-data: LS0tLS1...   # CA 인증서 (base64 인코딩)
```

| 필드 | 설명 |
|------|------|
| `server` | Kubernetes API 서버 URL. HTTPS 포트는 보통 6443 |
| `certificate-authority-data` | API 서버의 TLS 인증서를 검증하는 CA 인증서 (base64) |
| `certificate-authority` | CA 인증서 파일 경로 (`-data`와 택 1) |
| `insecure-skip-tls-verify` | `true`로 설정하면 TLS 검증 건너뜀 (테스트 전용) |

!!! warning "insecure-skip-tls-verify는 프로덕션에서 절대 사용 금지"
    TLS 검증을 건너뛰면 중간자 공격(MITM)에 노출됩니다. 개발/테스트 환경에서만 임시로 사용하세요.

### users: 인증 정보

`users` 섹션은 **kubectl이 API 서버에 자신을 증명하는 방법**을 정의합니다. 인증 방식에 따라 필드가 달라집니다.

```yaml
users:
- name: my-user
  user:
    # 방식 1: 인증서 기반
    client-certificate-data: LS0tLS1...
    client-key-data: LS0tLS1...

    # 방식 2: 토큰 기반
    # token: eyJhbGciOi...

    # 방식 3: exec 기반 (외부 프로그램)
    # exec:
    #   apiVersion: client.authentication.k8s.io/v1beta1
    #   command: aws
    #   args: ["eks", "get-token", "--cluster-name", "my-cluster"]
```

| 인증 방식 | 주요 필드 | 대표적 사용 환경 |
|-----------|-----------|------------------|
| 인증서 기반 | `client-certificate-data`, `client-key-data` | 자체 구축 클러스터 (kubeadm) |
| 토큰 기반 | `token` | ServiceAccount, 정적 토큰 |
| OIDC 기반 | `auth-provider` | Google, Azure AD, Keycloak |
| exec 기반 | `exec` | AWS EKS, GKE, 커스텀 인증 |

### contexts: cluster + user + namespace 조합

`contexts`는 **"이 클러스터에, 이 사용자로, 이 네임스페이스에서 작업한다"**라는 조합을 정의합니다.

```yaml
contexts:
- name: dev                       # context 이름
  context:
    cluster: dev-cluster          # clusters[].name 참조
    user: dev-admin               # users[].name 참조
    namespace: my-app             # 기본 네임스페이스 (선택)
```

context가 유용한 이유는, **매번 `--cluster`, `--user`, `--namespace` 플래그를 입력하지 않아도** context 전환만으로 작업 환경을 바꿀 수 있기 때문입니다.

```bash
# namespace를 지정하지 않으면 context의 기본 namespace 사용
kubectl get pods
# ↑ dev context의 my-app 네임스페이스에서 실행됨

# 일시적으로 다른 namespace 사용
kubectl get pods -n kube-system
```

### current-context

현재 활성화된 context를 지정합니다. `kubectl` 명령은 이 context의 cluster, user, namespace를 기본으로 사용합니다.

```yaml
current-context: dev
```

```bash
# 현재 context 확인
kubectl config current-context
# 출력: dev
```

---

## 실전: 멀티 클러스터 관리

실제 업무에서는 dev, staging, production 등 여러 클러스터를 동시에 관리하는 경우가 많습니다. kubeconfig를 활용하면 이를 효율적으로 전환할 수 있습니다.

### 여러 클러스터 kubeconfig 병합

각 클러스터에서 받은 kubeconfig 파일이 별도로 있을 때, 하나로 병합할 수 있습니다.

```bash
# 방법 1: KUBECONFIG 환경변수로 여러 파일 지정 후 병합
export KUBECONFIG=~/.kube/config:~/.kube/config-dev:~/.kube/config-prod

# 병합된 결과를 하나의 파일로 저장
kubectl config view --flatten > ~/.kube/config-merged

# 병합된 파일을 기본 config로 사용
cp ~/.kube/config ~/.kube/config-backup    # 백업 먼저!
mv ~/.kube/config-merged ~/.kube/config
```

!!! tip "병합 전 항상 백업"
    `~/.kube/config`를 덮어쓰기 전에 반드시 백업하세요. `--flatten` 옵션은 모든 인증서 데이터를 인라인으로 포함시킵니다.

```bash
# 방법 2: 수동으로 kubeconfig에 클러스터 추가
kubectl config set-cluster new-cluster \
  --server=https://new-api.example.com:6443 \
  --certificate-authority=/path/to/ca.crt

kubectl config set-credentials new-user \
  --client-certificate=/path/to/cert.crt \
  --client-key=/path/to/key.key

kubectl config set-context new-context \
  --cluster=new-cluster \
  --user=new-user \
  --namespace=default
```

### context 전환

```bash
# 사용 가능한 모든 context 목록
kubectl config get-contexts

# 출력 예시:
# CURRENT   NAME    CLUSTER        AUTHINFO        NAMESPACE
# *         dev     dev-cluster    dev-admin       default
#           prod    prod-cluster   prod-deployer   production
#           stg     stg-cluster    stg-admin       staging

# context 전환
kubectl config use-context prod
# 출력: Switched to context "prod".

# 특정 context의 기본 namespace 변경
kubectl config set-context --current --namespace=monitoring
```

### kubectx & kubens 도구

`kubectl config use-context`를 매번 입력하는 것은 번거롭습니다. **kubectx**와 **kubens**를 사용하면 더 빠르게 전환할 수 있습니다.

```bash
# 설치 (macOS)
brew install kubectx

# 설치 (Linux)
sudo apt install kubectx
# 또는
git clone https://github.com/ahmetb/kubectx.git ~/.kubectx
sudo ln -s ~/.kubectx/kubectx /usr/local/bin/kubectx
sudo ln -s ~/.kubectx/kubens /usr/local/bin/kubens
```

**kubectx** - context 빠른 전환:

```bash
# context 목록 (현재 context에 하이라이트)
kubectx
# 출력:
#   dev
#   prod        ← 현재 context (색상 강조)
#   stg

# context 전환
kubectx dev
# 출력: Switched to context "dev".

# 이전 context로 돌아가기 (cd -와 비슷)
kubectx -
# 출력: Switched to context "prod".

# context 이름 변경 (별칭)
kubectx my-dev=dev-cluster-context
```

**kubens** - namespace 빠른 전환:

```bash
# namespace 목록
kubens
# 출력:
#   default
#   kube-system
#   monitoring
#   my-app      ← 현재 namespace (색상 강조)

# namespace 전환
kubens monitoring
# 출력: Context "dev" modified. Active namespace is "monitoring".

# 이전 namespace로 돌아가기
kubens -
```

| 도구 | 기능 | 동등한 kubectl 명령 |
|------|------|---------------------|
| `kubectx` | context 전환 | `kubectl config use-context` |
| `kubectx -` | 이전 context 복귀 | (직접 지원 안 됨) |
| `kubens` | namespace 전환 | `kubectl config set-context --current --namespace=` |
| `kubens -` | 이전 namespace 복귀 | (직접 지원 안 됨) |

!!! tip "fzf와 함께 사용하면 더 편리"
    `fzf`가 설치되어 있으면, `kubectx`와 `kubens`를 인수 없이 실행했을 때 인터랙티브 선택 UI가 나타납니다.

    ```bash
    brew install fzf
    kubectx    # → fzf 선택 UI 표시
    ```

---

## 인증 방식별 kubeconfig

Kubernetes는 다양한 인증 방식을 지원합니다. 각 방식에 따라 kubeconfig의 `users` 섹션이 달라집니다.

### 1. 인증서 기반 (Client Certificate)

X.509 클라이언트 인증서를 사용하는 가장 기본적인 방식입니다. `kubeadm`으로 클러스터를 구축하면 기본적으로 이 방식이 사용됩니다.

```yaml
users:
- name: admin
  user:
    client-certificate-data: |
      LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t
      ... (base64 인코딩된 클라이언트 인증서) ...
      LS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ==
    client-key-data: |
      LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVkt
      ... (base64 인코딩된 개인 키) ...
      LS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0t
```

**인증서 생성 과정:**

```bash
# 1. 개인 키 생성
openssl genrsa -out jane.key 2048

# 2. CSR(Certificate Signing Request) 생성
#    CN(Common Name)이 사용자 이름, O(Organization)가 그룹이 됨
openssl req -new -key jane.key -out jane.csr \
  -subj "/CN=jane/O=dev-team"

# 3. Kubernetes CA로 인증서 서명 (클러스터 관리자가 수행)
openssl x509 -req -in jane.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out jane.crt -days 365

# 4. kubeconfig에 등록
kubectl config set-credentials jane \
  --client-certificate=jane.crt \
  --client-key=jane.key \
  --embed-certs=true
```

!!! info "인증서의 CN과 O 필드"
    - `CN` (Common Name): Kubernetes에서 **사용자 이름**으로 사용됩니다.
    - `O` (Organization): Kubernetes에서 **그룹**으로 사용됩니다.
    - RBAC의 `RoleBinding`에서 `subjects.name`이 CN, `subjects.kind: Group`이 O에 매핑됩니다.

| 장점 | 단점 |
|------|------|
| 별도 인증 서버 불필요 | 인증서 만료 시 갱신 필요 |
| Kubernetes 내장 기능 | 인증서 폐기(revoke)가 어려움 |
| mTLS로 양방향 인증 | 사용자가 많으면 관리 부담 |

### 2. 토큰 기반 (Bearer Token)

ServiceAccount 토큰이나 정적 토큰을 사용하는 방식입니다. CI/CD 파이프라인이나 자동화에서 주로 사용됩니다.

```yaml
users:
- name: ci-bot
  user:
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjV2cVFpRE...
```

**ServiceAccount 토큰으로 kubeconfig 생성:**

```bash
# 1. ServiceAccount 생성
kubectl create serviceaccount deploy-bot -n my-app

# 2. Secret 생성 (Kubernetes 1.24+에서는 자동 생성되지 않음)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: deploy-bot-token
  namespace: my-app
  annotations:
    kubernetes.io/service-account.name: deploy-bot
type: kubernetes.io/service-account-token
EOF

# 3. 토큰 추출
TOKEN=$(kubectl get secret deploy-bot-token -n my-app \
  -o jsonpath='{.data.token}' | base64 -d)

# 4. kubeconfig에 등록
kubectl config set-credentials deploy-bot --token=$TOKEN
```

!!! warning "Kubernetes 1.24+ 토큰 변경사항"
    Kubernetes 1.24부터 ServiceAccount 생성 시 장기(long-lived) 토큰이 자동 생성되지 않습니다.
    `TokenRequest` API로 시간 제한 토큰을 발급받거나, 위처럼 Secret을 수동 생성해야 합니다.

    ```bash
    # TokenRequest API로 1시간짜리 토큰 발급
    kubectl create token deploy-bot -n my-app --duration=3600s
    ```

### 3. OIDC 기반 (OpenID Connect)

Google, Azure AD, Keycloak 등의 Identity Provider(IdP)를 통해 인증하는 방식입니다. 기업 환경에서 SSO(Single Sign-On)와 연동할 때 사용합니다.

```yaml
users:
- name: jane-oidc
  user:
    auth-provider:
      name: oidc
      config:
        idp-issuer-url: https://accounts.google.com
        client-id: my-k8s-app.apps.googleusercontent.com
        client-secret: GOCSPX-xxxxxxxxxxxx
        id-token: eyJhbGciOiJSUzI1NiIs...
        refresh-token: 1//0eXXXXXXXXXXXXXX
        # 선택 사항
        idp-certificate-authority-data: LS0tLS1...
        extra-scopes: groups,email
```

| 필드 | 설명 |
|------|------|
| `idp-issuer-url` | OIDC Provider의 issuer URL |
| `client-id` | OAuth 2.0 클라이언트 ID |
| `client-secret` | OAuth 2.0 클라이언트 Secret |
| `id-token` | 현재 ID 토큰 (자동 갱신됨) |
| `refresh-token` | 토큰 갱신용 refresh token |

!!! info "auth-provider 방식은 deprecated"
    Kubernetes 1.26부터 `auth-provider` 방식은 공식적으로 deprecated되었습니다.
    대신 아래의 **exec 기반** 방식이 권장됩니다.
    OIDC를 exec 방식으로 사용하려면 `kubelogin` 플러그인을 활용할 수 있습니다.

    ```bash
    # kubelogin 설치 (kubectl oidc-login 플러그인)
    kubectl krew install oidc-login
    ```

### 4. exec 기반 (외부 인증 프로그램)

외부 프로그램을 실행하여 인증 토큰을 동적으로 가져오는 방식입니다. AWS EKS, GKE 등 클라우드 매니지드 Kubernetes에서 표준으로 사용됩니다.

**AWS EKS 예시:**

```yaml
users:
- name: eks-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: aws
      args:
        - eks
        - get-token
        - --cluster-name
        - my-eks-cluster
        - --region
        - ap-northeast-2
      env:
        - name: AWS_PROFILE
          value: my-aws-profile
      interactiveMode: IfAvailable
      provideClusterInfo: false
```

**GKE 예시:**

```yaml
users:
- name: gke-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: gke-gcloud-auth-plugin
      installHint: Install gke-gcloud-auth-plugin for kubectl by following
        https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl
      provideClusterInfo: true
```

**OIDC + kubelogin 예시:**

```yaml
users:
- name: oidc-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: kubectl
      args:
        - oidc-login
        - get-token
        - --oidc-issuer-url=https://keycloak.example.com/realms/k8s
        - --oidc-client-id=kubernetes
        - --oidc-client-secret=my-secret
```

| exec 필드 | 설명 |
|-----------|------|
| `apiVersion` | 보통 `client.authentication.k8s.io/v1beta1` 또는 `v1` |
| `command` | 실행할 프로그램 (PATH에 있어야 함) |
| `args` | 프로그램에 전달할 인수 목록 |
| `env` | 프로그램에 전달할 환경변수 |
| `provideClusterInfo` | `true`면 클러스터 정보를 stdin으로 전달 |
| `interactiveMode` | 터미널 상호작용 허용 여부 (`IfAvailable`, `Always`, `Never`) |

!!! tip "exec 방식의 장점"
    exec 방식은 **매 요청마다 새 토큰을 발급**받으므로, 정적 토큰처럼 만료 걱정이 없습니다.
    또한 클라우드 IAM과 연동되어 기존 권한 체계를 그대로 활용할 수 있습니다.

### 인증 방식 비교 요약

| 방식 | 보안 수준 | 관리 편의성 | 주요 사용처 |
|------|-----------|-------------|-------------|
| 인증서 기반 | 높음 | 낮음 (수동 갱신) | 자체 구축 클러스터 |
| 토큰 기반 | 중간 | 중간 | CI/CD, 서비스 자동화 |
| OIDC 기반 | 높음 | 높음 (SSO 연동) | 기업 환경, 다수 사용자 |
| exec 기반 | 높음 | 높음 (자동 갱신) | 클라우드 매니지드 (EKS, GKE) |

---

## 보안 모범 사례

kubeconfig에는 클러스터 접근 권한이 담겨 있으므로, **파일 자체의 보안**이 매우 중요합니다.

### kubeconfig 파일 권한 관리

```bash
# kubeconfig 파일 권한을 소유자만 읽기/쓰기로 제한
chmod 600 ~/.kube/config

# 소유권 확인
ls -la ~/.kube/config
# -rw------- 1 jane jane 5432 Apr 13 10:00 /home/jane/.kube/config
```

!!! warning "kubeconfig를 절대 Git에 커밋하지 마세요"
    kubeconfig에는 인증서, 토큰 등 민감 정보가 포함되어 있습니다.

    ```bash
    # .gitignore에 반드시 추가
    echo ".kube/" >> ~/.gitignore_global
    git config --global core.excludesFile ~/.gitignore_global
    ```

**kubeconfig 보안 체크리스트:**

| 항목 | 권장 사항 |
|------|-----------|
| 파일 권한 | `600` (소유자만 읽기/쓰기) |
| 저장 위치 | 로컬 디스크만, 공유 드라이브 금지 |
| 버전 관리 | Git 등에 절대 포함하지 않음 |
| 토큰 만료 | 장기 토큰 대신 시간 제한 토큰 사용 |
| 공유 | 개인별 kubeconfig 발급, 공용 계정 지양 |

### ServiceAccount 토큰과 최소 권한

자동화(CI/CD, 모니터링 등)에서는 개인 인증서 대신 **ServiceAccount**를 사용합니다. 이때 **최소 권한 원칙(Principle of Least Privilege)**을 반드시 적용합니다.

```yaml
# 1. ServiceAccount 생성
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deploy-bot
  namespace: my-app

---
# 2. Role 정의 (필요한 최소 권한만)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer-role
  namespace: my-app
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

---
# 3. RoleBinding으로 ServiceAccount에 Role 연결
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-binding
  namespace: my-app
subjects:
- kind: ServiceAccount
  name: deploy-bot
  namespace: my-app
roleRef:
  kind: Role
  name: deployer-role
  apiGroup: rbac.authorization.k8s.io
```

!!! info "Role vs ClusterRole"
    - **Role + RoleBinding**: 특정 네임스페이스 내에서만 유효
    - **ClusterRole + ClusterRoleBinding**: 클러스터 전체에서 유효

    CI/CD 봇이 특정 네임스페이스의 deployment만 업데이트한다면 `Role`로 충분합니다.
    노드 조회나 네임스페이스 생성처럼 클러스터 범위 작업이 필요하면 `ClusterRole`을 사용합니다.

### RBAC과 kubeconfig의 관계

kubeconfig의 인증 정보(user)와 RBAC은 다음과 같이 연결됩니다:

```
kubeconfig (users)          Kubernetes RBAC
┌──────────────┐            ┌──────────────────┐
│ 인증서 기반    │            │                  │
│ CN=jane      │ ──────────▶│ User: jane       │
│ O=dev-team   │ ──────────▶│ Group: dev-team  │
├──────────────┤            ├──────────────────┤
│ SA 토큰 기반   │            │                  │
│ deploy-bot   │ ──────────▶│ SA: deploy-bot   │
└──────────────┘            └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │ RoleBinding /     │
                            │ ClusterRoleBinding│
                            │                  │
                            │ → Role 권한 적용   │
                            └──────────────────┘
```

**사용자 권한 확인 명령어:**

```bash
# 현재 사용자가 특정 작업 가능한지 확인
kubectl auth can-i create deployments -n my-app
# yes

kubectl auth can-i delete nodes
# no

# 특정 사용자의 권한 확인 (관리자만 가능)
kubectl auth can-i create pods -n my-app --as=jane
kubectl auth can-i create pods -n my-app --as=system:serviceaccount:my-app:deploy-bot

# 현재 사용자의 전체 권한 목록
kubectl auth can-i --list -n my-app
```

### 환경별 kubeconfig 분리 전략

프로덕션 환경의 안전을 위해, 환경별로 kubeconfig를 분리 관리하는 것이 좋습니다.

```bash
# 환경별 kubeconfig 파일 분리
~/.kube/
├── config           # 기본 (dev용)
├── config-staging   # staging 전용
└── config-prod      # production 전용

# 프로덕션 작업 시에만 명시적으로 지정
kubectl --kubeconfig=~/.kube/config-prod get pods -n production

# 또는 별도 터미널에서 환경변수 설정
export KUBECONFIG=~/.kube/config-prod
```

!!! tip "프로덕션 실수 방지 팁"
    프로덕션 context에는 눈에 띄는 이름을 부여하고, 쉘 프롬프트에 현재 context를 표시하면 실수를 줄일 수 있습니다.

    ```bash
    # .bashrc 또는 .zshrc에 추가
    export PS1="\$(kubectl config current-context 2>/dev/null || echo 'no-ctx') $ "

    # 또는 kube-ps1 플러그인 사용
    # brew install kube-ps1
    # source "/opt/homebrew/opt/kube-ps1/share/kube-ps1.sh"
    # PS1='$(kube_ps1) $ '
    ```

---

## 정리

kubeconfig는 kubectl의 핵심 설정 파일로, **clusters**, **users**, **contexts**라는 세 가지 구성 요소의 조합으로 동작합니다.

| 개념 | 한 줄 요약 |
|------|-----------|
| kubeconfig | kubectl이 클러스터에 접속하기 위한 설정 파일 |
| cluster | API 서버 주소 + CA 인증서 |
| user | 인증 정보 (인증서, 토큰, exec 등) |
| context | cluster + user + namespace 조합 |
| current-context | 현재 활성 context |
| kubectx / kubens | context / namespace 빠른 전환 도구 |
| RBAC | kubeconfig 인증 후 "무엇을 할 수 있는지" 결정 |

다음 챕터에서는 kubeconfig에서 참조하는 **네임스페이스(Namespace)**의 개념과 실전 활용법을 다루겠습니다.
