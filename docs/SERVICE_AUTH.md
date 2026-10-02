# ZeroAI service authentication

ZeroAI exposes its own workspace API keys to customers. Those keys are not database credentials.

The ZeroAI server authenticates separately to Neon Data API through a dedicated Neon Auth service account.

## Database role

The production database includes a non-login PostgreSQL role named `zeroai_service`.

Only this role receives CRUD privileges on the `zero_*` tables and execute permission on `zero_put_state`.

The `anonymous` role explicitly has no access to those objects.

## Runtime token flow

1. ZeroAI receives a customer request authenticated with a ZeroAI workspace API key.
2. The server validates the ZeroAI API key and its scopes.
3. Internally, ZeroAI signs the dedicated service account into Neon Auth.
4. Neon Auth creates a service session.
5. ZeroAI calls Neon Auth `GET /token` using that session.
6. Neon Auth returns a short-lived signed JWT.
7. The Data API validates that JWT through the branch JWKS.
8. The JWT role must be `zeroai_service`.
9. The Data API performs the requested operation.
10. Customers never receive the Neon session, JWT, database password, or storage credentials.

The server caches the service session and JWT in process memory and refreshes the JWT before expiry.

## Required runtime secrets

Set these only in the deployment environment:

- `ZEROAI_NEON_SERVICE_EMAIL`
- `ZEROAI_NEON_SERVICE_PASSWORD`

As an emergency/transition fallback, `ZEROAI_NEON_DATA_API_TOKEN` may contain a valid short-lived JWT. The service-account flow is preferred because it can refresh automatically.

## One-time service account setup

Create a dedicated Neon Auth account for ZeroAI and assign its Neon Auth role to `zeroai_service`.

Do not reuse a human administrator account.

Do not grant `anonymous` CRUD permissions as a workaround.
