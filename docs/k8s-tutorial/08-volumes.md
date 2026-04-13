# 8. 스토리지와 설정 관리

## 왜 볼륨이 필요한가

### 컨테이너의 휘발성 파일시스템

컨테이너는 기본적으로 **휘발성(ephemeral) 파일시스템**을 사용합니다. 컨테이너 내부에서 파일을 생성하거나 수정해도, 컨테이너가 재시작되면 **모든 변경사항이 사라집니다**.

```
[컨테이너 시작] → 파일 생성 → 데이터 저장 → [컨테이너 재시작] → 데이터 사라짐!
```

이것은 컨테이너의 파일시스템이 **이미지 레이어 위에 쓰기 가능한 얇은 레이어(writable layer)**로 구성되기 때문입니다. 컨테이너가 삭제되면 이 레이어도 함께 삭제됩니다.

```bash
# 컨테이너 내부에서 파일 생성
kubectl exec my-pod -- sh -c "echo 'important data' > /tmp/data.txt"

# 컨테이너가 재시작되면...
kubectl delete pod my-pod
kubectl exec my-pod-new -- cat /tmp/data.txt
# cat: /tmp/data.txt: No such file or directory
```

### 데이터 영속성 문제

실제 운영 환경에서는 데이터를 영구적으로 보존해야 하는 경우가 많습니다.

- **데이터베이스**: MySQL, PostgreSQL의 데이터 파일
- **파일 업로드**: 사용자가 업로드한 이미지, 문서
- **로그**: 애플리케이션 로그, 감사 로그
- **설정 파일**: 애플리케이션 설정, 인증서

!!! danger "컨테이너 재시작 시 데이터 손실"
    Pod가 재스케줄링되거나 컨테이너가 크래시로 재시작되면, 볼륨 없이는 모든 데이터가 손실됩니다. 프로덕션 환경에서 데이터베이스를 볼륨 없이 운영하는 것은 **절대 금지**입니다.

Kubernetes는 이 문제를 해결하기 위해 **Volume**이라는 추상화를 제공합니다. Volume을 사용하면 컨테이너의 라이프사이클과 독립적으로 데이터를 보존할 수 있습니다.

---

## Volume 타입 개요

Kubernetes는 다양한 Volume 타입을 지원합니다. 각각의 특성과 사용 사례가 다릅니다.

### emptyDir

Pod가 노드에 할당될 때 생성되는 **빈 디렉토리**입니다. Pod 내의 모든 컨테이너가 공유할 수 있으며, **Pod가 삭제되면 함께 삭제**됩니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-example
spec:
  containers:
    - name: writer
      image: busybox
      command: ["sh", "-c", "echo 'shared data' > /data/message.txt && sleep 3600"]
      volumeMounts:
        - name: shared-data
          mountPath: /data
    - name: reader
      image: busybox
      command: ["sh", "-c", "sleep 5 && cat /data/message.txt && sleep 3600"]
      volumeMounts:
        - name: shared-data
          mountPath: /data
  volumes:
    - name: shared-data
      emptyDir: {}
```

!!! tip "emptyDir 사용 사례"
    - 동일 Pod 내 컨테이너 간 임시 데이터 공유
    - 캐시 저장소 (디스크 기반 캐시)
    - 체크포인트 저장 (긴 연산 중간 결과)

### hostPath

**노드의 파일시스템**을 Pod에 마운트합니다. 노드의 특정 경로에 있는 파일이나 디렉토리를 직접 사용합니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-example
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "ls /host-logs && sleep 3600"]
      volumeMounts:
        - name: host-logs
          mountPath: /host-logs
          readOnly: true
  volumes:
    - name: host-logs
      hostPath:
        path: /var/log
        type: Directory
```

!!! warning "hostPath 주의사항"
    - 노드에 종속적이므로 **Pod가 다른 노드로 스케줄링되면 데이터에 접근 불가**
    - 보안 위험이 있어 프로덕션에서는 가급적 사용하지 않는 것을 권장
    - DaemonSet에서 노드 로그 수집 등 특수한 경우에만 사용

### nfs

**NFS(Network File System) 서버**의 경로를 마운트합니다. 여러 Pod가 동시에 같은 NFS 볼륨을 공유할 수 있습니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-example
spec:
  containers:
    - name: app
      image: nginx
      volumeMounts:
        - name: nfs-volume
          mountPath: /usr/share/nginx/html
  volumes:
    - name: nfs-volume
      nfs:
        server: 192.168.1.100
        path: /exported/path
```

### csi

**CSI(Container Storage Interface)**는 Kubernetes의 표준 스토리지 인터페이스입니다. AWS EBS, GCE PD, Azure Disk 등 클라우드 스토리지를 포함하여 다양한 스토리지 시스템을 플러그인 방식으로 연결합니다.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: csi-pv-example
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: vol-0abc123def456
```

### Volume 타입 비교

| 타입 | 데이터 수명 | 다중 노드 접근 | 용도 | 프로덕션 적합 |
|------|------------|---------------|------|-------------|
| `emptyDir` | Pod와 동일 | 불가 (같은 Pod 내 컨테이너만) | 임시 캐시, 컨테이너 간 공유 | 임시 데이터만 |
| `hostPath` | 노드와 동일 | 불가 (해당 노드만) | 노드 로그 수집, DaemonSet | 제한적 |
| `nfs` | NFS 서버와 동일 | 가능 | 공유 파일 시스템 | 적합 |
| `csi` | 스토리지 시스템과 동일 | 드라이버에 따라 다름 | 클라우드 블록/파일 스토리지 | 권장 |

---

## PersistentVolume (PV) 상세

### PV란?

**PersistentVolume(PV)**은 클러스터 관리자가 프로비저닝한 스토리지 리소스입니다. 노드가 클러스터의 컴퓨팅 리소스인 것처럼, PV는 클러스터의 **스토리지 리소스**입니다.

PV의 핵심 특징:

- **클러스터 레벨 리소스** (특정 네임스페이스에 속하지 않음)
- Pod의 라이프사이클과 **독립적으로 존재**
- 관리자가 미리 생성해두거나 StorageClass를 통해 동적으로 생성

### accessModes

PV가 노드에 마운트되는 방식을 정의합니다.

| 모드 | 약어 | 설명 |
|------|------|------|
| `ReadWriteOnce` | RWO | **하나의 노드**에서 읽기/쓰기 가능 |
| `ReadOnlyMany` | ROX | **여러 노드**에서 읽기 전용으로 마운트 가능 |
| `ReadWriteMany` | RWX | **여러 노드**에서 읽기/쓰기 가능 |

!!! info "accessModes와 스토리지 타입"
    - **블록 스토리지** (EBS, GCE PD): 일반적으로 `ReadWriteOnce`만 지원
    - **파일 스토리지** (NFS, EFS): `ReadWriteMany` 지원
    - 실제 지원 여부는 스토리지 드라이버에 따라 다르므로 항상 문서를 확인하세요

### persistentVolumeReclaimPolicy

PVC가 삭제된 후 PV를 어떻게 처리할지 결정합니다.

| 정책 | 설명 | 사용 시나리오 |
|------|------|-------------|
| `Retain` | PV와 데이터를 **보존**. 관리자가 수동으로 정리 | 중요한 데이터 (DB, 사용자 업로드) |
| `Recycle` | 볼륨 내용을 삭제(`rm -rf /volume/*`)하고 재사용 | 더 이상 권장하지 않음 (deprecated) |
| `Delete` | PV와 연결된 **외부 스토리지도 함께 삭제** | 임시/테스트 환경, 동적 프로비저닝 |

!!! danger "Delete 정책 주의"
    `Delete` 정책은 PVC를 삭제하면 **실제 스토리지(EBS 볼륨 등)까지 삭제**합니다. 프로덕션 데이터에는 반드시 `Retain` 정책을 사용하세요.

### 완전한 PV YAML

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
  labels:
    type: local
    environment: production
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  # NFS 스토리지 예시
  nfs:
    server: 192.168.1.100
    path: /data/volumes/my-pv
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: aws-ebs-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: gp3
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: vol-0abc123def456789
    fsType: ext4
```

```bash
# PV 생성 및 확인
kubectl apply -f pv.yaml
kubectl get pv
kubectl describe pv my-pv
```

---

## PersistentVolumeClaim (PVC) 상세

### PVC란?

**PersistentVolumeClaim(PVC)**은 사용자(개발자)가 스토리지를 **요청**하는 리소스입니다. PV가 실제 스토리지라면, PVC는 그 스토리지를 사용하겠다는 **요청서**입니다.

비유하자면:

- **PV** = 아파트 (관리자가 건설)
- **PVC** = 입주 신청서 (개발자가 작성)
- **바인딩** = 입주 승인 (조건에 맞는 아파트 배정)

### PV-PVC 바인딩 과정

PVC가 생성되면 Kubernetes 컨트롤러가 적합한 PV를 찾아 바인딩합니다.

```
1. PVC 생성 → 조건 명시 (크기, accessMode, storageClassName)
2. 컨트롤러가 조건에 맞는 PV 탐색
3. 적합한 PV 발견 → 바인딩 (1:1 관계)
4. PV 상태: Available → Bound
5. PVC 상태: Pending → Bound
```

바인딩 조건:

- **용량**: PVC 요청 크기 이상인 PV
- **accessModes**: PVC가 요청한 모드를 지원하는 PV
- **storageClassName**: PVC와 PV의 storageClassName이 일치
- **selector**: PVC에 labelSelector가 있으면 해당 라벨을 가진 PV만 매칭

!!! info "바인딩은 1:1 관계"
    하나의 PV는 하나의 PVC에만 바인딩됩니다. PV의 용량이 PVC 요청보다 훨씬 크더라도, 바인딩된 PV 전체가 해당 PVC에 할당됩니다. 예를 들어 100Gi PV에 10Gi PVC가 바인딩되면 나머지 90Gi는 낭비됩니다.

### storageClassName 연동

`storageClassName`은 PV와 PVC를 매칭시키는 핵심 필드입니다.

```
storageClassName: "fast-ssd"인 PVC → storageClassName: "fast-ssd"인 PV와 매칭
storageClassName: ""인 PVC         → storageClassName: ""인 PV와 매칭 (정적 프로비저닝)
storageClassName 생략한 PVC        → 기본 StorageClass 사용 (동적 프로비저닝)
```

### 완전한 PVC YAML

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: manual
  # 특정 PV를 선택하고 싶을 때 라벨 셀렉터 사용
  selector:
    matchLabels:
      type: local
      environment: production
```

```bash
# PVC 생성 및 확인
kubectl apply -f pvc.yaml
kubectl get pvc
kubectl describe pvc my-pvc

# 바인딩 상태 확인
kubectl get pv,pvc
```

### Pod에서 PVC 사용하기

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-storage
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 80
      volumeMounts:
        - name: persistent-storage
          mountPath: /usr/share/nginx/html
        - name: logs-storage
          mountPath: /var/log/nginx
  volumes:
    - name: persistent-storage
      persistentVolumeClaim:
        claimName: my-pvc
    - name: logs-storage
      persistentVolumeClaim:
        claimName: logs-pvc
```

!!! tip "Deployment에서 PVC 사용 시 주의"
    `ReadWriteOnce` PVC를 사용하는 Deployment의 replicas를 2 이상으로 설정하면, Pod들이 서로 다른 노드에 스케줄링될 경우 마운트에 실패합니다. `ReadWriteMany`를 지원하는 스토리지를 사용하거나, `StatefulSet`을 활용하세요.

---

## StorageClass 상세

### 동적 프로비저닝 개념

지금까지 살펴본 방식은 **정적 프로비저닝(Static Provisioning)**입니다. 관리자가 PV를 미리 만들어두고, 개발자가 PVC로 요청하는 방식입니다.

하지만 이 방식에는 한계가 있습니다:

- 관리자가 **미리 충분한 PV를 생성**해두어야 함
- PV가 부족하면 개발자가 **관리자에게 요청하고 기다려야** 함
- 다양한 크기/성능의 PV를 미리 준비해야 하므로 **자원 낭비** 발생

**동적 프로비저닝(Dynamic Provisioning)**은 이 문제를 해결합니다. PVC가 생성되면 StorageClass가 자동으로 PV를 생성합니다.

```
정적 프로비저닝:  관리자가 PV 생성 → 개발자가 PVC 생성 → 바인딩
동적 프로비저닝:  개발자가 PVC 생성 → StorageClass가 자동으로 PV 생성 → 바인딩
```

### provisioner별 설정

StorageClass의 `provisioner` 필드는 어떤 볼륨 플러그인이 PV를 생성할지 결정합니다.

#### AWS EBS (Elastic Block Store)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ebs
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "5000"
  throughput: "250"
  encrypted: "true"
  fsType: ext4
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

#### GCE Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-gce
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

#### NFS (외부 프로비저너)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-storage
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100
  share: /exported/path
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
```

### reclaimPolicy와 volumeBindingMode

#### reclaimPolicy

StorageClass 수준에서 설정하는 회수 정책입니다. 동적으로 생성되는 PV의 기본 회수 정책을 결정합니다.

- `Delete` (기본값): PVC 삭제 시 PV와 실제 스토리지도 삭제
- `Retain`: PVC 삭제 후에도 PV와 데이터 보존

#### volumeBindingMode

PV가 생성되고 바인딩되는 **시점**을 제어합니다.

| 모드 | 설명 | 장점 |
|------|------|------|
| `Immediate` | PVC 생성 즉시 PV 프로비저닝 및 바인딩 | 빠른 바인딩 |
| `WaitForFirstConsumer` | Pod가 스케줄링될 때까지 PV 프로비저닝을 **지연** | 토폴로지 인식 (AZ 매칭) |

!!! warning "WaitForFirstConsumer vs Immediate"
    **클라우드 환경에서는 반드시 `WaitForFirstConsumer`를 사용하세요.** `Immediate` 모드에서는 PV가 임의의 가용영역(AZ)에 생성될 수 있어, Pod가 다른 AZ에 스케줄링되면 마운트가 실패합니다. `WaitForFirstConsumer`는 Pod가 스케줄링될 노드의 AZ에 맞춰 PV를 생성합니다.

```
Immediate 모드:
  PVC 생성 → PV가 AZ-a에 생성 → Pod가 AZ-b에 스케줄링 → 마운트 실패!

WaitForFirstConsumer 모드:
  PVC 생성 → 대기 → Pod가 AZ-b에 스케줄링 → PV가 AZ-b에 생성 → 마운트 성공!
```

### 기본 StorageClass 설정

클러스터에 기본 StorageClass를 설정하면, `storageClassName`을 지정하지 않은 PVC에 자동으로 적용됩니다.

```bash
# 기본 StorageClass 확인
kubectl get storageclass

# annotation으로 기본 StorageClass 설정
kubectl patch storageclass fast-ebs -p \
  '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

!!! info "기본 StorageClass"
    대부분의 관리형 Kubernetes 서비스(EKS, GKE, AKS)에는 이미 기본 StorageClass가 설정되어 있습니다. `kubectl get sc`로 확인할 수 있으며, `(default)` 표시가 붙은 항목이 기본 StorageClass입니다.

### 실전 StorageClass YAML

```yaml
# 프로덕션 환경: 고성능 SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: production-fast
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "10000"
  throughput: "500"
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# 개발 환경: 범용 스토리지
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dev-standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

---

## ConfigMap 완전 정복

### ConfigMap이란?

**ConfigMap**은 비밀이 아닌 설정 데이터를 키-값 쌍으로 저장하는 Kubernetes 리소스입니다. 애플리케이션 코드와 설정을 분리하여, 동일한 컨테이너 이미지를 환경별로 다른 설정으로 실행할 수 있게 합니다.

ConfigMap에 저장하는 데이터:

- 환경 변수 (DB 호스트, 포트, 로그 레벨)
- 설정 파일 (nginx.conf, application.properties)
- 커맨드라인 인자

!!! warning "ConfigMap에 저장하면 안 되는 데이터"
    비밀번호, API 키, 토큰 등 민감한 데이터는 ConfigMap이 아니라 **Secret**에 저장해야 합니다. ConfigMap은 암호화되지 않은 평문으로 저장됩니다.

### 생성 방법

#### 1. 리터럴(literal)로 생성

```bash
kubectl create configmap app-config \
  --from-literal=DATABASE_HOST=db.example.com \
  --from-literal=DATABASE_PORT=5432 \
  --from-literal=LOG_LEVEL=info
```

#### 2. 파일(file)로 생성

```bash
# 설정 파일 생성
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }

    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
EOF

# 파일로부터 ConfigMap 생성
kubectl create configmap nginx-config --from-file=nginx.conf
```

#### 3. 디렉토리(directory)로 생성

```bash
# 설정 파일이 있는 디렉토리
mkdir config-dir
echo "key1=value1" > config-dir/app.env
echo "key2=value2" > config-dir/db.env

# 디렉토리의 모든 파일을 ConfigMap으로
kubectl create configmap dir-config --from-file=config-dir/
```

#### 4. YAML 매니페스트로 생성

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  # 단순 키-값 쌍
  DATABASE_HOST: "db.example.com"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"

  # 파일 형태의 설정 (멀티라인)
  application.properties: |
    spring.datasource.url=jdbc:postgresql://db.example.com:5432/mydb
    spring.datasource.driver-class-name=org.postgresql.Driver
    spring.jpa.hibernate.ddl-auto=validate
    logging.level.root=INFO
    server.port=8080

  nginx.conf: |
    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
```

### 사용 방법

#### 1. 개별 환경 변수로 주입 (env)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-env
spec:
  containers:
    - name: app
      image: my-app:1.0
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
        - name: DB_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_PORT
```

#### 2. 전체 키를 환경 변수로 주입 (envFrom)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-envfrom
spec:
  containers:
    - name: app
      image: my-app:1.0
      envFrom:
        - configMapRef:
            name: app-config
          prefix: APP_  # 선택사항: 모든 키에 접두사 추가
```

!!! tip "envFrom의 prefix"
    `prefix: APP_`을 설정하면 ConfigMap의 `DATABASE_HOST`가 Pod 안에서 `APP_DATABASE_HOST`로 노출됩니다. 여러 ConfigMap을 사용할 때 키 충돌을 방지하는 데 유용합니다.

#### 3. 볼륨 마운트 (volumeMount)

ConfigMap의 데이터를 파일로 마운트합니다. 설정 파일을 통째로 전달할 때 사용합니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-volume
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      volumeMounts:
        - name: nginx-config-volume
          mountPath: /etc/nginx/conf.d
          readOnly: true
        - name: app-config-volume
          mountPath: /etc/app
          readOnly: true
  volumes:
    - name: nginx-config-volume
      configMap:
        name: nginx-config
        items:
          - key: nginx.conf
            path: default.conf   # 마운트 경로 내 파일명 변경
    - name: app-config-volume
      configMap:
        name: app-config
        items:
          - key: application.properties
            path: application.properties
```

### ConfigMap 변경 시 Pod 반영 방식

ConfigMap을 수정하면 반영 방식이 **사용 방법에 따라 다릅니다**.

| 사용 방식 | 자동 반영 | 반영 시간 |
|-----------|----------|----------|
| 환경 변수 (`env`, `envFrom`) | 불가 (Pod 재시작 필요) | Pod 재시작 시 즉시 |
| 볼륨 마운트 (`volumeMount`) | 자동 반영 | kubelet sync 주기 (기본 60초) |
| 볼륨 마운트 + `subPath` | 불가 (Pod 재시작 필요) | Pod 재시작 시 즉시 |

!!! info "볼륨 마운트의 자동 반영"
    볼륨으로 마운트된 ConfigMap은 약 60초 이내에 자동으로 파일이 갱신됩니다. 하지만 **애플리케이션이 파일 변경을 감지하고 리로드하는지는 별개의 문제**입니다. nginx는 `nginx -s reload` 시그널이 필요하고, Spring Boot는 `spring-cloud-kubernetes`와 같은 라이브러리가 필요합니다.

### 실전 시나리오: nginx.conf

```yaml
# 1. ConfigMap: nginx 설정
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-frontend-config
data:
  default.conf: |
    upstream backend {
        server backend-svc:8080;
    }

    server {
        listen 80;
        server_name _;

        # 정적 파일
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # API 프록시
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # 헬스체크
        location /healthz {
            return 200 'ok';
            add_header Content-Type text/plain;
        }
    }
---
# 2. Deployment: nginx + ConfigMap
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d
              readOnly: true
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-frontend-config
```

### 실전 시나리오: application.properties

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spring-app-config
data:
  application.properties: |
    # Server
    server.port=8080
    server.servlet.context-path=/api

    # Database
    spring.datasource.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
    spring.datasource.driver-class-name=org.postgresql.Driver
    spring.jpa.hibernate.ddl-auto=validate
    spring.jpa.show-sql=false

    # Logging
    logging.level.root=INFO
    logging.level.com.example=DEBUG

    # Cache
    spring.cache.type=redis
    spring.redis.host=${REDIS_HOST}
    spring.redis.port=6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: app
          image: my-spring-app:2.1
          ports:
            - containerPort: 8080
          env:
            - name: DB_HOST
              value: "postgres-svc"
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: "myapp"
            - name: REDIS_HOST
              value: "redis-svc"
          volumeMounts:
            - name: app-config
              mountPath: /app/config
              readOnly: true
      volumes:
        - name: app-config
          configMap:
            name: spring-app-config
```

---

## Secret 완전 정복

### Secret이란?

**Secret**은 비밀번호, 토큰, SSH 키 등 **민감한 데이터**를 저장하는 Kubernetes 리소스입니다. ConfigMap과 구조는 비슷하지만, 민감 데이터를 위한 추가적인 보호 메커니즘을 제공합니다.

Secret의 특징:

- 데이터가 **base64로 인코딩**되어 저장 (암호화가 아님!)
- etcd에서 **암호화(Encryption at Rest)** 설정 가능
- RBAC으로 **접근 제어** 가능
- 볼륨으로 마운트 시 **tmpfs(메모리 기반 파일시스템)**에 저장

!!! danger "base64 != 암호화"
    base64는 **인코딩**이지 **암호화가 아닙니다**. `echo "cGFzc3dvcmQ=" | base64 -d` 명령으로 누구나 디코딩할 수 있습니다. Secret을 안전하게 관리하려면 etcd 암호화 설정, RBAC 제한, 외부 시크릿 관리 도구 사용이 필요합니다.

### Secret 타입

| 타입 | 설명 | 용도 |
|------|------|------|
| `Opaque` | 기본 타입. 임의의 키-값 쌍 | 비밀번호, API 키, 일반 시크릿 |
| `kubernetes.io/dockerconfigjson` | Docker 레지스트리 인증 정보 | Private 컨테이너 이미지 pull |
| `kubernetes.io/tls` | TLS 인증서와 개인키 | HTTPS, Ingress TLS 종료 |
| `kubernetes.io/basic-auth` | 기본 인증 정보 (username/password) | HTTP Basic Auth |
| `kubernetes.io/ssh-auth` | SSH 인증 키 | Git 클론 등 SSH 접근 |
| `kubernetes.io/service-account-token` | ServiceAccount 토큰 | API 서버 인증 (자동 생성) |

### base64 인코딩 주의사항

Secret YAML에서 `data` 필드의 값은 반드시 **base64로 인코딩**해야 합니다.

```bash
# 인코딩
echo -n 'my-password' | base64
# bXktcGFzc3dvcmQ=

# 디코딩 (확인용)
echo 'bXktcGFzc3dvcmQ=' | base64 -d
# my-password
```

!!! warning "echo -n 을 잊지 마세요"
    `echo 'password' | base64`는 줄바꿈 문자(`\n`)를 포함하여 인코딩합니다. 반드시 `-n` 옵션을 사용하여 줄바꿈 없이 인코딩하세요. 그렇지 않으면 `password\n`이 시크릿 값이 됩니다.

`stringData` 필드를 사용하면 base64 인코딩 없이 평문으로 작성할 수 있습니다. Kubernetes가 자동으로 인코딩합니다.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
type: Opaque
stringData:           # base64 인코딩 불필요
  username: admin
  password: my-password
```

### 생성 및 사용 방법

#### Secret 생성

```bash
# 리터럴로 생성
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='S3cur3P@ss!'

# 파일로 생성
kubectl create secret generic tls-secret \
  --from-file=tls.crt=./server.crt \
  --from-file=tls.key=./server.key

# Docker 레지스트리 시크릿 생성
kubectl create secret docker-registry my-registry \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password='password' \
  --docker-email=user@example.com

# TLS 시크릿 생성
kubectl create secret tls my-tls-secret \
  --cert=./tls.crt \
  --key=./tls.key
```

#### YAML로 Secret 정의

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
data:
  username: YWRtaW4=          # echo -n 'admin' | base64
  password: UzNjdXIzUEBzcyE=  # echo -n 'S3cur3P@ss!' | base64
  connection-string: cG9zdGdyZXNxbDovL2FkbWluOlMzY3VyM1BAc3MhQGRiLmV4YW1wbGUuY29tOjU0MzIvbXlkYg==
```

#### Pod에서 Secret 사용

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  containers:
    - name: app
      image: my-app:1.0
      # 방법 1: 개별 환경 변수
      env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
      # 방법 2: 볼륨 마운트 (파일로 전달)
      volumeMounts:
        - name: secret-volume
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secret-volume
      secret:
        secretName: db-credentials
        defaultMode: 0400  # 읽기 전용 권한
```

#### imagePullSecrets로 Private 레지스트리 사용

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-image-pod
spec:
  containers:
    - name: app
      image: registry.example.com/my-app:1.0
  imagePullSecrets:
    - name: my-registry
```

### Secret을 안전하게 관리하는 방법

기본 Kubernetes Secret은 보안이 충분하지 않습니다. 프로덕션 환경에서는 다음 도구들을 활용하세요.

#### Sealed Secrets (Bitnami)

Git에 Secret을 안전하게 커밋할 수 있게 해주는 도구입니다. 공개키로 암호화된 `SealedSecret` 리소스를 생성하며, 클러스터 내 컨트롤러만 복호화할 수 있습니다.

```bash
# kubeseal CLI 설치
brew install kubeseal

# Secret을 SealedSecret으로 변환
kubectl create secret generic db-credentials \
  --from-literal=password='S3cur3P@ss!' \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-secret.yaml
```

```yaml
# sealed-secret.yaml (Git에 커밋 가능)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  encryptedData:
    password: AgBy3i4OJSWK+PiTySYZZA9rO...  # 암호화된 값
```

#### External Secrets Operator

AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager 등 **외부 시크릿 저장소**와 연동합니다. 외부 시스템에서 시크릿을 가져와 Kubernetes Secret으로 자동 동기화합니다.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: production/db-credentials
        property: username
    - secretKey: password
      remoteRef:
        key: production/db-credentials
        property: password
```

!!! tip "프로덕션 Secret 관리 권장사항"
    1. **etcd 암호화** 설정 (EncryptionConfiguration)
    2. **RBAC**으로 Secret 접근 최소화
    3. **External Secrets Operator** 또는 **Sealed Secrets** 사용
    4. Secret을 Git에 **절대 평문으로 커밋하지 않기**
    5. `kubectl get secret -o yaml`로 시크릿을 조회할 수 있는 권한 제한

### 실전 시나리오: DB 접속 정보

```yaml
# 1. Secret: DB 접속 정보
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
type: Opaque
stringData:
  POSTGRES_USER: app_user
  POSTGRES_PASSWORD: "V3ryS3cur3P@ssw0rd"
  POSTGRES_DB: production_db
---
# 2. ConfigMap: DB 설정 (비밀이 아닌 정보)
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  POSTGRES_HOST: "postgres-svc"
  POSTGRES_PORT: "5432"
  POSTGRES_SSL_MODE: "require"
---
# 3. StatefulSet: PostgreSQL
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-svc
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: postgres-credentials
            - configMapRef:
                name: postgres-config
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: production-fast
        resources:
          requests:
            storage: 50Gi
---
# 4. 애플리케이션에서 DB 연결
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: app
          image: my-backend:2.0
          env:
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: POSTGRES_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: POSTGRES_PASSWORD
          envFrom:
            - configMapRef:
                name: postgres-config
```

### 실전 시나리오: TLS 인증서

```yaml
# 1. TLS Secret 생성 (명령어)
# kubectl create secret tls my-app-tls \
#   --cert=./fullchain.pem \
#   --key=./privkey.pem

# 2. Ingress에서 TLS 사용
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: my-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
```

---

## PV/PVC 라이프사이클

PV와 PVC의 전체 라이프사이클을 도식으로 살펴보겠습니다.

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">PV/PVC 라이프사이클</div>
  <div class="k8s-storage-flow">
    <div class="k8s-storage-admin">
      <div class="k8s-storage-label">관리자</div>
      <div class="k8s-storage-box k8s-pv">PersistentVolume</div>
    </div>
    <div class="k8s-storage-arrow">← 바인딩 →</div>
    <div class="k8s-storage-user">
      <div class="k8s-storage-label">개발자</div>
      <div class="k8s-storage-box k8s-pvc">PersistentVolumeClaim</div>
    </div>
    <div class="k8s-storage-arrow">→ 마운트 →</div>
    <div class="k8s-storage-box k8s-pod">Pod</div>
  </div>
</div>

### 라이프사이클 단계

PV/PVC의 라이프사이클은 다음 단계를 거칩니다.

**1단계: 프로비저닝 (Provisioning)**

스토리지를 준비하는 단계입니다.

- **정적 프로비저닝**: 관리자가 PV를 직접 생성
- **동적 프로비저닝**: StorageClass가 PVC 요청에 따라 자동 생성

**2단계: 바인딩 (Binding)**

PVC가 조건에 맞는 PV를 찾아 1:1로 연결되는 단계입니다.

```bash
# PV 상태 확인
kubectl get pv
# NAME    CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS
# my-pv   20Gi       RWO            Retain           Bound

# PVC 상태 확인
kubectl get pvc
# NAME     STATUS   VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS
# my-pvc   Bound    my-pv    20Gi       RWO            manual
```

**3단계: 사용 (Using)**

Pod가 PVC를 볼륨으로 마운트하여 실제 스토리지를 사용하는 단계입니다.

**4단계: 반환 (Reclaiming)**

PVC가 삭제되면 `reclaimPolicy`에 따라 PV가 처리됩니다.

```
PVC 삭제 후 PV 상태:
  Retain → Released (수동 정리 필요)
  Delete → 자동 삭제 (스토리지 포함)
```

!!! tip "Released 상태의 PV 재사용"
    `Retain` 정책으로 `Released` 상태가 된 PV는 바로 재사용할 수 없습니다. PV의 `spec.claimRef`를 제거해야 다시 `Available` 상태로 전환됩니다.
    ```bash
    kubectl patch pv my-pv -p '{"spec":{"claimRef": null}}'
    ```

### PV 상태 전이

```
                ┌───────────┐
                │ Available │  ← PV 생성됨 (PVC 없음)
                └─────┬─────┘
                      │ PVC와 바인딩
                      ▼
                ┌───────────┐
                │   Bound   │  ← PVC와 연결됨
                └─────┬─────┘
                      │ PVC 삭제
                      ▼
           ┌──────────┴──────────┐
           │                     │
    ┌──────┴──────┐       ┌─────┴─────┐
    │  Released   │       │  Deleted  │
    │  (Retain)   │       │  (Delete) │
    └─────────────┘       └───────────┘
```

---

## 정리: ConfigMap vs Secret 비교

| 항목 | ConfigMap | Secret |
|------|-----------|--------|
| **용도** | 비밀이 아닌 설정 데이터 | 민감한 데이터 |
| **저장 형식** | 평문 | base64 인코딩 |
| **크기 제한** | 1MiB | 1MiB |
| **마운트 시 파일시스템** | 일반 파일시스템 | tmpfs (메모리) |
| **etcd 암호화** | 기본 미지원 | 설정 시 지원 |
| **RBAC** | 일반 권한 | 별도 세분화 권한 가능 |
| **예시** | DB 호스트, 로그 레벨, nginx.conf | 비밀번호, API 키, TLS 인증서 |

## 정리: 스토리지 리소스 관계

```
StorageClass (동적 프로비저닝 정책)
     │
     │ 자동 생성
     ▼
PersistentVolume (실제 스토리지)
     │
     │ 바인딩 (1:1)
     ▼
PersistentVolumeClaim (스토리지 요청)
     │
     │ 마운트
     ▼
Pod → Container (볼륨 사용)
```

## 핵심 명령어 모음

```bash
# PV 관리
kubectl get pv                          # PV 목록 조회
kubectl describe pv <pv-name>           # PV 상세 정보
kubectl delete pv <pv-name>             # PV 삭제

# PVC 관리
kubectl get pvc                         # PVC 목록 조회
kubectl get pvc -A                      # 전체 네임스페이스 PVC 조회
kubectl describe pvc <pvc-name>         # PVC 상세 정보

# StorageClass 관리
kubectl get sc                          # StorageClass 목록
kubectl describe sc <sc-name>           # StorageClass 상세

# ConfigMap 관리
kubectl get configmap                   # ConfigMap 목록
kubectl describe configmap <cm-name>    # ConfigMap 상세
kubectl get configmap <cm-name> -o yaml # ConfigMap YAML 출력

# Secret 관리
kubectl get secret                      # Secret 목록
kubectl describe secret <secret-name>   # Secret 상세 (값은 숨김)
kubectl get secret <secret-name> -o jsonpath='{.data.password}' | base64 -d
                                        # Secret 값 디코딩 조회
```

!!! info "다음 챕터 미리보기"
    다음 챕터에서는 **네트워크 정책과 Ingress**를 다룹니다. Pod 간 통신을 제어하고, 외부 트래픽을 클러스터 내부로 라우팅하는 방법을 배웁니다.
