# The No-Restart Runtime

Coderso's signature is that you change *most* things live — content, settings, security policy, even feature-adding plugins — and they take effect immediately, with no server restart. It feels like PHP's edit-and-refresh loop, but the core is a properly typed, CI-built SSR runtime on Bun. This page explains what's hot, what isn't, and why the line is drawn where it is.

## Why this matters

Two kinds of teams touch a Coderso site:

- **Operators and content editors** change pages, menus, themes, business settings, and security knobs all day. They should never wait on a deploy.
- **Core contributors** change the typed server/admin/block-renderer or Dashboard-widget source. That code is built once in CI into a versioned artifact — not interpreted per request.

The design keeps these worlds separate. Day-to-day mutation happens against the database and runtime ESM bundles, so iteration is instant. Heavy machinery — compiling, redeploying, migrating — is confined to the few things that genuinely need it. The result is WordPress-style immediacy with a modern, type-checked core.

The model rests on one rule from the architecture spec: *business configuration and content live in the database (`settings` + content tables) and are applied at runtime, while `.env` is reserved strictly for critical infrastructure.*

## Live vs. rebuild at a glance

| Change | Live (no restart) | Needs CI rebuild / restart |
| --- | --- | --- |
| Business settings (`settings` table, edited in Admin) | ✅ | |
| Pages and Page Templates, posts, content entries, menus, media, SEO | ✅ | |
| Theme switch (active `theme_profiles` row) | ✅ | |
| Security middleware config (CORS / CSRF / rate-limit / headers) | ✅ | |
| Plugin install / upgrade / rollback / disable / uninstall | ✅ | |
| Assistant configuration | ✅ | |
| Core source (server, admin, services, block renderers, Dashboard widgets, public runtime, SDK) | | ✅ CI build of `dist` + redeploy |
| Database schema (new Drizzle migration files) | | ✅ migration run on deploy |
| Critical infra ENV (`DATABASE_URL`, master keys, `PORT`, …) | | ✅ applied at boot only |

## What's live (no restart)

### Business settings

Settings live in the `settings` table — a single `key` primary key with a JSONB `value` — and are edited from the Admin UI. They are read at runtime, so saving them is the deploy. Examples grounded in the spec:

- `site.publicBaseUrl`, `site.adminBaseUrl`, `site.adminPath`
- `site.homepageId`, `site.notFoundPageId`, `site.previewEnabled`
- `site.contentRoutes` (list + detail routing for content types)
- `site.cacheTtlSeconds` (public SSR cache TTL, default 30s)
- `auth.sessionTtlDays`, `auth.resetTtlMinutes`
- design tokens and assistant config

The Setup Wizard writes these same keys to the database and flips `setup.completed=true` — there is no config file to edit.

> `site.publicBaseUrl` (DB) is the live source of truth. `PUBLIC_BASE_URL` in `.env` exists only as a boot-time fallback.

### Content and structure

Pages and Page Templates, posts, content entries, published menus, media, and SEO documents are all database-backed and served by the public runtime immediately. The public SSR HTML is cached per *path + active theme profile*, and the cache is invalidated on publish/unpublish — so a publish shows up right away without touching the process.

### Themes

Switching the active `theme_profiles` row re-injects design tokens (as server-side CSS variables) and busts the SSR cache live. On-disk theme folders are scanned at boot from `THEMES_DIR`, but selecting which profile is active is a runtime, DB-driven decision.

### Security middleware config

CORS, CSRF, rate-limit, security headers, session, and bot-protection are stored as JSON under the settings key `security.settings`. The middleware reads that key at runtime:

```
core/server/middleware/cors.ts
core/server/middleware/csrf.ts
core/server/middleware/rateLimit.ts
core/server/middleware/securityHeaders.ts
core/server/middleware/requestId.ts
```

You can tighten CORS or change a rate-limit bucket from the Admin UI and it applies on the next request — no restart. See [Security](./security.md) for the policy surface.

### Plugins

Plugins are the clearest expression of the model. They install as **prebuilt runtime ESM bundles** (`dist/server.mjs`, optional `dist/client.mjs`, optional `dist/style.css`) — core never builds them. The spec states it plainly: *"Brak rebuilda core i brak redeployu przy instalacji pluginow"* (no core rebuild and no redeploy when installing plugins).

The install path runs entirely at runtime:

```
download → verify (ed25519 signature + sha256 checksum)
         → unpack into plugins-runtime/<name>/<version>/
         → register (DB enabled=true)
         → dynamic import() of server.mjs
```

- **Upgrade** reuses the full install path and atomically renames the new version dir into place.
- **Version switch / rollback** is just a different path = a fresh `import()`; the registry flips to the prior version.
- **Auto-disable** kicks in after a failure threshold so a broken plugin can't take the process down.

The runtime directory defaults to `plugins-runtime/` next to the repo root, overridable via the `PLUGINS_RUNTIME_DIR` env var; it is not tracked in git. Admin plugin UI is lazily `import()`-ed client-side. Plugins use only allow-listed externals (`react`, `react-dom`, the JSX runtimes, and `@core/sdk/*`) — no TS/TSX and no `node_modules` at runtime. Deep dive in [Plugins and the store](./plugins-and-store.md).

## What needs a rebuild or restart

### Core source → CI build

Any change to core source — `core/server`, `core/admin`, `core/services`, the
historically named compatibility renderers in `core/widgets`, Dashboard widget
code, the public runtime in `core/site`, or the SDK in `packages/sdk` — must go
through CI. The `core/widgets` path does not define a non-dashboard authoring
surface; Pages, templates, forms, menus, posts, and screens use their owning
section/block models. The build produces the dist artifacts:

```
vite build --outDir dist/client
vite build --outDir dist/server --ssr src/entry-server.tsx
```

The running Bun process serves admin from `dist/client` and SSRs the public site from those artifacts. To pick up new core code, the process is redeployed/restarted. **Core never builds plugins or itself at runtime** — there is no Vite dev server in production. (Locally, `bun run dev` runs the dev servers; see [Getting started](./getting-started.md).)

### Database schema and migrations

New Drizzle migration files in `core/db/migrations/` require a migration run on deploy:

```
bun run db:generate   # create a migration from schema changes
bun run db:migrate    # apply pending migrations
```

Both source `.env` and run `drizzle-kit` against `core/db/drizzle.config.ts`. A schema change is a deploy-level operation, not a live edit.

### Critical infrastructure ENV

`.env` is read at boot only. Changing any of these is a restart-level operation:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `DB_POOL_MAX` | Connection pool size |
| `PORT` | HTTP listen port (default `3000`) |
| `MEDIA_SECRET_MASTER_KEY` | Encrypts media provider secrets |
| `PII_ENC_KEY`, `PII_HASH_KEY` | Email encryption + lookup hash |
| `AUTH_PASSWORD_PEPPER` | Password-hashing pepper (rotation forces resets) |
| `COOKIE_SECURE` | Cookie security flag |
| `MEDIA_STORAGE` + S3/Azure creds | Storage backend selection |
| `THEMES_DIR`, `PLUGINS_RUNTIME_DIR` | On-disk scan/runtime directories |
| `STORE_PUBLIC_KEY` | Trust anchor for plugin signature verification |
| `PLUGINS_SAFE_MODE`, `PLUGIN_UPDATE_MODE`, `PLUGIN_ERROR_THRESHOLD`, `PLUGIN_TIMEOUT_MS` | Plugin operational knobs |

The rule of thumb: if a value is a secret or selects infrastructure, it lives in `.env` and changing it means a restart. If it's a business decision, it lives in `settings` and changes live.

## The mental model

Think of two layers in one Bun process:

- **The artifact** — core code, schema, and infra ENV. Versioned, CI-built, deployed deliberately. Changing it is rare and gated.
- **The runtime state** — content, settings, security policy, themes, plugins. Stored in the database and the runtime ESM directory, mutated all day, applied on the next request.

PHP gives you immediacy by interpreting files per request and pays for it with no type safety and no build discipline. Coderso keeps the immediacy for everything an operator touches, but the core stays a typed, tested, properly built SSR artifact. Restart and rebuild are confined to core code, DB schema, and critical infra ENV — and nothing else.

## Where to go deeper

- [`_docs/SITE_RUNTIME.md`](../../_docs/SITE_RUNTIME.md) — public SSR runtime, caching, and theme injection internals.
- [`_docs/SETTINGS.md`](../../_docs/SETTINGS.md) — the full `settings` key catalog and how runtime config is read.
- [`_docs/CODERSO_PLUGIN_CONTRACT.md`](../../_docs/CODERSO_PLUGIN_CONTRACT.md) — the manifest, bundle, and runtime install contract for plugins.

Sibling pages:

- [Architecture](./architecture.md) — the routes/services split and where this runtime lives in the bigger picture.
- [Plugins and the store](./plugins-and-store.md) — building, signing, installing, and operating runtime plugins.
- [Security](./security.md) — the live security middleware policy surface.
