# 5. Kubernetes YAML 매니페스트

Kubernetes에서 모든 리소스는 **YAML 매니페스트**로 정의됩니다.
이번 챕터에서는 YAML 문법 기초부터 시작하여, K8s 매니페스트의 공통 구조,
주요 리소스별 상세 작성법, 그리고 관리 도구까지 폭넓게 다룹니다.

---

## 1. YAML 기초 복습

Kubernetes 매니페스트를 작성하기 전에, YAML 문법을 확실히 짚고 넘어가겠습니다.

### 들여쓰기 규칙

YAML에서 구조는 **들여쓰기(indentation)**로 표현합니다.

- **탭(Tab) 사용 금지** — 반드시 스페이스만 사용
- 일반적으로 **2칸 스페이스**를 사용 (K8s 공식 예제 기준)
- 같은 레벨의 키는 반드시 같은 들여쓰기 깊이를 유지

```yaml
# 올바른 예시 (2칸 스페이스)
parent:
  child1: value1
  child2: value2
    # 잘못된 들여쓰기 → 파싱 에러 발생!
```

!!! warning "흔한 실수"
    YAML 파싱 에러의 80% 이상이 들여쓰기 문제입니다.
    에디터에서 **탭을 스페이스로 자동 변환**하는 설정을 반드시 켜두세요.
    VS Code에서는 `editor.insertSpaces: true`, `editor.tabSize: 2`로 설정합니다.

### 맵(Map)

맵은 **키-값(key-value) 쌍**의 모음입니다. JSON의 객체(object)에 해당합니다.

```yaml
# 블록 스타일 (가독성이 좋아 매니페스트에서 주로 사용)
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
    tier: frontend

# 플로우 스타일 (한 줄 표현, 짧은 맵에 적합)
labels: {app: my-app, tier: frontend}
```

### 리스트(List)

리스트는 **순서가 있는 항목**의 모음입니다. JSON의 배열(array)에 해당합니다.

```yaml
# 블록 스타일
containers:
  - name: nginx
    image: nginx:1.25
  - name: sidecar
    image: busybox:latest

# 플로우 스타일
ports: [80, 443, 8080]
```

### 맵과 리스트의 조합

K8s 매니페스트는 맵과 리스트가 깊게 중첩되는 구조입니다.

```yaml
spec:
  containers:              # 리스트
    - name: web            # 리스트 항목 1 (맵)
      image: nginx:1.25
      ports:               # 리스트 안의 리스트
        - containerPort: 80
        - containerPort: 443
      env:                 # 리스트
        - name: DB_HOST
          value: "db.example.com"
    - name: logger         # 리스트 항목 2 (맵)
      image: fluentd:v1.16
```

!!! tip "들여쓰기 팁"
    리스트 항목의 `-` 기호는 부모 키보다 2칸 안쪽에 위치합니다.
    `-` 뒤의 첫 번째 키와 그 아래 키들은 같은 레벨로 정렬합니다.

### 멀티라인 문자열

긴 문자열을 여러 줄로 표현할 때 두 가지 방식을 사용합니다.

#### 리터럴 블록 (`|`) — 줄바꿈 보존

```yaml
# | 를 사용하면 줄바꿈이 그대로 유지됩니다
data:
  config.ini: |
    [database]
    host=db.example.com
    port=5432
    name=mydb
```

결과: `[database]\nhost=db.example.com\nport=5432\nname=mydb\n`

#### 접힘 블록 (`>`) — 줄바꿈을 스페이스로 변환

```yaml
# > 를 사용하면 줄바꿈이 스페이스로 합쳐집니다
metadata:
  annotations:
    description: >
      이 서비스는 사용자 인증을
      담당하는 마이크로서비스입니다.
      JWT 토큰 발급 및 검증을 수행합니다.
```

결과: `이 서비스는 사용자 인증을 담당하는 마이크로서비스입니다. JWT 토큰 발급 및 검증을 수행합니다.\n`

#### 후행 줄바꿈 제어

```yaml
# |  : 마지막에 줄바꿈 1개 (기본)
# |- : 마지막 줄바꿈 제거 (strip)
# |+ : 마지막 줄바꿈 전부 보존 (keep)

script: |-
  #!/bin/bash
  echo "Hello"
  exit 0
```

!!! info "ConfigMap과 멀티라인"
    ConfigMap에 설정 파일을 통째로 넣을 때 `|`를 많이 사용합니다.
    줄바꿈이 그대로 보존되므로 설정 파일 원본과 동일한 형태를 유지할 수 있습니다.

### 앵커(&)와 별칭(*)

반복되는 값을 재사용할 때 **앵커(anchor)**와 **별칭(alias)**을 사용합니다.

```yaml
# 앵커 정의: &이름
defaults: &default-resources
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

# 별칭 참조: *이름
containers:
  - name: app
    image: my-app:v1
    resources: *default-resources    # 위에서 정의한 값을 그대로 사용
  - name: sidecar
    image: sidecar:v1
    resources: *default-resources    # 동일한 리소스 제한 적용
```

#### 맵 병합 (`<<`)

앵커의 값을 기반으로 일부만 오버라이드할 수 있습니다.

```yaml
defaults: &defaults
  env: production
  replicas: 3
  image: my-app:latest

# <<: *앵커 로 병합 후 특정 필드만 오버라이드
staging:
  <<: *defaults
  env: staging
  replicas: 1
```

결과적으로 `staging`은 `{env: staging, replicas: 1, image: my-app:latest}`가 됩니다.

!!! warning "K8s에서의 앵커 사용"
    앵커와 별칭은 YAML 파서 수준에서 동작하므로 `kubectl apply` 시
    정상적으로 해석됩니다. 단, `kubectl`이 응답으로 돌려주는 YAML에는
    앵커가 해제(resolve)된 상태로 출력됩니다.
    Kustomize나 Helm에서는 별도의 변수 시스템을 제공하므로,
    앵커보다는 해당 도구의 기능을 사용하는 것이 더 일반적입니다.

---

## 2. K8s 매니페스트 공통 구조

모든 Kubernetes 리소스 매니페스트는 **4개의 최상위 필드**로 구성됩니다.

```yaml
apiVersion: apps/v1          # API 그룹 및 버전
kind: Deployment             # 리소스 종류
metadata:                    # 리소스 메타데이터
  name: my-app
spec:                        # 리소스의 원하는 상태 (desired state)
  replicas: 3
```

### 4대 필드 상세

| 필드 | 필수 여부 | 설명 |
|------|-----------|------|
| `apiVersion` | 필수 | API 그룹과 버전. 리소스 종류에 따라 결정 |
| `kind` | 필수 | 리소스의 종류 (Pod, Deployment, Service 등) |
| `metadata` | 필수 | 리소스를 식별하는 메타정보 (name, namespace, labels 등) |
| `spec` | 대부분 필수 | 리소스의 상세 사양. 종류마다 구조가 다름 |

### apiVersion

리소스가 속한 API 그룹과 버전을 지정합니다.

| 리소스 | apiVersion | 비고 |
|--------|------------|------|
| Pod | `v1` | core 그룹 (그룹명 생략) |
| Service | `v1` | core 그룹 |
| ConfigMap | `v1` | core 그룹 |
| Secret | `v1` | core 그룹 |
| Namespace | `v1` | core 그룹 |
| Deployment | `apps/v1` | apps 그룹 |
| StatefulSet | `apps/v1` | apps 그룹 |
| DaemonSet | `apps/v1` | apps 그룹 |
| ReplicaSet | `apps/v1` | apps 그룹 |
| Ingress | `networking.k8s.io/v1` | networking 그룹 |
| NetworkPolicy | `networking.k8s.io/v1` | networking 그룹 |
| CronJob | `batch/v1` | batch 그룹 |
| Job | `batch/v1` | batch 그룹 |
| HPA | `autoscaling/v2` | autoscaling 그룹 |
| PVC | `v1` | core 그룹 |

!!! tip "apiVersion 확인 방법"
    사용 가능한 API 리소스와 버전을 확인하려면:
    ```bash
    # 클러스터에서 지원하는 전체 API 리소스 목록
    kubectl api-resources

    # 특정 리소스의 상세 정보
    kubectl explain deployment
    kubectl explain deployment.spec
    kubectl explain deployment.spec.strategy
    ```

### kind

리소스의 종류를 **PascalCase**로 지정합니다.
`kubectl api-resources` 명령으로 확인할 수 있는 `KIND` 열의 값과 동일합니다.

### metadata

리소스를 식별하고 분류하는 메타데이터입니다.

```yaml
metadata:
  name: my-web-app                    # 리소스 이름 (필수)
  namespace: production               # 네임스페이스 (생략 시 default)
  labels:                             # 라벨 (선택, 리소스 선택/필터링용)
    app.kubernetes.io/name: my-web-app
    app.kubernetes.io/version: "1.0"
    app.kubernetes.io/component: frontend
    app.kubernetes.io/part-of: web-platform
    app.kubernetes.io/managed-by: kubectl
  annotations:                        # 어노테이션 (선택, 비식별 메타정보)
    description: "메인 웹 애플리케이션"
    owner: "platform-team"
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
```

#### name

- 네임스페이스 내에서 **고유**해야 함
- 영문 소문자, 숫자, `-`, `.` 만 사용 가능
- 최대 253자
- DNS 서브도메인 규칙을 따름

#### namespace

- 리소스가 속할 네임스페이스
- 생략하면 `default` 네임스페이스에 생성
- Node, PersistentVolume, Namespace 등 일부 리소스는 네임스페이스에 속하지 않음 (cluster-scoped)

#### labels vs annotations

| 구분 | labels | annotations |
|------|--------|-------------|
| 용도 | 리소스 선택(select) 및 그룹핑 | 부가 정보 저장 |
| 셀렉터 사용 | 가능 (`kubectl -l`, `selector`) | 불가능 |
| 값 제한 | 63자 이내, 영숫자/`-`/`_`/`.` | 제한 없음 (대용량 텍스트 가능) |
| 예시 | `app: nginx`, `tier: frontend` | `description: "..."`, `prometheus.io/scrape: "true"` |

!!! info "추천 라벨 키"
    Kubernetes 공식 문서에서 권장하는 라벨 키 접두사:

    - `app.kubernetes.io/name` — 애플리케이션 이름
    - `app.kubernetes.io/instance` — 인스턴스 식별자
    - `app.kubernetes.io/version` — 버전
    - `app.kubernetes.io/component` — 컴포넌트 역할
    - `app.kubernetes.io/part-of` — 상위 시스템 이름
    - `app.kubernetes.io/managed-by` — 관리 도구 (kubectl, helm 등)

### spec

리소스의 **원하는 상태(desired state)**를 정의합니다.
리소스 종류(`kind`)에 따라 내부 구조가 완전히 다릅니다.

Kubernetes 컨트롤러는 `spec`에 정의된 상태와 현재 상태를 비교하여
지속적으로 **조정(reconciliation)**을 수행합니다.

---

## 3. Labels와 Selectors 심화

### Label 네이밍 규칙

라벨 키는 **접두사(prefix)**와 **이름(name)** 두 부분으로 구성됩니다.

```
접두사/이름
예: app.kubernetes.io/name
```

| 부분 | 규칙 |
|------|------|
| 접두사 (선택) | DNS 서브도메인 형식, 최대 253자, `/`로 이름과 구분 |
| 이름 (필수) | 최대 63자, 영문자/숫자로 시작·끝, 중간에 `-`, `_`, `.` 허용 |
| 값 | 최대 63자, 빈 문자열 허용, 영문자/숫자로 시작·끝 |

```yaml
# 좋은 라벨 예시
labels:
  app.kubernetes.io/name: api-gateway
  app.kubernetes.io/version: "2.1.0"
  environment: production
  team: platform

# 피해야 할 라벨 예시
labels:
  App Name: My App         # 공백 불가
  version: 2.1.0           # 따옴표 없으면 float으로 파싱될 수 있음
  a-very-long-label-name-that-exceeds-sixty-three-characters-limit-here: bad  # 63자 초과
```

### matchLabels vs matchExpressions

Deployment, Service 등에서 Pod를 선택할 때 두 가지 방식을 사용합니다.

#### matchLabels (등호 기반)

모든 라벨이 **AND 조건**으로 정확히 일치해야 합니다.

```yaml
selector:
  matchLabels:
    app: my-app
    tier: frontend
# → app=my-app AND tier=frontend 인 Pod만 선택
```

#### matchExpressions (집합 기반)

더 유연한 조건을 표현할 수 있습니다.

```yaml
selector:
  matchExpressions:
    - key: app
      operator: In
      values: [my-app, my-app-canary]    # app이 둘 중 하나
    - key: tier
      operator: NotIn
      values: [backend]                   # tier가 backend가 아닌 것
    - key: release
      operator: Exists                    # release 라벨이 존재하는 것
    - key: deprecated
      operator: DoesNotExist              # deprecated 라벨이 없는 것
```

| 연산자 | 설명 | values 필요 여부 |
|--------|------|------------------|
| `In` | 값이 목록 중 하나에 포함 | 필요 |
| `NotIn` | 값이 목록에 포함되지 않음 | 필요 |
| `Exists` | 해당 키를 가진 라벨이 존재 | 불필요 |
| `DoesNotExist` | 해당 키를 가진 라벨이 존재하지 않음 | 불필요 |

!!! tip "matchLabels + matchExpressions 혼용"
    두 조건을 동시에 사용하면 모두 AND로 결합됩니다.
    ```yaml
    selector:
      matchLabels:
        app: my-app
      matchExpressions:
        - key: version
          operator: In
          values: ["v1", "v2"]
    ```

### kubectl에서 Label 기반 필터링

```bash
# 등호 기반 필터
kubectl get pods -l app=my-app
kubectl get pods -l app=my-app,tier=frontend

# 부등호
kubectl get pods -l 'tier!=backend'

# 집합 기반 필터
kubectl get pods -l 'app in (my-app, my-api)'
kubectl get pods -l 'environment notin (test, staging)'
kubectl get pods -l 'release'               # release 라벨이 존재하는 것
kubectl get pods -l '!canary'               # canary 라벨이 없는 것

# 라벨 컬럼 표시
kubectl get pods --show-labels
kubectl get pods -L app,tier                # 특정 라벨만 컬럼으로 표시

# 라벨 추가/수정/삭제
kubectl label pod my-pod environment=staging
kubectl label pod my-pod environment=production --overwrite
kubectl label pod my-pod environment-                        # 삭제 (키 뒤에 -)
```

---

## 4. 주요 리소스별 매니페스트 상세

### Pod

Pod는 Kubernetes의 **최소 배포 단위**입니다.
하나 이상의 컨테이너를 포함하며, 네트워크와 스토리지를 공유합니다.

```yaml
apiVersion: v1                          # core API 그룹
kind: Pod                               # 리소스 종류: Pod
metadata:
  name: my-web-pod                      # Pod 이름
  namespace: default                    # 네임스페이스
  labels:
    app: my-web                         # 라벨: 서비스 셀렉터가 이 라벨로 Pod를 찾음
    tier: frontend
  annotations:
    description: "샘플 웹 애플리케이션 Pod"
spec:
  restartPolicy: Always                 # 재시작 정책: Always | OnFailure | Never
  containers:                           # 컨테이너 목록 (1개 이상)
    - name: web                         # 컨테이너 이름
      image: nginx:1.25-alpine          # 컨테이너 이미지
      imagePullPolicy: IfNotPresent     # 이미지 풀 정책: Always | IfNotPresent | Never
      ports:
        - name: http                    # 포트 이름 (Service에서 참조 가능)
          containerPort: 80             # 컨테이너가 리슨하는 포트
          protocol: TCP                 # 프로토콜: TCP | UDP | SCTP
      env:                              # 환경 변수
        - name: APP_ENV                 # 직접 값 지정
          value: "production"
        - name: DB_PASSWORD             # Secret에서 가져오기
          valueFrom:
            secretKeyRef:
              name: db-secret           # Secret 리소스 이름
              key: password             # Secret 내 키
        - name: CONFIG_VALUE            # ConfigMap에서 가져오기
          valueFrom:
            configMapKeyRef:
              name: app-config          # ConfigMap 리소스 이름
              key: config-key           # ConfigMap 내 키
      resources:                        # 리소스 요청 및 제한
        requests:                       # 최소 보장 리소스 (스케줄링 기준)
          cpu: "100m"                   # 100 밀리코어 = 0.1 코어
          memory: "128Mi"              # 128 메비바이트
        limits:                         # 최대 허용 리소스
          cpu: "500m"                   # 500 밀리코어 = 0.5 코어
          memory: "256Mi"              # 초과 시 OOMKilled
      volumeMounts:                     # 볼륨 마운트 지점
        - name: config-volume           # 아래 volumes에서 정의한 이름
          mountPath: /etc/config        # 컨테이너 내 마운트 경로
          readOnly: true                # 읽기 전용 여부
        - name: data-volume
          mountPath: /var/data
      livenessProbe:                    # 생존 프로브: 실패 시 컨테이너 재시작
        httpGet:                        # HTTP GET 방식
          path: /healthz                # 헬스체크 경로
          port: 80                      # 대상 포트
        initialDelaySeconds: 15         # 시작 후 첫 체크까지 대기 시간
        periodSeconds: 10               # 체크 간격
        timeoutSeconds: 3               # 타임아웃
        failureThreshold: 3             # 연속 실패 횟수 → 재시작
        successThreshold: 1             # 연속 성공 횟수 → 정상 판정
      readinessProbe:                   # 준비 프로브: 실패 시 서비스 트래픽 제외
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 3
      startupProbe:                     # 스타트업 프로브: 앱 시작이 느린 경우
        httpGet:
          path: /healthz
          port: 80
        failureThreshold: 30            # 30 x 10초 = 최대 5분까지 시작 대기
        periodSeconds: 10
  volumes:                              # Pod 레벨 볼륨 정의
    - name: config-volume               # ConfigMap을 볼륨으로 마운트
      configMap:
        name: app-config
    - name: data-volume                 # emptyDir: Pod 수명 동안 유지
      emptyDir: {}
```

!!! info "프로브(Probe) 방식 비교"
    | 방식 | 설명 | 사용 예 |
    |------|------|---------|
    | `httpGet` | HTTP GET 요청, 200~399 응답이면 성공 | 웹 서버 헬스체크 |
    | `tcpSocket` | TCP 연결 시도, 연결되면 성공 | DB, Redis 등 |
    | `exec` | 컨테이너 내 명령 실행, exit code 0이면 성공 | 파일 존재 확인, 커스텀 스크립트 |
    | `grpc` | gRPC 헬스체크 프로토콜 사용 | gRPC 서비스 |

!!! warning "resources를 반드시 설정하세요"
    `resources`를 생략하면 Pod가 노드의 리소스를 무제한으로 사용할 수 있어,
    다른 Pod에 영향을 줄 수 있습니다.
    운영 환경에서는 반드시 `requests`와 `limits`를 설정하세요.

    - `requests`: 스케줄러가 Pod를 배치할 때 참고하는 최소 보장 리소스
    - `limits`: 컨테이너가 사용할 수 있는 최대 리소스. 메모리 초과 시 OOMKilled 발생

---

### Deployment

Deployment는 **ReplicaSet을 관리**하여 Pod의 선언적 업데이트와 롤백을 지원합니다.
실무에서 Pod를 직접 생성하는 경우는 거의 없고, 대부분 Deployment를 통해 관리합니다.

```yaml
apiVersion: apps/v1                     # apps API 그룹
kind: Deployment                        # 리소스 종류: Deployment
metadata:
  name: my-web-deployment               # Deployment 이름
  namespace: default
  labels:
    app: my-web
  annotations:
    kubernetes.io/change-cause: "nginx 1.25로 업데이트"  # 롤아웃 히스토리에 표시
spec:
  replicas: 3                           # 유지할 Pod 수
  revisionHistoryLimit: 10              # 보관할 ReplicaSet 히스토리 수 (롤백용)
  selector:                             # 관리 대상 Pod 선택 (template.labels와 일치해야 함)
    matchLabels:
      app: my-web
  strategy:                             # 배포 전략
    type: RollingUpdate                 # RollingUpdate | Recreate
    rollingUpdate:
      maxSurge: 1                       # 롤링 업데이트 시 초과 허용 Pod 수 (또는 %)
      maxUnavailable: 0                 # 롤링 업데이트 시 이용 불가 허용 Pod 수 (또는 %)
  template:                             # Pod 템플릿 (여기 정의된 대로 Pod가 생성됨)
    metadata:
      labels:                           # Pod에 부여할 라벨 (selector.matchLabels와 일치 필수)
        app: my-web
        version: "1.25"
    spec:                               # Pod 스펙 (위의 Pod spec과 동일한 구조)
      containers:
        - name: web
          image: nginx:1.25-alpine
          ports:
            - name: http
              containerPort: 80
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### 배포 전략 비교

| 전략 | 동작 | 다운타임 | 사용 시나리오 |
|------|------|----------|---------------|
| `RollingUpdate` | 새 Pod를 점진적으로 생성하며 기존 Pod를 제거 | 없음 | 대부분의 무중단 배포 |
| `Recreate` | 기존 Pod를 모두 제거한 뒤 새 Pod를 생성 | 있음 | DB 마이그레이션, 볼륨 충돌 방지 등 |

#### RollingUpdate 파라미터

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%          # replicas=4일 때 최대 5개까지 동시 실행 가능
    maxUnavailable: 25%    # replicas=4일 때 최소 3개는 항상 가용 상태
```

- `maxSurge`: 업데이트 중 `replicas`보다 많이 생성할 수 있는 Pod 수
- `maxUnavailable`: 업데이트 중 사용 불가능할 수 있는 Pod 수
- 둘 다 0으로 설정할 수는 없음 (업데이트가 진행되지 않으므로)

!!! tip "롤아웃 관리 명령어"
    ```bash
    # 롤아웃 상태 확인
    kubectl rollout status deployment/my-web-deployment

    # 롤아웃 히스토리 확인
    kubectl rollout history deployment/my-web-deployment

    # 특정 리비전 상세 확인
    kubectl rollout history deployment/my-web-deployment --revision=2

    # 이전 버전으로 롤백
    kubectl rollout undo deployment/my-web-deployment

    # 특정 리비전으로 롤백
    kubectl rollout undo deployment/my-web-deployment --to-revision=3

    # 롤아웃 일시 정지/재개
    kubectl rollout pause deployment/my-web-deployment
    kubectl rollout resume deployment/my-web-deployment
    ```

---

### Service

Service는 Pod 집합에 대한 **안정적인 네트워크 엔드포인트**를 제공합니다.
Pod는 생성/삭제될 때마다 IP가 변경되지만, Service는 고정된 ClusterIP와 DNS 이름을 제공합니다.

```yaml
apiVersion: v1                          # core API 그룹
kind: Service                           # 리소스 종류: Service
metadata:
  name: my-web-service                  # Service 이름 → DNS: my-web-service.default.svc.cluster.local
  namespace: default
  labels:
    app: my-web
spec:
  type: ClusterIP                       # Service 타입
  selector:                             # 트래픽을 전달할 Pod 선택 (Pod의 labels와 매칭)
    app: my-web
  ports:
    - name: http                        # 포트 이름
      protocol: TCP                     # 프로토콜
      port: 80                          # Service가 노출하는 포트
      targetPort: 80                    # Pod에서 리슨하는 포트 (포트 이름도 가능)
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8443
  sessionAffinity: None                 # None | ClientIP (동일 클라이언트를 같은 Pod로)
```

#### Service 타입 비교

| 타입 | 접근 범위 | 설명 | 사용 시나리오 |
|------|-----------|------|---------------|
| `ClusterIP` | 클러스터 내부만 | 기본값. 클러스터 내부 IP를 할당 | 내부 마이크로서비스 간 통신 |
| `NodePort` | 클러스터 외부 | 모든 노드의 고정 포트(30000-32767)로 접근 | 개발/테스트 환경, 간단한 외부 노출 |
| `LoadBalancer` | 클러스터 외부 | 클라우드 로드밸런서를 프로비저닝 | 프로덕션 외부 서비스 노출 |
| `ExternalName` | 클러스터 내부 | 외부 DNS 이름에 대한 CNAME 매핑 | 외부 서비스를 클러스터 내 DNS로 참조 |

#### NodePort 예시

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-nodeport
spec:
  type: NodePort
  selector:
    app: my-web
  ports:
    - port: 80                          # 클러스터 내부 접근 포트
      targetPort: 80                    # Pod 포트
      nodePort: 30080                   # 노드에서 노출할 포트 (30000-32767, 생략 시 자동 할당)
```

#### LoadBalancer 예시

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"           # AWS NLB 사용
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: my-web
  ports:
    - port: 80
      targetPort: 80
```

#### ExternalName 예시

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  type: ExternalName
  externalName: db.example.com          # 외부 DNS 이름
  # selector와 ports를 정의하지 않음
```

!!! info "Service DNS 규칙"
    클러스터 내에서 Service는 다음 DNS 이름으로 접근할 수 있습니다:

    - 같은 네임스페이스: `my-web-service`
    - 다른 네임스페이스: `my-web-service.production`
    - FQDN: `my-web-service.production.svc.cluster.local`

---

## 5. kubectl apply vs create vs replace

Kubernetes 리소스를 관리하는 방식은 크게 **선언형(declarative)**과 **명령형(imperative)**으로 나뉩니다.

### 명령형 관리 (Imperative)

```bash
# kubectl create: 리소스를 처음 생성 (이미 존재하면 에러)
kubectl create -f deployment.yaml

# kubectl replace: 기존 리소스를 완전히 교체 (존재하지 않으면 에러)
kubectl replace -f deployment.yaml

# kubectl delete: 리소스 삭제
kubectl delete -f deployment.yaml
```

### 선언형 관리 (Declarative)

```bash
# kubectl apply: 리소스가 없으면 생성, 있으면 업데이트
kubectl apply -f deployment.yaml

# 디렉토리 내 모든 매니페스트 적용
kubectl apply -f ./manifests/

# 재귀적으로 하위 디렉토리까지 적용
kubectl apply -f ./manifests/ -R
```

### 비교표

| 항목 | `create` | `apply` | `replace` |
|------|----------|---------|-----------|
| 패러다임 | 명령형 | 선언형 | 명령형 |
| 리소스 없을 때 | 생성 | 생성 | 에러 |
| 리소스 있을 때 | 에러 | 부분 업데이트 (패치) | 전체 교체 |
| 변경 이력 추적 | 불가 | `last-applied-configuration` 어노테이션으로 추적 | 불가 |
| GitOps 호환성 | 낮음 | 높음 | 낮음 |
| 권장 사용 시나리오 | 일회성 작업, 스크립트 | **운영 환경 표준** | 완전한 교체가 필요한 경우 |

!!! tip "운영 환경에서는 `kubectl apply`를 사용하세요"
    `apply`는 **선언형 관리**의 핵심입니다.
    YAML 파일에 원하는 상태를 정의하고, `apply`로 적용하면
    Kubernetes가 현재 상태와 비교하여 필요한 변경만 수행합니다.
    이 패턴은 **GitOps**와 가장 잘 어울립니다.

### dry-run과 diff

실제 적용 전에 변경 사항을 미리 확인하는 것은 매우 중요합니다.

```bash
# 클라이언트 사이드 dry-run: 문법 검증만 수행 (서버 통신 없음)
kubectl apply -f deployment.yaml --dry-run=client

# 서버 사이드 dry-run: 서버에서 검증하되 실제 적용하지 않음
kubectl apply -f deployment.yaml --dry-run=server

# diff: 현재 상태와 매니페스트의 차이점을 확인
kubectl diff -f deployment.yaml
```

!!! warning "dry-run=client vs dry-run=server"
    `--dry-run=client`는 YAML 문법만 검증하므로, API 서버의 유효성 검사
    (예: 잘못된 필드 이름, 필수 필드 누락)를 잡아내지 못합니다.
    가능하면 `--dry-run=server`를 사용하세요.

```bash
# 실무 워크플로우 예시
# 1. diff로 변경 사항 확인
kubectl diff -f deployment.yaml

# 2. dry-run으로 유효성 검증
kubectl apply -f deployment.yaml --dry-run=server

# 3. 문제 없으면 실제 적용
kubectl apply -f deployment.yaml

# 4. 롤아웃 상태 확인
kubectl rollout status deployment/my-web-deployment
```

---

## 6. Kustomize & Helm 간단 소개

매니페스트를 직접 관리하는 것만으로는 환경별 설정 차이, 반복적인 구조 등을
효율적으로 처리하기 어렵습니다. **Kustomize**와 **Helm**은 이 문제를 해결하는
대표적인 도구입니다.

### Kustomize

Kustomize는 **템플릿 없이** 기존 YAML을 오버레이 방식으로 수정합니다.
kubectl에 내장되어 있어 별도 설치가 필요 없습니다.

#### 디렉토리 구조

```
k8s/
├── base/                       # 공통 매니페스트
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── overlays/
│   ├── dev/                    # 개발 환경 오버레이
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   ├── staging/                # 스테이징 환경 오버레이
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   └── production/             # 프로덕션 환경 오버레이
│       ├── kustomization.yaml
│       ├── replica-patch.yaml
│       └── hpa.yaml
```

#### base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

commonLabels:
  app: my-web
```

#### overlays/production/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base                        # base 매니페스트를 가져옴

namespace: production                  # 모든 리소스에 네임스페이스 지정

commonLabels:
  environment: production

patches:                               # 패치 적용
  - path: replica-patch.yaml

configMapGenerator:                    # ConfigMap 자동 생성
  - name: app-config
    literals:
      - APP_ENV=production
      - LOG_LEVEL=warn

images:                                # 이미지 태그 오버라이드
  - name: nginx
    newTag: "1.25-alpine"
```

#### overlays/production/replica-patch.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-deployment
spec:
  replicas: 5                          # base에서 정의한 replicas를 5로 변경
```

#### Kustomize 사용법

```bash
# 결과 미리보기 (렌더링만 수행)
kubectl kustomize overlays/production/

# 직접 적용
kubectl apply -k overlays/production/

# diff 확인
kubectl diff -k overlays/production/
```

!!! tip "Kustomize의 장점"
    - 별도 도구 설치 불필요 (kubectl 내장)
    - 원본 YAML을 수정하지 않고 환경별 차이만 관리
    - 학습 곡선이 낮음
    - GitOps 워크플로우에 적합

---

### Helm

Helm은 Kubernetes의 **패키지 매니저**입니다.
**차트(chart)**라는 패키지 형태로 매니페스트를 템플릿화하여 관리합니다.

#### Chart 기본 구조

```
my-web-chart/
├── Chart.yaml                  # 차트 메타데이터 (이름, 버전, 설명)
├── values.yaml                 # 기본 설정값
├── templates/                  # Go 템플릿 기반 매니페스트
│   ├── _helpers.tpl            # 재사용 가능한 템플릿 헬퍼
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   └── NOTES.txt               # 설치 후 출력되는 안내 메시지
└── charts/                     # 의존성 차트 (서브 차트)
```

#### Chart.yaml

```yaml
apiVersion: v2
name: my-web-chart
description: 샘플 웹 애플리케이션 Helm 차트
type: application
version: 0.1.0                  # 차트 버전
appVersion: "1.25.0"            # 애플리케이션 버전
```

#### values.yaml

```yaml
replicaCount: 3

image:
  repository: nginx
  tag: "1.25-alpine"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
```

#### templates/deployment.yaml (Go 템플릿)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-web-chart.fullname" . }}
  labels:
    {{- include "my-web-chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-web-chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-web-chart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

#### Helm 사용법

```bash
# 차트 설치
helm install my-release ./my-web-chart

# 환경별 values 파일로 설치
helm install my-release ./my-web-chart -f values-production.yaml

# 특정 값만 오버라이드
helm install my-release ./my-web-chart --set replicaCount=5

# 렌더링 결과만 확인 (실제 설치하지 않음)
helm template my-release ./my-web-chart

# 업그레이드
helm upgrade my-release ./my-web-chart

# 롤백
helm rollback my-release 1

# 릴리스 목록
helm list

# 삭제
helm uninstall my-release
```

### Kustomize vs Helm 비교

| 항목 | Kustomize | Helm |
|------|-----------|------|
| 접근 방식 | 오버레이 (패치) | 템플릿 (Go template) |
| 설치 | kubectl 내장 | 별도 설치 필요 |
| 학습 곡선 | 낮음 | 중간~높음 |
| 패키지 배포 | 불가 | 차트 리포지토리를 통한 배포 가능 |
| 조건부 로직 | 제한적 | `if/else`, `range` 등 Go 템플릿 문법 |
| 커뮤니티 차트 | 없음 | ArtifactHub에 수천 개의 공개 차트 |
| 적합한 상황 | 자체 앱, 환경별 설정 차이 관리 | 공유 가능한 패키지, 복잡한 조건부 설정 |

!!! info "Kustomize + Helm 조합"
    두 도구를 함께 사용하는 것도 가능합니다.
    Helm으로 차트를 렌더링한 결과를 Kustomize로 추가 패치하는 방식으로,
    공개 차트를 커스터마이징할 때 유용합니다.
    ```bash
    # Helm 렌더링 결과를 Kustomize base로 사용
    helm template my-release bitnami/nginx > base/nginx.yaml
    kubectl apply -k overlays/production/
    ```

---

## 정리

이번 챕터에서 다룬 핵심 내용을 정리합니다.

| 주제 | 핵심 포인트 |
|------|-------------|
| YAML 기초 | 스페이스 들여쓰기, 맵/리스트 조합, `\|`/`>` 멀티라인, 앵커/별칭 |
| 매니페스트 구조 | `apiVersion`, `kind`, `metadata`, `spec` 4대 필드 |
| Labels/Selectors | `matchLabels`(등호), `matchExpressions`(집합), `kubectl -l` 필터링 |
| Pod | containers, probes, resources, volumeMounts |
| Deployment | replicas, strategy(RollingUpdate/Recreate), template, 롤백 |
| Service | ClusterIP, NodePort, LoadBalancer, ExternalName |
| 리소스 관리 | `apply`(선언형) vs `create`/`replace`(명령형), dry-run, diff |
| 도구 | Kustomize(오버레이), Helm(템플릿+패키지) |

!!! tip "다음 단계"
    YAML 매니페스트 작성에 익숙해졌다면, 실제로 매니페스트를 작성하고
    `kubectl apply`로 적용해보세요.
    `kubectl explain <리소스>.<필드>`를 활용하면 매니페스트 작성 시
    필드 이름과 타입을 빠르게 확인할 수 있습니다.
