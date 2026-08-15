# Local Development Setup

This page gets you from a fresh clone to a running Coderso dev server. It matters because Coderso is a single Bun process backed by PostgreSQL — once those two are wired up, almost everything else (content, themes, settings, plugins) is configured live from the Admin UI, not from code.

## Prerequisites

Coderso uses **Bun 1.3.14** as its product runtime and package manager. Node is
not a server-runtime replacement: **Node 26.5.x** is the supported auxiliary
runtime for release and frontend tooling, and the root `engines.node` field
records that tooling floor. The root `packageManager` field pins Bun exactly.

| Tool | Why | Notes |
| --- | --- | --- |
| [Bun](https://bun.sh) | Product runtime + package manager | Use `1.3.14`; CI and both Docker stages pin the same version. |
| [Node.js](https://nodejs.org) | Release and frontend tooling | Use `26.5.x`; the Bun server does not run under Node. |
| [PostgreSQL](https://www.postgresql.org) | Primary datastore | Required to boot, migrate, and run DB-backed tests. Drizzle dialect is `postgresql`. |

You need a reachable Postgres database and its connection string before the server will start.

## Clone and install

```bash
git clone <your-fork-or-origin> coderso
cd coderso
bun install
```

`bun install` installs every workspace at once. The monorepo declares three workspaces — `core`, `store`, and `packages/*` — so a single install covers the product runtime, the Store backend, and the `@core/sdk` package.
The checked-in `bunfig.toml` keeps the historical hoisted linker contract used
by root-owned tests and tooling that import workspace dependencies.

## Configure your environment

Copy the example file and fill in the values that the server reads at boot:

```bash
cp .env.example .env
```

ENV in Coderso is reserved for **critical infrastructure** only — connection strings and encryption keys. Business configuration (site URL, locale, auth TTLs, themes, security policy) lives in the database and is edited from the Admin UI, not here.

### Required to boot

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for the default client. Ships as `postgres://user:password@localhost:5432/coderso`. |
| `PII_ENC_KEY` | AES-256-GCM key for email encryption (32 bytes). |
| `PII_HASH_KEY` | HMAC key for the email lookup hash (32+ bytes recommended). |
| `MEDIA_SECRET_MASTER_KEY` | Master key for encrypting media provider secrets (32 bytes). |

A plain local Postgres needs nothing else. If you point `DATABASE_URL` at a **connection pooler** (Render's is the same host on port `6432`), also set `DATABASE_DIRECT_URL` to the direct connection string on port `5432`: startup migrations, the assistant-docs reindex and the backup scheduler take session-level advisory locks, which a transaction pooler cannot carry, and they refuse to run through a pooled URL rather than leak a lock. See [Runtime model → Database connection targets](./runtime-model.md#database-connection-targets).

Generate the secret keys with anything that produces 32 random bytes, for example:

```bash
openssl rand -hex 32
```

### Commonly needed soon after

| Variable | Purpose |
| --- | --- |
| `FORM_SUBMIT_NONCE_SECRET` | HMAC secret for public form submission nonces. Required once you serve public forms. |
| `ANALYTICS_BEACON_NONCE_SECRET` | HMAC secret for the public analytics beacon nonces. **Required for web analytics to work** — see the note below. |
| `ANALYTICS_IP_HASH_SECRET` | HMAC key for the salted, daily-rotated visitor hash (one-way; no raw IP is ever stored). Also required for analytics. |
| `AUTH_PASSWORD_PEPPER` | Optional pepper for password hashing. Rotating it forces password resets, so set it once and leave it. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed bootstrap admin credentials (defaults: `admin@example.com` / `change-me`). |

> **Web analytics fails closed and silently if its secrets are missing.** Tracking
> is enabled by default (`analytics.trackingEnabled`), but the public site only
> injects the tracking beacon when `ANALYTICS_BEACON_NONCE_SECRET` is set — the
> render path mints a per-page nonce and, if the secret is absent, catches the
> error and injects nothing (analytics must never break page render). The result
> is a live site that records **zero** pageviews with no visible error. Set both
> `ANALYTICS_BEACON_NONCE_SECRET` and `ANALYTICS_IP_HASH_SECRET` (e.g.
> `openssl rand -hex 32` each) before expecting data in **Admin → Analytics**.
> Optional: `ANALYTICS_BEACON_NONCE_TTL_MINUTES` (default 30) and
> `ANALYTICS_RETENTION_DAYS` (raw-row pruning window). Note that bot/headless
> user-agents are dropped by design, so verify with a real browser.

The defaults already wired in `.env.example` for local work: `PORT=3000`, `PUBLIC_BASE_URL=http://localhost:3000`, `MEDIA_STORAGE=local`, `MEDIA_DIR=./storage/media`, and `EMAIL_TRANSPORT=mock`. The `VITE_*` URLs point the dev servers at the right ports (see below). Cloud storage (`S3_*`, `AZURE_*`) and the Store/plugin knobs (`STORE_BASE_URL`, `PLUGINS_RUNTIME_DIR`, …) stay blank until you need them.

> The `TEST_OPENAI_*` / `TEST_OPENROUTER_*` keys are used only by opt-in Assistant live tests — leave them empty for normal development.

### Backups (v2)

Every v2 `.cbk` archive is encrypted (AES-256-GCM, scrypt KDF). Backups run on demand from the Admin UI with a per-request passphrase, so local development needs no extra env — but **scheduled** backups run unattended and read their passphrase from `BACKUP_ENCRYPTION_PASSPHRASE`:

| Variable | Purpose |
| --- | --- |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Passphrase for unattended/scheduled encrypted `.cbk` archives. When unset, scheduled runs **fail closed** — they never emit an unencrypted archive. |
| `BACKUP_SCHEDULER_ENABLED` | Opt-in scheduler outside production (default off). |
| `BACKUP_SCHEDULER_TICK_MS` | Scheduler tick in ms (default `60000`). |
| `BACKUP_MAX_TOTAL_BYTES` | Optional quota signal for `GET /backups/usage` (bytes; empty = no quota). |

`BACKUP_DIR` (default `./storage/backups`) is the local archive directory. Import/upload limits are `BACKUP_IMPORT_MAX_BYTES` (default 2 GiB, compressed) and `BACKUP_IMPORT_MAX_DECOMPRESSED_BYTES` (default 4×, compression-bomb guard); `BACKUP_TMP_DIR` sets the import spool directory (default system tmp). See `_docs/CMS_API.md` → Backups (v2) for the full contract.

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

The command sources `.env`, reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`, hashes the
password through the same optional `AUTH_PASSWORD_PEPPER` path used by login,
creates the `admin` role when missing, creates the user when missing, and
attaches the role idempotently. Override the credentials inline for one-off
local databases, for example:

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

Open `http://localhost:3000` in your browser — that single port serves both the API and the admin app. The Vite servers exist only in dev; from `core/`, production runs `bun run start:prod`, which carries the repository Bun config and production React preload, with no Vite involved.

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
