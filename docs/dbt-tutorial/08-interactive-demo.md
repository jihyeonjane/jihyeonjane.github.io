# 8. 인터랙티브 데모

모든 dbt 명령어를 한곳에서 체험해보세요.

## dbt 명령어 체험

<div class="interactive-terminal" markdown="0">
  <div class="terminal-header">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">Terminal</span>
  </div>
  <div class="terminal-body" id="term-all">
    <span class="prompt">jane@mac ~/my_project $</span> <span class="cursor">_</span>
  </div>
  <div class="terminal-buttons">
    <button onclick="runCommand('debug', 'term-all')">dbt debug</button>
    <button onclick="runCommand('run', 'term-all')">dbt run</button>
    <button onclick="runCommand('test', 'term-all')">dbt test</button>
    <button onclick="runCommand('build', 'term-all')">dbt build</button>
    <button onclick="runCommand('compile', 'term-all')">dbt compile</button>
    <button onclick="runCommand('docs', 'term-all')">dbt docs generate</button>
    <button onclick="clearTerminal('term-all')" class="btn-clear">Clear</button>
  </div>
</div>

!!! info "사용법"
    위 버튼을 클릭하면 해당 dbt 명령어의 실행 결과가 터미널에 표시됩니다.
    여러 명령어를 순서대로 실행해보세요. **Clear** 버튼으로 초기화할 수 있습니다.

## 각 챕터별 데모 바로가기

각 튜토리얼 챕터 안에서도 해당 내용과 관련된 데모를 직접 체험할 수 있습니다.

| 챕터 | 체험 가능한 명령어 |
|------|-------------------|
| [2. 설치 및 설정](02-setup.md) | `dbt debug` |
| [4. 모델 작성](04-models.md) | `dbt compile`, `dbt run` |
| [5. 테스트와 문서화](05-tests-and-docs.md) | `dbt test`, `dbt docs generate` |
| [6. 실전 팁](06-tips.md) | `dbt build`, `dbt compile` |

## 명령어 요약

| 명령어 | 설명 | 관련 챕터 |
|--------|------|----------|
| `dbt debug` | 연결 상태 및 설정 확인 | [2. 설치 및 설정](02-setup.md#연결-테스트) |
| `dbt run` | 모든 모델 실행 (테이블/뷰 생성) | [4. 모델 작성](04-models.md#주요-dbt-명령어) |
| `dbt test` | 데이터 테스트 실행 | [5. 테스트와 문서화](05-tests-and-docs.md#테스트-실행) |
| `dbt build` | run + test를 의존성 순서대로 실행 | [6. 실전 팁](06-tips.md#개발-워크플로우) |
| `dbt compile` | SQL 렌더링만 수행 (실행 X) | [4. 모델 작성](04-models.md), [6. 실전 팁](06-tips.md#디버깅-팁) |
| `dbt docs generate` | 문서 및 카탈로그 생성 | [5. 테스트와 문서화](05-tests-and-docs.md#문서-사이트-생성) |
