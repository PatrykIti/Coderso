# Local Development Setup

This page gets you from a fresh clone to a running Coderso dev server. It matters because Coderso is a single Bun process backed by PostgreSQL — once those two are wired up, almost everything else (content, themes, settings, plugins) is configured live from the Admin UI, not from code.

## Prerequisites

Coderso uses **Bun** as both its runtime and package manager. There is no Node runtime, no `.nvmrc`, and no `engines` field — every script in the repo invokes `bun` directly.

| Tool | Why | Notes |
| --- | --- | --- |
| [Bun](https://bun.sh) | Runtime + package manager | The Docker image pins `oven/bun` (`1.3.x`); any recent Bun works locally. |
| [PostgreSQL](https://www.postgresql.org) | Primary datastore | Required to boot, migrate, and run DB-backed tests. Drizzle dialect is `postgresql`. |

You need a reachable Postgres database and its connection string before the server will start.

## Clone and install

```bash
git clone <your-fork-or-origin> coderso
cd coderso
bun install
```

`bun install` installs every workspace at once. The monorepo declares three workspaces — `core`, `store`, and `packages/*` — so a single install covers the product runtime, the Store backend, and the `@core/sdk` package.

## Configure your environment

Copy the example file and fill in the values that the server reads at boot:

```bash
cp .env.example .env
```

ENV in Coderso is reserved for **critical infrastructure** only — connection strings and encryption keys. Business configuration (site URL, locale, auth TTLs, themes, security policy) lives in the database and is edited from the Admin UI, not here.

### Required to boot

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Ships as `postgres://user:password@localhost:5432/coderso`. |
| `PII_ENC_KEY` | AES-256-GCM key for email encryption (32 bytes). |
| `PII_HASH_KEY` | HMAC key for the email lookup hash (32+ bytes recommended). |
| `MEDIA_SECRET_MASTER_KEY` | Master key for encrypting media provider secrets (32 bytes). |

Generate the secret keys with anything that produces 32 random bytes, for example:

```bash
openssl rand -hex 32
```

### Commonly needed soon after

| Variable | Purpose |
| --- | --- |
| `FORM_SUBMIT_NONCE_SECRET` | HMAC secret for public form submission nonces. Required once you serve public forms. |
| `AUTH_PASSWORD_PEPPER` | Optional pepper for password hashing. Rotating it forces password resets, so set it once and leave it. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed bootstrap admin credentials (defaults: `admin@example.com` / `change-me`). |

The defaults already wired in `.env.example` for local work: `PORT=3000`, `PUBLIC_BASE_URL=http://localhost:3000`, `MEDIA_STORAGE=local`, `MEDIA_DIR=./storage/media`, and `EMAIL_TRANSPORT=mock`. The `VITE_*` URLs point the dev servers at the right ports (see below). Cloud storage (`S3_*`, `AZURE_*`) and the Store/plugin knobs (`STORE_BASE_URL`, `PLUGINS_RUNTIME_DIR`, …) stay blank until you need them.

> The `TEST_OPENAI_*` / `TEST_OPENROUTER_*` keys are used only by opt-in Assistant live tests — leave them empty for normal development.

## Run database migrations

Migrations are Drizzle SQL files versioned in `core/db/migrations/`, driven by `core/db/drizzle.config.ts`. Both DB scripts source `.env` automatically, so set `DATABASE_URL` first, then:

```bash
bun run db:migrate
```

This applies all pending migrations to the database named in `DATABASE_URL`. If you change `core/db/schema.ts` and need a new migration file, generate it with:

```bash
bun run db:generate
```

## Seed a local admin

After migrations are applied, seed the bootstrap admin user into the database named by `DATABASE_URL`:

```bash
bun run db:seed:admin
```

The command sources `.env`, reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`, creates the `admin` role when missing, creates the user when missing, and attaches the role idempotently. Override the credentials inline for one-off local databases, for example:

```bash
ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD=local-password bun run db:seed:admin
```

## Start the dev server

```bash
bun run dev
```

This runs both workspaces concurrently (labelled `core` and `store`). Under the hood:

| Script | Runs | What it does |
| --- | --- | --- |
| `bun run dev` | core + store together | `concurrently` wrapper around the two below. |
| `bun run dev:core` | `bun --cwd core dev` → `bun run server/dev.ts` | The product runtime: Bun HTTP server plus two Vite dev servers. |
| `bun run dev:store` | `bun --cwd store dev` | Store backend — **currently a stub** (`echo store dev`). |

Most day-to-day work only needs `bun run dev:core`.

### Ports

`core/server/dev.ts` boots the Bun HTTP server and spawns two Vite dev servers (one for the admin SPA, one for the public site):

| Service | URL | ENV |
| --- | --- | --- |
| Core HTTP server (API + admin + SSR) | `http://localhost:3000` | `PORT` |
| Admin Vite dev server | `http://localhost:5173` | `VITE_DEV_SERVER_URL` |
| Public site Vite dev server | `http://localhost:5174` | `VITE_SITE_DEV_SERVER_URL` |

Open `http://localhost:3000` in your browser — that single port serves both the API and the admin app. The Vite servers exist only in dev; production runs `bun run server/prod.ts` with no Vite involved.

## First run: the Setup Wizard

On a fresh database, the app routes you into the **Setup Wizard**. It writes its answers to the `settings` table and flips `setup.completed=true` — this is your first encounter with Coderso's no-restart model, where configuration is data, not code.

You will be asked for:

- **`site.publicBaseUrl`** — the public origin of the site (the DB value is the live source of truth; `PUBLIC_BASE_URL` is only a boot fallback).
- **Locale and site name** — default language and display name.
- **Auth TTLs** — `auth.sessionTtlDays` (session lifetime) and `auth.resetTtlMinutes` (password-reset link lifetime).

Once submitted, these apply immediately with no restart — and so will most things you change afterward (pages, menus, themes, security policy). Only core source changes, new migrations, and the critical infra ENV values above require a restart or redeploy.

## Troubleshooting

**Database not reachable / migrations hang or error.**
Confirm Postgres is running and `DATABASE_URL` is correct, then re-run:

```bash
bun run db:migrate
```

A wrong host, port, database name, or credentials in `DATABASE_URL` is the most common cause. The DB scripts source `.env`, so edits to `DATABASE_URL` take effect on the next run.

**Server won't boot / decryption or key errors.**
Make sure the required secrets are set and non-empty: `PII_ENC_KEY`, `PII_HASH_KEY`, and `MEDIA_SECRET_MASTER_KEY`. They must be valid 32-byte keys (use `openssl rand -hex 32`).

**Public form submissions rejected.**
Set `FORM_SUBMIT_NONCE_SECRET` — public forms need it to validate submission nonces.

**Port already in use.**
Change `PORT` (and the matching `VITE_*` URLs) in `.env`, or stop the process holding `3000` / `5173` / `5174`.

**Need to manually load `.env` for an ad-hoc command.**
Most scripts source it for you. If you run something directly, load it first:

```bash
set -a && source .env && set +a
```

## Where to go deeper

- [`_docs/SETTINGS.md`](../../_docs/SETTINGS.md) — the full Settings catalogue, including every `site.*` and `auth.*` key the Setup Wizard writes.
- [`_docs/DATA_MODEL.md`](../../_docs/DATA_MODEL.md) — the database schema and table reference behind the migrations.
- [`./project-structure.md`](./project-structure.md) — how `core`, `store`, and `packages` fit together.
- [`./runtime-model.md`](./runtime-model.md) — the no-restart model: what applies live versus what needs a rebuild.
- [`./testing.md`](./testing.md) — running the unit, integration, and live test lanes.
