# 7. 네트워킹

Kubernetes 네트워킹은 클러스터의 근간입니다. Pod 간 통신, 외부 트래픽 유입, 보안 정책까지 — 이 챕터에서는 K8s 네트워킹의 **모든 것**을 다룹니다.

---

## K8s 네트워킹 모델

### 기본 원칙

Kubernetes는 네트워킹에 대해 다음 **세 가지 기본 원칙**을 요구합니다:

1. **모든 Pod는 고유한 IP 주소**를 가진다
2. **모든 Pod는 NAT 없이** 다른 Pod와 직접 통신할 수 있다
3. **모든 Node의 에이전트**(kubelet 등)는 해당 Node의 모든 Pod와 통신할 수 있다

!!! info "왜 NAT 없는 통신인가?"
    Docker 기본 네트워킹에서는 컨테이너가 호스트의 IP를 공유하고 포트 매핑(NAT)으로 외부 통신합니다.
    K8s는 이를 **flat network**로 해결합니다. 모든 Pod가 클러스터 내에서 고유 IP를 가지므로
    포트 충돌 걱정 없이, 마치 같은 LAN에 있는 것처럼 통신합니다.

이 원칙 덕분에 애플리케이션 입장에서는 VM 위에서 동작하는 것과 거의 동일한 네트워크 환경을 경험합니다.

### CNI (Container Network Interface)

K8s 자체는 네트워크 구현을 포함하지 않습니다. 대신 **CNI (Container Network Interface)** 라는 표준 인터페이스를 정의하고, 실제 구현은 **CNI 플러그인**에 위임합니다.

CNI 플러그인의 역할:

- Pod 생성 시 네트워크 인터페이스(veth pair) 할당
- Pod에 IP 주소 배정 (IPAM)
- Pod 간 라우팅 테이블 구성
- 네트워크 정책(NetworkPolicy) 적용

```
kubelet → CNI 플러그인 호출 → Pod 네트워크 설정 완료
```

### CNI 플러그인 비교

| 항목 | Calico | Flannel | Cilium | WeaveNet |
|------|--------|---------|--------|----------|
| **라우팅 방식** | BGP / VXLAN / IP-in-IP | VXLAN / host-gw | eBPF / VXLAN | VXLAN mesh |
| **NetworkPolicy** | :white_check_mark: 완전 지원 | :x: 미지원 (별도 필요) | :white_check_mark: 완전 지원 + L7 | :white_check_mark: 지원 |
| **성능** | 높음 (BGP 모드) | 보통 | 매우 높음 (eBPF) | 보통 |
| **관찰성 (Observability)** | 기본 | 없음 | Hubble UI 내장 | 기본 |
| **복잡도** | 중간 | 낮음 | 높음 | 낮음 |
| **추천 환경** | 프로덕션 범용 | 소규모 / 학습 | 대규모 / 고성능 | 소규모 |

!!! tip "어떤 CNI를 선택해야 할까?"
    - **학습/테스트**: Flannel — 설정이 가장 간단합니다
    - **프로덕션 범용**: Calico — 안정적이고 NetworkPolicy 완전 지원
    - **고성능/대규모**: Cilium — eBPF 기반으로 커널 레벨 성능, L7 정책까지 지원
    - **간단한 멀티호스트**: WeaveNet — 설치가 매우 쉽고 암호화 통신 지원

---

## Service 완전 정복

Pod는 생성/삭제될 때마다 IP가 바뀝니다. **Service**는 이 문제를 해결하는 **안정적인 네트워크 엔드포인트**입니다.

### Service의 동작 원리

Service는 **label selector**로 대상 Pod를 선택하고, 고정된 **ClusterIP**와 **DNS 이름**을 제공합니다.

```
Client → Service (고정 IP/DNS) → kube-proxy → Pod (변동 IP)
```

Service가 생성되면 K8s는 자동으로 **Endpoints** (또는 **EndpointSlice**) 객체를 만들어 해당 selector에 매칭되는 Pod IP 목록을 관리합니다.

```bash
# Endpoints 확인
kubectl get endpoints my-service

# EndpointSlice 확인 (K8s 1.21+)
kubectl get endpointslices -l kubernetes.io/service-name=my-service
```

!!! info "Endpoints vs EndpointSlice"
    기존 Endpoints 객체는 하나의 리소스에 모든 Pod IP를 저장합니다.
    대규모 클러스터에서 Pod가 수천 개일 경우 이 객체가 너무 커져 성능 문제가 발생합니다.
    **EndpointSlice**는 이를 100개 단위로 분할하여 관리하며, K8s 1.21부터 기본 활성화되었습니다.

### ClusterIP — 클러스터 내부 통신

가장 기본적인 Service 타입입니다. 클러스터 내부에서만 접근 가능한 **가상 IP (Virtual IP)** 를 할당합니다.

```yaml
# clusterip-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  labels:
    app: backend
spec:
  type: ClusterIP      # 기본값 (생략 가능)
  selector:
    app: backend        # label이 app=backend인 Pod로 라우팅
  ports:
    - name: http
      protocol: TCP
      port: 80          # Service가 노출하는 포트
      targetPort: 8080  # Pod가 실제 리슨하는 포트
```

**동작 방식:**

1. `backend-service`에 ClusterIP (예: `10.96.45.12`)가 할당됨
2. 클러스터 내 다른 Pod에서 `10.96.45.12:80` 또는 `backend-service.default.svc.cluster.local:80`으로 접근
3. kube-proxy가 트래픽을 `app=backend` label을 가진 Pod의 `8080` 포트로 전달

```bash
# 다른 Pod 내부에서 테스트
curl http://backend-service:80
curl http://backend-service.default.svc.cluster.local:80
```

!!! tip "Headless Service"
    `clusterIP: None`으로 설정하면 **Headless Service**가 됩니다.
    가상 IP 없이 DNS가 직접 Pod IP 목록을 반환합니다. StatefulSet과 함께 자주 사용됩니다.

    ```yaml
    spec:
      clusterIP: None
      selector:
        app: database
    ```

### NodePort — 외부 노출

클러스터 **모든 Node의 특정 포트**를 통해 외부에서 접근할 수 있게 합니다.

```yaml
# nodeport-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - name: http
      protocol: TCP
      port: 80           # ClusterIP에서 사용하는 포트
      targetPort: 3000   # Pod 포트
      nodePort: 31000    # Node에서 노출할 포트 (30000-32767)
```

**동작 방식:**

1. ClusterIP가 자동 할당됨 (NodePort는 ClusterIP의 확장)
2. 모든 Node에서 `31000` 포트가 열림
3. 외부에서 `<NodeIP>:31000`으로 접근 가능
4. 트래픽: `외부 → NodeIP:31000 → ClusterIP:80 → Pod:3000`

```bash
# 외부에서 접근 (Node의 IP가 192.168.1.100인 경우)
curl http://192.168.1.100:31000
```

!!! warning "NodePort 사용 시 주의사항"
    - 포트 범위가 `30000-32767`로 제한됩니다
    - Node가 다운되면 해당 Node를 통한 접근이 불가합니다
    - 프로덕션에서는 NodePort 앞에 외부 LB를 두거나, LoadBalancer/Ingress 사용을 권장합니다

### LoadBalancer — 클라우드 LB 연동

클라우드 환경(AWS, GCP, Azure 등)에서 **외부 로드밸런서**를 자동으로 프로비저닝합니다.

```yaml
# loadbalancer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # AWS NLB 사용 시
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    # 내부 LB로 만들고 싶을 때
    # service.beta.kubernetes.io/aws-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8443
```

**동작 방식:**

1. ClusterIP + NodePort가 자동 할당됨 (LoadBalancer는 NodePort의 확장)
2. 클라우드 프로바이더가 외부 LB를 생성하고 공인 IP/DNS를 부여
3. 트래픽: `외부 → Cloud LB → NodePort → ClusterIP → Pod`

```bash
# 할당된 외부 IP 확인
kubectl get svc web-service
# NAME          TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)
# web-service   LoadBalancer   10.96.100.50   a1b2c3.elb...    80:31234/TCP
```

!!! warning "비용 주의"
    LoadBalancer Service 하나당 클라우드 LB 하나가 생성됩니다.
    서비스가 10개면 LB 10개 — 비용이 급증합니다.
    여러 서비스를 하나의 LB로 묶으려면 **Ingress**를 사용하세요.

### ExternalName — 외부 서비스 DNS 매핑

클러스터 외부의 서비스를 **DNS CNAME**으로 매핑합니다. selector나 포트 정의가 없습니다.

```yaml
# externalname-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  type: ExternalName
  externalName: db.example.com    # 외부 DNS 이름
```

**사용 예시:**

```bash
# Pod 내부에서 — external-db로 요청하면 db.example.com으로 CNAME 리다이렉트
curl http://external-db
# → DNS CNAME: db.example.com → 실제 외부 IP로 연결
```

!!! info "ExternalName 활용 시나리오"
    - 외부 데이터베이스(RDS 등)를 Service 이름으로 추상화
    - 마이그레이션 시 내부 서비스를 외부로 전환하는 과도기에 사용
    - 나중에 내부 서비스로 교체해도 클라이언트 코드 변경 불필요

### Service 타입 비교

| 항목 | ClusterIP | NodePort | LoadBalancer | ExternalName |
|------|-----------|----------|--------------|--------------|
| **접근 범위** | 클러스터 내부만 | 외부 (NodeIP:Port) | 외부 (공인 IP/DNS) | DNS CNAME 매핑 |
| **ClusterIP 할당** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: |
| **NodePort 할당** | :x: | :white_check_mark: | :white_check_mark: | :x: |
| **외부 LB** | :x: | :x: | :white_check_mark: | :x: |
| **selector 필요** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: |
| **비용** | 없음 | 없음 | LB 비용 발생 | 없음 |
| **주 용도** | 내부 마이크로서비스 간 통신 | 개발/테스트 외부 노출 | 프로덕션 외부 노출 | 외부 서비스 추상화 |

### 트래픽 흐름 다이어그램

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Kubernetes Service 트래픽 흐름</div>
  <div class="k8s-net-flow">
    <!-- External Traffic -->
    <div class="k8s-net-external">
      <div class="k8s-net-label">외부 클라이언트</div>
      <div class="k8s-net-sublabel">브라우저 / API 호출</div>
    </div>
    <div class="k8s-net-arrow-group">
      <div class="k8s-net-arrow-branch">
        <div class="k8s-net-arrow-line" style="border-color: #f38ba8;">↓</div>
        <div class="k8s-net-arrow-label" style="color: #f38ba8;">LoadBalancer</div>
      </div>
      <div class="k8s-net-arrow-branch">
        <div class="k8s-net-arrow-line" style="border-color: #f9e2af;">↓</div>
        <div class="k8s-net-arrow-label" style="color: #f9e2af;">NodePort</div>
      </div>
    </div>
    <!-- Cloud LB Layer -->
    <div class="k8s-net-layer" style="background: rgba(243,139,168,0.1); border-color: #f38ba8;">
      <div class="k8s-net-label" style="color: #f38ba8;">Cloud Load Balancer</div>
      <div class="k8s-net-detail">AWS ELB / GCP LB / Azure LB</div>
      <div class="k8s-net-detail">공인 IP 또는 DNS 엔드포인트</div>
    </div>
    <div class="k8s-net-arrow">↓</div>
    <!-- Node Layer -->
    <div class="k8s-net-layer" style="background: rgba(249,226,175,0.1); border-color: #f9e2af;">
      <div class="k8s-net-label" style="color: #f9e2af;">Node (NodePort: 30000-32767)</div>
      <div class="k8s-net-detail">모든 Node에서 동일한 포트로 수신</div>
    </div>
    <div class="k8s-net-arrow">↓</div>
    <!-- Cluster Network -->
    <div class="k8s-net-cluster-box">
      <div class="k8s-net-cluster-title">Cluster Network</div>
      <!-- kube-proxy -->
      <div class="k8s-net-layer" style="background: rgba(203,166,247,0.1); border-color: #cba6f7;">
        <div class="k8s-net-label" style="color: #cba6f7;">kube-proxy</div>
        <div class="k8s-net-detail">iptables / IPVS 규칙으로 트래픽 분배</div>
      </div>
      <div class="k8s-net-arrow">↓</div>
      <!-- ClusterIP -->
      <div class="k8s-net-layer" style="background: rgba(137,180,250,0.1); border-color: #89b4fa;">
        <div class="k8s-net-label" style="color: #89b4fa;">Service (ClusterIP: 10.96.x.x)</div>
        <div class="k8s-net-detail">가상 IP — 실제 인터페이스 없음</div>
        <div class="k8s-net-detail">DNS: service-name.namespace.svc.cluster.local</div>
      </div>
      <div class="k8s-net-arrow">↓</div>
      <!-- Endpoints -->
      <div class="k8s-net-layer" style="background: rgba(166,227,161,0.1); border-color: #a6e3a1;">
        <div class="k8s-net-label" style="color: #a6e3a1;">Endpoints / EndpointSlice</div>
        <div class="k8s-net-detail">매칭된 Pod IP 목록 관리</div>
      </div>
      <div class="k8s-net-arrow">↓</div>
      <!-- Pods -->
      <div class="k8s-net-pods">
        <div class="k8s-net-pod" style="border-color: #a6e3a1;">
          <div class="k8s-net-pod-label">Pod A</div>
          <div class="k8s-net-pod-ip">10.244.1.5:8080</div>
        </div>
        <div class="k8s-net-pod" style="border-color: #a6e3a1;">
          <div class="k8s-net-pod-label">Pod B</div>
          <div class="k8s-net-pod-ip">10.244.2.8:8080</div>
        </div>
        <div class="k8s-net-pod" style="border-color: #a6e3a1;">
          <div class="k8s-net-pod-label">Pod C</div>
          <div class="k8s-net-pod-ip">10.244.3.2:8080</div>
        </div>
      </div>
    </div>
    <!-- Internal traffic note -->
    <div class="k8s-net-internal-note">
      <div class="k8s-net-label" style="color: #89b4fa;">클러스터 내부 Pod → ClusterIP로 직접 접근</div>
    </div>
  </div>
</div>

<style>
.k8s-diagram {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.k8s-diagram-title {
  text-align: center;
  color: #cdd6f4;
  font-size: 1.15em;
  font-weight: 700;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #313244;
}
.k8s-net-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.k8s-net-external {
  background: rgba(245,192,232,0.1);
  border: 2px solid #f5c0e8;
  border-radius: 10px;
  padding: 12px 32px;
  text-align: center;
}
.k8s-net-label {
  color: #cdd6f4;
  font-weight: 600;
  font-size: 0.95em;
}
.k8s-net-sublabel {
  color: #6c7086;
  font-size: 0.8em;
  margin-top: 2px;
}
.k8s-net-arrow {
  color: #6c7086;
  font-size: 1.3em;
  line-height: 1;
}
.k8s-net-arrow-group {
  display: flex;
  gap: 48px;
  justify-content: center;
}
.k8s-net-arrow-branch {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.k8s-net-arrow-line {
  font-size: 1.3em;
  line-height: 1;
}
.k8s-net-arrow-label {
  font-size: 0.75em;
  font-weight: 600;
}
.k8s-net-layer {
  border: 1.5px solid;
  border-radius: 8px;
  padding: 10px 28px;
  text-align: center;
  min-width: 320px;
}
.k8s-net-detail {
  color: #6c7086;
  font-size: 0.78em;
  margin-top: 3px;
}
.k8s-net-cluster-box {
  border: 2px dashed #313244;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 480px;
}
.k8s-net-cluster-title {
  color: #6c7086;
  font-size: 0.85em;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.k8s-net-pods {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.k8s-net-pod {
  border: 1.5px solid;
  border-radius: 8px;
  padding: 8px 14px;
  text-align: center;
  background: rgba(166,227,161,0.05);
}
.k8s-net-pod-label {
  color: #a6e3a1;
  font-weight: 600;
  font-size: 0.85em;
}
.k8s-net-pod-ip {
  color: #6c7086;
  font-size: 0.72em;
  margin-top: 2px;
}
.k8s-net-internal-note {
  margin-top: 10px;
  padding: 8px 16px;
  border: 1px dashed #89b4fa;
  border-radius: 6px;
  background: rgba(137,180,250,0.05);
}
</style>

---

## Ingress 완전 정복

### Ingress란?

**Ingress**는 클러스터 외부에서 내부 Service로의 HTTP/HTTPS 트래픽을 관리하는 **L7(애플리케이션 계층) 라우터**입니다.

LoadBalancer Service와의 핵심 차이:

- **LoadBalancer**: Service 1개당 LB 1개 (L4, TCP/UDP 레벨)
- **Ingress**: LB 1개로 여러 Service에 대한 라우팅 규칙 정의 (L7, HTTP/HTTPS 레벨)

### Ingress Controller

Ingress 리소스는 **규칙만 정의**합니다. 실제로 트래픽을 처리하려면 **Ingress Controller**가 필요합니다.

| Controller | 특징 | 추천 환경 |
|------------|------|-----------|
| **NGINX Ingress Controller** | 가장 널리 사용, 안정적, 풍부한 annotation | 범용 / 온프레미스 |
| **Traefik** | 자동 설정, Let's Encrypt 내장, 대시보드 | 소규모 / 빠른 설정 |
| **AWS ALB Ingress Controller** | AWS ALB 네이티브 연동 | AWS 환경 |
| **Istio Gateway** | 서비스 메시 통합, 고급 트래픽 관리 | 대규모 마이크로서비스 |
| **Kong Ingress** | API Gateway 기능 내장 | API 중심 아키텍처 |

```bash
# NGINX Ingress Controller 설치 (Helm)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Host 기반 라우팅

도메인 이름에 따라 다른 서비스로 라우팅합니다.

```yaml
# host-based-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: host-based-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
```

**동작 방식:**

- `api.example.com` → `api-service`
- `web.example.com` → `web-service`
- `admin.example.com` → `admin-service`

### Path 기반 라우팅

하나의 도메인에서 URL 경로에 따라 다른 서비스로 라우팅합니다.

```yaml
# path-based-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-based-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - host: example.com
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /web(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: web-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: default-service
                port:
                  number: 80
```

**동작 방식:**

- `example.com/api/users` → `api-service` (경로: `/users`)
- `example.com/web/dashboard` → `web-service` (경로: `/dashboard`)
- `example.com/anything-else` → `default-service`

!!! info "pathType 종류"
    - **Prefix**: 경로 접두사 매칭 (가장 많이 사용)
    - **Exact**: 정확히 일치하는 경로만 매칭
    - **ImplementationSpecific**: Ingress Controller 구현에 따라 다름 (정규식 등)

### TLS/SSL 설정

HTTPS를 설정하려면 TLS 인증서를 Secret으로 생성하고 Ingress에 연결합니다.

```bash
# TLS Secret 생성 (인증서가 있는 경우)
kubectl create secret tls example-tls \
  --cert=tls.crt \
  --key=tls.key
```

```yaml
# tls-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
        - api.example.com
      secretName: example-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

!!! tip "cert-manager로 자동 인증서 관리"
    [cert-manager](https://cert-manager.io/)를 설치하면 Let's Encrypt 인증서를 자동으로 발급하고 갱신할 수 있습니다.

    ```yaml
    metadata:
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-prod"
    spec:
      tls:
        - hosts:
            - example.com
          secretName: example-tls   # cert-manager가 자동 생성
    ```

### 실전 예시 — 멀티 서비스 Ingress

Host + Path 기반 라우팅을 조합한 실전 예시입니다.

```yaml
# production-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
        - api.example.com
      secretName: production-tls
  rules:
    # 메인 웹사이트
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
          - path: /static
            pathType: Prefix
            backend:
              service:
                name: cdn-service
                port:
                  number: 80
    # API 서버
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1-service
                port:
                  number: 80
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2-service
                port:
                  number: 80
```

### Ingress vs LoadBalancer Service 비교

| 항목 | Ingress | LoadBalancer Service |
|------|---------|---------------------|
| **OSI 계층** | L7 (HTTP/HTTPS) | L4 (TCP/UDP) |
| **LB 개수** | 1개로 여러 서비스 라우팅 | 서비스당 1개 |
| **라우팅 기준** | Host, Path, Header 등 | 포트 기반 |
| **TLS 종료** | Ingress에서 처리 | LB 또는 Pod에서 처리 |
| **비용** | 낮음 (LB 1개) | 높음 (서비스 수 x LB) |
| **프로토콜** | HTTP/HTTPS만 | TCP/UDP 모두 |
| **추천** | HTTP 웹 서비스 | TCP/UDP 또는 비-HTTP 서비스 |

!!! danger "흔한 실수"
    Ingress 리소스만 만들고 Ingress Controller를 설치하지 않는 경우가 많습니다.
    Ingress 리소스는 **규칙 정의서**일 뿐이고, 이를 실행하는 **Ingress Controller**가 반드시 있어야 합니다.

    ```bash
    # Ingress Controller가 동작 중인지 확인
    kubectl get pods -n ingress-nginx
    ```

---

## kube-proxy와 iptables/IPVS

### kube-proxy란?

**kube-proxy**는 모든 Node에서 DaemonSet으로 실행되며, Service의 가상 IP에 대한 트래픽을 실제 Pod로 전달하는 규칙을 관리합니다.

kube-proxy는 직접 트래픽을 중계하지 않습니다. 대신 **커널 레벨의 규칙**(iptables 또는 IPVS)을 설정하여 패킷이 커널에서 바로 올바른 Pod로 향하도록 합니다.

### iptables 모드 (기본)

K8s의 기본 kube-proxy 모드입니다.

**동작 방식:**

1. Service 생성/변경 시 kube-proxy가 iptables 규칙을 업데이트
2. 클라이언트가 ClusterIP로 패킷을 보냄
3. 커널의 iptables가 DNAT(Destination NAT)으로 목적지를 Pod IP로 변경
4. 여러 Pod가 있으면 **랜덤 확률 기반**으로 분배 (round-robin이 아님)

```bash
# Node에서 iptables 규칙 확인
iptables -t nat -L KUBE-SERVICES -n | grep my-service
```

**장점:**

- 안정적이고 검증된 방식
- 별도 커널 모듈 불필요

**단점:**

- Service/Pod가 많아지면 iptables 규칙이 선형으로 증가 (O(n))
- 규칙 업데이트 시 전체를 재작성 — 대규모 클러스터에서 지연 발생

### IPVS 모드

대규모 클러스터에서 더 나은 성능을 제공합니다.

**동작 방식:**

1. kube-proxy가 IPVS 가상 서버를 생성
2. 각 Service의 ClusterIP가 IPVS 가상 서버로 등록
3. 해시 테이블 기반으로 목적지를 조회 — O(1) 성능

```bash
# IPVS 모드 활성화 (kube-proxy ConfigMap 수정)
kubectl edit configmap kube-proxy -n kube-system
```

```yaml
# kube-proxy ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    mode: "ipvs"
    ipvs:
      scheduler: "rr"    # 스케줄링 알고리즘
```

**IPVS가 지원하는 로드밸런싱 알고리즘:**

| 알고리즘 | 설명 |
|----------|------|
| `rr` | Round Robin — 순서대로 분배 |
| `lc` | Least Connection — 연결이 가장 적은 Pod로 |
| `dh` | Destination Hashing — 목적지 기반 해시 |
| `sh` | Source Hashing — 출발지 기반 해시 |
| `sed` | Shortest Expected Delay |
| `nq` | Never Queue |

### iptables vs IPVS 비교

| 항목 | iptables | IPVS |
|------|----------|------|
| **조회 성능** | O(n) 선형 | O(1) 해시 |
| **로드밸런싱** | 랜덤 확률 | rr, lc, sh 등 다양 |
| **규칙 업데이트** | 전체 재작성 | 개별 추가/삭제 |
| **대규모 클러스터** | 성능 저하 | 안정적 |
| **커널 모듈** | 불필요 | `ip_vs` 모듈 필요 |
| **디버깅** | `iptables -L`로 확인 | `ipvsadm -Ln`으로 확인 |
| **추천** | 소규모 (Service < 1,000) | 대규모 (Service > 1,000) |

### SessionAffinity

동일한 클라이언트의 요청을 **항상 같은 Pod**로 보내고 싶을 때 사용합니다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-service
spec:
  selector:
    app: web
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800   # 3시간 (기본값)
  ports:
    - port: 80
      targetPort: 8080
```

!!! warning "SessionAffinity 주의사항"
    - `ClientIP`만 지원됩니다 (쿠키 기반은 Ingress Controller에서 처리)
    - 프록시/NAT 뒤의 클라이언트는 같은 IP로 보이므로 하나의 Pod에 몰릴 수 있습니다
    - Stateless 아키텍처를 우선 고려하고, 꼭 필요한 경우에만 사용하세요

---

## NetworkPolicy

### 기본 개념

**NetworkPolicy**는 Pod 수준의 **방화벽 규칙**입니다. 어떤 트래픽이 Pod에 들어오고(Ingress) 나갈 수(Egress) 있는지 제어합니다.

!!! danger "중요: CNI 플러그인 의존"
    NetworkPolicy는 CNI 플러그인이 지원해야 동작합니다.
    **Flannel은 NetworkPolicy를 지원하지 않습니다!**
    Calico, Cilium, WeaveNet 등을 사용해야 합니다.

**핵심 규칙:**

- NetworkPolicy가 **없으면** → 모든 트래픽 허용 (기본 상태)
- NetworkPolicy가 **하나라도 적용되면** → 명시적으로 허용된 트래픽만 통과

### Default Deny 정책 — 기본 거부

보안을 위해 **먼저 모든 트래픽을 차단**하고, 필요한 것만 열어주는 것이 best practice입니다.

```yaml
# default-deny-all.yaml
# 모든 Ingress 트래픽 거부
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}          # 빈 selector = namespace의 모든 Pod에 적용
  policyTypes:
    - Ingress              # Ingress 정책만 (Egress는 허용 유지)
---
# 모든 Egress 트래픽 거부
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
---
# 모든 Ingress + Egress 거부 (가장 엄격)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

!!! warning "Default Deny 적용 후 DNS 주의"
    Egress를 전부 차단하면 **DNS 조회**도 차단됩니다.
    CoreDNS로의 Egress는 반드시 허용해야 합니다.

    ```yaml
    # dns-allow.yaml
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: allow-dns
      namespace: production
    spec:
      podSelector: {}
      policyTypes:
        - Egress
      egress:
        - to:
            - namespaceSelector:
                matchLabels:
                  kubernetes.io/metadata.name: kube-system
          ports:
            - protocol: UDP
              port: 53
            - protocol: TCP
              port: 53
    ```

### Selector 종류

NetworkPolicy에서 트래픽 소스/목적지를 지정하는 세 가지 방법:

**1. podSelector — 같은 namespace의 특정 Pod**

```yaml
ingress:
  - from:
      - podSelector:
          matchLabels:
            role: frontend
```

**2. namespaceSelector — 특정 namespace의 모든 Pod**

```yaml
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            env: staging
```

**3. ipBlock — 특정 IP 대역**

```yaml
ingress:
  - from:
      - ipBlock:
          cidr: 172.16.0.0/16
          except:
            - 172.16.1.0/24   # 이 대역은 제외
```

!!! info "AND vs OR 조건"
    `from` 배열의 각 항목은 **OR** 조건입니다. 하나의 항목 내에 여러 selector를 넣으면 **AND** 조건이 됩니다.

    ```yaml
    # OR: frontend Pod 또는 staging namespace에서 오는 트래픽 허용
    ingress:
      - from:
          - podSelector:
              matchLabels:
                role: frontend
          - namespaceSelector:
              matchLabels:
                env: staging

    # AND: staging namespace에 있는 frontend Pod에서만 허용
    ingress:
      - from:
          - podSelector:
              matchLabels:
                role: frontend
            namespaceSelector:
              matchLabels:
                env: staging
    ```

### 실전 시나리오 1 — 특정 namespace만 허용

`monitoring` namespace의 Prometheus가 `production` namespace의 Pod 메트릭을 수집하는 시나리오입니다.

```yaml
# allow-monitoring.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}           # production의 모든 Pod에 적용
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: monitoring
      ports:
        - protocol: TCP
          port: 9090         # Prometheus 메트릭 포트
```

### 실전 시나리오 2 — 특정 포트만 허용

DB Pod에 대해 **API 서버에서 3306 포트만** 접근을 허용합니다.

```yaml
# allow-db-access.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: mysql            # MySQL Pod에 적용
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-server
      ports:
        - protocol: TCP
          port: 3306         # MySQL 포트만 허용
```

### 실전 시나리오 3 — 외부 트래픽 차단 (내부만 허용)

내부 마이크로서비스 간 통신만 허용하고 외부 트래픽을 차단합니다.

```yaml
# internal-only.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: internal-only
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: internal-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector: {}    # 클러스터 내 모든 namespace 허용
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # DNS 허용
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # 클러스터 내부만 허용
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
```

### 실전 시나리오 4 — 3-Tier 아키텍처 네트워크 정책

Frontend → Backend → Database 구조에서 각 계층 간 통신만 허용합니다.

```yaml
# 3-tier-network-policy.yaml

# Frontend: Ingress에서만 접근 가능, Backend로만 Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - ipBlock:
            cidr: 0.0.0.0/0       # 외부 트래픽 허용
      ports:
        - protocol: TCP
          port: 80
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - protocol: TCP
          port: 8080
    - to:                          # DNS 허용
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53

# Backend: Frontend에서만 접근, Database로만 Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: database
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53

# Database: Backend에서만 접근, Egress 없음
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - protocol: TCP
          port: 5432
  egress: []                       # 모든 Egress 차단
```

### NetworkPolicy 시나리오 다이어그램

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">3-Tier NetworkPolicy 트래픽 제어</div>
  <div class="k8s-netpol-scenario">
    <!-- External -->
    <div class="k8s-netpol-external">
      <div class="k8s-netpol-icon">🌐</div>
      <div class="k8s-net-label">외부 트래픽</div>
    </div>
    <!-- Arrows from external -->
    <div class="k8s-netpol-arrows-row">
      <div class="k8s-netpol-arrow-allowed">
        <span class="k8s-arrow-line-v">│</span>
        <span class="k8s-arrow-line-v">│</span>
        <span class="k8s-arrow-line-v">▼</span>
        <span class="k8s-arrow-tag allowed">허용</span>
      </div>
    </div>
    <!-- Tiers -->
    <div class="k8s-netpol-tiers">
      <!-- Frontend -->
      <div class="k8s-netpol-tier" style="border-color: #89b4fa;">
        <div class="k8s-netpol-tier-header" style="background: rgba(137,180,250,0.15); color: #89b4fa;">Frontend</div>
        <div class="k8s-netpol-tier-body">
          <div class="k8s-netpol-pod-box">Pod: nginx</div>
          <div class="k8s-netpol-pod-box">Pod: nginx</div>
          <div class="k8s-netpol-port">:80</div>
        </div>
      </div>
      <!-- Arrow frontend -> backend -->
      <div class="k8s-netpol-tier-arrow">
        <div class="k8s-netpol-arrow-h-allowed">
          <span>→ :8080</span>
          <span class="k8s-arrow-tag allowed">허용</span>
        </div>
        <div class="k8s-netpol-arrow-h-denied">
          <span>→ :5432</span>
          <span class="k8s-arrow-tag denied">차단</span>
        </div>
      </div>
      <!-- Backend -->
      <div class="k8s-netpol-tier" style="border-color: #a6e3a1;">
        <div class="k8s-netpol-tier-header" style="background: rgba(166,227,161,0.15); color: #a6e3a1;">Backend</div>
        <div class="k8s-netpol-tier-body">
          <div class="k8s-netpol-pod-box">Pod: api</div>
          <div class="k8s-netpol-pod-box">Pod: api</div>
          <div class="k8s-netpol-port">:8080</div>
        </div>
      </div>
      <!-- Arrow backend -> database -->
      <div class="k8s-netpol-tier-arrow">
        <div class="k8s-netpol-arrow-h-allowed">
          <span>→ :5432</span>
          <span class="k8s-arrow-tag allowed">허용</span>
        </div>
        <div class="k8s-netpol-arrow-h-denied">
          <span>→ 외부</span>
          <span class="k8s-arrow-tag denied">차단</span>
        </div>
      </div>
      <!-- Database -->
      <div class="k8s-netpol-tier" style="border-color: #f9e2af;">
        <div class="k8s-netpol-tier-header" style="background: rgba(249,226,175,0.15); color: #f9e2af;">Database</div>
        <div class="k8s-netpol-tier-body">
          <div class="k8s-netpol-pod-box">Pod: postgres</div>
          <div class="k8s-netpol-port">:5432</div>
          <div class="k8s-netpol-pod-note">Egress 차단</div>
        </div>
      </div>
    </div>
    <!-- Denied external to backend/db -->
    <div class="k8s-netpol-denied-note">
      <span class="k8s-arrow-tag denied">차단</span> 외부 → Backend 직접 접근 불가&nbsp;&nbsp;|&nbsp;&nbsp;<span class="k8s-arrow-tag denied">차단</span> 외부 → Database 직접 접근 불가
    </div>
  </div>
</div>

<style>
.k8s-netpol-scenario {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
}
.k8s-netpol-external {
  text-align: center;
  padding: 8px 24px;
  border: 1.5px solid #f5c0e8;
  border-radius: 8px;
  background: rgba(245,192,232,0.08);
}
.k8s-netpol-icon {
  font-size: 1.5em;
  margin-bottom: 2px;
}
.k8s-netpol-arrows-row {
  display: flex;
  justify-content: center;
  gap: 32px;
}
.k8s-netpol-arrow-allowed {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #a6e3a1;
  font-family: monospace;
  font-size: 0.9em;
  line-height: 1.1;
}
.k8s-arrow-line-v {
  display: block;
}
.k8s-arrow-tag {
  font-size: 0.7em;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 4px;
  margin-top: 2px;
}
.k8s-arrow-tag.allowed {
  background: rgba(166,227,161,0.2);
  color: #a6e3a1;
  border: 1px solid rgba(166,227,161,0.3);
}
.k8s-arrow-tag.denied {
  background: rgba(243,139,168,0.2);
  color: #f38ba8;
  border: 1px solid rgba(243,139,168,0.3);
}
.k8s-netpol-tiers {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.k8s-netpol-tier {
  border: 1.5px solid;
  border-radius: 10px;
  overflow: hidden;
  min-width: 130px;
}
.k8s-netpol-tier-header {
  padding: 6px 16px;
  font-weight: 700;
  font-size: 0.9em;
  text-align: center;
}
.k8s-netpol-tier-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.k8s-netpol-pod-box {
  background: #313244;
  color: #cdd6f4;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.78em;
  font-family: 'JetBrains Mono', monospace;
}
.k8s-netpol-port {
  color: #6c7086;
  font-size: 0.75em;
  font-family: monospace;
}
.k8s-netpol-pod-note {
  color: #f38ba8;
  font-size: 0.7em;
  font-weight: 600;
}
.k8s-netpol-tier-arrow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  min-width: 80px;
}
.k8s-netpol-arrow-h-allowed {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #a6e3a1;
  font-family: monospace;
  font-size: 0.8em;
}
.k8s-netpol-arrow-h-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #f38ba8;
  font-family: monospace;
  font-size: 0.8em;
  text-decoration: line-through;
}
.k8s-netpol-denied-note {
  margin-top: 12px;
  color: #6c7086;
  font-size: 0.8em;
  text-align: center;
  padding: 8px 16px;
  border: 1px dashed #313244;
  border-radius: 6px;
}
</style>

---

## DNS (CoreDNS)

### 서비스 디스커버리

Kubernetes는 **CoreDNS**를 통해 클러스터 내 서비스 디스커버리를 제공합니다. Pod에서 Service 이름으로 요청하면 CoreDNS가 해당 ClusterIP를 반환합니다.

**DNS 레코드 형식:**

| 리소스 | DNS 형식 | 예시 |
|--------|----------|------|
| **Service** | `<service>.<namespace>.svc.cluster.local` | `backend.production.svc.cluster.local` |
| **Pod** | `<pod-ip-with-dashes>.<namespace>.pod.cluster.local` | `10-244-1-5.production.pod.cluster.local` |
| **Headless Service의 Pod** | `<pod-name>.<service>.<namespace>.svc.cluster.local` | `mysql-0.mysql.production.svc.cluster.local` |
| **SRV 레코드** | `_<port-name>._<protocol>.<service>.<namespace>.svc.cluster.local` | `_http._tcp.backend.production.svc.cluster.local` |

**DNS 조회 단축:**

같은 namespace 안에서는 Service 이름만으로도 충분합니다.

```bash
# 같은 namespace → 이름만
curl http://backend-service

# 다른 namespace → namespace 포함
curl http://backend-service.production

# FQDN (완전한 형식)
curl http://backend-service.production.svc.cluster.local
```

이것이 가능한 이유는 Pod의 `/etc/resolv.conf`에 검색 도메인이 설정되어 있기 때문입니다.

```bash
# Pod 내부에서 확인
cat /etc/resolv.conf
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

!!! info "ndots:5의 의미"
    DNS 이름에 점(.)이 5개 미만이면 검색 도메인을 순서대로 붙여서 시도합니다.
    `backend-service` → `backend-service.default.svc.cluster.local` → ... 순서로 조회합니다.
    외부 도메인(`google.com`)도 먼저 `google.com.default.svc.cluster.local`을 시도하므로
    불필요한 DNS 쿼리가 발생할 수 있습니다. 필요 시 `ndots` 값을 조정할 수 있습니다.

### Headless Service와 DNS

StatefulSet에서 Headless Service를 사용하면 각 Pod에 **고유한 DNS 이름**이 부여됩니다.

```yaml
# headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None        # Headless
  selector:
    app: mysql
  ports:
    - port: 3306
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql      # Headless Service 이름
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
```

생성되는 DNS:

```
mysql-0.mysql.default.svc.cluster.local  →  Pod mysql-0의 IP
mysql-1.mysql.default.svc.cluster.local  →  Pod mysql-1의 IP
mysql-2.mysql.default.svc.cluster.local  →  Pod mysql-2의 IP
```

### Pod DNS 정책

Pod의 `dnsPolicy` 필드로 DNS 동작을 제어합니다.

| 정책 | 설명 |
|------|------|
| `ClusterFirst` | **(기본값)** 클러스터 DNS(CoreDNS) 사용. 매칭 안 되면 upstream으로 전달 |
| `Default` | Node의 DNS 설정(`/etc/resolv.conf`) 그대로 사용 |
| `ClusterFirstWithHostNet` | `hostNetwork: true`인 Pod에서 클러스터 DNS 사용 시 |
| `None` | 모든 DNS 설정을 `dnsConfig`로 직접 지정 |

### 커스텀 DNS 설정

`dnsPolicy: None`과 함께 `dnsConfig`를 사용하여 완전히 커스터마이즈할 수 있습니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
    searches:
      - my-domain.local
      - default.svc.cluster.local
    options:
      - name: ndots
        value: "2"
      - name: timeout
        value: "3"
  containers:
    - name: app
      image: nginx
```

또는 기존 정책에 추가 설정을 덧붙일 수도 있습니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: extended-dns-pod
spec:
  dnsPolicy: ClusterFirst     # 기본 정책 유지
  dnsConfig:
    options:
      - name: ndots
        value: "2"             # 외부 도메인 조회 최적화
    searches:
      - my-custom.domain.local # 추가 검색 도메인
  containers:
    - name: app
      image: nginx
```

### CoreDNS 설정 확인 및 커스터마이즈

```bash
# CoreDNS Pod 상태 확인
kubectl get pods -n kube-system -l k8s-app=kube-dns

# CoreDNS ConfigMap 확인
kubectl get configmap coredns -n kube-system -o yaml
```

CoreDNS의 Corefile은 ConfigMap으로 관리됩니다.

```yaml
# CoreDNS ConfigMap 예시
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

!!! tip "CoreDNS 커스터마이즈 사례"
    특정 도메인을 사내 DNS로 포워딩하거나, 특정 레코드를 오버라이드할 수 있습니다.

    ```
    # 사내 도메인을 내부 DNS로 포워딩
    company.internal:53 {
        forward . 10.0.0.53
    }
    ```

---

## 디버깅 팁

네트워킹 문제는 K8s에서 가장 자주 발생하는 이슈 중 하나입니다. 다음 도구와 명령어가 도움이 됩니다.

### DNS 확인

```bash
# DNS 디버깅용 Pod 실행
kubectl run dnsutils --image=tutum/dnsutils --restart=Never -- sleep 3600

# nslookup으로 Service 조회
kubectl exec dnsutils -- nslookup backend-service
kubectl exec dnsutils -- nslookup backend-service.production.svc.cluster.local

# dig로 상세 조회
kubectl exec dnsutils -- dig backend-service.default.svc.cluster.local
```

### 연결 테스트

```bash
# curl로 Service 접근 테스트
kubectl run curl-test --image=curlimages/curl --restart=Never -- \
  curl -s http://backend-service:80

# Pod 간 직접 통신 테스트
kubectl exec -it <pod-name> -- ping <other-pod-ip>
kubectl exec -it <pod-name> -- curl http://<service-name>:<port>
```

### Service/Endpoints 확인

```bash
# Service 상세 정보
kubectl describe svc backend-service

# Endpoints 확인 — Pod IP가 잡히는지
kubectl get endpoints backend-service

# Service에 연결된 Pod 확인
kubectl get pods -l app=backend -o wide
```

### NetworkPolicy 디버깅

```bash
# 적용된 NetworkPolicy 목록
kubectl get networkpolicies -A

# NetworkPolicy 상세 확인
kubectl describe networkpolicy <policy-name>

# Pod에 적용된 정책 확인 (label 기반)
kubectl get networkpolicies -o yaml | grep -A 10 "podSelector"
```

!!! tip "네트워크 디버깅 체크리스트"
    1. **Pod가 정상인가?** — `kubectl get pods` (Running 상태 확인)
    2. **Service selector가 맞는가?** — Pod label과 Service selector 일치 여부
    3. **Endpoints가 생성되었는가?** — `kubectl get endpoints`
    4. **DNS가 동작하는가?** — `nslookup <service-name>`
    5. **NetworkPolicy가 차단하는가?** — 정책 확인 후 필요 시 일시 삭제로 테스트
    6. **포트가 맞는가?** — `port` vs `targetPort` 혼동 주의

---

## 정리

| 개념 | 핵심 역할 | 기억할 포인트 |
|------|-----------|---------------|
| **CNI** | Pod 네트워크 구현 | Calico(범용), Cilium(고성능), Flannel(학습) |
| **ClusterIP** | 클러스터 내부 통신 | 기본 Service 타입, 가상 IP 할당 |
| **NodePort** | 외부 노출 (30000-32767) | 개발/테스트용, 프로덕션 비추천 |
| **LoadBalancer** | 클라우드 LB 연동 | 서비스당 LB 1개 — 비용 주의 |
| **ExternalName** | 외부 DNS CNAME | selector 없음, DNS 매핑만 |
| **Ingress** | L7 HTTP 라우팅 | Ingress Controller 필수, LB 1개로 여러 서비스 |
| **kube-proxy** | Service → Pod 라우팅 | iptables(기본) vs IPVS(대규모) |
| **NetworkPolicy** | Pod 방화벽 | CNI 지원 필요, Default Deny 먼저 |
| **CoreDNS** | 서비스 디스커버리 | `<svc>.<ns>.svc.cluster.local` |

!!! tip "다음 챕터 예고"
    다음 장에서는 **스토리지와 볼륨**을 다룹니다.
    PersistentVolume, PersistentVolumeClaim, StorageClass 등 데이터를 영구적으로 보존하는 방법을 배웁니다.
