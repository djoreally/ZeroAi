# ZeroAI BaaS API

All endpoints are versioned under `/api/v1`.

## Intent

### POST /api/v1/intent/validate

Validates the typed boundary between natural-language interpretation and execution.

The runtime does not execute an unvalidated intent contract.

## Task graphs

### POST /api/v1/task-graphs/validate

Validates graph structure and returns deterministic topological execution order.

Unknown dependencies, duplicate IDs, self-dependencies, and cycles are rejected.

## Policy

### PUT /api/v1/workspaces/:workspaceId/policy

Admin-only provisioning for authoritative workspace policy.

Policy is stored under the reserved canonical-state key `zero.policy.rules`. Normal workspace keys cannot overwrite reserved `zero.*` state.

### POST /api/v1/policy/evaluate

Authenticated authoritative evaluation.

The caller submits only the requested action. ZeroAI loads the policy rules from trusted workspace state.

Precedence is:

1. explicit deny
2. approval required
3. explicit allow
4. default deny

Models may request authority. They cannot grant it.

## Ledger

### POST /api/v1/ledger/verify

Verifies a non-empty ledger chain against the server-configured trusted anchor, content hashes, HMAC signatures, and parent linkage.

A modified, truncated-from-genesis, or incorrectly anchored chain is rejected.

## Certification

### POST /api/v1/certify

Stateless simulation only. The response explicitly reports `authoritative: false`.

Authoritative certification is performed by `POST /api/v1/executions/:executionId/certifications`, which reads persisted evidence for that execution instead of accepting caller-asserted evidence as truth.

No evidence means `UNKNOWN`, never success.
