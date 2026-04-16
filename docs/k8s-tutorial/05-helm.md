# Helm 심화 — Kubernetes 패키지 매니저

!!! info "이 챕터의 위치"
    [5장 YAML 매니페스트](05-yaml-manifests.md)에서 Helm의 기본 개념을 소개했습니다.
    이 페이지에서는 **실전에서 Helm Chart를 찾고, values.yaml로 커스터마이징하고,
    배포하는 전체 과정**을 깊이 있게 다룹니다.

---

## 1. 왜 Helm이 필요한가?

Kubernetes에 애플리케이션을 배포하려면 Deployment, Service, ConfigMap, Secret,
Ingress, ServiceAccount, RBAC 등 **수많은 YAML 매니페스트**를 작성해야 합니다.

```
# Airflow를 K8s에 배포할 때 필요한 리소스 (최소)
airflow/
├── namespace.yaml
├── serviceaccount.yaml
├── role.yaml
├── rolebinding.yaml
├── configmap-airflow-cfg.yaml
├── secret-db-credentials.yaml
├── secret-fernet-key.yaml
├── deployment-webserver.yaml
├── deployment-scheduler.yaml
├── service-webserver.yaml
├── statefulset-postgresql.yaml
├── service-postgresql.yaml
├── pvc-logs.yaml
├── pvc-dags.yaml
├── ingress.yaml
└── hpa.yaml
```

15개 이상의 YAML 파일을 직접 작성하고, 환경(dev/stg/prd)마다 값을 바꾸고,
버전 관리하고, 업그레이드/롤백까지 수동으로 처리해야 합니다.

**Helm**은 이 문제를 해결합니다:

| 문제 | Helm의 해결 방식 |
|------|-----------------|
| 수십 개의 YAML 파일 관리 | **Chart** — 관련 리소스를 하나의 패키지로 묶음 |
| 환경별 설정 차이 | **values.yaml** — 하나의 파일로 모든 설정을 제어 |
| 버전 관리 / 롤백 | **Release** — 설치 이력 관리, 한 줄 명령으로 롤백 |
| 공유 / 재사용 | **Chart Repository** — npm/pip처럼 차트를 배포·검색 |

---

## 2. Helm 핵심 개념

### 2.1 3대 구성 요소

<div class="k8s-diagram">
<div class="k8s-diagram-title">Helm 핵심 구성 요소</div>
<div class="k8s-helm-concepts">
  <div class="k8s-helm-concept-card k8s-helm-chart-card">
    <div class="k8s-helm-concept-icon">📦</div>
    <div class="k8s-helm-concept-name">Chart</div>
    <div class="k8s-helm-concept-desc">K8s 리소스를 정의한 <strong>패키지</strong><br>템플릿 + 기본값 + 메타데이터</div>
  </div>
  <div class="k8s-helm-concept-arrow">+</div>
  <div class="k8s-helm-concept-card k8s-helm-values-card">
    <div class="k8s-helm-concept-icon">⚙️</div>
    <div class="k8s-helm-concept-name">Values</div>
    <div class="k8s-helm-concept-desc">사용자가 주입하는 <strong>설정값</strong><br>환경별 커스터마이징의 핵심</div>
  </div>
  <div class="k8s-helm-concept-arrow">=</div>
  <div class="k8s-helm-concept-card k8s-helm-release-card">
    <div class="k8s-helm-concept-icon">🚀</div>
    <div class="k8s-helm-concept-name">Release</div>
    <div class="k8s-helm-concept-desc">Chart의 <strong>실행 인스턴스</strong><br>설치 이력, 리비전 관리, 롤백 가능</div>
  </div>
</div>
</div>

```
Chart(패키지 정의) + Values(사용자 설정) = Release(클러스터에 배포된 인스턴스)
```

같은 Chart로 여러 Release를 만들 수 있습니다:

```bash
# 같은 Airflow Chart로 dev/prd 두 환경에 각각 배포
helm install airflow-dev apache-airflow/airflow -f values-dev.yaml -n airflow-dev
helm install airflow-prd apache-airflow/airflow -f values-prd.yaml -n airflow-prd
```

### 2.2 Chart Repository

Helm Chart는 **Chart Repository**(HTTP 서버)나 **OCI Registry**를 통해 배포됩니다.

```bash
# Repository 추가 (기존 방식)
helm repo add apache-airflow https://airflow.apache.org
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# OCI Registry (Helm 3.8+, 최신 방식)
helm pull oci://registry-1.docker.io/bitnamicharts/postgresql
```

---

## 3. 공식 Helm Chart 찾기 — ArtifactHub

### 3.1 ArtifactHub란?

[ArtifactHub](https://artifacthub.io)는 Kubernetes 패키지(Helm Chart, OPA 정책,
Falco 규칙 등)의 **중앙 검색 허브**입니다. CNCF 프로젝트로, 수천 개의 공개 차트를
검색·비교할 수 있습니다.

!!! tip "좋은 Chart 고르는 기준"
    | 기준 | 확인 포인트 |
    |------|------------|
    | **공식 여부** | `Official` 배지, 프로젝트 공식 repo 여부 |
    | **활발한 유지보수** | 최근 업데이트 날짜, 릴리스 빈도 |
    | **문서 품질** | values.yaml 설명, 예제, 아키텍처 다이어그램 |
    | **다운로드 수** | 커뮤니티 검증 지표 |
    | **시큐리티 스캔** | 알려진 취약점(CVE) 유무 |

### 3.2 Airflow 공식 Helm Chart

Apache Airflow는 공식 Helm Chart를 직접 관리합니다.

| 항목 | 정보 |
|------|------|
| **ArtifactHub** | `artifacthub.io` → "apache airflow" 검색 |
| **공식 문서** | [airflow.apache.org/docs/helm-chart/stable](https://airflow.apache.org/docs/helm-chart/stable/index.html) |
| **GitHub** | [github.com/apache/airflow → chart/](https://github.com/apache/airflow/tree/main/chart) |
| **values.yaml 전체** | [chart/values.yaml](https://github.com/apache/airflow/blob/main/chart/values.yaml) — 약 1,500줄 |
| **Repo 주소** | `https://airflow.apache.org` |

```bash
# 1. Repo 추가
helm repo add apache-airflow https://airflow.apache.org
helm repo update

# 2. 사용 가능한 Chart 버전 확인
helm search repo apache-airflow/airflow --versions

# 3. 기본 values.yaml 다운로드 (커스터마이징의 출발점)
helm show values apache-airflow/airflow > values.yaml

# 4. Chart 정보 확인
helm show chart apache-airflow/airflow
```

!!! info "helm show values — 가장 중요한 명령어"
    `helm show values`로 다운로드한 `values.yaml`이 바로 **커스터마이징의 출발점**입니다.
    이 파일의 모든 키가 `{{ .Values.xxx }}`로 템플릿에서 참조됩니다.
    공식 문서와 함께 이 파일을 읽으면 어떤 설정이 가능한지 파악할 수 있습니다.

---

## 4. Chart 구조 해부

### 4.1 디렉토리 구조

<div class="k8s-diagram">
<div class="k8s-diagram-title">Helm Chart 디렉토리 구조</div>
<div class="k8s-helm-tree">
  <div class="k8s-helm-tree-item k8s-helm-tree-root">my-chart/</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-meta">├── Chart.yaml<span class="k8s-helm-tree-desc">— 차트 메타데이터 (이름, 버전, 의존성)</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-values">├── values.yaml<span class="k8s-helm-tree-desc">— 기본 설정값 (사용자가 오버라이드할 대상)</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl">├── templates/<span class="k8s-helm-tree-desc">— Go 템플릿으로 작성된 K8s 매니페스트</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── deployment.yaml</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── service.yaml</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── ingress.yaml</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── configmap.yaml</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── _helpers.tpl<span class="k8s-helm-tree-desc">— 재사용 가능한 템플릿 헬퍼</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   ├── NOTES.txt<span class="k8s-helm-tree-desc">— 설치 후 출력되는 안내 메시지</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-tpl-sub">│   └── tests/</div>
  <div class="k8s-helm-tree-item k8s-helm-tree-etc">├── charts/<span class="k8s-helm-tree-desc">— 하위 의존 차트 (서브차트)</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-etc">├── crds/<span class="k8s-helm-tree-desc">— Custom Resource Definitions</span></div>
  <div class="k8s-helm-tree-item k8s-helm-tree-etc">└── .helmignore<span class="k8s-helm-tree-desc">— 패키징 시 제외할 파일</span></div>
</div>
</div>

### 4.2 Chart.yaml

```yaml
apiVersion: v2                    # Helm 3 = v2, Helm 2 = v1
name: airflow                     # 차트 이름
version: 1.15.0                   # 차트 버전 (SemVer)
appVersion: "2.10.4"              # 배포할 앱 버전
description: Apache Airflow Helm Chart
type: application                 # application 또는 library
home: https://airflow.apache.org/
icon: https://airflow.apache.org/images/airflow_dark_bg.png

# 서브차트 의존성 — helm dependency update로 다운로드
dependencies:
  - name: postgresql              # (1)!
    version: "13.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled  # (2)!
  - name: redis
    version: "18.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

1. Airflow Chart가 PostgreSQL Chart를 **서브차트**로 포함합니다. `helm dependency update`를 실행하면 `charts/` 폴더에 자동으로 다운로드됩니다.
2. `condition` 필드: `values.yaml`에서 `postgresql.enabled: false`로 설정하면 이 서브차트를 **비활성화**할 수 있습니다. 외부 DB를 사용할 때 유용합니다.

### 4.3 values.yaml — 설정의 중심

`values.yaml`은 Chart의 **모든 설정 가능한 옵션**을 기본값과 함께 정의합니다.
사용자는 이 파일을 복사해서 자신의 환경에 맞게 수정합니다.

```yaml
# values.yaml (Airflow Chart의 핵심 설정 — 간략화)

# ── 실행 모드 ──
executor: KubernetesExecutor      # (1)!

# ── 이미지 설정 ──
images:
  airflow:
    repository: apache/airflow
    tag: 2.10.4                   # (2)!
    pullPolicy: IfNotPresent

# ── Webserver ──
webserver:
  replicas: 2                     # (3)!
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "1"
      memory: "2Gi"
  service:
    type: ClusterIP               # (4)!
  defaultUser:
    enabled: true
    username: admin
    password: admin

# ── Scheduler ──
scheduler:
  replicas: 2                     # Airflow 2.x HA Scheduler

# ── DAG 동기화 ──
dags:
  gitSync:
    enabled: true                 # (5)!
    repo: https://github.com/myorg/airflow-dags.git
    branch: main
    subPath: dags
    wait: 60

# ── 데이터베이스 ──
postgresql:
  enabled: false                  # (6)!

data:
  metadataConnection:
    protocol: postgresql
    host: my-rds.xxxxx.ap-northeast-1.rds.amazonaws.com
    port: 5432
    db: airflow
    user: airflow
    pass: ""                      # Secret으로 관리

# ── Ingress ──
ingress:
  web:
    enabled: true
    ingressClassName: nginx
    hosts:
      - name: airflow.example.com

# ── 모니터링 ──
statsd:
  enabled: true                   # Prometheus 연동
```

1. `CeleryExecutor`, `KubernetesExecutor`, `LocalExecutor` 중 선택. K8s 환경에서는 `KubernetesExecutor`가 가장 효율적입니다.
2. 특정 버전을 고정(pin)하면 예기치 않은 업그레이드를 방지할 수 있습니다.
3. Webserver를 2개로 실행하면 고가용성(HA)을 확보합니다.
4. Ingress를 사용할 것이므로 ClusterIP로 설정합니다.
5. git-sync는 DAG 배포의 가장 권장되는 방식입니다. DAG 파일 수정만으로 자동 반영됩니다.
6. 프로덕션에서는 내장 PostgreSQL 대신 외부 관리형 DB(RDS, Cloud SQL)를 사용하세요.

---

## 5. Values → Template 렌더링 원리

Helm의 핵심 동작은 단순합니다:
**values.yaml의 값**을 **Go 템플릿**에 주입하여 **최종 K8s 매니페스트**를 생성합니다.

### 5.1 렌더링 흐름

<div class="k8s-diagram">
<div class="k8s-diagram-title">Helm 렌더링 파이프라인</div>
<div class="k8s-helm-pipeline">
  <div class="k8s-helm-pipe-stage k8s-helm-pipe-values">
    <div class="k8s-helm-pipe-label">values.yaml</div>
    <div class="k8s-helm-pipe-content">replicaCount: 3<br>image.tag: "2.10.4"<br>service.type: ClusterIP</div>
  </div>
  <div class="k8s-helm-pipe-arrow">→</div>
  <div class="k8s-helm-pipe-stage k8s-helm-pipe-template">
    <div class="k8s-helm-pipe-label">Go Template</div>
    <div class="k8s-helm-pipe-content">replicas: {{ .Values.replicaCount }}<br>image: {{ .Values.image.tag }}<br>type: {{ .Values.service.type }}</div>
  </div>
  <div class="k8s-helm-pipe-arrow">→</div>
  <div class="k8s-helm-pipe-stage k8s-helm-pipe-manifest">
    <div class="k8s-helm-pipe-label">K8s Manifest</div>
    <div class="k8s-helm-pipe-content">replicas: 3<br>image: "2.10.4"<br>type: ClusterIP</div>
  </div>
  <div class="k8s-helm-pipe-arrow">→</div>
  <div class="k8s-helm-pipe-stage k8s-helm-pipe-cluster">
    <div class="k8s-helm-pipe-label">K8s Cluster</div>
    <div class="k8s-helm-pipe-content">kubectl apply<br>(Helm이 자동 실행)</div>
  </div>
</div>
</div>

### 5.2 Go 템플릿 문법

템플릿 파일(`templates/*.yaml`)에서 `{{ }}` 안에 Go 템플릿 문법을 사용합니다.

#### 값 참조

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "airflow.fullname" . }}      # (1)!
  labels:
    {{- include "airflow.labels" . | nindent 4 }}  # (2)!
spec:
  replicas: {{ .Values.webserver.replicas }}     # (3)!
  template:
    spec:
      containers:
        - name: webserver
          image: "{{ .Values.images.airflow.repository }}:{{ .Values.images.airflow.tag }}"
          resources:
            {{- toYaml .Values.webserver.resources | nindent 12 }}  # (4)!
```

1. `include` — `_helpers.tpl`에 정의된 Named Template을 호출합니다.
2. `nindent 4` — 결과를 4칸 들여쓰기합니다. YAML 구조를 유지하는 핵심 함수입니다.
3. `.Values.xxx` — `values.yaml`의 값을 참조합니다. 점(`.`)으로 중첩 키에 접근합니다.
4. `toYaml` — Go 맵/리스트를 YAML 문자열로 변환합니다.

#### 조건부 렌더링

```yaml
# Ingress가 활성화된 경우에만 리소스 생성
{{- if .Values.ingress.web.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "airflow.fullname" . }}-web
spec:
  ingressClassName: {{ .Values.ingress.web.ingressClassName }}
  rules:
    {{- range .Values.ingress.web.hosts }}       # (1)!
    - host: {{ .name }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "airflow.fullname" $ }}-webserver
                port:
                  number: 8080
    {{- end }}
{{- end }}
```

1. `range` — 리스트를 순회합니다. `hosts:` 아래 항목들을 하나씩 처리합니다.

#### 주요 템플릿 함수

| 함수 | 설명 | 예시 |
|------|------|------|
| `{{ .Values.key }}` | values에서 값 읽기 | `{{ .Values.executor }}` |
| `{{ .Release.Name }}` | Release 이름 | `airflow-prd` |
| `{{ .Release.Namespace }}` | 설치 Namespace | `airflow-prd` |
| `{{ .Chart.Name }}` | Chart 이름 | `airflow` |
| `{{ .Chart.AppVersion }}` | 앱 버전 | `2.10.4` |
| `include "name" .` | Named Template 호출 | `include "airflow.fullname" .` |
| `toYaml` | 맵/리스트를 YAML로 변환 | `toYaml .Values.resources` |
| `nindent N` | N칸 들여쓰기 | `nindent 8` |
| `default "val"` | 기본값 지정 | `default "latest" .Values.tag` |
| `quote` | 문자열을 따옴표로 감싸기 | `quote .Values.password` |
| `b64enc` | Base64 인코딩 | `b64enc .Values.secret` |
| `if / else / end` | 조건부 렌더링 | 리소스 선택적 생성 |
| `range / end` | 반복 | 리스트 순회 |
| `with / end` | 스코프 변경 | 중첩 값 접근 간소화 |

### 5.3 인터랙티브 데모: Values → Manifest 렌더링

values.yaml의 값을 변경하면 최종 매니페스트가 어떻게 바뀌는지 확인해보세요.

<div class="k8s-diagram">
<div class="k8s-diagram-title">values.yaml → 렌더링 결과 시뮬레이터</div>
<div class="k8s-scenarios k8s-helm-render-btns">
  <span class="k8s-scenario-title">시나리오 선택:</span>
  <button class="k8s-scenario-btn" onclick="k8sHelmRender('dev')">Dev 환경</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmRender('prd')">Prd 환경</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmRender('custom')">커스텀 이미지</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmRender('ha')">고가용성(HA)</button>
</div>
<div class="k8s-helm-render-panels">
  <div class="k8s-helm-render-panel k8s-helm-render-input">
    <div class="k8s-helm-render-panel-title">📝 values.yaml (입력)</div>
    <pre id="k8s-helm-values-display" class="k8s-helm-render-code">← 시나리오를 선택하세요</pre>
  </div>
  <div class="k8s-helm-render-arrow-col">
    <div class="k8s-helm-render-arrow-label">helm<br>template</div>
    <div class="k8s-helm-render-arrow-icon">→</div>
  </div>
  <div class="k8s-helm-render-panel k8s-helm-render-output">
    <div class="k8s-helm-render-panel-title">📄 렌더링된 Manifest (출력)</div>
    <pre id="k8s-helm-manifest-display" class="k8s-helm-render-code">← 시나리오를 선택하세요</pre>
  </div>
</div>
</div>

!!! tip "실제로 확인하는 방법"
    ```bash
    # helm template — 실제 설치 없이 렌더링 결과만 확인
    helm template my-airflow apache-airflow/airflow \
      -f values-prd.yaml \
      --show-only templates/webserver/webserver-deployment.yaml
    ```
    `--show-only`로 특정 템플릿만 확인할 수 있어 디버깅에 매우 유용합니다.

---

## 6. Values 오버라이드 전략

### 6.1 오버라이드 우선순위

Helm은 여러 소스에서 values를 병합합니다. **나중에 지정된 값이 우선**합니다.

<div class="k8s-diagram">
<div class="k8s-diagram-title">Values 오버라이드 우선순위 (낮음 → 높음)</div>
<div class="k8s-helm-priority">
  <div class="k8s-helm-priority-item k8s-helm-prio-1">
    <div class="k8s-helm-prio-rank">1</div>
    <div class="k8s-helm-prio-content">
      <div class="k8s-helm-prio-name">Chart의 values.yaml</div>
      <div class="k8s-helm-prio-desc">차트에 내장된 기본값 — 가장 낮은 우선순위</div>
    </div>
  </div>
  <div class="k8s-helm-prio-arrow">▼ 오버라이드</div>
  <div class="k8s-helm-priority-item k8s-helm-prio-2">
    <div class="k8s-helm-prio-rank">2</div>
    <div class="k8s-helm-prio-content">
      <div class="k8s-helm-prio-name">부모 Chart의 values.yaml</div>
      <div class="k8s-helm-prio-desc">서브차트의 값을 부모에서 오버라이드</div>
    </div>
  </div>
  <div class="k8s-helm-prio-arrow">▼ 오버라이드</div>
  <div class="k8s-helm-priority-item k8s-helm-prio-3">
    <div class="k8s-helm-prio-rank">3</div>
    <div class="k8s-helm-prio-content">
      <div class="k8s-helm-prio-name">-f values-prd.yaml (파일)</div>
      <div class="k8s-helm-prio-desc">여러 -f 파일 지정 시, 마지막 파일이 우선</div>
    </div>
  </div>
  <div class="k8s-helm-prio-arrow">▼ 오버라이드</div>
  <div class="k8s-helm-priority-item k8s-helm-prio-4">
    <div class="k8s-helm-prio-rank">4</div>
    <div class="k8s-helm-prio-content">
      <div class="k8s-helm-prio-name">--set key=value (CLI)</div>
      <div class="k8s-helm-prio-desc">가장 높은 우선순위 — 긴급 변경, CI/CD에서 사용</div>
    </div>
  </div>
</div>
</div>

```bash
# 실전 예시: 3개 레이어 오버라이드
helm install airflow apache-airflow/airflow \
  -f values.yaml \               # 기본 설정 (공통)
  -f values-prd.yaml \            # 환경별 오버라이드
  --set images.airflow.tag=2.10.5 # 긴급 버전 변경 (최우선)
  --namespace airflow-prd
```

### 6.2 환경별 values 파일 패턴

```
helm-values/
├── values.yaml           # 공통 설정 — 모든 환경에 적용
├── values-dev.yaml       # Dev: LocalExecutor, replica 1개
├── values-stg.yaml       # Staging: KubernetesExecutor, replica 1개
└── values-prd.yaml       # Production: KubernetesExecutor, replica 2개
```

=== "values.yaml (공통)"

    ```yaml
    # 모든 환경에서 동일한 설정
    images:
      airflow:
        repository: my-registry.example.com/airflow
        tag: "2.10.4"

    dags:
      gitSync:
        enabled: true
        repo: https://github.com/myorg/airflow-dags.git
        subPath: dags

    statsd:
      enabled: true
    ```

=== "values-dev.yaml"

    ```yaml
    # Dev 환경 오버라이드
    executor: LocalExecutor      # 단순한 로컬 실행

    webserver:
      replicas: 1                # 최소 리소스
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"

    scheduler:
      replicas: 1

    postgresql:
      enabled: true              # 내장 PostgreSQL 사용

    ingress:
      web:
        enabled: false           # 포트포워딩으로 접근
    ```

=== "values-prd.yaml"

    ```yaml
    # Production 환경 오버라이드
    executor: KubernetesExecutor

    webserver:
      replicas: 2                # 고가용성
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"

    scheduler:
      replicas: 2

    postgresql:
      enabled: false             # 외부 RDS 사용

    data:
      metadataConnection:
        protocol: postgresql
        host: airflow-db.xxxxx.rds.amazonaws.com
        port: 5432
        db: airflow
        existingSecret: airflow-db-credentials

    ingress:
      web:
        enabled: true
        ingressClassName: nginx
        hosts:
          - name: airflow.example.com
            tls:
              enabled: true
              secretName: airflow-tls
    ```

### 6.3 서브차트 값 오버라이드

Airflow Chart에 포함된 PostgreSQL 서브차트의 값도 부모 `values.yaml`에서 제어합니다.

```yaml
# values.yaml — 서브차트 오버라이드
postgresql:                       # ← 서브차트 이름이 키
  enabled: true                   # 서브차트 활성화/비활성화
  auth:
    username: airflow
    password: airflow-password
    database: airflow
  primary:
    persistence:
      size: 20Gi
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
```

서브차트의 `values.yaml` 전체를 볼 수 있습니다:

```bash
# 서브차트 values 확인
helm show values bitnami/postgresql

# 의존성 다운로드 (charts/ 폴더에 저장)
helm dependency update ./my-chart

# 의존성 목록 확인
helm dependency list ./my-chart
```

---

## 7. Helm 명령어 라이프사이클

### 7.1 전체 흐름

<div class="k8s-diagram">
<div class="k8s-diagram-title">Helm Release 라이프사이클</div>
<div class="k8s-helm-lifecycle">
  <div class="k8s-helm-lc-stage k8s-helm-lc-search">
    <div class="k8s-helm-lc-icon">🔍</div>
    <div class="k8s-helm-lc-name">Search</div>
    <div class="k8s-helm-lc-cmd">helm search repo</div>
  </div>
  <div class="k8s-helm-lc-arrow">→</div>
  <div class="k8s-helm-lc-stage k8s-helm-lc-inspect">
    <div class="k8s-helm-lc-icon">📋</div>
    <div class="k8s-helm-lc-name">Inspect</div>
    <div class="k8s-helm-lc-cmd">helm show values</div>
  </div>
  <div class="k8s-helm-lc-arrow">→</div>
  <div class="k8s-helm-lc-stage k8s-helm-lc-test">
    <div class="k8s-helm-lc-icon">🧪</div>
    <div class="k8s-helm-lc-name">Dry Run</div>
    <div class="k8s-helm-lc-cmd">helm template</div>
  </div>
  <div class="k8s-helm-lc-arrow">→</div>
  <div class="k8s-helm-lc-stage k8s-helm-lc-install">
    <div class="k8s-helm-lc-icon">🚀</div>
    <div class="k8s-helm-lc-name">Install</div>
    <div class="k8s-helm-lc-cmd">helm install</div>
  </div>
  <div class="k8s-helm-lc-arrow">→</div>
  <div class="k8s-helm-lc-stage k8s-helm-lc-upgrade">
    <div class="k8s-helm-lc-icon">⬆️</div>
    <div class="k8s-helm-lc-name">Upgrade</div>
    <div class="k8s-helm-lc-cmd">helm upgrade</div>
  </div>
  <div class="k8s-helm-lc-arrow">→</div>
  <div class="k8s-helm-lc-stage k8s-helm-lc-rollback">
    <div class="k8s-helm-lc-icon">⏪</div>
    <div class="k8s-helm-lc-name">Rollback</div>
    <div class="k8s-helm-lc-cmd">helm rollback</div>
  </div>
</div>
</div>

### 7.2 인터랙티브 데모: Helm 명령어 체험

<div class="k8s-diagram">
<div class="k8s-diagram-title">Helm 명령어 터미널</div>
<div class="k8s-scenarios k8s-helm-cmd-btns">
  <span class="k8s-scenario-title">명령어:</span>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('search')">search</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('show')">show values</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('template')">template</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('install')">install</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('list')">list</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('upgrade')">upgrade</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('history')">history</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('rollback')">rollback</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmCmd('uninstall')">uninstall</button>
</div>
<div class="interactive-terminal" style="border-radius:0 0 10px 10px;">
  <div class="terminal-body" id="k8s-helm-term" style="min-height:200px; max-height:400px; overflow-y:auto;">
    <span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>
  </div>
</div>
</div>

### 7.3 명령어 상세

#### 검색 & 확인

```bash
# 로컬 repo 캐시에서 검색
helm search repo airflow

# ArtifactHub에서 검색
helm search hub airflow

# 특정 Chart 정보
helm show chart apache-airflow/airflow    # 메타데이터
helm show values apache-airflow/airflow   # values.yaml 전체
helm show readme apache-airflow/airflow   # README
helm show all apache-airflow/airflow      # 모든 정보
```

#### 렌더링 테스트

```bash
# 렌더링 결과만 출력 (클러스터에 적용하지 않음)
helm template my-airflow apache-airflow/airflow \
  -f values-prd.yaml

# 특정 템플릿만 렌더링
helm template my-airflow apache-airflow/airflow \
  -f values-prd.yaml \
  --show-only templates/webserver/webserver-deployment.yaml

# dry-run — 클러스터 검증 포함 (실제 적용은 안 함)
helm install my-airflow apache-airflow/airflow \
  -f values-prd.yaml \
  --dry-run --debug
```

!!! warning "template vs dry-run 차이"
    - `helm template`: 클러스터 연결 **불필요**, 순수 렌더링만 수행
    - `--dry-run`: 클러스터에 연결하여 **유효성 검증**까지 수행 (실제 적용은 안 함)

    CI/CD에서 values 문법 검증 → `template`, 배포 전 최종 확인 → `--dry-run`

#### 설치 & 업그레이드

```bash
# 설치
helm install airflow apache-airflow/airflow \
  -f values.yaml \
  -f values-prd.yaml \
  --namespace airflow-prd \
  --create-namespace

# 업그레이드 (values 변경 또는 Chart 버전 업)
helm upgrade airflow apache-airflow/airflow \
  -f values.yaml \
  -f values-prd.yaml \
  --namespace airflow-prd

# install + upgrade 통합 (없으면 설치, 있으면 업그레이드)
helm upgrade --install airflow apache-airflow/airflow \
  -f values.yaml \
  -f values-prd.yaml \
  --namespace airflow-prd \
  --create-namespace
```

!!! tip "upgrade --install 패턴"
    `helm upgrade --install`은 **멱등성**을 보장합니다.
    Release가 없으면 설치하고, 있으면 업그레이드합니다.
    CI/CD 파이프라인에서 가장 많이 사용하는 패턴입니다.

#### 이력 & 롤백

```bash
# Release 목록
helm list -n airflow-prd

# 리비전 이력
helm history airflow -n airflow-prd

# 롤백 (리비전 번호 지정)
helm rollback airflow 2 -n airflow-prd

# 바로 이전 리비전으로 롤백
helm rollback airflow 0 -n airflow-prd

# 삭제
helm uninstall airflow -n airflow-prd
```

---

## 8. 실전: Airflow Helm Chart 배포 시나리오

### 8.1 인터랙티브 데모: 배포 시나리오 체험

실제 Airflow를 Helm으로 배포하는 단계별 시나리오를 체험해보세요.

<div class="k8s-diagram">
<div class="k8s-diagram-title">Airflow Helm 배포 시나리오</div>
<div class="k8s-scenarios k8s-helm-scenario-btns">
  <span class="k8s-scenario-title">시나리오:</span>
  <button class="k8s-scenario-btn" onclick="k8sHelmScenario('firstinstall')">첫 설치</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmScenario('valueschange')">Values 변경</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmScenario('chartupgrade')">Chart 업그레이드</button>
  <button class="k8s-scenario-btn" onclick="k8sHelmScenario('rollback')">장애 → 롤백</button>
</div>
<div class="k8s-scenario-text" id="k8s-helm-scenario-text"></div>
</div>

### 8.2 배포 전 체크리스트

```bash
# 1. Namespace 준비
kubectl create namespace airflow-prd

# 2. Secret 생성 (DB 비밀번호, Fernet Key 등)
kubectl create secret generic airflow-db-credentials \
  --from-literal=connection="postgresql://airflow:PASSWORD@rds-host:5432/airflow" \
  -n airflow-prd

# 3. values 렌더링 확인
helm template airflow apache-airflow/airflow \
  -f values.yaml -f values-prd.yaml -n airflow-prd | less

# 4. dry-run으로 검증
helm install airflow apache-airflow/airflow \
  -f values.yaml -f values-prd.yaml \
  -n airflow-prd --dry-run

# 5. 실제 설치
helm install airflow apache-airflow/airflow \
  -f values.yaml -f values-prd.yaml \
  -n airflow-prd

# 6. 배포 상태 확인
helm status airflow -n airflow-prd
kubectl get pods -n airflow-prd -w
```

### 8.3 자주 하는 실수와 해결법

| 실수 | 원인 | 해결 |
|------|------|------|
| values 변경이 반영 안 됨 | `helm upgrade` 시 `-f values.yaml` 누락 | **모든** values 파일을 매번 지정 |
| 서브차트 Pod가 안 뜸 | `postgresql.enabled: true`인데 PVC 없음 | StorageClass 확인 또는 외부 DB 사용 |
| "rendered manifests contain a resource that already exists" | 같은 이름의 리소스가 이미 존재 | `kubectl delete` 후 재설치, 또는 `--force` |
| `helm upgrade` 후 Pod 변경 없음 | ConfigMap/Secret 변경을 Deployment가 감지 못 함 | annotations에 checksum 추가 (아래 참조) |

**ConfigMap 변경 시 Pod 재시작 트릭**:

```yaml
# templates/deployment.yaml
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

values에서 ConfigMap 내용이 바뀌면 checksum이 달라지고 → annotation이 바뀌고 →
Deployment가 새로운 Pod를 생성합니다.

---

## 9. 자체 Chart 만들기

공개 Chart를 사용하는 것 외에, 자체 애플리케이션용 Chart를 직접 만들 수도 있습니다.

### 9.1 Chart 생성

```bash
# 스캐폴딩 — 기본 구조를 자동 생성
helm create my-app

# 생성된 구조
my-app/
├── Chart.yaml
├── values.yaml
├── charts/
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── _helpers.tpl
│   ├── NOTES.txt
│   └── tests/
│       └── test-connection.yaml
└── .helmignore
```

### 9.2 _helpers.tpl — 재사용 가능한 템플릿

```yaml
# templates/_helpers.tpl

# 차트 풀네임 생성
{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

# 공통 라벨
{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

# Selector 라벨
{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### 9.3 차트 패키징 & 배포

```bash
# 문법 검증
helm lint ./my-app

# 패키징 (*.tgz 파일 생성)
helm package ./my-app
# → my-app-0.1.0.tgz

# OCI Registry에 푸시 (Helm 3.8+)
helm push my-app-0.1.0.tgz oci://my-registry.example.com/charts

# 로컬 테스트 설치
helm install my-release ./my-app -f my-values.yaml
```

---

## 10. Helm 모범 사례

### 10.1 values.yaml 작성 규칙

| 규칙 | 설명 |
|------|------|
| **camelCase 사용** | `replicaCount`, `imagePullPolicy` (K8s 컨벤션) |
| **중첩 깊이 최소화** | 3단계 이하가 이상적 |
| **모든 키에 기본값 설정** | 빈 값(`{}`, `[]`)이라도 명시 |
| **주석으로 설명** | 각 키의 용도, 가능한 값, 기본값 이유 |
| **민감 정보 제외** | 비밀번호는 `existingSecret` 패턴 사용 |

### 10.2 existingSecret 패턴

비밀번호를 values.yaml에 직접 넣지 말고, **미리 생성된 Secret을 참조**합니다:

```yaml
# values-prd.yaml
data:
  metadataConnection:
    existingSecret: airflow-db-credentials    # ← 이미 존재하는 Secret 이름
    # password 필드가 아닌 existingSecret 사용!
```

```bash
# Secret은 Helm 바깥에서 별도 관리
kubectl create secret generic airflow-db-credentials \
  --from-literal=connection="postgresql://user:pass@host:5432/db" \
  -n airflow-prd
```

### 10.3 CI/CD 파이프라인에서 Helm

```yaml
# .github/workflows/deploy.yaml (예시)
deploy:
  steps:
    - name: Helm Lint
      run: helm lint ./chart -f values.yaml -f values-${{ env.ENV }}.yaml

    - name: Helm Template (Validate)
      run: helm template my-app ./chart -f values.yaml -f values-${{ env.ENV }}.yaml > /dev/null

    - name: Helm Upgrade
      run: |
        helm upgrade --install my-app ./chart \
          -f values.yaml \
          -f values-${{ env.ENV }}.yaml \
          --set images.tag=${{ github.sha }} \
          --namespace my-app-${{ env.ENV }} \
          --create-namespace \
          --wait --timeout 10m
```

!!! tip "핵심 플래그"
    - `--wait`: 모든 Pod가 Ready될 때까지 대기
    - `--timeout 10m`: 타임아웃 설정 (기본 5분)
    - `--atomic`: 실패 시 자동 롤백 (CI/CD에서 유용)

---

## 정리

| 주제 | 핵심 포인트 |
|------|-------------|
| Helm 구성 요소 | Chart(패키지) + Values(설정) = Release(배포 인스턴스) |
| Chart 찾기 | ArtifactHub 검색, `helm search repo/hub` |
| Chart 구조 | `Chart.yaml`(메타) + `values.yaml`(기본값) + `templates/`(Go 템플릿) |
| Values 오버라이드 | Chart 기본값 < -f 파일 < --set (후순위가 우선) |
| 렌더링 원리 | `{{ .Values.key }}` → Go 템플릿 → 최종 K8s 매니페스트 |
| 핵심 명령어 | `show values` → `template` → `install` → `upgrade` → `rollback` |
| 환경별 관리 | 공통 `values.yaml` + 환경별 `values-{env}.yaml` 오버라이드 |
| 보안 | `existingSecret` 패턴으로 민감 정보 분리 |

!!! tip "다음 단계"
    Helm 사용에 익숙해졌다면:

    - [6장 워크로드](06-workloads.md) — Deployment, StatefulSet 등 Helm이 관리하는 리소스들
    - [Bonus: dbt + Airflow on K8s](11-dbt-airflow-on-k8s.md) — 실전 Airflow Helm Chart 배포 사례
