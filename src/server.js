import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { agents, listAgents, payments } from './store.js';
import { createAgent, pay, freeze, unfreeze } from './core.js';
import { startWorker, stopWorker, isRunning } from './worker.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.use(express.json());
app.use(express.static(path.join(root, 'public')));

const view = (a) => ({
  id: a.id,
  name: a.name,
  principal: a.principal,
  address: a.address,
  chain: a.chain,
  limitUsd: a.limitUsd,
  spentUsd: a.spentUsd,
  status: a.status,
});

const wrap = (handler) => (req, res) =>
  handler(req, res).catch((error) => res.status(500).json({ error: error.message }));

app.get('/api/agents', (req, res) => res.json(listAgents().map(view)));

app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Unknown agent' });
  const history = payments.filter((p) => p.from === agent.name);
  res.json({ ...view(agent), history });
});

app.post('/api/agents', wrap(async (req, res) => {
  const { name, principal, limitUsd } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const agent = await createAgent({ name, principal, limitUsd: Number(limitUsd) || 1000 });
  res.status(201).json(view(agent));
}));

app.post('/api/agents/:id/freeze', wrap(async (req, res) => {
  const result = await freeze(req.params.id);
  res.json(result);
}));

app.post('/api/agents/:id/unfreeze', wrap(async (req, res) => {
  const result = await unfreeze(req.params.id);
  res.json(result);
}));

app.post('/api/pay', wrap(async (req, res) => {
  const { from, to, amountUsd } = req.body;
  res.json(await pay(from, to, Number(amountUsd)));
}));

app.get('/api/payments', (req, res) => res.json(payments));

app.post('/api/demo/start', wrap(async (req, res) => res.json(await startWorker())));
app.post('/api/demo/stop', (req, res) => res.json(stopWorker()));
app.get('/api/demo/status', (req, res) => res.json({ running: isRunning() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Warden running on http://localhost:${PORT}`));
