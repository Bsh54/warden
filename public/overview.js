const $ = (s) => document.querySelector(s);
const api = (url) => fetch(url).then((r) => r.json());

async function refresh() {
  const [agents, payments] = await Promise.all([api('/api/agents'), api('/api/payments')]);
  const authorized = payments.filter((p) => p.status === 'AUTHORIZED');
  const blocked = payments.filter((p) => p.status === 'BLOCKED');

  $('#s-agents').textContent = agents.length;
  $('#s-auth').textContent = authorized.length;
  $('#s-blocked').textContent = blocked.length;
  $('#s-frozen').textContent = agents.filter((a) => a.status === 'FROZEN').length;

  const counts = {};
  for (const p of blocked) counts[p.reason] = (counts[p.reason] || 0) + 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  $('#reasons').innerHTML = entries.length
    ? entries.map(([reason, n]) =>
        `<div class="flex justify-between gap-4"><span class="text-error">${reason}</span><span class="text-on-surface">${n}</span></div>`).join('')
    : '<span class="text-on-surface-variant">No blocked transactions yet.</span>';
}

refresh();
setInterval(refresh, 1500);
