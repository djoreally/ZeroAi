# ZeroAI tenancy and canonical state

Every durable record belongs to a workspace.

## Isolation boundary

The workspace ID is the primary tenancy boundary for:

- API keys
- canonical state
- ZeroLedger event streams
- memory facts
- executions
- evidence
- certification records

A client never supplies its authoritative workspace ID on authenticated BaaS calls. The runtime derives it from the API key.

## Administrative bootstrap

Workspace creation and initial API-key provisioning require the server-side `ZEROAI_ADMIN_TOKEN`.

That token is separate from workspace API keys and must never be exposed to browser clients.

## API keys

Keys are shown once.

Only the prefix and a scrypt-derived secret hash are stored. Scope checks are deterministic and occur before state access.

Example scopes:

- `state:read`
- `state:write`
- `events:read`
- `events:write`
- `memory:read`
- `memory:write`
- `execution:run`
- `evidence:write`
- `certification:write`
- `*`

## Canonical state

ZeroState uses optimistic concurrency.

A write may include `expectedVersion`. A stale writer receives `409 STATE_VERSION_CONFLICT` rather than silently overwriting newer state.

Each value carries a content hash.

## Persistence safety

The bundled memory store exists only for development and unit testing.

In production, `getStore()` fails closed with `ZEROAI_PERSISTENCE_NOT_CONFIGURED` until a durable adapter is configured. ZeroAI must never report persistence while silently writing ephemeral state.
