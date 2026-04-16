# Welcome

안녕하세요! **Jane의 기술 블로그**에 오신 것을 환영합니다.

Data Engineering과 SRE 관련 기술 자료를 공유합니다.

---

## Contents

### :material-database: dbt Tutorial

dbt(data build tool) 학습 자료입니다. 설치부터 실전 활용까지 단계별로 정리했습니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [dbt란?](dbt-tutorial/01-what-is-dbt.md) | dbt 개념, ETL vs ELT, 왜 사용하는지 |
| 2 | [설치 및 설정](dbt-tutorial/02-setup.md) | dbt 설치, YAML 기초, 핵심 설정 파일 4가지 |
| 3 | [프로젝트 구조](dbt-tutorial/03-project-structure.md) | 디렉토리 구조와 핵심 파일 |
| 4 | [모델 작성](dbt-tutorial/04-models.md) | SQL 모델, ref, source, Jinja 활용 |
| 5 | [Materialization 심화](dbt-tutorial/05-materialization.md) | view vs table vs incremental vs MV 판단 가이드 |
| 6 | [테스트와 문서화](dbt-tutorial/06-tests-and-docs.md) | 데이터 테스트, 문서 생성 |
| 7 | [실전 팁](dbt-tutorial/07-tips.md) | 실무에서 유용한 패턴과 팁 |
| 8 | [데모](dbt-tutorial/07-demo.md) | dbt 명령어 실행 화면 (GIF) |
| 9 | [인터랙티브 데모](dbt-tutorial/08-interactive-demo.md) | 버튼 클릭으로 dbt 명령어 체험 |
| 10 | [dbt에서 Semantic Layer까지](dbt-tutorial/09-semantic-layer.md) | 왜 dbt가 Semantic Layer, Ontology로 이어지는가 |

---

### :material-kubernetes: Kubernetes Tutorial

Docker 기초부터 Kubernetes 실전 배포까지, 컨테이너 오케스트레이션을 단계별로 학습할 수 있는 튜토리얼입니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [Docker 기초](k8s-tutorial/01-docker-basics.md) | 컨테이너 개념, Dockerfile, 이미지 빌드, 네트워크/볼륨 |
| 2 | [컨테이너에서 K8s로](k8s-tutorial/02-container-to-k8s.md) | 오케스트레이션 필요성, K8s 소개, 첫 클러스터 |
| 3 | [K8s 아키텍처](k8s-tutorial/03-k8s-architecture.md) | Control Plane, Worker Node, 핵심 컴포넌트 |
| 4 | [kubeconfig 상세](k8s-tutorial/04-kubeconfig.md) | 클러스터 접속 설정, 멀티 클러스터, 인증 방식 |
| 5 | [YAML 매니페스트](k8s-tutorial/05-yaml-manifests.md) | 매니페스트 구조, Labels/Selectors, Kustomize/Helm |
| 5+ | [Helm 심화](k8s-tutorial/05-helm.md) | Chart 구조, values.yaml 렌더링 원리, Airflow Chart 실전 |
| 6 | [워크로드](k8s-tutorial/06-workloads.md) | Pod, Deployment, StatefulSet, DaemonSet, Job |
| 7 | [네트워킹](k8s-tutorial/07-networking.md) | Service, Ingress, NetworkPolicy, DNS |
| 8 | [스토리지와 설정](k8s-tutorial/08-volumes.md) | PV/PVC, StorageClass, ConfigMap, Secret |
| 9 | [배포 전략](k8s-tutorial/09-deployment-strategies.md) | Rolling Update, Blue/Green, Canary, HPA |
| 10 | [인터랙티브 데모](k8s-tutorial/10-interactive-demo.md) | kubectl 명령어 체험, 배포/네트워크/스토리지 데모 |
| Bonus | [dbt + Airflow on K8s](k8s-tutorial/11-dbt-airflow-on-k8s.md) | RBAC, Airflow Helm Chart, dbt Job, 프로덕션 체크리스트 |

---

### :material-connection: MCP Tutorial

MCP(Model Context Protocol) 학습 자료입니다. 개념 이해부터 PoC까지 단계별로 정리했습니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [MCP란?](mcp/01-what-is-mcp.md) | MCP 개념, 등장 배경, 기존 방식과의 차이 |
| 2 | [아키텍처](mcp/02-architecture.md) | 클라이언트-서버 구조, Tools/Resources/Prompts |
| 3 | [개발 환경 설정](mcp/03-dev-setup.md) | SDK 설치, 프로젝트 초기화, Inspector |
| 4 | [첫 번째 MCP 서버](mcp/04-first-server.md) | 메모 관리 서버 — Tool/Resource/Prompt 실습 |
| 5 | [PoC: DB 조회 서버](mcp/05-poc.md) | SQLite 조회 MCP 서버 구축 |

---

### :material-airflow: Airflow Tutorial

Apache Airflow 3.x 기준의 학습 자료입니다. 기본 개념부터 Operator 내부 구조, Custom Operator 제작까지 단계별로 다룹니다.

| 순서 | 주제 | 설명 |
|------|------|------|
| 1 | [Airflow란?](airflow-tutorial/01-what-is-airflow.md) | 개념, 아키텍처, Airflow 3의 변화 |
| 2 | [DAG 작성 기초](airflow-tutorial/02-dag-basics.md) | DAG/Task, schedule, 의존성, XCom, Assets |
| 3 | [Operator 완전정복](airflow-tutorial/03-operators.md) | Operator 개념/종류, 대표 Operator 상세, TaskFlow API |
| 4 | [Custom Operator 만들기](airflow-tutorial/04-custom-operators.md) | plugins 구조, BaseOperator 상속, 실전 예제 |
| 5 | [Hook & Connection](airflow-tutorial/05-hooks-connections.md) | Hook의 역할, Connection 관리, Custom Hook |
