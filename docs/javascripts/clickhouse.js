/* ============================================================
   ClickHouse Architecture Demos — Interactive step-by-step
   ============================================================ */

/* ================================================================
   NODE DIAGRAM — Scenario-based visualization
   ================================================================ */

var chTimers = [];

function chClearTimers() {
  chTimers.forEach(function(t) { clearTimeout(t); });
  chTimers = [];
}

function chResetNodes() {
  chClearTimers();
  ['ch-node1','ch-node2','ch-node3','ch-node4'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'ch-node';
  });
  ['ch-n1-data','ch-n2-data','ch-n3-data','ch-n4-data'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  var dist = document.querySelector('.ch-nodes-dist');
  if (dist) dist.className = 'ch-nodes-dist';
  var combo = document.getElementById('ch-combo-area');
  if (combo) combo.innerHTML = '';
  var text = document.getElementById('ch-scenario-text');
  if (text) text.innerHTML = '';
}

function chSetNodeData(nodeDataId, rows, cls) {
  var el = document.getElementById(nodeDataId);
  if (!el) return;
  rows.forEach(function(r, i) {
    chTimers.push(setTimeout(function() {
      var div = document.createElement('div');
      div.className = 'ch-data-row ' + (cls || '');
      div.textContent = r;
      el.appendChild(div);
    }, i * 200));
  });
}

function chAddExp(text, cls) {
  var el = document.getElementById('ch-scenario-text');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'ch-exp-step ' + (cls || 'exp-info');
  div.innerHTML = text;
  el.appendChild(div);
}

function chSetCombo(html) {
  var el = document.getElementById('ch-combo-area');
  if (el) el.innerHTML = html;
}

function chShowScenario(type) {
  chResetNodes();
  document.querySelectorAll('.ch-scenario-btn').forEach(function(b) { b.classList.remove('ch-sc-active'); });
  var btns = document.querySelectorAll('.ch-scenario-btn');
  var idx = { insert: 0, select: 1, failure: 2 }[type];
  if (btns[idx]) btns[idx].classList.add('ch-sc-active');

  switch(type) {
    case 'insert': chScenarioInsert(); break;
    case 'select': chScenarioSelect(); break;
    case 'failure': chScenarioFailure(); break;
  }
}

/* --- INSERT 분배 --- */
function chScenarioInsert() {
  var even = ['bob (id=2)', 'dave (id=4)', 'frank (id=6)'];
  var odd = ['alice (id=1)', 'charlie (id=3)', 'eve (id=5)'];

  chAddExp('INSERT INTO users_distributed — shard_key: user_id % 2', 'exp-send');

  chTimers.push(setTimeout(function() {
    chAddExp('① alice (id=1) → 1%2=1 홀수 → <strong>Node 3</strong>에 저장', 'exp-info');
    document.getElementById('ch-node3').classList.add('node-active');
    chSetNodeData('ch-n3-data', [odd[0]], 'row-new');
    chTimers.push(setTimeout(function() {
      chAddExp('　 → Node 3의 복제본인 <strong>Node 4</strong>에 자동 sync', 'exp-info');
      document.getElementById('ch-node4').classList.add('node-active');
      chSetNodeData('ch-n4-data', [odd[0]], 'row-sync');
    }, 600));
  }, 600));

  chTimers.push(setTimeout(function() {
    chAddExp('② bob (id=2) → 2%2=0 짝수 → <strong>Node 1</strong>에 저장', 'exp-info');
    document.getElementById('ch-node1').classList.add('node-active');
    chSetNodeData('ch-n1-data', [even[0]], 'row-new');
    chTimers.push(setTimeout(function() {
      chAddExp('　 → Node 1의 복제본인 <strong>Node 2</strong>에 자동 sync', 'exp-info');
      document.getElementById('ch-node2').classList.add('node-active');
      chSetNodeData('ch-n2-data', [even[0]], 'row-sync');
    }, 600));
  }, 2400));

  chTimers.push(setTimeout(function() {
    chAddExp('③ charlie → Node 3, dave → Node 1 (+ 각각 복제본에 sync)', 'exp-info');
    chSetNodeData('ch-n3-data', [odd[1]], 'row-new');
    chSetNodeData('ch-n1-data', [even[1]], 'row-new');
    chTimers.push(setTimeout(function() {
      chSetNodeData('ch-n4-data', [odd[1]], 'row-sync');
      chSetNodeData('ch-n2-data', [even[1]], 'row-sync');
    }, 500));
  }, 4200));

  chTimers.push(setTimeout(function() {
    chAddExp('④ eve → Node 3, frank → Node 1 (+ 각각 복제본에 sync)', 'exp-info');
    chSetNodeData('ch-n3-data', [odd[2]], 'row-new');
    chSetNodeData('ch-n1-data', [even[2]], 'row-new');
    chTimers.push(setTimeout(function() {
      chSetNodeData('ch-n4-data', [odd[2]], 'row-sync');
      chSetNodeData('ch-n2-data', [even[2]], 'row-sync');
    }, 500));
  }, 5600));

  chTimers.push(setTimeout(function() {
    chAddExp('✓ 완료! Node 1 = Node 2 (짝수 복제본) / Node 3 = Node 4 (홀수 복제본)', 'exp-good');
    chAddExp('💡 각 Node는 독립된 물리 서버. 복제본끼리 같은 데이터를 가질 뿐, 물리적으로 묶이진 않음', 'exp-info');
  }, 7000));
}

/* --- Distributed 조회 --- */
function chScenarioSelect() {
  var even = ['bob (id=2)', 'dave (id=4)', 'frank (id=6)'];
  var odd = ['alice (id=1)', 'charlie (id=3)', 'eve (id=5)'];

  chSetNodeData('ch-n1-data', even, '');
  chSetNodeData('ch-n2-data', even, '');
  chSetNodeData('ch-n3-data', odd, '');
  chSetNodeData('ch-n4-data', odd, '');

  chTimers.push(setTimeout(function() {
    chAddExp('SELECT * FROM users_distributed', 'exp-send');
    var dist = document.querySelector('.ch-nodes-dist');
    if (dist) dist.classList.add('dist-active');
  }, 400));

  chTimers.push(setTimeout(function() {
    chAddExp('① 짝수 데이터 담당 Node 중 하나 선택 → <strong>Node 1</strong> 선택', 'exp-info');
    document.getElementById('ch-node1').classList.add('node-selected');
    document.getElementById('ch-node2').classList.add('node-dim');
    document.querySelectorAll('#ch-n1-data .ch-data-row').forEach(function(r) { r.classList.add('row-glow'); });
  }, 1400));

  chTimers.push(setTimeout(function() {
    chAddExp('② 홀수 데이터 담당 Node 중 하나 선택 → <strong>Node 3</strong> 선택', 'exp-info');
    document.getElementById('ch-node3').classList.add('node-selected');
    document.getElementById('ch-node4').classList.add('node-dim');
    document.querySelectorAll('#ch-n3-data .ch-data-row').forEach(function(r) { r.classList.add('row-glow'); });
  }, 2400));

  chTimers.push(setTimeout(function() {
    chSetCombo(
      '<span class="ch-combo-label ch-combo-node">Node 1 (짝수 3건)</span>' +
      '<span class="ch-combo-plus">+</span>' +
      '<span class="ch-combo-label ch-combo-node">Node 3 (홀수 3건)</span>' +
      '<span class="ch-combo-eq">=</span>' +
      '<span class="ch-combo-label ch-combo-result">완전한 테이블 (6건)</span>'
    );
    chAddExp('✓ Node 1 + Node 3 = <strong>완전한 테이블 6건!</strong>', 'exp-good');
  }, 3400));

  chTimers.push(setTimeout(function() {
    chAddExp('💡 Node 2 + Node 3 조합도, Node 1 + Node 4 조합도, Node 2 + Node 4 조합도 모두 완전한 테이블이 됨', 'exp-info');
  }, 4400));
}

/* --- Node 1대 장애 --- */
function chScenarioFailure() {
  var even = ['bob (id=2)', 'dave (id=4)', 'frank (id=6)'];
  var odd = ['alice (id=1)', 'charlie (id=3)', 'eve (id=5)'];

  chSetNodeData('ch-n1-data', even, '');
  chSetNodeData('ch-n2-data', even, '');
  chSetNodeData('ch-n3-data', odd, '');
  chSetNodeData('ch-n4-data', odd, '');

  chTimers.push(setTimeout(function() {
    chAddExp('⚡ Node 1 장애 발생!', 'exp-bad');
    document.getElementById('ch-node1').classList.add('node-dead');
  }, 600));

  chTimers.push(setTimeout(function() {
    chAddExp('SELECT * FROM users_distributed 실행...', 'exp-send');
    var dist = document.querySelector('.ch-nodes-dist');
    if (dist) dist.classList.add('dist-active');
  }, 1600));

  chTimers.push(setTimeout(function() {
    chAddExp('① 짝수 데이터: Node 1 응답 없음 → <strong>Node 2가 대신 응답</strong> (같은 데이터 복제본)', 'exp-info');
    document.getElementById('ch-node2').classList.add('node-selected');
    document.querySelectorAll('#ch-n2-data .ch-data-row').forEach(function(r) { r.classList.add('row-glow'); });
  }, 2600));

  chTimers.push(setTimeout(function() {
    chAddExp('② 홀수 데이터: Node 3 정상 응답', 'exp-info');
    document.getElementById('ch-node3').classList.add('node-selected');
    document.querySelectorAll('#ch-n3-data .ch-data-row').forEach(function(r) { r.classList.add('row-glow'); });
  }, 3400));

  chTimers.push(setTimeout(function() {
    chSetCombo(
      '<span class="ch-combo-label ch-combo-node">Node 2 (짝수 3건)</span>' +
      '<span class="ch-combo-plus">+</span>' +
      '<span class="ch-combo-label ch-combo-node">Node 3 (홀수 3건)</span>' +
      '<span class="ch-combo-eq">=</span>' +
      '<span class="ch-combo-label ch-combo-result">완전한 테이블 (6건)</span>'
    );
    chAddExp('✓ <strong>6건 전체 정상 반환!</strong> — Node 1이 죽어도 복제본 Node 2가 같은 데이터를 가지고 있으므로 문제 없음', 'exp-good');
  }, 4400));

  chTimers.push(setTimeout(function() {
    chAddExp('💡 Node 1 복구 후 자동으로 데이터 sync. 사용자는 장애를 느끼지 못함', 'exp-info');
  }, 5400));
}

// Init on load
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('ch-scenario-text')) {
    chShowScenario('insert');
  }
});

/* ---------- shared helpers ---------- */
function chBuildTable(name, cols, rows, opts) {
  opts = opts || {};
  const id = opts.id || '';
  let html = '<div class="mini-table-wrap">';
  if (name) html += '<div class="table-name">' + name + '</div>';
  html += '<table class="mini-table"' + (id ? ' id="' + id + '"' : '') + '>';
  html += '<thead><tr>' + cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead>';
  html += '<tbody>';
  if (rows.length === 0) {
    html += '<tr><td colspan="' + cols.length + '" class="empty-msg">(데이터 없음)</td></tr>';
  } else {
    rows.forEach(function(r, i) {
      var cls = opts.rowClass ? ' class="' + opts.rowClass + '"' : '';
      html += '<tr' + cls + ' data-idx="' + i + '">' + cols.map(function(c) { return '<td>' + (r[c] != null ? r[c] : '') + '</td>'; }).join('') + '</tr>';
    });
  }
  html += '</tbody></table></div>';
  return html;
}

function chSleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

function chAddStep(containerId, text, cls) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'flow-step ' + (cls || 'send');
  div.innerHTML = text;
  el.appendChild(div);
  requestAnimationFrame(function() { requestAnimationFrame(function() { div.classList.add('visible'); }); });
}

function chGlowRows(tableId) {
  var tbl = document.getElementById(tableId);
  if (!tbl) return;
  tbl.querySelectorAll('tbody tr').forEach(function(r) { r.classList.add('row-insert-glow'); });
}

function chDimBox(boxId) {
  var box = document.getElementById(boxId);
  if (box) box.style.opacity = '0.35';
}

function chLightBox(boxId) {
  var box = document.getElementById(boxId);
  if (box) box.style.opacity = '1';
}

/* ---------- sample data ---------- */
var CH_USERS = [
  { user_id: 1, name: 'alice' },
  { user_id: 2, name: 'bob' },
  { user_id: 3, name: 'charlie' },
  { user_id: 4, name: 'dave' },
  { user_id: 5, name: 'eve' },
  { user_id: 6, name: 'frank' },
];

var SHARD1_DATA = CH_USERS.filter(function(u) { return u.user_id % 2 === 0; }); // even: bob(2), dave(4), frank(6)
var SHARD2_DATA = CH_USERS.filter(function(u) { return u.user_id % 2 !== 0; }); // odd: alice(1), charlie(3), eve(5)


/* ================================================================
   DEMO 1: Cluster (INSERT + SELECT via Distributed)
   ================================================================ */
var chClusterState = { step: -1, playing: false };

function chAddRowToShard(shardTblId, row) {
  var tbl = document.getElementById(shardTblId);
  if (!tbl) return;
  var tbody = tbl.querySelector('tbody');
  var empty = tbody.querySelector('.empty-msg');
  if (empty) empty.closest('tr').remove();
  var tr = document.createElement('tr');
  tr.className = 'row-fadein';
  tr.innerHTML = '<td>' + row.user_id + '</td><td>' + row.name + '</td>';
  tbody.appendChild(tr);
}

var chClusterSteps = [
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">1</span>INSERT INTO users — 6명의 데이터를 넣습니다', 'send');
      chAddStep('ch-cluster-client-steps', '<code>shard_key: user_id % 2\n짝수 → Node 1,2 (Shard 1) / 홀수 → Node 3,4 (Shard 2)</code>', 'info');
      document.getElementById('ch-cluster-shard1-area').innerHTML = chBuildTable('Node 1 — users_local (Shard 1)', ['user_id', 'name'], [], { id: 'ch-cl-s1' });
      document.getElementById('ch-cluster-shard2-area').innerHTML = chBuildTable('Node 3 — users_local (Shard 2)', ['user_id', 'name'], [], { id: 'ch-cl-s2' });
    },
    note: '아직 데이터가 없는 빈 Node들이 준비되어 있습니다. 복제본(Node 2, 4)은 자동 sync됩니다.',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">2</span>user_id=1 (alice) → 1%2=1 홀수 → Node 3 (Shard 2)', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 1, name: 'alice' });
    },
    note: 'alice(user_id=1)는 홀수이므로 Node 3(Shard 2)으로 라우팅. Node 4(Replica B)에 자동 복제됩니다.',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">3</span>user_id=2 (bob) → 2%2=0 짝수 → Node 1 (Shard 1)', 'send');
      chAddRowToShard('ch-cl-s1', { user_id: 2, name: 'bob' });
    },
    note: 'bob(user_id=2)는 짝수이므로 Node 1(Shard 1)으로 라우팅. Node 2(Replica B)에 자동 복제됩니다.',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">4</span>charlie → Node 3 (Shard 2) / dave → Node 1 (Shard 1)', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 3, name: 'charlie' });
      chAddRowToShard('ch-cl-s1', { user_id: 4, name: 'dave' });
    },
    note: '계속해서 shard key에 따라 자동 분배됩니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">5</span>eve → Node 3 (Shard 2) / frank → Node 1 (Shard 1)', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 5, name: 'eve' });
      chAddRowToShard('ch-cl-s1', { user_id: 6, name: 'frank' });
    },
    note: 'INSERT 완료! Node 1,2(Shard 1)에 짝수 3건, Node 3,4(Shard 2)에 홀수 3건. 같은 Shard의 Replica끼리 자동 동기화.',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">6</span>SELECT * FROM users_distributed', 'send');
      chAddStep('ch-cluster-client-steps', '<code>-- Distributed: 각 Shard에서 Node 하나씩 선택하여 조회</code>', 'info');
      chGlowRows('ch-cl-s1');
      chGlowRows('ch-cl-s2');
    },
    note: 'Distributed 테이블에 쿼리하면 Shard 1, Shard 2 모두에 동시에 요청을 보냅니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">7</span>모든 Shard 결과를 합쳐서 6건 반환!', 'receive');
      document.getElementById('ch-cluster-result-area').innerHTML = chBuildTable('쿼리 결과 (전체 6건)', ['user_id', 'name'], CH_USERS, { id: 'ch-cl-result' });
      chGlowRows('ch-cl-result');
    },
    note: 'Distributed 테이블 덕분에 클라이언트는 샤딩을 의식하지 않고 전체 데이터를 조회할 수 있습니다',
  },
];

function chClusterNext() {
  if (chClusterState.playing) return;
  var nextIdx = chClusterState.step + 1;
  if (nextIdx >= chClusterSteps.length) return;
  chClusterState.playing = true;
  chClusterState.step = nextIdx;
  var s = chClusterSteps[nextIdx];
  s.action();
  var noteEl = document.getElementById('ch-cluster-note');
  if (noteEl && s.note) { noteEl.textContent = s.note; noteEl.classList.add('visible'); }
  chClusterUpdateUI();
  setTimeout(function() { chClusterState.playing = false; }, 400);
}

function chClusterPrev() {
  if (chClusterState.playing) return;
  if (chClusterState.step < 0) return;
  var target = chClusterState.step - 1;
  chClusterReset();
  for (var i = 0; i <= target; i++) {
    chClusterState.step = i;
    chClusterSteps[i].action();
    var noteEl = document.getElementById('ch-cluster-note');
    if (noteEl && chClusterSteps[i].note) { noteEl.textContent = chClusterSteps[i].note; noteEl.classList.add('visible'); }
  }
  chClusterUpdateUI();
}

function chClusterReset() {
  chClusterState.step = -1;
  chClusterState.playing = false;
  document.getElementById('ch-cluster-client-steps').innerHTML = '';
  document.getElementById('ch-cluster-shard1-area').innerHTML = '';
  document.getElementById('ch-cluster-shard2-area').innerHTML = '';
  document.getElementById('ch-cluster-result-area').innerHTML = '';
  var noteEl = document.getElementById('ch-cluster-note');
  if (noteEl) { noteEl.textContent = ''; noteEl.classList.remove('visible'); }
  chClusterUpdateUI();
}

function chClusterUpdateUI() {
  var counter = document.getElementById('ch-cluster-counter');
  if (counter) {
    var cur = chClusterState.step + 1;
    counter.textContent = cur > 0 ? 'Step ' + cur + ' / ' + chClusterSteps.length : '0 / ' + chClusterSteps.length;
  }
  var container = document.getElementById('ch-cluster');
  if (container) {
    var btnNext = container.querySelector('.btn-next');
    var btnPrev = container.querySelector('.btn-prev');
    if (btnNext) btnNext.disabled = chClusterState.step >= chClusterSteps.length - 1;
    if (btnPrev) btnPrev.disabled = chClusterState.step < 0;
  }
}


/* ================================================================
   DEMO 2: Local vs Distributed query
   ================================================================ */
var chLDState = { step: -1, playing: false };

var chLDSteps = [
  {
    action: function() {
      document.getElementById('ch-ld-shard1-area').innerHTML = chBuildTable('users_local', ['user_id', 'name'], SHARD1_DATA, { id: 'ch-ld-s1' });
      document.getElementById('ch-ld-shard2-area').innerHTML = chBuildTable('users_local', ['user_id', 'name'], SHARD2_DATA, { id: 'ch-ld-s2' });
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">1</span>현재 4개 Node에 6명의 데이터가 분산 저장되어 있습니다', 'info');
    },
    note: 'Node 1,2 (Shard 1): bob, dave, frank / Node 3,4 (Shard 2): alice, charlie, eve',
  },
  {
    action: function() {
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">2</span>SELECT * FROM users_local (Local 테이블 직접 조회)', 'send');
      chAddStep('ch-local-dist-query-steps', '<code>-- 접속한 Node 1의 데이터만 보임!</code>', 'warn');
      chDimBox('ch-ld-shard2-box');
      chGlowRows('ch-ld-s1');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 3건만 반환 (Node 1만)', ['user_id', 'name'], SHARD1_DATA, { id: 'ch-ld-r1' });
      chGlowRows('ch-ld-r1');
    },
    note: 'Local 테이블 조회 → 접속한 Node의 데이터만 보입니다. 나머지 Node의 3건은 누락!',
  },
  {
    action: function() {
      chLightBox('ch-ld-shard2-box');
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">3</span>SELECT * FROM users_distributed (Distributed 테이블 조회)', 'send');
      chAddStep('ch-local-dist-query-steps', '<code>-- 각 Shard에서 Node 하나씩 선택 → 합산</code>', 'info');
      chGlowRows('ch-ld-s1');
      chGlowRows('ch-ld-s2');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 6건 전체 반환 (Node 1 + Node 3 조합)', ['user_id', 'name'], CH_USERS, { id: 'ch-ld-r2' });
      chGlowRows('ch-ld-r2');
    },
    note: 'Distributed: 각 Shard에서 Node 하나씩 골라 합침 → 완전한 테이블 6건!',
  },
  {
    action: function() {
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">4</span>SELECT * FROM users_view (View FINAL)', 'send');
      chAddStep('ch-local-dist-query-steps', '<code>-- Distributed + FINAL → 전체 데이터 + 중복 제거\n-- CREATE VIEW users_view AS\n--   SELECT * FROM users_distributed FINAL</code>', 'receive');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 6건 (중복 제거 완료)', ['user_id', 'name'], CH_USERS, { id: 'ch-ld-r3' });
      chGlowRows('ch-ld-r3');
    },
    note: 'View (FINAL) = Distributed + 중복 제거. dbt에서 source로 쓰기에 가장 안전한 방법.',
  },
];

function chLocalDistNext() {
  if (chLDState.playing) return;
  var nextIdx = chLDState.step + 1;
  if (nextIdx >= chLDSteps.length) return;
  chLDState.playing = true;
  chLDState.step = nextIdx;
  var s = chLDSteps[nextIdx];
  s.action();
  var noteEl = document.getElementById('ch-local-dist-note');
  if (noteEl && s.note) { noteEl.textContent = s.note; noteEl.classList.add('visible'); }
  chLocalDistUpdateUI();
  setTimeout(function() { chLDState.playing = false; }, 400);
}

function chLocalDistPrev() {
  if (chLDState.playing) return;
  if (chLDState.step < 0) return;
  var target = chLDState.step - 1;
  chLocalDistReset();
  for (var i = 0; i <= target; i++) {
    chLDState.step = i;
    chLDSteps[i].action();
    var noteEl = document.getElementById('ch-local-dist-note');
    if (noteEl && chLDSteps[i].note) { noteEl.textContent = chLDSteps[i].note; noteEl.classList.add('visible'); }
  }
  chLocalDistUpdateUI();
}

function chLocalDistReset() {
  chLDState.step = -1;
  chLDState.playing = false;
  document.getElementById('ch-local-dist-query-steps').innerHTML = '';
  document.getElementById('ch-ld-shard1-area').innerHTML = '';
  document.getElementById('ch-ld-shard2-area').innerHTML = '';
  document.getElementById('ch-ld-result-area').innerHTML = '';
  chLightBox('ch-ld-shard1-box');
  chLightBox('ch-ld-shard2-box');
  var noteEl = document.getElementById('ch-local-dist-note');
  if (noteEl) { noteEl.textContent = ''; noteEl.classList.remove('visible'); }
  chLocalDistUpdateUI();
}

function chLocalDistUpdateUI() {
  var counter = document.getElementById('ch-local-dist-counter');
  if (counter) {
    var cur = chLDState.step + 1;
    counter.textContent = cur > 0 ? 'Step ' + cur + ' / ' + chLDSteps.length : '0 / ' + chLDSteps.length;
  }
  var container = document.getElementById('ch-local-dist');
  if (container) {
    var btnNext = container.querySelector('.btn-next');
    var btnPrev = container.querySelector('.btn-prev');
    if (btnNext) btnNext.disabled = chLDState.step >= chLDSteps.length - 1;
    if (btnPrev) btnPrev.disabled = chLDState.step < 0;
  }
}


/* ================================================================
   DEMO 3: Incremental MV vs Refreshable MV (Case-based)
   ================================================================ */
var chMVState = { step: -1, playing: false, caseType: 'simple' };

/* --- Case 1: 단순 집계 (실시간 DAU) --- */
var chMVStepsSimple = [
  {
    action: function() {
      document.getElementById('ch-mv-source-label').textContent = 'Source: events_local';
      document.getElementById('ch-mv-source2-area').style.display = 'none';
      document.getElementById('ch-mv-source-area').innerHTML =
        chBuildTable('events_local', ['event_date', 'user_id', 'action'], [
          { event_date: '04-01', user_id: 'u1', action: 'click' },
          { event_date: '04-01', user_id: 'u2', action: 'view' },
        ], { id: 'ch-mv-src' });
      document.getElementById('ch-mv-inc-area').innerHTML =
        chBuildTable('mv_daily_dau (Incremental)', ['event_date', 'dau'], [
          { event_date: '04-01', dau: 2 },
        ], { id: 'ch-mv-inc' });
      document.getElementById('ch-mv-ref-area').innerHTML =
        chBuildTable('mv_daily_dau (Refreshable)', ['event_date', 'dau'], [
          { event_date: '04-01', dau: 2 },
        ], { id: 'ch-mv-ref' });
    },
    note: '초기 상태: source에 4/1 데이터 2건 (user u1, u2). 두 MV 모두 DAU=2를 표시합니다.',
  },
  {
    action: function() {
      var src = document.getElementById('ch-mv-src');
      if (src) {
        var tbody = src.querySelector('tbody');
        [
          { event_date: '04-02', user_id: 'u1', action: 'click' },
          { event_date: '04-02', user_id: 'u3', action: 'signup' },
          { event_date: '04-02', user_id: 'u1', action: 'view' },
        ].forEach(function(r, i) {
          setTimeout(function() {
            var tr = document.createElement('tr');
            tr.className = 'row-fadein';
            tr.innerHTML = '<td>' + r.event_date + '</td><td>' + r.user_id + '</td><td>' + r.action + '</td>';
            tbody.appendChild(tr);
          }, i * 200);
        });
      }
    },
    note: 'INSERT: 4/2 데이터 3건 도착 (u1 2번, u3 1번 → unique user 2명). 두 MV가 어떻게 반응할까요?',
  },
  {
    action: function() {
      var inc = document.getElementById('ch-mv-inc');
      if (inc) {
        var tbody = inc.querySelector('tbody');
        var tr = document.createElement('tr');
        tr.className = 'row-fadein';
        tr.innerHTML = '<td>04-02</td><td>2</td>';
        tbody.appendChild(tr);
      }
    },
    note: '⚡ Incremental MV: INSERT 즉시 트리거! 새 배치만 집계 → {04-02, dau: 2} 행 추가. 실시간 반영!',
  },
  {
    action: function() {
      var ref = document.getElementById('ch-mv-ref');
      if (ref) ref.style.opacity = '0.5';
    },
    note: '⏳ Refreshable MV: 아직 변화 없음! 다음 스케줄 시간(예: 매 정시)까지 기다려야 합니다.',
  },
  {
    action: function() {
      var src = document.getElementById('ch-mv-src');
      if (src) {
        var tbody = src.querySelector('tbody');
        var tr = document.createElement('tr');
        tr.className = 'row-fadein';
        tr.innerHTML = '<td>04-02</td><td>u4</td><td>view</td>';
        tbody.appendChild(tr);
      }
    },
    note: 'INSERT: 4/2에 u4 추가 도착! 이제 4/2 unique user는 u1, u3, u4 = 3명.',
  },
  {
    action: function() {
      var inc = document.getElementById('ch-mv-inc');
      if (inc) {
        var tbody = inc.querySelector('tbody');
        var tr = document.createElement('tr');
        tr.className = 'row-fadein';
        tr.innerHTML = '<td>04-02</td><td>1</td>';
        tbody.appendChild(tr);
      }
    },
    note: '⚡ Incremental MV: 즉시 반응 → 새 배치 {04-02, dau: 1} 추가. 배치 단위라 이전 행과 별도 (나중에 merge).',
  },
  {
    action: function() {
      var refArea = document.getElementById('ch-mv-ref-area');
      if (refArea) {
        refArea.innerHTML = chBuildTable('mv_daily_dau (전체 재계산)', ['event_date', 'dau'], [
          { event_date: '04-01', dau: 2 },
          { event_date: '04-02', dau: 3 },
        ], { id: 'ch-mv-ref2', rowClass: 'row-fadein' });
      }
    },
    note: '🔄 Refreshable MV: 스케줄 도달 → 전체 재계산! 4/2의 모든 데이터를 한번에 집계해서 정확한 dau=3 표시.',
  },
  {
    action: function() {},
    note: '✅ 결론: 단순 실시간 집계에는 Incremental MV가 적합! INSERT마다 즉시 반영되고 스케줄링이 필요 없습니다.',
  },
];

/* --- Case 2: 복잡한 JOIN 연산 (유저별 매출 리포트) --- */
var chMVStepsComplex = [
  {
    action: function() {
      document.getElementById('ch-mv-source-label').textContent = 'Source Tables (2개)';
      document.getElementById('ch-mv-source2-area').style.display = 'block';
      document.getElementById('ch-mv-source-area').innerHTML =
        chBuildTable('orders_local', ['order_id', 'user_id', 'amount'], [
          { order_id: 1, user_id: 'u1', amount: 10000 },
          { order_id: 2, user_id: 'u2', amount: 25000 },
          { order_id: 3, user_id: 'u1', amount: 15000 },
        ], { id: 'ch-mv-src' });
      document.getElementById('ch-mv-source2-area').innerHTML =
        chBuildTable('users_local', ['user_id', 'name'], [
          { user_id: 'u1', name: 'alice' },
          { user_id: 'u2', name: 'bob' },
          { user_id: 'u3', name: 'charlie' },
        ], { id: 'ch-mv-src2' });
      document.getElementById('ch-mv-inc-area').innerHTML = '';
      document.getElementById('ch-mv-ref-area').innerHTML = '';
    },
    note: '두 개의 source 테이블: orders_local (주문 데이터)과 users_local (유저 정보). 이 둘을 JOIN해야 유저별 매출 리포트를 만들 수 있습니다.',
  },
  {
    action: function() {
      document.getElementById('ch-mv-inc-area').innerHTML =
        '<div style="padding:8px;font-size:11px;color:#6c7086;background:#181825;border-radius:6px;margin-bottom:8px;">' +
        '<code style="color:#89b4fa;font-size:10px;">CREATE MATERIALIZED VIEW mv_user_sales<br>' +
        'AS SELECT u.name, sum(o.amount)<br>' +
        'FROM orders_local o<br>' +
        '<span style="color:#f38ba8;">JOIN users_local u ON o.user_id = u.user_id</span><br>' +
        'GROUP BY u.name</code></div>';
    },
    note: '이 리포트는 orders와 users를 JOIN해야 합니다. Incremental MV로 가능할까요?',
  },
  {
    action: function() {
      document.getElementById('ch-mv-inc-area').innerHTML =
        '<div style="padding:10px;background:#f38ba822;border:1px solid #f38ba8;border-radius:6px;margin-bottom:8px;">' +
        '<div style="color:#f38ba8;font-weight:bold;font-size:12px;">❌ JOIN 불가!</div>' +
        '<div style="color:#f38ba8;font-size:11px;margin-top:4px;">Incremental MV는 source 1개만 가능합니다.<br>JOIN, Window 함수 사용 불가!</div>' +
        '<div style="color:#6c7086;font-size:10px;margin-top:6px;">→ INSERT 이벤트는 한 테이블에서만 발생하므로,<br>　 다른 테이블과 JOIN할 수 없습니다.</div>' +
        '</div>';
    },
    note: '❌ Incremental MV: JOIN 불가! INSERT 시 트리거되는 배치 단위 처리이므로, 다른 테이블 참조가 불가능합니다.',
  },
  {
    action: function() {
      document.getElementById('ch-mv-ref-area').innerHTML =
        '<div style="padding:8px;font-size:11px;color:#6c7086;background:#181825;border-radius:6px;margin-bottom:8px;">' +
        '<code style="color:#a6e3a1;font-size:10px;">CREATE MATERIALIZED VIEW mv_user_sales<br>' +
        '<span style="color:#cba6f7;">REFRESH EVERY 1 HOUR</span><br>' +
        'AS SELECT u.name, sum(o.amount) as total<br>' +
        'FROM orders_distributed o<br>' +
        '<span style="color:#a6e3a1;">JOIN users_distributed u ON o.user_id = u.user_id</span><br>' +
        'GROUP BY u.name</code></div>';
    },
    note: '✅ Refreshable MV: JOIN 가능! 전체 재계산 방식이므로 여러 테이블을 자유롭게 JOIN할 수 있습니다.',
  },
  {
    action: function() {
      document.getElementById('ch-mv-ref-area').innerHTML =
        '<div style="padding:8px;font-size:11px;color:#6c7086;background:#181825;border-radius:6px;margin-bottom:4px;">' +
        '<code style="color:#a6e3a1;font-size:10px;">REFRESH EVERY 1 HOUR — JOIN 실행 완료!</code></div>' +
        chBuildTable('mv_user_sales (Refreshable)', ['user_name', 'total_amount'], [
          { user_name: 'alice', total_amount: '25,000' },
          { user_name: 'bob', total_amount: '25,000' },
        ], { id: 'ch-mv-ref-join', rowClass: 'row-fadein' });
    },
    note: '🔄 Refreshable MV: 스케줄 실행 → orders JOIN users 결과 완성! alice: 10000+15000=25000, bob: 25000.',
  },
  {
    action: function() {
      var src = document.getElementById('ch-mv-src');
      if (src) {
        var tbody = src.querySelector('tbody');
        var tr = document.createElement('tr');
        tr.className = 'row-fadein';
        tr.innerHTML = '<td>4</td><td>u3</td><td>30000</td>';
        tbody.appendChild(tr);
      }
    },
    note: 'INSERT: 새 주문 추가 (u3, charlie, 30000). Incremental MV는 여전히 처리 불가, Refreshable MV는 다음 스케줄에 반영.',
  },
  {
    action: function() {
      document.getElementById('ch-mv-ref-area').innerHTML =
        '<div style="padding:8px;font-size:11px;color:#6c7086;background:#181825;border-radius:6px;margin-bottom:4px;">' +
        '<code style="color:#a6e3a1;font-size:10px;">REFRESH — 전체 재계산 (새 주문 포함)</code></div>' +
        chBuildTable('mv_user_sales (재계산 완료)', ['user_name', 'total_amount'], [
          { user_name: 'alice', total_amount: '25,000' },
          { user_name: 'bob', total_amount: '25,000' },
          { user_name: 'charlie', total_amount: '30,000' },
        ], { id: 'ch-mv-ref-join2', rowClass: 'row-fadein' });
    },
    note: '🔄 Refreshable MV: 재계산 완료! charlie의 주문도 JOIN되어 반영됨.',
  },
  {
    action: function() {},
    note: '✅ 결론: JOIN이 필요한 복잡한 변환에는 Refreshable MV 또는 dbt incremental 모델을 사용하세요. Incremental MV는 source 1개 + 단순 집계 전용!',
  },
];

/* Active steps reference */
var chMVSteps = chMVStepsSimple;

function chMVSelectCase(caseType) {
  chMVState.caseType = caseType;

  // Update active button
  var btns = document.querySelectorAll('#ch-mv-compare .mat-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  btns.forEach(function(b) {
    if (b.getAttribute('data-type') === caseType) b.classList.add('active');
  });

  // Update case description
  var descEl = document.getElementById('ch-mv-case-desc');
  if (descEl) {
    if (caseType === 'simple') {
      descEl.innerHTML = '📊 <strong>단순 집계 (실시간 DAU)</strong> — Source 1개, count distinct 집계. Incremental MV가 적합한 케이스.';
    } else {
      descEl.innerHTML = '📋 <strong>복잡한 JOIN 연산 (유저별 매출 리포트)</strong> — Source 2개 (orders + users), JOIN 필요. Refreshable MV가 적합한 케이스.';
    }
  }

  // Load appropriate steps
  if (caseType === 'simple') {
    chMVSteps = chMVStepsSimple;
  } else {
    chMVSteps = chMVStepsComplex;
  }

  // Reset and update UI
  chMVReset();
}

function chMVNext() {
  if (chMVState.playing) return;
  var nextIdx = chMVState.step + 1;
  if (nextIdx >= chMVSteps.length) return;
  chMVState.playing = true;
  chMVState.step = nextIdx;
  chMVSteps[nextIdx].action();
  var noteEl = document.getElementById('ch-mv-note');
  if (noteEl && chMVSteps[nextIdx].note) { noteEl.textContent = chMVSteps[nextIdx].note; noteEl.classList.add('visible'); }
  chMVUpdateUI();
  setTimeout(function() { chMVState.playing = false; }, 400);
}

function chMVPrev() {
  if (chMVState.playing) return;
  if (chMVState.step < 0) return;
  var target = chMVState.step - 1;
  chMVReset();
  for (var i = 0; i <= target; i++) {
    chMVState.step = i;
    chMVSteps[i].action();
    var noteEl = document.getElementById('ch-mv-note');
    if (noteEl && chMVSteps[i].note) { noteEl.textContent = chMVSteps[i].note; noteEl.classList.add('visible'); }
  }
  chMVUpdateUI();
}

function chMVReset() {
  chMVState.step = -1;
  chMVState.playing = false;
  document.getElementById('ch-mv-source-area').innerHTML = '';
  document.getElementById('ch-mv-source2-area').innerHTML = '';
  document.getElementById('ch-mv-source2-area').style.display = 'none';
  document.getElementById('ch-mv-inc-area').innerHTML = '';
  document.getElementById('ch-mv-ref-area').innerHTML = '';
  var noteEl = document.getElementById('ch-mv-note');
  if (noteEl) { noteEl.textContent = ''; noteEl.classList.remove('visible'); }
  chMVUpdateUI();
}

function chMVUpdateUI() {
  var counter = document.getElementById('ch-mv-counter');
  if (counter) {
    var cur = chMVState.step + 1;
    counter.textContent = cur > 0 ? 'Step ' + cur + ' / ' + chMVSteps.length : '0 / ' + chMVSteps.length;
  }
  var container = document.getElementById('ch-mv-compare');
  if (container) {
    var btnNext = container.querySelector('.btn-next');
    var btnPrev = container.querySelector('.btn-prev');
    if (btnNext) btnNext.disabled = chMVState.step >= chMVSteps.length - 1;
    if (btnPrev) btnPrev.disabled = chMVState.step < 0;
  }
}


/* ================================================================
   AUTO-INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('ch-cluster')) {
    chClusterReset();
  }
  if (document.getElementById('ch-local-dist')) {
    chLocalDistReset();
  }
  if (document.getElementById('ch-mv-compare')) {
    chMVSelectCase('simple');
  }
});
