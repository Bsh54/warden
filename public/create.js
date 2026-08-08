const form = document.querySelector('#form');
const status = document.querySelector('#status');
const submit = document.querySelector('#submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submit.disabled = true;
  status.textContent = 'Issuing verified identity on Cleanverse...';
  status.className = 'font-mono-hash text-mono-hash text-secondary-fixed-dim';
  try {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.querySelector('#name').value,
        principal: document.querySelector('#principal').value,
        limitUsd: document.querySelector('#limit').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    status.textContent = `Agent ${data.id} issued. Redirecting...`;
    status.className = 'font-mono-hash text-mono-hash text-emerald-400';
    setTimeout(() => (window.location.href = '/'), 900);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'font-mono-hash text-mono-hash text-error';
    submit.disabled = false;
  }
});
