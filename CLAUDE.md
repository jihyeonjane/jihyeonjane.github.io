# Jane's Tech Blog — 프로젝트 가이드

## 개요
- **사이트**: https://jihyeonjane.github.io
- **GitHub**: https://github.com/jihyeonjane/jihyeonjane.github.io
- **프레임워크**: MkDocs Material
- **배포**: GitHub Actions → `gh-pages` 브랜치 자동 배포 (main push 시)
- **프로젝트 위치**: `~/bitbucket/jihyeonjane.github.io/`

## 절대 규칙
- **퍼블릭 사이트** — 회사 내부 데이터, URL, DB명, 테이블명, 팀명, 인프라 정보 절대 포함 금지
- 예시 데이터는 반드시 일반적인(generic) 샘플 사용
- Confluence 내용 참고 시 회사 정보 제거 후 재구성

## 콘텐츠 작성 규칙

### 구조
- 각 튜토리얼 챕터는 **이론 → 샘플 코드 → 인터랙티브 데모** 순서로 구성
- 인터랙티브 데모 모아보기 페이지에는 각 명령어의 원본 챕터 링크 포함
- 하위 페이지(참고 자료)는 nav에서 상위 항목 아래에 들여쓰기로 배치

### 언어
- 본문: 한국어
- 코드/명령어: 영어 (SQL, YAML, bash 등)
- UI 라벨: 한국어 (다음 ▶, 처음으로, 등)

## 파일 구조

```
docs/
├── index.md                     # 홈페이지 (콘텐츠 목차)
├── stylesheets/
│   ├── custom.css               # 파스텔 라벤더+핑크 테마
│   ├── terminal.css             # dbt 명령어 터미널 시뮬레이터
│   ├── flow.css                 # Materialization dbt↔DB 데모 + 다이어그램
│   └── ch-anim.css              # ClickHouse 클러스터 다이어그램
├── javascripts/
│   ├── terminal.js              # dbt 명령어 터미널 (dbt run/test/build 등)
│   ├── flow.js                  # Materialization 실행/조회 데모
│   └── clickhouse.js            # ClickHouse 클러스터/MV 데모
├── dbt-tutorial/                # dbt 튜토리얼 섹션
│   ├── index.md
│   ├── 01~09-*.md               # 챕터별 마크다운
│   └── assets/                  # GIF, 이미지 파일
└── (향후 mcp/, airflow/ 등 추가 예정)

overrides/
└── partials/
    └── comments.html            # Giscus 댓글 (다크모드 자동 전환)

mkdocs.yml                       # 사이트 설정, nav 구조, CSS/JS 등록
.github/workflows/deploy.yml     # GitHub Actions 자동 배포
```

## 색상 테마 (Catppuccin Mocha)

인터랙티브 데모에서 사용하는 색상:

| 용도 | 색상 코드 | 변수명 |
|------|-----------|--------|
| 배경 | `#1e1e2e` | BG |
| 서피스 | `#313244` | SURFACE |
| 파랑 (Shard 1, 링크) | `#89b4fa` | BLUE |
| 초록 (성공, Replica) | `#a6e3a1` | GREEN |
| 핑크 (Shard 2) | `#f5c0e8` | PINK |
| 노랑 (경고, 정보) | `#f9e2af` | YELLOW |
| 빨강 (에러) | `#f38ba8` | RED |
| 보라 (Refreshable MV) | `#cba6f7` | PURPLE |
| 흰색 (텍스트) | `#cdd6f4` | WHITE |
| 회색 (보조 텍스트) | `#6c7086` | GRAY |

## 인터랙티브 데모 패턴

### 1. 터미널 시뮬레이터 (terminal.js)
- `dbtCommands` 객체에 명령어별 출력 라인 정의
- `runCommand(cmd, terminalId)` / `clearTerminal(terminalId)`
- CSS 클래스: `.interactive-terminal`, `.terminal-body`, `.t-green`, `.t-red` 등

### 2. 단계별 플로우 데모 (flow.js)
- "다음 ▶" / "◀ 이전" / "처음으로" 버튼으로 단계 진행
- `buildRunSteps(type, demoId)` / `buildQuerySteps(type, demoId)`
- 미니 테이블: `buildTable(name, cols, rows, opts)` → 행 fadein/fadeout 애니메이션
- BI 결과는 `.flow-bi-result` 영역(좌측 BI 패널)에 표시
- 타입 선택: `.flow-type-bar` 버튼으로 view/table/incremental/mv 전환
- CSS 클래스: `.flow-demo`, `.flow-panels`, `.flow-step`, `.mini-table`

### 3. 시나리오 선택형 (clickhouse.js)
- `chShowScenario(type)` — insert/select/failure 등 시나리오 버튼 클릭
- Node 기반 시각화: `.ch-node`, `.node-active`, `.node-dead`, `.node-selected`
- 조합 표시: `.ch-nodes-combo` 영역에 "Node 1 + Node 3 = 완전한 테이블"
- MV 비교: `chMVSelectCase('simple'|'complex')` 케이스 전환

### 4. CSS 자동 애니메이션 (ch-anim.css)
- 현재 사용하지 않음 (Node 기반 인터랙티브로 대체됨)
- 필요 시 `@keyframes` 기반 자동 반복 애니메이션에 활용 가능

## 새 페이지 추가 체크리스트

1. `docs/` 아래에 `.md` 파일 생성
2. `mkdocs.yml`의 `nav`에 항목 추가
3. `docs/index.md` 목차 테이블에 행 추가
4. 해당 섹션 index.md가 있으면 거기도 추가
5. 인터랙티브 데모 추가 시:
   - JS 파일 → `docs/javascripts/` + `mkdocs.yml`의 `extra_javascript`에 등록
   - CSS 파일 → `docs/stylesheets/` + `mkdocs.yml`의 `extra_css`에 등록
6. `mkdocs build`로 빌드 확인 후 commit & push

## 빌드 & 배포

```bash
# 로컬 빌드 확인
cd ~/bitbucket/jihyeonjane.github.io
~/Library/Python/3.9/bin/mkdocs build

# 로컬 미리보기
~/Library/Python/3.9/bin/mkdocs serve

# 배포 (main push → GitHub Actions 자동)
git add -A && git commit -m "메시지" && git push
```

## 향후 확장 계획
- MCP 개념/응용 섹션 (dbt 외 독립 카테고리)
- Airflow 관련 섹션
- ClickHouse 운영 가이드
- 각 분야별 세션에서 작업 후 이 CLAUDE.md 참조하여 스타일 통일
