# QuickSheets setup guide

Step-by-step setup so you can run the backend, Excel add-in, and optional billing. If something fails, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Prerequisites

- **Node.js** 18+ (`node -v`)
- **PostgreSQL** (local or hosted) — for users and QBO tokens
- **Intuit Developer account** — [developer.intuit.com](https://developer.intuit.com) (free) for QuickBooks OAuth
- **Excel** (desktop or online) — for the add-in
- **Stripe account** (optional) — only if you enable billing

## 1. Backend

### 1.1 Database

Create a database and run the schema:

```bash
createdb quicksheets
# Or use a hosted Postgres and note the connection string.
```

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL (see docs/ENV.md)
psql "$DATABASE_URL" -f db/schema.sql
```

If the DB already exists and you’re adding Stripe columns, run the commented `ALTER` block at the bottom of `db/schema.sql`.

### 1.2 Intuit (QuickBooks) app

1. Go to [developer.intuit.com](https://developer.intuit.com) → **Apps** → **Create an app** → **QuickBooks Online**.
2. Under **Keys & credentials**, copy **Client ID** and **Client secret**.
3. Add a **Redirect URI**: `http://localhost:3000/auth/qbo/callback` (dev) or your production callback URL.
4. In **Scopes**, enable **Accounting** (or `com.intuit.quickbooks.accounting`).
5. Put **Client ID** and **Client secret** in `.env` as `QBO_CLIENT_ID` and `QBO_CLIENT_SECRET`. Set `QBO_REDIRECT_URI` to the same URL you added in the Intuit app. Use `QBO_USE_SANDBOX=true` for sandbox.

### 1.3 Run the backend

```bash
cd backend
npm install
npm run dev
```

- **Health:** open `http://localhost:3000/health` — should return `{"status":"ok","service":"quicksheets-api"}`.
- If it fails, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#backend-wont-start).

## 2. Excel add-in

### 2.1 Build and serve

The add-in must be served over **HTTPS** (Office requirement). For local dev you can use the Office Add-in dev server or any static server with HTTPS.

```bash
cd excel-addin
npm install
npm run build
```

- **Option A — Office Add-in debugging:** From `excel-addin`, run `npm start` and follow the prompts to sideload in Excel. Ensure the manifest’s `SourceLocation` and icon URLs point to your HTTPS host (e.g. the URL the dev server prints).
- **Option B — Your own HTTPS host:** Serve the contents of `excel-addin/dist` (e.g. `dist/taskpane/taskpane.html` as the task pane URL). Update `manifest.xml` so all URLs (task pane, icons, etc.) use that host.

### 2.2 Sideload in Excel

1. In Excel: **Insert** → **Get Add-ins** → **Upload My Add-in**.
2. Select `excel-addin/manifest.xml` (or the manifest you customized).
3. The QuickSheets task pane should open. If it doesn’t, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#excel-add-in-doesnt-load).

### 2.3 Connect add-in to your backend

The task pane calls your backend for auth and refresh. Set the add-in’s API base URL to your backend (e.g. `https://localhost:3000` in dev). If you use a different host/port, configure it in the add-in (e.g. the `API_BASE` / `__API_BASE__` used in `taskpane.ts`). Backend and add-in must agree on **CORS**: set the backend’s `CORS_ORIGIN` to the add-in’s origin (see [ENV.md](./ENV.md)).

## 3. Optional: Stripe billing

Only needed if you want to charge for Refresh (e.g. $49/mo).

1. Create a **Product** and a **Price** (recurring monthly) in Stripe. Copy the **Price ID** → `STRIPE_PRICE_ID`.
2. In Stripe **Developers** → **Webhooks**, add an endpoint: `https://your-api.com/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
3. Set in `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` (see [ENV.md](./ENV.md)).
4. Restart the backend. Users without an active subscription get **402** on `POST /api/refresh` unless they use demo or “no QBO connection” flow.

## 4. Verify end-to-end

1. **Demo:** In the add-in, click **Try with demo data**, then **Refresh Reports**. You should see demo P&L, Balance Sheet, and Cash Flow in sheets `QS_PnL`, `QS_BS`, `QS_CashFlow`.
2. **QuickBooks:** Click **Connect QuickBooks**, sign in with Intuit (sandbox or prod), then **Refresh Reports**. Same sheets should show live QBO data (and 402 if billing is on and the user isn’t subscribed).

If any step fails, use [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) and [ENV.md](./ENV.md).
