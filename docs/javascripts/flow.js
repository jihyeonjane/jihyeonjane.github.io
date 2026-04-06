/* ============================================================
   Materialization Flow — Step-by-step with visual mini-tables
   ============================================================ */

/* ---------- source SQL per type ---------- */
const SOURCE_SQL = {
  view: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='view'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, <span class="fn">count</span>(*) <span class="kw">AS</span> event_count
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> user_id`,

  table: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='table'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, <span class="fn">count</span>(*) <span class="kw">AS</span> event_count
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> user_id`,

  incremental: `<span class="kw">{{</span> <span class="fn">config</span>(
    <span class="str">materialized='incremental'</span>,
    <span class="str">unique_key='event_date'</span>
) <span class="kw">}}</span>

<span class="kw">SELECT</span> user_id, event_date, <span class="fn">count</span>(*) <span class="kw">AS</span> cnt
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">{%</span> <span class="kw">if</span> <span class="fn">is_incremental</span>() <span class="kw">%}</span>
  <span class="kw">WHERE</span> event_date >= current_date - 1
<span class="kw">{%</span> <span class="kw">endif</span> <span class="kw">%}</span>
<span class="kw">GROUP BY</span> user_id, event_date`,

  mv: `<span class="kw">{{</span> <span class="fn">config</span>(<span class="str">materialized='materialized_view'</span>) <span class="kw">}}</span>

<span class="kw">SELECT</span> event_date,
       <span class="fn">count</span>(<span class="kw">DISTINCT</span> user_id) <span class="kw">AS</span> dau
<span class="kw">FROM</span> <span class="kw">{{</span> <span class="fn">source</span>(<span class="str">'raw'</span>, <span class="str">'events'</span>) <span class="kw">}}</span>
<span class="kw">GROUP BY</span> event_date`,
};

/* ---------- sample data ---------- */
const SAMPLE = {
  source: [
    { event_id: 101, user_id: 'u1', event_type: 'click',  event_date: '2026-03-30' },
    { event_id: 102, user_id: 'u2', event_type: 'view',   event_date: '2026-03-30' },
    { event_id: 103, user_id: 'u1', event_type: 'click',  event_date: '2026-03-31' },
    { event_id: 104, user_id: 'u3', event_type: 'signup', event_date: '2026-03-31' },
    { event_id: 105, user_id: 'u2', event_type: 'click',  event_date: '2026-04-01' },
  ],
  result: [
    { user_id: 'u1', event_count: 2 },
    { user_id: 'u2', event_count: 2 },
    { user_id: 'u3', event_count: 1 },
  ],
  resultIncOld: [
    { user_id: 'u1', event_date: '2026-03-30', cnt: 1 },
    { user_id: 'u2', event_date: '2026-03-30', cnt: 1 },
    { user_id: 'u1', event_date: '2026-03-31', cnt: 1 },
    { user_id: 'u3', event_date: '2026-03-31', cnt: 1 },
  ],
  resultIncNew: [
    { user_id: 'u2', event_date: '2026-04-01', cnt: 1 },
  ],
  resultMV: [
    { event_date: '2026-03-30', dau: 2 },
    { event_date: '2026-03-31', dau: 2 },
  ],
  resultMVNew: [
    { event_date: '2026-04-01', dau: 1 },
  ],
};

/* ---------- helper: build HTML for a mini-table ---------- */
function buildTable(name, cols, rows, opts) {
  opts = opts || {};
  const id = opts.id || '';
  let html = `<div class="mini-table-wrap">`;
  if (name) html += `<div class="table-name">${name}</div>`;
  html += `<table class="mini-table"${id ? ` id="${id}"` : ''}>`;
  html += `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  html += `<tbody>`;
  if (rows.length === 0) {
    html += `<tr><td colspan="${cols.length}" class="empty-msg">(데이터 없음)</td></tr>`;
  } else {
    rows.forEach((r, i) => {
      const cls = opts.rowClass ? ` class="${opts.rowClass}"` : '';
      const dataIdx = ` data-idx="${i}"`;
      html += `<tr${cls}${dataIdx}>${cols.map(c => `<td>${r[c] != null ? r[c] : ''}</td>`).join('')}</tr>`;
    });
  }
  html += `</tbody></table></div>`;
  return html;
}

/* ---------- helper: animate rows ---------- */
function animateRows(tableId, cls, indices, delay) {
  return new Promise(resolve => {
    const tbl = document.getElementById(tableId);
    if (!tbl) { resolve(); return; }
    const rows = tbl.querySelectorAll('tbody tr');
    let d = 0;
    indices.forEach(idx => {
      if (rows[idx]) {
        setTimeout(() => rows[idx].classList.add(cls), d);
        d += delay || 120;
      }
    });
    setTimeout(resolve, d + 400);
  });
}

function addRowsToTable(tableId, cols, newRows, cls) {
  return new Promise(resolve => {
    const tbl = document.getElementById(tableId);
    if (!tbl) { resolve(); return; }
    const tbody = tbl.querySelector('tbody');
    // remove empty-msg row if present
    const emptyRow = tbody.querySelector('.empty-msg');
    if (emptyRow) emptyRow.closest('tr').remove();
    let d = 0;
    newRows.forEach(r => {
      setTimeout(() => {
        const tr = document.createElement('tr');
        tr.className = cls || 'row-fadein';
        tr.innerHTML = cols.map(c => `<td>${r[c] != null ? r[c] : ''}</td>`).join('');
        tbody.appendChild(tr);
      }, d);
      d += 200;
    });
    setTimeout(resolve, d + 400);
  });
}

function removeRowsByIndices(tableId, indices) {
  return new Promise(resolve => {
    const tbl = document.getElementById(tableId);
    if (!tbl) { resolve(); return; }
    const rows = tbl.querySelectorAll('tbody tr');
    let d = 0;
    indices.forEach(idx => {
      if (rows[idx]) {
        setTimeout(() => rows[idx].classList.add('row-fadeout'), d);
        d += 150;
      }
    });
    setTimeout(() => {
      // actually remove
      indices.sort((a, b) => b - a).forEach(idx => {
        if (rows[idx]) rows[idx].remove();
      });
      resolve();
    }, d + 500);
  });
}

function clearTable(tableId, cols) {
  const tbl = document.getElementById(tableId);
  if (!tbl) return;
  const tbody = tbl.querySelector('tbody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(r => r.classList.add('row-fadeout'));
  setTimeout(() => {
    tbody.innerHTML = `<tr><td colspan="${cols}" class="empty-msg">(데이터 없음)</td></tr>`;
  }, 500);
}

function scanRows(tableId) {
  return new Promise(resolve => {
    const tbl = document.getElementById(tableId);
    if (!tbl) { resolve(); return; }
    const rows = tbl.querySelectorAll('tbody tr');
    let d = 0;
    rows.forEach(r => {
      setTimeout(() => r.classList.add('row-scan'), d);
      d += 200;
    });
    setTimeout(resolve, d + 600);
  });
}

/* ================================================================
   FLOW DEFINITIONS — run demos
   ================================================================ */
function buildRunSteps(type, demoId) {
  const tblId = demoId + '-tbl';
  const tmpId = demoId + '-tmp';

  const flows = {
    view: [
      {
        dbt: { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링' },
        db: null,
        tableAction: null,
      },
      {
        dbt: { num: 2, cls: 'send', text: 'CREATE VIEW 문 생성 후 DB로 전송' },
        db: { num: 3, cls: 'receive', text: 'VIEW 등록 (SQL 정의만 저장)', code: 'CREATE VIEW analytics.event_count AS\nSELECT user_id, count(*) AS event_count\nFROM raw.events\nGROUP BY user_id' },
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: '<div class="mini-table-wrap"><div class="table-name">analytics.event_count (VIEW)</div><table class="mini-table" id="' + tblId + '"><thead><tr><th colspan="2" style="text-align:center;color:#6c7086;font-style:italic;">SQL 정의만 저장됨 — 데이터 행 없음</th></tr></thead><tbody><tr><td class="empty-msg">SELECT user_id, count(*) ... FROM raw.events</td></tr></tbody></table></div>' },
      },
      {
        dbt: { num: 4, cls: 'info', text: '완료! 데이터 저장 없이 SQL 정의만 등록됨' },
        db: null,
        tableAction: null,
        note: '조회할 때마다 원천 테이블을 다시 계산합니다',
      },
    ],
    table: [
      {
        dbt: { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링' },
        db: null,
        tableAction: null,
      },
      {
        dbt: { num: 2, cls: 'send', text: 'DROP TABLE 명령 전송' },
        db: { num: 3, cls: 'receive', text: '기존 테이블 삭제', code: 'DROP TABLE IF EXISTS analytics.event_count' },
        tableAction: { type: 'clear', target: tblId, cols: 2 },
      },
      {
        dbt: { num: 4, cls: 'send', text: 'CREATE TABLE AS SELECT 전송' },
        db: { num: 5, cls: 'receive', text: '전체 데이터 계산 + 테이블 생성', code: 'CREATE TABLE analytics.event_count AS\nSELECT user_id, count(*) AS event_count\nFROM raw.events\nGROUP BY user_id' },
        tableAction: null,
      },
      {
        dbt: null,
        db: { num: 6, cls: 'receive', text: '3 rows inserted' },
        tableAction: { type: 'addRows', target: tblId, cols: ['user_id', 'event_count'], rows: SAMPLE.result },
      },
      {
        dbt: { num: 7, cls: 'info', text: '완료! 전체 데이터가 물리 테이블로 저장됨' },
        db: null,
        tableAction: null,
        note: '매 실행마다 전체 재계산 → 기존 데이터 덮어씀',
      },
    ],
    incremental: [
      {
        dbt: { num: 1, cls: 'send', text: '테이블 존재 여부 확인' },
        db: null,
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('analytics.daily_events (기존 데이터)', ['user_id', 'event_date', 'cnt'], SAMPLE.resultIncOld, { id: tblId }) },
      },
      {
        dbt: { num: 2, cls: 'info', text: 'is_incremental() = true → WHERE 조건 활성화' },
        db: null,
        tableAction: null,
      },
      {
        dbt: { num: 3, cls: 'send', text: '임시 테이블에 새 데이터만 계산하도록 전송' },
        db: { num: 4, cls: 'receive', text: '새 데이터 → 임시 테이블에 저장', code: 'CREATE TABLE analytics.daily_events__dbt_tmp AS\nSELECT user_id, event_date, count(*) AS cnt\nFROM raw.events\nWHERE event_date >= \'2026-04-01\'\nGROUP BY user_id, event_date' },
        tableAction: { type: 'showTmp', target: tmpId + '-wrap', html: '' },
      },
      {
        dbt: { num: 5, cls: 'send', text: '기존 데이터 중 겹치는 키 삭제 명령' },
        db: { num: 6, cls: 'receive', text: '해당 날짜 기존 행 삭제', code: 'DELETE FROM analytics.daily_events\nWHERE event_date IN (\n  SELECT DISTINCT event_date\n  FROM analytics.daily_events__dbt_tmp\n)' },
        tableAction: { type: 'deleteNote', target: tblId, text: '(겹치는 행 없음 — 삭제 대상 0건)' },
      },
      {
        dbt: { num: 7, cls: 'send', text: '임시 테이블 → 본 테이블로 INSERT' },
        db: { num: 8, cls: 'receive', text: '1 row inserted' },
        tableAction: { type: 'addRows', target: tblId, cols: ['user_id', 'event_date', 'cnt'], rows: SAMPLE.resultIncNew },
      },
      {
        dbt: { num: 9, cls: 'send', text: '임시 테이블 정리' },
        db: { num: 10, cls: 'receive', text: '임시 테이블 삭제', code: 'DROP TABLE analytics.daily_events__dbt_tmp' },
        tableAction: { type: 'hideTmp', target: tmpId + '-wrap' },
      },
      {
        dbt: { num: 11, cls: 'info', text: '완료! 새 데이터만 처리하여 기존 테이블에 병합' },
        db: null,
        tableAction: null,
        note: '새 데이터만 처리 → 대용량 테이블에 효율적',
      },
    ],
    mv: [
      {
        dbt: { num: 1, cls: 'send', text: 'SQL 파일 읽고 Jinja 렌더링' },
        db: null,
        tableAction: null,
      },
      {
        dbt: { num: 2, cls: 'send', text: 'CREATE MATERIALIZED VIEW 전송' },
        db: { num: 3, cls: 'receive', text: 'MV 오브젝트 생성 (INSERT 트리거 등록)', code: 'CREATE MATERIALIZED VIEW analytics.dau\nENGINE = AggregatingMergeTree()\nORDER BY event_date\nAS SELECT event_date,\n   count(DISTINCT user_id) AS dau\nFROM raw.events\nGROUP BY event_date' },
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('analytics.dau (Materialized View)', ['event_date', 'dau'], SAMPLE.resultMV, { id: tblId }) },
      },
      {
        dbt: { num: 4, cls: 'info', text: '완료! 이후부터 DB가 자동으로 갱신' },
        db: null,
        tableAction: null,
      },
      {
        dbt: null,
        db: { num: 5, cls: 'receive', text: 'source에 새 INSERT 발생 → MV 자동 트리거!' },
        tableAction: { type: 'addRows', target: tblId, cols: ['event_date', 'dau'], rows: SAMPLE.resultMVNew },
        note: 'dbt run은 최초 1회만. 이후는 DB가 알아서 갱신',
      },
    ],
  };
  return flows[type] || [];
}

/* ================================================================
   FLOW DEFINITIONS — query demos
   ================================================================ */
function buildQuerySteps(type, demoId) {
  const tblId = demoId + '-tbl';

  const flows = {
    view: [
      {
        dbt: { num: 1, cls: 'send', text: 'BI 도구 → SELECT * FROM analytics.event_count' },
        db: null,
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('raw.events (원천 테이블)', ['event_id', 'user_id', 'event_type', 'event_date'], SAMPLE.source, { id: tblId }) },
      },
      {
        dbt: null,
        db: { num: 2, cls: 'receive', text: 'VIEW이므로 원천 테이블에서 SQL 실행 시작' },
        tableAction: { type: 'scan', target: tblId },
      },
      {
        dbt: null,
        db: { num: 3, cls: 'receive', text: '전체 스캔 + GROUP BY 집계 계산 중...' },
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('쿼리 결과 (매번 계산)', ['user_id', 'event_count'], SAMPLE.result, { id: tblId }) },
      },
      {
        dbt: { num: 4, cls: 'warn', text: '결과 수신 완료' },
        db: null,
        tableAction: null,
        note: '매번 원천 데이터를 다시 계산 → 데이터가 많으면 느림',
      },
    ],
    table: [
      {
        dbt: { num: 1, cls: 'send', text: 'BI 도구 → SELECT * FROM analytics.event_count' },
        db: null,
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('analytics.event_count (물리 테이블)', ['user_id', 'event_count'], SAMPLE.result, { id: tblId }) },
      },
      {
        dbt: null,
        db: { num: 2, cls: 'receive', text: '물리 테이블에서 바로 읽기 (계산 불필요)' },
        tableAction: { type: 'glow', target: tblId },
      },
      {
        dbt: { num: 3, cls: 'info', text: '결과 즉시 반환!' },
        db: null,
        tableAction: null,
        note: '이미 계산된 결과를 바로 반환 → 빠름',
      },
    ],
    incremental: [
      {
        dbt: { num: 1, cls: 'send', text: 'BI 도구 → SELECT * FROM analytics.daily_events' },
        db: null,
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('analytics.daily_events (물리 테이블)', ['user_id', 'event_date', 'cnt'], SAMPLE.resultIncOld.concat(SAMPLE.resultIncNew), { id: tblId }) },
      },
      {
        dbt: null,
        db: { num: 2, cls: 'receive', text: '물리 테이블에서 바로 읽기 (일반 TABLE과 동일)' },
        tableAction: { type: 'glow', target: tblId },
      },
      {
        dbt: { num: 3, cls: 'info', text: '결과 즉시 반환!' },
        db: null,
        tableAction: null,
        note: 'incremental도 결국 물리 테이블 → 조회 성능은 table과 동일',
      },
    ],
    mv: [
      {
        dbt: { num: 1, cls: 'send', text: 'BI 도구 → SELECT * FROM analytics.dau' },
        db: null,
        tableAction: { type: 'setHtml', target: tblId + '-wrap', html: buildTable('analytics.dau (Materialized View)', ['event_date', 'dau'], SAMPLE.resultMV.concat(SAMPLE.resultMVNew), { id: tblId }) },
      },
      {
        dbt: null,
        db: { num: 2, cls: 'receive', text: '자동 갱신된 물리 테이블에서 바로 읽기' },
        tableAction: { type: 'glow', target: tblId },
      },
      {
        dbt: { num: 3, cls: 'info', text: '결과 즉시 반환!' },
        db: null,
        tableAction: null,
        note: '실시간 갱신된 결과를 바로 반환',
      },
    ],
  };
  return flows[type] || [];
}

/* ================================================================
   DEMO STATE
   ================================================================ */
const demoState = {};

function getDemoState(id) {
  if (!demoState[id]) {
    demoState[id] = { type: 'view', mode: 'run', currentStep: -1, steps: [], playing: false };
  }
  return demoState[id];
}

/* ================================================================
   INITIALIZATION
   ================================================================ */
function initFlowDemo(id, mode) {
  const state = getDemoState(id);
  state.mode = mode;
  state.type = 'view';
  state.currentStep = -1;
  state.playing = false;

  const container = document.getElementById(id);
  if (!container) return;

  // set first type button active
  container.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
  const first = container.querySelector('[data-type="view"]');
  if (first) first.classList.add('active');

  loadFlow(id);
}

function selectFlowType(id, type) {
  const state = getDemoState(id);
  state.type = type;
  state.currentStep = -1;
  state.playing = false;

  const container = document.getElementById(id);
  container.querySelectorAll('.mat-btn').forEach(b => b.classList.remove('active'));
  container.querySelector(`[data-type="${type}"]`).classList.add('active');

  loadFlow(id);
}

function loadFlow(id) {
  const state = getDemoState(id);
  const container = document.getElementById(id);
  if (!container) return;

  // Build steps
  if (state.mode === 'run') {
    state.steps = buildRunSteps(state.type, id);
  } else {
    state.steps = buildQuerySteps(state.type, id);
  }
  state.currentStep = -1;

  // Update source SQL
  const sourceCode = container.querySelector('.flow-source-code');
  if (sourceCode && SOURCE_SQL[state.type]) {
    sourceCode.innerHTML = SOURCE_SQL[state.type];
  }

  // Clear panels
  const dbtPanel = container.querySelector('.flow-panel-dbt .flow-steps');
  const dbPanel = container.querySelector('.flow-panel-db .flow-steps');
  if (dbtPanel) dbtPanel.innerHTML = '';
  if (dbPanel) dbPanel.innerHTML = '';

  // Clear table area
  const tblWrap = container.querySelector('.flow-table-area');
  if (tblWrap) {
    tblWrap.id = id + '-tbl-wrap';
    tblWrap.innerHTML = '';
  }

  // Clear tmp area
  const tmpWrap = container.querySelector('.flow-tmp-area');
  if (tmpWrap) {
    tmpWrap.id = id + '-tmp-wrap';
    tmpWrap.innerHTML = '';
  }

  // Update counter + note
  updateCounter(id);
  const noteEl = container.querySelector('.flow-note');
  if (noteEl) { noteEl.textContent = ''; noteEl.classList.remove('visible'); }

  // Update button states
  updateButtons(id);
}

function updateCounter(id) {
  const state = getDemoState(id);
  const container = document.getElementById(id);
  if (!container) return;
  const counter = container.querySelector('.flow-step-counter');
  if (!counter) return;
  const current = state.currentStep + 1;
  const total = state.steps.length;
  counter.textContent = current > 0 ? `Step ${current} / ${total}` : `0 / ${total}`;
}

/* ================================================================
   STEP ADVANCE
   ================================================================ */
async function nextStep(id) {
  const state = getDemoState(id);
  if (state.playing) return;

  const nextIdx = state.currentStep + 1;
  if (nextIdx >= state.steps.length) return;

  state.playing = true;
  state.currentStep = nextIdx;
  const step = state.steps[nextIdx];
  const container = document.getElementById(id);

  // Render dbt step
  if (step.dbt) {
    const panel = container.querySelector('.flow-panel-dbt .flow-steps');
    const div = document.createElement('div');
    div.className = `flow-step ${step.dbt.cls}`;
    div.innerHTML = `<span class="step-num">${step.dbt.num}</span>${step.dbt.text}`;
    panel.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
  }

  // Render db step
  if (step.db) {
    const panel = container.querySelector('.flow-panel-db .flow-steps');
    const div = document.createElement('div');
    div.className = `flow-step ${step.db.cls}`;
    let html = `<span class="step-num">${step.db.num}</span>${step.db.text}`;
    if (step.db.code) html += `<code>${step.db.code}</code>`;
    div.innerHTML = html;
    panel.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
  }

  // Table actions
  if (step.tableAction) {
    await executeTableAction(step.tableAction, id);
  } else {
    await sleep(300);
  }

  // Note
  if (step.note) {
    const noteEl = container.querySelector('.flow-note');
    if (noteEl) {
      noteEl.textContent = step.note;
      noteEl.classList.add('visible');
    }
  }

  // Update button states
  updateButtons(id);
  updateCounter(id);
  state.playing = false;
}

function prevStep(id) {
  const state = getDemoState(id);
  if (state.playing) return;
  if (state.currentStep < 0) return;

  // Easiest reliable way: go back to step N-1 by replaying from start
  const targetStep = state.currentStep - 1;
  loadFlow(id);

  if (targetStep >= 0) {
    // Replay steps synchronously (instant, no animation)
    const container = document.getElementById(id);
    for (let i = 0; i <= targetStep; i++) {
      const step = state.steps[i];
      state.currentStep = i;

      if (step.dbt) {
        const panel = container.querySelector('.flow-panel-dbt .flow-steps');
        const div = document.createElement('div');
        div.className = `flow-step ${step.dbt.cls} visible`;
        div.innerHTML = `<span class="step-num">${step.dbt.num}</span>${step.dbt.text}`;
        panel.appendChild(div);
      }
      if (step.db) {
        const panel = container.querySelector('.flow-panel-db .flow-steps');
        const div = document.createElement('div');
        div.className = `flow-step ${step.db.cls} visible`;
        let html = `<span class="step-num">${step.db.num}</span>${step.db.text}`;
        if (step.db.code) html += `<code>${step.db.code}</code>`;
        div.innerHTML = html;
        panel.appendChild(div);
      }
      if (step.tableAction) {
        executeTableActionSync(step.tableAction, id);
      }
      if (step.note) {
        const noteEl = container.querySelector('.flow-note');
        if (noteEl) { noteEl.textContent = step.note; noteEl.classList.add('visible'); }
      }
    }
    updateButtons(id);
    updateCounter(id);
  }
}

function executeTableActionSync(action, demoId) {
  switch (action.type) {
    case 'setHtml': {
      const wrap = document.getElementById(action.target);
      if (wrap) wrap.innerHTML = action.html;
      break;
    }
    case 'clear': {
      const tbl = document.getElementById(action.target);
      if (tbl) {
        const tbody = tbl.querySelector('tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="${action.cols}" class="empty-msg">(데이터 없음)</td></tr>`;
      }
      break;
    }
    case 'addRows': {
      const tbl = document.getElementById(action.target);
      if (tbl) {
        const tbody = tbl.querySelector('tbody');
        const emptyRow = tbody.querySelector('.empty-msg');
        if (emptyRow) emptyRow.closest('tr').remove();
        action.rows.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = action.cols.map(c => `<td>${r[c] != null ? r[c] : ''}</td>`).join('');
          tbody.appendChild(tr);
        });
      }
      break;
    }
    case 'showTmp': {
      const wrap = document.getElementById(action.target);
      if (wrap) {
        const tmpTblId = demoId + '-tmp';
        wrap.innerHTML = buildTable('__dbt_tmp (임시 테이블)', ['user_id', 'event_date', 'cnt'], SAMPLE.resultIncNew, { id: tmpTblId });
      }
      break;
    }
    case 'hideTmp': {
      const wrap = document.getElementById(action.target);
      if (wrap) wrap.innerHTML = '';
      break;
    }
    case 'glow':
    case 'scan':
    case 'deleteRows':
    case 'deleteNote':
    default:
      break;
  }
}

function updateButtons(id) {
  const state = getDemoState(id);
  const container = document.getElementById(id);
  if (!container) return;

  const btnNext = container.querySelector('.btn-next');
  const btnPrev = container.querySelector('.btn-prev');
  if (btnNext) btnNext.disabled = state.currentStep >= state.steps.length - 1;
  if (btnPrev) btnPrev.disabled = state.currentStep < 0;
}

async function executeTableAction(action, demoId) {
  switch (action.type) {
    case 'setHtml': {
      const wrap = document.getElementById(action.target);
      if (wrap) wrap.innerHTML = action.html;
      await sleep(300);
      break;
    }
    case 'clear': {
      clearTable(action.target, action.cols);
      await sleep(600);
      break;
    }
    case 'addRows': {
      await addRowsToTable(action.target, action.cols, action.rows, 'row-fadein');
      break;
    }
    case 'scan': {
      await scanRows(action.target);
      break;
    }
    case 'glow': {
      const tbl = document.getElementById(action.target);
      if (tbl) {
        tbl.querySelectorAll('tbody tr').forEach(r => r.classList.add('row-insert-glow'));
      }
      await sleep(600);
      break;
    }
    case 'deleteRows': {
      await removeRowsByIndices(action.target, action.indices);
      break;
    }
    case 'showTmp': {
      const wrap = document.getElementById(action.target);
      if (wrap) {
        const tmpTblId = demoId + '-tmp';
        wrap.innerHTML = buildTable('__dbt_tmp (임시 테이블)', ['user_id', 'event_date', 'cnt'], SAMPLE.resultIncNew, { id: tmpTblId });
      }
      await sleep(400);
      break;
    }
    case 'hideTmp': {
      const wrap = document.getElementById(action.target);
      if (wrap) wrap.innerHTML = '';
      await sleep(300);
      break;
    }
    case 'deleteNote': {
      // No rows to actually delete in this scenario
      await sleep(300);
      break;
    }
    default:
      await sleep(200);
  }
}

function resetFlow(id) {
  loadFlow(id);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ================================================================
   AUTO-INIT on DOMContentLoaded
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.flow-demo[data-mode="run"]').forEach(el => {
    initFlowDemo(el.id, 'run');
  });
  document.querySelectorAll('.flow-demo[data-mode="query"]').forEach(el => {
    initFlowDemo(el.id, 'query');
  });
});
