# Contributing to QuickSheets

This doc helps you run, test, and change the code so most issues can be fixed without waiting on maintainers.

## Before you start

- **Setup:** Follow [docs/SETUP.md](docs/SETUP.md) so backend and add-in run locally.
- **Problems?** Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) and [docs/ENV.md](docs/ENV.md) first.

## Code quality (required)

We keep **zero ESLint errors, zero ESLint warnings, and Prettier-clean code.**

From the repo root:

```bash
npm run quality
```

This runs, in order:

1. **Prettier** — `format:check` in backend and excel-addin.
2. **ESLint** — `lint` with `--max-warnings 0` in both packages.
3. **TypeScript** — `build` in both packages.

Fix any failure before opening a PR.

### Per-package commands

```bash
# Backend
cd backend
npm run format:check   # Check formatting
npm run format        # Fix formatting
npm run lint          # ESLint (max-warnings 0)
npm run build         # TypeScript

# Excel add-in
cd excel-addin
npm run format:check
npm run format
npm run lint
npm run build
```

## Where to change what

| Goal | Where to look |
|------|----------------|
| Fix “Backend won’t start” / DB / env | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), [docs/ENV.md](docs/ENV.md), `backend/.env` |
| Fix 401 / session / cookie | `backend/src/routes/auth.ts`, `backend/src/middleware/session.ts`, [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#401-unauthorized) |
| Fix 402 / subscription | `backend/src/services/stripe.ts`, `backend/src/routes/reports.ts`, [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#402-payment-required) |
| Fix QBO / token refresh | `backend/src/services/quickbooks.ts`, `backend/src/services/tokens.ts`, [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#quickbooks-connection--token-errors) |
| Fix add-in not loading / CORS | `excel-addin/manifest.xml`, `backend` CORS_ORIGIN, [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#excel-add-in-doesnt-load) |
| Add or change an API route | `backend/src/routes/`, `backend/src/index.ts` |
| Change report shape or add report | `backend/src/routes/reports.ts`, `backend/src/services/quickbooks.ts` |
| Change DB schema | `backend/db/schema.sql`, then run migration and update services that use the table |

High-level flow and “where things live”: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Making a change

1. Create a branch from `main` (or the current default branch).
2. Make your changes. Keep PRs focused (e.g. one fix or one feature).
3. Run `npm run quality` from the repo root and fix any errors or warnings.
4. Test manually: backend health, demo flow, Connect QuickBooks + Refresh (and billing if you use it).
5. Open a PR with a short description and, if it fixes an issue, reference the issue.

## Getting help

- **Setup / env / “it doesn’t work”:** [docs/SETUP.md](docs/SETUP.md), [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), [docs/ENV.md](docs/ENV.md).
- **“Where do I change X?”:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Bugs or feature requests:** Open a GitHub issue; include what you did, what you expected, and what happened (and env/config if relevant, with secrets redacted).
