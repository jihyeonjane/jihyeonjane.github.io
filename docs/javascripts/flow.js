const matFlows = {
  view: {
    source: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='view'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, <span class="fn">count</span>(*) <span class="kw">AS</span> event_count
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> user_id`,
    dbt: [
      { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링', delay: 0 },
      { num: 2, cls: 'send', text: 'source() → 실제 테이블명으로 변환', delay: 800 },
      { num: 3, cls: 'send', text: 'CREATE VIEW 문 생성 후 DB로 전송', delay: 800 },
      { num: 5, cls: 'info', text: '완료! 데이터 저장 없음, SQL 정의만 등록됨', delay: 1200 },
    ],
    db: [
      { num: 4, cls: 'receive', text: 'VIEW 생성 (데이터 저장 X)', delay: 2800,
        code: 'CREATE VIEW my_schema.event_count AS\nSELECT user_id, count(*) AS event_count\nFROM raw.events\nGROUP BY user_id' },
    ],
    note: '조회할 때마다 원천 테이블을 다시 계산합니다',
  },
  table: {
    source: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='table'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, <span class="fn">count</span>(*) <span class="kw">AS</span> event_count
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> user_id`,
    dbt: [
      { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링', delay: 0 },
      { num: 2, cls: 'send', text: '기존 테이블 DROP 명령 전송', delay: 800 },
      { num: 4, cls: 'send', text: 'CREATE TABLE AS SELECT 전송', delay: 1800 },
      { num: 7, cls: 'info', text: '완료! 전체 데이터가 물리 테이블로 저장됨', delay: 3600 },
    ],
    db: [
      { num: 3, cls: 'receive', text: '기존 테이블 삭제', delay: 1400,
        code: 'DROP TABLE IF EXISTS my_schema.event_count' },
      { num: 5, cls: 'receive', text: '전체 데이터 계산 + 테이블 생성', delay: 2800,
        code: 'CREATE TABLE my_schema.event_count\nENGINE = MergeTree()\nORDER BY user_id\nAS\nSELECT user_id, count(*) AS event_count\nFROM raw.events\nGROUP BY user_id' },
      { num: 6, cls: 'receive', text: '✓ 1,234,567 rows inserted', delay: 3200 },
    ],
    note: '매 실행마다 전체 재계산 → 기존 데이터 덮어씀',
  },
  incremental: {
    source: `<span class="kw">{{</span> <span class="fn">config</span>(
    <span class="str">materialized='incremental'</span>,
    <span class="str">unique_key='event_date'</span>
) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, event_date, <span class="fn">count</span>(*) <span class="kw">AS</span> cnt
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">{%</span> <span class="kw">if</span> <span class="fn">is_incremental</span>() <span class="kw">%}</span>
  <span class="kw">WHERE</span> event_date >= current_date - 1
<span class="kw">{%</span> <span class="kw">endif</span> <span class="kw">%}</span>
<span class="kw">GROUP BY</span> user_id, event_date`,
    dbt: [
      { num: 1, cls: 'send', text: '테이블 존재 여부 확인', delay: 0 },
      { num: 2, cls: 'info', text: 'is_incremental() = true → WHERE 조건 활성화', delay: 600 },
      { num: 3, cls: 'send', text: '임시 테이블에 새 데이터만 계산하도록 전송', delay: 800 },
      { num: 5, cls: 'send', text: '기존 데이터 중 겹치는 키 삭제 명령', delay: 2200 },
      { num: 7, cls: 'send', text: '임시 테이블 → 본 테이블로 INSERT', delay: 3200 },
      { num: 9, cls: 'send', text: '임시 테이블 정리', delay: 4200 },
      { num: 11, cls: 'info', text: '완료! 새 데이터만 처리하여 기존 테이블에 병합', delay: 5000 },
    ],
    db: [
      { num: 4, cls: 'receive', text: '새 데이터만 임시 테이블에 저장', delay: 1600,
        code: 'CREATE TABLE my_schema.model__dbt_tmp AS\nSELECT user_id, event_date, count(*)\nFROM raw.events\nWHERE event_date >= current_date - 1\nGROUP BY user_id, event_date' },
      { num: 6, cls: 'receive', text: '기존 데이터에서 해당 날짜 삭제', delay: 2800,
        code: 'ALTER TABLE my_schema.model\nDELETE WHERE event_date IN (\n  SELECT DISTINCT event_date\n  FROM my_schema.model__dbt_tmp\n)' },
      { num: 8, cls: 'receive', text: '새 데이터 INSERT', delay: 3800,
        code: 'INSERT INTO my_schema.model\nSELECT * FROM my_schema.model__dbt_tmp\n-- ✓ 45,230 rows inserted' },
      { num: 10, cls: 'receive', text: '임시 테이블 삭제', delay: 4600,
        code: 'DROP TABLE my_schema.model__dbt_tmp' },
    ],
    note: '새 데이터만 처리 → 대용량 테이블에 효율적',
  },
  mv: {
    source: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='materialized_view'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> event_date,
       <span class="fn">count</span>(<span class="kw">DISTINCT</span> user_id) <span class="kw">AS</span> dau
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> event_date`,
    dbt: [
      { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링', delay: 0 },
      { num: 2, cls: 'send', text: 'CREATE MATERIALIZED VIEW 전송', delay: 800 },
      { num: 4, cls: 'info', text: '완료! 이후부터 DB가 자동으로 갱신', delay: 2200 },
    ],
    db: [
      { num: 3, cls: 'receive', text: 'MV 오브젝트 생성 (INSERT 트리거 등록)', delay: 1600,
        code: 'CREATE MATERIALIZED VIEW my_schema.dau\nENGINE = AggregatingMergeTree()\nORDER BY event_date\nAS SELECT event_date,\n  uniqState(user_id) AS dau\nFROM raw.events\nGROUP BY event_date' },
      { num: 5, cls: 'receive', text: '⚡ source에 INSERT 발생 시 자동 트리거!', delay: 3000,
        code: '-- raw.events에 새 데이터 INSERT 시\n-- → MV가 자동으로 실행되어 결과 갱신\n-- → Airflow/dbt run 불필요!' },
    ],
    note: 'dbt run은 최초 1회만. 이후는 DB가 알아서 갱신',
  },
};

const flowRunning = {};

function resetFlow(id) {
  const container = document.getElementById(id);
  container.querySelectorAll('.flow-step').forEach(el => {
    el.classList.remove('visible');
  });
  const status = container.querySelector('.flow-status');
  if (status) status.textContent = '';
  flowRunning[id] = false;
}

function selectMatType(id, type) {
  resetFlow(id);
  const container = document.getElementById(id);
  const flow = matFlows[type];

  // Update active button
  container.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
  container.querySelector(`[data-type="${type}"]`).classList.add('active');

  // Update source code
  container.querySelector('.flow-source code').innerHTML = flow.source;

  // Clear panels
  const dbtPanel = container.querySelector('.flow-panel-dbt .flow-steps');
  const dbPanel = container.querySelector('.flow-panel-db .flow-steps');
  dbtPanel.innerHTML = '';
  dbPanel.innerHTML = '';

  // Build steps
  flow.dbt.forEach(s => {
    const div = document.createElement('div');
    div.className = `flow-step ${s.cls}`;
    div.setAttribute('data-delay', s.delay);
    div.innerHTML = `<span class="step-num">${s.num}</span>${s.text}`;
    dbtPanel.appendChild(div);
  });

  flow.db.forEach(s => {
    const div = document.createElement('div');
    div.className = `flow-step ${s.cls}`;
    div.setAttribute('data-delay', s.delay);
    let html = `<span class="step-num">${s.num}</span>${s.text}`;
    if (s.code) html += `<code>${s.code}</code>`;
    div.innerHTML = html;
    dbPanel.appendChild(div);
  });

  // Store note
  container.setAttribute('data-note', flow.note);
}

async function playFlow(id) {
  if (flowRunning[id]) return;
  flowRunning[id] = true;

  const container = document.getElementById(id);
  const status = container.querySelector('.flow-status');
  const allSteps = container.querySelectorAll('.flow-step');

  // Reset visibility
  allSteps.forEach(el => el.classList.remove('visible'));
  if (status) status.textContent = '▶ 실행 중...';

  // Collect and sort by delay
  const steps = Array.from(allSteps).map(el => ({
    el,
    delay: parseInt(el.getAttribute('data-delay'))
  })).sort((a, b) => a.delay - b.delay);

  let lastDelay = 0;
  for (const step of steps) {
    if (!flowRunning[id]) break;
    const wait = step.delay - lastDelay;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    step.el.classList.add('visible');
    lastDelay = step.delay;
  }

  await new Promise(r => setTimeout(r, 600));
  const note = container.getAttribute('data-note');
  if (status && flowRunning[id]) status.textContent = `✓ ${note}`;
  flowRunning[id] = false;
}

// Initialize all flow demos on page load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.flow-demo').forEach(demo => {
    const id = demo.id;
    if (id) selectMatType(id, 'view');
  });
});
