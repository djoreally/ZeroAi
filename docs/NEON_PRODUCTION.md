# ZeroAI production Neon topology

## Project

- Project ID: `fancy-tree-06659679`
- Project name: `zeroa1`
- Region: `aws-us-east-2`
- PostgreSQL: 18
- Production branch: `br-long-band-b4kl74qf`

## Data API

- Status: active
- Database: `neondb`
- URL: `https://ep-broad-frog-b4hdhmen.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1`
- Auth provider: Neon Auth
- Exposed schema: `public`
- Anonymous role: `anonymous`
- Anonymous grants: intentionally not provisioned

ZeroAI runtime access must use a valid JWT accepted by the Data API. Do not grant anonymous CRUD access to the `zero_*` tables.

## Neon Auth

- Base URL: `https://ep-broad-frog-b4hdhmen.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth`
- JWKS: `https://ep-broad-frog-b4hdhmen.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json`

Neon Auth is the human sign-in system. Workspace/API-key authorization remains a ZeroAI concern.

## AI Gateway

- Enabled
- Base URL: `https://br-long-band-b4kl74qf-api.ai.c-6.us-east-2.aws.neon.tech`

The gateway is an execution-plane provider. Model output never bypasses ZeroPolicy, ZeroState, ZeroLedger, or ZeroCert.

## Object storage

- S3-compatible endpoint: `https://br-long-band-b4kl74qf.storage.c-6.us-east-2.aws.neon.tech`
- Region: `us-east-2`
- Default bucket: `uploads`

Store large evidence artifacts in object storage. Store their hashes, metadata, ownership, and evidence references in Postgres.

## Applied database objects

The production database contains:

- `zero_workspaces`
- `zero_api_keys`
- `zero_state`
- `zero_events`
- `zero_memory_facts`
- `zero_executions`
- `zero_evidence`
- `zero_certifications`
- `zero_put_state(...)`

The schema was applied transactionally from `db/schema.sql`.
