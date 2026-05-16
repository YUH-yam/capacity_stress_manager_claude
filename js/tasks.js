// ==================== TASKS ====================

function sf(f) {
  taskFilter = f;
  ['all','self','del','done'].forEach(id => {
    document.getElementById('f-'+id)?.classList.toggle('active', id === f);
  });
  renderTaskList();
}

// 日付ユーティリティ
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  return d;
}
function diffDays(a, b) {
  return Math.ceil((a - b) / 86400000);
}
function fmt(s) { return s ? s.replace(/-/g, '/') : ''; }

// 期間（開始〜終了）の表示文字列とスタイル
function rangeText(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  const today = new Date(); today.setHours(0,0,0,0);

  if (!s && !e) return { text: '', style: '' };

  // 終了日基準で警告色を決める（無ければ開始日）
  const ref = e || s;
  const diff = diffDays(ref, today);
  let style = 'color:var(--text2);';
  let prefix = '📅';
  if (e && diff < 0)      { style = 'color:#c44;font-weight:500;'; prefix = '⚠️'; }
  else if (e && diff <= 3) { style = 'color:#b45309;font-weight:500;'; prefix = '⏰'; }

  let text = '';
  if (s && e) {
    if (start === end) text = `${prefix} ${fmt(start)}`;
    else text = `${prefix} ${fmt(start)} 〜 ${fmt(end)}`;
  } else if (s) {
    text = `▶ ${fmt(start)} 〜`;
    style = 'color:var(--text2);';
    prefix = '▶';
  } else if (e) {
    text = `${prefix} 〜 ${fmt(end)}`;
  }
  if (e && diff < 0) text += `（${Math.abs(diff)}日超過）`;
  else if (e && diff === 0) text += '（今日）';
  else if (e && diff > 0 && diff <= 3) text += `（あと${diff}日）`;
  return { text, style };
}

function renderTaskList() {
  let f = tasks;
  if (taskFilter === 'self')      f = tasks.filter(t => (t.owners || []).includes('自分') && t.status !== 'done');
  else if (taskFilter === 'del')  f = tasks.filter(t => !(t.owners || []).includes('自分') && t.status !== 'done');
  else if (taskFilter === 'done') f = tasks.filter(t => t.status === 'done');
  else f = tasks.filter(t => t.status !== 'done');

  const el = document.getElementById('taskList'); if (!el) return;
  if (!f.length) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text2);">タスクがありません</div>'; return; }

  const CATS = getCatLabelMap();
  const CAT_COLORS = getCatColorMap();
  const stc = { todo:'#378ADD', inprogress:'#1D9E75', done:'#888780' };

  el.innerHTML = f.map(t => {
    const owners = t.owners || [];
    const tagsArr = t.tags || [];
    const prog = t.progress != null ? t.progress : 0;
    const progCol = prog >= 100 ? '#888780' : prog >= 60 ? '#1D9E75' : prog >= 30 ? '#EF9F27' : '#378ADD';
    const catColor = CAT_COLORS[t.category] || '#888';
    const catLabel = CATS[t.category] || t.category;
    const rng = rangeText(t.start, t.end);
    return `<div class="task-item" draggable="true" data-id="${t.id}"
      ondragstart="dStart(event,${t.id})" ondragover="dOver(event)" ondrop="dDrop(event,${t.id})" ondragend="dEnd(event)">
      <div class="task-drag" title="ドラッグして並び替え">⠿</div>
      <div class="task-dot" style="background:${stc[t.status]};"></div>
      <div class="task-body">
        <div class="task-title" style="${t.status==='done'?'text-decoration:line-through;opacity:.5;':''}">${escapeHTML(t.title)}</div>
        <div class="task-meta">
          <span class="badge" style="background:${catColor}22;color:${catColor};">${escapeHTML(catLabel)}</span>
          ${t.urgency    ? '<span class="badge" style="background:#fff0f0;color:#c44;">緊急</span>' : ''}
          ${t.importance ? '<span class="badge" style="background:#eff6ff;color:#2563eb;">重要</span>' : ''}
          <span style="font-size:11px;color:var(--text2);">${Number(t.effort).toFixed(1)}h</span>
          ${owners.map(o => `<span class="badge" style="background:var(--bg2);color:var(--text2);border:1px solid var(--border);">👤${escapeHTML(o)}</span>`).join('')}
          ${tagsArr.map(tg => `<span class="badge" style="background:#f0f0ff;color:#5050bb;">🏷${escapeHTML(tg)}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;">
          <div class="task-prog-bar" style="flex:1;"><div class="task-prog-fill" style="width:${prog}%;background:${progCol};"></div></div>
          <span style="font-size:10px;color:${progCol};font-weight:600;min-width:30px;">${prog}%</span>
        </div>
        ${rng.text ? `<div class="task-deadline" style="${rng.style}">${rng.text}</div>` : ''}
        <div class="dates-edit no-print" id="dt-edit-${t.id}" style="display:none;">
          <div><span style="font-size:11px;color:var(--text2);">開始:</span><input type="date" value="${t.start||''}" id="dt-start-${t.id}"></div>
          <div><span style="font-size:11px;color:var(--text2);">終了:</span><input type="date" value="${t.end||''}" id="dt-end-${t.id}"></div>
          <button class="sm" onclick="saveDates(${t.id})">保存</button>
          <button class="sm" onclick="toggleDatesEdit(${t.id})">閉じる</button>
        </div>
        <div class="flags-edit no-print" id="fg-edit-${t.id}" style="display:none;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;">
            <input type="checkbox" id="fg-urg-${t.id}" ${t.urgency?'checked':''}> 緊急
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;">
            <input type="checkbox" id="fg-imp-${t.id}" ${t.importance?'checked':''}> 重要
          </label>
          <button class="sm" onclick="saveFlags(${t.id})">保存</button>
          <button class="sm" onclick="toggleFlagsEdit(${t.id})">閉じる</button>
        </div>
        <div class="effort-edit-row no-print" id="ef-edit-${t.id}" style="display:none;">
          <span style="font-size:11px;color:var(--text2);">工数:</span>
          <input type="number" min="0.1" max="40" step="0.1" value="${Number(t.effort).toFixed(1)}" id="ef-input-${t.id}" style="width:64px;">
          <span style="font-size:11px;color:var(--text2);">h</span>
          <button class="sm" onclick="saveEffort(${t.id})">保存</button>
          <button class="sm" onclick="toggleEffortEdit(${t.id})">閉じる</button>
        </div>
        <div class="prog-edit-row no-print" id="pg-edit-${t.id}" style="display:none;">
          <span style="font-size:11px;color:var(--text2);">進捗:</span>
          <input type="range" min="0" max="100" step="5" value="${prog}" id="pg-input-${t.id}" style="flex:1;accent-color:var(--green);"
            oninput="document.getElementById('pg-val-${t.id}').textContent=this.value+'%'">
          <span id="pg-val-${t.id}" style="font-size:11px;color:var(--text2);min-width:32px;">${prog}%</span>
          <button class="sm" onclick="saveProgress(${t.id})">保存</button>
          <button class="sm" onclick="toggleProgressEdit(${t.id})">閉じる</button>
        </div>
      </div>
      <div class="task-actions no-print">
        <select onchange="chgSt(${t.id},this.value)" style="font-size:11px;padding:2px 4px;min-height:28px;">
          <option value="todo"${t.status==='todo'?' selected':''}>未着手</option>
          <option value="inprogress"${t.status==='inprogress'?' selected':''}>進行中</option>
          <option value="done"${t.status==='done'?' selected':''}>完了</option>
        </select>
        <button class="sm" onclick="toggleProgressEdit(${t.id})">📊 進捗</button>
        <button class="sm" onclick="toggleEffortEdit(${t.id})">⏱ 工数</button>
        <button class="sm" onclick="toggleDatesEdit(${t.id})">📅 期間</button>
        <button class="sm" onclick="toggleFlagsEdit(${t.id})">🚩 フラグ</button>
        <button class="sm danger" onclick="delTask(${t.id})">削除</button>
      </div>
    </div>`;
  }).join('');
}

function toggleDatesEdit(id) {
  const el = document.getElementById('dt-edit-'+id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}
function toggleFlagsEdit(id) {
  const el = document.getElementById('fg-edit-'+id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}
function toggleEffortEdit(id) {
  const el = document.getElementById('ef-edit-'+id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}
function toggleProgressEdit(id) {
  const el = document.getElementById('pg-edit-'+id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function saveDates(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const s = document.getElementById('dt-start-'+id);
  const e = document.getElementById('dt-end-'+id);
  if (s) t.start = s.value;
  if (e) t.end   = e.value;
  // 開始 > 終了 の場合は警告
  if (t.start && t.end && t.start > t.end) {
    alert('開始日が終了日より後になっています。値を確認してください。');
  }
  save(); renderTaskList(); ra();
}

function saveFlags(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const u = document.getElementById('fg-urg-'+id);
  const i = document.getElementById('fg-imp-'+id);
  if (u) t.urgency    = u.checked;
  if (i) t.importance = i.checked;
  save(); renderTaskList(); ra();
}

function saveEffort(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const inp = document.getElementById('ef-input-'+id);
  if (inp) {
    const v = parseFloat(inp.value);
    if (Number.isFinite(v) && v > 0) t.effort = Math.round(v * 10) / 10;
  }
  save(); renderTaskList(); ra();
}

function saveProgress(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const inp = document.getElementById('pg-input-'+id);
  if (inp) t.progress = parseInt(inp.value);
  save(); renderTaskList(); ra();
}

function chgSt(id, s) {
  const t = tasks.find(x => x.id === id);
  if (t) { t.status = s; save(); renderTaskList(); ra(); }
}

function delTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  save(); renderTaskList(); ra();
}

// ----- 追加フォーム関連 -----
function toggleMck(lbl) {
  const cb = lbl.querySelector('input');
  cb.checked = !cb.checked;
  lbl.classList.toggle('checked', cb.checked);
}
function readMck(groupId) {
  return [...document.querySelectorAll(`#${groupId} input:checked`)].map(c => c.value);
}
function resetMck(groupId, defaults = []) {
  document.querySelectorAll(`#${groupId} .mck-label`).forEach(lbl => {
    const cb = lbl.querySelector('input');
    cb.checked = defaults.includes(cb.value);
    lbl.classList.toggle('checked', cb.checked);
  });
}

function renderCategorySelect() {
  const sel = document.getElementById('tCat'); if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = categoryMaster
    .map(c => `<option value="${escapeHTML(c.key)}">${escapeHTML(c.label)}</option>`)
    .join('');
  if (categoryKeys().includes(prev)) sel.value = prev;
}

function renderOwnerChecks() {
  const wrap = document.getElementById('tOwners'); if (!wrap) return;
  // 現在のチェック状態を保持
  const checked = readMck('tOwners');
  wrap.innerHTML = ownerMaster.map(o => {
    const isChecked = checked.length === 0 ? (o === '自分') : checked.includes(o);
    return `<label class="mck-label${isChecked?' checked':''}" onclick="toggleMck(this)"><input type="checkbox" value="${escapeHTML(o)}" ${isChecked?'checked':''}>${escapeHTML(o)}</label>`;
  }).join('');
}

function renderTagChecks() {
  const wrap = document.getElementById('tTags'); if (!wrap) return;
  const checked = readMck('tTags');
  wrap.innerHTML = tagMaster.map(tg =>
    `<label class="mck-label${checked.includes(tg)?' checked':''}" onclick="toggleMck(this)"><input type="checkbox" value="${escapeHTML(tg)}" ${checked.includes(tg)?'checked':''}>${escapeHTML(tg)}</label>`
  ).join('');
}

function addTask() {
  const title = document.getElementById('tTitle').value.trim();
  if (!title) { document.getElementById('tTitle').focus(); return; }
  const effortRaw = parseFloat(document.getElementById('tEffort').value);
  const effort = Number.isFinite(effortRaw) && effortRaw > 0 ? Math.round(effortRaw * 10) / 10 : 1.0;
  const start = document.getElementById('tStart').value;
  const end   = document.getElementById('tEnd').value;
  if (start && end && start > end) {
    alert('開始日が終了日より後になっています。値を確認してください。');
    return;
  }
  tasks.push({
    id: nid++,
    title,
    category: document.getElementById('tCat').value,
    urgency: document.getElementById('tUrgent').checked,
    importance: document.getElementById('tImportant').checked,
    effort,
    status: 'todo',
    owners: readMck('tOwners'),
    tags:   readMck('tTags'),
    progress: parseInt(document.getElementById('tProgress').value) || 0,
    start,
    end
  });
  document.getElementById('tTitle').value = '';
  document.getElementById('tUrgent').checked = false;
  document.getElementById('tImportant').checked = false; // 既定OFFのまま
  document.getElementById('tEffort').value = '1.0';
  document.getElementById('tStart').value = '';
  document.getElementById('tEnd').value = '';
  document.getElementById('tProgress').value = '0';
  document.getElementById('tProgressVal').textContent = '0%';
  resetMck('tOwners', ['自分']);
  resetMck('tTags',  []);
  save(); renderTaskList(); ra();
}

// ----- ドラッグ & ドロップ -----
function dStart(e, id) {
  dragSrc = id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function dOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function dDrop(e, targetId) {
  e.preventDefault();
  if (dragSrc === null || dragSrc === targetId) return;
  const srcIdx = tasks.findIndex(t => t.id === dragSrc);
  const tgtIdx = tasks.findIndex(t => t.id === targetId);
  if (srcIdx === -1 || tgtIdx === -1) return;
  const [removed] = tasks.splice(srcIdx, 1);
  tasks.splice(tgtIdx, 0, removed);
  save(); renderTaskList();
}
function dEnd(e) {
  dragSrc = null;
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('dragging');
    el.classList.remove('drag-over');
  });
}
