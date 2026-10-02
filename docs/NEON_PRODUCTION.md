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
- Anonymous CRUD grants: revoked

ZeroAI runtime access uses a dedicated Neon Auth service account whose JWT role is `zeroai_service`.

The production database grants `zeroai_service` CRUD access to the ZeroAI canonical tables and execute access to `zero_put_state`. Human Neon Auth users do not receive those database privileges by default.

## Neon Auth

- Base URL: `https://ep-broad-frog-b4hdhmen.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth`
- JWKS: `https://ep-broad-frog-b4hdhmen.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json`

Neon Auth is the human sign-in system and the issuer for the internal Data API service JWT.

ZeroAI customer API keys remain a separate application-level authorization system.

## Machine authorization chain

```text
Customer ZeroAI API key
        ↓
ZeroAI scope check
        ↓
ZeroAI server
        ↓
Neon Auth service session
        ↓
short-lived JWT (role=zeroai_service)
        ↓
Neon Data API
        ↓
Postgres
```

Customers never receive the Neon session or JWT.

See `docs/SERVICE_AUTH.md`.

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
- PostgreSQL role `zeroai_service`

The schema and service-role grants are reproducible from `db/schema.sql`.
