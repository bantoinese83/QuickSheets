# Environment variables (backend)

All backend configuration is via environment variables. Copy `backend/.env.example` to `backend/.env` and set values. **Never commit `.env`.**

| Variable | Required | Default | Description | If missing or wrong |
|----------|----------|---------|-------------|----------------------|
| **PORT** | No | `3000` | HTTP port the server listens on. | Server uses 3000; change if port is in use. |
| **CORS_ORIGIN** | Yes (prod) | `https://localhost:3000` | Allowed origin for browser requests (Excel add-in). Must match the add-in’s origin exactly (no trailing slash). | CORS errors in browser; add-in can’t call API. In production, must be set and not `*`. |
| **DATABASE_URL** | Yes | — | Postgres connection string, e.g. `postgresql://user:password@localhost:5432/quicksheets`. | Backend won’t start or DB errors. |
| **ENCRYPTION_KEY** | No | — | Key for encrypting QBO tokens at rest. Use 32-byte hex or any string (hashed to key). Omit in dev to store plaintext. | Tokens stored unencrypted (dev only). In production, set a strong value. |
| **QBO_CLIENT_ID** | Yes (for QBO) | — | Intuit app Client ID. | Connect QuickBooks and real reports won’t work. |
| **QBO_CLIENT_SECRET** | Yes (for QBO) | — | Intuit app Client secret. | Same as above. |
| **QBO_REDIRECT_URI** | Yes (for QBO) | `http://localhost:3000/auth/qbo/callback` | Redirect URI registered in the Intuit app. Must match exactly (scheme, host, port, path). | OAuth callback fails (e.g. invalid redirect_uri / invalid_grant). |
| **QBO_USE_SANDBOX** | No | `true` | Use Intuit sandbox (`true`) or production QBO (`false`). | Wrong environment; sandbox vs prod mismatch. |
| **STRIPE_SECRET_KEY** | No (billing) | — | Stripe secret key (e.g. `sk_test_...` or `sk_live_...`). | Billing endpoints and webhook disabled; no subscription check. |
| **STRIPE_WEBHOOK_SECRET** | No (billing) | — | Stripe webhook signing secret for `POST /webhooks/stripe`. | Webhook signature verification fails; subscription status won’t update. |
| **STRIPE_PRICE_ID** | No (billing) | — | Stripe Price ID for the $49/mo plan (e.g. `price_...`). | Checkout session creation fails or wrong plan. |
| **STRIPE_SUCCESS_URL** | No (billing) | `https://localhost:3000?subscription=success` | URL to redirect after successful payment. | User redirected to wrong URL after paying. |
| **STRIPE_CANCEL_URL** | No (billing) | `https://localhost:3000?subscription=canceled` | URL to redirect if user cancels checkout. | User redirected to wrong URL on cancel. |
| **USE_DEMO_DATA** | No | — | If `true`, when user has no QBO connection, `POST /api/refresh` returns demo data. Optional; same behavior can be triggered by `demo: true` in the request body. | Demo data only when explicitly requested (e.g. **Try with demo data** or `demo: true`). |
| **NODE_ENV** | No | — | Set to `production` in production. Enables HTTPS check and strict CORS. | In production, set to `production` so security middleware runs. |

## Quick reference

- **Minimal (demo only):** `DATABASE_URL`, `CORS_ORIGIN`. Optional: `PORT`, `USE_DEMO_DATA=true`.
- **With QuickBooks:** Add `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`. Use `QBO_USE_SANDBOX=true` for sandbox.
- **With billing:** Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`.
- **Production:** Set `NODE_ENV=production`, `ENCRYPTION_KEY`, and a single explicit `CORS_ORIGIN` (not `*`). Use HTTPS and correct `QBO_REDIRECT_URI` / Stripe URLs for your domain.

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) when something fails after changing env.
