// ==================== WBS (Timeline) ====================

// 表示モード："gantt"（横スクロール式タイムライン） / "list"（カード一覧）
// 既定はモバイルで list、デスクトップで gantt。localStorage で記憶。
let wbsViewMode = (function () {
  try {
    const saved = localStorage.getItem('csm_wbs_view');
    if (saved === 'list' || saved === 'gantt') return saved;
  } catch(e) {}
  return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches)
    ? 'list' : 'gantt';
})();

function setWbsView(mode) {
  wbsViewMode = (mode === 'list') ? 'list' : 'gantt';
  try { localStorage.setItem('csm_wbs_view', wbsViewMode); } catch(e) {}
  renderWBS();
}

function renderWBS() {
  const el = document.getElementById('wbsContent'); if (!el) return;
  return (wbsViewMode === 'list') ? renderWBSList(el) : renderWBSGantt(el);
}

function renderWBSGantt(el) {

  const CATS = getCatLabelMap();
  const CAT_COLORS = getCatColorMap();

  const today = new Date(); today.setHours(0,0,0,0);
  const PAST_DAYS = 7;
  const FUTURE_DAYS = 28;
  const TOTAL_DAYS = PAST_DAYS + FUTURE_DAYS; // 35
  const COL_W = (100 / TOTAL_DAYS).toFixed(4); // % per day

  function pct(dayOffset) {
    return (((dayOffset + PAST_DAYS) / TOTAL_DAYS) * 100).toFixed(3);
  }
  const todayPct = parseFloat(pct(0));
  const WDAYS_SHORT = ['日','月','火','水','木','金','土'];

  // ── 3行ヘッダー ──
  let gridLines = '';
  let colBgs = '';
  let monthBand = '';
  let dayBand   = '';
  let wdayBand  = '';
  let prevMonth = -1;
  let monthStartPct = 0;

  for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const p   = parseFloat(pct(i));
    const cw  = parseFloat(COL_W);
    const isToday = i === 0;
    const isSun = d.getDay() === 0;
    const isSat = d.getDay() === 6;

    gridLines += `<div style="position:absolute;left:${p.toFixed(3)}%;top:0;bottom:0;width:1px;background:var(--border);opacity:${(isSun||isSat)?0.7:0.3};pointer-events:none;z-index:1;"></div>`;

    if (isToday) {
      colBgs += `<div style="position:absolute;left:${p.toFixed(3)}%;width:${cw.toFixed(3)}%;top:0;bottom:0;background:#ffe8e8;pointer-events:none;z-index:0;"></div>`;
    } else if (isSun || isSat) {
      colBgs += `<div style="position:absolute;left:${p.toFixed(3)}%;width:${cw.toFixed(3)}%;top:0;bottom:0;background:#f5f5f4;pointer-events:none;z-index:0;"></div>`;
    }

    const dayCol = isToday ? '#E24B4A' : isSun ? '#c44' : isSat ? '#4477cc' : 'var(--text2)';
    dayBand += `<div style="position:absolute;left:${p.toFixed(3)}%;width:${cw.toFixed(3)}%;top:33.3%;height:33.3%;display:flex;align-items:center;justify-content:center;font-size:${isToday?9:8}px;font-weight:${isToday?700:400};color:${dayCol};z-index:2;line-height:1;">${d.getDate()}</div>`;
    const wdLabel = isToday ? '今' : WDAYS_SHORT[d.getDay()];
    wdayBand += `<div style="position:absolute;left:${p.toFixed(3)}%;width:${cw.toFixed(3)}%;top:66.6%;height:33.4%;display:flex;align-items:center;justify-content:center;font-size:${isToday?9:8}px;font-weight:${isToday?700:400};color:${dayCol};z-index:2;line-height:1;">${wdLabel}</div>`;

    if (d.getMonth() !== prevMonth) {
      if (prevMonth !== -1) {
        const monthW = (p - monthStartPct).toFixed(3);
        monthBand += `<div style="position:absolute;left:${monthStartPct.toFixed(3)}%;width:${monthW}%;top:0;height:33.3%;display:flex;align-items:center;padding-left:4px;font-size:9px;font-weight:600;color:var(--text);border-right:1px solid var(--border2);z-index:2;">${prevMonth+1}月</div>`;
      }
      prevMonth = d.getMonth();
      monthStartPct = p;
    }
    if (i === FUTURE_DAYS) {
      const monthW = (p + cw - monthStartPct).toFixed(3);
      monthBand += `<div style="position:absolute;left:${monthStartPct.toFixed(3)}%;width:${monthW}%;top:0;height:33.3%;display:flex;align-items:center;padding-left:4px;font-size:9px;font-weight:600;color:var(--text);z-index:2;">${prevMonth+1}月</div>`;
    }
  }

  const todayHighlight = `<div style="position:absolute;left:${todayPct.toFixed(3)}%;width:${COL_W}%;top:0;bottom:0;background:#ffdddd;z-index:0;pointer-events:none;"></div>`;
  const todayLine = `<div style="position:absolute;left:${todayPct.toFixed(3)}%;top:0;bottom:0;width:2px;background:#E24B4A;opacity:.6;z-index:5;pointer-events:none;"></div>`;

  const stLabel = { todo:'未着手', inprogress:'進行中', done:'完了' };
  const stColor = { todo:'#378ADD', inprogress:'#1D9E75', done:'#888780' };

  let rows = '';
  let wbsNo = 1;

  Object.keys(CATS).forEach(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    if (!catTasks.length) return;
    const totalH = catTasks.reduce((s,t) => s + (Number(t.effort)||0), 0);
    const avgProg = Math.round(catTasks.reduce((s,t) => s + (t.progress||0), 0) / catTasks.length);

    rows += `<div class="wbs-tl-cat">
      <div class="wbs-tl-label" style="border-left:3px solid ${CAT_COLORS[cat]};">
        <span style="color:${CAT_COLORS[cat]};font-weight:600;font-size:11px;">■ ${escapeHTML(CATS[cat])}</span>
        <span style="font-size:10px;color:var(--text2);">${catTasks.length}件 · ${totalH.toFixed(1)}h · 平均${avgProg}%</span>
      </div>
      <div class="wbs-tl-chart" style="background:${CAT_COLORS[cat]}06;">${colBgs}${gridLines}${todayLine}</div>
    </div>`;

    catTasks.forEach(t => {
      const owners = t.owners || [];
      const prog   = t.progress != null ? t.progress : 0;
      const progCol = prog >= 100 ? '#888780' : prog >= 60 ? '#1D9E75' : prog >= 30 ? '#EF9F27' : '#378ADD';

      // 開始日・終了日からバー位置を決定
      let startOffset = -PAST_DAYS;
      let endOffset   = FUTURE_DAYS;
      let hasStart = false, hasEnd = false;

      if (t.start) {
        const sd = new Date(t.start); sd.setHours(0,0,0,0);
        const diffS = Math.round((sd - today) / 86400000);
        startOffset = Math.max(-PAST_DAYS, Math.min(FUTURE_DAYS, diffS));
        hasStart = true;
      }
      if (t.end) {
        const ed = new Date(t.end); ed.setHours(0,0,0,0);
        const diffE = Math.round((ed - today) / 86400000);
        endOffset = Math.max(-PAST_DAYS, Math.min(FUTURE_DAYS, diffE));
        hasEnd = true;
      }
      if (startOffset > endOffset) {
        // 開始>終了なら逆転して表示しないよう、エンドを開始に寄せる
        endOffset = startOffset;
      }

      let chartContent = colBgs + gridLines + todayLine;

      // 1日分の幅（%）。バー・ドット位置を「日付セルの中」に収めるために使う。
      const DAY_W = 100 / TOTAL_DAYS;
      // バーの左端 = 開始日の 0:00（= 開始日セルの左端）
      // バーの右端 = 終了日の 23:59（= 終了日セルの右端 = 翌日セルの左端）
      const barFrom = parseFloat(pct(startOffset));
      const barTo   = parseFloat(pct(endOffset)) + DAY_W;
      const barW    = Math.max(0.5, barTo - barFrom);
      const fillW   = barW * prog / 100;

      // 終了日の警告色
      let endCol = CAT_COLORS[cat] || '#888';
      let endLabel = '';
      if (hasEnd) {
        const ed = new Date(t.end); ed.setHours(0,0,0,0);
        const diff = Math.round((ed - today) / 86400000);
        if (diff < 0)       { endCol = '#E24B4A'; endLabel = `${Math.abs(diff)}日超過`; }
        else if (diff === 0){ endCol = '#EF9F27'; endLabel = '今日'; }
        else if (diff <= 3) { endCol = '#EF9F27'; endLabel = `${diff}日後`; }
        else                { endLabel = `${diff}日後`; }
      }

      chartContent += `
        <div style="position:absolute;left:${barFrom.toFixed(3)}%;width:${barW.toFixed(3)}%;height:8px;top:38%;background:${endCol}22;border-radius:4px;z-index:3;"></div>
        <div style="position:absolute;left:${barFrom.toFixed(3)}%;width:${fillW.toFixed(3)}%;height:8px;top:38%;background:${progCol}99;border-radius:4px;z-index:4;"></div>
      `;
      // 開始マーカー（◆）：開始日 0:00 を左端に固定 → マーカーは「日付セルの内側」へ右に張り出す
      if (hasStart) {
        chartContent += `<div style="position:absolute;left:${barFrom.toFixed(3)}%;top:30%;z-index:6;width:10px;height:10px;border-radius:50% 50% 50% 0;background:${CAT_COLORS[cat]};border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,.2);"></div>`;
      }
      // 終了マーカー（●）：終了日 23:59 を右端に固定 → マーカーは「日付セルの内側」へ左に張り出す
      if (hasEnd) {
        chartContent += `<div style="position:absolute;left:${barTo.toFixed(3)}%;top:26%;transform:translateX(-100%);z-index:6;width:14px;height:14px;border-radius:50%;background:${endCol};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>`;
        chartContent += `<div style="position:absolute;left:${barTo.toFixed(3)}%;top:calc(26% + 16px);transform:translateX(-100%);z-index:6;font-size:8px;color:${endCol};white-space:nowrap;font-weight:600;padding-right:2px;">${endLabel}</div>`;
      }
      // 進捗ラベル：開始位置の少し右に置き、開始マーカーと被らないようにする
      chartContent += `<div style="position:absolute;left:${barFrom.toFixed(3)}%;top:58%;font-size:8px;color:${progCol};font-weight:600;z-index:5;padding-left:${hasStart?14:0}px;">${prog}%</div>`;

      const q = t.urgency && t.importance ? 'Q1' : !t.urgency && t.importance ? 'Q2' : t.urgency ? 'Q3' : 'Q4';
      const qCol = q==='Q1'?'#c44':q==='Q2'?'#2563eb':q==='Q3'?'#b45309':'#888';

      rows += `<div class="wbs-tl-task">
        <div class="wbs-tl-label">
          <div style="display:flex;align-items:flex-start;gap:4px;">
            <span style="color:var(--text3);font-size:9px;font-family:monospace;flex-shrink:0;margin-top:1px;">${String(wbsNo++).padStart(2,'0')}</span>
            <span style="font-size:11px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>
          </div>
          <div style="display:flex;gap:4px;align-items:center;margin-top:2px;flex-wrap:wrap;">
            <span style="font-size:9px;color:${stColor[t.status]};border:1px solid ${stColor[t.status]};padding:0 3px;border-radius:2px;line-height:1.6;">${stLabel[t.status]}</span>
            <span style="font-size:9px;color:${qCol};font-weight:600;">${q}</span>
            <span style="font-size:9px;color:var(--text2);">${Number(t.effort).toFixed(1)}h</span>
          </div>
          <div style="margin-top:3px;">
            <div style="height:3px;background:var(--border);border-radius:2px;"><div style="height:3px;width:${prog}%;background:${progCol};border-radius:2px;"></div></div>
            <div style="font-size:8px;color:${progCol};font-weight:600;margin-top:1px;">${prog}%  ${owners.map(o=>`👤${escapeHTML(o)}`).join(' ')}</div>
          </div>
        </div>
        <div class="wbs-tl-chart">${chartContent}</div>
      </div>`;
    });
  });

  const totalAll = tasks.reduce((s,t) => s + (Number(t.effort)||0), 0);
  const avgProgAll = tasks.length ? Math.round(tasks.reduce((s,t) => s + (t.progress||0), 0) / tasks.length) : 0;

  el.innerHTML = `
    ${wbsToolbarHtml(totalAll, avgProgAll)}
    <div class="wbs-scroll-wrap"><div class="wbs-timeline">
      <div class="wbs-tl-header">
        <div class="wbs-tl-label" style="font-size:10px;color:var(--text2);font-weight:500;justify-content:center;align-items:center;text-align:center;">
          <div style="font-size:9px;color:var(--text3);">月</div>
          <div style="font-size:9px;color:var(--text3);">日</div>
          <div style="font-size:9px;color:var(--text3);">曜</div>
        </div>
        <div class="wbs-tl-chart" style="position:relative;">
          ${todayHighlight}${monthBand}${dayBand}${wdayBand}${gridLines}
          <div style="position:absolute;left:${todayPct.toFixed(3)}%;top:0;bottom:0;width:2px;background:#E24B4A;opacity:.8;z-index:9;"></div>
        </div>
      </div>
      ${rows}
    </div></div>
    <div class="wbs-scroll-hint no-print">← スクロールして全期間を確認 →</div>
    <div style="margin-top:10px;display:flex;gap:14px;font-size:10px;color:var(--text2);flex-wrap:wrap;">
      <span>● 終了日マーカー：<span style="color:#E24B4A;">超過</span> / <span style="color:#EF9F27;">3日以内</span> / <span style="color:#1D9E75;">通常</span></span>
      <span>◆ = 開始日</span>
      <span>進捗バー（塗り）= 進捗率</span>
      <span style="color:#E24B4A;font-weight:500;">│ = 今日</span>
    </div>`;
}

// ----- ツールバー（表示モード切替） -----
function wbsToolbarHtml(totalAll, avgProgAll) {
  return `
    <div class="wbs-toolbar no-print">
      <div class="wbs-title">
        <div style="font-size:13px;font-weight:500;">WBS <span style="font-size:11px;font-weight:400;color:var(--text2);">（7日前〜今日〜28日後）</span></div>
        <div style="font-size:11px;color:var(--text2);">総工数: <strong style="color:var(--text);">${totalAll.toFixed(1)}h</strong> · ${tasks.length}件 · 全体進捗: <strong style="color:var(--text);">${avgProgAll}%</strong></div>
      </div>
      <div class="wbs-view-toggle">
        <button class="${wbsViewMode==='list'?'active':''}" onclick="setWbsView('list')">📋 リスト</button>
        <button class="${wbsViewMode==='gantt'?'active':''}" onclick="setWbsView('gantt')">📊 ガント</button>
      </div>
    </div>`;
}

// ----- リスト表示（モバイルで見やすい一覧） -----
function renderWBSList(el) {
  const CATS = getCatLabelMap();
  const CAT_COLORS = getCatColorMap();
  const today = new Date(); today.setHours(0,0,0,0);
  const stLabel = { todo:'未着手', inprogress:'進行中', done:'完了' };
  const stColor = { todo:'#378ADD', inprogress:'#1D9E75', done:'#888780' };

  function dayLabel(dateStr, anchor) {
    if (!dateStr) return '<span style="color:var(--text3);">—</span>';
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    let col = 'var(--text2)';
    let suffix = '';
    if (anchor === 'end') {
      if (diff < 0)       { col = '#E24B4A'; suffix = `（${Math.abs(diff)}日超過）`; }
      else if (diff === 0){ col = '#EF9F27'; suffix = '（今日）'; }
      else if (diff <= 3) { col = '#EF9F27'; suffix = `（あと${diff}日）`; }
      else                { suffix = `（あと${diff}日）`; }
    } else if (anchor === 'start') {
      if (diff > 0)       { suffix = `（${diff}日後）`; }
      else if (diff === 0){ suffix = '（今日）'; }
      else                { suffix = `（${Math.abs(diff)}日前）`; }
    }
    return `<span style="color:${col};font-weight:500;">${dateStr.replace(/-/g,'/')}</span><span style="color:var(--text3);font-size:10px;">${suffix}</span>`;
  }

  let groups = '';
  let wbsNo = 1;

  Object.keys(CATS).forEach(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    if (!catTasks.length) return;
    const totalH  = catTasks.reduce((s,t) => s + (Number(t.effort)||0), 0);
    const avgProg = Math.round(catTasks.reduce((s,t) => s + (t.progress||0), 0) / catTasks.length);

    groups += `
      <div class="wbs-list-group">
        <div class="wbs-list-cat" style="border-left:4px solid ${CAT_COLORS[cat]};">
          <span style="color:${CAT_COLORS[cat]};font-weight:600;font-size:12px;">■ ${escapeHTML(CATS[cat])}</span>
          <span style="font-size:11px;color:var(--text2);margin-left:auto;">${catTasks.length}件 · ${totalH.toFixed(1)}h · 平均${avgProg}%</span>
        </div>
        ${catTasks.map(t => {
          const prog = t.progress != null ? t.progress : 0;
          const progCol = prog >= 100 ? '#888780' : prog >= 60 ? '#1D9E75' : prog >= 30 ? '#EF9F27' : '#378ADD';
          const q = t.urgency && t.importance ? 'Q1' : !t.urgency && t.importance ? 'Q2' : t.urgency ? 'Q3' : 'Q4';
          const qCol = q==='Q1'?'#c44':q==='Q2'?'#2563eb':q==='Q3'?'#b45309':'#888';
          const owners = t.owners || [];
          return `
            <div class="wbs-list-task">
              <div class="wbs-list-head">
                <span class="wbs-list-no">${String(wbsNo++).padStart(2,'0')}</span>
                <span class="wbs-list-title" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>
              </div>
              <div class="wbs-list-badges">
                <span class="badge badge-status-${t.status}">${stLabel[t.status]}</span>
                <span class="badge badge-q-${q.toLowerCase()}">${q}</span>
                <span class="badge badge-effort">${Number(t.effort).toFixed(1)}h</span>
                ${owners.map(o => `<span class="badge badge-owner">👤${escapeHTML(o)}</span>`).join('')}
              </div>
              <div class="wbs-list-dates">
                <span class="wbs-list-date-lbl">開始</span>${dayLabel(t.start, 'start')}
                <span class="wbs-list-date-sep">→</span>
                <span class="wbs-list-date-lbl">終了</span>${dayLabel(t.end, 'end')}
              </div>
              <div class="wbs-list-prog">
                <div class="wbs-list-progbar"><div class="wbs-list-progfill" style="width:${prog}%;background:${progCol};"></div></div>
                <span style="font-size:10px;color:${progCol};font-weight:600;min-width:34px;text-align:right;">${prog}%</span>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  });

  if (!groups) groups = '<div style="text-align:center;padding:2rem;color:var(--text2);">タスクがありません</div>';

  const totalAll = tasks.reduce((s,t) => s + (Number(t.effort)||0), 0);
  const avgProgAll = tasks.length ? Math.round(tasks.reduce((s,t) => s + (t.progress||0), 0) / tasks.length) : 0;

  el.innerHTML = `
    ${wbsToolbarHtml(totalAll, avgProgAll)}
    <div class="wbs-list">${groups}</div>
    <div style="margin-top:10px;font-size:10px;color:var(--text2);">
      ※ ガント表示は「📊 ガント」で切り替え可能です。PDF出力時は自動的にガント表示で印刷されます。
    </div>`;
}

function printWBS() {
  // 印刷時は常にガント表示で出す
  const prevMode = wbsViewMode;
  wbsViewMode = 'gantt';
  renderWBS();
  const allPanels = document.querySelectorAll('.panel');
  const prevStates = [];
  allPanels.forEach(p => { prevStates.push(p.classList.contains('active')); p.classList.remove('active'); });
  document.getElementById('p-wbs').classList.add('active');
  document.body.classList.add('print-wbs-only');
  setTimeout(() => {
    window.print();
    allPanels.forEach((p, i) => { if (prevStates[i]) p.classList.add('active'); });
    document.body.classList.remove('print-wbs-only');
    wbsViewMode = prevMode;
    renderWBS();
  }, 150);
}
