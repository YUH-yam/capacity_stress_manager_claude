// ==================== SETTINGS (Master data CRUD) ====================
// カテゴリ／担当／項目 の追加・編集・削除・並び替え

function renderSettingsLists() {
  renderCatList();
  renderOwnerList();
  renderTagList();
}

// ----- カテゴリ -----
function renderCatList() {
  const el = document.getElementById('catList'); if (!el) return;
  el.innerHTML = categoryMaster.map((c, idx) => `
    <div class="setting-row" data-idx="${idx}">
      <span class="swatch" style="background:${c.color};" title="色を変更"
        onclick="document.getElementById('cat-color-${idx}').click()"></span>
      <input type="color" id="cat-color-${idx}" value="${c.color}" style="display:none;"
        onchange="updateCat(${idx},'color',this.value)">
      <input class="name-edit" type="text" value="${escapeHTML(c.label)}"
        onchange="updateCat(${idx},'label',this.value)">
      <div class="move-btns">
        <button class="sm" onclick="moveCat(${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="sm" onclick="moveCat(${idx},1)" ${idx===categoryMaster.length-1?'disabled':''}>↓</button>
      </div>
      <button class="sm danger" onclick="deleteCat(${idx})">削除</button>
    </div>
  `).join('');
}

function updateCat(idx, field, value) {
  if (!categoryMaster[idx]) return;
  const v = String(value || '').trim();
  if (field === 'label') {
    if (!v) { alert('カテゴリ名は空にできません。'); renderCatList(); return; }
    categoryMaster[idx].label = v;
  } else if (field === 'color') {
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    categoryMaster[idx].color = v;
  }
  saveSettings();
  refreshAllContentFromState();
}

function moveCat(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= categoryMaster.length) return;
  const tmp = categoryMaster[idx];
  categoryMaster[idx] = categoryMaster[j];
  categoryMaster[j] = tmp;
  saveSettings();
  refreshAllContentFromState();
}

function deleteCat(idx) {
  const c = categoryMaster[idx]; if (!c) return;
  const inUse = tasks.filter(t => t.category === c.key).length;
  let msg = `カテゴリ「${c.label}」を削除します。`;
  if (inUse) msg += `\n\n${inUse}件のタスクがこのカテゴリを使用中です。\nタスクは削除されませんが、カテゴリ表示はキー名のままになります。`;
  msg += '\n続行しますか？';
  if (!confirm(msg)) return;
  categoryMaster.splice(idx, 1);
  if (!categoryMaster.length) {
    alert('カテゴリは最低1つ必要です。既定値を1件復元しました。');
    categoryMaster.push({ key: 'General', label: '一般', color: '#888780' });
  }
  saveSettings();
  refreshAllContentFromState();
}

function addCat() {
  const nameEl = document.getElementById('newCatName');
  const colorEl = document.getElementById('newCatColor');
  const name = (nameEl?.value || '').trim();
  if (!name) { nameEl?.focus(); return; }
  const color = colorEl?.value || '#888780';
  // ユニークなkey
  let base = name.replace(/\s+/g,'_');
  let key = base;
  let i = 2;
  while (categoryMaster.some(c => c.key === key)) { key = base + '_' + (i++); }
  categoryMaster.push({ key, label: name, color });
  if (nameEl) nameEl.value = '';
  if (colorEl) colorEl.value = '#1D9E75';
  saveSettings();
  refreshAllContentFromState();
}

// ----- 担当 -----
function renderOwnerList() {
  const el = document.getElementById('ownerList'); if (!el) return;
  el.innerHTML = ownerMaster.map((o, idx) => `
    <div class="setting-row" data-idx="${idx}">
      <input class="name-edit" type="text" value="${escapeHTML(o)}"
        onchange="updateOwner(${idx},this.value)">
      <div class="move-btns">
        <button class="sm" onclick="moveOwner(${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="sm" onclick="moveOwner(${idx},1)" ${idx===ownerMaster.length-1?'disabled':''}>↓</button>
      </div>
      <button class="sm danger" onclick="deleteOwner(${idx})">削除</button>
    </div>
  `).join('');
}
function updateOwner(idx, value) {
  const v = String(value || '').trim();
  if (!v) { alert('担当名は空にできません。'); renderOwnerList(); return; }
  if (ownerMaster.some((o, i) => i !== idx && o === v)) {
    alert('同名の担当が既に存在します。');
    renderOwnerList();
    return;
  }
  const old = ownerMaster[idx];
  ownerMaster[idx] = v;
  // タスクのowners配列も差し替え
  tasks.forEach(t => {
    if (Array.isArray(t.owners)) {
      t.owners = t.owners.map(x => x === old ? v : x);
    }
  });
  save();
  saveSettings();
  refreshAllContentFromState();
}
function moveOwner(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= ownerMaster.length) return;
  const t = ownerMaster[idx];
  ownerMaster[idx] = ownerMaster[j];
  ownerMaster[j] = t;
  saveSettings();
  refreshAllContentFromState();
}
function deleteOwner(idx) {
  const name = ownerMaster[idx]; if (!name) return;
  const inUse = tasks.filter(t => (t.owners||[]).includes(name)).length;
  let msg = `担当「${name}」を削除します。`;
  if (inUse) msg += `\n\n${inUse}件のタスクがこの担当を持っています。\nタスクの担当からも除去します。`;
  msg += '\n続行しますか？';
  if (!confirm(msg)) return;
  ownerMaster.splice(idx, 1);
  tasks.forEach(t => {
    if (Array.isArray(t.owners)) {
      t.owners = t.owners.filter(x => x !== name);
      if (!t.owners.length) t.owners = [ownerMaster[0] || '自分'];
    }
  });
  save();
  saveSettings();
  refreshAllContentFromState();
}
function addOwner() {
  const inp = document.getElementById('newOwnerName');
  const name = (inp?.value || '').trim();
  if (!name) { inp?.focus(); return; }
  if (ownerMaster.includes(name)) { alert('同名の担当が既に存在します。'); return; }
  ownerMaster.push(name);
  if (inp) inp.value = '';
  saveSettings();
  refreshAllContentFromState();
}

// ----- 項目（タグ） -----
function renderTagList() {
  const el = document.getElementById('tagList'); if (!el) return;
  el.innerHTML = tagMaster.map((g, idx) => `
    <div class="setting-row" data-idx="${idx}">
      <input class="name-edit" type="text" value="${escapeHTML(g)}"
        onchange="updateTag(${idx},this.value)">
      <div class="move-btns">
        <button class="sm" onclick="moveTag(${idx},-1)" ${idx===0?'disabled':''}>↑</button>
        <button class="sm" onclick="moveTag(${idx},1)" ${idx===tagMaster.length-1?'disabled':''}>↓</button>
      </div>
      <button class="sm danger" onclick="deleteTag(${idx})">削除</button>
    </div>
  `).join('');
}
function updateTag(idx, value) {
  const v = String(value || '').trim();
  if (!v) { alert('項目名は空にできません。'); renderTagList(); return; }
  if (tagMaster.some((g, i) => i !== idx && g === v)) {
    alert('同名の項目が既に存在します。');
    renderTagList();
    return;
  }
  const old = tagMaster[idx];
  tagMaster[idx] = v;
  tasks.forEach(t => {
    if (Array.isArray(t.tags)) {
      t.tags = t.tags.map(x => x === old ? v : x);
    }
  });
  save();
  saveSettings();
  refreshAllContentFromState();
}
function moveTag(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= tagMaster.length) return;
  const t = tagMaster[idx];
  tagMaster[idx] = tagMaster[j];
  tagMaster[j] = t;
  saveSettings();
  refreshAllContentFromState();
}
function deleteTag(idx) {
  const name = tagMaster[idx]; if (!name) return;
  const inUse = tasks.filter(t => (t.tags||[]).includes(name)).length;
  let msg = `項目「${name}」を削除します。`;
  if (inUse) msg += `\n\n${inUse}件のタスクがこの項目を持っています。\nタスクの項目からも除去します。`;
  msg += '\n続行しますか？';
  if (!confirm(msg)) return;
  tagMaster.splice(idx, 1);
  tasks.forEach(t => {
    if (Array.isArray(t.tags)) {
      t.tags = t.tags.filter(x => x !== name);
    }
  });
  save();
  saveSettings();
  refreshAllContentFromState();
}
function addTag() {
  const inp = document.getElementById('newTagName');
  const name = (inp?.value || '').trim();
  if (!name) { inp?.focus(); return; }
  if (tagMaster.includes(name)) { alert('同名の項目が既に存在します。'); return; }
  tagMaster.push(name);
  if (inp) inp.value = '';
  saveSettings();
  refreshAllContentFromState();
}

// ----- マスタ初期化 -----
function resetMasters() {
  if (!confirm('マスタ（カテゴリ・担当・項目）を初期状態に戻します。よろしいですか？\n\nタスクや記録は削除されません。')) return;
  categoryMaster = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  ownerMaster    = DEFAULT_OWNERS.slice();
  tagMaster      = DEFAULT_TAGS.slice();
  saveSettings();
  refreshAllContentFromState();
  alert('マスタを初期化しました。');
}
