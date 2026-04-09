# [참고] MCP로 자체 Semantic Layer API 구현하기

dbt Cloud의 Semantic Layer API는 유료($100/인/월)입니다. **dbt Core + MCP Server**로 동일한 기능을 자체 구현하는 방법을 정리합니다.

---

## 전체 아키텍처

```
사용자 (Slack, 챗봇, IDE)
    ↓ 자연어 질문
LLM (Claude, GPT 등)
    ↓ MCP 프로토콜
┌──────────────────────────────┐
│  자체 MCP Server             │
│                              │
│  Tool 1: get_metrics         │
│  → manifest.json에서 메트릭  │
│    정의/계산식/필터 반환       │
│                              │
│  Tool 2: get_model_info      │
│  → 모델 스키마/관계/설명 반환  │
│                              │
│  Tool 3: run_query           │
│  → ClickHouse에 쿼리 실행     │
└──────────────────────────────┘
    ↓ SQL 결과
사용자에게 답변 반환
```

---

## Step 1: dbt에서 메트릭 정의

### semantic_models.yml

```yaml
# models/marts/finance/_finance__semantic.yml
semantic_models:
  - name: revenue
    defaults:
      agg_time_dimension: revenue_date
    model: ref('fct_daily_revenue')
    description: "매출 시멘틱 모델"

    entities:
      - name: user
        type: foreign
        expr: user_id
      - name: country
        type: foreign
        expr: country_code

    dimensions:
      - name: revenue_date
        type: time
        type_params:
          time_granularity: day
      - name: country_code
        type: categorical
      - name: payment_method
        type: categorical

    measures:
      - name: total_amount
        agg: sum
        expr: amount
        description: "총 결제액"
      - name: total_refund
        agg: sum
        expr: refund_amount
        description: "총 환불액"
      - name: total_fee
        agg: sum
        expr: platform_fee
        description: "총 플랫폼 수수료"
      - name: paying_user_count
        agg: count_distinct
        expr: user_id
        description: "결제 유저 수"
```

### metrics.yml

```yaml
# models/marts/finance/_finance__metrics.yml
metrics:
  - name: gross_revenue
    label: "총 매출 (Gross)"
    description: "환불/수수료 차감 전 총 결제액"
    type: simple
    type_params:
      measure: total_amount

  - name: net_revenue
    label: "순 매출 (Net)"
    description: "결제액 - 환불 - 플랫폼수수료. 재무 보고 기준 공식 매출."
    type: derived
    type_params:
      expr: total_amount - total_refund - total_fee
      metrics:
        - name: total_amount
        - name: total_refund
        - name: total_fee

  - name: arpu
    label: "ARPU"
    description: "유저당 평균 매출 = 총매출 / 결제 유저 수"
    type: derived
    type_params:
      expr: total_amount / paying_user_count
      metrics:
        - name: total_amount
        - name: paying_user_count
```

### manifest.json 생성

```bash
dbt compile   # 또는 dbt docs generate
# → target/manifest.json 에 모든 메트릭/모델/관계 정보가 포함됨
```

---

## Step 2: MCP Server 구현

### 프로젝트 구조

```
dbt-semantic-mcp/
├── server.py              # MCP Server 메인
├── manifest_parser.py     # manifest.json 파서
├── query_engine.py        # ClickHouse 쿼리 실행
├── requirements.txt
└── config.yml             # DB 연결 정보
```

### requirements.txt

```
mcp
clickhouse-connect
pyyaml
```

### config.yml

```yaml
clickhouse:
  host: localhost
  port: 8123
  database: analytics
  user: default
  password: ""

dbt:
  manifest_path: "/path/to/dbt/project/target/manifest.json"
```

### manifest_parser.py

```python
"""dbt manifest.json에서 메트릭/모델 정보를 추출하는 파서"""

import json
from pathlib import Path


class ManifestParser:
    def __init__(self, manifest_path: str):
        with open(manifest_path) as f:
            self.manifest = json.load(f)

    def get_metrics(self) -> list[dict]:
        """모든 메트릭 목록 반환"""
        metrics = []
        for key, node in self.manifest.get("metrics", {}).items():
            metrics.append({
                "name": node["name"],
                "label": node.get("label", ""),
                "description": node.get("description", ""),
                "type": node.get("type", ""),
                "type_params": node.get("type_params", {}),
            })
        return metrics

    def get_metric(self, name: str) -> dict | None:
        """특정 메트릭의 상세 정보 반환"""
        for key, node in self.manifest.get("metrics", {}).items():
            if node["name"] == name:
                return {
                    "name": node["name"],
                    "label": node.get("label", ""),
                    "description": node.get("description", ""),
                    "type": node.get("type", ""),
                    "type_params": node.get("type_params", {}),
                    "depends_on": node.get("depends_on", {}),
                }
        return None

    def get_models(self) -> list[dict]:
        """모든 모델 목록 반환"""
        models = []
        for key, node in self.manifest.get("nodes", {}).items():
            if node["resource_type"] == "model":
                models.append({
                    "name": node["name"],
                    "description": node.get("description", ""),
                    "schema": node.get("schema", ""),
                    "columns": {
                        col_name: col_info.get("description", "")
                        for col_name, col_info in node.get("columns", {}).items()
                    },
                })
        return models

    def get_model(self, name: str) -> dict | None:
        """특정 모델의 상세 정보 (컬럼, 설명, 의존성)"""
        for key, node in self.manifest.get("nodes", {}).items():
            if node["resource_type"] == "model" and node["name"] == name:
                return {
                    "name": node["name"],
                    "description": node.get("description", ""),
                    "schema": node.get("schema", ""),
                    "database": node.get("database", ""),
                    "columns": {
                        col_name: {
                            "description": col_info.get("description", ""),
                            "data_type": col_info.get("data_type", ""),
                        }
                        for col_name, col_info in node.get("columns", {}).items()
                    },
                    "depends_on": node.get("depends_on", {}).get("nodes", []),
                    "raw_sql": node.get("raw_code", ""),
                }
        return None

    def search(self, keyword: str) -> list[dict]:
        """키워드로 메트릭/모델 검색"""
        results = []
        keyword = keyword.lower()

        for m in self.get_metrics():
            if keyword in m["name"].lower() or keyword in m.get("description", "").lower():
                results.append({"type": "metric", **m})

        for m in self.get_models():
            if keyword in m["name"].lower() or keyword in m.get("description", "").lower():
                results.append({"type": "model", **m})

        return results
```

### query_engine.py

```python
"""ClickHouse 쿼리 실행 엔진"""

import clickhouse_connect
import yaml


class QueryEngine:
    def __init__(self, config_path: str = "config.yml"):
        with open(config_path) as f:
            config = yaml.safe_load(f)["clickhouse"]

        self.client = clickhouse_connect.get_client(
            host=config["host"],
            port=config["port"],
            database=config["database"],
            username=config["user"],
            password=config["password"],
        )

    def execute(self, sql: str, limit: int = 100) -> dict:
        """SQL 실행 후 결과 반환"""
        # 안전장치: SELECT만 허용
        if not sql.strip().upper().startswith("SELECT"):
            return {"error": "SELECT 쿼리만 허용됩니다."}

        # LIMIT 강제 적용
        if "LIMIT" not in sql.upper():
            sql = f"{sql.rstrip(';')} LIMIT {limit}"

        try:
            result = self.client.query(sql)
            return {
                "columns": result.column_names,
                "rows": [list(row) for row in result.result_rows],
                "row_count": len(result.result_rows),
            }
        except Exception as e:
            return {"error": str(e)}
```

### server.py (MCP Server 메인)

```python
"""dbt Semantic Layer MCP Server"""

from mcp.server.fastmcp import FastMCP
from manifest_parser import ManifestParser
from query_engine import QueryEngine
import yaml

# 설정 로드
with open("config.yml") as f:
    config = yaml.safe_load(f)

parser = ManifestParser(config["dbt"]["manifest_path"])
engine = QueryEngine("config.yml")

mcp = FastMCP("dbt-semantic-layer")


@mcp.tool()
def list_metrics() -> list[dict]:
    """사용 가능한 모든 메트릭 목록을 반환합니다.

    각 메트릭의 이름, 설명, 계산 방식을 확인할 수 있습니다.
    """
    return parser.get_metrics()


@mcp.tool()
def get_metric_definition(metric_name: str) -> dict:
    """특정 메트릭의 상세 정의를 반환합니다.

    Args:
        metric_name: 조회할 메트릭 이름 (예: net_revenue, gross_revenue, arpu)
    """
    result = parser.get_metric(metric_name)
    if result is None:
        return {"error": f"메트릭 '{metric_name}'을 찾을 수 없습니다."}
    return result


@mcp.tool()
def get_model_schema(model_name: str) -> dict:
    """dbt 모델의 스키마 정보를 반환합니다.

    테이블 컬럼, 설명, 의존성, 원본 SQL을 포함합니다.

    Args:
        model_name: 조회할 모델 이름 (예: fct_daily_revenue, stg_payments)
    """
    result = parser.get_model(model_name)
    if result is None:
        return {"error": f"모델 '{model_name}'을 찾을 수 없습니다."}
    return result


@mcp.tool()
def search_data(keyword: str) -> list[dict]:
    """키워드로 메트릭과 모델을 검색합니다.

    매출, DAU, 유저 등 비즈니스 용어로 검색하면
    관련 메트릭과 모델을 찾아줍니다.

    Args:
        keyword: 검색 키워드 (예: 매출, revenue, DAU)
    """
    return parser.search(keyword)


@mcp.tool()
def run_query(sql: str) -> dict:
    """ClickHouse에 SELECT 쿼리를 실행합니다.

    안전을 위해 SELECT만 허용되며, LIMIT이 자동 적용됩니다.

    Args:
        sql: 실행할 SELECT 쿼리
    """
    return engine.execute(sql)


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

## Step 3: MCP Server 실행 및 연동

### 실행

```bash
cd dbt-semantic-mcp
pip install -r requirements.txt
python server.py
```

### Claude Code에서 연동

`~/.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "dbt-semantic": {
      "command": "python",
      "args": ["/path/to/dbt-semantic-mcp/server.py"],
      "env": {}
    }
  }
}
```

### 사용 예시

연동 후 LLM에게 이렇게 물어볼 수 있습니다:

```
"지난달 일본 순매출이 얼마야?"
```

LLM의 동작:

```
1. search_data("매출") → net_revenue 메트릭 발견
2. get_metric_definition("net_revenue")
   → "결제액 - 환불 - 수수료, fct_daily_revenue 테이블"
3. get_model_schema("fct_daily_revenue")
   → country_code, revenue_date 컬럼 확인
4. run_query("""
     SELECT SUM(amount - refund_amount - platform_fee) AS net_revenue
     FROM analytics.fct_daily_revenue
     WHERE country_code = 'JP'
       AND revenue_date >= '2026-03-01'
       AND revenue_date < '2026-04-01'
   """)
5. 결과: "지난달 일본 순매출은 1,180만 엔입니다."
```

---

## Step 4: 운영 고려사항

### manifest.json 자동 갱신

dbt run/compile 후 manifest.json이 업데이트되므로, MCP Server가 항상 최신 정의를 참조하도록:

```bash
# Airflow DAG 또는 cron에 추가
dbt compile --project-dir /path/to/dbt
# → target/manifest.json 갱신됨
# → MCP Server 재시작 또는 hot-reload
```

### 보안

```python
# query_engine.py 에 추가할 안전장치들

BLOCKED_KEYWORDS = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE"]

def execute(self, sql: str, limit: int = 100) -> dict:
    sql_upper = sql.strip().upper()

    # SELECT만 허용
    if not sql_upper.startswith("SELECT"):
        return {"error": "SELECT 쿼리만 허용됩니다."}

    # 위험 키워드 차단
    for kw in BLOCKED_KEYWORDS:
        if kw in sql_upper:
            return {"error": f"'{kw}' 키워드는 허용되지 않습니다."}

    # ...
```

### 확장 가능한 Tool 추가 예시

```python
@mcp.tool()
def get_lineage(model_name: str) -> dict:
    """모델의 upstream/downstream 의존성 트리를 반환합니다."""
    # manifest.json의 depends_on 정보를 재귀적으로 추적
    ...

@mcp.tool()
def get_freshness(source_name: str) -> dict:
    """source 테이블의 데이터 신선도를 확인합니다."""
    # dbt source freshness 결과 파싱
    ...

@mcp.tool()
def get_test_results(model_name: str) -> dict:
    """모델의 최근 DQ 테스트 결과를 반환합니다."""
    # target/run_results.json 파싱
    ...
```

---

## dbt Cloud Semantic Layer API vs 자체 MCP 비교

| 항목 | dbt Cloud API | 자체 MCP Server |
|------|:------------:|:---------------:|
| **비용** | $100/인/월 | 무료 (자체 서버) |
| **메트릭 정의 조회** | O | O |
| **SQL 자동 생성** | O (MetricFlow) | LLM이 생성 |
| **BI 도구 네이티브 연동** | O (Tableau, Looker 등) | X (별도 개발 필요) |
| **자연어 쿼리** | X | O (LLM 연동) |
| **커스터마이징** | 제한적 | 자유로움 |
| **유지보수** | dbt Labs 관리 | 자체 관리 |

!!! tip "추천 전략"
    - **시작**: dbt Core + schema.yml/metrics.yml 정의부터 (비용 0원)
    - **다음**: 자체 MCP Server로 LLM 연동 PoC
    - **규모 확장 시**: dbt Cloud 도입 검토 (BI 네이티브 연동이 필요해질 때)

---

[← dbt에서 Semantic Layer까지](09-semantic-layer.md)
