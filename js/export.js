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
      applyImportedData(data);
      alert('データを読み込みました。');
    } catch(err) {
      alert('読み込みに失敗しました: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// JSON文字列を直接取り込む（JSONPに依存しない確実な読込パス）
function importJSONFromText() {
  const ta = document.getElementById('pasteJsonText');
  const raw = (ta?.value || '').trim();
  if (!raw) { alert('JSON テキストを貼り付けてください。'); return; }
  let data;
  try {
    data = JSON.parse(raw);
  } catch(err) {
    alert('JSONとして解釈できませんでした：' + err.message);
    return;
  }
  try {
    applyImportedData(data);
    if (ta) ta.value = '';
    alert('JSONを読み込みました。');
  } catch(err) {
    alert('読み込みに失敗しました: ' + err.message);
  }
}

// 共通：パース済みオブジェクトを状態に反映
function applyImportedData(data) {
  // applyRemoteData がカタログ・タスク・smx・slog すべてを正規化込みで取り込む
  applyRemoteData(data);
  // 設定
  if (data.settings && typeof data.settings === 'object') {
    const dc = document.getElementById('dailyCap');
    const wc = document.getElementById('weeklyCap');
    if (dc && data.settings.daily  !== undefined) dc.value = data.settings.daily;
    if (wc && data.settings.weekly !== undefined) wc.value = data.settings.weekly;
  }
  // ID再採番
  if (Array.isArray(tasks) && tasks.length) {
    const max = Math.max(...tasks.map(t => Number(t.id) || 0));
    if (Number.isFinite(max) && max + 1 > nid) nid = max + 1;
  }
  save();
  saveSettings();
  refreshAllContentFromState();
}
