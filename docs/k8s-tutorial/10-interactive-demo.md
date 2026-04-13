# 10. 인터랙티브 데모

Kubernetes 핵심 개념을 한곳에서 직접 체험해보세요.
각 데모는 실제 `kubectl` 출력을 시뮬레이션하며, 버튼을 클릭하면 결과가 터미널에 표시됩니다.

---

## kubectl 명령어 체험

가장 자주 사용하는 `kubectl` 명령어들을 실행해보세요.

<div class="interactive-terminal" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">kubectl Terminal</span>
  </div>
  <div class="terminal-body" id="k8s-term">
    <span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>
  </div>
  <div class="terminal-buttons">
    <button onclick="k8sRun('get-pods', 'k8s-term')">kubectl get pods</button>
    <button onclick="k8sRun('get-svc', 'k8s-term')">kubectl get svc</button>
    <button onclick="k8sRun('get-nodes', 'k8s-term')">kubectl get nodes</button>
    <button onclick="k8sRun('describe-pod', 'k8s-term')">kubectl describe pod</button>
    <button onclick="k8sRun('get-deploy', 'k8s-term')">kubectl get deployments</button>
    <button onclick="k8sRun('logs', 'k8s-term')">kubectl logs</button>
    <button onclick="k8sRun('apply', 'k8s-term')">kubectl apply</button>
    <button onclick="k8sRun('rollout', 'k8s-term')">kubectl rollout status</button>
    <button onclick="k8sClear('k8s-term')" class="btn-clear">Clear</button>
  </div>
</div>

!!! info "사용법"
    위 버튼을 클릭하면 해당 `kubectl` 명령어의 실행 결과가 터미널에 표시됩니다.
    여러 명령어를 순서대로 실행해보세요. **Clear** 버튼으로 초기화할 수 있습니다.

---

## 배포 흐름 데모

Deployment를 생성하고 Rolling Update가 진행되는 과정을 단계별로 확인합니다.

<div class="flow-demo" id="k8s-deploy-flow" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Deployment 배포 흐름</span>
  </div>
  <div class="flow-panels">
    <div class="flow-step" id="deploy-step-area">
      <div class="flow-step-content" id="deploy-step-content">
        <p style="color:#6c7086;">아래 <strong>다음 ▶</strong> 버튼을 클릭하여 배포 과정을 시작하세요.</p>
      </div>
    </div>
  </div>
  <div class="flow-step-indicator" id="deploy-step-indicator">단계: 0 / 7</div>
  <div class="terminal-buttons">
    <button onclick="k8sDeployPrev()" id="deploy-prev-btn" disabled>◀ 이전</button>
    <button onclick="k8sDeployNext()" id="deploy-next-btn">다음 ▶</button>
    <button onclick="k8sDeployReset()" class="btn-clear">처음으로</button>
  </div>
</div>

!!! tip "배포 과정 요약"
    1. YAML 작성 → 2. `kubectl apply` → 3. API Server 처리 → 4. Scheduler 배치 →
    5. ReplicaSet 생성 → 6. Pod 생성 → 7. Rolling Update 완료

---

## 네트워크 시나리오 데모

Kubernetes Service 타입별 네트워크 동작을 시각적으로 확인합니다.
아래 버튼을 클릭하여 시나리오를 전환하세요.

<div class="flow-demo" id="k8s-net-demo" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Service 네트워크 시나리오</span>
  </div>
  <div class="terminal-buttons" style="border-bottom: 1px solid #313244; padding-bottom: 10px;">
    <button onclick="k8sNetScenario('clusterip')" class="active" id="net-btn-clusterip">ClusterIP</button>
    <button onclick="k8sNetScenario('nodeport')" id="net-btn-nodeport">NodePort</button>
    <button onclick="k8sNetScenario('loadbalancer')" id="net-btn-loadbalancer">LoadBalancer</button>
    <button onclick="k8sNetScenario('ingress')" id="net-btn-ingress">Ingress</button>
  </div>
  <div class="flow-panels">
    <div class="flow-step" id="net-scenario-area">
      <div id="net-scenario-content">
        <div class="k8s-net-diagram" id="net-diagram-clusterip">
          <div class="k8s-net-box k8s-cluster-box">
            <div class="k8s-net-label">Kubernetes Cluster</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-svc-box">
                <div class="k8s-net-label">ClusterIP Service</div>
                <code>10.96.0.1:80</code>
              </div>
            </div>
            <div class="k8s-net-arrow">&#8595; 내부 트래픽 분배</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-pod-box">Pod A<br/><code>10.244.0.5</code></div>
              <div class="k8s-net-box k8s-pod-box">Pod B<br/><code>10.244.0.6</code></div>
              <div class="k8s-net-box k8s-pod-box">Pod C<br/><code>10.244.0.7</code></div>
            </div>
          </div>
          <div class="k8s-net-desc">
            <strong>ClusterIP</strong>: 클러스터 내부에서만 접근 가능한 기본 Service 타입입니다.<br/>
            외부에서는 접근할 수 없으며, 다른 Pod에서 Service DNS 이름으로 호출합니다.<br/>
            <code>kubectl get svc</code>로 확인하면 EXTERNAL-IP가 <code>&lt;none&gt;</code>으로 표시됩니다.
          </div>
        </div>
        <div class="k8s-net-diagram" id="net-diagram-nodeport" style="display:none;">
          <div class="k8s-net-box k8s-external-box">
            <div class="k8s-net-label">External Client</div>
            <code>http://&lt;NodeIP&gt;:30080</code>
          </div>
          <div class="k8s-net-arrow">&#8595; NodePort (30080)</div>
          <div class="k8s-net-box k8s-cluster-box">
            <div class="k8s-net-label">Kubernetes Cluster</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-node-box">
                Node 1<br/><code>192.168.1.10:30080</code>
              </div>
              <div class="k8s-net-box k8s-node-box">
                Node 2<br/><code>192.168.1.11:30080</code>
              </div>
            </div>
            <div class="k8s-net-arrow">&#8595; ClusterIP로 전달</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-pod-box">Pod A</div>
              <div class="k8s-net-box k8s-pod-box">Pod B</div>
            </div>
          </div>
          <div class="k8s-net-desc">
            <strong>NodePort</strong>: 각 Node의 고정 포트(30000-32767)를 통해 외부에서 접근합니다.<br/>
            모든 Node에서 동일한 포트로 접근 가능하며, 내부적으로 ClusterIP Service를 경유합니다.<br/>
            개발/테스트 환경에서 주로 사용됩니다.
          </div>
        </div>
        <div class="k8s-net-diagram" id="net-diagram-loadbalancer" style="display:none;">
          <div class="k8s-net-box k8s-external-box">
            <div class="k8s-net-label">External Client</div>
            <code>http://my-app.example.com</code>
          </div>
          <div class="k8s-net-arrow">&#8595; DNS 요청</div>
          <div class="k8s-net-box k8s-lb-box">
            <div class="k8s-net-label">Cloud Load Balancer</div>
            <code>EXTERNAL-IP: 52.xx.xx.xx</code>
          </div>
          <div class="k8s-net-arrow">&#8595; 트래픽 분산</div>
          <div class="k8s-net-box k8s-cluster-box">
            <div class="k8s-net-label">Kubernetes Cluster</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-pod-box">Pod A</div>
              <div class="k8s-net-box k8s-pod-box">Pod B</div>
              <div class="k8s-net-box k8s-pod-box">Pod C</div>
            </div>
          </div>
          <div class="k8s-net-desc">
            <strong>LoadBalancer</strong>: 클라우드 제공자의 로드밸런서를 자동 프로비저닝합니다.<br/>
            외부 IP가 할당되어 인터넷에서 직접 접근할 수 있습니다.<br/>
            AWS ELB, GCP Cloud LB 등이 자동으로 생성됩니다.
          </div>
        </div>
        <div class="k8s-net-diagram" id="net-diagram-ingress" style="display:none;">
          <div class="k8s-net-box k8s-external-box">
            <div class="k8s-net-label">External Clients</div>
            <code>app.example.com</code> / <code>api.example.com</code>
          </div>
          <div class="k8s-net-arrow">&#8595; HTTP/HTTPS</div>
          <div class="k8s-net-box k8s-ingress-box">
            <div class="k8s-net-label">Ingress Controller (nginx)</div>
            <code>/app/* → app-svc:80</code><br/>
            <code>/api/* → api-svc:8080</code>
          </div>
          <div class="k8s-net-arrow">&#8595; 경로 기반 라우팅</div>
          <div class="k8s-net-box k8s-cluster-box">
            <div class="k8s-net-label">Kubernetes Cluster</div>
            <div class="k8s-net-row">
              <div class="k8s-net-box k8s-svc-box">
                app-svc<br/>
                <div class="k8s-net-row">
                  <div class="k8s-net-box k8s-pod-box" style="margin:4px;">App Pod</div>
                  <div class="k8s-net-box k8s-pod-box" style="margin:4px;">App Pod</div>
                </div>
              </div>
              <div class="k8s-net-box k8s-svc-box">
                api-svc<br/>
                <div class="k8s-net-row">
                  <div class="k8s-net-box k8s-pod-box" style="margin:4px;">API Pod</div>
                  <div class="k8s-net-box k8s-pod-box" style="margin:4px;">API Pod</div>
                </div>
              </div>
            </div>
          </div>
          <div class="k8s-net-desc">
            <strong>Ingress</strong>: L7(HTTP) 레벨의 라우팅을 제공합니다.<br/>
            호스트/경로 기반으로 여러 Service에 트래픽을 분배할 수 있습니다.<br/>
            TLS 종료, 가상 호스트, URL 리라이트 등을 지원합니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

!!! note "Service 타입 선택 가이드"
    - **ClusterIP**: 클러스터 내부 통신 (마이크로서비스 간 호출)
    - **NodePort**: 개발/테스트 환경의 외부 접근
    - **LoadBalancer**: 프로덕션 외부 노출 (단일 서비스)
    - **Ingress**: 프로덕션 외부 노출 (다중 서비스, 경로 기반 라우팅)

---

## 스토리지 바인딩 데모

PersistentVolume(PV) 생성부터 PVC 바인딩, Pod 마운트까지의 과정을 단계별로 확인합니다.

<div class="flow-demo" id="k8s-storage-flow" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Storage 바인딩 흐름</span>
  </div>
  <div class="flow-panels">
    <div class="flow-step" id="storage-step-area">
      <div class="flow-step-content" id="storage-step-content">
        <p style="color:#6c7086;">아래 <strong>다음 ▶</strong> 버튼을 클릭하여 스토리지 바인딩 과정을 시작하세요.</p>
      </div>
    </div>
  </div>
  <div class="flow-step-indicator" id="storage-step-indicator">단계: 0 / 5</div>
  <div class="terminal-buttons">
    <button onclick="k8sStoragePrev()" id="storage-prev-btn" disabled>◀ 이전</button>
    <button onclick="k8sStorageNext()" id="storage-next-btn">다음 ▶</button>
    <button onclick="k8sStorageReset()" class="btn-clear">처음으로</button>
  </div>
</div>

!!! tip "스토리지 과정 요약"
    1. PV 생성 (Available) → 2. PVC 생성 (Pending) → 3. PVC-PV 바인딩 (Bound) →
    4. Pod에서 PVC 마운트 → 5. 컨테이너에서 볼륨 사용

---

## 각 챕터별 데모 바로가기

각 튜토리얼 챕터 안에서도 해당 내용과 관련된 데모를 직접 체험할 수 있습니다.

| 챕터 | 체험 가능한 내용 |
|------|-----------------|
| [1. Docker 기초](01-docker-basics.md) | Docker 아키텍처 다이어그램 |
| [2. 컨테이너에서 K8s로](02-container-to-k8s.md) | minikube 설치, 첫 Pod 실행 |
| [3. K8s 아키텍처](03-k8s-architecture.md) | 클러스터 컴포넌트 다이어그램 |
| [4. kubeconfig 상세](04-kubeconfig.md) | 멀티 클러스터 설정, 컨텍스트 전환 |
| [5. YAML 매니페스트](05-yaml-manifests.md) | Pod/Deployment/Service YAML 작성 |
| [6. 워크로드](06-workloads.md) | Pod Lifecycle, Deployment 롤링 업데이트 |
| [7. 네트워킹](07-networking.md) | Service 타입별 네트워크 구성, NetworkPolicy |
| [8. 스토리지와 설정](08-volumes.md) | PV/PVC 바인딩, ConfigMap/Secret |
| [9. 배포 전략](09-deployment-strategies.md) | Rolling Update, Blue/Green, Canary, HPA |

---

## 명령어 요약

| 명령어 | 설명 | 관련 챕터 |
|--------|------|----------|
| `kubectl get pods` | 현재 네임스페이스의 Pod 목록 조회 | [6. 워크로드](06-workloads.md) |
| `kubectl get svc` | Service 목록 조회 | [7. 네트워킹](07-networking.md) |
| `kubectl get nodes` | 클러스터 Node 목록 조회 | [3. K8s 아키텍처](03-k8s-architecture.md) |
| `kubectl get deployments` | Deployment 목록 조회 | [6. 워크로드](06-workloads.md) |
| `kubectl describe pod` | Pod 상세 정보 확인 | [6. 워크로드](06-workloads.md) |
| `kubectl logs` | 컨테이너 로그 확인 | [6. 워크로드](06-workloads.md) |
| `kubectl apply -f` | YAML 매니페스트 적용 (생성/업데이트) | [5. YAML 매니페스트](05-yaml-manifests.md) |
| `kubectl rollout status` | 롤링 업데이트 진행 상태 확인 | [9. 배포 전략](09-deployment-strategies.md) |
| `kubectl exec -it` | 컨테이너 내부 쉘 접속 | [6. 워크로드](06-workloads.md) |
| `kubectl delete` | 리소스 삭제 | 전체 |
| `kubectl scale` | Deployment 레플리카 수 조정 | [9. 배포 전략](09-deployment-strategies.md) |
| `kubectl port-forward` | 로컬 포트를 Pod/Service에 포워딩 | [7. 네트워킹](07-networking.md) |

---

<script markdown="0">
/* ============================================================
   Kubernetes Interactive Demos
   ============================================================ */

/* ---------- kubectl 명령어 시뮬레이터 ---------- */

const k8sCommands = {
  'get-pods': [
    { text: '$ kubectl get pods\n', cls: 't-white', delay: 0 },
    { text: 'NAME                          READY   STATUS    RESTARTS   AGE\n', cls: 't-yellow', delay: 400 },
    { text: 'web-app-6d8f9b7c4-x2k9p      1/1     Running   0          2d\n', cls: 't-green', delay: 200 },
    { text: 'web-app-6d8f9b7c4-m7j3q      1/1     Running   0          2d\n', cls: 't-green', delay: 200 },
    { text: 'web-app-6d8f9b7c4-a4n8w      1/1     Running   0          2d\n', cls: 't-green', delay: 200 },
    { text: 'redis-master-0                1/1     Running   0          5d\n', cls: 't-green', delay: 200 },
    { text: 'api-server-7f5c8d6b2-p9r2t   1/1     Running   1          3d\n', cls: 't-green', delay: 200 },
  ],
  'get-svc': [
    { text: '$ kubectl get svc\n', cls: 't-white', delay: 0 },
    { text: 'NAME           TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)        AGE\n', cls: 't-yellow', delay: 400 },
    { text: 'kubernetes     ClusterIP      10.96.0.1      <none>         443/TCP        30d\n', cls: 't-white', delay: 200 },
    { text: 'web-app        LoadBalancer   10.96.12.34    52.xx.xx.xx    80:31234/TCP   2d\n', cls: 't-green', delay: 200 },
    { text: 'redis-master   ClusterIP      10.96.45.67    <none>         6379/TCP       5d\n', cls: 't-white', delay: 200 },
    { text: 'api-server     NodePort       10.96.78.90    <none>         8080:30080/TCP 3d\n', cls: 't-green', delay: 200 },
  ],
  'get-nodes': [
    { text: '$ kubectl get nodes\n', cls: 't-white', delay: 0 },
    { text: 'NAME          STATUS   ROLES           AGE   VERSION\n', cls: 't-yellow', delay: 400 },
    { text: 'master-01     Ready    control-plane   30d   v1.29.2\n', cls: 't-green', delay: 200 },
    { text: 'worker-01     Ready    <none>          30d   v1.29.2\n', cls: 't-green', delay: 200 },
    { text: 'worker-02     Ready    <none>          30d   v1.29.2\n', cls: 't-green', delay: 200 },
    { text: 'worker-03     Ready    <none>          25d   v1.29.2\n', cls: 't-green', delay: 200 },
  ],
  'describe-pod': [
    { text: '$ kubectl describe pod web-app-6d8f9b7c4-x2k9p\n', cls: 't-white', delay: 0 },
    { text: 'Name:             web-app-6d8f9b7c4-x2k9p\n', cls: 't-white', delay: 300 },
    { text: 'Namespace:        default\n', cls: 't-white', delay: 100 },
    { text: 'Priority:         0\n', cls: 't-white', delay: 100 },
    { text: 'Service Account:  default\n', cls: 't-white', delay: 100 },
    { text: 'Node:             worker-01/192.168.1.10\n', cls: 't-white', delay: 100 },
    { text: 'Labels:           app=web-app\n', cls: 't-yellow', delay: 100 },
    { text: '                  pod-template-hash=6d8f9b7c4\n', cls: 't-yellow', delay: 100 },
    { text: 'Status:           Running\n', cls: 't-green', delay: 200 },
    { text: 'IP:               10.244.0.5\n', cls: 't-white', delay: 100 },
    { text: '\nContainers:\n', cls: 't-white', delay: 200 },
    { text: '  web-app:\n', cls: 't-yellow', delay: 100 },
    { text: '    Image:          nginx:1.25\n', cls: 't-white', delay: 100 },
    { text: '    Port:           80/TCP\n', cls: 't-white', delay: 100 },
    { text: '    State:          Running\n', cls: 't-green', delay: 100 },
    { text: '      Started:      Mon, 11 Apr 2026 09:00:00 +0900\n', cls: 't-white', delay: 100 },
    { text: '    Limits:\n', cls: 't-white', delay: 100 },
    { text: '      cpu:     500m\n', cls: 't-white', delay: 100 },
    { text: '      memory:  256Mi\n', cls: 't-white', delay: 100 },
    { text: '    Requests:\n', cls: 't-white', delay: 100 },
    { text: '      cpu:     250m\n', cls: 't-white', delay: 100 },
    { text: '      memory:  128Mi\n', cls: 't-white', delay: 100 },
    { text: '\nConditions:\n', cls: 't-white', delay: 200 },
    { text: '  Type              Status\n', cls: 't-yellow', delay: 100 },
    { text: '  Initialized       True\n', cls: 't-green', delay: 100 },
    { text: '  Ready             True\n', cls: 't-green', delay: 100 },
    { text: '  ContainersReady   True\n', cls: 't-green', delay: 100 },
    { text: '  PodScheduled      True\n', cls: 't-green', delay: 100 },
  ],
  'get-deploy': [
    { text: '$ kubectl get deployments\n', cls: 't-white', delay: 0 },
    { text: 'NAME         READY   UP-TO-DATE   AVAILABLE   AGE\n', cls: 't-yellow', delay: 400 },
    { text: 'web-app      3/3     3            3           2d\n', cls: 't-green', delay: 200 },
    { text: 'api-server   2/2     2            2           3d\n', cls: 't-green', delay: 200 },
  ],
  'logs': [
    { text: '$ kubectl logs web-app-6d8f9b7c4-x2k9p --tail=10\n', cls: 't-white', delay: 0 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:01 +0000] "GET / HTTP/1.1" 200 615\n', cls: 't-white', delay: 300 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:05 +0000] "GET /healthz HTTP/1.1" 200 2\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.3 - - [13/Apr/2026:10:23:12 +0000] "GET /api/data HTTP/1.1" 200 1024\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:15 +0000] "GET /healthz HTTP/1.1" 200 2\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.2 - - [13/Apr/2026:10:23:18 +0000] "POST /api/submit HTTP/1.1" 201 48\n', cls: 't-green', delay: 200 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:25 +0000] "GET /healthz HTTP/1.1" 200 2\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.4 - - [13/Apr/2026:10:23:30 +0000] "GET /static/style.css HTTP/1.1" 304 0\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:35 +0000] "GET /healthz HTTP/1.1" 200 2\n', cls: 't-white', delay: 200 },
    { text: '10.244.0.5 - - [13/Apr/2026:10:23:40 +0000] "GET /api/users HTTP/1.1" 200 512\n', cls: 't-green', delay: 200 },
    { text: '10.244.0.1 - - [13/Apr/2026:10:23:45 +0000] "GET /healthz HTTP/1.1" 200 2\n', cls: 't-white', delay: 200 },
  ],
  'apply': [
    { text: '$ kubectl apply -f deployment.yaml\n', cls: 't-white', delay: 0 },
    { text: 'deployment.apps/web-app configured\n', cls: 't-green', delay: 600 },
    { text: '\n$ kubectl apply -f service.yaml\n', cls: 't-white', delay: 400 },
    { text: 'service/web-app unchanged\n', cls: 't-yellow', delay: 600 },
    { text: '\n$ kubectl apply -f configmap.yaml\n', cls: 't-white', delay: 400 },
    { text: 'configmap/web-app-config created\n', cls: 't-green', delay: 600 },
  ],
  'rollout': [
    { text: '$ kubectl rollout status deployment/web-app\n', cls: 't-white', delay: 0 },
    { text: 'Waiting for deployment "web-app" rollout to finish:\n', cls: 't-yellow', delay: 500 },
    { text: '  1 out of 3 new replicas have been updated...\n', cls: 't-white', delay: 800 },
    { text: '  2 out of 3 new replicas have been updated...\n', cls: 't-white', delay: 800 },
    { text: '  3 out of 3 new replicas have been updated...\n', cls: 't-white', delay: 800 },
    { text: '  Waiting for 1 old replicas to be terminated...\n', cls: 't-yellow', delay: 600 },
    { text: '  All replicas are updated and available.\n', cls: 't-green', delay: 500 },
    { text: 'deployment "web-app" successfully rolled out\n', cls: 't-green', delay: 300 },
  ],
};

const k8sRunning = {};

function k8sClear(id) {
  const el = document.getElementById(id);
  el.innerHTML = '<span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>';
  k8sRunning[id] = false;
}

async function k8sRun(cmd, terminalId) {
  if (k8sRunning[terminalId]) return;
  k8sRunning[terminalId] = true;

  const el = document.getElementById(terminalId);
  const cursorEl = el.querySelector('.cursor');
  if (cursorEl) cursorEl.remove();

  el.innerHTML += '\n';

  const lines = k8sCommands[cmd];
  for (const line of lines) {
    if (!k8sRunning[terminalId]) break;
    await new Promise(r => setTimeout(r, line.delay));
    const span = document.createElement('span');
    span.className = line.cls;
    span.textContent = line.text;
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }

  el.innerHTML += '\n<span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>';
  el.scrollTop = el.scrollHeight;
  k8sRunning[terminalId] = false;
}

/* ---------- 배포 흐름 데모 ---------- */

const deploySteps = [
  {
    title: '1. YAML 매니페스트 작성',
    html: `<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-size:0.85em;overflow-x:auto;">
<span style="color:#89b4fa;">apiVersion:</span> apps/v1
<span style="color:#89b4fa;">kind:</span> Deployment
<span style="color:#89b4fa;">metadata:</span>
  <span style="color:#89b4fa;">name:</span> web-app
<span style="color:#89b4fa;">spec:</span>
  <span style="color:#89b4fa;">replicas:</span> <span style="color:#f9e2af;">3</span>
  <span style="color:#89b4fa;">selector:</span>
    <span style="color:#89b4fa;">matchLabels:</span>
      <span style="color:#89b4fa;">app:</span> web-app
  <span style="color:#89b4fa;">template:</span>
    <span style="color:#89b4fa;">metadata:</span>
      <span style="color:#89b4fa;">labels:</span>
        <span style="color:#89b4fa;">app:</span> web-app
    <span style="color:#89b4fa;">spec:</span>
      <span style="color:#89b4fa;">containers:</span>
      - <span style="color:#89b4fa;">name:</span> nginx
        <span style="color:#89b4fa;">image:</span> nginx:1.25
        <span style="color:#89b4fa;">ports:</span>
        - <span style="color:#89b4fa;">containerPort:</span> <span style="color:#f9e2af;">80</span></pre>
    <p style="color:#a6e3a1;">Deployment YAML을 작성합니다. replicas=3으로 3개의 Pod를 요청합니다.</p>`
  },
  {
    title: '2. kubectl apply 실행',
    html: `<div style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-family:monospace;font-size:0.85em;">
      <span style="color:#cdd6f4;">$ kubectl apply -f deployment.yaml</span><br/>
      <span style="color:#a6e3a1;">deployment.apps/web-app created</span>
    </div>
    <p style="color:#a6e3a1;">YAML을 API Server에 제출합니다. API Server가 요청을 검증하고 etcd에 저장합니다.</p>`
  },
  {
    title: '3. API Server → Controller Manager',
    html: `<div style="text-align:center;padding:16px;">
      <div style="display:inline-flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;">
        <div style="background:#89b4fa;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;">API Server</div>
        <span style="color:#f9e2af;font-size:1.5em;">&#8594;</span>
        <div style="background:#cba6f7;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;">Controller Manager</div>
      </div>
    </div>
    <p style="color:#a6e3a1;">Deployment Controller가 변경을 감지하고 ReplicaSet을 생성합니다.</p>`
  },
  {
    title: '4. ReplicaSet 생성',
    html: `<div style="text-align:center;padding:16px;">
      <div style="background:#cba6f7;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block;">ReplicaSet: web-app-6d8f9b7c4</div>
      <div style="color:#f9e2af;font-size:1.2em;margin:8px 0;">목표: 3개 Pod 유지</div>
      <div style="display:inline-flex;gap:12px;margin-top:8px;">
        <div style="background:#313244;color:#f9e2af;padding:8px 16px;border-radius:6px;border:1px dashed #f9e2af;">Pod (Pending)</div>
        <div style="background:#313244;color:#f9e2af;padding:8px 16px;border-radius:6px;border:1px dashed #f9e2af;">Pod (Pending)</div>
        <div style="background:#313244;color:#f9e2af;padding:8px 16px;border-radius:6px;border:1px dashed #f9e2af;">Pod (Pending)</div>
      </div>
    </div>
    <p style="color:#a6e3a1;">ReplicaSet이 생성되었지만, Pod들은 아직 Node에 배치되지 않았습니다 (Pending).</p>`
  },
  {
    title: '5. Scheduler → Node 배치',
    html: `<div style="text-align:center;padding:16px;">
      <div style="display:inline-flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;">
        <div style="background:#f9e2af;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;">Scheduler</div>
        <span style="color:#f9e2af;font-size:1.5em;">&#8594;</span>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="background:#313244;padding:8px 16px;border-radius:6px;color:#89b4fa;border:1px solid #89b4fa;">worker-01: Pod 1 &#x2713;</div>
          <div style="background:#313244;padding:8px 16px;border-radius:6px;color:#89b4fa;border:1px solid #89b4fa;">worker-02: Pod 2 &#x2713;</div>
          <div style="background:#313244;padding:8px 16px;border-radius:6px;color:#89b4fa;border:1px solid #89b4fa;">worker-03: Pod 3 &#x2713;</div>
        </div>
      </div>
    </div>
    <p style="color:#a6e3a1;">Scheduler가 리소스 상태를 확인하고 각 Pod를 적절한 Worker Node에 배치합니다.</p>`
  },
  {
    title: '6. kubelet → 컨테이너 실행',
    html: `<div style="text-align:center;padding:16px;">
      <div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;">
        <div style="background:#313244;padding:12px;border-radius:8px;border:1px solid #a6e3a1;min-width:140px;">
          <div style="color:#89b4fa;font-weight:bold;">worker-01</div>
          <div style="color:#6c7086;font-size:0.85em;">kubelet</div>
          <div style="background:#a6e3a1;color:#1e1e2e;padding:4px 8px;border-radius:4px;margin-top:4px;font-size:0.85em;">Pod 1: Running</div>
        </div>
        <div style="background:#313244;padding:12px;border-radius:8px;border:1px solid #a6e3a1;min-width:140px;">
          <div style="color:#89b4fa;font-weight:bold;">worker-02</div>
          <div style="color:#6c7086;font-size:0.85em;">kubelet</div>
          <div style="background:#a6e3a1;color:#1e1e2e;padding:4px 8px;border-radius:4px;margin-top:4px;font-size:0.85em;">Pod 2: Running</div>
        </div>
        <div style="background:#313244;padding:12px;border-radius:8px;border:1px solid #a6e3a1;min-width:140px;">
          <div style="color:#89b4fa;font-weight:bold;">worker-03</div>
          <div style="color:#6c7086;font-size:0.85em;">kubelet</div>
          <div style="background:#a6e3a1;color:#1e1e2e;padding:4px 8px;border-radius:4px;margin-top:4px;font-size:0.85em;">Pod 3: Running</div>
        </div>
      </div>
    </div>
    <p style="color:#a6e3a1;">각 Node의 kubelet이 컨테이너 런타임을 통해 Pod를 실행합니다.</p>`
  },
  {
    title: '7. 배포 완료',
    html: `<div style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-family:monospace;font-size:0.85em;">
      <span style="color:#cdd6f4;">$ kubectl rollout status deployment/web-app</span><br/>
      <span style="color:#a6e3a1;">deployment "web-app" successfully rolled out</span><br/><br/>
      <span style="color:#cdd6f4;">$ kubectl get pods</span><br/>
      <span style="color:#f9e2af;">NAME                       READY   STATUS    RESTARTS   AGE</span><br/>
      <span style="color:#a6e3a1;">web-app-6d8f9b7c4-x2k9p   1/1     Running   0          45s</span><br/>
      <span style="color:#a6e3a1;">web-app-6d8f9b7c4-m7j3q   1/1     Running   0          45s</span><br/>
      <span style="color:#a6e3a1;">web-app-6d8f9b7c4-a4n8w   1/1     Running   0          45s</span>
    </div>
    <p style="color:#a6e3a1;">모든 Pod가 Running 상태입니다. Deployment가 성공적으로 완료되었습니다!</p>`
  },
];

let deployCurrentStep = 0;

function k8sDeployRender() {
  const content = document.getElementById('deploy-step-content');
  const indicator = document.getElementById('deploy-step-indicator');
  const prevBtn = document.getElementById('deploy-prev-btn');
  const nextBtn = document.getElementById('deploy-next-btn');

  if (deployCurrentStep === 0) {
    content.innerHTML = '<p style="color:#6c7086;">아래 <strong>다음 ▶</strong> 버튼을 클릭하여 배포 과정을 시작하세요.</p>';
  } else {
    const step = deploySteps[deployCurrentStep - 1];
    content.innerHTML = '<h4 style="color:#89b4fa;margin-top:0;">' + step.title + '</h4>' + step.html;
  }

  indicator.textContent = '단계: ' + deployCurrentStep + ' / ' + deploySteps.length;
  prevBtn.disabled = deployCurrentStep === 0;
  nextBtn.disabled = deployCurrentStep === deploySteps.length;
}

function k8sDeployNext() {
  if (deployCurrentStep < deploySteps.length) {
    deployCurrentStep++;
    k8sDeployRender();
  }
}

function k8sDeployPrev() {
  if (deployCurrentStep > 0) {
    deployCurrentStep--;
    k8sDeployRender();
  }
}

function k8sDeployReset() {
  deployCurrentStep = 0;
  k8sDeployRender();
}

/* ---------- 네트워크 시나리오 데모 ---------- */

function k8sNetScenario(type) {
  const types = ['clusterip', 'nodeport', 'loadbalancer', 'ingress'];
  types.forEach(function(t) {
    const diagram = document.getElementById('net-diagram-' + t);
    const btn = document.getElementById('net-btn-' + t);
    if (diagram) diagram.style.display = (t === type) ? 'block' : 'none';
    if (btn) btn.className = (t === type) ? 'active' : '';
  });
}

/* ---------- 스토리지 바인딩 데모 ---------- */

const storageSteps = [
  {
    title: '1. PersistentVolume 생성',
    html: `<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-size:0.85em;overflow-x:auto;">
<span style="color:#89b4fa;">apiVersion:</span> v1
<span style="color:#89b4fa;">kind:</span> PersistentVolume
<span style="color:#89b4fa;">metadata:</span>
  <span style="color:#89b4fa;">name:</span> my-pv
<span style="color:#89b4fa;">spec:</span>
  <span style="color:#89b4fa;">capacity:</span>
    <span style="color:#89b4fa;">storage:</span> <span style="color:#f9e2af;">10Gi</span>
  <span style="color:#89b4fa;">accessModes:</span>
    - <span style="color:#a6e3a1;">ReadWriteOnce</span>
  <span style="color:#89b4fa;">hostPath:</span>
    <span style="color:#89b4fa;">path:</span> /data/my-pv</pre>
    <div style="text-align:center;margin:12px 0;">
      <div style="display:inline-block;background:#89b4fa;color:#1e1e2e;padding:12px 24px;border-radius:8px;font-weight:bold;">PV: my-pv (10Gi)</div>
      <div style="color:#f9e2af;margin-top:6px;">Status: <strong>Available</strong></div>
    </div>
    <p style="color:#a6e3a1;">PersistentVolume이 생성되었습니다. 아직 바인딩되지 않아 Available 상태입니다.</p>`
  },
  {
    title: '2. PersistentVolumeClaim 생성',
    html: `<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-size:0.85em;overflow-x:auto;">
<span style="color:#89b4fa;">apiVersion:</span> v1
<span style="color:#89b4fa;">kind:</span> PersistentVolumeClaim
<span style="color:#89b4fa;">metadata:</span>
  <span style="color:#89b4fa;">name:</span> my-pvc
<span style="color:#89b4fa;">spec:</span>
  <span style="color:#89b4fa;">accessModes:</span>
    - <span style="color:#a6e3a1;">ReadWriteOnce</span>
  <span style="color:#89b4fa;">resources:</span>
    <span style="color:#89b4fa;">requests:</span>
      <span style="color:#89b4fa;">storage:</span> <span style="color:#f9e2af;">5Gi</span></pre>
    <div style="text-align:center;margin:12px 0;">
      <div style="display:inline-flex;gap:24px;align-items:center;">
        <div style="background:#89b4fa;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;">PV: my-pv (10Gi)</div>
        <div style="background:#f5c0e8;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;">PVC: my-pvc (5Gi)</div>
      </div>
      <div style="color:#f9e2af;margin-top:6px;">PVC Status: <strong>Pending</strong> (바인딩 대기 중)</div>
    </div>
    <p style="color:#a6e3a1;">PVC가 생성되었습니다. 조건에 맞는 PV를 찾는 중입니다.</p>`
  },
  {
    title: '3. PVC ↔ PV 바인딩',
    html: `<div style="text-align:center;padding:16px;">
      <div style="display:inline-flex;gap:12px;align-items:center;">
        <div style="background:#89b4fa;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;border:2px solid #a6e3a1;">PV: my-pv (10Gi)</div>
        <span style="color:#a6e3a1;font-size:1.5em;">&#x1F517;</span>
        <div style="background:#f5c0e8;color:#1e1e2e;padding:12px 20px;border-radius:8px;font-weight:bold;border:2px solid #a6e3a1;">PVC: my-pvc (5Gi)</div>
      </div>
      <div style="color:#a6e3a1;margin-top:8px;font-weight:bold;">Status: Bound</div>
    </div>
    <div style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-family:monospace;font-size:0.85em;">
      <span style="color:#cdd6f4;">$ kubectl get pv</span><br/>
      <span style="color:#f9e2af;">NAME    CAPACITY   ACCESS MODES   STATUS   CLAIM            AGE</span><br/>
      <span style="color:#a6e3a1;">my-pv   10Gi       RWO            Bound    default/my-pvc   1m</span>
    </div>
    <p style="color:#a6e3a1;">PVC의 요청(5Gi, RWO)이 PV의 사양(10Gi, RWO)과 일치하여 바인딩이 완료되었습니다.</p>`
  },
  {
    title: '4. Pod에서 PVC 마운트',
    html: `<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-size:0.85em;overflow-x:auto;">
<span style="color:#89b4fa;">apiVersion:</span> v1
<span style="color:#89b4fa;">kind:</span> Pod
<span style="color:#89b4fa;">metadata:</span>
  <span style="color:#89b4fa;">name:</span> my-pod
<span style="color:#89b4fa;">spec:</span>
  <span style="color:#89b4fa;">containers:</span>
  - <span style="color:#89b4fa;">name:</span> app
    <span style="color:#89b4fa;">image:</span> nginx:1.25
    <span style="color:#89b4fa;">volumeMounts:</span>
    - <span style="color:#89b4fa;">mountPath:</span> <span style="color:#a6e3a1;">/usr/share/nginx/html</span>
      <span style="color:#89b4fa;">name:</span> my-storage
  <span style="color:#89b4fa;">volumes:</span>
  - <span style="color:#89b4fa;">name:</span> my-storage
    <span style="color:#89b4fa;">persistentVolumeClaim:</span>
      <span style="color:#89b4fa;">claimName:</span> my-pvc</pre>
    <p style="color:#a6e3a1;">Pod 스펙에서 PVC를 볼륨으로 참조하고, 컨테이너의 <code>/usr/share/nginx/html</code>에 마운트합니다.</p>`
  },
  {
    title: '5. 볼륨 사용 확인',
    html: `<div style="text-align:center;padding:16px;">
      <div style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;">
        <div style="background:#313244;padding:12px;border-radius:8px;border:1px solid #a6e3a1;min-width:160px;">
          <div style="color:#a6e3a1;font-weight:bold;">Pod: my-pod</div>
          <div style="color:#6c7086;font-size:0.85em;">Container: app</div>
          <div style="background:#1e1e2e;padding:6px;border-radius:4px;margin-top:6px;font-family:monospace;font-size:0.8em;color:#cdd6f4;">/usr/share/nginx/html</div>
        </div>
        <span style="color:#a6e3a1;font-size:1.2em;">&#8596;</span>
        <div style="background:#f5c0e8;color:#1e1e2e;padding:10px 16px;border-radius:8px;font-weight:bold;">PVC<br/>my-pvc</div>
        <span style="color:#a6e3a1;font-size:1.2em;">&#8596;</span>
        <div style="background:#89b4fa;color:#1e1e2e;padding:10px 16px;border-radius:8px;font-weight:bold;">PV<br/>my-pv</div>
        <span style="color:#a6e3a1;font-size:1.2em;">&#8596;</span>
        <div style="background:#f9e2af;color:#1e1e2e;padding:10px 16px;border-radius:8px;font-weight:bold;">Disk<br/>/data/my-pv</div>
      </div>
    </div>
    <div style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:8px;font-family:monospace;font-size:0.85em;">
      <span style="color:#cdd6f4;">$ kubectl exec my-pod -- df -h /usr/share/nginx/html</span><br/>
      <span style="color:#f9e2af;">Filesystem      Size  Used Avail Use% Mounted on</span><br/>
      <span style="color:#a6e3a1;">/dev/sda1       10G   24K  10G   1%  /usr/share/nginx/html</span>
    </div>
    <p style="color:#a6e3a1;">Pod가 삭제되어도 PV의 데이터는 유지됩니다. 새 Pod에서 같은 PVC를 마운트하면 데이터를 다시 사용할 수 있습니다.</p>`
  },
];

let storageCurrentStep = 0;

function k8sStorageRender() {
  const content = document.getElementById('storage-step-content');
  const indicator = document.getElementById('storage-step-indicator');
  const prevBtn = document.getElementById('storage-prev-btn');
  const nextBtn = document.getElementById('storage-next-btn');

  if (storageCurrentStep === 0) {
    content.innerHTML = '<p style="color:#6c7086;">아래 <strong>다음 ▶</strong> 버튼을 클릭하여 스토리지 바인딩 과정을 시작하세요.</p>';
  } else {
    const step = storageSteps[storageCurrentStep - 1];
    content.innerHTML = '<h4 style="color:#89b4fa;margin-top:0;">' + step.title + '</h4>' + step.html;
  }

  indicator.textContent = '단계: ' + storageCurrentStep + ' / ' + storageSteps.length;
  prevBtn.disabled = storageCurrentStep === 0;
  nextBtn.disabled = storageCurrentStep === storageSteps.length;
}

function k8sStorageNext() {
  if (storageCurrentStep < storageSteps.length) {
    storageCurrentStep++;
    k8sStorageRender();
  }
}

function k8sStoragePrev() {
  if (storageCurrentStep > 0) {
    storageCurrentStep--;
    k8sStorageRender();
  }
}

function k8sStorageReset() {
  storageCurrentStep = 0;
  k8sStorageRender();
}
</script>
