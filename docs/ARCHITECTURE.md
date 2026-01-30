# QuickSheets architecture (where to look)

Short overview so you can find the right place to fix or extend behavior.

## Request flow

1. **Excel add-in** (task pane) loads from your HTTPS host. User clicks **Connect QuickBooks** or **Try with demo data** or **Refresh Reports**.
2. **Auth (Connect / Demo):** Browser opens a dialog to backend `/auth/qbo?dialog=true` or `/auth/demo?dialog=true`. Backend redirects (QBO) or creates session (demo), sets cookie `quicksheets_user_id`, and returns HTML that posts `"connected"` to the opener. Dialog closes; Refresh button enables.
3. **Refresh:** Add-in calls `POST /api/refresh` with `credentials: "include"` (sends cookie). Backend: session from cookie → optional subscription check → optional QBO client (with token refresh) → fetch P&L, Balance Sheet, Cash Flow from QBO (or return demo) → normalize → JSON. Add-in writes result to sheets `QS_PnL`, `QS_BS`, `QS_CashFlow`.

## Where things live

| What | Where |
|------|--------|
| **Session (who is the user)** | Cookie `quicksheets_user_id` set in `backend/src/routes/auth.ts`. Read in `backend/src/middleware/session.ts` (`requireSession`). |
| **QBO tokens** | Stored in `qbo_connections` (see `backend/db/schema.sql`). Read/write in `backend/src/services/tokens.ts`. Optional encryption in `backend/src/services/encryption.ts`. |
| **Token refresh** | `backend/src/services/quickbooks.ts`: `makeQboClient()` checks expiry and calls `refreshAccessToken`, then `upsertConnection`. |
| **Subscription check** | `backend/src/services/stripe.ts` (`hasActiveSubscription`). Used in `backend/src/routes/reports.ts` before calling QBO (402 if no active/trialing). Demo and “no QBO connection” skip this. |
| **Demo data** | `backend/src/data/demo-reports.ts`. Returned by `POST /api/refresh` when user has no QBO connection or `demo: true` in body. |
| **Normalize QBO reports** | `backend/src/routes/reports.ts` → `normalizeReport()`. Converts QBO report JSON to `{ headers, rows }` for Excel. |
| **Stripe webhook** | `POST /webhooks/stripe` in `backend/src/routes/billing.ts` (`handleStripeWebhook`). Updates `users.stripe_customer_id`, `stripe_subscription_id`, `subscription_status`. |
| **CORS / HTTPS** | `backend/src/index.ts` (CORS headers), `backend/src/middleware/security.ts` (`requireHttps`, `validateCorsConfig`). |

## Adding or changing behavior

- **New API route:** Add under `backend/src/routes/` and mount in `backend/src/index.ts`.
- **Change what’s stored per user:** Extend `backend/db/schema.sql` (and run migration), then update `backend/src/services/tokens.ts` or `backend/src/services/stripe.ts` as needed.
- **Change report shape or add a report:** Adjust `normalizeReport` and/or add a fetch in `backend/src/services/quickbooks.ts` and in `backend/src/routes/reports.ts`.
- **Add env var:** Document in `docs/ENV.md` and `backend/.env.example`, then use in code (e.g. `process.env.NEW_VAR`).

For setup and failures, use [SETUP.md](./SETUP.md) and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
