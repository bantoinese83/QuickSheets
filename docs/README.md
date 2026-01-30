# QuickSheets docs

Use these so you can fix most issues yourself.

| Doc | When to use it |
|-----|----------------|
| **[SETUP.md](SETUP.md)** | First-time setup: backend, add-in, Intuit app, optional Stripe. Step-by-step with copy-paste commands. |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Something’s broken: backend won’t start, 401/402, QBO/Stripe/add-in errors. Symptom → cause → fix and where to look. |
| **[ENV.md](ENV.md)** | Every env var: required vs optional, default, what breaks if missing or wrong. |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Request flow and where things live (session, tokens, subscription, reports). Use when you need to change or debug behavior. |
| **[DOCKER.md](DOCKER.md)** | Run backend + Postgres with Docker Compose; optional add-in container; env and troubleshooting. |

**Suggested path:** Setup → something fails → TROUBLESHOOTING → if it’s env → ENV; if you need to change code → ARCHITECTURE and [CONTRIBUTING.md](../CONTRIBUTING.md). Using Docker → DOCKER.
