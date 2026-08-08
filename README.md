# Warden

**The compliance rail for autonomous AI agents.**

AI agents already settle billions of dollars in machine-to-machine payments, yet there is no compliance layer. Nobody can answer the question institutions care about most: *how do you verify an autonomous agent, cap its spending, and stop a compromised or sanctioned agent in real time?* Warden is that missing layer.

Every payment an agent attempts passes **through Warden first**. Warden verifies the agent's identity, enforces its spending rules, and can freeze it instantly — turning agentic payments from a regulatory blind spot into an institution-ready rail.

Built on the [Cleanverse](https://cleanverse.com) compliance stack: **CVI** (verified identity / A-Pass) and **CVA** (verified assets / A-Token).

## How it works

Each agent is issued a verified, revocable identity credential bound to a human or corporate principal. Before any payment settles, Warden evaluates it against four checks:

1. **Identity** — is the agent's credential active (not frozen / sanctioned)?
2. **Counterparty** — is the recipient a verified entity?
3. **Spending limit** — is the agent within its per-agent cap?
4. **Enforcement** — the moment the principal's compliance status changes, the agent is frozen mid-stream.

Compliant payments flow through in seconds. Non-compliant ones never leave.

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
| `src/core.js` | The engine: `createAgent`, `checkPayment`, `pay`, `freeze`, `unfreeze`, `liveStatus`. |
| `src/store.js` | In-memory state: agents and the payment ledger. |
| `src/cli.js` | End-to-end demo runner. |

Compliance decisions are **real** — identity issuance and the kill-switch are executed on-chain through Cleanverse. Payment settlement is recorded in the ledger for demonstration.

## Quickstart

```bash
cp .env.example .env   # fill in your Cleanverse sandbox credentials
npm run demo
```

The demo creates two verified agents, runs a compliant payment, blocks an over-limit payment, freezes an agent (kill-switch), blocks its next payment, and reactivates it.

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
