import { listAgents } from './store.js';
import { createAgent, pay, VERIFIED_MERCHANTS } from './core.js';

const VERIFIED = [...VERIFIED_MERCHANTS];
const UNVERIFIED = ['Unknown Entity', 'Anon Wallet', 'Unlisted Vendor'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let timer = null;
let ticks = 0;

async function ensureAgents() {
  if (listAgents().length) return;
  await createAgent({ name: 'Alpha-Bot', principal: 'Acme Corp', limitUsd: 5000 });
  await createAgent({ name: 'Beta-Bot', principal: 'Acme Corp', limitUsd: 5000 });
}

function counterparty(agent) {
  const others = listAgents().filter((a) => a.id !== agent.id).map((a) => a.id);
  const roll = Math.random();
  if (roll < 0.4 && others.length) return pick(others);
  if (roll < 0.85) return pick(VERIFIED);
  return pick(UNVERIFIED);
}

async function tick() {
  ticks += 1;
  const all = listAgents();
  if (!all.length) return;
  if (ticks % 40 === 0) all.filter((a) => a.status === 'ACTIVE').forEach((a) => { a.spentUsd = 0; });
  const agent = pick(all);
  const to = counterparty(agent);
  const amount = Math.random() < 0.1
    ? Math.round(1500 + Math.random() * 2000)
    : Math.round(10 + Math.random() * 120);
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
