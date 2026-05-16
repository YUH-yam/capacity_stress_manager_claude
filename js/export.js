// ==================== EXPORT / IMPORT / PRINT ====================

function printAll() {
  // 印刷時はWBSをガント表示に強制
  const prevMode = typeof wbsViewMode !== 'undefined' ? wbsViewMode : 'gantt';
  if (typeof wbsViewMode !== 'undefined') wbsViewMode = 'gantt';
  renderWBS();
  document.body.classList.add('printing-all');
  const visiblePanels = ['p-dash','p-tasks','p-wbs','p-stress'];
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  visiblePanels.forEach(id => { document.getElementById(id)?.classList.add('active'); });
  setTimeout(() => {
    window.print();
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('p-export')?.classList.add('active');
    document.body.classList.remove('printing-all');
    if (typeof wbsViewMode !== 'undefined') {
      wbsViewMode = prevMode;
      renderWBS();
    }
  }, 200);
}

function exportJSON() {
  const data = {
    tasks, smxData, slog,
    masters: { categories: categoryMaster, owners: ownerMaster, tags: tagMaster },
    settings: {
      daily:  document.getElementById('dailyCap')?.value,
      weekly: document.getElementById('weeklyCap')?.value
    }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `csm_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importJSON(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      // マスタ
      if (data.masters && typeof data.masters === 'object') {
        if (Array.isArray(data.masters.categories) && data.masters.categories.length) {
          categoryMaster = data.masters.categories.map(c => ({
            key: String(c.key || c.label || ''),
            label: String(c.label || c.key || ''),
            color: String(c.color || '#888780')
          })).filter(c => c.key && c.label);
        }
        if (Array.isArray(data.masters.owners)) ownerMaster = data.masters.owners.map(String);
        if (Array.isArray(data.masters.tags))   tagMaster   = data.masters.tags.map(String);
      }
      // データ
      if (Array.isArray(data.tasks)) tasks = data.tasks.map(normalizeTaskForUi);
      if (data.smxData) smxData = normalizeStressForUi(data.smxData);
      if (Array.isArray(data.slog)) slog = normalizeSlogForUi(data.slog);
      // 設定
      if (data.settings) {
        const dc = document.getElementById('dailyCap');
        const wc = document.getElementById('weeklyCap');
        if (dc) dc.value = data.settings.daily  || 8;
        if (wc) wc.value = data.settings.weekly || 40;
      }
      nid = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
      save();
      saveSettings();
      refreshAllContentFromState();
      alert('データを読み込みました。');
    } catch(err) {
      alert('読み込みに失敗しました: ' + err.message);
    }
  };
  reader.readAsText(file);
}
