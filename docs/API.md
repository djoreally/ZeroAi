# ZeroAI BaaS API

All endpoints are versioned under `/api/v1`.

## Intent

### POST /api/v1/intent/validate

Validates the typed boundary between natural-language interpretation and execution.

The runtime does not execute an unvalidated intent contract.

## Task graphs

### POST /api/v1/task-graphs/validate

Validates graph structure and returns deterministic topological execution order.

Unknown dependencies and cycles are rejected.

## Policy

### POST /api/v1/policy/evaluate

Evaluates an agent action against deterministic policy rules.

Precedence is:

1. explicit deny
2. approval required
3. explicit allow
4. default deny

Models may request authority. They cannot grant it.

## Ledger

### POST /api/v1/ledger/verify

Verifies content hashes, HMAC signatures, and parent linkage for the supplied ZeroLedger chain.

A modified historical event invalidates the chain.

## Certification

### POST /api/v1/certify

Evaluates a requirement against supplied evidence.

No matching evidence returns `UNKNOWN`, never an implicit success.
