# Warden

**The compliance rail for autonomous AI agents.**

🔗 **Live demo:** https://warden.shadrakbessanh.me

AI agents already settle billions of dollars in machine-to-machine payments, yet there is no compliance layer. Nobody can answer the question institutions care about most: *how do you verify an autonomous agent, cap its spending, and stop a compromised or sanctioned agent in real time?* Warden is that missing layer.

Every payment an agent attempts passes **through Warden first**. Warden verifies the agent's identity, enforces its spending rules, and can freeze it instantly — turning agentic payments from a regulatory blind spot into an institution-ready rail.

Built on the [Cleanverse](https://cleanverse.com) compliance stack: **CVI** (verified identity / A-Pass) and **CVA** (verified assets / A-Token).

## How it works

Each agent is issued a verified, revocable identity credential (**CVI / A-Pass**) bound to a human or corporate principal, and payments settle in a real verified asset (**CVA / A-Token**, e.g. aUSDC). Before any payment settles, Warden evaluates it against the asset's own on-chain compliance policy plus its own controls:

1. **Identity** — is the agent's A-Pass active (not frozen / sanctioned)?
2. **Asset policy** — do the sender and recipient satisfy the A-Token's on-chain rule (minimum A-Pass tier, allowed/blocked countries)? A wallet with no verified identity cannot hold the asset.
3. **Counterparty** — is the recipient a verified, non-sanctioned wallet?
4. **Spending limit** — is the agent within its per-agent cap?
5. **Enforcement** — the moment the principal's compliance status changes, the agent is frozen mid-stream, in both directions.

The A-Token's rule is read live from Cleanverse (`/atoken/rules`) and enforced against each agent's A-Pass attributes, so **both CVI and CVA are essential to every decision**. Compliant payments flow through in seconds; non-compliant ones never leave.

```
 Agent  ──payment──▶  Warden  ──▶  settled
                        │
                        ├─ identity active?
                        ├─ counterparty verified?
                        ├─ within spending limit?
                        └─ principal not sanctioned?
                        │
                        └─ otherwise ▶ blocked + credential frozen
```

## Architecture

| Module | Role |
| --- | --- |
| `src/cleanverse.js` | Cleanverse Cooperate API client (AES-256-CBC request encryption + HTTP). |
| `src/core.js` | The engine: `createAgent`, `checkPayment`, `pay`, `freeze`, `unfreeze`, `liveStatus`, `verifyOnChain`. |
| `src/store.js` | In-memory state: agents and the payment ledger. |
| `src/worker.js` | Autonomous agents that transact continuously through the gate. |
| `src/server.js` | HTTP API and static dashboard host. |
| `src/cli.js` | Command-line demo runner. |
| `public/` | Dashboard: overview, control center, create agent, agent detail. |

Compliance decisions are **real** — identity issuance and the kill-switch are executed on-chain through Cleanverse. Payment settlement is recorded in the ledger for demonstration.

## Verifiability

Every freeze returns an on-chain transaction hash, and the agent detail page exposes a **Verify on Cleanverse** action (`GET /api/agents/:id/verify`) that queries Cleanverse's own `query_apass` endpoint live and returns the raw on-chain status — independent proof that a sanction was actually enforced, not simulated by the dashboard.

## Quickstart

```bash
cp .env.example .env   # fill in your Cleanverse sandbox credentials
npm install
npm start              # dashboard on http://localhost:3000
```

Autonomous agents start automatically and transact through the gate. Open the dashboard to watch the live compliance feed, sanction an agent with the kill-switch, and verify its on-chain status.

Prefer the command line? `npm run demo` runs a scripted end-to-end scenario: a compliant payment, an over-limit block, a freeze, a blocked payment, and a reactivation.

## HTTP API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/agents` | List agents. |
| `POST` | `/api/agents` | Create a verified agent. |
| `GET` | `/api/agents/:id` | Agent detail and payment history. |
| `POST` | `/api/agents/:id/freeze` | Freeze (sanction) an agent. |
| `POST` | `/api/agents/:id/unfreeze` | Reactivate an agent. |
| `GET` | `/api/agents/:id/verify` | Live on-chain status from Cleanverse. |
| `POST` | `/api/pay` | Attempt a payment through the gate. |
| `GET` | `/api/payments` | Compliance ledger. |
| `POST` | `/api/demo/start` · `/api/demo/stop` | Control the autonomous worker. |

## Configuration

| Variable | Description |
| --- | --- |
| `CLEANVERSE_BASE_URL` | Cleanverse Cooperate API base URL. |
| `CLEANVERSE_API_ID` | Application id (sent as the `api-id` header). |
| `CLEANVERSE_API_KEY` | Base64 key used locally for AES request-body encryption. Never committed. |

## Roadmap

- HTTP API and real-time control-center dashboard
- Autonomous agent worker (scripted and LLM-driven)
- Country / jurisdiction rules via A-Token compliance policies
- Lightweight SDK so any agent framework becomes compliant by default

## License

MIT
