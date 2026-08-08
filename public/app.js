const $ = (sel) => document.querySelector(sel);
const api = (url, opts) => fetch(url, opts).then((r) => r.json());

function agentCard(a) {
  const pct = Math.min(100, Math.round((a.spentUsd / a.limitUsd) * 100));
  const frozen = a.status === 'FROZEN';
  const bar = frozen || a.spentUsd > a.limitUsd ? 'bg-error' : pct > 80 ? 'bg-amber-500' : 'bg-secondary-fixed-dim';
  const pill = frozen
    ? `<span class="px-3 py-1 rounded-full bg-error/10 text-error border border-error/30 font-mono-hash text-mono-hash flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">lock</span>FROZEN</span>`
    : `<span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono-hash text-mono-hash flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>ACTIVE</span>`;
  const action = frozen
    ? `<button data-unfreeze="${a.id}" class="w-full py-2 rounded border border-secondary-fixed-dim/30 text-secondary-fixed-dim hover:bg-secondary-fixed-dim/10 font-mono-label text-mono-label transition-colors">Unfreeze</button>`
    : `<button data-freeze="${a.id}" class="w-full py-2 rounded border border-error/30 text-error hover:bg-error/10 font-mono-label text-mono-label transition-colors">Freeze</button>`;
  return `<div class="glass-card rounded-xl p-6 flex flex-col gap-4 ${frozen ? 'opacity-75 border-error/30' : ''}">
    <div class="flex justify-between items-start">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center border ${frozen ? 'bg-error/10 border-error/30' : 'bg-secondary-fixed-dim/10 border-secondary-fixed-dim/30'}">
          <span class="material-symbols-outlined ${frozen ? 'text-error' : 'text-secondary-fixed-dim'}">${frozen ? 'warning' : 'robot_2'}</span>
        </div>
        <div>
          <h3 class="font-mono-label text-mono-label text-lg ${frozen ? 'line-through text-on-surface-variant' : 'text-on-surface'}">${a.name}</h3>
          <p class="font-mono-hash text-mono-hash text-on-surface-variant mt-1">ID: ${a.id}</p>
        </div>
      </div>
      ${pill}
    </div>
    <div class="space-y-2">
      <div class="flex justify-between font-mono-label text-mono-label text-sm">
        <span class="text-on-surface-variant">Limit Utilization</span>
        <span class="${a.spentUsd > a.limitUsd ? 'text-error' : 'text-on-surface'}">$${a.spentUsd} / $${a.limitUsd}</span>
      </div>
      <div class="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div class="h-full ${bar}" style="width:${pct}%"></div>
      </div>
    </div>
    ${action}
    <a href="/agent.html?id=${a.id}" class="text-center font-mono-hash text-mono-hash text-on-surface-variant hover:text-secondary-fixed-dim transition-colors">Details &amp; on-chain proof &rarr;</a>
  </div>`;
}

function feedRow(p) {
  const time = new Date(p.ts).toLocaleTimeString();
  const authorized = p.status === 'AUTHORIZED';
  const rowCls = authorized ? 'hover:bg-white/5' : 'bg-error/5 border border-error/10';
  const statusCls = authorized ? 'text-emerald-400' : 'text-error';
  const nameCls = authorized ? 'text-secondary-fixed-dim' : 'text-error';
  const icon = authorized ? 'check_circle' : 'cancel';
  const reason = p.reason
    ? `<div class="px-2 pb-2 pl-28 text-error/70 font-mono-hash text-mono-hash text-[10px] uppercase">Reason: ${p.reason}</div>`
    : '';
  return `<div class="flex items-center px-2 py-2 rounded transition-colors ${rowCls}">
    <div class="w-24 text-on-surface-variant opacity-70">${time}</div>
    <div class="flex-1 text-on-surface flex items-center gap-2"><span class="${nameCls}">${p.from}</span><span class="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_forward</span>${p.to}</div>
    <div class="w-20 text-right text-on-surface">$${p.amountUsd}</div>
    <div class="w-32 text-right ${statusCls} flex items-center justify-end gap-1"><span class="material-symbols-outlined text-[14px]">${icon}</span>${p.status}</div>
  </div>${reason}`;
}

async function refresh() {
  const [agents, payments] = await Promise.all([api('/api/agents'), api('/api/payments')]);
  $('#agents').innerHTML = agents.map(agentCard).join('') ||
    '<div class="glass-card rounded-xl p-6 text-on-surface-variant font-mono-hash">No agents yet. Start the demo or create one.</div>';
  $('#agentCount').textContent = `${agents.filter((a) => a.status === 'ACTIVE').length} ONLINE`;
  $('#feed').innerHTML = payments.map(feedRow).join('') ||
    '<div class="text-on-surface-variant p-4 font-mono-hash">No transactions yet. Start the demo.</div>';
}

document.addEventListener('click', async (e) => {
  const freezeBtn = e.target.closest('[data-freeze]');
  const unfreezeBtn = e.target.closest('[data-unfreeze]');
  if (freezeBtn) { await api(`/api/agents/${freezeBtn.dataset.freeze}/freeze`, { method: 'POST' }); refresh(); }
  if (unfreezeBtn) { await api(`/api/agents/${unfreezeBtn.dataset.unfreeze}/unfreeze`, { method: 'POST' }); refresh(); }
});

$('#startBtn').onclick = () => api('/api/demo/start', { method: 'POST' });
$('#stopBtn').onclick = () => api('/api/demo/stop', { method: 'POST' });

$('#sanctionBtn').onclick = async () => {
  const agents = await api('/api/agents');
  const target = agents.find((a) => a.status === 'ACTIVE');
  if (target) { await api(`/api/agents/${target.id}/freeze`, { method: 'POST' }); refresh(); }
};

$('#reactivateBtn').onclick = async () => {
  const agents = await api('/api/agents');
  for (const a of agents.filter((a) => a.status === 'FROZEN')) {
    await api(`/api/agents/${a.id}/unfreeze`, { method: 'POST' });
  }
  refresh();
};

refresh();
setInterval(refresh, 1500);
