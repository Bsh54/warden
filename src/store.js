export const agents = new Map();
export const payments = [];

export const stats = {
  authorized: 0,
  blocked: 0,
  valueAuthorized: 0,
  valueBlocked: 0,
  freezes: 0,
  unfreezes: 0,
  byReason: {},
};

export function addPayment(entry) {
  payments.unshift({ ts: Date.now(), ...entry });
  if (payments.length > 200) payments.pop();
  if (entry.status === 'AUTHORIZED') {
    stats.authorized += 1;
    stats.valueAuthorized += entry.amountUsd;
  } else {
    stats.blocked += 1;
    stats.valueBlocked += entry.amountUsd;
    if (entry.reason) stats.byReason[entry.reason] = (stats.byReason[entry.reason] || 0) + 1;
  }
}

export const listAgents = () => [...agents.values()];
export const resetPayments = () => {
  payments.length = 0;
};
