# Architecture Overview

Coderso aims for a "Next.js developer experience, WordPress user experience." Knowing how the pieces fit together tells you where your change belongs — and, just as importantly, whether shipping it needs a rebuild or simply takes effect live.

## The big picture

Everything runs inside **one Bun process**. That single process serves the public site (server-rendered) and the React admin, talks to PostgreSQL through Drizzle, and loads plugins at runtime.

```
                         ┌──────────────────────────────────────────┐
                         │           One Bun process                 │
                         │        (core/server/httpServer.ts)        │
   HTTP request ───────► │                                           │
                         │  ┌─────────────┐      ┌────────────────┐  │
                         │  │ Public       │      │ Admin           │ │
                         │  │ runtime      │      │ runtime         │ │
                         │  │ (SSR pages,  │      │ (React SPA,     │ │
                         │  │  core/site)  │      │  core/admin)    │ │
                         │  └──────┬───────┘      └───────┬────────┘  │
                         │         │   routes (orchestrate) │         │
                         │         ▼                        ▼         │
                         │      ┌──────────────────────────────┐     │
                         │      │ services/  (business rules)   │     │
                         │      └───────────────┬──────────────┘     │
                         │                      ▼                     │
                         │      ┌──────────────────────────────┐     │
                         │      │ db/  (Drizzle ORM)            │     │
                         │      └───────────────┬──────────────┘     │
                         │      runtime plugins: dynamic import()     │
                         └──────────────────────┼─────────────────────┘
                                                ▼
                                      ┌──────────────────┐
                                      │   PostgreSQL     │
                                      └──────────────────┘
```

The kernel is `core/server/httpServer.ts` — the single `Bun.serve({...})` call. In production it is booted by `core/server/prod.ts`, which reads `PORT` and starts listening.

### Where things live in the monorepo

The repo is a Bun workspace; the parts most relevant to architecture are:

| Path | Role |
| --- | --- |
| `core/` | The product runtime — server, admin, services, db, public site, editor-owned block renderers, Dashboard widgets, plugins |
| `store/` | The Store backend that lists, scans, signs, and serves plugin packages |
| `packages/sdk/` | The public `@core/sdk` (`/server`, `/client`, `/shared`) that plugins build against |
| `themes/` | On-disk theme folders scanned at boot; the DB only stores `theme_profiles` + `theme_routes` |

The SDK's major version maps to a plugin's `apiVersion`, which is how core decides whether an installed plugin is compatible. See [project-structure.md](./project-structure.md) for the full directory tour.

## Two runtimes, one process

A request hits the same Bun server no matter where it's headed, but it lands in one of two logical runtimes.

| Runtime | Serves | Lives in | Built from |
| --- | --- | --- | --- |
| **Public** | Server-rendered pages, posts, and content entries | `core/site/` | `core/vite.site.config.ts` → `dist/site` |
| **Admin** | The React admin SPA | `core/admin/` | `core/vite.config.ts` → `dist/client` (+ SSR `dist/server`) |

The **public runtime** server-renders HTML and caches it per *path + active theme profile* (TTL from the `site.cacheTtlSeconds` setting, default 30s; busted on publish/unpublish or a theme change). It uses a separate CSS build (`bun --cwd core build:site` → `core/dist/site`), with theme tokens injected as CSS variables server-side.

The **admin runtime** is a React SPA (shadcn/ui + Tailwind v4) with client entry `core/admin/main.tsx` and SSR entry `core/admin/entry-server.tsx`, served from `dist/client`.

> The Vite dev server only exists in development (`VITE_DEV_SERVER_URL`, `VITE_SITE_DEV_SERVER_URL`). Production serves prebuilt artifacts only — there is no runtime build of the app. See [getting-started.md](./getting-started.md) for spinning these up locally.

## Routes vs. services

Coderso keeps a firm line between transport and domain logic.

- **Routes are orchestration-only.** Files under `core/server/routes/*Routes.ts` parse and validate input, call a domain service, and map the result back to HTTP. They contain no business rules.
- **Services own the rules.** Domain logic and invariants live in `core/services/<domain>/` — roughly 38 domains (`pages`, `posts`, `content`, `menus`, `media`, `forms`, `commerce`, `auth`, `security`, `seo`, `themes`, `assistant`, `kits`, …). Services throw typed domain errors (for example `ContentValidationError`, `DetailPageBindingResolverError`).

For example, `core/server/routes/menuRoutes.ts` imports from `core/services/menus/menuService` and from `core/server/errorHandler` (which exports `ApiError`).

### The `map*Error` convention

Domain errors don't leak directly to clients. Each route file defines a small translator that converts typed service errors into a uniform `ApiError` / HTTP response. `menuRoutes.ts` defines `mapMenuError`; siblings follow the same pattern — `mapMediaError`, `mapPostError`, `mapBookingError`, `mapListingError`, `mapSettingsRouteError`, `mapPageTemplateError`, `mapSolutionKitError`, and so on. Any retained widget-template mapper is legacy data-maintenance compatibility, not a current editor example.

When you add a route, put the rules in a service, throw typed errors there, and add a `map*Error` translator at the boundary.

## Data layer — Drizzle + PostgreSQL

Persistence is Drizzle ORM over the `postgres` (postgres.js) driver, connected via `DATABASE_URL`.

- The schema lives in `core/db/schema.ts`; the client in `core/db/client.ts`.
- Migrations are generated by drizzle-kit and versioned in `core/db/migrations/` (configured by `core/db/drizzle.config.ts`).
- Conventions: snake_case in the database / camelCase in TypeScript, UUID primary keys, JSONB for block and config data, and indexes on slug / status / foreign keys.

Notable tables include `users` / `roles` / `sessions`, `pages` /
`page_revisions`, `page_templates`, `content_types` / `content_entries` /
`content_revisions`, `posts` / `post_revisions`, `media`, `menus` /
`menu_items`, the retained legacy `widget_templates` compatibility table,
`theme_profiles` / `theme_routes`, `plugins` / `plugin_settings`, `audit_logs`,
and the central **`settings`** table (`key` primary key, JSONB `value`).

That `settings` table is where the next section gets interesting.

## Runtime-configurable security middleware

Security policy is **not** hard-coded or pinned to ENV. CORS, CSRF, rate-limiting, security headers, sessions, and bot-protection are stored as JSON under the settings key `security.settings`, and read at runtime by the middleware in `core/server/middleware/` (`cors.ts`, `csrf.ts`, `rateLimit.ts`, `securityHeaders.ts`, `requestId.ts`).

Because the policy is read per-request from the database, an operator can retune it from the Admin UI and the change applies live — no restart. The same idea drives most of Coderso's configuration.

## Live changes vs. rebuilds

This is the defining principle, and it shapes nearly every decision: business configuration and content live in the **DB / `settings`**, are edited from the Admin UI, and apply at runtime with **no server restart**. ENV is reserved for critical infrastructure only.

| Takes effect live (no restart) | Needs a rebuild or restart |
| --- | --- |
| Business settings (`site.*`, `auth.*`, design tokens, assistant config) | Any change to **core source** (server, admin, services, editor block renderers, Dashboard widgets, public runtime, SDK) — via CI `vite build` then redeploy |
| Content & structure (pages and Page Templates, posts, entries, menus, media, SEO) | New Drizzle **migrations** (deploy + migrate run) |
| Active **theme profile** switch (re-injects tokens, busts SSR cache) | Critical infra **ENV** (e.g. `DATABASE_URL`, `PORT`, `MEDIA_SECRET_MASTER_KEY`, `PII_ENC_KEY`) — applied at boot only |
| **Security middleware** config (`security.settings`) | Storage backend / plugin operational knobs set via ENV |
| **Plugins** (install / update / rollback / disable) as prebuilt runtime ESM | — |

The everyday operator loop — content, menus, themes, settings, security policy, even feature-extending plugins — mutates live against the DB and runtime ESM, matching WordPress/PHP immediacy. The core itself, by contrast, is a properly CI-built, typed, SSR React + Bun artifact. Restart and rebuild are confined to core code, DB schema, and critical infra ENV.

The full no-restart story — including how plugins install as runtime ESM bundles and how the SSR cache is invalidated — is covered in [runtime-model.md](./runtime-model.md).

## Where to go deeper

- [`_docs/ARCHITECTURE.md`](../../_docs/ARCHITECTURE.md) — the exhaustive architecture spec (design goals, key decisions, non-goals).
- [`_docs/SITE_RUNTIME.md`](../../_docs/SITE_RUNTIME.md) — the public runtime, SSR, and caching in detail.
- [`_docs/DATA_MODEL.md`](../../_docs/DATA_MODEL.md) — the full table-by-table data model.

Sibling pages in this handbook:

- [runtime-model.md](./runtime-model.md) — the no-restart model and plugin lifecycle.
- [project-structure.md](./project-structure.md) — a tour of the monorepo layout.
- [testing.md](./testing.md) — how the routes/services split is exercised by the test lanes.
