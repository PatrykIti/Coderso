# Adding a Change: End to End

This is the golden path for landing a change in Coderso core. Following it keeps your work aligned with the boundaries the codebase already enforces — schema-first validation, thin routes over rich services, a strict admin cache contract, and the right test lane — so review goes fast and the release gates stay green.

> This page is for changes to **core source** (`core/`, the SDK, services, widgets). Those changes go through CI and a redeploy. Content, settings, themes, security policy, and plugins are configured live from the Admin UI and do not need any of this — see [`./runtime-model.md`](./runtime-model.md) for what is live versus what needs a rebuild.

## 1. Understand the contract you're touching

Before writing code, find the spec. Coderso's behavior is documented in `_docs/`, and the design there is authoritative.

- Pick the domain you're changing and read its spec — e.g. [`_docs/CMS_API.md`](../../_docs/CMS_API.md) for content/pages/posts endpoints, plus the data and architecture specs.
- Find the matching service under `core/services/<domain>/` and its route file under `core/server/routes/<domain>Routes.ts`. Read both — they tell you the existing validation, error types, and response shape you must stay consistent with.
- Note whether the resource is **admin-facing** (served by an admin API client in `core/admin/services/`). If so, it has a cache contract you must honor (step 4).

The goal: your change should look like it was always there. Match the conventions you find rather than inventing new ones.

## 2. Model schema-first

Validation comes first, and it is **strict by default**: unknown fields are rejected, not silently dropped.

1. **Define or extend the validation schema** for the input. Server input validators live under `core/server/validation/`; widget/content data uses JSON Schema (draft-07, AJV `strict: true`). New content *types* are JSON Schema stored as JSONB — no table migration.
2. **Reject unknown fields.** Keep the schema closed so typos and stale clients fail loudly instead of writing garbage.
3. **Normalize before persistence.** Run input through the domain's `normalize*` helper so saved partial data stays valid and defaults are backfilled. For widgets this is `normalizeWidgetBlock` plus the per-widget `normalize<Name>Data` (see [`./content-and-widgets.md`](./content-and-widgets.md)).

Only reach for a **database migration** when you're changing the relational schema in `core/db/schema.ts`. Generate and apply it with drizzle-kit:

```bash
bun run db:generate   # writes a new file into core/db/migrations/
bun run db:migrate     # applies it against DATABASE_URL
```

Migrations are a deploy-level change — they require a migration run on deploy, so don't add one unless the relational shape truly needs it.

## 3. Keep routes thin; put rules in services

Coderso enforces a clean split, and reviewers will hold you to it:

| Layer | Path | Responsibility |
| --- | --- | --- |
| Route | `core/server/routes/<domain>Routes.ts` | Parse + validate input, call one service, map the result to HTTP. **Orchestration only.** |
| Service | `core/services/<domain>/` | Business rules, invariants, persistence. Throws typed domain errors. |

Business logic does **not** belong in route handlers. Put it in the service, and have the service throw a typed error (e.g. `ContentValidationError`) when an invariant fails.

At the route boundary, translate those domain errors into a uniform `ApiError` using the file's `map*Error` function — `menuRoutes.ts` defines `mapMenuError`, and there are siblings like `mapMediaError`, `mapPostError`, and `mapSettingsRouteError`. Extend the existing translator instead of throwing raw HTTP errors inline. `ApiError` is exported from `core/server/errorHandler.ts`.

## 4. If it's an admin resource, follow the cache contract

Admin list/detail data is cached in the browser and revalidated in the background. When you add or change an admin resource, wire it through the existing cache layer so the UI stays correct after mutations. The contract (from [`_docs/ADMIN_CACHE.md`](../../_docs/ADMIN_CACHE.md)) is:

1. **Add cache keys + TTLs** to `core/admin/services/cachePolicy.ts`. The default TTLs are 5 minutes for both `list` and `detail`.
2. **Pick the cache primitive** — `readLocalCache` / `writeLocalCache` / `clearLocalCache` for storage-only, or `createMemoryBackedLocalCache` from `core/admin/utils/storageCache.ts` when the client also holds rows in memory.
3. **Add cached wrappers** — `list*Cached` / `get*Cached` — in the service client.
4. **Invalidate on mutation.** After every create/update/delete, update or invalidate the relevant list/detail keys and broadcast a cache event via `core/admin/utils/cacheBus.ts` (`action: "update" | "invalidate"`). Consumers subscribe and revalidate when matching keys change.
5. **In the UI**, hydrate from cache first, then revalidate in the background.

Skipping invalidation is the classic bug here: the mutation succeeds but the list shows stale rows until the TTL expires.

## 5. Write tests in the correct lane

Coderso has two test lanes, chosen by **dependency shape, not folder name** (full detail in [`./testing.md`](./testing.md)):

- **Vitest** (`tests/vitest/**`) — runtime-agnostic logic: domain services without `Bun.*`, validators, DTO mappers, React/admin UI, SDK helpers, widget normalization/render mapping.
- **Bun** (`tests/{unit,integration,perf,security}/**`) — anything that needs `Bun.serve` / `Bun.file`, real route/integration flows, plugin install/upgrade/rollback, SSR, or a real DB.

A suite is **not** Bun-free if importing its production module triggers DB/settings/runtime coupling — fix the production module with pure seams instead of forcing it into Vitest with brittle mocks. DB-backed suites must create uniquely scoped fixtures and clean up only their own rows; **never truncate whole domain tables** on a shared test DB.

```bash
bun run test            # full default run (Bun lane + Vitest lane)
bun run test:vitest      # Vitest only
bun run test:bun         # Bun lane only
```

If your change touches a release-gate surface (functional, ux, performance, security, reliability), run the relevant targeted suites too — `gates:coderso` is a baseline, not a substitute.

## 6. Update docs and add a changelog entry

- **Update the relevant spec** in `_docs/` if you changed behavior, and the user/assistant docs in `docs/guide/` if the change is user-visible.
- **Add a `[Release Notes]` block to your PR description** with the right Keep-a-Changelog buckets — `[Added]` / `[Changed]` / `[Fixed]` / `[Removed]` / `[Security]`. semantic-release reads merged PR bodies to build `CHANGELOG.md`; empty or placeholder values (`None.`, `N/A`) are ignored.
- You do **not** hand-edit `CHANGELOG.md` or bump versions — semantic-release does that on push to `main`, driven by your **conventional commit** messages.

## 7. Validate and open a PR

Run the same checks the pre-commit hook runs (format + lint + typecheck across core, store, SDK, and the repo) before you commit:

```bash
bun run precommit
```

Enable the committed hook once per clone so this runs automatically:

```bash
git config core.hooksPath .githooks
```

Note the hook does **not** run unit/integration/security/perf tests — those are yours to run locally and CI's to enforce. Lint is strict: ESLint runs with `--max-warnings=0` and `@typescript-eslint/no-explicit-any` is an **error**.

Commit with a conventional-commit message (`feat:`, `fix:`, `docs:`, etc.) and open the PR. CI (`.github/workflows/coderso-pr-gates.yml`) runs a database preflight + migrations, the Vitest and Bun lanes in parallel, the security scanners, and the release gates last.

## Worked example: adding a field to a content resource

Say you're adding an optional `subtitle` to a post-like resource.

1. **Spec** — confirm in [`_docs/CMS_API.md`](../../_docs/CMS_API.md) how the resource's payload is shaped and whether `subtitle` belongs in the JSON document or a column.
2. **Schema** — add `subtitle` (optional string) to the input validator under `core/server/validation/`, keeping the schema closed so other unknown keys still reject. If it's a relational column, add it to `core/db/schema.ts` and run `bun run db:generate` + `bun run db:migrate`; if it's JSON document data, no migration is needed.
3. **Normalize** — ensure the `normalize*` helper backfills a sensible default (e.g. empty/absent) so existing records without `subtitle` stay valid.
4. **Service + route** — read/write `subtitle` in `core/services/<domain>/`. Leave the route handler thin; if a new invariant can fail, throw a typed error and translate it in the file's `map*Error`.
5. **Cache** — if the admin list/detail surfaces `subtitle`, confirm the existing `cachePolicy.ts` keys still cover it and that mutations invalidate/broadcast.
6. **Tests** — add a Vitest case for the validator + normalizer (pure logic), and a Bun route/integration test if the field crosses the HTTP boundary against a real DB.
7. **Docs + PR** — note it in the spec, add `[Added] subtitle field on …` to the PR's `[Release Notes]`, run `bun run precommit`, and open the PR.

## Where to go deeper

- [`_docs/ARCHITECTURE.md`](../../_docs/ARCHITECTURE.md) — the routes/services split, the no-restart model, and what triggers a rebuild.
- [`_docs/CMS_API.md`](../../_docs/CMS_API.md) — content, page, and post API contracts.
- [`_docs/ADMIN_CACHE.md`](../../_docs/ADMIN_CACHE.md) — the full admin cache key/TTL/invalidation contract.
- [`./runtime-model.md`](./runtime-model.md) — what applies live versus what needs a deploy.
- [`./content-and-widgets.md`](./content-and-widgets.md) — schemas, normalizers, and the widget contract.
- [`./testing.md`](./testing.md) — choosing a lane, fixtures, and the release gates.
