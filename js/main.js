// ==================== MAIN (init / wiring) ====================

// ----- 日付表示 -----
const WDAYS = ['日','月','火','水','木','金','土'];
(function setDateHeader() {
  const nd = new Date();
  const el = document.getElementById('dateDisp');
  if (el) el.textContent = `${nd.getFullYear()}年${nd.getMonth()+1}月${nd.getDate()}日（${WDAYS[nd.getDay()]}）`;
})();

// ----- タブ切り替え -----
function sw(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('p-' + tab)?.classList.add('active');
  document.querySelectorAll('.tab').forEach(btn => {
    if (btn.dataset.tab === tab) btn.classList.add('active');
  });
  if (tab === 'dash')     { updateMetrics(); renderMatrix(); renderChart(); renderDashStress(); }
  if (tab === 'tasks')    { renderTaskList(); }
  if (tab === 'wbs')      { renderWBS(); }
  if (tab === 'stress')   { updateStressMeta(); renderSmx(); renderSlog(); }
  if (tab === 'settings') { renderSettingsLists(); }
}

// ----- 全体再描画（他モジュールから呼ばれる） -----
function ra() {
  refreshAllContentFromState();
}

// ----- イベント結線 -----
function wireEvents() {
  // タブ
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => sw(btn.dataset.tab));
  });
  // フィルタ
  document.querySelectorAll('.fbtn').forEach(btn => {
    btn.addEventListener('click', () => sf(btn.dataset.filter));
  });
  // キャパシティ
  ['dailyCap', 'weeklyCap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { saveSettings(); ra(); });
  });
  // 進捗スライダ（追加フォーム）
  const tProg = document.getElementById('tProgress');
  if (tProg) tProg.addEventListener('input', () => {
    document.getElementById('tProgressVal').textContent = tProg.value + '%';
  });
  // タスク追加
  document.getElementById('addTaskBtn')?.addEventListener('click', addTask);
  // WBS印刷
  document.getElementById('printWbsBtn')?.addEventListener('click', printWBS);
  // ストレス保存
  document.getElementById('saveStressBtn')?.addEventListener('click', saveStress);
  document.getElementById('closeEditBtn')?.addEventListener('click', closeEdit);
  // GAS
  document.getElementById('saveGasUrlBtn')?.addEventListener('click', saveGasUrl);
  document.getElementById('clearGasUrlBtn')?.addEventListener('click', clearGasUrl);
  document.getElementById('reloadBtn')?.addEventListener('click', reloadFromSheets);
  document.getElementById('forceSyncBtn')?.addEventListener('click', forceSyncToSheets);
  // 出力
  document.getElementById('printAllBtn')?.addEventListener('click', printAll);
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);
  document.getElementById('openImportBtn')?.addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile')?.addEventListener('change', importJSON);
  // JSON テキスト貼り付け読込
  document.getElementById('importJsonTextBtn')?.addEventListener('click', importJSONFromText);
  document.getElementById('clearPasteJsonBtn')?.addEventListener('click', () => {
    const ta = document.getElementById('pasteJsonText');
    if (ta) ta.value = '';
  });
  // 設定タブ
  document.getElementById('addCatBtn')?.addEventListener('click', addCat);
  document.getElementById('addOwnerBtn')?.addEventListener('click', addOwner);
  document.getElementById('addTagBtn')?.addEventListener('click', addTag);
  document.getElementById('resetMastersBtn')?.addEventListener('click', resetMasters);
}

// ----- 初期化 -----
function init() {
  loadSettings(); // マスタとキャパシティ
  load();          // タスク／ストレス／ログ
  loadGasUrl();
  wireEvents();
  // フォームの選択肢を構築
  renderCategorySelect();
  renderOwnerChecks();
  renderTagChecks();
  // 初期描画
  ra();

  // Sheets から最新データを非同期取得
  (async () => {
    if (!gasUrl) return;
    setSyncUI('loading');
    const data = await loadFromSheets();
    if (data) {
      applyRemoteData(data);
      saveDataLocalOnly();
      saveSettingsLocalOnly();
      refreshAllContentFromState();
      setSyncUI('synced');
    } else {
      setSyncUI('idle', 'Sheets設定済み');
    }
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ----- Service Worker (PWA) -----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW登録失敗:', err);
    });
  });
}
