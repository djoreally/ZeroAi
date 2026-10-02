# ZeroAI BaaS

ZeroAI exposes deterministic intelligence infrastructure as a multi-tenant backend service.

## Bootstrap

1. Configure `ZEROAI_ADMIN_TOKEN`.
2. Create a workspace through the admin boundary.
3. Create an API key for that workspace.
4. Store the returned token securely; it is returned once.
5. Use `Authorization: Bearer <token>` for authenticated workspace operations.

## Current service surface

### Tenancy

- `POST /api/v1/workspaces` — admin only
- `POST /api/v1/workspaces/:workspaceId/api-keys` — admin only

### Canonical state

- `GET /api/v1/state/:key`
- `PUT /api/v1/state/:key`

State writes support optimistic concurrency through `expectedVersion`. The `zero.*` namespace is reserved for deterministic control state and cannot be written through normal workspace state APIs.

### ZeroPolicy

- `PUT /api/v1/workspaces/:workspaceId/policy` — admin only
- `POST /api/v1/policy/evaluate` — authenticated workspace evaluation

The action request is caller-supplied; the rules are not. Rules are loaded from protected canonical state.

### ZeroLedger streams

- `GET /api/v1/events/:stream`
- `POST /api/v1/events/:stream`
- `POST /api/v1/ledger/verify`

Every append is RFC 8785 canonicalized, content-hashed, signed, sequence-numbered, and linked to the prior event hash or configured trusted anchor.

### ZeroMemory

- `GET /api/v1/memory/facts`
- `POST /api/v1/memory/facts`

The read projection returns compacted active memory rather than raw history.

### Executions and evidence

- `POST /api/v1/executions`
- `POST /api/v1/executions/:executionId/evidence`
- `POST /api/v1/executions/:executionId/certifications`

Authoritative certification reads stored evidence and persists the resulting evidence state. The execution never certifies itself.

## Production persistence

The domain layer depends only on the `ZeroStore` interface.

Development may use `MemoryZeroStore`. Production fails closed unless a durable adapter is configured.

The initial production adapter is `NeonDataApiZeroStore`, powered by Neon Data API over HTTPS through `@neondatabase/neon-js`. It is activated with `NEON_DATA_API_URL` and `ZEROAI_NEON_DATA_API_TOKEN`.

The canonical SQL model and atomic ZeroState write function live in `db/schema.sql`.
