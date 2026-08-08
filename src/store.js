export const agents = new Map();
export const payments = [];

export function addPayment(entry) {
  payments.unshift({ ts: Date.now(), ...entry });
  if (payments.length > 200) payments.pop();
}

export const listAgents = () => [...agents.values()];
export const resetPayments = () => {
  payments.length = 0;
};
