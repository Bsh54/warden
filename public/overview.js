const $ = (s) => document.querySelector(s);
const api = (url) => fetch(url).then((r) => r.json());
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

async function refresh() {
  const s = await api('/api/stats');

  $('#k-rate').textContent = s.complianceRate + '%';
  $('#k-rate-bar').style.width = s.complianceRate + '%';
  $('#k-total').textContent = s.total.toLocaleString('en-US');
  $('#k-split').textContent = `${s.authorized.toLocaleString('en-US')} authorized / ${s.blocked.toLocaleString('en-US')} blocked`;
  $('#k-settled').textContent = money(s.valueAuthorized);
  $('#k-prevented').textContent = money(s.valueBlocked);
  $('#k-active').textContent = s.active;
  $('#k-frozen').textContent = s.frozen;
  $('#k-freezes').textContent = s.freezes;

  const entries = Object.entries(s.byReason).sort((a, b) => b[1] - a[1]);
  $('#reasons').innerHTML = entries.length
    ? entries.map(([reason, n]) => {
        const pct = s.blocked ? Math.round((n / s.blocked) * 100) : 0;
        return `<div class="flex flex-col gap-1">
          <div class="flex justify-between font-mono-hash text-mono-hash">
            <span class="text-error">${reason}</span>
            <span class="text-on-surface-variant">${n} (${pct}%)</span>
          </div>
          <div class="w-full h-2 bg-surface-container-high rounded-full overflow-hidden"><div class="h-full bg-error" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')
    : '<span class="font-mono-hash text-mono-hash text-on-surface-variant">No blocked transactions yet.</span>';
}

refresh();
setInterval(refresh, 1500);
