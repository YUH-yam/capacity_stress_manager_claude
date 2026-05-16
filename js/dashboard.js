// ==================== DASHBOARD ====================

function getCap() {
  return {
    d: parseFloat(document.getElementById('dailyCap')?.value  || 8),
    w: parseFloat(document.getElementById('weeklyCap')?.value || 40)
  };
}
function bc(p) { return p >= 1 ? '#E24B4A' : p >= .8 ? '#EF9F27' : '#1D9E75'; }
function sv(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }

function updateMetrics() {
  const {d, w} = getCap();
  const myA = tasks.filter(t => (t.owners || []).includes('自分') && t.status !== 'done');
  const te = myA.filter(t => t.urgency).reduce((s,t) => s + (Number(t.effort)||0), 0);
  const we = myA.reduce((s,t) => s + (Number(t.effort)||0), 0);
  const tp = d > 0 ? Math.min(te / d, 1) : 0;
  const wp = w > 0 ? Math.min(we / w, 1) : 0;
  sv('todayH', te.toFixed(1) + 'h');
  sv('weekH',  we.toFixed(1) + 'h');
  sv('todayCapL', '/ ' + d + 'h 上限');
  sv('weekCapL',  '/ ' + w + 'h 上限');
  sv('weekUtil',  Math.round(wp * 100) + '%');
  sv('q1Cnt', tasks.filter(t => t.urgency && t.importance && t.status !== 'done').length);
  const tb = document.getElementById('todayBar');
  const wb = document.getElementById('weekBar');
  if (tb) { tb.style.width = Math.round(tp*100)+'%'; tb.style.background = bc(tp); }
  if (wb) { wb.style.width = Math.round(wp*100)+'%'; wb.style.background = bc(wp); }
  // 要ケア＝スコア「以下」STRESS_ALERT_MAX
  const alerts = Object.values(smxData).filter(x => x.score <= STRESS_ALERT_MAX).length;
  sv('stressStatNum', alerts);
  const ss = document.getElementById('stressStat');
  if (ss) ss.classList.toggle('alert', alerts > 0);
  // Q1 件数も件数に応じてアラートとして強調
  const q1 = tasks.filter(t => t.urgency && t.importance && t.status !== 'done').length;
  const q1card = document.getElementById('q1Stat');
  if (q1card) q1card.classList.toggle('alert', q1 > 0);
}

function renderMatrix() {
  const CAT_COLORS = getCatColorMap();
  const act = tasks.filter(t => t.status !== 'done');
  [{q:'q1',u:true,i:true},{q:'q2',u:false,i:true},{q:'q3',u:true,i:false},{q:'q4',u:false,i:false}].forEach(({q,u,i}) => {
    const el = document.getElementById(q+'t'); if (!el) return;
    const qt = act.filter(t => t.urgency === u && t.importance === i);
    el.innerHTML = qt.map(t => {
      const col = CAT_COLORS[t.category] || '#888';
      return `<div class="mx-chip"><span>${escapeHTML(t.title)}</span><span style="background:${col}22;color:${col};padding:1px 5px;border-radius:3px;font-size:9px;flex-shrink:0;">${Number(t.effort).toFixed(1)}h</span></div>`;
    }).join('') || '<div style="font-size:10px;color:var(--text3);font-style:italic;">なし</div>';
  });
}

function renderDashStress() {
  const el = document.getElementById('dashStressSummary'); if (!el) return;
  const rows = LOCS.map(loc => {
    const sc = AREAS.map(a => smxData[`${loc}_${a}`]?.score).filter(Boolean);
    if (!sc.length) return null;
    const avg = sc.reduce((a,b) => a+b, 0) / sc.length;
    return { loc, avg, col: SC[Math.round(avg)] };
  }).filter(Boolean);
  el.innerHTML = rows.map(r =>
    `<div class="stress-bar-row">
      <div class="stress-circle" style="background:${r.col}22;color:${r.col};">${r.avg.toFixed(1)}</div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="font-size:12px;font-weight:500;">${escapeHTML(r.loc)}</span>
          <span style="font-size:11px;color:${r.col};">${SL[Math.round(r.avg)]}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="background:${r.col};width:${Math.round(r.avg/5*100)}%;"></div></div>
      </div>
    </div>`
  ).join('') || '<div style="font-size:12px;color:var(--text2);">まだ記録がありません</div>';
}

function renderChart() {
  const CATS = getCatLabelMap();
  const CAT_COLORS = getCatColorMap();
  const filt = Object.keys(CATS).map(c => ({
    c,
    v: tasks.filter(t => t.category === c && t.status !== 'done').reduce((s,t) => s + (Number(t.effort)||0), 0),
    color: CAT_COLORS[c]
  })).filter(x => x.v > 0);
  const canvas = document.getElementById('catChart'); if (!canvas) return;
  if (chartInst) { chartInst.destroy(); chartInst = null; }
  if (!filt.length) {
    const lg = document.getElementById('chartLegend'); if (lg) lg.innerHTML = '';
    return;
  }
  chartInst = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: filt.map(x => CATS[x.c]),
      datasets: [{
        data: filt.map(x => x.v),
        backgroundColor: filt.map(x => x.color),
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}h` } } }
    }
  });
  document.getElementById('chartLegend').innerHTML = filt.map(x =>
    `<div class="legend-item"><div class="legend-dot" style="background:${x.color};"></div>${escapeHTML(CATS[x.c])} ${Number(x.v).toFixed(1)}h</div>`
  ).join('');
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
