import { createAgent, pay, freeze, unfreeze } from './core.js';
import { payments } from './store.js';

const section = (title) => console.log(`\n${'-'.repeat(56)}\n${title}\n${'-'.repeat(56)}`);

async function demo() {
  section('Creating verified agents');
  const alpha = await createAgent({ name: 'Alpha-Bot', principal: 'Acme Corp', limitUsd: 1000 });
  const beta = await createAgent({ name: 'Beta-Bot', principal: 'Acme Corp', limitUsd: 1000 });
  console.log(`${alpha.id}  ${alpha.address}`);
  console.log(`${beta.id}  ${beta.address}`);

  section('Compliant payment  Alpha -> Beta  $500');
  console.log(await pay(alpha.id, beta.id, 500));

  section('Over-limit payment  Alpha -> Beta  $600  (expected BLOCKED)');
  console.log(await pay(alpha.id, beta.id, 600));

  section('Sanction: freezing Alpha (kill-switch)');
  console.log(`freeze tx: ${(await freeze(alpha.id)).txHash}`);

  section('Payment after freeze  Alpha -> Beta  $10  (expected BLOCKED)');
  console.log(await pay(alpha.id, beta.id, 10));

  section('Reactivating Alpha');
  await unfreeze(alpha.id);
  console.log('done');

  section('Payment ledger');
  for (const p of payments) {
    const time = new Date(p.ts).toLocaleTimeString();
    const note = p.reason ? `  (${p.reason})` : '';
    console.log(`${time}  ${p.from} -> ${p.to}  $${p.amountUsd}  ${p.status}${note}`);
  }
}

demo().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
