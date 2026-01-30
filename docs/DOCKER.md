# Docker

Run QuickSheets backend and Postgres with Docker Compose. Optional: build and serve the Excel add-in in a container.

## Prerequisites

- Docker and Docker Compose (v2+)
- Backend env vars: copy `backend/.env.example` to `backend/.env` and set at least `CORS_ORIGIN`; add `QBO_*` and `STRIPE_*` if you use them. **`DATABASE_URL` is set by Compose** (you don’t need it in `.env` for Docker).

## Backend + Postgres

From the repo root:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env: set CORS_ORIGIN (e.g. http://localhost:3000), QBO_*, STRIPE_* as needed

docker compose up -d
```

- **Postgres:** `localhost:5432`, user `quicksheets`, password `quicksheets`, db `quicksheets`. Data is in volume `postgres_data`.
- **Backend:** `http://localhost:3000`. Health: `http://localhost:3000/health`.
- On first start, the backend entrypoint runs `db/schema.sql` (idempotent). No separate migration step.

### Env for Docker

Compose sets for the backend:

- `DATABASE_URL=postgresql://quicksheets:quicksheets@postgres:5432/quicksheets`
- `PORT=3000`
- `CORS_ORIGIN=http://localhost:3000` (override in `backend/.env` if needed)
- `NODE_ENV=development` so HTTPS is not required for local Docker. For production, set `NODE_ENV=production` and put the backend behind an HTTPS reverse proxy.

All other vars (e.g. `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `STRIPE_SECRET_KEY`) come from `backend/.env`. See [ENV.md](ENV.md).

### Build only (no cache)

```bash
docker compose build --no-cache
docker compose up -d
```

### Logs and shell

```bash
docker compose logs -f backend
docker compose exec backend sh
docker compose down
```

## Excel add-in (optional)

The add-in is static HTML/JS. You can build and serve it with Docker for a consistent environment; **Excel requires HTTPS** for the add-in URL, so in production put the container behind HTTPS (reverse proxy or tunnel).

### Build and run add-in container

```bash
docker build -t quicksheets-addin ./excel-addin
docker run -p 8080:80 --name quicksheets-addin quicksheets-addin
```

Task pane: `http://localhost:8080/taskpane/taskpane.html`. Update your `manifest.xml` `SourceLocation` and icon URLs to this host (or your HTTPS URL). For local testing with Excel, use an HTTPS tunnel (e.g. ngrok) to expose port 8080 and point the manifest to the tunnel URL.

### Add add-in to Compose

To run add-in and backend together, add to `docker-compose.yml`:

```yaml
  addin:
    build:
      context: ./excel-addin
      dockerfile: Dockerfile
    image: quicksheets-addin
    ports:
      - "8080:80"
```

Then:

```bash
docker compose up -d
# Add-in: http://localhost:8080/taskpane/taskpane.html
# Backend: http://localhost:3000
```

Set backend `CORS_ORIGIN` to the add-in origin (e.g. `http://localhost:8080`) so the task pane can call the API. If you use an HTTPS tunnel for the add-in, set `CORS_ORIGIN` to that origin.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend exits or "connection refused" to DB | Postgres may not be ready. Compose uses `depends_on` + healthcheck; if it still fails, check `docker compose logs postgres` and retry. |
| 401 / CORS when add-in calls backend | Set backend `CORS_ORIGIN` to the exact add-in origin (e.g. `http://localhost:8080` or your tunnel URL). No trailing slash. |
| "ENCRYPTION_KEY is not set" | Add `ENCRYPTION_KEY` to `backend/.env` or remove it to store tokens in plaintext (dev only). |
| Excel won’t load add-in from Docker URL | Excel requires HTTPS for the add-in. Use an HTTPS reverse proxy or tunnel (e.g. ngrok) for the add-in URL and point the manifest there. |
| Schema already applied | The entrypoint runs `db/schema.sql` every start; it uses `create table if not exists` so it’s safe. |

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for non-Docker issues.
