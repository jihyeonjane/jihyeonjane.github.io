# Kubernetes Tutorial

Docker 기초부터 Kubernetes 실전 배포까지, 컨테이너 오케스트레이션을 단계별로 학습할 수 있는 튜토리얼입니다.

## 목차

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [Docker 기초](01-docker-basics.md) | 컨테이너 개념, Dockerfile, 이미지 빌드, 네트워크/볼륨 |
| 2 | [컨테이너에서 K8s로](02-container-to-k8s.md) | 오케스트레이션 필요성, K8s 소개, 첫 클러스터 |
| 3 | [K8s 아키텍처](03-k8s-architecture.md) | Control Plane, Worker Node, 핵심 컴포넌트 |
| 4 | [kubeconfig 상세](04-kubeconfig.md) | 클러스터 접속 설정, 멀티 클러스터, 인증 방식 |
| 5 | [YAML 매니페스트](05-yaml-manifests.md) | 매니페스트 구조, Labels/Selectors, Kustomize/Helm |
| 6 | [워크로드](06-workloads.md) | Pod, Deployment, StatefulSet, DaemonSet, Job |
| 7 | [네트워킹](07-networking.md) | Service, Ingress, NetworkPolicy, DNS |
| 8 | [스토리지와 설정](08-volumes.md) | PV/PVC, StorageClass, ConfigMap, Secret |
| 9 | [배포 전략](09-deployment-strategies.md) | Rolling Update, Blue/Green, Canary, HPA |
| 10 | [인터랙티브 데모](10-interactive-demo.md) | kubectl 명령어 체험, 배포/네트워크/스토리지 데모 |
| Bonus | [dbt + Airflow on K8s](11-dbt-airflow-on-k8s.md) | RBAC, Airflow Helm Chart, dbt Job, 프로덕션 체크리스트 |

!!! tip "사전 준비"
    - Docker Desktop 또는 Docker Engine 설치
    - 터미널(CLI) 사용 경험
    - YAML 기본 문법 이해 (챕터 5에서 복습합니다)
    - (선택) 클라우드 계정 — AWS EKS, GCP GKE 실습 시

!!! info "학습 순서 안내"
    1~2장은 Docker/컨테이너 기초이므로 이미 익숙하다면 3장부터 시작해도 좋습니다.
    7장(네트워킹)과 8장(스토리지)은 실무에서 가장 많이 다루는 영역이니 꼼꼼히 학습하세요.
