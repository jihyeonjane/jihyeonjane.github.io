# 1. dbt란?

## dbt (data build tool)

**dbt(data build tool)**는 데이터 분석가와 엔지니어가 SQL만으로 **데이터 변환(Transform) 작업을 코드처럼 관리**할 수 있게 해주는 오픈소스 도구입니다.

dbt가 하는 일을 한 문장으로 요약하면:

> **"SELECT 문을 테이블(또는 뷰)로 만들어주는 도구"**

분석가가 작성한 SQL 쿼리를 dbt가 실행하면, 그 결과가 DB에 테이블 또는 뷰로 저장됩니다. 그리고 그 과정에서 **버전 관리, 문서화, 테스트, 리니지(계보) 추적이 자동으로** 따라옵니다.

## ETL vs ELT

기존 데이터 파이프라인은 **ETL(Extract → Transform → Load)** 방식이었습니다. Transform 단계가 Python 스크립트나 별도 엔진 등 **엔지니어 전용 영역에 묶여** 있었습니다.

dbt는 이 흐름을 **ELT(Extract → Load → Transform)**로 바꿉니다. 데이터를 일단 DB에 올려두고(Load), 이후의 가공(Transform)을 SQL로 처리합니다.

```
ETL:  Extract → [Transform] → Load    (엔지니어만 가능)
ELT:  Extract → Load → [Transform]    ← dbt가 담당 (SQL 가능하면 누구나)
```

| 구분 | 기존 방식 (ETL) | dbt 방식 (ELT) |
| --- | --- | --- |
| Transform 주체 | 데이터 엔지니어 | 분석가 / 엔지니어 모두 |
| 사용 언어 | Python, Spark, Glue 등 | SQL (+ Jinja 템플릿) |
| 실행 위치 | 외부 서버/스크립트 | DB 내부 (ClickHouse, BigQuery 등) |
| 버전 관리 | 별도 Git 관리 필요 | Git 기반 기본 제공 |
| 문서화 | 수동 작성 | dbt docs로 자동 생성 |

## dbt 생태계 이해하기

dbt가 전체 데이터 파이프라인에서 어디에 위치하는지 비유로 이해해봅시다.

```
Airflow = 주방 매니저
"매일 오전 9시에 요리 시작해. 이 순서대로 해."
→ 언제, 어떤 순서로 실행할지만 관리. 실제 요리는 안 함.

S3 / Data Lake = 원재료 공급처
"주문 받은 재료를 요리사에게 공급."
→ RDS, 로그, 서드파티 데이터를 모두 저장.

dbt = 요리사
"원재료 받아서 손질하고 요리 완성."
→ SQL로 원천 데이터를 가공해서 분석용 테이블 만듦.

Data Warehouse = 냉장고(창고)
"완성된 요리 여기 보관."
→ 가공된 데이터가 저장되는 분석용 DB.
```

```
데이터 소스(원재료)
      ↓
Airflow가 "매일 새벽 2시에 dbt 돌려!" 라고 지시
      ↓
dbt가 SQL 실행해서 데이터 가공
      ↓
Data Warehouse에 분석용 테이블 저장
      ↓
BI 도구(Superset, Metabase 등)에서 조회
```

## 왜 dbt를 사용하나?

### 1. SQL만 알면 된다

Python이나 Spark 없이, 분석가가 평소 쓰던 SQL로 데이터 가공 로직을 직접 작성할 수 있습니다.

### 2. 코드로 관리된다 (Git 기반)

모든 SQL 모델은 `.sql` 파일로 저장되고 Git으로 버전 관리됩니다. 누가, 언제, 왜 이 테이블을 만들었는지 히스토리를 추적할 수 있습니다.

### 3. 문서가 자동으로 생성된다

각 모델에 description을 작성해두면, `dbt docs generate` 명령 하나로 웹 기반 문서가 자동 생성됩니다. 테이블 설명, 컬럼 설명을 한 곳에서 확인할 수 있습니다.

### 4. 리니지(Lineage)가 보인다

어떤 테이블이 어떤 테이블을 참조해서 만들어졌는지, 의존 관계를 시각적으로 확인할 수 있습니다. 원본 테이블이 변경되면 어떤 하위 테이블들이 영향을 받는지 즉시 파악 가능합니다.

```
raw.users → stg_users → dim_users → report_daily_users
                ↘ fct_user_events ↗
```

### 5. 테스트가 내장되어 있다

`not_null`, `unique`, `accepted_values` 같은 기본 테스트를 YAML 파일에 선언만 하면, dbt가 데이터 품질을 자동으로 검증합니다.

### 6. 재사용이 쉽다 (ref / Macro)

`{{ ref('테이블명') }}` 문법으로 다른 모델을 참조할 수 있어 중복 쿼리 없이 레고처럼 조립할 수 있습니다. 자주 쓰는 로직은 Macro로 만들어 여러 모델에서 재사용 가능합니다.

## dbt-core vs dbt-cloud

| 구분 | dbt-core (무료) | dbt-cloud (유료) |
|------|----------------|-----------------|
| 비용 | 무료 | 월 $100/인 |
| 실행 환경 | 직접 구축 (서버, IDE, 스케줄러) | 웹 IDE, 스케줄러 내장 |
| 스케줄링 | Airflow 등 별도 구축 필요 | 내장 스케줄러 제공 |
| 비유 | 집 사서, 집안일 셀프로 한다 | 돈 주고 방 임대하니, 가정부도 보내준다 |

대부분의 기업에서는 비용과 커스터마이징 자유도 때문에 **dbt-core**를 선택합니다.

## 참고 자료

- [dbt 공식 문서](https://docs.getdbt.com/docs/introduction)
- [dbt Quick Start Guide](https://docs.getdbt.com/guides)
- [zzsza - dbt-core 정리](https://zzsza.github.io/data-engineering/2025/01/16/dbt-core/)

!!! note "다음 단계"
    dbt가 무엇인지 이해했다면, [설치 및 설정](02-setup.md)으로 넘어가세요.
