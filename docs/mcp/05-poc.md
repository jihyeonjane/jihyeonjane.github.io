# 5. PoC: 나만의 MCP 서버

이번 챕터에서는 **SQLite DB를 조회하는 MCP 서버**를 구축합니다.
"자연어로 DB를 조회한다"는 실전 시나리오를 직접 체험합니다.

## 목표

```
사용자: "최근 주문 5건 보여줘"
Claude: → query_orders Tool 호출 → DB 조회 → 결과 반환
        "최근 주문 5건입니다:
         1. #1001 - 노트북 (₩1,200,000)
         2. #1002 - 키보드 (₩89,000)
         ..."
```

## 사전 준비

### 샘플 DB 생성

```python
# setup_db.py — 한 번만 실행
import sqlite3

conn = sqlite3.connect("shop.db")
cur = conn.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT NOT NULL,
        stock INTEGER DEFAULT 0
    )
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
    )
""")

# 샘플 데이터
products = [
    (1, "노트북", 1200000, "전자기기", 15),
    (2, "무선 키보드", 89000, "주변기기", 50),
    (3, "모니터 27인치", 350000, "전자기기", 8),
    (4, "USB-C 허브", 45000, "주변기기", 120),
    (5, "마우스패드", 15000, "주변기기", 200),
]
cur.executemany("INSERT OR IGNORE INTO products VALUES (?,?,?,?,?)", products)

orders = [
    (1001, 1, 1, "2025-01-15", "delivered"),
    (1002, 2, 2, "2025-01-16", "delivered"),
    (1003, 3, 1, "2025-01-17", "shipped"),
    (1004, 4, 3, "2025-01-18", "pending"),
    (1005, 5, 5, "2025-01-19", "pending"),
    (1006, 1, 1, "2025-01-20", "pending"),
]
cur.executemany("INSERT OR IGNORE INTO orders VALUES (?,?,?,?,?)", orders)

conn.commit()
conn.close()
print("shop.db 생성 완료!")
```

```bash
python setup_db.py
```

## 서버 구현

```python
# server.py
import sqlite3
from mcp.server.fastmcp import FastMCP

DB_PATH = "shop.db"

mcp = FastMCP("Shop DB Server")


def get_conn():
    """DB 연결을 반환합니다."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Tools ──────────────────────────────────────

@mcp.tool()
def query_products(category: str = "", min_stock: int = 0) -> str:
    """상품을 조회합니다. 카테고리와 최소 재고로 필터링할 수 있습니다."""
    conn = get_conn()
    query = "SELECT * FROM products WHERE stock >= ?"
    params: list = [min_stock]

    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY name"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    if not rows:
        return "조건에 맞는 상품이 없습니다."

    lines = []
    for r in rows:
        lines.append(
            f"- [{r['id']}] {r['name']} | "
            f"₩{r['price']:,} | "
            f"카테고리: {r['category']} | "
            f"재고: {r['stock']}개"
        )
    return f"상품 목록 ({len(rows)}건):\n" + "\n".join(lines)


@mcp.tool()
def query_orders(limit: int = 5, status: str = "") -> str:
    """최근 주문을 조회합니다. 건수와 상태로 필터링할 수 있습니다."""
    conn = get_conn()
    query = """
        SELECT o.id as order_id, p.name, o.quantity,
               o.order_date, o.status,
               (p.price * o.quantity) as total
        FROM orders o
        JOIN products p ON o.product_id = p.id
    """
    params: list = []

    if status:
        query += " WHERE o.status = ?"
        params.append(status)

    query += " ORDER BY o.order_date DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    if not rows:
        return "조건에 맞는 주문이 없습니다."

    lines = []
    for r in rows:
        lines.append(
            f"- #{r['order_id']} | {r['name']} x{r['quantity']} | "
            f"₩{r['total']:,} | {r['order_date']} | {r['status']}"
        )
    return f"주문 목록 ({len(rows)}건):\n" + "\n".join(lines)


@mcp.tool()
def get_sales_summary() -> str:
    """매출 요약 정보를 반환합니다."""
    conn = get_conn()

    total = conn.execute("""
        SELECT COUNT(*) as cnt,
               SUM(p.price * o.quantity) as revenue
        FROM orders o JOIN products p ON o.product_id = p.id
    """).fetchone()

    by_status = conn.execute("""
        SELECT status, COUNT(*) as cnt
        FROM orders GROUP BY status
    """).fetchall()

    by_category = conn.execute("""
        SELECT p.category,
               COUNT(*) as cnt,
               SUM(p.price * o.quantity) as revenue
        FROM orders o JOIN products p ON o.product_id = p.id
        GROUP BY p.category
    """).fetchall()

    conn.close()

    lines = [
        f"=== 매출 요약 ===",
        f"총 주문: {total['cnt']}건",
        f"총 매출: ₩{total['revenue']:,}",
        "",
        "--- 상태별 ---",
    ]
    for r in by_status:
        lines.append(f"  {r['status']}: {r['cnt']}건")

    lines.append("")
    lines.append("--- 카테고리별 ---")
    for r in by_category:
        lines.append(f"  {r['category']}: {r['cnt']}건 (₩{r['revenue']:,})")

    return "\n".join(lines)


# ── Resources ──────────────────────────────────

@mcp.resource("shop://schema")
def get_schema() -> str:
    """DB 테이블 스키마 정보를 반환합니다."""
    conn = get_conn()
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()

    lines = ["=== Database Schema ===\n"]
    for table in tables:
        name = table["name"]
        cols = conn.execute(f"PRAGMA table_info({name})").fetchall()
        lines.append(f"## {name}")
        for col in cols:
            nullable = "" if col["notnull"] else " (nullable)"
            pk = " [PK]" if col["pk"] else ""
            lines.append(f"  - {col['name']}: {col['type']}{pk}{nullable}")
        lines.append("")

    conn.close()
    return "\n".join(lines)


# ── Prompts ────────────────────────────────────

@mcp.prompt()
def analyze_sales() -> str:
    """매출 데이터를 분석하는 프롬프트를 생성합니다."""
    return """
    매출 데이터를 분석해주세요:
    1. get_sales_summary Tool로 전체 요약을 확인하고
    2. 카테고리별 매출 비중을 분석하고
    3. 주문 상태별 현황을 정리하고
    4. 개선 제안을 해주세요
    """


# ── 실행 ───────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
```

## 프로젝트 구조

```
my-shop-mcp/
├── setup_db.py          # DB 초기화 스크립트
├── server.py            # MCP 서버
├── shop.db              # SQLite DB (setup_db.py 실행 후 생성)
└── pyproject.toml       # 의존성 (mcp[cli])
```

## 테스트

### Step 1 — Inspector에서 확인

```bash
mcp dev server.py
```

Inspector에서 테스트:

```
Tool: query_products
Input: { "category": "전자기기" }
Output:
  상품 목록 (2건):
  - [1] 노트북 | ₩1,200,000 | 카테고리: 전자기기 | 재고: 15개
  - [3] 모니터 27인치 | ₩350,000 | 카테고리: 전자기기 | 재고: 8개
```

```
Tool: query_orders
Input: { "limit": 3, "status": "pending" }
Output:
  주문 목록 (3건):
  - #1006 | 노트북 x1 | ₩1,200,000 | 2025-01-20 | pending
  - #1005 | 마우스패드 x5 | ₩75,000 | 2025-01-19 | pending
  - #1004 | USB-C 허브 x3 | ₩135,000 | 2025-01-18 | pending
```

```
Resource: shop://schema
Output:
  === Database Schema ===
  ## products
    - id: INTEGER [PK]
    - name: TEXT
    ...
```

### Step 2 — Claude Desktop 연동

```json
{
  "mcpServers": {
    "shop-db": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/my-shop-mcp", "server.py"]
    }
  }
}
```

### Step 3 — 자연어로 조회

```
사용자: "재고가 10개 이상인 상품만 보여줘"
Claude: → query_products(min_stock=10) 호출
        "재고 10개 이상 상품 4건입니다: ..."

사용자: "배송 중인 주문이 있어?"
Claude: → query_orders(status="shipped") 호출
        "배송 중인 주문 1건: #1003 모니터 27인치..."

사용자: "전체 매출 현황을 분석해줘"
Claude: → get_sales_summary() 호출 → 분석 결과 정리
```

## 확장 아이디어

PoC를 완성했다면, 다음 단계로 확장해보세요:

| 방향 | 설명 |
|------|------|
| **다른 DB 연결** | SQLite → PostgreSQL, MySQL, ClickHouse 등으로 교체 |
| **쓰기 Tool 추가** | `create_order`, `update_stock` 등 CUD 작업 |
| **인증 추가** | 환경변수로 DB 자격증명 관리 |
| **SSE 전환** | stdio → HTTP 서버로 변경하여 원격 접근 |
| **여러 서버 조합** | DB 서버 + Slack 서버 + 파일 서버를 함께 사용 |

!!! tip "보안 고려사항"
    프로덕션에서는 반드시:

    - **읽기 전용 DB 계정** 사용 (의도치 않은 데이터 변경 방지)
    - **쿼리 결과 제한** (LIMIT 적용, 대량 데이터 반환 방지)
    - **민감 데이터 마스킹** (개인정보 등)
    - Tool 호출 시 **사용자 확인** (Human-in-the-loop)

## 정리

이 튜토리얼에서 다룬 내용:

```
1장. MCP란?          → LLM + 외부 도구 연결의 표준 프로토콜
2장. 아키텍처         → 클라이언트-서버 구조, Tools/Resources/Prompts
3장. 개발 환경 설정    → SDK 설치, Inspector 활용
4장. 첫 번째 서버     → 메모 관리 서버로 기본기 익히기
5장. PoC            → DB 조회 서버로 실전 감각 잡기
```

MCP는 LLM을 **실제 업무 도구**로 만드는 핵심 기술입니다.
이 PoC를 기반으로, 자신의 워크플로우에 맞는 MCP 서버를 만들어보세요!
