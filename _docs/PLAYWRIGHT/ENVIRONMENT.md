# Playwright Environment

## Local Targets

TASK-336 Playwright smoke assumes the standard local development ports:

- Admin UI: `http://localhost:5173/admin`
- Public frontend: `http://localhost:3000`
- Site Vite dev server used by core: `http://localhost:5174`

Start the local stack from the repo root:

```bash
bun run dev:core
```

The command starts the core HTTP server on `PORT` or `3000`, the admin Vite
server on `VITE_DEV_SERVER_URL` or `http://localhost:5173`, and the site Vite
server on `VITE_SITE_DEV_SERVER_URL` or `http://localhost:5174`.

## Environment Variables

Before running tests that touch DB-backed pages, settings, or persisted
fixtures, load repo environment variables:

```bash
set -a && source .env && set +a
```

Do not write credentials, cookies, local storage snapshots, or browser session
state into `_docs/PLAYWRIGHT`.

The widget contract smoke reads admin credentials only from environment
variables:

- `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD`
- fallback: `PLAYWRIGHT_ADMIN_EMAIL` / `PLAYWRIGHT_ADMIN_PASSWORD`

Keep these values in local shell environment or `.env` only. The harness uses
the admin API under the configured admin URL to create a temporary
Playwright storage state in `.tmp/playwright-widget-contract-smoke/` and
removes that state before exit. Generated probe files must not contain the
credential values.

## Widget Contract Smoke

Run the repeatable TASK-336 widget editor/frontend smoke from the repo root:

```bash
CODERSO_PLAYWRIGHT_EMAIL="<admin email>" \
CODERSO_PLAYWRIGHT_PASSWORD="<admin password>" \
bun scripts/playwright-widget-contract-smoke.ts \
  --session widget-contract-smoke \
  --admin http://localhost:5173/admin \
  --front http://localhost:3000
```

Useful debug variants:

```bash
bun scripts/playwright-widget-contract-smoke.ts --dry-run
bun scripts/playwright-widget-contract-smoke.ts --widget spacer --session widget-contract-smoke-spacer
bun scripts/playwright-widget-contract-smoke.ts --strict
```

Tracked outputs:

- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json`
- `_docs/PLAYWRIGHT/widget-contract-smoke-results.json`
- `_docs/PLAYWRIGHT/widget-contract-smoke-results.md`

Local-only outputs:

- `.tmp/playwright-widget-contract-smoke/*.js`
- `.tmp/playwright-widget-contract-smoke/screenshots/*.png`
- `.tmp/playwright-widget-contract-smoke/admin-auth-state.json`

## Artifact Policy

Tracked evidence should be sanitized Markdown or JSON:

- Use `_docs/PLAYWRIGHT/*.md` for human-readable reports.
- Use `_docs/PLAYWRIGHT/*.json` for sanitized structured smoke results.
- Treat screenshots as local scratch artifacts unless a task deliberately adds
  a safe gitignore exception and verifies that no secrets are visible.
- Treat raw `_raw` Playwright output as scratch unless it is sanitized and
  promoted into a tracked Markdown or JSON report.

The TASK-336 smoke harness must distinguish environment failures, fixture gaps,
path-metadata gaps, and widget contract failures instead of collapsing them into
one generic failure type.
