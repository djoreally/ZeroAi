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

## Engineering authority

ZeroAI now carries its own machine-readable engineering constitution. The canonical control artifacts are:

- `zeroai.constitution.yaml` — non-negotiable engineering invariants
- `architecture.registry.json` — authoritative subsystem/provider boundaries
- `requirements/core.json` — durable requirement IDs
- `decisions/ledger.json` — active/superseded engineering decisions
- `contracts/` — bounded change contracts
- `policies/` — negative/prohibited architecture rules
- `agent-registry/` — agent responsibilities and authority limits
- `certification/` — deterministic release gates

Run `npm run certify:architecture` before ordinary verification. It fails closed on missing governance artifacts, provider drift, forbidden runtime tokens, forbidden database drivers, or broken requirement references.

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

## BaaS surface

ZeroAI includes workspace tenancy, API-key scopes, canonical state, policy evaluation, ZeroLedger streams, ZeroMemory facts, executions, evidence, and persisted certification.

Production persistence is backed by Neon Data API through the provider-agnostic `ZeroStore` interface. See `docs/BAAS.md` and `docs/NEON_PRODUCTION.md`.

## Development

```bash
npm install
npm run certify
```

Node 24+ is the baseline.
