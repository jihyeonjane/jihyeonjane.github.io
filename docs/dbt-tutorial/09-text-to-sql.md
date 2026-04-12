# [참고] Text-to-SQL 심화 — VectorDB + dbt 온톨로지 활용

[dbt에서 Semantic Layer까지](09-semantic-layer.md) 6장에서 "LLM이 자연어를 SQL로 번역"하는 미래를 소개했습니다.
이 페이지에서는 그 실현을 위한 **핵심 기술 3가지**를 정리합니다.

---

## 1. Text-to-SQL이 어려운 이유

LLM에게 "지난달 일본 매출 알려줘"라고 하면, LLM은 다음을 **동시에** 알아야 합니다:

```
1. "매출"이 어떤 테이블의 어떤 컬럼인지
2. "일본"이 country_code = 'JP'인지, country_name = '일본'인지
3. "지난달"이 revenue_date 기준인지, created_at 기준인지
4. 어떤 JOIN이 필요한지
5. 조직에서 "매출"을 어떻게 정의하는지 (gross? net?)
```

LLM은 범용 지식은 있지만, **우리 조직의 스키마와 비즈니스 정의**는 모릅니다.
이 갭을 메우는 세 가지 접근법을 살펴봅니다.

---

## 2. Retrieval-Augmented SQL Generation (RA-SQL)

### 개념

RAG(Retrieval-Augmented Generation)를 Text-to-SQL에 적용한 패턴입니다.

> 사용자 질문과 유사한 **과거 쿼리 + 스키마 정보**를 VectorDB에서 검색해서,
> LLM의 컨텍스트에 함께 넣어주는 방식

```
사용자: "지난달 일본 매출 알려줘"
                ↓
┌────────────────────────────────────────────┐
│  1. Retrieval (검색)                         │
│                                              │
│  VectorDB에서 유사 쿼리 검색:                  │
│  → "2025년 1월 한국 매출 조회" (유사도 0.92)    │
│  → "분기별 국가 매출 집계" (유사도 0.87)        │
│                                              │
│  해당 쿼리의 실제 SQL도 함께 가져옴             │
└────────────────┬───────────────────────────┘
                 ↓
┌────────────────────────────────────────────┐
│  2. Augmented Generation (증강 생성)          │
│                                              │
│  LLM에게 전달:                                │
│  - 사용자 질문                                │
│  - 유사 쿼리 예시 (few-shot)                   │
│  - 관련 테이블 스키마                          │
│  - 메트릭 정의 (dbt schema.yml)               │
│                                              │
│  → LLM이 이 컨텍스트를 참고해 SQL 생성         │
└────────────────┬───────────────────────────┘
                 ↓
SELECT SUM(amount - refund_amount - platform_fee) AS net_revenue
FROM analytics.fct_daily_revenue
WHERE country_code = 'JP'
  AND revenue_date >= '2026-03-01'
  AND revenue_date < '2026-04-01'
```

### 왜 효과적인가

| 방식 | 정확도 | 이유 |
|------|--------|------|
| LLM만 사용 (zero-shot) | 낮음 | 스키마/비즈니스 맥락 없음 |
| 스키마만 제공 | 중간 | 테이블은 알지만 "우리식 패턴"을 모름 |
| **스키마 + 유사 쿼리 (RA-SQL)** | **높음** | 실제 사용 패턴을 참고하여 생성 |

### VectorDB에 넣을 데이터

```
┌─────────────────────────────────────────────┐
│  임베딩 대상 (VectorDB에 저장)                  │
│                                               │
│  1. 과거 쿼리 + 자연어 설명                     │
│     "일별 국가별 매출 조회"                      │
│     → SELECT ... FROM fct_daily_revenue ...    │
│                                               │
│  2. dbt 모델 정의 (schema.yml)                  │
│     fct_daily_revenue: 일별 매출 집계 팩트 테이블  │
│     - country_code: 국가 코드 (KR, JP, US, TW) │
│     - net_revenue: 순매출 (환불/수수료 차감)      │
│                                               │
│  3. dbt 메트릭 정의 (metrics.yml)               │
│     net_revenue: 결제액 - 환불 - 수수료          │
│     gross_revenue: 환불 전 총 결제액             │
│                                               │
│  4. 비즈니스 용어집 (Glossary)                   │
│     "매출" → net_revenue (재무 기준)             │
│     "활성 유저" → DAU (최근 7일 로그인)           │
└─────────────────────────────────────────────┘
```

### dbt와의 시너지

여기서 **dbt가 온톨로지 기반 역할**을 합니다:

```
dbt schema.yml     → 테이블/컬럼 설명 → VectorDB에 임베딩
dbt metrics.yml    → 메트릭 공식 정의  → VectorDB에 임베딩
dbt lineage        → 테이블 관계      → 조인 경로 추론에 활용
dbt SQL 모델       → 가공 로직 자체   → VectorDB에 임베딩
```

dbt에 이미 **"데이터가 뭐고, 어떻게 만들어지는가"**가 코드로 정의되어 있기 때문에,
별도의 데이터 카탈로그 없이도 VectorDB의 지식 소스로 직접 활용할 수 있습니다.

---

## 3. DIN-SQL과 DAIL-SQL — Text-to-SQL 연구의 핵심 패턴

학술 벤치마크(Spider, BIRD 등)에서 높은 정확도를 기록한 두 가지 접근법입니다.
프로덕션에 그대로 쓰기보다는, **어떤 아이디어를 차용할 수 있는지** 관점에서 봅니다.

### DIN-SQL (Decomposed-In-Context SQL)

> 복잡한 질문을 **단계별로 분해**하여 SQL을 생성하는 방식

```
질문: "매출이 가장 높은 국가의 신규 유저 수는?"
```

**일반 LLM**: 한 번에 복잡한 SQL을 생성 → 실수 확률 높음

**DIN-SQL 접근**: 4단계로 분해

```
Step 1. 질문 분류
  → "이건 서브쿼리가 필요한 복잡한 질문이다"

Step 2. 스키마 링킹 (Schema Linking)
  → "매출" → fct_daily_revenue.net_revenue
  → "국가" → fct_daily_revenue.country_code
  → "신규 유저" → dim_users.created_at

Step 3. 중간 SQL 생성
  → 서브쿼리: "매출이 가장 높은 국가" 먼저 구함
  → 메인쿼리: 해당 국가의 신규 유저 수 집계

Step 4. 자기 검증 (Self-Correction)
  → 생성된 SQL을 다시 LLM에게 검토 요청
  → "이 SQL이 원래 질문에 정확히 답하는가?"
```

```sql
-- DIN-SQL이 생성하는 최종 SQL
WITH top_country AS (
    SELECT country_code
    FROM analytics.fct_daily_revenue
    WHERE revenue_date >= '2026-03-01'
      AND revenue_date < '2026-04-01'
    GROUP BY country_code
    ORDER BY SUM(net_revenue) DESC
    LIMIT 1
)
SELECT COUNT(*) AS new_user_count
FROM analytics.dim_users u
JOIN top_country tc ON u.country_code = tc.country_code
WHERE u.created_at >= '2026-03-01'
  AND u.created_at < '2026-04-01'
```

#### 차용할 아이디어

| DIN-SQL 개념 | 실무 적용 |
|-------------|----------|
| **질문 분류** | 단순 조회 vs 집계 vs 서브쿼리 → 다른 프롬프트 사용 |
| **스키마 링킹** | 자연어 용어 → 실제 컬럼 매핑 (dbt schema.yml 활용) |
| **자기 검증** | 생성된 SQL을 EXPLAIN으로 실행 가능 여부 확인 |

### DAIL-SQL (Demonstration-Aware In-context Learning SQL)

> VectorDB에서 **가장 유사한 예시**를 검색해 few-shot으로 제공하는 방식

DIN-SQL이 "어떻게 분해하나"에 집중한다면,
DAIL-SQL은 **"어떤 예시를 보여줄 것인가"**에 집중합니다.

```
┌─────────────────────────────────────────────┐
│  DAIL-SQL의 예시 선택 전략                      │
│                                               │
│  1. 질문 유사도 (Question Similarity)           │
│     "일본 매출" ↔ "한국 매출" → 높은 유사도      │
│                                               │
│  2. SQL 구조 유사도 (Query Similarity)          │
│     GROUP BY + SUM ↔ GROUP BY + COUNT          │
│     → 같은 패턴의 쿼리                          │
│                                               │
│  3. 마스킹 (Masking)                           │
│     구체적 값을 추상화:                          │
│     "한국 매출" → "{country} 매출"               │
│     WHERE country_code = 'KR'                  │
│       → WHERE country_code = '{value}'         │
│                                               │
│  → 이 세 가지를 조합해 최적의 few-shot 선택      │
└─────────────────────────────────────────────┘
```

#### 실전 적용 예시

```
사용자 질문: "지난달 일본 매출 알려줘"

VectorDB 검색 → 유사 예시 2개 선택:

예시 1:
  Q: "2025년 1월 한국 순매출을 알려줘"
  A: SELECT SUM(net_revenue) FROM analytics.fct_daily_revenue
     WHERE country_code = 'KR'
       AND revenue_date BETWEEN '2025-01-01' AND '2025-01-31'

예시 2:
  Q: "지난 분기 미국 총매출을 알려줘"
  A: SELECT SUM(gross_revenue) FROM analytics.fct_daily_revenue
     WHERE country_code = 'US'
       AND revenue_date BETWEEN '2025-10-01' AND '2025-12-31'

→ LLM에게 이 예시들과 함께 질문 전달
→ LLM이 패턴을 참고해 새 SQL 생성
```

#### 차용할 아이디어

| DAIL-SQL 개념 | 실무 적용 |
|--------------|----------|
| **질문 + SQL 쌍 저장** | 사내 쿼리 로그를 자연어 설명과 함께 VectorDB에 적재 |
| **쿼리 구조 유사도** | 단순 SUM과 서브쿼리를 구분해서 적절한 예시 제공 |
| **마스킹** | 국가명/날짜 등을 추상화해서 패턴 재활용성 향상 |

### DIN-SQL vs DAIL-SQL 비교

| | DIN-SQL | DAIL-SQL |
|---|---|---|
| **핵심 아이디어** | 질문을 단계별로 분해 | 최적의 few-shot 예시 선택 |
| **강점** | 복잡한 질문 처리 | 기존 쿼리 자산 활용 |
| **필요한 것** | 잘 설계된 프롬프트 체인 | 질문-SQL 쌍이 저장된 VectorDB |
| **실무 적용** | 에이전트의 사고 구조 설계 | 쿼리 로그 기반 지식 베이스 구축 |

!!! tip "조합 전략"
    실무에서는 둘을 조합합니다:

    1. **DAIL-SQL 방식**으로 유사 쿼리를 VectorDB에서 검색 (few-shot)
    2. **DIN-SQL 방식**으로 복잡한 질문은 단계별로 분해
    3. 최종 SQL을 자기 검증 후 실행

---

## 4. Ontology-Driven Data Catalog

### 개념

> dbt의 메타데이터(schema.yml, metrics.yml, lineage)를 **온톨로지 구조로 체계화**하여
> LLM이 "우리 데이터 세계의 지도"를 이해할 수 있게 만드는 것

일반적인 데이터 카탈로그는 "어떤 테이블에 어떤 컬럼이 있다" 수준입니다.
온톨로지 기반 카탈로그는 여기에 **의미(semantics)**를 더합니다.

### 일반 카탈로그 vs 온톨로지 기반 카탈로그

```
[일반 카탈로그]
  fct_daily_revenue
    - country_code: VARCHAR
    - net_revenue: DECIMAL
    - revenue_date: DATE

[온톨로지 기반 카탈로그]
  fct_daily_revenue
    - country_code: VARCHAR
      → "국가" 엔티티의 식별자
      → dim_countries.code와 조인 가능
      → 허용값: KR, JP, US, TW
    - net_revenue: DECIMAL
      → 메트릭 "순매출"의 물리적 컬럼
      → 계산식: amount - refund_amount - platform_fee
      → 재무팀 공식 매출 기준
      → 관련 메트릭: gross_revenue, arpu
    - revenue_date: DATE
      → 시간 디멘션 (기본 집계 단위: day)
      → 소스: stg_orders.order_date에서 파생
```

### dbt가 온톨로지의 기반이 되는 이유

dbt 프로젝트에는 이미 온톨로지의 핵심 요소가 코드로 존재합니다:

| 온톨로지 요소 | dbt에서의 구현 | 파일 |
|-------------|--------------|------|
| **엔티티 정의** | 모델 설명 (description) | `schema.yml` |
| **속성 정의** | 컬럼 설명 + 데이터 타입 | `schema.yml` |
| **관계 정의** | `ref()`, `source()` | SQL 모델 |
| **메트릭 정의** | measures, metrics | `metrics.yml` |
| **계층 구조** | sources → staging → marts | 디렉토리 구조 |
| **가공 로직** | SQL 변환 | `.sql` 파일 |
| **데이터 품질 규칙** | tests | `schema.yml` |
| **변경 이력** | Git history | `.git` |

### VectorDB 적재 구조

dbt 메타데이터를 VectorDB에 어떻게 넣을지 설계합니다.

```python
# dbt 메타데이터 → VectorDB 임베딩 대상 설계 (개념 코드)

embeddings = []

# 1. 모델 단위 임베딩
for model in manifest["nodes"].values():
    if model["resource_type"] != "model":
        continue
    text = f"""
    테이블: {model['name']}
    설명: {model['description']}
    컬럼: {', '.join(
        f"{c}({info.get('description', '')})"
        for c, info in model.get('columns', {}).items()
    )}
    의존성: {', '.join(model.get('depends_on', {}).get('nodes', []))}
    """
    embeddings.append({
        "text": text,
        "metadata": {"type": "model", "name": model["name"]},
    })

# 2. 메트릭 단위 임베딩
for metric in manifest["metrics"].values():
    text = f"""
    메트릭: {metric['name']}
    레이블: {metric.get('label', '')}
    설명: {metric['description']}
    계산 방식: {metric.get('type_params', {})}
    """
    embeddings.append({
        "text": text,
        "metadata": {"type": "metric", "name": metric["name"]},
    })

# 3. 과거 쿼리 + 자연어 설명 임베딩
for query_log in approved_queries:
    text = f"""
    질문: {query_log['natural_language']}
    SQL: {query_log['sql']}
    사용 테이블: {query_log['tables']}
    """
    embeddings.append({
        "text": text,
        "metadata": {"type": "query", "id": query_log["id"]},
    })
```

### 전체 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  사용자 질문: "지난달 일본 매출 알려줘"                   │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  1. VectorDB 검색 (Retrieval)                         │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 유사 쿼리     │  │ 관련 모델     │  │ 메트릭 정의   │  │
│  │ (DAIL-SQL)  │  │ (스키마)     │  │ (dbt)       │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         └────────────────┼────────────────┘           │
└──────────────────────────┼──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│  2. SQL 생성 (Augmented Generation)                   │
│                                                       │
│  LLM 프롬프트:                                         │
│  - 유사 쿼리 2-3개 (few-shot)                          │
│  - 관련 테이블 스키마 + 컬럼 설명                        │
│  - 메트릭 정의 (net_revenue = ...)                     │
│  - 필요 시 DIN-SQL 분해                                │
│                                                       │
│  → SQL 생성                                           │
└──────────────────────────┬──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│  3. 검증 & 실행                                        │
│                                                       │
│  - EXPLAIN으로 문법/실행 가능 여부 확인                   │
│  - 자기 검증 (Self-Correction)                         │
│  - 실행 후 결과 반환                                    │
└─────────────────────────────────────────────────────┘
```

---

## 5. 구현 로드맵

현실적인 단계별 접근입니다.

### Phase 1: dbt 메타데이터 정비 (선행 조건)

dbt 프로젝트의 `schema.yml`을 꼼꼼히 작성하는 것이 모든 것의 시작입니다.

```yaml
# 이 정도 수준의 설명이 있어야 LLM이 이해할 수 있음
models:
  - name: fct_daily_revenue
    description: "일별 국가별 매출 집계 팩트 테이블. 재무 보고의 기준 테이블."
    columns:
      - name: country_code
        description: "ISO 3166-1 alpha-2 국가 코드. KR=한국, JP=일본, US=미국, TW=대만"
      - name: net_revenue
        description: "순매출. 계산: amount - refund_amount - platform_fee. 재무팀 공식 매출."
```

!!! warning "garbage in, garbage out"
    `schema.yml`에 설명이 없으면, VectorDB에 넣어도 LLM이 이해할 수 없습니다.
    **메타데이터 품질 = Text-to-SQL 정확도**입니다.

### Phase 2: 쿼리 로그 수집

```
사내에서 자주 쓰이는 쿼리들을 수집:
  - BI 도구의 쿼리 로그
  - 데이터팀의 ad-hoc 쿼리 (슬랙, Jupyter 등)
  - Airflow DAG의 SQL

각 쿼리에 자연어 설명을 태깅:
  "일별 국가별 순매출 조회" → SELECT ... FROM fct_daily_revenue ...
```

### Phase 3: VectorDB 구축

```
임베딩 대상:
  1. dbt schema.yml (모델 + 컬럼 설명)
  2. dbt metrics.yml (메트릭 정의)
  3. dbt SQL 모델 (가공 로직)
  4. 태깅된 쿼리 로그 (질문-SQL 쌍)

VectorDB 선택지:
  - Chroma (로컬, 가볍게 시작)
  - pgvector (PostgreSQL 확장)
  - Pinecone, Weaviate (매니지드)
```

### Phase 4: MCP 서버 확장

[기존 MCP 서버](09-semantic-layer-mcp.md)에 VectorDB 검색 기능을 추가합니다.

```python
# 기존 MCP 서버에 추가할 Tool (개념)

@mcp.tool()
def find_similar_queries(question: str, top_k: int = 3) -> list[dict]:
    """자연어 질문과 유사한 과거 쿼리를 검색합니다.

    VectorDB에서 질문과 유사한 쿼리-SQL 쌍을 찾아
    few-shot 예시로 활용할 수 있습니다.

    Args:
        question: 자연어 질문 (예: "일본 매출 알려줘")
        top_k: 반환할 유사 쿼리 수
    """
    results = vectordb.similarity_search(question, k=top_k)
    return [
        {
            "question": r.metadata["question"],
            "sql": r.metadata["sql"],
            "tables": r.metadata["tables"],
            "similarity": r.score,
        }
        for r in results
    ]


@mcp.tool()
def find_relevant_schema(question: str) -> list[dict]:
    """질문과 관련된 테이블/컬럼 스키마를 검색합니다.

    dbt schema.yml 기반의 테이블 설명, 컬럼 설명,
    메트릭 정의를 VectorDB에서 검색합니다.

    Args:
        question: 자연어 질문
    """
    results = vectordb.similarity_search(
        question, k=5, filter={"type": {"$in": ["model", "metric"]}}
    )
    return [{"content": r.page_content, "metadata": r.metadata} for r in results]
```

---

## 6. 정리

```
dbt (온톨로지 기반)
  │
  ├── schema.yml    → "데이터가 뭔지" 정의
  ├── metrics.yml   → "메트릭이 뭔지" 정의
  ├── SQL 모델      → "어떻게 만들어지는지" 정의
  └── lineage       → "어떻게 연결되는지" 정의
          │
          ↓  VectorDB에 임베딩
          │
  ┌───────────────────────────┐
  │  VectorDB                  │
  │  + dbt 메타데이터            │
  │  + 사내 쿼리 로그            │
  │  + 비즈니스 용어집           │
  └───────────┬───────────────┘
              │
              ↓  Retrieval (RA-SQL + DAIL-SQL)
              │
  ┌───────────────────────────┐
  │  LLM                       │
  │  + 유사 쿼리 (few-shot)     │
  │  + 스키마 컨텍스트           │
  │  + DIN-SQL 분해 (복잡 질문)  │
  │  → 정확한 SQL 생성          │
  └───────────────────────────┘
```

핵심은 **dbt에 이미 쌓인 지식 자산**입니다.
schema.yml의 설명, metrics.yml의 정의, SQL 모델의 가공 로직 —
이것들이 VectorDB의 지식 소스가 되고, LLM이 "우리 조직의 언어"로 SQL을 생성하는 기반이 됩니다.

---

## 참고 자료

- [DIN-SQL: Decomposed In-Context Learning of Text-to-SQL (2023)](https://arxiv.org/abs/2304.11015) — 질문 분해 + 스키마 링킹 + 자기 검증
- [DAIL-SQL: Efficient Few-Shot Text-to-SQL (2023)](https://arxiv.org/abs/2308.15363) — VectorDB 기반 few-shot 예시 선택
- [Retrieval-Augmented Generation for Large Language Models: A Survey (2024)](https://arxiv.org/abs/2312.10997) — RAG 전반 서베이
- [dbt Semantic Layer 공식 문서](https://docs.getdbt.com/docs/build/semantic-layer-overview)

---

[← dbt에서 Semantic Layer까지](09-semantic-layer.md) · [MCP로 자체 Semantic Layer API →](09-semantic-layer-mcp.md)
