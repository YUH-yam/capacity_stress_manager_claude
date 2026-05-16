// ==================== CONFIG & GLOBAL STATE ====================
// 全モジュールが参照する設定値と、アプリ全体の状態を保持。

// ----- マスタの初期値（設定タブで自由に追加・編集・削除できる） -----
const DEFAULT_CATEGORIES = [
  { key: 'Strategic',   label: '戦略',           color: '#1D9E75' },
  { key: 'Technical',   label: '技術',           color: '#378ADD' },
  { key: 'People',      label: 'ピープル',       color: '#D4537E' },
  { key: 'Operational', label: 'オペレーション', color: '#888780' },
  { key: 'External',    label: '外部対応',       color: '#BA7517' }
];
const DEFAULT_OWNERS = ['自分','マネージャー','リーダー','メンバー1','メンバー2','メンバー3'];
const DEFAULT_TAGS   = ['資料作成','データ分析','内部調整','外部対応','その他'];

// ----- ストレスケアの設定（反転：5=良い、1=悪い） -----
const LOCS = ['職場','LITALICO','家','移動中','その他'];
const AREAS = ['体調','メンタル','脳・集中','エネルギー','睡眠'];
// 色：5=緑（良い）、1=赤（悪い）
const SC = { 5: '#1D9E75', 4: '#5BB082', 3: '#EF9F27', 2: '#D85A30', 1: '#E24B4A' };
// ラベル
const SL = { 5: '非常に良い', 4: '良い', 3: '普通', 2: '悪い', 1: '非常に悪い' };
// 要ケア閾値：これ以下のスコアを「要ケア」とする
const STRESS_ALERT_MAX = 2;
// 既定の初期スコア（中央値）
const STRESS_DEFAULT_SCORE = 3;

// ----- 動的マスタ（localStorage / Sheets から復元・編集可） -----
let categoryMaster = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
let ownerMaster    = DEFAULT_OWNERS.slice();
let tagMaster      = DEFAULT_TAGS.slice();

// 旧コードからの互換用ヘルパ（CATS / CAT_COLORS をその都度組み立てる）
function getCatLabelMap() {
  const m = {};
  categoryMaster.forEach(c => { m[c.key] = c.label; });
  return m;
}
function getCatColorMap() {
  const m = {};
  categoryMaster.forEach(c => { m[c.key] = c.color; });
  return m;
}
function categoryKeys() {
  return categoryMaster.map(c => c.key);
}
function findCategoryByKey(key) {
  return categoryMaster.find(c => c.key === key) || null;
}

// ----- データ初期値 -----
function defaultStress() {
  const d = {};
  LOCS.forEach(loc => AREAS.forEach(area => {
    d[`${loc}_${area}`] = { score: STRESS_DEFAULT_SCORE, note: '', ts: todayStr() };
  }));
  return d;
}

// ----- 工数ヘルパ（進捗率で按分） -----
// - effort: タスクに設定された総工数（h）
// - progress: 達成率（0〜100）
// - remainingEffort: まだ残っている工数 = effort × (1 - progress/100)
// - doneEffort: 既に消化した工数 = effort × (progress/100)
function remainingEffort(t) {
  const eff  = Number((t && t.effort) || 0);
  const prog = Math.max(0, Math.min(100, Number((t && t.progress) || 0)));
  return Math.max(0, eff * (1 - prog / 100));
}
function doneEffort(t) {
  const eff  = Number((t && t.effort) || 0);
  const prog = Math.max(0, Math.min(100, Number((t && t.progress) || 0)));
  return Math.max(0, eff * (prog / 100));
}

function todayStr() {
  const n = new Date();
  return `${n.getMonth()+1}/${n.getDate()} ${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}`;
}

// ----- グローバルなアプリ状態 -----
// tasks[*]: { id, title, category, urgency, importance, effort, status, owners, tags, progress, start, end }
let tasks = [{
  id: 1,
  title: 'Q2プロダクトロードマップ策定',
  category: 'Strategic',
  urgency: false,
  importance: false, // 重要は既定OFF
  effort: 4.0,
  status: 'todo',
  owners: ['自分'],
  tags: [],
  progress: 0,
  start: '',
  end: ''
}];
let nid = 2;
let taskFilter = 'all';
let smxData = defaultStress();
let slog = [];
let slogN = 1;
let selCell = null, selScore = null;
let chartInst = null;

// drag state
let dragSrc = null;

// マスタ用 storage キー
const KEY_CATEGORIES = 'csm_categories';
const KEY_OWNERS     = 'csm_owners';
const KEY_TAGS       = 'csm_tags';
