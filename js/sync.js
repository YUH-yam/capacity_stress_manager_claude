// ==================== GAS / SHEETS SYNC ====================
let gasUrl = '';
let syncTimer = null;
let isSyncing = false;

function setSyncUI(state, msg) {
  const dot  = document.getElementById('syncDot');
  const text = document.getElementById('syncText');
  const msgs = { idle:'Sheets未設定', loading:'読み込み中…', syncing:'同期中…', synced:'同期済み', error:'同期失敗' };
  if (dot)  { dot.className = 'sync-dot ' + state; }
  if (text) { text.textContent = msg || msgs[state] || state; }
}

function setGasMsg(msg, isError) {
  const el = document.getElementById('gasStatusMsg');
  if (el) { el.textContent = msg; el.style.color = isError ? 'var(--red)' : 'var(--text2)'; }
}

function normalizeGasUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const clean = raw.split('#')[0].split('?')[0].trim();
  const m = clean.match(/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(exec|dev)$/);
  if (!m) return null;
  return clean.replace(/\/dev$/, '/exec');
}

function makeGasUrlWithQuery(params) {
  if (!gasUrl) return '';
  const qs = new URLSearchParams(params || {});
  return gasUrl + (gasUrl.includes('?') ? '&' : '?') + qs.toString();
}

function loadGasUrl() {
  try {
    const stored = localStorage.getItem('csm_gas_url') || '';
    const normalized = normalizeGasUrl(stored);
    gasUrl = normalized || '';
    const inp = document.getElementById('gasUrlInput');
    if (inp && stored) inp.value = normalized || stored;
    setSyncUI(gasUrl ? 'idle' : 'idle', gasUrl ? 'Sheets設定済み' : 'Sheets未設定');
    if (stored && !normalized) setGasMsg('保存済みURLの形式を確認してください。/macros/s/.../exec のURLが必要です。', true);
  } catch(e) {}
}

function saveGasUrl() {
  const inp = document.getElementById('gasUrlInput');
  const rawUrl = inp ? inp.value.trim() : '';
  const url = normalizeGasUrl(rawUrl);
  if (url === null) {
    setGasMsg('URL が正しくありません。GAS Web App の /macros/s/.../exec URL を入力してください。', true);
    return;
  }
  gasUrl = url;
  if (inp) inp.value = url;
  try { localStorage.setItem('csm_gas_url', url); } catch(e) {}
  if (url) {
    setSyncUI('idle', 'Sheets設定済み');
    setGasMsg('URL を保存しました。今すぐ Sheets へ保存を実行してください。');
  } else {
    setSyncUI('idle', 'Sheets未設定');
    setGasMsg('URL をクリアしました。');
  }
}

function clearGasUrl() {
  gasUrl = '';
  try { localStorage.removeItem('csm_gas_url'); } catch(e) {}
  const inp = document.getElementById('gasUrlInput');
  if (inp) inp.value = '';
  setSyncUI('idle', 'Sheets未設定');
  setGasMsg('Sheets 連携を解除しました。');
}

function buildPayload() {
  return {
    tasks, smxData, slog, nid, slogN,
    masters: {
      categories: categoryMaster,
      owners:     ownerMaster,
      tags:       tagMaster
    },
    settings: {
      daily:  document.getElementById('dailyCap')?.value  || '8',
      weekly: document.getElementById('weeklyCap')?.value || '40'
    }
  };
}

function pingGasByImage() {
  if (!gasUrl) return;
  try {
    const img = new Image();
    img.style.display = 'none';
    img.onload = img.onerror = () => {
      setTimeout(() => { try { img.remove(); } catch(e) {} }, 500);
    };
    document.body.appendChild(img);
    img.src = makeGasUrlWithQuery({ action: 'ping', ts: Date.now() });
  } catch(e) {}
}

function submitToGasByHiddenForm(payload) {
  return new Promise((resolve, reject) => {
    try {
      const frameName = 'csm_gas_post_frame';
      let frame = document.getElementById(frameName);
      if (!frame) {
        frame = document.createElement('iframe');
        frame.name = frameName;
        frame.id   = frameName;
        frame.style.display = 'none';
        frame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(frame);
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = gasUrl;
      form.target = frameName;
      form.style.display = 'none';
      form.acceptCharset = 'UTF-8';

      const input = document.createElement('input');
      input.type  = 'hidden';
      input.name  = 'payload';
      input.value = payload;
      form.appendChild(input);

      const clientTs = document.createElement('input');
      clientTs.type  = 'hidden';
      clientTs.name  = 'clientTs';
      clientTs.value = new Date().toISOString();
      form.appendChild(clientTs);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try { form.remove(); } catch(e) {}
        resolve(true);
      }, 1200);
    } catch(e) {
      reject(e);
    }
  });
}

async function syncToSheets(silent) {
  if (!gasUrl || isSyncing) return false;
  isSyncing = true;
  if (!silent) setSyncUI('syncing');
  try {
    const payload = JSON.stringify(buildPayload());
    pingGasByImage();
    await submitToGasByHiddenForm(payload);
    setSyncUI('synced', '送信完了');
    return true;
  } catch(e) {
    console.error('Sheets sync failed:', e);
    setSyncUI('error', '送信失敗');
    return false;
  } finally {
    isSyncing = false;
  }
}

function loadFromSheetsByJsonp() {
  return new Promise((resolve) => {
    if (!gasUrl) { resolve(null); return; }
    const callbackName = 'csmSheetLoad_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let done = false;

    function cleanup() {
      if (done) return;
      done = true;
      try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
      try { script.remove(); } catch(e) {}
    }

    window[callbackName] = function(data) {
      cleanup();
      if (!data || data.error || !data.tasks) { resolve(null); return; }
      resolve(data);
    };
    script.onerror = function() { cleanup(); resolve(null); };
    script.src = makeGasUrlWithQuery({ action: 'load', callback: callbackName, ts: Date.now() });
    document.body.appendChild(script);
    setTimeout(() => { cleanup(); resolve(null); }, 10000);
  });
}

async function loadFromSheets() {
  return await loadFromSheetsByJsonp();
}

function scheduleSheetsSync() {
  if (!gasUrl) return;
  if (syncTimer) clearTimeout(syncTimer);
  setSyncUI('syncing', '同期待機中…');
  syncTimer = setTimeout(() => syncToSheets(false), 1500);
}

async function reloadFromSheets() {
  if (!gasUrl) { setGasMsg('先に GAS URL を設定してください。', true); return; }
  setSyncUI('loading');
  setGasMsg('スプレッドシートから読み込んでいます…');
  const data = await loadFromSheets();
  if (!data) {
    setSyncUI('error');
    setGasMsg('読み込みに失敗しました。URL・デプロイ設定を確認してください。', true);
    return;
  }
  applyRemoteData(data);
  resetTransientUiAfterRemoteLoad();
  saveDataLocalOnly();
  saveSettingsLocalOnly();
  refreshAllContentFromState();
  setSyncUI('synced');
  setGasMsg('スプレッドシートからデータを読み込み、画面全体へ反映しました。');
}

async function forceSyncToSheets() {
  if (!gasUrl) { setGasMsg('先に GAS URL を設定してください。', true); return; }
  const ok = await syncToSheets(false);
  setGasMsg(ok
    ? 'スプレッドシートへ送信しました。'
    : 'スプレッドシートへの送信に失敗しました。URL・デプロイ設定を確認してください。', !ok);
}

function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTaskForUi(task, idx) {
  const t = task && typeof task === 'object' ? task : {};
  const id = toFiniteNumber(t.id, idx + 1);
  const catKeys = categoryKeys();
  const category = catKeys.includes(t.category) ? t.category : (catKeys[0] || 'Operational');
  const owners = Array.isArray(t.owners)
    ? t.owners.map(String).filter(Boolean)
    : (t.owner ? [String(t.owner)] : ['自分']);
  const tagsArr = Array.isArray(t.tags) ? t.tags.map(String).filter(Boolean) : [];
  const progress = Math.max(0, Math.min(100, toFiniteNumber(t.progress, 0)));
  const status = ['todo','inprogress','done'].includes(t.status) ? t.status : 'todo';
  return {
    id,
    title: String(t.title || '無題タスク'),
    category,
    urgency: Boolean(t.urgency),
    importance: Boolean(t.importance), // 既定 false
    effort: Math.max(0, toFiniteNumber(t.effort, 1)),
    status,
    owners: owners.length ? owners : ['自分'],
    tags: tagsArr,
    progress,
    start: String(t.start || ''),
    end:   String(t.end   || t.deadline || '')
  };
}

function normalizeStressForUi(remote) {
  const base = defaultStress();
  const src = remote && typeof remote === 'object' ? remote : {};
  Object.keys(src).forEach(key => {
    const item = src[key];
    if (!item || typeof item !== 'object') return;
    const score = Math.max(1, Math.min(5, Math.round(toFiniteNumber(item.score, STRESS_DEFAULT_SCORE))));
    base[key] = { score, note: String(item.note || ''), ts: String(item.ts || todayStr()) };
  });
  return base;
}

function normalizeSlogForUi(remote) {
  if (!Array.isArray(remote)) return [];
  return remote.map((item, idx) => {
    const e = item && typeof item === 'object' ? item : {};
    const score = Math.max(1, Math.min(5, Math.round(toFiniteNumber(e.score, STRESS_DEFAULT_SCORE))));
    return {
      id: toFiniteNumber(e.id, idx + 1),
      loc: String(e.loc || ''),
      area: String(e.area || ''),
      score, note: String(e.note || ''), ts: String(e.ts || '')
    };
  }).filter(e => e.loc && e.area);
}

function applyRemoteData(data) {
  if (!data || typeof data !== 'object') return false;

  // マスタを先に反映（タスクの category 検証で必要）
  if (data.masters && typeof data.masters === 'object') {
    if (Array.isArray(data.masters.categories) && data.masters.categories.length) {
      categoryMaster = data.masters.categories.map(c => ({
        key: String(c.key || c.label || ''),
        label: String(c.label || c.key || ''),
        color: String(c.color || '#888888')
      })).filter(c => c.key && c.label);
    }
    if (Array.isArray(data.masters.owners)) ownerMaster = data.masters.owners.map(String);
    if (Array.isArray(data.masters.tags))   tagMaster   = data.masters.tags.map(String);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'tasks')) {
    tasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTaskForUi) : [];
  }
  if (Object.prototype.hasOwnProperty.call(data, 'smxData')) {
    smxData = normalizeStressForUi(data.smxData);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'slog')) {
    slog = normalizeSlogForUi(data.slog);
  }

  const maxTaskId = tasks.reduce((max, t) => Math.max(max, toFiniteNumber(t.id, 0)), 0);
  const remoteNid = toFiniteNumber(data.nid, maxTaskId + 1);
  nid = Math.max(remoteNid, maxTaskId + 1);

  const maxSlogId = slog.reduce((max, e) => Math.max(max, toFiniteNumber(e.id, 0)), 0);
  const remoteSlogN = toFiniteNumber(data.slogN, maxSlogId + 1);
  slogN = Math.max(remoteSlogN, maxSlogId + 1);

  if (data.settings && typeof data.settings === 'object') {
    const dc = document.getElementById('dailyCap');
    const wc = document.getElementById('weeklyCap');
    if (dc && Object.prototype.hasOwnProperty.call(data.settings, 'daily'))  dc.value = String(data.settings.daily);
    if (wc && Object.prototype.hasOwnProperty.call(data.settings, 'weekly')) wc.value = String(data.settings.weekly);
  }

  return true;
}

function resetTransientUiAfterRemoteLoad() {
  selCell = null;
  selScore = null;
  const ep = document.getElementById('editPanel');
  if (ep) ep.style.display = 'none';
}

function refreshAllContentFromState() {
  // フォームのセレクトボックスやチェック群を再生成（マスタが変わっている可能性があるため）
  renderCategorySelect();
  renderOwnerChecks();
  renderTagChecks();

  updateMetrics();
  renderMatrix();
  renderChart();
  renderDashStress();
  renderTaskList();
  renderWBS();
  updateStressMeta();
  renderSmx();
  renderSlog();
  renderSettingsLists();
}
