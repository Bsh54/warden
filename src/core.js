import crypto from 'node:crypto';
import { postEncrypted, postJson } from './cleanverse.js';
import { agents, addPayment, stats } from './store.js';

const CHAIN = 'base';
const EXPIRATION = 1863690034;

export const VERIFIED_MERCHANTS = new Set(['Cloud Services Inc.', 'API Gateway', 'Model Provider', 'Data Node 7']);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomAddress = () => '0x' + crypto.randomBytes(20).toString('hex');
const newCustomerId = () => 'WARDEN' + Date.now() + crypto.randomInt(1000, 9999);

export async function createAgent({ name, principal = 'Unknown', limitUsd = 1000, countryISO2 = 'SG' }) {
  const address = randomAddress();
  const customerId = newCustomerId();
  const body = {
    customerId,
    override: false,
    expirationTime: EXPIRATION,
    wallet: { address, chain: CHAIN },
    identityDataList: [{ idType: 'PASSPORT', fullName: name, issuingCountryISO2: countryISO2 }],
  };

  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await postEncrypted('/generate_apass', body);
    if (res.code === '0000' || !String(res.message).includes('CV_500')) break;
    await delay(1500 * attempt);
  }
  if (res.code !== '0000') throw new Error(`generate_apass failed: ${res.message}`);

  const id = `AGT-${address.slice(2, 6).toUpperCase()}-${address.slice(-2).toUpperCase()}`;
  const agent = {
    id,
    name,
    principal,
    chain: CHAIN,
    address,
    customerId,
    cvRecordId: res.data.cvRecordId,
    limitUsd,
    spentUsd: 0,
    status: 'ACTIVE',
    createdAt: Date.now(),
  };
  agents.set(id, agent);
  return agent;
}

export async function liveStatus(agent) {
  const res = await postJson('/query_apass', { chain: agent.chain, address: agent.address });
  return res.code === '0000' ? res.data.status : null;
}

export async function checkPayment(agentId, to, amountUsd) {
  const agent = agents.get(agentId);
  if (!agent) return { allowed: false, reason: 'Unknown agent' };
  if (agent.status === 'FROZEN' || (await liveStatus(agent)) === 2)
    return { allowed: false, reason: 'Agent A-Pass frozen (sanctioned)' };
  if (to.startsWith('AGT-')) {
    const dest = agents.get(to);
    if (!dest) return { allowed: false, reason: 'Counterparty not verified' };
    if (dest.status === 'FROZEN') return { allowed: false, reason: 'Counterparty sanctioned (frozen)' };
  } else if (!VERIFIED_MERCHANTS.has(to)) {
    return { allowed: false, reason: 'Counterparty not verified' };
  }
  if (agent.spentUsd + amountUsd > agent.limitUsd)
    return { allowed: false, reason: `Limit exceeded (threshold: $${agent.limitUsd})` };
  return { allowed: true, reason: 'OK' };
}

export async function pay(agentId, to, amountUsd) {
  const agent = agents.get(agentId);
  const toName = agents.get(to)?.name ?? to;
  const check = await checkPayment(agentId, to, amountUsd);
  if (check.allowed) {
    agent.spentUsd += amountUsd;
    addPayment({ from: agent.name, to: toName, amountUsd, status: 'AUTHORIZED' });
  } else {
    addPayment({ from: agent?.name ?? agentId, to: toName, amountUsd, status: 'BLOCKED', reason: check.reason });
  }
  return check;
}

export async function freeze(agentId, reason = 'Warden sanction (compliance)') {
  const agent = agents.get(agentId);
  if (!agent) throw new Error('Unknown agent');
  const res = await postEncrypted('/update_status', {
    customerId: agent.customerId,
    cvRecordId: agent.cvRecordId,
    status: '2',
    blacklistReason: reason,
    wallet: { chain: agent.chain, address: agent.address },
  });
  if (res.code !== '0000') throw new Error(`freeze failed: ${res.message}`);
  agent.status = 'FROZEN';
  agent.lastTxHash = res.data.txHash;
  agent.lastTxAction = 'FREEZE';
  agent.lastTxAt = Date.now();
  stats.freezes += 1;
  return res.data;
}

export async function unfreeze(agentId) {
  const agent = agents.get(agentId);
  if (!agent) throw new Error('Unknown agent');
  const res = await postEncrypted('/update_status', {
    customerId: agent.customerId,
    cvRecordId: agent.cvRecordId,
    status: '1',
    wallet: { chain: agent.chain, address: agent.address },
  });
  agent.status = 'ACTIVE';
  agent.lastTxHash = res.data?.txHash ?? agent.lastTxHash;
  agent.lastTxAction = 'UNFREEZE';
  agent.lastTxAt = Date.now();
  stats.unfreezes += 1;
  return res.data;
}

export async function verifyOnChain(agentId) {
  const agent = agents.get(agentId);
  if (!agent) throw new Error('Unknown agent');
  const response = await postJson('/query_apass', { chain: agent.chain, address: agent.address });
  const onChainStatus = response.code === '0000' ? response.data.status : null;
  return {
    address: agent.address,
    chain: agent.chain,
    localStatus: agent.status,
    onChainStatus,
    onChainLabel: onChainStatus === 2 ? 'FROZEN' : onChainStatus === 1 ? 'ACTIVE' : 'PENDING',
    source: 'Cleanverse query_apass',
    raw: response,
  };
}
