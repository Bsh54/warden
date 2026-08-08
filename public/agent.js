const id = new URLSearchParams(location.search).get('id');
const $ = (s) => document.querySelector(s);
const api = (url, opts) => fetch(url, opts).then((r) => r.json());

const row = (label, value, cls = 'text-on-surface') =>
  `<div class="flex justify-between gap-4"><span class="text-on-surface-variant">${label}</span><span class="${cls} break-all text-right">${value}</span></div>`;

async function load() {
  const a = await api(`/api/agents/${id}`);
  if (a.error) { $('#title').textContent = 'Not found'; return; }
  const frozen = a.status === 'FROZEN';
  $('#title').textContent = a.name;
  $('#subtitle').innerHTML = `ID: ${a.id} &nbsp;|&nbsp; Principal: ${a.principal} &nbsp;|&nbsp; <span class="${frozen ? 'text-error' : 'text-emerald-400'}">${a.status}</span>`;

  $('#identity').innerHTML =
    row('Chain', a.chain) +
    row('A-Pass wallet', a.address, 'text-secondary-fixed-dim') +
    row('Spending', `$${a.spentUsd} / $${a.limitUsd}`, a.spentUsd > a.limitUsd ? 'text-error' : 'text-on-surface');

  $('#enforcement').innerHTML =
    row('Local status', a.status, frozen ? 'text-error' : 'text-emerald-400') +
    row('Last action', a.lastTxAction || 'none') +
    row('Last on-chain tx', a.lastTxHash || 'none', 'text-secondary-fixed-dim') +
    (a.lastTxAt ? row('At', new Date(a.lastTxAt).toLocaleString()) : '');

  $('#history').innerHTML = (a.history || []).map((p) => {
    const authorized = p.status === 'AUTHORIZED';
    const cls = authorized ? 'text-emerald-400' : 'text-error';
    const note = p.reason ? ` — ${p.reason}` : '';
    return `<div class="flex justify-between gap-4 py-1 border-b border-white/5"><span class="text-on-surface-variant">${new Date(p.ts).toLocaleTimeString()}</span><span class="flex-1">${p.from} &rarr; ${p.to}</span><span class="w-20 text-right text-on-surface">$${p.amountUsd}</span><span class="w-56 text-right ${cls}">${p.status}${note}</span></div>`;
  }).join('') || '<span class="text-on-surface-variant">No payments yet.</span>';
}

$('#verifyBtn').onclick = async () => {
  const proof = $('#proof');
  proof.classList.remove('hidden');
  proof.textContent = 'Querying Cleanverse...';
  const data = await api(`/api/agents/${id}/verify`);
  proof.textContent =
    `Source: ${data.source}\n` +
    `Wallet: ${data.address}\n` +
    `On-chain status: ${data.onChainStatus} (${data.onChainLabel})\n\n` +
    `Raw Cleanverse response:\n${JSON.stringify(data.raw, null, 2)}`;
};

$('#freezeBtn').onclick = async () => { await api(`/api/agents/${id}/freeze`, { method: 'POST' }); load(); };
$('#unfreezeBtn').onclick = async () => { await api(`/api/agents/${id}/unfreeze`, { method: 'POST' }); load(); };

load();
setInterval(load, 3000);
