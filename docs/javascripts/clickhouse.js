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
      chAddStep('ch-cluster-client-steps', '<code>shard_key: user_id % 2\n짝수 → Shard 1 / 홀수 → Shard 2</code>', 'info');
      document.getElementById('ch-cluster-shard1-area').innerHTML = chBuildTable('Shard 1 — users_local', ['user_id', 'name'], [], { id: 'ch-cl-s1' });
      document.getElementById('ch-cluster-shard2-area').innerHTML = chBuildTable('Shard 2 — users_local', ['user_id', 'name'], [], { id: 'ch-cl-s2' });
    },
    note: '아직 데이터가 없는 빈 Shard 2개가 준비되어 있습니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">2</span>user_id=1 (alice) → 1%2=1 홀수 → Shard 2', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 1, name: 'alice' });
    },
    note: 'alice(user_id=1)는 홀수이므로 Shard 2로 라우팅됩니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">3</span>user_id=2 (bob) → 2%2=0 짝수 → Shard 1', 'send');
      chAddRowToShard('ch-cl-s1', { user_id: 2, name: 'bob' });
    },
    note: 'bob(user_id=2)는 짝수이므로 Shard 1로 라우팅됩니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">4</span>user_id=3 (charlie) → Shard 2 / user_id=4 (dave) → Shard 1', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 3, name: 'charlie' });
      chAddRowToShard('ch-cl-s1', { user_id: 4, name: 'dave' });
    },
    note: '계속해서 shard key에 따라 자동 분배됩니다',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">5</span>user_id=5 (eve) → Shard 2 / user_id=6 (frank) → Shard 1', 'send');
      chAddRowToShard('ch-cl-s2', { user_id: 5, name: 'eve' });
      chAddRowToShard('ch-cl-s1', { user_id: 6, name: 'frank' });
    },
    note: 'INSERT 완료! Shard 1에 3건(짝수), Shard 2에 3건(홀수). 각 Replica는 자동 동기화됩니다.',
  },
  {
    action: function() {
      chAddStep('ch-cluster-client-steps', '<span class="step-num">6</span>SELECT * FROM users_distributed', 'send');
      chAddStep('ch-cluster-client-steps', '<code>-- Distributed 테이블이 모든 Shard에 동시 조회</code>', 'info');
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
      // Show initial shard data
      document.getElementById('ch-ld-shard1-area').innerHTML = chBuildTable('users_local', ['user_id', 'name'], SHARD1_DATA, { id: 'ch-ld-s1' });
      document.getElementById('ch-ld-shard2-area').innerHTML = chBuildTable('users_local', ['user_id', 'name'], SHARD2_DATA, { id: 'ch-ld-s2' });
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">1</span>현재 클러스터에 6명의 데이터가 샤드별로 분산 저장되어 있습니다', 'info');
    },
    note: 'Shard 1: bob, dave, frank (짝수) / Shard 2: alice, charlie, eve (홀수)',
  },
  {
    action: function() {
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">2</span>SELECT * FROM users_local (Local 테이블 직접 조회)', 'send');
      chAddStep('ch-local-dist-query-steps', '<code>-- 접속한 노드(Shard 1)의 데이터만 보임!</code>', 'warn');
      chDimBox('ch-ld-shard2-box');
      chGlowRows('ch-ld-s1');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 3건만 반환 (Shard 1만)', ['user_id', 'name'], SHARD1_DATA, { id: 'ch-ld-r1' });
      chGlowRows('ch-ld-r1');
    },
    note: 'Local 테이블 조회 → 접속한 샤드의 데이터만 보입니다. 나머지 3건은 누락!',
  },
  {
    action: function() {
      chLightBox('ch-ld-shard2-box');
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">3</span>SELECT * FROM users_distributed (Distributed 테이블 조회)', 'send');
      chGlowRows('ch-ld-s1');
      chGlowRows('ch-ld-s2');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 6건 전체 반환 (모든 Shard)', ['user_id', 'name'], CH_USERS, { id: 'ch-ld-r2' });
      chGlowRows('ch-ld-r2');
    },
    note: 'Distributed 테이블 조회 → 모든 샤드의 데이터가 합쳐져 전체 6건 반환!',
  },
  {
    action: function() {
      chAddStep('ch-local-dist-query-steps', '<span class="step-num">4</span>SELECT * FROM users_view (View FINAL — 중복 제거)', 'send');
      chAddStep('ch-local-dist-query-steps', '<code>-- Distributed + FINAL → 전체 데이터 + 중복 제거</code>', 'receive');
      document.getElementById('ch-ld-result-area').innerHTML = chBuildTable('결과: 6건 (중복 제거 완료)', ['user_id', 'name'], CH_USERS, { id: 'ch-ld-r3' });
      chGlowRows('ch-ld-r3');
    },
    note: 'View (FINAL) = Distributed + 중복 제거. 가장 안전하고 정확한 조회 방법입니다.',
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
   AUTO-INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('ch-cluster')) {
    chClusterReset();
  }
  if (document.getElementById('ch-local-dist')) {
    chLocalDistReset();
  }
});
