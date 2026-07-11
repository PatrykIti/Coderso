# Project Structure

Coderso is a Bun-powered monorepo. Knowing where things live saves you from
guessing — this page is the map you keep open while you find your footing.

## The big picture

Coderso is "Next.js developer experience, WordPress user experience": a
CMS/store where the **core** is a CI-built, typed SSR React + Bun artifact, while
content, settings, themes, and even feature plugins are applied live from the
Admin UI with no restart. The repo is a Bun workspace, declared in the root
`package.json`:

```json
"workspaces": ["core", "store", "packages/*"]
```

So there are three workspaces — `core`, `store`, and everything under
`packages/*` — plus several non-workspace directories (`tests/`, `themes/`,
`scripts/`, `docs/`, `_docs/`) that round out the repo.

## Top-level map

| Path | What it is |
| --- | --- |
| `core/` | The product runtime: Bun HTTP server, SSR, React admin SPA, services, DB, editor-owned block renderers, Dashboard widgets, plugin engine. |
| `store/` | The Store backend workspace (lists, scans, signs, and serves plugin packages). |
| `packages/sdk/` | The public `@core/sdk` consumed by plugins. |
| `tests/` | All real test suites (unit, integration, perf, security, vitest). |
| `themes/` | On-disk theme folders scanned at boot. |
| `scripts/` | Repo automation: release gates, test lanes, scanners, formatters. |
| `docs/guide/` | End-user product docs — also the AI assistant's knowledge corpus. |
| `docs/develop/` | This developer handbook. |
| `_docs/` | Internal AI-agent specs, tasks, and changelog (deep dives). |

Root-level config worth knowing: `package.json` (scripts), `tsconfig.json`,
`vitest.config.ts`, `eslint.config.mjs`, `release.config.cjs`, `Dockerfile`,
`bun.lock` (the lockfile — there is no `package-lock.json`), and
`.env.example`.

## `core/` — the product runtime

This is where almost all the code lives. One Bun process (`Bun.serve` in
`core/server/httpServer.ts`) serves two logical runtimes — the public SSR site
and the React admin SPA. Key subdirectories:

| Subdir | Role |
| --- | --- |
| `core/server/` | Bun HTTP, SSR, routing. `httpServer.ts`, `prod.ts` (prod entry), `dev.ts`, `router.ts`, `errorHandler.ts` (exports `ApiError`), plus `routes/`, `middleware/`, `validation/`, `jobs/`, `utils/`. |
| `core/admin/` | React admin SPA. `main.tsx` (client entry), `entry-server.tsx` (SSR entry), `app/`, `ui/`, `components/`, `services/` (admin API clients). |
| `core/services/` | ~38 business-rule domains (`pages`, `posts`, `content`, `menus`, `media`, `forms`, `commerce`, `auth`, `security`, `seo`, `themes`, `assistant`, `kits`, …). |
| `core/db/` | Drizzle layer: `client.ts`, `schema.ts`, `migrations/`, `drizzle.config.ts`, `seed.ts`. |
| `core/site/` | Public runtime: `pageRuntime.tsx` for retained compatibility/detail surfaces, `pageRuntimeV2.tsx` for Page sections/blocks, `renderPublicPage.tsx`, `contentRouteMatcher.ts`, `cache/`. |
| `core/widgets/` | Historically named compatibility renderers and normalizers. This is not a non-dashboard product authoring registry; active editors own their sections/blocks. |
| `core/plugins/` | Runtime plugin engine: `loader.ts`, `pluginManager.ts`, `installService.ts`, `registry.ts`. |
| `core/store/` | Client to the Store backend: `client.ts`, `downloader.ts`, `verifier.ts` (ed25519), `updater.ts`. |
| `core/dist/` | Build output (`dist/client`, `dist/site`). Produced by CI, not committed source. |

The **routes/services split** is a load-bearing convention: route files
(`core/server/routes/*Routes.ts`) are orchestration-only — they parse, validate,
call a domain service, and map results to HTTP. Business rules live in
`core/services/<domain>/`. Each route file also defines a `map*Error` translator
(e.g. `mapMenuError`) that converts typed domain errors into a uniform
`ApiError`. See [architecture.md](./architecture.md) for the why.

## `store/` — the Store backend

The repo-root `store/` is the Store backend workspace — the service that lists,
scans, signs, and serves plugin packages. It is currently a scaffold (`dev` and
`test` scripts are `echo` stubs); the *consuming* client lives in core under
`core/store/`. See [plugins-and-store.md](./plugins-and-store.md).

## `packages/sdk/` — the public SDK

The `@core/sdk` package that plugins compile against. It ships subpath exports
under `packages/sdk/src/`:

| Export | Source |
| --- | --- |
| `@core/sdk/server` | `src/server.ts` |
| `@core/sdk/client` | `src/client.ts` |
| `@core/sdk/shared` | `src/shared.ts` |
| `@core/sdk/pluginManifest` | `src/pluginManifest.ts` |

It is ESM-only (`"type": "module"`, `sideEffects: false`) and lists `react` /
`react-dom` (`^18 || ^19`) as peer dependencies. Its major version maps to a
plugin's `apiVersion`.

## `tests/`, `themes/`, `scripts/`

- **`tests/`** holds every real test suite: `unit/`, `integration/`, `perf/`,
  `security/`, and `vitest/`. The per-workspace `test` scripts are just stubs
  (`echo core test`, `echo store test`) — the actual lanes run from the repo root
  via `bun run test`. Vitest picks up `tests/vitest/**/*.{test,spec}.{ts,tsx}`.
  See [testing.md](./testing.md).
- **`themes/`** contains on-disk theme folders scanned at boot (the admin UI's
  own theme, `admin-default/`, lives here). The DB only stores `theme_profiles`
  and `theme_routes`; theme files are read from disk.
- **`scripts/`** is repo automation invoked by npm scripts: `coderso-release-gates.ts`,
  `run-bun-lane.ts`, `run-security-scan.ts`, `run-vitest-coverage.ts`,
  `format-staged.ts` (the pre-commit Prettier runner), `semantic-release-pr-notes.cjs`,
  and `playwright-widget-contract-smoke.ts`.

## The documentation taxonomy

Coderso has four documentation surfaces. They are not interchangeable — putting a
doc in the wrong place either ships it to the wrong audience or feeds the wrong
system.

| Surface | Audience / purpose | Notes |
| --- | --- | --- |
| `README.md` (repo root) | Product landing / marketing. | The first thing visitors see. |
| `docs/guide/` | End-user product docs **and** the AI assistant's knowledge corpus. | Markdown here is ingested into the DB and answered from at runtime — see below. |
| `docs/develop/` | This developer handbook. | Where this page lives. Welcoming and practical. |
| `_docs/` | Internal AI-agent specs, tasks, and changelog. | Exhaustive and dense. Great for deep dives, not for casual reading. |

A subtlety worth internalizing: **`docs/guide/` is dual-purpose.** Every markdown
file under `docs/guide/` (organized into `getting-started/`, `screens/`,
`coderso/`, `solution-kits/`, `playbooks/`) is the Docs Assistant's corpus —
ingested into DB tables and surfaced to users in the admin assistant panel. So a
guide page is a *product feature*, governed by `docs/guide/_TEMPLATE.md` and the
`docs/guide/_COVERAGE_MATRIX.md`. Write for admins/editors, follow the section
structure, and reindex after changes. See [assistant.md](./assistant.md).

By contrast, `_docs/` is for architecture notes, task tracking, and changelog —
intentionally separate from the assistant corpus and never ingested.

## Where do I find X?

| Looking for… | Go to |
| --- | --- |
| The HTTP server entry point | `core/server/httpServer.ts` (boot via `core/server/prod.ts`) |
| An API route / its error mapping | `core/server/routes/<domain>Routes.ts` |
| Business logic for a domain | `core/services/<domain>/` |
| The DB schema | `core/db/schema.ts` |
| DB migrations | `core/db/migrations/` |
| Drizzle config | `core/db/drizzle.config.ts` |
| The admin SPA entry | `core/admin/main.tsx` (SSR: `entry-server.tsx`) |
| Public site rendering | `core/site/` |
| A Page/Form/Menu/Post/Screen section or block | The owning domain under `core/services/`, its editor under `core/admin/`, and its runtime renderer |
| An Admin Dashboard widget | `core/services/dashboard/`, Dashboard UI/registry, and `_docs/DASHBOARD_WIDGETS_SPEC.md` |
| A retained legacy renderer contract | `core/widgets/` plus its compatibility tests; do not expose it as new authoring |
| The plugin runtime engine | `core/plugins/` |
| The plugin SDK surface | `packages/sdk/src/` |
| Security middleware | `core/server/middleware/{cors,csrf,rateLimit,securityHeaders,requestId}.ts` |
| Environment variables | `.env.example` |
| npm scripts (lint/test/scan/gates) | root `package.json` |
| Real test suites | `tests/` |
| End-user / assistant docs | `docs/guide/` |
| Deep internal specs | `_docs/` |

## Where to go deeper

- [`_docs/ARCHITECTURE.md`](../../_docs/ARCHITECTURE.md) — the authoritative
  internal architecture spec (the no-restart model, runtime kernel, layering).
- [architecture.md](./architecture.md) — the developer-friendly walkthrough of
  the same model.
- [runtime-model.md](./runtime-model.md) — what changes live vs. what needs a
  rebuild or restart.
- [getting-started.md](./getting-started.md) — install, env, and your first
  `bun run dev`.
