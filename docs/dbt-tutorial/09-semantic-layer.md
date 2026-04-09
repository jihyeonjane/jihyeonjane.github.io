# dbt에서 Semantic Layer까지 — 왜 필요한가

---

## 1. 왜 이 글을 읽어야 하는가

> **"지난달 일본 매출이 얼마야?"**

이 질문 하나에 조직이 멈춥니다.

```
1. PM이 데이터팀에 슬랙 → "지난달 일본 매출 좀 뽑아주세요"
2. DE가 SQL 작성 → 1,230만 엔
3. 재무팀: "우리 숫자는 1,180만 엔인데요?"
4. 마케팅팀: "저희가 뽑은 건 1,350만 엔이에요"
5. 회의 소집 → "도대체 누구 숫자가 맞아?"
6. 3일 뒤 결론: "매출 정의가 달랐습니다"
7. 다음 달 → 반복
```

**왜 이런 일이 생길까?**

- 팀마다 "매출"의 정의가 다름
- 쿼리가 개인 노트북이나 BI 도구에 분산
- 어떤 테이블이 어떤 테이블에서 파생됐는지 추적 불가

이 글은 **Ontology(온톨로지)**와 **Semantic Layer(시멘틱 레이어)**라는 개념을 통해 이 악순환을 끊는 구조를 제안합니다.

!!! tip "이 글의 대상 독자"
    - "이 숫자 맞아?" 질문에 지친 데이터 엔지니어
    - 메트릭 정의를 표준화하고 싶은 분석가
    - dbt를 도입했거나 도입 예정인 팀

---

## 2. 핵심 개념 정리

### 온톨로지 (Ontology)

> **데이터 간의 관계와 구조를 정의하는 메타데이터 모델**

비유하면 **지도의 도로망**입니다. "서울에서 부산까지 어떤 길로 갈 수 있는가" — 데이터 세계에서는 "유저 테이블에서 매출 테이블까지 어떤 조인 경로가 있는가"에 해당합니다.

온톨로지는 다음을 정의합니다:

- **엔티티(Entity)**: 비즈니스 객체 (유저, 주문, 상품 등)
- **관계(Relationship)**: 엔티티 간 연결 (1:N, N:1, N:M)
- **계층(Hierarchy)**: 국가 → 지역 → 도시 같은 상하 구조

#### 엔티티 관계 예시

```
[users] 1:N [orders]        — 한 유저가 여러 주문
[orders] 1:N [order_items]  — 한 주문에 여러 상품
[order_items] N:1 [products] — 여러 주문 상품이 하나의 제품에 매핑
[users] N:1 [countries]     — 유저는 하나의 국가에 속함
```

!!! note "왜 '온톨로지'라는 단어를 쓰나?"
    철학에서 빌려온 용어입니다. 철학의 온톨로지가 "존재하는 것들의 분류 체계"라면, 데이터 온톨로지는 **"조직이 다루는 데이터의 분류 체계"**입니다. ERD(Entity-Relationship Diagram)와 비슷하지만, 물리적 테이블 구조가 아닌 **비즈니스 개념 간의 관계**에 초점을 맞춥니다.

#### 온톨로지의 3가지 구성 요소

Palantir Foundry 같은 데이터 플랫폼에서는 온톨로지를 다음 3가지로 구성합니다:

| 구성 요소 | 역할 | 예시 |
|-----------|------|------|
| **Object (오브젝트)** | 비즈니스 엔티티 표현 | 고객, 주문, 상품, 배송 |
| **Link (링크)** | 오브젝트 간 관계 정의 | 고객 → "주문함" → 주문 |
| **Action (액션)** | 오브젝트에 대한 행동 정의 | "환불 처리", "재고 업데이트" |

이 3가지가 합쳐지면 조직의 **디지털 트윈(Digital Twin)** — 현실 세계의 비즈니스 구조를 데이터로 그대로 반영한 모델 — 이 됩니다.

#### 온톨로지의 레이어 구조

온톨로지는 단순한 데이터 카탈로그를 넘어서, 여러 레이어로 확장될 수 있습니다:

```
┌─────────────────────────────────────────────┐
│  Dynamic Layer (동적 레이어)                   │
│  시뮬레이션, 자율 운영, What-if 분석           │
├─────────────────────────────────────────────┤
│  Kinetic Layer (키네틱 레이어)                  │
│  액션, 워크플로우, 프로세스 자동화              │
├─────────────────────────────────────────────┤
│  Semantic Layer (의미론적 레이어)               │
│  Object, Link, 속성, 메트릭 정의              │
├─────────────────────────────────────────────┤
│  Data Integration (데이터 통합)                │
│  원천 데이터 수집, 정제, 파이프라인             │
└─────────────────────────────────────────────┘
```

!!! tip "우리가 dbt로 만드는 것은?"
    dbt로 구축하는 것은 위 구조에서 **Data Integration + Semantic Layer**에 해당합니다. source/staging/marts 모델링이 데이터 통합이고, schema.yml/metrics.yml 정의가 Semantic Layer입니다. 그 위의 Kinetic/Dynamic Layer는 데이터 활용 단계에서 BI 도구, 워크플로우 엔진, LLM 등이 담당합니다.

---

### 시멘틱 레이어 (Semantic Layer)

> **온톨로지 위에 비즈니스 메트릭의 공식 정의를 추가한 계층**

비유하면 **지도 위의 교통 표지판**입니다. 도로망(온톨로지)이 "어디로 갈 수 있는가"를 알려준다면, 교통 표지판(시멘틱 레이어)은 "이 도로에서 무엇을 해야 하는가"를 알려줍니다.

#### "매출"의 정의가 팀마다 다른 이유

| 팀 | 쿼리 | 결과 | 무엇을 측정하나 |
|------|-------|------|-----------------|
| **비즈니스팀** | `SUM(amount)` | 1,350만 | 총 결제액 (환불/수수료 무관) |
| **재무팀** | `SUM(amount - refund - fee) WHERE status='completed'` | 1,180만 | 순매출 (완료 건만) |
| **마케팅팀** | `SUM(item_price * quantity)` | 1,230만 | 상품 기반 추정 매출 |

세 팀 모두 "매출"이라고 부르지만, **실제로 측정하는 것이 다릅니다.**

!!! warning "이게 왜 위험한가"
    - 경영진에게 서로 다른 숫자가 보고됨
    - 의사결정이 지연되거나 잘못된 근거로 이루어짐
    - 데이터팀의 신뢰도 하락

시멘틱 레이어는 이를 **코드로 고정**합니다:

```yaml
# metrics.yml — dbt Semantic Layer 정의

metrics:
  - name: gross_revenue
    label: "총 매출 (Gross Revenue)"
    description: "환불/수수료 차감 전 총 결제액"
    type: simple
    type_params:
      measure: total_amount
    filter: null

  - name: net_revenue
    label: "순매출 (Net Revenue)"
    description: "환불 및 수수료를 차감한 완료 건 매출"
    type: derived
    type_params:
      expr: total_amount - total_refund - total_fee
    filter: |
      {{ Dimension('order__status') }} = 'completed'
```

이제 "매출"이라는 단어에 **두 가지 공식 정의**가 생깁니다. 누구든 `gross_revenue`인지 `net_revenue`인지 명시해야 합니다.

---

### 온톨로지 vs 시멘틱 레이어 비교

| 구분 | 온톨로지 (Ontology) | 시멘틱 레이어 (Semantic Layer) |
|------|---------------------|-------------------------------|
| **역할** | 데이터 구조/관계 정의 | 비즈니스 메트릭 정의 |
| **비유** | 지도의 도로망 | 도로 위의 교통 표지판 |
| **정의하는 것** | 엔티티, 관계, 계층 | 메트릭, 디멘션, 필터 |
| **질문** | "이 테이블들이 어떻게 연결되나?" | "매출이 정확히 뭐야?" |
| **예시** | `users 1:N orders` | `net_revenue = SUM(amount - refund)` |
| **변경 빈도** | 낮음 (구조는 안정적) | 중간 (비즈니스 정의 진화) |

!!! tip "둘의 관계"
    온톨로지 **없이** 시멘틱 레이어를 만들 수 있지만, 온톨로지가 있으면 시멘틱 레이어가 **자동으로 조인 경로를 찾을 수** 있습니다. "일본 매출"을 구하려면 `orders → users → countries` 경로를 알아야 하는데, 온톨로지가 이 경로를 제공합니다.

---

## 3. 왜 필요한가 — 현재의 문제들

### 문제 1: 메트릭 정의가 파편화

```
마케팅팀 대시보드 → 자체 SQL → "매출" = SUM(item_price * qty)
재무팀 스프레드시트 → 다른 SQL → "매출" = SUM(amount - refund)
PM의 노트북       → 또 다른 SQL → "매출" = COUNT(*) * avg_price
```

같은 단어, 다른 숫자. **조직이 커질수록 이 격차는 기하급수적으로 증가합니다.**

### 문제 2: "이 숫자 맞아?" 커뮤니케이션 비용

```
PM:  "이번 달 일본 신규 유저 매출이 20% 떨어진 거 맞아?"
DE:  "어떤 대시보드 보셨어요?"
PM:  "마케팅팀 대시보드요"
DE:  "그건 gross 기준이라... 재무 기준으로 다시 뽑을게요"
PM:  "그럼 어떤 게 맞는 거야?"
DE:  "...정의에 따라 다릅니다"
PM:  "..."
```

!!! warning "숨겨진 비용"
    이 대화가 하루에 몇 번 일어나는지 세어보세요. DE가 메트릭 정의를 설명하는 데 쓰는 시간은 **새 기능을 만들 수 있는 시간**입니다.

### 문제 3: BI 도구 교체 리스크

BI 도구 안에 메트릭 정의가 들어있으면, 도구를 바꿀 때 **모든 정의를 다시 만들어야** 합니다.

```
Tableau에서 Looker로 이관?
→ 대시보드 200개 × 메트릭 50개 = 10,000개 정의 재작성
→ 이관 기간: 3~6개월
→ 이관 중 숫자 불일치 발생 확률: 100%
```

시멘틱 레이어가 **dbt 코드에** 있으면, BI 도구는 그저 "소비자"일 뿐입니다. 도구를 바꿔도 메트릭 정의는 그대로입니다.

---

## 4. dbt가 시멘틱 레이어의 기반이 되는 이유

### 기둥 1: 모든 정의가 코드 (Git 관리)

```yaml
# schema.yml
models:
  - name: fct_daily_revenue
    description: "일별 매출 집계 팩트 테이블"
    columns:
      - name: order_date
        description: "주문 일자"
        tests:
          - not_null
      - name: country_code
        description: "국가 코드 (ISO 3166-1 alpha-2)"
        tests:
          - not_null
          - accepted_values:
              values: ['KR', 'JP', 'US', 'TW']
      - name: gross_revenue
        description: "총 매출 (환불 전)"
        tests:
          - not_null
      - name: net_revenue
        description: "순매출 (환불/수수료 차감)"
```

- 변경 이력이 Git에 남음
- PR 리뷰로 메트릭 정의 변경을 팀이 합의
- "3개월 전 매출 정의가 뭐였지?" → `git log`로 확인

### 기둥 2: 비즈니스 로직이 SQL로 표준화

```sql
-- models/marts/fct_daily_revenue.sql

WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
    WHERE status = 'completed'
),

order_items AS (
    SELECT * FROM {{ ref('stg_order_items') }}
),

daily_revenue AS (
    SELECT
        o.order_date,
        o.country_code,
        SUM(oi.item_price * oi.quantity) AS gross_revenue,
        SUM(oi.item_price * oi.quantity)
          - SUM(o.refund_amount)
          - SUM(o.platform_fee) AS net_revenue,
        COUNT(DISTINCT o.order_id) AS order_count
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY 1, 2
)

SELECT * FROM daily_revenue
```

- "매출은 어떻게 계산하나?" → **이 SQL 파일이 정답**
- BI 도구에 로직이 숨어있지 않음
- 분석가도 읽을 수 있는 SQL

### 기둥 3: Lineage 자동 추적

dbt의 `ref()`와 `source()` 함수가 만드는 의존성 체인:

```
source('raw', 'orders')
    → stg_orders
        → int_orders_with_items
            → fct_daily_revenue
                → metrics: gross_revenue, net_revenue
```

- "이 메트릭의 원천 데이터가 뭐야?" → lineage 그래프로 즉시 확인
- "이 소스 테이블을 바꾸면 어떤 메트릭에 영향?" → 역방향 추적
- `dbt docs generate`로 자동 시각화

!!! tip "세 기둥의 시너지"
    코드(Git) + SQL(표준화) + Lineage(추적) = **메트릭의 출생부터 소비까지 전체 이력 관리**

---

## 5. 전체 아키텍처

데이터가 저장소에서 최종 소비자까지 흘러가는 전체 구조입니다.

<div class="ch-nodes-diagram" markdown="0">
  <div class="ch-nodes-title">Semantic Layer 아키텍처</div>

  <!-- 소비 계층 -->
  <div style="padding: 12px 16px;">
    <div style="color: #f5c0e8; font-size: 11px; font-weight: bold; margin-bottom: 8px;">소비 계층 (Consumption)</div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
      <div style="background: #f5c0e822; border: 1px solid #f5c0e855; border-radius: 6px; padding: 8px 14px; color: #f5c0e8; font-size: 11px; text-align: center;">
        <div style="font-size: 16px;">📊</div>
        <div>BI 도구</div>
        <div style="font-size: 9px; color: #6c7086;">Tableau, Looker 등</div>
      </div>
      <div style="background: #f5c0e822; border: 1px solid #f5c0e855; border-radius: 6px; padding: 8px 14px; color: #f5c0e8; font-size: 11px; text-align: center;">
        <div style="font-size: 16px;">🔌</div>
        <div>API</div>
        <div style="font-size: 9px; color: #6c7086;">REST, GraphQL</div>
      </div>
      <div style="background: #f5c0e822; border: 1px solid #f5c0e855; border-radius: 6px; padding: 8px 14px; color: #f5c0e8; font-size: 11px; text-align: center;">
        <div style="font-size: 16px;">🤖</div>
        <div>LLM Agent</div>
        <div style="font-size: 9px; color: #6c7086;">자연어 쿼리</div>
      </div>
    </div>
  </div>

  <!-- 화살표 -->
  <div style="text-align: center; color: #6c7086; font-size: 18px; padding: 4px 0;">▲</div>

  <!-- 메타데이터 관리 -->
  <div style="padding: 0 16px 12px;">
    <div style="color: #f9e2af; font-size: 11px; font-weight: bold; margin-bottom: 8px;">메타데이터 관리 (Data Catalog)</div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
      <div style="background: #f9e2af11; border: 2px solid #f9e2af; border-radius: 8px; padding: 10px 16px; min-width: 200px; text-align: center;">
        <div style="color: #f9e2af; font-size: 12px; font-weight: bold;">Semantic Layer</div>
        <div style="color: #6c7086; font-size: 10px; margin-top: 4px;">metrics + dimensions + filters</div>
        <div style="color: #a6adc8; font-size: 9px; margin-top: 2px;">gross_revenue, net_revenue, ...</div>
      </div>
      <div style="background: #89b4fa11; border: 2px solid #89b4fa; border-radius: 8px; padding: 10px 16px; min-width: 200px; text-align: center;">
        <div style="color: #89b4fa; font-size: 12px; font-weight: bold;">Ontology</div>
        <div style="color: #6c7086; font-size: 10px; margin-top: 4px;">relationships + hierarchies</div>
        <div style="color: #a6adc8; font-size: 9px; margin-top: 2px;">users → orders → items → products</div>
      </div>
    </div>
  </div>

  <!-- 화살표 -->
  <div style="text-align: center; color: #6c7086; font-size: 18px; padding: 4px 0;">▲</div>

  <!-- dbt 계층 -->
  <div style="padding: 0 16px 12px;">
    <div style="color: #a6e3a1; font-size: 11px; font-weight: bold; margin-bottom: 8px;">변환 계층 (dbt)</div>
    <div style="background: #a6e3a111; border: 2px solid #a6e3a1; border-radius: 8px; padding: 12px 16px; text-align: center;">
      <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;">
        <span style="background: #45475a; color: #cdd6f4; padding: 3px 10px; border-radius: 4px; font-size: 10px;">sources</span>
        <span style="color: #6c7086; font-size: 12px;">→</span>
        <span style="background: #45475a; color: #cdd6f4; padding: 3px 10px; border-radius: 4px; font-size: 10px;">staging</span>
        <span style="color: #6c7086; font-size: 12px;">→</span>
        <span style="background: #45475a; color: #cdd6f4; padding: 3px 10px; border-radius: 4px; font-size: 10px;">intermediate</span>
        <span style="color: #6c7086; font-size: 12px;">→</span>
        <span style="background: #45475a; color: #cdd6f4; padding: 3px 10px; border-radius: 4px; font-size: 10px;">marts</span>
      </div>
      <div style="color: #6c7086; font-size: 9px;">+ schema.yml + metrics.yml + ref() + source()</div>
    </div>
  </div>

  <!-- 화살표 -->
  <div style="text-align: center; color: #6c7086; font-size: 18px; padding: 4px 0;">▲</div>

  <!-- 저장 계층 -->
  <div style="padding: 0 16px 12px;">
    <div style="color: #89b4fa; font-size: 11px; font-weight: bold; margin-bottom: 8px;">저장 계층 (Storage)</div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
      <div style="background: #89b4fa22; border: 1px solid #89b4fa55; border-radius: 6px; padding: 8px 14px; color: #89b4fa; font-size: 11px; text-align: center;">
        <div style="font-size: 16px;">🏢</div>
        <div>Data Warehouse</div>
        <div style="font-size: 9px; color: #6c7086;">ClickHouse, BigQuery 등</div>
      </div>
      <div style="background: #89b4fa22; border: 1px solid #89b4fa55; border-radius: 6px; padding: 8px 14px; color: #89b4fa; font-size: 11px; text-align: center;">
        <div style="font-size: 16px;">🪣</div>
        <div>Data Lake</div>
        <div style="font-size: 9px; color: #6c7086;">S3, GCS</div>
      </div>
    </div>
  </div>
</div>

---

## 6. 미래 확장 — 자연어 쿼리 (LLM)

### 현재: 사람이 번역

```
PM: "지난달 일본 매출이 얼마야?"
    ↓ (슬랙으로 DE에게 요청)
DE: SQL 작성 + 실행 + 결과 전달
    ↓
PM: 결과 확인 (30분~수 시간 소요)
```

### 미래: LLM이 번역

```
PM: "지난달 일본 매출이 얼마야?"
    ↓ (자연어 → LLM)
LLM: Semantic Layer 참조 → SQL 자동 생성 → 실행
    ↓
PM: 결과 확인 (10초)
```

!!! tip "왜 시멘틱 레이어가 LLM에 필수인가"
    LLM이 "매출"을 SQL로 바꾸려면, **매출의 공식 정의를 알아야** 합니다. 시멘틱 레이어 없이 LLM에게 "매출 뽑아줘"라고 하면, LLM도 사람처럼 **아무 정의나 골라서** SQL을 만듭니다.

### MCP (Model Context Protocol) 아키텍처

<div class="ch-nodes-diagram" markdown="0">
  <div class="ch-nodes-title">LLM + Semantic Layer 연동 구조</div>
  <div style="padding: 16px; display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap;">
    <div style="background: #f5c0e822; border: 2px solid #f5c0e8; border-radius: 8px; padding: 10px 14px; text-align: center; min-width: 100px;">
      <div style="color: #f5c0e8; font-size: 12px; font-weight: bold;">사용자</div>
      <div style="color: #6c7086; font-size: 9px;">"일본 매출 알려줘"</div>
    </div>
    <div style="color: #6c7086; font-size: 16px;">→</div>
    <div style="background: #cba6f722; border: 2px solid #cba6f7; border-radius: 8px; padding: 10px 14px; text-align: center; min-width: 100px;">
      <div style="color: #cba6f7; font-size: 12px; font-weight: bold;">LLM Agent</div>
      <div style="color: #6c7086; font-size: 9px;">자연어 이해</div>
    </div>
    <div style="color: #6c7086; font-size: 16px;">→</div>
    <div style="background: #f9e2af11; border: 2px solid #f9e2af; border-radius: 8px; padding: 10px 14px; text-align: center; min-width: 120px;">
      <div style="color: #f9e2af; font-size: 12px; font-weight: bold;">Semantic Layer</div>
      <div style="color: #6c7086; font-size: 9px;">메트릭 정의 조회</div>
      <div style="color: #a6adc8; font-size: 9px;">MCP Server</div>
    </div>
    <div style="color: #6c7086; font-size: 16px;">→</div>
    <div style="background: #a6e3a111; border: 2px solid #a6e3a1; border-radius: 8px; padding: 10px 14px; text-align: center; min-width: 100px;">
      <div style="color: #a6e3a1; font-size: 12px; font-weight: bold;">SQL 생성</div>
      <div style="color: #6c7086; font-size: 9px;">정확한 쿼리</div>
    </div>
    <div style="color: #6c7086; font-size: 16px;">→</div>
    <div style="background: #89b4fa22; border: 2px solid #89b4fa; border-radius: 8px; padding: 10px 14px; text-align: center; min-width: 100px;">
      <div style="color: #89b4fa; font-size: 12px; font-weight: bold;">DW 실행</div>
      <div style="color: #6c7086; font-size: 9px;">결과 반환</div>
    </div>
  </div>
  <div style="padding: 0 16px 12px; text-align: center; color: #6c7086; font-size: 10px;">
    MCP(Model Context Protocol)를 통해 LLM이 Semantic Layer의 메트릭 정의에 접근 → 정확한 SQL 자동 생성
  </div>
</div>

핵심은 LLM이 **"매출"이라는 단어를 자기 마음대로 해석하지 않고**, 시멘틱 레이어에 정의된 `net_revenue` 또는 `gross_revenue` 중 맥락에 맞는 것을 선택한다는 점입니다.

---

## 7. 기대 효과 요약

| 구분 | AS-IS (현재) | TO-BE (시멘틱 레이어 도입 후) |
|------|-------------|-------------------------------|
| **메트릭 정의** | 팀별 SQL에 분산 | dbt metrics.yml에 통합 |
| **"이 숫자 맞아?"** | 매주 반복 | 정의 코드 링크 공유로 해결 |
| **신규 메트릭 추가** | DE에게 요청 → 대시보드 수정 | YAML 추가 → PR 리뷰 → 자동 반영 |
| **BI 도구 교체** | 전체 재구축 (3~6개월) | 소비 계층만 교체 (1~2주) |
| **데이터 요청 응답** | 슬랙 → SQL 작성 → 30분 | 자연어 쿼리 → 10초 (LLM 연동 시) |
| **메트릭 변경 이력** | "누가 바꿨지?" 추적 불가 | Git log로 전체 이력 확인 |
| **온보딩** | "이 테이블은 OO에게 물어봐" | dbt docs + 카탈로그로 셀프서비스 |

---

## 8. 결론

이 글에서 다룬 세 가지 핵심 개념을 다시 정리합니다.

| 계층 | 역할 | 핵심 가치 |
|------|------|-----------|
| **dbt** | 비즈니스 로직을 코드로 관리 | 버전 관리, 테스트, 리니지 |
| **Semantic Layer** | 조직의 Single Source of Truth | 메트릭 표준화, BI 독립성 |
| **LLM 연동** | 시멘틱 레이어 위에서 자연어 접근 | 데이터 민주화 |

```
"지난달 일본 매출이 얼마야?"
```

이 질문에 **30분짜리 회의** 대신 **10초짜리 답변**이 돌아오는 세상.

그 시작은 dbt로 비즈니스 로직을 코드화하고, 시멘틱 레이어로 메트릭을 표준화하는 것입니다.

!!! note "다음 단계"
    - dbt 프로젝트에 `schema.yml` 정리부터 시작하세요
    - 팀에서 가장 자주 쓰는 메트릭 3~5개를 먼저 표준화하세요
    - 완벽한 시멘틱 레이어가 아니어도, **"공식 정의가 코드에 있다"는 사실만으로** 커뮤니케이션 비용이 줄어듭니다

---

## 참고 자료

- [dbt Semantic Layer 공식 문서](https://docs.getdbt.com/docs/build/semantic-layer-overview)
- [dbt MetricFlow 가이드](https://docs.getdbt.com/docs/build/about-metricflow)
- [파운드리(Foundry)와 온톨로지(Ontology)란 — 개념 정리](https://velog.io/@cha-suyeon/%ED%8C%8C%EC%9A%B4%EB%93%9C%EB%A6%ACFoundary%EC%99%80-%EC%98%A8%ED%86%A8%EB%A1%9C%EC%A7%80Ontology%EB%9E%80-%EA%B0%9C%EB%85%90) — Palantir Foundry의 온톨로지 레이어(Semantic/Kinetic/Dynamic) 개념
- [Atlan — What is a Semantic Layer?](https://atlan.com/what-is-a-semantic-layer/)
- [MCP (Model Context Protocol) 소개](https://modelcontextprotocol.io/)
