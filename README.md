# ZeroAI

**ZeroAI is not an AI model. It is the deterministic operating system around AI models.**

> **Inference proposes. Deterministic systems decide. Evidence proves. Memory preserves. Policy authorizes.**

## Five planes

| Plane | Owns |
| --- | --- |
| Control | sequencing, dependencies, retries, permissions, gates |
| Instruction | versioned agent instructions and typed standards |
| Execution | models, tools, APIs, workers, code and database operations |
| Memory | compact durable state, facts, conflicts, compaction |
| Observation | telemetry, artifacts, traces, test results and hashes |

## Core systems

- **ZeroState** — canonical state outside inference
- **ZeroMemory** — smallest-sufficient active memory
- **ZeroLedger** — append-only tamper-evident execution history
- **ZeroPolicy** — deterministic authority broker
- **ZeroGate** — lifecycle state-machine gates
- **ZeroCert** — evidence-driven certification
- **Agent Registry** — versioned capabilities, not personalities
- **Task Graph** — resumable deterministic workflows
- **Intent Contract** — typed boundary between intent and execution

## Execution loop

```text
USER / EVENT
    ↓
INTENT CONTRACT
    ↓
CONTROL PLANE
    ↓
TASK GRAPH
    ↓
AGENT / TOOL EXECUTION
    ↓
OBSERVATION + EVIDENCE
    ↓
VERIFICATION
    ↓
MEMORY REDUCTION
    ↓
CERTIFICATION / REJECTION
    ↓
NEXT STATE
```

The model may propose actions. It never becomes canonical state, grants its own authority, or certifies its own work.

## BaaS surface — initial slice

- `POST /api/v1/intent/validate` — validates a typed intent contract.
- `POST /api/v1/ledger/verify` — verifies a signed hash-chain ledger.
- Library primitives cover policy evaluation, deterministic gates, evidence certification, task-graph validation/order, and memory compaction.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Node 24+ is the baseline.
