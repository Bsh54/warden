import { listAgents } from './store.js';
import { createAgent, pay } from './core.js';

const EXTERNALS = ['Vendor X', 'Cloud Services Inc.', 'API Gateway', 'Data Node 7', 'Model Provider'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let timer = null;

async function ensureAgents() {
  if (listAgents().length) return;
  await createAgent({ name: 'Alpha-Bot', principal: 'Acme Corp', limitUsd: 2000 });
  await createAgent({ name: 'Beta-Bot', principal: 'Acme Corp', limitUsd: 2000 });
}

async function tick() {
  const all = listAgents();
  if (!all.length) return;
  const agent = pick(all);
  const others = all.filter((a) => a.id !== agent.id);
  const to = Math.random() < 0.6 && others.length ? pick(others).id : pick(EXTERNALS);
  const amount = Math.random() < 0.18
    ? Math.round(1200 + Math.random() * 1200)
    : Math.round(10 + Math.random() * 130);
  await pay(agent.id, to, amount).catch(() => {});
}

export async function startWorker() {
  await ensureAgents();
  if (!timer) timer = setInterval(tick, 2500);
  return { running: true };
}

export function stopWorker() {
  if (timer) clearInterval(timer);
  timer = null;
  return { running: false };
}

export const isRunning = () => timer !== null;
