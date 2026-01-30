# QuickSheets troubleshooting

Most issues are env/config, CORS, or missing DB. Use this page first; then [ENV.md](./ENV.md) and [SETUP.md](./SETUP.md).

---

## Backend won’t start

| Symptom | Cause | Fix |
|--------|------|-----|
| `Error: connect ECONNREFUSED` or DB errors on startup | Postgres not running or wrong `DATABASE_URL` | Start Postgres, set `DATABASE_URL` in `.env` (e.g. `postgresql://user:pass@localhost:5432/quicksheets`). Run `psql "$DATABASE_URL" -c "select 1"` to test. |
| `ENCRYPTION_KEY is not set` | You set encryption in code but not in env | Either set `ENCRYPTION_KEY` in `.env` (32-byte hex or any string), or remove/omit it to store tokens in plaintext (dev only). |
| `Port 3000 already in use` | Another process on 3000 | Change `PORT` in `.env` (e.g. `PORT=3001`) or stop the other process. |
| `Cannot find module 'X'` | Dependencies not installed or wrong directory | From `backend/`: run `npm install`, then `npm run dev` again. |

**Where to look:** `backend/.env`, `backend/db/schema.sql` (migrations), terminal output.

---

## 401 Unauthorized (Connect QuickBooks / Refresh)

| Symptom | Cause | Fix |
|--------|------|-----|
| 401 on `POST /api/refresh` or “Connect QuickBooks first” | No session cookie (add-in not sending or backend not setting it) | 1) Use **Try with demo data** or **Connect QuickBooks** so the backend sets the cookie. 2) Ensure the add-in calls the backend with `credentials: "include"` and that `CORS_ORIGIN` matches the add-in’s origin exactly (see [ENV.md](./ENV.md)). 3) If using a dialog for OAuth, the callback must set the cookie and the add-in’s domain must match `CORS_ORIGIN`. |
| 401 right after “Connect QuickBooks” | Callback didn’t set cookie or cookie not sent | Check that `QBO_REDIRECT_URI` in `.env` matches the redirect URI in the Intuit app (including http/https and port). After login, you should be redirected back and see “Connected.” If not, check backend logs for OAuth errors. |

**Where to look:** `backend/src/routes/auth.ts` (callback, cookie), `backend/src/middleware/session.ts`, browser DevTools → Application → Cookies (cookie name: `quicksheets_user_id`).

---

## 402 Payment required

| Symptom | Cause | Fix |
|--------|------|-----|
| 402 on `POST /api/refresh` with “An active subscription is required” | Billing is enabled and user has no active/trialing Stripe subscription | 1) **Demo / no QBO:** Use **Try with demo data** or connect once and then use **Refresh** without a subscription — demo and “no QBO connection” flows don’t require a subscription. 2) **Real QBO:** User must subscribe: call `POST /api/create-checkout-session` (with session cookie), redirect user to returned URL, complete Stripe Checkout. 3) **Disable billing:** Remove or leave empty `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` so the backend doesn’t enforce subscription (see [ENV.md](./ENV.md)). |

**Where to look:** `backend/src/services/stripe.ts` (`hasActiveSubscription`), `backend/src/routes/reports.ts` (402 branch), Stripe Dashboard → Customers / Subscriptions.

---

## QuickBooks connection / token errors

| Symptom | Cause | Fix |
|--------|------|-----|
| “No QuickBooks connection found” | User hasn’t connected QBO or DB has no row in `qbo_connections` | User must click **Connect QuickBooks** and complete Intuit login. Check `qbo_connections` for that `user_id`. |
| “Token refresh did not return access_token” or QBO API errors after some time | Access token expired and refresh failed (revoked token, wrong client id/secret, or Intuit sandbox issue) | 1) User disconnects and reconnects via **Connect QuickBooks**. 2) Confirm `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, and `QBO_REDIRECT_URI` match the Intuit app. 3) In sandbox, ensure the app is in development and the redirect URI is exactly the one registered. |
| “Invalid redirect_uri” or “invalid_grant” in callback | Redirect URI mismatch or code already used | `QBO_REDIRECT_URI` in `.env` must match **exactly** the redirect URI in the Intuit app (scheme, host, port, path). Use the same URL when opening the OAuth link (e.g. `/auth/qbo?dialog=true`). |

**Where to look:** `backend/src/services/quickbooks.ts` (token refresh), `backend/src/routes/auth.ts` (callback), Intuit app **Keys & credentials** and **Redirect URIs**.

---

## Excel add-in doesn’t load

| Symptom | Cause | Fix |
|--------|------|-----|
| Blank task pane or “This add-in is no longer available” | Manifest or hosting: wrong URL, not HTTPS, or file not found | 1) Serve the add-in over **HTTPS** (required by Office). 2) In `manifest.xml`, ensure `SourceLocation` and icon URLs load in a browser. 3) Use **Insert → Get Add-ins → Upload My Add-in** and select the correct `manifest.xml`. |
| Task pane loads but “Connect” / “Refresh” do nothing or show errors | Add-in can’t reach backend (CORS, wrong API URL, or backend down) | 1) Open DevTools (if available) or check network tab: requests should go to your backend and not be blocked by CORS. 2) Set backend `CORS_ORIGIN` to the add-in’s origin (e.g. `https://localhost:3000` if that’s where the task pane is served). 3) Ensure the add-in’s API base URL points to your backend (see SETUP.md). |

**Where to look:** `excel-addin/manifest.xml`, `excel-addin/src/taskpane/taskpane.ts` (API_BASE), backend `CORS_ORIGIN`.

---

## CORS errors in browser

| Symptom | Cause | Fix |
|--------|------|-----|
| “Access to fetch has been blocked by CORS policy” | Backend `CORS_ORIGIN` doesn’t match the request origin, or missing credentials support | Set `CORS_ORIGIN` in backend `.env` to the **exact** origin of the page calling the API (e.g. `https://localhost:3000` for the Excel task pane). No trailing slash. Backend already sends `Access-Control-Allow-Credentials: true`; don’t use `*` for origin. |

**Where to look:** `backend/src/index.ts` (CORS headers), `backend/.env` (`CORS_ORIGIN`), [ENV.md](./ENV.md).

---

## Stripe webhook not updating subscription

| Symptom | Cause | Fix |
|--------|------|-----|
| User paid but still gets 402 | Webhook not received, signature invalid, or handler didn’t update DB | 1) In Stripe Dashboard → **Developers → Webhooks**, check the endpoint for recent events and errors. 2) Ensure `STRIPE_WEBHOOK_SECRET` is the **Signing secret** for that endpoint. 3) Webhook must receive raw body: backend uses `express.raw()` for `POST /webhooks/stripe`. 4) Check backend logs when you trigger a test event (e.g. `checkout.session.completed`). |

**Where to look:** `backend/src/routes/billing.ts` (`handleStripeWebhook`), `backend/src/index.ts` (raw body for `/webhooks/stripe`), Stripe Dashboard → Webhooks.

---

## Reports empty or wrong format

| Symptom | Cause | Fix |
|--------|------|-----|
| Sheets created but empty or only headers | QBO report returned no rows or different structure | Normalize logic in `backend/src/routes/reports.ts` (`normalizeReport`) to match the actual QBO Reports API response (columns/rows). For sandbox, some reports may be empty; try with a company that has data. |
| “Failed to fetch reports” (500) | QBO API error or token invalid | Check backend logs for the exact error. Often token expiry or refresh failure — user can **Connect QuickBooks** again to get new tokens. |

**Where to look:** `backend/src/routes/reports.ts`, `backend/src/services/quickbooks.ts`, QBO Reports API docs.

---

## Still stuck?

1. **Env:** [ENV.md](./ENV.md) — every variable, what it does, and what breaks if it’s wrong.
2. **Flow:** [ARCHITECTURE.md](./ARCHITECTURE.md) — request flow and where auth/tokens live.
3. **Setup:** [SETUP.md](./SETUP.md) — step-by-step setup.
4. **Code:** Run `npm run quality` from repo root; fix any lint/format/build errors so you have a clean baseline.

If you’ve checked the above and still have an issue, open a GitHub issue with: what you did, what you expected, what happened (exact message or log line), and your env (redact secrets).
