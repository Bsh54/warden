import { listAgents } from './store.js';
import { createAgent, pay, resolveAsset } from './core.js';

const UNVERIFIED = ['Unknown Entity', 'Anon Wallet', 'Unlisted Vendor'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let timer = null;

async function ensureAgents() {
  if (listAgents().length) return;
  await createAgent({ name: 'Alpha-Bot', principal: 'Acme Corp', limitUsd: 5000 });
  await createAgent({ name: 'Beta-Bot', principal: 'Acme Corp', limitUsd: 5000 });
}

function counterparty(agent) {
  const others = listAgents().filter((a) => a.id !== agent.id).map((a) => a.id);
  if (Math.random() < 0.8 && others.length) return pick(others);
  return pick(UNVERIFIED);
}

async function tick() {
  const all = listAgents();
  if (!all.length) return;
  const agent = pick(all);
  const to = counterparty(agent);
  const amount = Math.random() < 0.08
    ? Math.round(1000 + Math.random() * 1500)
    : Math.round(10 + Math.random() * 110);
  await pay(agent.id, to, amount).catch(() => {});
}

export async function startWorker() {
  await resolveAsset();
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
