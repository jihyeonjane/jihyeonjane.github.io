# 1. Docker 기초 - 컨테이너의 세계로

Kubernetes를 이해하기 위한 첫 번째 단계는 **Docker와 컨테이너**를 제대로 아는 것입니다. 이 챕터에서는 컨테이너의 개념부터 Docker의 핵심 명령어, 네트워킹, 볼륨, 이미지 최적화까지 상세히 다룹니다.

---

## 1. 컨테이너란?

### "내 컴에서는 되는데..."

개발자라면 한 번쯤 이런 경험이 있을 겁니다.

```
개발자 A: "이거 왜 안 돼요? 제 노트북에서는 잘 되는데..."
개발자 B: "저도 똑같은 코드인데 라이브러리 버전이 달라서 에러나요"
운영팀:    "스테이징에서는 되는데 프로덕션에서 안 됩니다"
```

이 문제의 근본 원인은 **환경 차이**입니다.

- Python 3.8 vs 3.11
- OpenSSL 1.1 vs 3.0
- glibc 버전 차이
- OS 패키지 버전 불일치
- 환경변수 설정 차이

이른바 **Dependency Hell** — 의존성 지옥입니다. 컨테이너는 이 문제를 근본적으로 해결합니다.

> **"애플리케이션과 그 실행 환경을 통째로 패키징해서, 어디서든 동일하게 실행한다."**

### 가상머신 vs 컨테이너

"환경을 통째로 패키징"한다는 점에서 가상머신(VM)과 비슷해 보이지만, 구조적으로 큰 차이가 있습니다.

| 구분 | 가상머신 (VM) | 컨테이너 |
|------|--------------|----------|
| **가상화 대상** | 하드웨어 전체 (CPU, 메모리, 디스크) | 프로세스 수준 (OS 커널 공유) |
| **OS** | 각 VM마다 별도 OS 설치 | 호스트 OS 커널 공유 |
| **크기** | 수 GB (OS 포함) | 수십~수백 MB (앱 + 의존성만) |
| **시작 시간** | 분 단위 | 초 단위 |
| **성능 오버헤드** | 큼 (하이퍼바이저 레이어) | 거의 없음 (네이티브에 가까움) |
| **격리 수준** | 강함 (완전 분리) | 상대적으로 약함 (커널 공유) |
| **밀도** | 한 서버에 수십 개 | 한 서버에 수백~수천 개 |
| **대표 기술** | VMware, VirtualBox, KVM | Docker, containerd, CRI-O |
| **비유** | 건물 하나를 통째로 짓는 것 | 건물 안에 칸막이를 나누는 것 |

```
┌─────────────────────────────────────────────────────────────┐
│                    가상머신 (VM) 구조                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  App A   │  │  App B   │  │  App C   │                  │
│  │  Libs    │  │  Libs    │  │  Libs    │                  │
│  │ Guest OS │  │ Guest OS │  │ Guest OS │  ← 각각 OS 설치  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ┌─────────────────────────────────────────┐               │
│  │          Hypervisor (VMware, KVM)       │               │
│  └─────────────────────────────────────────┘               │
│  ┌─────────────────────────────────────────┐               │
│  │              Host OS                    │               │
│  └─────────────────────────────────────────┘               │
│  ┌─────────────────────────────────────────┐               │
│  │            Hardware (물리 서버)           │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   컨테이너 구조                               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  App A   │  │  App B   │  │  App C   │                  │
│  │  Libs    │  │  Libs    │  │  Libs    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ┌─────────────────────────────────────────┐               │
│  │       Container Runtime (Docker)        │               │
│  └─────────────────────────────────────────┘               │
│  ┌─────────────────────────────────────────┐               │
│  │        Host OS (커널 공유!)              │  ← OS 하나!   │
│  └─────────────────────────────────────────┘               │
│  ┌─────────────────────────────────────────┐               │
│  │            Hardware (물리 서버)           │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 컨테이너 기술의 핵심: namespace와 cgroup

컨테이너는 마법이 아닙니다. 리눅스 커널의 두 가지 핵심 기술을 조합한 것입니다.

#### Namespace — "격리"

Namespace는 프로세스가 **볼 수 있는 범위를 제한**하는 기술입니다. 각 컨테이너는 자기만의 "세계"를 갖습니다.

| Namespace 종류 | 격리 대상 | 설명 |
|---------------|----------|------|
| **PID** | 프로세스 ID | 컨테이너 안에서는 PID 1부터 시작 |
| **NET** | 네트워크 | 컨테이너별 독립 IP, 포트 |
| **MNT** | 파일시스템 마운트 | 컨테이너별 독립 파일시스템 |
| **UTS** | 호스트네임 | 컨테이너별 독립 hostname |
| **IPC** | 프로세스 간 통신 | 메시지 큐, 세마포어 격리 |
| **USER** | 사용자 ID | 컨테이너 안에서 root여도 밖에서는 일반 유저 |

!!! tip "비유로 이해하기"
    Namespace는 **칸막이 사무실**과 같습니다. 같은 건물(OS) 안에 있지만, 각 사무실(컨테이너)에서는 자기 공간만 보입니다. 옆 사무실의 파일이나 네트워크는 보이지 않습니다.

#### cgroup (Control Groups) — "자원 제한"

cgroup은 프로세스가 **사용할 수 있는 자원의 양을 제한**하는 기술입니다.

| 제한 가능한 자원 | 예시 |
|----------------|------|
| **CPU** | 이 컨테이너는 CPU 코어 2개까지만 사용 |
| **Memory** | 이 컨테이너는 512MB까지만 사용 |
| **Disk I/O** | 읽기/쓰기 속도 제한 |
| **Network** | 네트워크 대역폭 제한 |

!!! info "namespace + cgroup = 컨테이너"
    **Namespace**로 "무엇을 볼 수 있는가"를 제한하고, **cgroup**으로 "얼마나 쓸 수 있는가"를 제한합니다. 이 두 가지를 합치면 컨테이너가 됩니다. Docker는 이 기술 위에 사용하기 쉬운 인터페이스를 얹은 것입니다.

```
┌─────────────────────────────────────────────────────────┐
│                    Linux Kernel                         │
│                                                         │
│   ┌──────────────┐           ┌──────────────┐          │
│   │  Namespace   │           │    cgroup     │          │
│   │  (격리)      │     +     │  (자원 제한)   │          │
│   │              │           │              │          │
│   │ - PID        │           │ - CPU        │          │
│   │ - NET        │           │ - Memory     │          │
│   │ - MNT        │           │ - Disk I/O   │          │
│   │ - UTS        │           │ - Network    │          │
│   │ - IPC        │           │              │          │
│   │ - USER       │           │              │          │
│   └──────┬───────┘           └──────┬───────┘          │
│          │                          │                  │
│          └──────────┬───────────────┘                  │
│                     │                                  │
│              ┌──────▼──────┐                           │
│              │  Container  │                           │
│              │ = 격리된    │                            │
│              │   프로세스   │                            │
│              └─────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Docker 핵심 개념

### Image vs Container

Docker의 가장 기본적인 개념은 **Image**와 **Container**의 관계입니다.

| 구분 | Image (이미지) | Container (컨테이너) |
|------|---------------|---------------------|
| **정의** | 애플리케이션 실행에 필요한 모든 것이 담긴 읽기 전용 템플릿 | 이미지를 기반으로 실행 중인 인스턴스 |
| **상태** | 정적 (변하지 않음) | 동적 (실행, 정지, 삭제 가능) |
| **비유** | 설계도, 클래스, 금형 | 건물, 인스턴스, 제품 |
| **저장 위치** | 로컬 또는 레지스트리 (Docker Hub 등) | 로컬 Docker Engine |
| **개수** | 하나의 이미지에서 | 여러 컨테이너 생성 가능 |

```
┌──────────────┐     docker run     ┌──────────────────┐
│              │ ──────────────────> │   Container A    │
│              │                    │  (실행 중)        │
│   Image      │     docker run     ├──────────────────┤
│  (python:3.11│ ──────────────────> │   Container B    │
│   + Flask    │                    │  (실행 중)        │
│   + app.py)  │     docker run     ├──────────────────┤
│              │ ──────────────────> │   Container C    │
│              │                    │  (정지됨)         │
└──────────────┘                    └──────────────────┘
    읽기 전용                          읽기/쓰기 가능
```

!!! tip "핵심 포인트"
    이미지는 **불변(immutable)**입니다. 컨테이너 안에서 파일을 수정해도 원본 이미지는 변하지 않습니다. 컨테이너를 삭제하면 변경 사항도 사라집니다. 데이터를 유지하려면 **볼륨(Volume)**을 사용해야 합니다.

### Docker 아키텍처 다이어그램

<div class="k8s-diagram" markdown="0">
  <div class="k8s-diagram-title">Docker 아키텍처</div>
  <div class="ch-nodes-flat" style="padding: 16px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
    <div class="ch-node" style="width: 180px; min-height: 140px;">
      <div class="ch-node-header" style="color: #89b4fa; font-weight: bold; text-align: center; padding: 6px;">Docker Client</div>
      <div style="color: #cdd6f4; font-size: 11px; padding: 4px 8px; line-height: 1.6;">
        <div style="color: #a6e3a1;">$ docker build</div>
        <div style="color: #a6e3a1;">$ docker run</div>
        <div style="color: #a6e3a1;">$ docker pull</div>
        <div style="color: #a6e3a1;">$ docker push</div>
        <div style="color: #6c7086; margin-top: 4px;">CLI / API 호출</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; color: #f9e2af; font-size: 20px; padding: 0 4px;">&#8594;</div>
    <div class="ch-node" style="width: 260px; min-height: 140px;">
      <div class="ch-node-header" style="color: #f5c0e8; font-weight: bold; text-align: center; padding: 6px;">Docker Daemon (dockerd)</div>
      <div style="color: #cdd6f4; font-size: 11px; padding: 4px 8px; line-height: 1.6;">
        <div><span style="color: #89b4fa;">Images</span> — 이미지 관리</div>
        <div><span style="color: #a6e3a1;">Containers</span> — 컨테이너 라이프사이클</div>
        <div><span style="color: #f9e2af;">Networks</span> — 컨테이너 네트워킹</div>
        <div><span style="color: #cba6f7;">Volumes</span> — 데이터 영속성</div>
        <div style="color: #6c7086; margin-top: 4px;">REST API로 Client와 통신</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; color: #f9e2af; font-size: 20px; padding: 0 4px;">&#8596;</div>
    <div class="ch-node" style="width: 180px; min-height: 140px;">
      <div class="ch-node-header" style="color: #a6e3a1; font-weight: bold; text-align: center; padding: 6px;">Registry</div>
      <div style="color: #cdd6f4; font-size: 11px; padding: 4px 8px; line-height: 1.6;">
        <div><span style="color: #89b4fa;">Docker Hub</span></div>
        <div><span style="color: #cba6f7;">AWS ECR</span></div>
        <div><span style="color: #f5c0e8;">GCR / GHCR</span></div>
        <div style="color: #6c7086; margin-top: 4px;">이미지 저장소 (pull/push)</div>
      </div>
    </div>
  </div>
</div>

### Dockerfile 작성법

Dockerfile은 이미지를 만들기 위한 **레시피**입니다. 각 명령어(instruction)가 이미지의 레이어 하나를 만듭니다.

#### Dockerfile 명령어 상세

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `FROM` | 베이스 이미지 지정 (필수, 첫 줄) | `FROM python:3.11-slim` |
| `WORKDIR` | 작업 디렉토리 설정 (없으면 자동 생성) | `WORKDIR /app` |
| `COPY` | 호스트 파일을 이미지로 복사 | `COPY requirements.txt .` |
| `ADD` | COPY + URL 다운로드 + tar 자동 해제 | `ADD app.tar.gz /app/` |
| `RUN` | 빌드 시 명령어 실행 (레이어 생성) | `RUN pip install -r requirements.txt` |
| `ENV` | 환경변수 설정 (빌드 + 런타임) | `ENV FLASK_ENV=production` |
| `ARG` | 빌드 시점에만 사용되는 변수 | `ARG VERSION=1.0` |
| `EXPOSE` | 컨테이너 포트 문서화 (실제 열지는 않음) | `EXPOSE 5000` |
| `CMD` | 컨테이너 시작 시 기본 실행 명령 | `CMD ["python", "app.py"]` |
| `ENTRYPOINT` | 컨테이너 시작 시 고정 실행 명령 | `ENTRYPOINT ["python"]` |
| `VOLUME` | 볼륨 마운트 포인트 선언 | `VOLUME ["/data"]` |
| `LABEL` | 이미지 메타데이터 추가 | `LABEL maintainer="jane"` |
| `HEALTHCHECK` | 컨테이너 상태 체크 명령 설정 | `HEALTHCHECK CMD curl -f http://localhost:5000/` |
| `USER` | 실행 사용자 변경 | `USER appuser` |

!!! warning "CMD vs ENTRYPOINT 차이"
    - **CMD**: `docker run` 시 다른 명령으로 **덮어쓰기 가능**. 기본값 제공용.
    - **ENTRYPOINT**: `docker run` 시 **덮어쓰기 불가** (--entrypoint 옵션 제외). 고정 실행 파일 지정용.
    - 둘을 함께 쓰면: ENTRYPOINT는 실행 파일, CMD는 기본 인자로 동작합니다.

```dockerfile
# CMD만 사용 — 덮어쓰기 가능
CMD ["python", "app.py"]
# docker run myimage              → python app.py 실행
# docker run myimage bash         → bash 실행 (CMD 무시)

# ENTRYPOINT만 사용 — 고정
ENTRYPOINT ["python"]
# docker run myimage              → python 실행
# docker run myimage app.py       → python app.py 실행

# 둘 다 사용 — ENTRYPOINT 고정 + CMD가 기본 인자
ENTRYPOINT ["python"]
CMD ["app.py"]
# docker run myimage              → python app.py
# docker run myimage test.py      → python test.py (CMD만 대체)
```

#### 실전 예제: Python Flask 앱

프로젝트 구조:

```
my-flask-app/
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   └── style.css
├── tests/
│   └── test_app.py
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

`app.py`:

```python
from flask import Flask, render_template, jsonify
import os
import redis

app = Flask(__name__)

# Redis 연결 (docker-compose에서 서비스명으로 접근)
cache = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379))
)

@app.route("/")
def index():
    """메인 페이지 — 방문 횟수 카운터"""
    count = cache.incr("hits")
    return render_template("index.html", count=count)

@app.route("/health")
def health():
    """헬스체크 엔드포인트"""
    try:
        cache.ping()
        return jsonify({"status": "healthy", "redis": "connected"}), 200
    except redis.ConnectionError:
        return jsonify({"status": "unhealthy", "redis": "disconnected"}), 503

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", False))
```

`requirements.txt`:

```
flask==3.0.0
redis==5.0.1
gunicorn==21.2.0
```

`Dockerfile`:

```dockerfile
# ============================================
# Stage 1: 빌드 단계 (의존성 설치)
# ============================================
FROM python:3.11-slim AS builder

# 빌드 시 사용할 인자
ARG APP_VERSION=1.0.0

# 시스템 패키지 설치 (빌드에 필요한 것만)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*          # (1)!

WORKDIR /app

# 의존성 파일만 먼저 복사 (레이어 캐싱 활용!)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt  # (2)!

# ============================================
# Stage 2: 실행 단계 (최종 이미지)
# ============================================
FROM python:3.11-slim AS runner

# 메타데이터
LABEL maintainer="jane@example.com"
LABEL version="${APP_VERSION}"
LABEL description="Flask app with Redis counter"

# 빌드 단계에서 설치한 패키지만 복사
COPY --from=builder /root/.local /root/.local  # (3)!

# PATH에 pip 설치 경로 추가
ENV PATH=/root/.local/bin:$PATH
ENV FLASK_ENV=production

WORKDIR /app

# 애플리케이션 코드 복사
COPY app.py .
COPY templates/ templates/
COPY static/ static/

# 포트 문서화
EXPOSE 5000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1  # (4)!

# gunicorn으로 프로덕션 실행
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]  # (5)!
```

1. `apt-get` 캐시를 삭제하여 이미지 크기를 줄입니다. 빌드 레이어마다 캐시를 남기지 않는 것이 최적화의 기본입니다.
2. `--no-cache-dir` 옵션으로 pip 캐시를 남기지 않습니다. `--user` 옵션으로 `/root/.local`에 설치하여 다음 스테이지에 복사하기 쉽게 합니다.
3. Multi-stage build의 핵심! 빌드 단계의 gcc 등 빌드 도구 없이, 실행에 필요한 Python 패키지만 복사합니다.
4. 30초마다 `/health` 엔드포인트를 호출해 컨테이너 상태를 확인합니다. 3번 연속 실패하면 unhealthy로 표시됩니다.
5. 개발 시에는 `flask run`을 쓰지만, 프로덕션에서는 WSGI 서버인 gunicorn을 사용합니다. worker 수는 `(CPU 코어 수 * 2) + 1`이 권장됩니다.

#### Multi-stage Build

위 Dockerfile에서 이미 Multi-stage build를 사용했습니다. 왜 필요한지 정리해봅시다.

```
일반 빌드 (Single-stage):
┌──────────────────────────────────────┐
│ python:3.11-slim                     │
│ + gcc, build-essential (빌드 도구)    │  ← 실행 시에는 불필요!
│ + pip 캐시                           │  ← 실행 시에는 불필요!
│ + 소스 코드                          │
│ + Python 패키지                      │
│                                      │
│ 최종 이미지: ~500MB                   │
└──────────────────────────────────────┘

Multi-stage 빌드:
┌─────────────────┐     COPY --from     ┌─────────────────┐
│ Stage 1 (builder)│ ─────────────────> │ Stage 2 (runner) │
│                  │  Python 패키지만    │                  │
│ gcc 설치         │  복사               │ gcc 없음!        │
│ pip install      │                    │ pip 캐시 없음!    │
│ 빌드 캐시        │                    │ 소스 + 패키지만   │
│                  │                    │                  │
│ (버려짐)         │                    │ 최종 이미지: ~180MB│
└─────────────────┘                    └─────────────────┘
```

!!! info "Multi-stage build 핵심 요약"
    1. 여러 `FROM` 문으로 스테이지를 나눕니다
    2. `AS builder`로 스테이지에 이름을 붙입니다
    3. `COPY --from=builder`로 필요한 결과물만 가져옵니다
    4. 최종 이미지에는 실행에 필요한 것만 남습니다

---

## 3. Docker 명령어 정리

### 이미지 관련 명령어

```bash
# 이미지 빌드
docker build -t my-flask-app:1.0 .                # (1)!
docker build -t my-flask-app:1.0 -f Dockerfile.dev .  # (2)!
docker build --no-cache -t my-flask-app:1.0 .      # (3)!

# 이미지 조회
docker images                                       # 로컬 이미지 목록
docker image ls                                     # 위와 동일
docker image inspect my-flask-app:1.0               # 이미지 상세 정보

# 이미지 가져오기/올리기
docker pull python:3.11-slim                        # 레지스트리에서 다운로드
docker push myregistry/my-flask-app:1.0             # 레지스트리에 업로드
docker tag my-flask-app:1.0 myregistry/my-flask-app:1.0  # 태그 추가

# 이미지 삭제
docker rmi my-flask-app:1.0                         # 이미지 삭제
docker image prune                                  # 사용하지 않는 이미지 정리
docker image prune -a                               # 컨테이너와 연결 안 된 이미지 모두 정리
```

1. `-t`는 이름:태그 형식. `.`은 Dockerfile이 있는 디렉토리(빌드 컨텍스트)를 의미합니다.
2. `-f`로 Dockerfile 이름을 지정할 수 있습니다. 기본값은 `Dockerfile`입니다.
3. `--no-cache`는 레이어 캐시를 무시하고 모든 단계를 다시 빌드합니다.

### 컨테이너 실행 및 관리

```bash
# 컨테이너 실행
docker run my-flask-app:1.0                          # 기본 실행
docker run -d my-flask-app:1.0                       # 백그라운드 실행 (detach)
docker run -d --name my-app my-flask-app:1.0         # 이름 지정
docker run -d -p 8080:5000 my-flask-app:1.0          # 포트 매핑 (호스트:컨테이너)
docker run -d -e FLASK_DEBUG=true my-flask-app:1.0   # 환경변수 전달
docker run --rm my-flask-app:1.0                     # 종료 시 자동 삭제
docker run -it python:3.11 bash                      # 대화형 (interactive + tty)

# 실행 중인 컨테이너 목록
docker ps                                            # 실행 중인 것만
docker ps -a                                         # 모든 컨테이너 (정지 포함)

# 컨테이너 안에서 명령 실행
docker exec -it my-app bash                          # 쉘 접속
docker exec my-app cat /app/app.py                   # 단일 명령 실행

# 로그 확인
docker logs my-app                                   # 전체 로그
docker logs -f my-app                                # 실시간 로그 (follow)
docker logs --tail 50 my-app                         # 마지막 50줄만

# 컨테이너 정지/시작/재시작/삭제
docker stop my-app                                   # 정상 종료 (SIGTERM → SIGKILL)
docker start my-app                                  # 정지된 컨테이너 시작
docker restart my-app                                # 재시작
docker rm my-app                                     # 정지된 컨테이너 삭제
docker rm -f my-app                                  # 실행 중이어도 강제 삭제

# 리소스 사용량 확인
docker stats                                         # 실시간 CPU/메모리 모니터링
docker top my-app                                    # 컨테이너 내 프로세스 목록
```

!!! tip "자주 쓰는 조합"
    ```bash
    # 전체 정리 (주의: 모든 정지된 컨테이너, 사용 안 하는 이미지/네트워크/볼륨 삭제)
    docker system prune -a --volumes

    # 모든 컨테이너 정지
    docker stop $(docker ps -q)

    # 모든 컨테이너 삭제
    docker rm $(docker ps -aq)
    ```

### docker-compose 기본 사용법

여러 컨테이너를 함께 관리할 때는 `docker-compose`를 사용합니다. 아래는 Flask + Redis + Nginx를 함께 실행하는 예제입니다.

`docker-compose.yml`:

```yaml
version: "3.8"

services:
  # Flask 애플리케이션
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: flask-web
    environment:
      - FLASK_ENV=production
      - REDIS_HOST=redis           # (1)!
      - REDIS_PORT=6379
    volumes:
      - ./app.py:/app/app.py       # (2)!
    depends_on:
      redis:
        condition: service_healthy  # (3)!
    networks:
      - app-network
    restart: unless-stopped

  # Redis 캐시
  redis:
    image: redis:7-alpine
    container_name: flask-redis
    volumes:
      - redis-data:/data           # (4)!
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-network
    restart: unless-stopped

  # Nginx 리버스 프록시
  nginx:
    image: nginx:alpine
    container_name: flask-nginx
    ports:
      - "80:80"                    # (5)!
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web
    networks:
      - app-network
    restart: unless-stopped

volumes:
  redis-data:                      # (6)!

networks:
  app-network:
    driver: bridge                 # (7)!
```

1. docker-compose에서는 **서비스명**이 곧 호스트명입니다. `redis`라는 서비스에 `redis`로 접근 가능합니다.
2. 개발 시 소스코드를 bind mount하면 코드 변경이 즉시 반영됩니다. 프로덕션에서는 이미지에 코드를 포함해야 합니다.
3. `depends_on`에 `condition: service_healthy`를 쓰면 Redis가 healthcheck를 통과한 후에 web이 시작됩니다.
4. Named volume으로 Redis 데이터를 영속화합니다. 컨테이너를 삭제해도 데이터가 남습니다.
5. 호스트의 80번 포트를 Nginx 컨테이너의 80번 포트에 매핑합니다. 외부에서 접근 가능한 유일한 포트입니다.
6. Named volume 선언. Docker가 관리하는 영역에 데이터를 저장합니다.
7. bridge 네트워크를 명시적으로 생성합니다. 같은 네트워크 안의 컨테이너끼리 서비스명으로 통신합니다.

```bash
# docker-compose 명령어
docker-compose up                    # 모든 서비스 시작 (포그라운드)
docker-compose up -d                 # 백그라운드 실행
docker-compose up --build            # 이미지 다시 빌드 후 실행
docker-compose down                  # 모든 서비스 정지 및 삭제
docker-compose down -v               # 볼륨까지 삭제
docker-compose ps                    # 서비스 상태 확인
docker-compose logs -f web           # 특정 서비스 로그
docker-compose exec web bash         # 특정 서비스에 쉘 접속
docker-compose restart web           # 특정 서비스 재시작
docker-compose pull                  # 모든 이미지 최신 버전 다운로드
```

---

## 4. Docker 네트워킹 기초

Docker 컨테이너는 기본적으로 격리된 네트워크 환경에서 실행됩니다. Docker는 여러 네트워크 드라이버를 제공합니다.

### 네트워크 종류 비교

| 네트워크 드라이버 | 설명 | 용도 | 격리 수준 |
|----------------|------|------|----------|
| **bridge** (기본) | 가상 브리지 네트워크 생성. 컨테이너끼리 통신 가능 | 단일 호스트에서 컨테이너 간 통신 | 중간 |
| **host** | 호스트 네트워크 직접 사용. 포트 매핑 불필요 | 네트워크 성능이 중요할 때 | 없음 |
| **none** | 네트워크 완전 차단 | 보안 민감한 작업 (암호화 등) | 완전 격리 |
| **overlay** | 여러 Docker 호스트 간 네트워크 | Docker Swarm, 멀티 호스트 | 중간 |
| **macvlan** | 컨테이너에 물리 네트워크 MAC 주소 부여 | 기존 네트워크 인프라 연동 | 낮음 |

```
┌─────────────────────────────────────────────────────────────┐
│                      Host Machine                           │
│                                                             │
│  ┌─── bridge (docker0) ───────────────────────────────┐    │
│  │  172.17.0.0/16                                     │    │
│  │                                                     │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐      │    │
│  │  │ Container │  │ Container │  │ Container │      │    │
│  │  │ 172.17.0.2│  │ 172.17.0.3│  │ 172.17.0.4│      │    │
│  │  │ :5000     │  │ :6379     │  │ :80       │      │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘      │    │
│  │        │              │              │             │    │
│  │        └──────────────┼──────────────┘             │    │
│  │                       │                            │    │
│  └───────────────────────┼────────────────────────────┘    │
│                          │                                  │
│   -p 8080:5000      -p 6379:6379      -p 80:80             │
│                          │                                  │
│  ┌───────────────────────┼────────────────────────────┐    │
│  │            Host Network Interface                   │    │
│  │              eth0: 192.168.1.100                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 포트 매핑 (-p)

컨테이너 내부 포트를 호스트 포트에 연결하는 것이 포트 매핑입니다.

```bash
# 형식: -p [호스트IP:]호스트포트:컨테이너포트[/프로토콜]
docker run -p 8080:5000 my-app         # 호스트 8080 → 컨테이너 5000
docker run -p 127.0.0.1:8080:5000 my-app  # localhost에서만 접근 가능
docker run -p 5000 my-app              # 호스트 포트 자동 할당
docker run -P my-app                   # EXPOSE된 모든 포트 자동 매핑
```

!!! warning "bridge vs host 네트워크의 포트 매핑"
    - **bridge 네트워크**: `-p` 플래그로 포트 매핑 필수. 매핑하지 않으면 외부 접근 불가.
    - **host 네트워크**: 포트 매핑 불필요 (컨테이너가 호스트 포트 직접 사용). 대신 포트 충돌 주의!

```bash
# 사용자 정의 네트워크 생성 및 사용
docker network create my-network
docker run -d --name app1 --network my-network my-flask-app:1.0
docker run -d --name app2 --network my-network redis:7-alpine

# 같은 네트워크 안에서는 컨테이너 이름으로 통신 가능!
docker exec app1 ping app2             # app2로 바로 접근 가능

# 네트워크 확인
docker network ls                      # 네트워크 목록
docker network inspect my-network      # 네트워크 상세 정보
```

---

## 5. Docker 볼륨 기초

컨테이너는 기본적으로 **일시적(ephemeral)**입니다. 컨테이너를 삭제하면 안에 저장된 데이터도 사라집니다. 데이터를 유지하려면 볼륨을 사용해야 합니다.

### 세 가지 마운트 방식 비교

| 구분 | Bind Mount | Named Volume | tmpfs |
|------|-----------|-------------|-------|
| **위치** | 호스트의 특정 경로 | Docker가 관리하는 영역 | 메모리 (RAM) |
| **생성** | 호스트에 직접 생성 | `docker volume create`로 생성 | 자동 |
| **이식성** | 호스트 경로에 의존 (낮음) | Docker가 관리 (높음) | 해당 없음 |
| **성능** | 호스트 파일시스템 성능 | 약간 오버헤드 | 매우 빠름 |
| **데이터 지속** | 호스트에 남아있음 | Docker가 관리하는 한 유지 | 컨테이너 종료 시 삭제 |
| **주 용도** | 개발 환경 (소스코드 마운트) | 프로덕션 데이터 (DB, 로그) | 민감한 임시 데이터 |

```bash
# Bind Mount
docker run -v /host/path:/container/path my-app         # 절대 경로
docker run -v $(pwd)/data:/app/data my-app               # 현재 디렉토리 기준
docker run -v $(pwd)/config.yml:/app/config.yml:ro my-app # 읽기 전용 (ro)

# Named Volume
docker volume create my-data                              # 볼륨 생성
docker run -v my-data:/app/data my-app                    # 볼륨 사용
docker volume ls                                          # 볼륨 목록
docker volume inspect my-data                             # 볼륨 상세 정보
docker volume rm my-data                                  # 볼륨 삭제

# tmpfs (메모리 마운트)
docker run --tmpfs /app/tmp my-app                        # 메모리에 마운트
docker run --mount type=tmpfs,destination=/app/tmp,tmpfs-size=100m my-app
```

```
┌──────────────────────────────────────────────────────┐
│                   Host Machine                       │
│                                                      │
│  ┌────────────────┐   ┌────────────────────────┐    │
│  │ /home/user/    │   │ Docker Managed Area     │    │
│  │   app/data/    │   │ /var/lib/docker/volumes │    │
│  │                │   │                         │    │
│  │ (Bind Mount)   │   │ (Named Volume)          │    │
│  └───────┬────────┘   └──────────┬─────────────┘    │
│          │                       │                   │
│          ▼                       ▼                   │
│  ┌──────────────────────────────────────────────┐   │
│  │              Container                        │   │
│  │                                               │   │
│  │   /app/data ←── Bind Mount                    │   │
│  │   /app/db   ←── Named Volume                  │   │
│  │   /app/tmp  ←── tmpfs (RAM)                   │   │
│  │                                               │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

!!! tip "언제 무엇을 사용할까?"
    - **개발 시**: Bind mount로 소스코드를 마운트 → 코드 수정이 실시간 반영
    - **프로덕션 DB 데이터**: Named volume → Docker가 안전하게 관리
    - **비밀 정보 (토큰, 키)**: tmpfs → 메모리에만 존재, 디스크에 남지 않음

---

## 6. Docker 이미지 최적화

이미지 크기를 줄이면 빌드 시간, 전송 시간, 보안 공격 표면이 모두 줄어듭니다.

### 레이어 캐싱 전략

Docker는 Dockerfile의 각 명령어를 **레이어**로 만듭니다. 레이어가 변경되면 그 이후 모든 레이어가 다시 빌드됩니다.

```dockerfile
# 나쁜 예 — 코드 변경 시마다 pip install 다시 실행
FROM python:3.11-slim
WORKDIR /app
COPY . .                               # (1)!
RUN pip install -r requirements.txt    # 매번 다시 실행!
CMD ["python", "app.py"]
```

1. `COPY . .`이 먼저 오면, app.py만 수정해도 이 레이어부터 캐시가 깨집니다. 그 이후의 `pip install`도 다시 실행됩니다.

```dockerfile
# 좋은 예 — 의존성 파일만 먼저 복사하여 캐싱 활용
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .               # (1)!
RUN pip install -r requirements.txt   # requirements.txt가 안 바뀌면 캐시 사용
COPY . .                              # (2)!
CMD ["python", "app.py"]
```

1. 자주 바뀌지 않는 의존성 파일을 먼저 복사합니다.
2. 자주 바뀌는 소스코드를 나중에 복사합니다. 소스코드만 바뀌면 이 레이어부터만 다시 빌드합니다.

!!! info "레이어 캐싱 핵심 원칙"
    **변경 빈도가 낮은 것 → 높은 것** 순서로 Dockerfile을 작성합니다.

    1. 베이스 이미지 (`FROM`) — 거의 안 바뀜
    2. 시스템 패키지 (`RUN apt-get`) — 가끔 바뀜
    3. 의존성 파일 (`COPY requirements.txt` + `RUN pip install`) — 간혹 바뀜
    4. 소스코드 (`COPY . .`) — 자주 바뀜
    5. 실행 명령 (`CMD`) — 거의 안 바뀜

### .dockerignore

빌드 컨텍스트에서 불필요한 파일을 제외하여 빌드 속도를 높이고 이미지에 민감한 파일이 포함되는 것을 방지합니다.

```
# .dockerignore

# 버전 관리
.git
.gitignore

# Python
__pycache__
*.pyc
*.pyo
.pytest_cache
.venv
venv
env

# IDE
.vscode
.idea
*.swp

# Docker
Dockerfile
docker-compose.yml
.dockerignore

# 문서
README.md
docs/
*.md

# 테스트
tests/
coverage/
.coverage

# 환경 설정 (민감 정보!)
.env
.env.local
*.secret
```

### Alpine vs Debian 기반 이미지 비교

| 구분 | Alpine 기반 | Debian (slim) 기반 |
|------|------------|-------------------|
| **이미지** | `python:3.11-alpine` | `python:3.11-slim` |
| **크기** | ~50MB | ~150MB |
| **C 라이브러리** | musl libc | glibc |
| **패키지 관리** | apk | apt-get |
| **빌드 호환성** | 일부 C 확장 빌드 실패 가능 | 대부분 호환 |
| **디버깅 도구** | 최소 (직접 설치 필요) | 기본 도구 포함 |
| **추천 상황** | 간단한 앱, Go 바이너리 | Python/Node.js 등 C 의존성 있는 앱 |

!!! warning "Alpine 선택 시 주의사항"
    Alpine은 **musl libc**를 사용하므로 glibc 기반 바이너리가 동작하지 않을 수 있습니다. numpy, pandas, grpcio 등 C 확장 패키지가 있는 Python 앱에서는 빌드 시간이 크게 늘어나거나 실패할 수 있습니다. 이런 경우 `python:3.11-slim`이 더 나은 선택입니다.

```bash
# 이미지 크기 비교 (참고용)
# python:3.11          ~1.0GB   ← 개발용, 프로덕션 비추
# python:3.11-slim     ~150MB   ← 프로덕션 추천
# python:3.11-alpine   ~50MB    ← 호환성 확인 필요
# distroless/python3   ~50MB    ← 보안 강화 (셸 없음)
```

### 이미지 최적화 체크리스트

최종적으로 이미지를 최적화할 때 확인해야 할 항목들입니다.

| 항목 | 방법 | 효과 |
|------|------|------|
| slim/alpine 베이스 사용 | `FROM python:3.11-slim` | 이미지 크기 대폭 감소 |
| Multi-stage build | 빌드 스테이지와 실행 스테이지 분리 | 빌드 도구 제거, 크기 감소 |
| 레이어 캐싱 최적화 | 변경 빈도 낮은 것 먼저 COPY | 빌드 시간 단축 |
| .dockerignore 설정 | 불필요한 파일 제외 | 빌드 컨텍스트 축소 |
| RUN 명령 합치기 | `RUN cmd1 && cmd2 && cmd3` | 레이어 수 감소 |
| apt 캐시 삭제 | `rm -rf /var/lib/apt/lists/*` | 불필요한 캐시 제거 |
| pip --no-cache-dir | `pip install --no-cache-dir` | pip 캐시 제거 |
| 불필요한 패키지 제거 | `--no-install-recommends` | 최소 패키지만 설치 |
| non-root 유저 사용 | `USER appuser` | 보안 강화 |
| HEALTHCHECK 설정 | `HEALTHCHECK CMD ...` | 오케스트레이터 연동 |

---

## 정리: Docker에서 Kubernetes로

이 챕터에서 다룬 Docker의 핵심 개념을 정리합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                Docker 핵심 개념 요약                          │
│                                                             │
│  컨테이너 = namespace(격리) + cgroup(자원 제한)               │
│                                                             │
│  Image ──(docker run)──→ Container                          │
│    │                        │                               │
│    │ Dockerfile로 빌드       │ 실행, 정지, 삭제 가능           │
│    │ 읽기 전용               │ 읽기/쓰기 가능                  │
│    │ 레이어 구조             │ 데이터 → Volume 필요            │
│                                                             │
│  네트워크: bridge | host | none                              │
│  볼륨:    bind mount | named volume | tmpfs                  │
│  최적화:  multi-stage + slim 이미지 + 레이어 캐싱             │
└─────────────────────────────────────────────────────────────┘
```

Docker는 **단일 머신에서 컨테이너를 관리**하는 도구입니다. 하지만 프로덕션 환경에서는 이런 질문이 생깁니다:

- 컨테이너가 죽으면 누가 다시 띄워주지?
- 트래픽이 늘면 컨테이너를 자동으로 늘릴 수 없을까?
- 여러 서버에 걸친 컨테이너를 어떻게 관리하지?
- 무중단 배포는 어떻게 하지?

이 질문들의 답이 바로 **Kubernetes**입니다. 다음 챕터에서 본격적으로 다룹니다.

!!! info "다음 챕터"
    **[2. 컨테이너에서 K8s로](02-container-to-k8s.md)** — 컨테이너 오케스트레이션이란 무엇인지, Kubernetes가 어떤 문제를 해결하는지 알아봅니다.
