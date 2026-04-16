/* ============================================================
   Kubernetes Tutorial — Interactive Demos
   ============================================================ */

/* ================================================================
   1. KUBECTL TERMINAL SIMULATOR
   ================================================================ */

const k8sCommands = {
  'get-pods': {
    cmd: 'kubectl get pods',
    lines: [
      { text: 'NAME                          READY   STATUS    RESTARTS   AGE', cls: 't-white' },
      { text: 'web-app-6d8f7b4d5c-abc12     1/1     Running   0          2d', cls: 't-green' },
      { text: 'web-app-6d8f7b4d5c-def34     1/1     Running   0          2d', cls: 't-green' },
      { text: 'web-app-6d8f7b4d5c-ghi56     1/1     Running   0          2d', cls: 't-green' },
      { text: 'redis-master-0               1/1     Running   0          5d', cls: 't-green' },
      { text: 'redis-replica-0              1/1     Running   0          5d', cls: 't-green' },
      { text: 'redis-replica-1              1/1     Running   0          5d', cls: 't-green' },
    ]
  },
  'get-svc': {
    cmd: 'kubectl get svc',
    lines: [
      { text: 'NAME            TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE', cls: 't-white' },
      { text: 'kubernetes      ClusterIP      10.96.0.1       <none>          443/TCP        30d', cls: '' },
      { text: 'web-app         LoadBalancer   10.96.45.123    52.78.100.25    80:31234/TCP   2d', cls: 't-green' },
      { text: 'redis-master    ClusterIP      10.96.78.45     <none>          6379/TCP       5d', cls: '' },
      { text: 'redis-replica   ClusterIP      10.96.78.90     <none>          6379/TCP       5d', cls: '' },
    ]
  },
  'get-nodes': {
    cmd: 'kubectl get nodes',
    lines: [
      { text: 'NAME                          STATUS   ROLES           AGE   VERSION', cls: 't-white' },
      { text: 'ip-10-0-1-101.ec2.internal    Ready    control-plane   30d   v1.29.2', cls: 't-green' },
      { text: 'ip-10-0-2-201.ec2.internal    Ready    <none>          30d   v1.29.2', cls: 't-green' },
      { text: 'ip-10-0-2-202.ec2.internal    Ready    <none>          30d   v1.29.2', cls: 't-green' },
      { text: 'ip-10-0-3-301.ec2.internal    Ready    <none>          15d   v1.29.2', cls: 't-green' },
    ]
  },
  'describe-pod': {
    cmd: 'kubectl describe pod web-app-6d8f7b4d5c-abc12',
    lines: [
      { text: 'Name:             web-app-6d8f7b4d5c-abc12', cls: 't-white' },
      { text: 'Namespace:        default', cls: '' },
      { text: 'Priority:         0', cls: '' },
      { text: 'Service Account:  default', cls: '' },
      { text: 'Node:             ip-10-0-2-201.ec2.internal/10.0.2.201', cls: '' },
      { text: 'Start Time:       Fri, 11 Apr 2026 09:30:00 +0900', cls: '' },
      { text: 'Labels:           app=web-app', cls: 't-yellow' },
      { text: '                  pod-template-hash=6d8f7b4d5c', cls: 't-yellow' },
      { text: 'Status:           Running', cls: 't-green' },
      { text: 'IP:               10.244.1.15', cls: '' },
      { text: 'Controlled By:    ReplicaSet/web-app-6d8f7b4d5c', cls: '' },
      { text: 'Containers:', cls: 't-white' },
      { text: '  web-app:', cls: '' },
      { text: '    Image:          my-registry/web-app:v1.2.3', cls: 't-yellow' },
      { text: '    Port:           8080/TCP', cls: '' },
      { text: '    State:          Running', cls: 't-green' },
      { text: '      Started:      Fri, 11 Apr 2026 09:30:05 +0900', cls: '' },
      { text: '    Ready:          True', cls: 't-green' },
      { text: '    Requests:', cls: '' },
      { text: '      cpu:     100m', cls: '' },
      { text: '      memory:  128Mi', cls: '' },
      { text: '    Limits:', cls: '' },
      { text: '      cpu:     500m', cls: '' },
      { text: '      memory:  256Mi', cls: '' },
      { text: '    Liveness:   http-get http://:8080/healthz delay=10s period=30s', cls: '' },
      { text: '    Readiness:  http-get http://:8080/ready delay=5s period=10s', cls: '' },
      { text: 'Events:', cls: 't-white' },
      { text: '  Normal  Scheduled  2d   default-scheduler  Successfully assigned default/web-app-...', cls: 't-green' },
      { text: '  Normal  Pulled     2d   kubelet            Container image already present', cls: 't-green' },
      { text: '  Normal  Created    2d   kubelet            Created container web-app', cls: 't-green' },
      { text: '  Normal  Started    2d   kubelet            Started container web-app', cls: 't-green' },
    ]
  },
  'get-deploy': {
    cmd: 'kubectl get deployments',
    lines: [
      { text: 'NAME        READY   UP-TO-DATE   AVAILABLE   AGE', cls: 't-white' },
      { text: 'web-app     3/3     3            3           2d', cls: 't-green' },
    ]
  },
  'logs': {
    cmd: 'kubectl logs web-app-6d8f7b4d5c-abc12 --tail=10',
    lines: [
      { text: '[2026-04-13 12:00:01] INFO  Starting web server on :8080', cls: 't-green' },
      { text: '[2026-04-13 12:00:01] INFO  Connected to redis-master:6379', cls: 't-green' },
      { text: '[2026-04-13 12:00:02] INFO  Health check endpoint ready at /healthz', cls: '' },
      { text: '[2026-04-13 12:05:30] INFO  GET /api/users 200 12ms', cls: '' },
      { text: '[2026-04-13 12:05:31] INFO  GET /api/users/123 200 8ms', cls: '' },
      { text: '[2026-04-13 12:06:15] INFO  POST /api/orders 201 45ms', cls: '' },
      { text: '[2026-04-13 12:07:00] WARN  Slow query detected: GET /api/reports 1250ms', cls: 't-yellow' },
      { text: '[2026-04-13 12:10:00] INFO  GET /healthz 200 1ms', cls: '' },
      { text: '[2026-04-13 12:10:30] INFO  GET /api/users 200 10ms', cls: '' },
      { text: '[2026-04-13 12:11:00] INFO  GET /ready 200 1ms', cls: '' },
    ]
  },
  'apply': {
    cmd: 'kubectl apply -f deployment.yaml',
    lines: [
      { text: 'deployment.apps/web-app configured', cls: 't-green' },
      { text: '', cls: '' },
      { text: '$ kubectl rollout status deployment/web-app', cls: 't-gray' },
      { text: 'Waiting for deployment "web-app" rollout to finish: 1 out of 3 new replicas have been updated...', cls: 't-yellow' },
      { text: 'Waiting for deployment "web-app" rollout to finish: 2 out of 3 new replicas have been updated...', cls: 't-yellow' },
      { text: 'Waiting for deployment "web-app" rollout to finish: 2 of 3 updated replicas are available...', cls: 't-yellow' },
      { text: 'deployment "web-app" successfully rolled out', cls: 't-green' },
    ]
  },
  'rollout': {
    cmd: 'kubectl rollout status deployment/web-app',
    lines: [
      { text: 'deployment "web-app" successfully rolled out', cls: 't-green' },
      { text: '', cls: '' },
      { text: '$ kubectl rollout history deployment/web-app', cls: 't-gray' },
      { text: 'deployment.apps/web-app', cls: 't-white' },
      { text: 'REVISION  CHANGE-CAUSE', cls: 't-white' },
      { text: '1         Initial deployment', cls: '' },
      { text: '2         Update image to v1.2.3', cls: '' },
      { text: '3         Update image to v1.3.0 (current)', cls: 't-green' },
    ]
  },
};

function k8sRun(cmd, termId) {
  var term = document.getElementById(termId);
  if (!term) return;
  var data = k8sCommands[cmd];
  if (!data) return;

  // Remove cursor
  var cursor = term.querySelector('.cursor');
  if (cursor) cursor.remove();

  // Add command
  var cmdLine = document.createElement('div');
  cmdLine.innerHTML = '<span class="prompt">jane@mac ~ $</span> ' + data.cmd;
  term.appendChild(cmdLine);

  // Add output lines with delay
  var delay = 80;
  data.lines.forEach(function(line, i) {
    setTimeout(function() {
      var div = document.createElement('div');
      if (line.cls) div.className = line.cls;
      div.textContent = line.text;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
    }, delay * (i + 1));
  });

  // Add new prompt after all lines
  setTimeout(function() {
    var newPrompt = document.createElement('div');
    newPrompt.innerHTML = '<span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>';
    term.appendChild(newPrompt);
    term.scrollTop = term.scrollHeight;
  }, delay * (data.lines.length + 1));
}

function k8sClear(termId) {
  var term = document.getElementById(termId);
  if (!term) return;
  term.innerHTML = '<span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>';
}

/* ================================================================
   2. DEPLOYMENT FLOW DEMO — Step-by-step visualization
   ================================================================ */

var k8sDeployState = { step: 0, maxStep: 0 };

var k8sDeploySteps = [
  {
    title: 'Step 1: 현재 상태 — v1 Pod 3개 실행 중',
    pods: [
      { name: 'web-app-v1-abc', version: 'v1', status: 'old' },
      { name: 'web-app-v1-def', version: 'v1', status: 'old' },
      { name: 'web-app-v1-ghi', version: 'v1', status: 'old' },
    ],
    log: '<span class="t-green">$ kubectl get pods</span>\n모든 Pod가 v1으로 실행 중 (3/3 Ready)'
  },
  {
    title: 'Step 2: kubectl apply — v2 Deployment 적용',
    pods: [
      { name: 'web-app-v1-abc', version: 'v1', status: 'old' },
      { name: 'web-app-v1-def', version: 'v1', status: 'old' },
      { name: 'web-app-v1-ghi', version: 'v1', status: 'old' },
      { name: 'web-app-v2-jkl', version: 'v2', status: 'new' },
    ],
    log: '<span class="t-yellow">$ kubectl apply -f deployment-v2.yaml</span>\ndeployment.apps/web-app configured\n새 ReplicaSet 생성 → v2 Pod 1개 시작 (maxSurge=1)'
  },
  {
    title: 'Step 3: v2 Pod Ready → v1 Pod 하나 종료 시작',
    pods: [
      { name: 'web-app-v1-abc', version: 'v1', status: 'removing' },
      { name: 'web-app-v1-def', version: 'v1', status: 'old' },
      { name: 'web-app-v1-ghi', version: 'v1', status: 'old' },
      { name: 'web-app-v2-jkl', version: 'v2', status: 'new' },
    ],
    log: 'v2 Pod Ready 확인 → v1 Pod 하나 Terminating\n<span class="t-yellow">Waiting for rollout: 1 out of 3 new replicas updated...</span>'
  },
  {
    title: 'Step 4: 교체 진행 중 (2/3)',
    pods: [
      { name: 'web-app-v1-def', version: 'v1', status: 'old' },
      { name: 'web-app-v1-ghi', version: 'v1', status: 'removing' },
      { name: 'web-app-v2-jkl', version: 'v2', status: 'new' },
      { name: 'web-app-v2-mno', version: 'v2', status: 'new' },
    ],
    log: 'v1-abc 종료 완료, v2-mno 시작\n<span class="t-yellow">Waiting for rollout: 2 out of 3 new replicas updated...</span>'
  },
  {
    title: 'Step 5: Rolling Update 완료! 모든 Pod가 v2',
    pods: [
      { name: 'web-app-v2-jkl', version: 'v2', status: 'new' },
      { name: 'web-app-v2-mno', version: 'v2', status: 'new' },
      { name: 'web-app-v2-pqr', version: 'v2', status: 'new' },
    ],
    log: '<span class="t-green">deployment "web-app" successfully rolled out</span>\n모든 Pod가 v2로 교체 완료 (3/3 Ready)\n이전 ReplicaSet은 replica=0으로 유지 (롤백 대비)'
  },
];

function k8sRenderDeploy() {
  var step = k8sDeploySteps[k8sDeployState.step];
  if (!step) return;

  // Title
  var titleEl = document.getElementById('k8s-deploy-title');
  if (titleEl) titleEl.textContent = step.title;

  // Pods
  var podsEl = document.getElementById('k8s-deploy-pods');
  if (podsEl) {
    podsEl.innerHTML = '';
    step.pods.forEach(function(pod) {
      var div = document.createElement('div');
      var cls = 'k8s-pod-icon ';
      if (pod.status === 'old') cls += 'k8s-pod-old';
      else if (pod.status === 'new') cls += 'k8s-pod-new';
      else if (pod.status === 'removing') cls += 'k8s-pod-removing';
      else if (pod.status === 'canary') cls += 'k8s-pod-canary';
      div.className = cls;
      div.textContent = pod.version;
      div.title = pod.name;
      podsEl.appendChild(div);
    });
  }

  // Log
  var logEl = document.getElementById('k8s-deploy-log');
  if (logEl) logEl.innerHTML = step.log;

  // Button states
  var prevBtn = document.getElementById('k8s-deploy-prev');
  var nextBtn = document.getElementById('k8s-deploy-next');
  if (prevBtn) prevBtn.disabled = k8sDeployState.step === 0;
  if (nextBtn) nextBtn.disabled = k8sDeployState.step >= k8sDeploySteps.length - 1;
}

function k8sDeployNext() {
  if (k8sDeployState.step < k8sDeploySteps.length - 1) {
    k8sDeployState.step++;
    k8sRenderDeploy();
  }
}

function k8sDeployPrev() {
  if (k8sDeployState.step > 0) {
    k8sDeployState.step--;
    k8sRenderDeploy();
  }
}

function k8sDeployReset() {
  k8sDeployState.step = 0;
  k8sRenderDeploy();
}

/* ================================================================
   3. NETWORK SCENARIO DEMO
   ================================================================ */

var k8sNetTimers = [];

function k8sNetClearTimers() {
  k8sNetTimers.forEach(function(t) { clearTimeout(t); });
  k8sNetTimers = [];
}

function k8sNetReset() {
  k8sNetClearTimers();
  var text = document.getElementById('k8s-net-scenario-text');
  if (text) text.innerHTML = '';
  var vis = document.getElementById('k8s-net-vis');
  if (vis) vis.innerHTML = '';
}

function k8sNetAddExp(text, cls) {
  var el = document.getElementById('k8s-net-scenario-text');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'k8s-exp-step ' + (cls || 'k8s-exp-info');
  div.innerHTML = text;
  el.appendChild(div);
}

function k8sNetShowScenario(type) {
  k8sNetReset();
  document.querySelectorAll('.k8s-net-scenario-btns .k8s-scenario-btn').forEach(function(b) {
    b.classList.remove('k8s-sc-active');
  });
  var idx = { clusterip: 0, nodeport: 1, loadbalancer: 2, ingress: 3 }[type];
  var btns = document.querySelectorAll('.k8s-net-scenario-btns .k8s-scenario-btn');
  if (btns[idx]) btns[idx].classList.add('k8s-sc-active');

  switch(type) {
    case 'clusterip': k8sNetClusterIP(); break;
    case 'nodeport': k8sNetNodePort(); break;
    case 'loadbalancer': k8sNetLoadBalancer(); break;
    case 'ingress': k8sNetIngress(); break;
  }
}

function k8sNetClusterIP() {
  k8sNetAddExp('<strong>ClusterIP</strong> — 클러스터 내부에서만 접근 가능한 가상 IP', 'k8s-exp-send');

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('① 클러스터 내부 Pod(frontend)가 Service IP로 요청 전송', 'k8s-exp-info');
  }, 400));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('② kube-proxy가 iptables/IPVS 규칙으로 트래픽을 backend Pod 중 하나로 전달', 'k8s-exp-info');
  }, 1000));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('③ backend Pod가 요청 처리 후 응답 반환', 'k8s-exp-info');
  }, 1600));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('✓ 외부에서는 접근 불가 — 마이크로서비스 간 내부 통신에 적합', 'k8s-exp-good');
    k8sNetAddExp('💡 DNS: redis-master.default.svc.cluster.local → ClusterIP', 'k8s-exp-info');
  }, 2200));
}

function k8sNetNodePort() {
  k8sNetAddExp('<strong>NodePort</strong> — 모든 Node의 특정 포트로 외부 접근 허용 (30000-32767)', 'k8s-exp-send');

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('① 외부 클라이언트가 &lt;NodeIP&gt;:31234 로 요청', 'k8s-exp-info');
  }, 400));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('② Node의 kube-proxy가 요청을 수신하여 ClusterIP Service로 전달', 'k8s-exp-info');
  }, 1000));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('③ Service가 selector에 매칭되는 Pod 중 하나로 로드밸런싱', 'k8s-exp-info');
  }, 1600));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('⚠ 포트 범위 제한(30000-32767), Node IP를 직접 노출해야 함', 'k8s-exp-warn');
    k8sNetAddExp('💡 개발/테스트 환경에서 간단한 외부 접근에 사용', 'k8s-exp-info');
  }, 2200));
}

function k8sNetLoadBalancer() {
  k8sNetAddExp('<strong>LoadBalancer</strong> — 클라우드 LB를 자동 프로비저닝하여 외부 노출', 'k8s-exp-send');

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('① kubectl apply → 클라우드 프로바이더에 LB 생성 요청 (AWS ALB/NLB, GCP LB 등)', 'k8s-exp-info');
  }, 400));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('② External IP 할당: 52.78.100.25', 'k8s-exp-good');
  }, 1000));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('③ 외부 클라이언트 → External IP:80 → LB → NodePort → Pod', 'k8s-exp-info');
  }, 1600));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('✓ 프로덕션 환경에서 가장 일반적인 외부 노출 방식', 'k8s-exp-good');
    k8sNetAddExp('💡 서비스당 LB 하나 = 비용 증가 → 여러 서비스는 Ingress 권장', 'k8s-exp-warn');
  }, 2200));
}

function k8sNetIngress() {
  k8sNetAddExp('<strong>Ingress</strong> — L7 라우팅으로 하나의 진입점에서 여러 서비스로 분배', 'k8s-exp-send');

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('① Ingress Controller (nginx/traefik) = LB 역할의 Pod', 'k8s-exp-info');
  }, 400));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('② Host 기반: api.example.com → api-service / web.example.com → web-service', 'k8s-exp-info');
  }, 1000));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('③ Path 기반: example.com/api → api-service / example.com/web → web-service', 'k8s-exp-info');
  }, 1600));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('④ TLS 종료(termination)도 Ingress에서 처리 가능', 'k8s-exp-info');
  }, 2200));

  k8sNetTimers.push(setTimeout(function() {
    k8sNetAddExp('✓ LB 1개로 여러 서비스를 라우팅 → 비용 절감', 'k8s-exp-good');
    k8sNetAddExp('💡 프로덕션에서는 Ingress + cert-manager 조합이 표준', 'k8s-exp-info');
  }, 2800));
}

/* ================================================================
   4. STORAGE BINDING DEMO — Step-by-step PV/PVC/Pod
   ================================================================ */

var k8sStorageState = { step: 0 };

var k8sStorageSteps = [
  {
    title: 'Step 1: 초기 상태 — 스토리지 없음',
    pv: { status: 'none', text: '(없음)' },
    pvc: { status: 'none', text: '(없음)' },
    pod: { status: 'none', text: '(없음)' },
    log: '아직 아무 리소스도 생성되지 않은 상태'
  },
  {
    title: 'Step 2: PersistentVolume 생성 (관리자)',
    pv: { status: 'available', text: 'pv-data\n10Gi / RWO\nAvailable' },
    pvc: { status: 'none', text: '(없음)' },
    pod: { status: 'none', text: '(없음)' },
    log: '<span class="t-green">$ kubectl apply -f pv.yaml</span>\npersistentvolume/pv-data created\n상태: <span class="t-yellow">Available</span> (아직 바인딩되지 않음)'
  },
  {
    title: 'Step 3: PersistentVolumeClaim 생성 (개발자)',
    pv: { status: 'bound', text: 'pv-data\n10Gi / RWO\nBound' },
    pvc: { status: 'bound', text: 'pvc-app\n10Gi 요청\nBound' },
    pod: { status: 'none', text: '(없음)' },
    log: '<span class="t-green">$ kubectl apply -f pvc.yaml</span>\npersistentvolumeclaim/pvc-app created\nPVC 요구사항과 PV 스펙이 일치 → <span class="t-green">자동 바인딩!</span>'
  },
  {
    title: 'Step 4: Pod에서 PVC 마운트',
    pv: { status: 'bound', text: 'pv-data\n10Gi / RWO\nBound' },
    pvc: { status: 'bound', text: 'pvc-app\n10Gi\nBound' },
    pod: { status: 'running', text: 'web-app\n/data 마운트\nRunning' },
    log: '<span class="t-green">$ kubectl apply -f pod.yaml</span>\npod/web-app created\nPVC를 /data 경로에 마운트 → Pod 내에서 영구 저장소 사용 가능'
  },
  {
    title: 'Step 5: Pod 재생성 후에도 데이터 유지',
    pv: { status: 'bound', text: 'pv-data\n10Gi / RWO\nBound' },
    pvc: { status: 'bound', text: 'pvc-app\n10Gi\nBound' },
    pod: { status: 'running', text: 'web-app-new\n/data 마운트\nRunning' },
    log: '<span class="t-yellow">$ kubectl delete pod web-app</span>\n<span class="t-green">$ kubectl apply -f pod.yaml</span>\n새 Pod가 같은 PVC에 마운트 → <span class="t-green">이전 데이터 그대로 존재!</span>'
  },
];

function k8sRenderStorage() {
  var step = k8sStorageSteps[k8sStorageState.step];
  if (!step) return;

  var titleEl = document.getElementById('k8s-storage-title');
  if (titleEl) titleEl.textContent = step.title;

  // PV box
  var pvEl = document.getElementById('k8s-storage-pv-box');
  if (pvEl) {
    pvEl.textContent = step.pv.text;
    pvEl.className = 'k8s-storage-box k8s-pv';
    if (step.pv.status === 'none') pvEl.style.opacity = '0.3';
    else if (step.pv.status === 'available') pvEl.style.opacity = '0.7';
    else pvEl.style.opacity = '1';
  }

  // PVC box
  var pvcEl = document.getElementById('k8s-storage-pvc-box');
  if (pvcEl) {
    pvcEl.textContent = step.pvc.text;
    pvcEl.className = 'k8s-storage-box k8s-pvc';
    if (step.pvc.status === 'none') pvcEl.style.opacity = '0.3';
    else pvcEl.style.opacity = '1';
  }

  // Pod box
  var podEl = document.getElementById('k8s-storage-pod-box');
  if (podEl) {
    podEl.textContent = step.pod.text;
    podEl.className = 'k8s-storage-box k8s-pod';
    if (step.pod.status === 'none') podEl.style.opacity = '0.3';
    else podEl.style.opacity = '1';
  }

  // Arrows
  var arrow1 = document.getElementById('k8s-storage-arrow1');
  var arrow2 = document.getElementById('k8s-storage-arrow2');
  if (arrow1) arrow1.style.opacity = (step.pvc.status === 'bound') ? '1' : '0.2';
  if (arrow2) arrow2.style.opacity = (step.pod.status === 'running') ? '1' : '0.2';

  // Log
  var logEl = document.getElementById('k8s-storage-log');
  if (logEl) logEl.innerHTML = step.log;

  // Button states
  var prevBtn = document.getElementById('k8s-storage-prev');
  var nextBtn = document.getElementById('k8s-storage-next');
  if (prevBtn) prevBtn.disabled = k8sStorageState.step === 0;
  if (nextBtn) nextBtn.disabled = k8sStorageState.step >= k8sStorageSteps.length - 1;
}

function k8sStorageNext() {
  if (k8sStorageState.step < k8sStorageSteps.length - 1) {
    k8sStorageState.step++;
    k8sRenderStorage();
  }
}

function k8sStoragePrev() {
  if (k8sStorageState.step > 0) {
    k8sStorageState.step--;
    k8sRenderStorage();
  }
}

function k8sStorageReset() {
  k8sStorageState.step = 0;
  k8sRenderStorage();
}

/* ================================================================
   5. HELM DEEP-DIVE — Interactive Demos
   ================================================================ */

/* --- 5a. Helm Command Terminal --- */

var k8sHelmCommands = {
  'search': {
    cmd: 'helm search repo apache-airflow/airflow --versions',
    lines: [
      { text: 'NAME                        CHART VERSION   APP VERSION   DESCRIPTION', cls: 't-white' },
      { text: 'apache-airflow/airflow      1.15.0          2.10.4        The official Helm chart for Apache Airflow', cls: 't-green' },
      { text: 'apache-airflow/airflow      1.14.0          2.9.3         The official Helm chart for Apache Airflow', cls: '' },
      { text: 'apache-airflow/airflow      1.13.1          2.8.4         The official Helm chart for Apache Airflow', cls: '' },
      { text: 'apache-airflow/airflow      1.12.0          2.8.1         The official Helm chart for Apache Airflow', cls: '' },
      { text: 'apache-airflow/airflow      1.11.0          2.7.3         The official Helm chart for Apache Airflow', cls: '' },
    ]
  },
  'show': {
    cmd: 'helm show values apache-airflow/airflow | head -30',
    lines: [
      { text: '# Licensed to the Apache Software Foundation (ASF)', cls: 't-gray' },
      { text: '# Default values for airflow.', cls: 't-gray' },
      { text: '', cls: '' },
      { text: '# User and group of airflow user', cls: 't-gray' },
      { text: 'uid: 50000', cls: '' },
      { text: 'gid: 0', cls: '' },
      { text: '', cls: '' },
      { text: '# Airflow executor', cls: 't-gray' },
      { text: '# One of: LocalExecutor, CeleryExecutor, KubernetesExecutor', cls: 't-gray' },
      { text: 'executor: CeleryExecutor', cls: 't-yellow' },
      { text: '', cls: '' },
      { text: '# Environment variables for all airflow containers', cls: 't-gray' },
      { text: 'env: []', cls: '' },
      { text: '', cls: '' },
      { text: '# Airflow home directory', cls: 't-gray' },
      { text: 'airflowHome: /opt/airflow', cls: '' },
      { text: '', cls: '' },
      { text: '# Default airflow repository', cls: 't-gray' },
      { text: 'defaultAirflowRepository: apache/airflow', cls: 't-green' },
      { text: '', cls: '' },
      { text: '# Default airflow tag to deploy', cls: 't-gray' },
      { text: 'defaultAirflowTag: "2.10.4"', cls: 't-green' },
      { text: '', cls: '' },
      { text: '--- (약 1,500줄 중 상위 30줄) ---', cls: 't-gray' },
    ]
  },
  'template': {
    cmd: 'helm template airflow apache-airflow/airflow -f values-prd.yaml --show-only templates/webserver/webserver-deployment.yaml',
    lines: [
      { text: '---', cls: 't-white' },
      { text: '# Source: airflow/templates/webserver/webserver-deployment.yaml', cls: 't-gray' },
      { text: 'apiVersion: apps/v1', cls: '' },
      { text: 'kind: Deployment', cls: '' },
      { text: 'metadata:', cls: '' },
      { text: '  name: airflow-webserver', cls: 't-yellow' },
      { text: '  namespace: "default"', cls: '' },
      { text: '  labels:', cls: '' },
      { text: '    component: webserver', cls: '' },
      { text: 'spec:', cls: '' },
      { text: '  replicas: 2', cls: 't-green' },
      { text: '  strategy:', cls: '' },
      { text: '    type: RollingUpdate', cls: '' },
      { text: '  selector:', cls: '' },
      { text: '    matchLabels:', cls: '' },
      { text: '      component: webserver', cls: '' },
      { text: '  template:', cls: '' },
      { text: '    spec:', cls: '' },
      { text: '      containers:', cls: '' },
      { text: '        - name: webserver', cls: '' },
      { text: '          image: "my-registry.example.com/airflow:2.10.4"', cls: 't-green' },
      { text: '          resources:', cls: '' },
      { text: '            requests:', cls: '' },
      { text: '              cpu: "1"', cls: 't-yellow' },
      { text: '              memory: "2Gi"', cls: 't-yellow' },
      { text: '...', cls: 't-gray' },
    ]
  },
  'install': {
    cmd: 'helm install airflow apache-airflow/airflow -f values.yaml -f values-prd.yaml -n airflow-prd --create-namespace',
    lines: [
      { text: 'NAME: airflow', cls: 't-white' },
      { text: 'LAST DEPLOYED: Tue Apr 15 14:30:00 2026', cls: '' },
      { text: 'NAMESPACE: airflow-prd', cls: '' },
      { text: 'STATUS: deployed', cls: 't-green' },
      { text: 'REVISION: 1', cls: '' },
      { text: 'TEST SUITE: None', cls: '' },
      { text: 'NOTES:', cls: 't-white' },
      { text: 'Thank you for installing Apache Airflow!', cls: 't-green' },
      { text: '', cls: '' },
      { text: 'Your release is named airflow.', cls: '' },
      { text: 'You can now access your dashboard by executing:', cls: '' },
      { text: '  kubectl port-forward svc/airflow-webserver 8080:8080 -n airflow-prd', cls: 't-yellow' },
      { text: '  Then visit http://localhost:8080', cls: '' },
    ]
  },
  'list': {
    cmd: 'helm list -n airflow-prd',
    lines: [
      { text: 'NAME       NAMESPACE     REVISION   UPDATED                    STATUS     CHART            APP VERSION', cls: 't-white' },
      { text: 'airflow    airflow-prd   3          2026-04-15 14:30:00 +0900  deployed   airflow-1.15.0   2.10.4', cls: 't-green' },
    ]
  },
  'upgrade': {
    cmd: 'helm upgrade airflow apache-airflow/airflow -f values.yaml -f values-prd.yaml -n airflow-prd --set images.airflow.tag=2.10.5',
    lines: [
      { text: 'Release "airflow" has been upgraded. Happy Helming!', cls: 't-green' },
      { text: 'NAME: airflow', cls: 't-white' },
      { text: 'LAST DEPLOYED: Tue Apr 15 15:00:00 2026', cls: '' },
      { text: 'NAMESPACE: airflow-prd', cls: '' },
      { text: 'STATUS: deployed', cls: 't-green' },
      { text: 'REVISION: 4', cls: 't-yellow' },
    ]
  },
  'history': {
    cmd: 'helm history airflow -n airflow-prd',
    lines: [
      { text: 'REVISION   UPDATED                    STATUS       CHART            APP VERSION   DESCRIPTION', cls: 't-white' },
      { text: '1          2026-04-15 14:30:00 +0900  superseded   airflow-1.14.0   2.9.3         Install complete', cls: '' },
      { text: '2          2026-04-15 14:45:00 +0900  superseded   airflow-1.15.0   2.10.4        Upgrade complete', cls: '' },
      { text: '3          2026-04-15 15:00:00 +0900  deployed     airflow-1.15.0   2.10.4        Upgrade complete', cls: 't-green' },
    ]
  },
  'rollback': {
    cmd: 'helm rollback airflow 2 -n airflow-prd',
    lines: [
      { text: 'Rollback was a success! Happy Helming!', cls: 't-green' },
      { text: '', cls: '' },
      { text: '$ helm history airflow -n airflow-prd', cls: 't-gray' },
      { text: 'REVISION   UPDATED                    STATUS       CHART            APP VERSION   DESCRIPTION', cls: 't-white' },
      { text: '1          2026-04-15 14:30:00 +0900  superseded   airflow-1.14.0   2.9.3         Install complete', cls: '' },
      { text: '2          2026-04-15 14:45:00 +0900  superseded   airflow-1.15.0   2.10.4        Upgrade complete', cls: '' },
      { text: '3          2026-04-15 15:00:00 +0900  superseded   airflow-1.15.0   2.10.4        Upgrade complete', cls: '' },
      { text: '4          2026-04-15 15:10:00 +0900  deployed     airflow-1.15.0   2.10.4        Rollback to 2', cls: 't-green' },
    ]
  },
  'uninstall': {
    cmd: 'helm uninstall airflow -n airflow-prd',
    lines: [
      { text: 'release "airflow" uninstalled', cls: 't-yellow' },
      { text: '', cls: '' },
      { text: '$ helm list -n airflow-prd', cls: 't-gray' },
      { text: 'NAME   NAMESPACE   REVISION   UPDATED   STATUS   CHART   APP VERSION', cls: 't-white' },
      { text: '(empty)', cls: 't-gray' },
    ]
  },
};

function k8sHelmCmd(cmd) {
  var term = document.getElementById('k8s-helm-term');
  if (!term) return;
  var data = k8sHelmCommands[cmd];
  if (!data) return;

  // Highlight active button
  document.querySelectorAll('.k8s-helm-cmd-btns .k8s-scenario-btn').forEach(function(b) {
    b.classList.remove('k8s-sc-active');
  });
  var cmdNames = ['search','show','template','install','list','upgrade','history','rollback','uninstall'];
  var idx = cmdNames.indexOf(cmd);
  var btns = document.querySelectorAll('.k8s-helm-cmd-btns .k8s-scenario-btn');
  if (btns[idx]) btns[idx].classList.add('k8s-sc-active');

  // Remove cursor
  var cursor = term.querySelector('.cursor');
  if (cursor) cursor.remove();

  // Add command
  var cmdLine = document.createElement('div');
  cmdLine.innerHTML = '<span class="prompt">jane@mac ~ $</span> ' + data.cmd;
  term.appendChild(cmdLine);

  // Add output lines with delay
  var delay = 60;
  data.lines.forEach(function(line, i) {
    setTimeout(function() {
      var div = document.createElement('div');
      if (line.cls) div.className = line.cls;
      div.textContent = line.text;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
    }, delay * (i + 1));
  });

  // Add new prompt after all lines
  setTimeout(function() {
    var newPrompt = document.createElement('div');
    newPrompt.innerHTML = '<span class="prompt">jane@mac ~ $</span> <span class="cursor">_</span>';
    term.appendChild(newPrompt);
    term.scrollTop = term.scrollHeight;
  }, delay * (data.lines.length + 1));
}

/* --- 5b. Values → Manifest Render Simulator --- */

var k8sHelmRenderScenarios = {
  'dev': {
    values: '<span class="k8s-helm-hl-comment"># values-dev.yaml</span>\n' +
      '<span class="k8s-helm-hl-key">executor</span>: LocalExecutor\n\n' +
      '<span class="k8s-helm-hl-key">webserver</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">1</span>\n' +
      '  <span class="k8s-helm-hl-key">resources</span>:\n' +
      '    requests:\n' +
      '      cpu: <span class="k8s-helm-hl-val">"200m"</span>\n' +
      '      memory: <span class="k8s-helm-hl-val">"512Mi"</span>\n\n' +
      '<span class="k8s-helm-hl-key">postgresql</span>:\n' +
      '  <span class="k8s-helm-hl-key">enabled</span>: <span class="k8s-helm-hl-val">true</span>\n\n' +
      '<span class="k8s-helm-hl-key">ingress</span>:\n' +
      '  web:\n' +
      '    <span class="k8s-helm-hl-key">enabled</span>: <span class="k8s-helm-hl-val">false</span>',
    manifest: '<span class="k8s-helm-hl-comment"># Deployment (렌더링 결과)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-webserver</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">1</span>\n' +
      '  template:\n' +
      '    spec:\n' +
      '      containers:\n' +
      '        - name: webserver\n' +
      '          image: <span class="k8s-helm-hl-val">apache/airflow:2.10.4</span>\n' +
      '          resources:\n' +
      '            requests:\n' +
      '              cpu: <span class="k8s-helm-hl-val">"200m"</span>\n' +
      '              memory: <span class="k8s-helm-hl-val">"512Mi"</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># PostgreSQL StatefulSet → 생성됨 ✓</span>\n' +
      '<span class="k8s-helm-hl-comment"># Ingress → 생성 안 됨 ✗ (enabled: false)</span>'
  },
  'prd': {
    values: '<span class="k8s-helm-hl-comment"># values-prd.yaml</span>\n' +
      '<span class="k8s-helm-hl-key">executor</span>: KubernetesExecutor\n\n' +
      '<span class="k8s-helm-hl-key">webserver</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">2</span>\n' +
      '  <span class="k8s-helm-hl-key">resources</span>:\n' +
      '    requests:\n' +
      '      cpu: <span class="k8s-helm-hl-val">"1"</span>\n' +
      '      memory: <span class="k8s-helm-hl-val">"2Gi"</span>\n' +
      '    limits:\n' +
      '      cpu: <span class="k8s-helm-hl-val">"2"</span>\n' +
      '      memory: <span class="k8s-helm-hl-val">"4Gi"</span>\n\n' +
      '<span class="k8s-helm-hl-key">postgresql</span>:\n' +
      '  <span class="k8s-helm-hl-key">enabled</span>: <span class="k8s-helm-hl-val">false</span>\n\n' +
      '<span class="k8s-helm-hl-key">ingress</span>:\n' +
      '  web:\n' +
      '    <span class="k8s-helm-hl-key">enabled</span>: <span class="k8s-helm-hl-val">true</span>\n' +
      '    hosts:\n' +
      '      - name: <span class="k8s-helm-hl-val">airflow.example.com</span>',
    manifest: '<span class="k8s-helm-hl-comment"># Deployment (렌더링 결과)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-webserver</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">2</span>\n' +
      '  template:\n' +
      '    spec:\n' +
      '      containers:\n' +
      '        - name: webserver\n' +
      '          image: <span class="k8s-helm-hl-val">my-registry.example.com/airflow:2.10.4</span>\n' +
      '          resources:\n' +
      '            requests:\n' +
      '              cpu: <span class="k8s-helm-hl-val">"1"</span>\n' +
      '              memory: <span class="k8s-helm-hl-val">"2Gi"</span>\n' +
      '            limits:\n' +
      '              cpu: <span class="k8s-helm-hl-val">"2"</span>\n' +
      '              memory: <span class="k8s-helm-hl-val">"4Gi"</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># PostgreSQL StatefulSet → 생성 안 됨 ✗ (외부 RDS 사용)</span>\n' +
      '<span class="k8s-helm-hl-comment"># Ingress → 생성됨 ✓</span>\n' +
      'apiVersion: networking.k8s.io/v1\n' +
      'kind: Ingress\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-ingress</span>\n' +
      'spec:\n' +
      '  rules:\n' +
      '    - host: <span class="k8s-helm-hl-val">airflow.example.com</span>'
  },
  'custom': {
    values: '<span class="k8s-helm-hl-comment"># values-custom-image.yaml</span>\n' +
      '<span class="k8s-helm-hl-key">images</span>:\n' +
      '  <span class="k8s-helm-hl-key">airflow</span>:\n' +
      '    repository: <span class="k8s-helm-hl-val">my-registry.example.com/airflow-custom</span>\n' +
      '    tag: <span class="k8s-helm-hl-val">"2.10.4-dbt"</span>\n' +
      '    pullPolicy: <span class="k8s-helm-hl-val">Always</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># pip 추가 패키지 (이미지에 포함되지 않은 경우)</span>\n' +
      '<span class="k8s-helm-hl-key">airflowPodAnnotations</span>:\n' +
      '  custom-image: <span class="k8s-helm-hl-val">"true"</span>\n\n' +
      '<span class="k8s-helm-hl-key">webserver</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">1</span>',
    manifest: '<span class="k8s-helm-hl-comment"># Deployment (렌더링 결과)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-webserver</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">1</span>\n' +
      '  template:\n' +
      '    metadata:\n' +
      '      annotations:\n' +
      '        custom-image: <span class="k8s-helm-hl-val">"true"</span>\n' +
      '    spec:\n' +
      '      containers:\n' +
      '        - name: webserver\n' +
      '          image: <span class="k8s-helm-hl-val">my-registry.example.com/airflow-custom:2.10.4-dbt</span>\n' +
      '          imagePullPolicy: <span class="k8s-helm-hl-val">Always</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># 커스텀 이미지의 모든 컨테이너에 동일 적용:</span>\n' +
      '<span class="k8s-helm-hl-comment">#   - webserver, scheduler, worker, triggerer</span>\n' +
      '<span class="k8s-helm-hl-comment">#   모두 같은 image 참조</span>'
  },
  'ha': {
    values: '<span class="k8s-helm-hl-comment"># values-ha.yaml (고가용성 설정)</span>\n' +
      '<span class="k8s-helm-hl-key">executor</span>: KubernetesExecutor\n\n' +
      '<span class="k8s-helm-hl-key">webserver</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">3</span>\n' +
      '  resources:\n' +
      '    requests:\n' +
      '      cpu: <span class="k8s-helm-hl-val">"2"</span>\n' +
      '      memory: <span class="k8s-helm-hl-val">"4Gi"</span>\n\n' +
      '<span class="k8s-helm-hl-key">scheduler</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">3</span>\n\n' +
      '<span class="k8s-helm-hl-key">triggerer</span>:\n' +
      '  <span class="k8s-helm-hl-key">replicas</span>: <span class="k8s-helm-hl-val">2</span>\n\n' +
      '<span class="k8s-helm-hl-key">postgresql</span>:\n' +
      '  <span class="k8s-helm-hl-key">enabled</span>: <span class="k8s-helm-hl-val">false</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># PodDisruptionBudget</span>\n' +
      '<span class="k8s-helm-hl-key">webserver</span>:\n' +
      '  <span class="k8s-helm-hl-key">podDisruptionBudget</span>:\n' +
      '    enabled: <span class="k8s-helm-hl-val">true</span>\n' +
      '    minAvailable: <span class="k8s-helm-hl-val">2</span>',
    manifest: '<span class="k8s-helm-hl-comment"># Deployment — Webserver (3 replicas)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-webserver</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">3</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># Deployment — Scheduler (3 replicas, HA)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-scheduler</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">3</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># Deployment — Triggerer (2 replicas)</span>\n' +
      'apiVersion: apps/v1\n' +
      'kind: Deployment\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-triggerer</span>\n' +
      'spec:\n' +
      '  replicas: <span class="k8s-helm-hl-val">2</span>\n\n' +
      '<span class="k8s-helm-hl-comment"># PodDisruptionBudget → 생성됨 ✓</span>\n' +
      'apiVersion: policy/v1\n' +
      'kind: PodDisruptionBudget\n' +
      'metadata:\n' +
      '  name: <span class="k8s-helm-hl-val">airflow-webserver-pdb</span>\n' +
      'spec:\n' +
      '  minAvailable: <span class="k8s-helm-hl-val">2</span>'
  }
};

function k8sHelmRender(scenario) {
  var data = k8sHelmRenderScenarios[scenario];
  if (!data) return;

  // Highlight active button
  document.querySelectorAll('.k8s-helm-render-btns .k8s-scenario-btn').forEach(function(b) {
    b.classList.remove('k8s-sc-active');
  });
  var names = ['dev','prd','custom','ha'];
  var idx = names.indexOf(scenario);
  var btns = document.querySelectorAll('.k8s-helm-render-btns .k8s-scenario-btn');
  if (btns[idx]) btns[idx].classList.add('k8s-sc-active');

  var valEl = document.getElementById('k8s-helm-values-display');
  var manEl = document.getElementById('k8s-helm-manifest-display');
  if (valEl) valEl.innerHTML = data.values;
  if (manEl) manEl.innerHTML = data.manifest;
}

/* --- 5c. Helm Deployment Scenario Demo --- */

var k8sHelmScenarioTimers = [];

function k8sHelmScenarioClear() {
  k8sHelmScenarioTimers.forEach(function(t) { clearTimeout(t); });
  k8sHelmScenarioTimers = [];
}

function k8sHelmScenarioReset() {
  k8sHelmScenarioClear();
  var text = document.getElementById('k8s-helm-scenario-text');
  if (text) text.innerHTML = '';
}

function k8sHelmAddStep(text, cls) {
  var el = document.getElementById('k8s-helm-scenario-text');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'k8s-exp-step ' + (cls || 'k8s-exp-info');
  div.innerHTML = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function k8sHelmScenario(type) {
  k8sHelmScenarioReset();
  document.querySelectorAll('.k8s-helm-scenario-btns .k8s-scenario-btn').forEach(function(b) {
    b.classList.remove('k8s-sc-active');
  });
  var names = ['firstinstall','valueschange','chartupgrade','rollback'];
  var idx = names.indexOf(type);
  var btns = document.querySelectorAll('.k8s-helm-scenario-btns .k8s-scenario-btn');
  if (btns[idx]) btns[idx].classList.add('k8s-sc-active');

  switch(type) {
    case 'firstinstall': k8sHelmFirstInstall(); break;
    case 'valueschange': k8sHelmValuesChange(); break;
    case 'chartupgrade': k8sHelmChartUpgrade(); break;
    case 'rollback': k8sHelmRollback(); break;
  }
}

function k8sHelmFirstInstall() {
  k8sHelmAddStep('<strong>시나리오: Airflow 첫 설치</strong>', 'k8s-exp-send');

  var steps = [
    { d:400, t:'① <code>helm repo add apache-airflow https://airflow.apache.org</code> — Repo 추가', c:'k8s-exp-info' },
    { d:900, t:'② <code>helm show values apache-airflow/airflow > values.yaml</code> — 기본값 다운로드', c:'k8s-exp-info' },
    { d:1400, t:'③ values.yaml 편집: executor, replicas, DB 설정, Ingress 등', c:'k8s-exp-info' },
    { d:1900, t:'④ <code>helm template airflow ... -f values-prd.yaml</code> — 렌더링 확인', c:'k8s-exp-info' },
    { d:2400, t:'⑤ <code>helm install airflow ... -n airflow-prd --create-namespace</code>', c:'k8s-exp-info' },
    { d:2900, t:'✓ STATUS: deployed — Revision 1 생성 완료', c:'k8s-exp-good' },
    { d:3400, t:'💡 <code>kubectl get pods -n airflow-prd -w</code> 로 Pod 상태 확인', c:'k8s-exp-info' },
  ];

  steps.forEach(function(s) {
    k8sHelmScenarioTimers.push(setTimeout(function() {
      k8sHelmAddStep(s.t, s.c);
    }, s.d));
  });
}

function k8sHelmValuesChange() {
  k8sHelmAddStep('<strong>시나리오: values.yaml 변경 (Webserver replica 증설)</strong>', 'k8s-exp-send');

  var steps = [
    { d:400, t:'① values-prd.yaml 수정: <code>webserver.replicas: 2 → 3</code>', c:'k8s-exp-info' },
    { d:900, t:'② <code>helm diff upgrade airflow ...</code> — 변경사항 미리 확인 (helm-diff 플러그인)', c:'k8s-exp-info' },
    { d:1400, t:'③ <code>helm upgrade airflow apache-airflow/airflow -f values.yaml -f values-prd.yaml -n airflow-prd</code>', c:'k8s-exp-info' },
    { d:1900, t:'④ Helm이 렌더링 수행 → replicas: 3인 Deployment 적용', c:'k8s-exp-info' },
    { d:2400, t:'⑤ K8s가 새 Pod 1개 추가 생성 (Rolling Update)', c:'k8s-exp-info' },
    { d:2900, t:'✓ Revision 2 생성 — Webserver Pod 3개로 증설 완료', c:'k8s-exp-good' },
    { d:3400, t:'⚠ 주의: upgrade 시 <strong>모든 -f 파일을 매번 지정</strong>해야 합니다. 누락하면 기본값으로 리셋됩니다!', c:'k8s-exp-warn' },
  ];

  steps.forEach(function(s) {
    k8sHelmScenarioTimers.push(setTimeout(function() {
      k8sHelmAddStep(s.t, s.c);
    }, s.d));
  });
}

function k8sHelmChartUpgrade() {
  k8sHelmAddStep('<strong>시나리오: Airflow Chart 버전 업그레이드 (1.14.0 → 1.15.0)</strong>', 'k8s-exp-send');

  var steps = [
    { d:400, t:'① <code>helm repo update</code> — 최신 차트 목록 가져오기', c:'k8s-exp-info' },
    { d:900, t:'② <code>helm search repo apache-airflow/airflow --versions</code> — 새 버전 확인', c:'k8s-exp-info' },
    { d:1400, t:'③ 릴리스 노트 확인: 새 values 키 추가/삭제/변경사항 체크', c:'k8s-exp-warn' },
    { d:1900, t:'④ <code>helm upgrade airflow apache-airflow/airflow --version 1.15.0 ...</code>', c:'k8s-exp-info' },
    { d:2400, t:'⑤ Helm이 새 템플릿으로 렌더링 → K8s에 적용', c:'k8s-exp-info' },
    { d:2900, t:'✓ Chart 1.14.0 → 1.15.0, AppVersion 2.9.3 → 2.10.4 업그레이드 완료', c:'k8s-exp-good' },
    { d:3400, t:'💡 문제 발생 시 <code>helm rollback airflow 이전리비전</code>으로 즉시 복구 가능', c:'k8s-exp-info' },
  ];

  steps.forEach(function(s) {
    k8sHelmScenarioTimers.push(setTimeout(function() {
      k8sHelmAddStep(s.t, s.c);
    }, s.d));
  });
}

function k8sHelmRollback() {
  k8sHelmAddStep('<strong>시나리오: 업그레이드 후 장애 → 긴급 롤백</strong>', 'k8s-exp-send');

  var steps = [
    { d:400, t:'❌ 업그레이드 후 Webserver CrashLoopBackOff 발생!', c:'k8s-exp-bad' },
    { d:900, t:'① <code>kubectl get pods -n airflow-prd</code> — 장애 Pod 확인', c:'k8s-exp-info' },
    { d:1400, t:'② <code>helm history airflow -n airflow-prd</code> — 이전 정상 리비전 번호 확인', c:'k8s-exp-info' },
    { d:1900, t:'③ Revision 2가 마지막 정상 버전으로 확인됨', c:'k8s-exp-info' },
    { d:2400, t:'④ <code>helm rollback airflow 2 -n airflow-prd</code>', c:'k8s-exp-info' },
    { d:2900, t:'✓ Rollback was a success! — Revision 4 생성 (내용은 Revision 2와 동일)', c:'k8s-exp-good' },
    { d:3400, t:'✓ Pod가 이전 버전으로 재생성, 서비스 복구 완료', c:'k8s-exp-good' },
    { d:3900, t:'💡 롤백 후 원인 분석: values 오타? 호환성 문제? 이미지 버그?', c:'k8s-exp-info' },
  ];

  steps.forEach(function(s) {
    k8sHelmScenarioTimers.push(setTimeout(function() {
      k8sHelmAddStep(s.t, s.c);
    }, s.d));
  });
}

/* ================================================================
   6. INIT ON LOAD
   ================================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize deploy demo if present
  if (document.getElementById('k8s-deploy-pods')) {
    k8sRenderDeploy();
  }
  // Initialize storage demo if present
  if (document.getElementById('k8s-storage-pv-box')) {
    k8sRenderStorage();
  }
});
