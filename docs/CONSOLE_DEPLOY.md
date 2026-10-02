# ZeroAI console deployment

ZeroAI ships as one Next.js application.

## Production URL

- Canonical production URL: `https://zeroaifrt.vercel.app`
- Canonical Git repository: `djoreally/ZeroAi`
- Production branch: `main`

## Surfaces

- `/` — public product site
- `/login` — regular sign in
- `/signup` — regular customer signup
- `/admin/setup` — one-time platform-admin password setup
- `/admin/reset-password` — tokenized admin password creation
- `/dashboard` — customer/user console
- `/control-plane` — platform administration shell
- `/api/v1/*` — ZeroAI BaaS/control-plane APIs

## Hosting

Deploy the Next.js application to Vercel from `djoreally/ZeroAi`.

Neon remains the backend provider for:

- Auth
- Data API / Postgres
- Object Storage
- AI Gateway

The frontend and ZeroAI API routes deploy together. A separate backend Vercel project is not required.

## Production environment

Required console/auth values:

- `ZEROAI_APP_URL`
- `ZEROAI_PLATFORM_ADMIN_EMAIL` or `ZEROAI_PLATFORM_ADMIN`
- `NEXT_PUBLIC_NEON_AUTH_BASE_URL`
- `NEON_AUTH_BASE_URL`

Required ZeroAI runtime values remain documented in `.env.example`.

## Platform-admin bootstrap

1. Pre-create the human admin in Neon Auth.
2. Assign the Neon Auth role `platform_admin`.
3. Configure the same email in `ZEROAI_PLATFORM_ADMIN_EMAIL` or `ZEROAI_PLATFORM_ADMIN`.
4. Open `/admin/setup`.
5. Enter the configured admin email.
6. Neon Auth sends a password-setup/reset token.
7. The link returns to `/admin/reset-password`.
8. The admin chooses their own password.
9. Future sessions use the normal `/login` path.
10. `/control-plane` checks the authenticated role for `platform_admin`.

Regular signup can never assign `platform_admin`.

## Workspace authority

Human authentication and workspace authorization are separate.

- Neon Auth proves identity/session.
- `zero_workspace_memberships` determines workspace role.
- ZeroPolicy determines action authority.
- ZeroAI API keys authenticate machine clients.

## Deployment order

1. Merge console PR.
2. Create/connect Vercel project to `djoreally/ZeroAi`.
3. Add production environment variables.
4. Set `ZEROAI_APP_URL=https://zeroaifrt.vercel.app`.
5. Add that origin to Neon Auth trusted domains.
6. Pre-create and role the platform admin.
7. Deploy from `main`.
8. Run admin password setup.
9. Verify login and role separation.
10. Run persistence health and managed persistence E2E.
11. Only then treat the console as production-certified.
