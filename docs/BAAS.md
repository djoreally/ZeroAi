# ZeroAI BaaS

ZeroAI exposes deterministic intelligence infrastructure as a multi-tenant backend service.

## Bootstrap

1. Create a workspace.
2. Create an API key for that workspace.
3. Store the returned token securely; it is returned once.
4. Use `Authorization: Bearer <token>` for authenticated workspace operations.

## Current service surface

### Tenancy

- `POST /api/v1/workspaces`
- `POST /api/v1/workspaces/:workspaceId/api-keys`

### Canonical state

- `GET /api/v1/state/:key`
- `PUT /api/v1/state/:key`

State writes support optimistic concurrency through `expectedVersion`.

### ZeroLedger streams

- `GET /api/v1/events/:stream`
- `POST /api/v1/events/:stream`

Every append is content-hashed, signed, sequence-numbered, and linked to the prior event hash.

### ZeroMemory

- `GET /api/v1/memory/facts`
- `POST /api/v1/memory/facts`

The read projection returns compacted active memory rather than raw history.

### Executions and evidence

- `POST /api/v1/executions`
- `POST /api/v1/executions/:executionId/evidence`
- `POST /api/v1/executions/:executionId/certifications`

Certification reads stored evidence and persists the resulting evidence state. The execution never certifies itself.

## Production persistence

`MemoryZeroStore` is intentionally development-only.

Production throws `ZEROAI_PERSISTENCE_NOT_CONFIGURED` until a durable `ZeroStore` adapter is installed. The canonical SQL model lives in `db/schema.sql`.

The next adapter should implement the same interface through a durable Postgres/Neon Data API boundary without leaking provider-specific behavior into ZeroAI's domain layer.
