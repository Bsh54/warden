import crypto from 'node:crypto';
import { postEncrypted, postJson } from './cleanverse.js';
import { agents, addPayment, stats } from './store.js';

const CHAIN = 'base';
const EXPIRATION = 1863690034;

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomAddress = () => '0x' + crypto.randomBytes(20).toString('hex');
const newCustomerId = () => 'WARDEN' + Date.now() + crypto.randomInt(1000, 9999);

let asset = null;

export async function resolveAsset() {
  if (asset) return asset;
  const list = await postJson('/query_deposit_atoken_list', { chain: CHAIN });
  const tokens = list.data?.tokens ?? [];
  const entry = tokens.find((t) => t.atoken?.symbol?.toLowerCase() === 'ausdc') ?? tokens[0];
  if (!entry) throw new Error('No A-Token available on chain');
  const address = entry.atoken.address;
  const rulesRes = await postJson('/atoken/rules', { chain: CHAIN, atoken_address: address });
  const rule = rulesRes.data?.rules?.[0] ?? { min_tier: 0, min_sub_tier: 0, countries: [], is_black_list: false };
  asset = { symbol: entry.atoken.symbol, address, decimals: entry.atoken.decimals, rule };
  return asset;
}

export const getAsset = () => asset;

function meetsAssetRule(agent, rule) {
  if (rule.min_tier && !(Number(agent.tier) > rule.min_tier)) {
    return { ok: false, reason: `A-Pass tier ${agent.tier} below ${asset.symbol} policy (min ${rule.min_tier})` };
  }
  if (rule.countries?.length) {
    const match = (agent.countries ?? []).some((c) => rule.countries.includes(c));
    if (rule.is_black_list ? match : !match) {
      return { ok: false, reason: `country not permitted by ${asset.symbol} policy` };
    }
  }
  return { ok: true };
}

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
    tier: Number(res.data.tier) || 0,
    countries: [countryISO2],
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

export async function checkPayment(agentId, to, amount) {
  const agent = agents.get(agentId);
  if (!agent) return { allowed: false, reason: 'Unknown agent' };
  const a = await resolveAsset();

  if (agent.status === 'FROZEN' || (await liveStatus(agent)) === 2)
    return { allowed: false, reason: 'Agent A-Pass frozen (sanctioned)' };

  const senderPolicy = meetsAssetRule(agent, a.rule);
  if (!senderPolicy.ok) return { allowed: false, reason: `Sender ${senderPolicy.reason}` };

  if (to.startsWith('AGT-')) {
    const dest = agents.get(to);
    if (!dest) return { allowed: false, reason: 'Counterparty not verified' };
    if (dest.status === 'FROZEN') return { allowed: false, reason: 'Counterparty sanctioned (frozen)' };
    const recipientPolicy = meetsAssetRule(dest, a.rule);
    if (!recipientPolicy.ok) return { allowed: false, reason: `Recipient ${recipientPolicy.reason}` };
  } else {
    return { allowed: false, reason: `Recipient cannot hold ${a.symbol} (no verified A-Pass)` };
  }

  if (agent.spentUsd + amount > agent.limitUsd)
    return { allowed: false, reason: `Limit exceeded (threshold: $${agent.limitUsd})` };

  return { allowed: true, reason: 'OK' };
}

export async function pay(agentId, to, amount) {
  const agent = agents.get(agentId);
  const toName = agents.get(to)?.name ?? to;
  const symbol = asset?.symbol ?? 'aUSDC';
  const check = await checkPayment(agentId, to, amount);
  if (check.allowed) {
    agent.spentUsd += amount;
    addPayment({ from: agent.name, to: toName, amountUsd: amount, asset: symbol, status: 'AUTHORIZED' });
  } else {
    addPayment({ from: agent?.name ?? agentId, to: toName, amountUsd: amount, asset: symbol, status: 'BLOCKED', reason: check.reason });
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

export function rechargeAgent(agentId) {
  const agent = agents.get(agentId);
  if (!agent) throw new Error('Unknown agent');
  agent.spentUsd = 0;
  return { id: agent.id, spentUsd: agent.spentUsd, limitUsd: agent.limitUsd };
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
