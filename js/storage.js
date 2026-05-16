// ==================== STORAGE (localStorage) ====================

function saveDataLocalOnly() {
  try {
    localStorage.setItem('csm_tasks', JSON.stringify(tasks));
    localStorage.setItem('csm_nid',   String(nid));
    localStorage.setItem('csm_smx',   JSON.stringify(smxData));
    localStorage.setItem('csm_slog',  JSON.stringify(slog));
    localStorage.setItem('csm_slogN', String(slogN));
  } catch(e) {}
}

function save() {
  saveDataLocalOnly();
  scheduleSheetsSync(); // Sheets へデバウンス同期
}

function load() {
  try {
    const t = localStorage.getItem('csm_tasks');
    if (t) tasks = JSON.parse(t).map(normalizeTaskShape);
    const n = localStorage.getItem('csm_nid');
    if (n) nid = parseInt(n);
    const s = localStorage.getItem('csm_smx');
    if (s) smxData = JSON.parse(s);
    const sl = localStorage.getItem('csm_slog');
    if (sl) slog = JSON.parse(sl);
    const sn = localStorage.getItem('csm_slogN');
    if (sn) slogN = parseInt(sn);
  } catch(e) {}
}

// 旧形式（deadline のみ）から新形式（start/end）への変換も行う
function normalizeTaskShape(t) {
  const x = t && typeof t === 'object' ? t : {};
  const out = {
    id: Number.isFinite(x.id) ? x.id : (nid++),
    title: String(x.title || '無題タスク'),
    category: x.category || (categoryMaster[0]?.key || 'Operational'),
    urgency: Boolean(x.urgency),
    importance: Boolean(x.importance), // 既定 false
    effort: Number.isFinite(Number(x.effort)) ? Number(x.effort) : 1,
    status: ['todo','inprogress','done'].includes(x.status) ? x.status : 'todo',
    owners: Array.isArray(x.owners) ? x.owners.slice() : (x.owner ? [String(x.owner)] : ['自分']),
    tags: Array.isArray(x.tags) ? x.tags.slice() : [],
    progress: Math.max(0, Math.min(100, Number(x.progress) || 0)),
    start: x.start || '',
    end:   x.end   || x.deadline || '' // 旧 deadline は end に流し込む
  };
  return out;
}

function saveSettingsLocalOnly() {
  try {
    const dc = document.getElementById('dailyCap');
    const wc = document.getElementById('weeklyCap');
    if (dc) localStorage.setItem('csm_dailyCap',  dc.value);
    if (wc) localStorage.setItem('csm_weeklyCap', wc.value);
    // マスタ
    localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categoryMaster));
    localStorage.setItem(KEY_OWNERS,     JSON.stringify(ownerMaster));
    localStorage.setItem(KEY_TAGS,       JSON.stringify(tagMaster));
  } catch(e) {}
}

function saveSettings() {
  saveSettingsLocalOnly();
  scheduleSheetsSync();
}

function loadSettings() {
  try {
    const dc = localStorage.getItem('csm_dailyCap');
    const wc = localStorage.getItem('csm_weeklyCap');
    const dcEl = document.getElementById('dailyCap');
    const wcEl = document.getElementById('weeklyCap');
    if (dc && dcEl) dcEl.value = dc;
    if (wc && wcEl) wcEl.value = wc;
    // マスタ
    const c = localStorage.getItem(KEY_CATEGORIES);
    if (c) {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed) && parsed.length) categoryMaster = parsed;
    }
    const o = localStorage.getItem(KEY_OWNERS);
    if (o) {
      const parsed = JSON.parse(o);
      if (Array.isArray(parsed)) ownerMaster = parsed.map(String);
    }
    const g = localStorage.getItem(KEY_TAGS);
    if (g) {
      const parsed = JSON.parse(g);
      if (Array.isArray(parsed)) tagMaster = parsed.map(String);
    }
  } catch(e) {}
}
