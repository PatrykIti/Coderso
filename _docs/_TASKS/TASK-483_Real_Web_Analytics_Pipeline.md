# TASK-483: Real Web Analytics Pipeline
# FileName: TASK-483_Real_Web_Analytics_Pipeline.md

**Priority:** High
**Category:** Tools / Analytics
**Estimated Effort:** Very Large
**Dependencies:** None (but coordinates with parallel streams TASK-482 and
TASK-484 — see "Parallel Streams & Shared Surfaces" below)
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Business Goal

Ship a **genuine visitor-analytics pipeline** so the admin "Analytics" surface
reports what actually happened on the published site (pageviews, unique
visitors, sessions, bounce rate, traffic sources, devices, referrers, and real
top-pages-by-views) instead of a content inventory dressed up as analytics.

Today `core/services/analytics/analyticsService.ts` only counts rows in
`pages` / `contentEntries` / `media` / `users`, builds a "trend" from content
`createdAt`, and ranks "top content" with a synthetic
`computeScore(index, total)` based on `updatedAt` recency. There is **no**
pageview/visit/session table, **no** front-end tracking, and **no**
sources/devices/referrers/bounce. This task adds a new backend traffic pipeline
that is **distinct from** the existing content-inventory service and rewires the
admin UI to consume real traffic data while preserving the existing CSV export
affordance.

## Scope

### In scope

- New traffic schema: `analytics_pageviews` and `analytics_sessions` tables plus
  full Drizzle migration artifacts. **TASK-483 owns the firm migration index
  0064** (current max in this worktree is `core/db/migrations/0063_yummy_glorian.sql`):
  ship `core/db/migrations/0064_<slug>.sql` + `meta/0064_snapshot.json` + a
  `meta/_journal.json` entry. TASK-484 is pinned to 0065 and merges AFTER this
  stream. The index is NOT provisional — do not re-derive it and do not
  "renumber at merge" (TASK-483-01-L02 states the same firm pin).
- A schema-first traffic domain contract (types, enums, `normalize*` helpers)
  owned in `core/services/analytics/*`, separate from `analyticsTypes.ts`.
- A **public write** ingestion endpoint (lightweight beacon collector) with
  nonce + HMAC anti-abuse via the shared evaluators, `public_write` rate-limit
  bucket, server-side bot/DNT filtering, and IP/PII redaction (no raw IP stored).
- A privacy-respecting front-end tracking snippet injected on the public site
  (honors Do-Not-Track / consent, minimal payload, `navigator.sendBeacon`).
- A traffic aggregation service computing pageviews / unique visitors /
  sessions / bounce / sources / devices / referrers / real top-pages-by-views,
  replacing `computeScore`.
- New internal `/admin/api/analytics/*` traffic endpoints + extended admin
  `analyticsClient` cache contract + `AnalyticsPage`/`AnalyticsCharts` rewire to
  real series, keeping the CSV export.
- Retention pruning of raw rows beyond a configurable window + tests + docs.

### Out of scope

- Replacing or deleting the existing content-inventory overview/top-content
  endpoints; they remain available (the admin UI may demote them to secondary
  cards). No destructive removal of `analyticsService.ts` in this task.
- Third-party analytics providers (GA4, Plausible, etc.) — local-first only.
- Real-time/streaming dashboards, funnels, A/B testing, or cohort analysis.
- Cross-device identity stitching or any reversible visitor fingerprinting.

### What the TASK-479 admin reskin already covers vs what this task adds

- **TASK-479 (admin UI redesign prototype)** only reskins the *presentation* of
  the Analytics screen (cards, charts, range picker) inside the soft/violet
  prototype. It does **not** add any traffic backend, ingestion, or real series;
  the prototype `AnalyticsPage.tsx` reads the same synthetic shape.
- **TASK-483 adds the data plane**: schema → ingestion → aggregation → real
  series, and rewires the live `core/admin/ui/analytics/AnalyticsPage.tsx` to
  consume it. The reskin and this task compose: this task feeds real numbers
  into whatever shell TASK-479 lands.

## Security Contract

Stream-level contract for every route this task adds; the 02 and 04 sub-task
trees inherit and refine it, never weaken it.

- **Public beacon collector (ingestion) — PUBLIC WRITE endpoint:**
  - Anti-abuse via the shared evaluators, not a one-off flow: HMAC nonce
    following the forms pattern (`createFormSubmissionNonce` /
    `assertFormSubmissionNonce` in `core/services/forms/submissionNonce.ts`; the
    beacon's `beaconNonce.ts` mirrors it — TASK-483-02-L01) plus the
    `public_write` rate-limit bucket and server-side `classifyBot`/DNT
    classification. Reference wiring for the nonce + rate limit exists in
    `core/server/publicBookingApi.ts`.
  - **Binding captcha exemption (matches TASK-483-02 subtree and 03-L01):** the
    beacon does **NOT** call `enforceBotProtection`. A token-less `sendBeacon`
    request would throw `bot_protection_required` (400) whenever bot protection
    is enabled (`core/services/security/botProtection.ts:43` enabled-gate,
    `:63-66` token-required throw) and silently kill the whole pipeline;
    forms/booking themselves only enforce captcha when `access.requireCaptcha`,
    and this no-value write relies on nonce + `public_write` rate limit +
    `classifyBot`/DNT instead. Do NOT wire `enforceBotProtection` for this
    surface.
  - Rate limiting via the existing `public_write` bucket in
    `core/server/middleware/rateLimit.ts`.
  - Server-side bot and DNT/consent classification are mandatory parts of the
    contract, not optional.
  - IP/PII redaction: no raw IP is ever stored; visitor identity is a hashed,
    non-reversible id.
  - Strict reject-unknown payload validation: unknown body/query keys are
    rejected, mirroring the `assertKnownQuery` allowlist discipline in
    `core/server/routes/analyticsRoutes.ts`.
- **Admin traffic endpoints (`/admin/api/analytics/*`) — INTERNAL:**
  - Session-authenticated admin surface; RBAC via `requirePermission`
    (existing analytics routes gate on `requirePermission("content:read")` —
    new read endpoints follow the same model).
  - CSRF protection for any admin write endpoints (reads are GET-only).
  - Reject-unknown query/body validation via `assertKnownQuery`-style
    allowlists, matching `core/server/routes/analyticsRoutes.ts`.
- **Tracking snippet delivery — PUBLIC READ:** static asset only, no secrets,
  no per-visitor data embedded; honors DNT/consent before sending anything.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-01 | Traffic Schema And Domain Contract | Large | ✅ Done |
| TASK-483-02 | Public Ingestion Route And Anti-Abuse | Large | ✅ Done |
| TASK-483-03 | Front-End Tracking Snippet | Medium | ✅ Done |
| TASK-483-04 | Traffic Aggregation Service And Admin API | Large | ✅ Done |
| TASK-483-05 | Admin Client And Analytics Page Rewire | Medium | ✅ Done |
| TASK-483-06 | Retention, Privacy, Tests And Docs | Medium | ✅ Done |

Land order is **strictly sequential: 01 → 02 → 03 → 04 → 05 → 06** with a
single writer per source file and no overlapping starts. Do NOT start 04
concurrently with 02/03 — 02-L02 and 04-L03 both touch
`core/server/routes/analyticsRoutes.ts` (02-L02 lands `mapAnalyticsError`;
04-L03 extends that switch and adds the admin traffic routes INSIDE the
already-mounted `registerAnalyticsRoutes`) plus the analytics service/validation
modules, so overlapping starts risk same-file collisions. Each sub-task starts
only after the previous one has fully landed.

## Parallel Streams & Shared Surfaces

TASK-483 runs concurrently with two sibling streams on their own worktrees and
branches: **TASK-482** (setup wizard, `/home/coder/project/Coderso-task-482`)
and **TASK-484** (backups, `/home/coder/project/Coderso-task-484`).

**Forbidden paths for TASK-483** (owned by the sibling streams — never edit):
`core/services/backups/**`, backup route modules, `core/admin/ui/setup/**`,
auth/install route surfaces, and `usersService` first-admin logic.

**Shared surfaces — additive, own-section/own-lines-only edits.** All three
streams touch these files; TASK-483 must only ADD its own lines/sections and
must never restructure, reorder, or reformat surrounding content:

- `core/server/routes/analyticsRoutes.ts` — the real intra-483 shared route
  file: 02-L02 lands `mapAnalyticsError`, and 04-L03 extends that switch and
  adds the admin traffic routes INSIDE the already-imported+mounted
  `registerAnalyticsRoutes` (see `core/server/routes/index.ts:15` import and
  `:97` mount). TASK-483 adds **NO** new registration in
  `core/server/routes/index.ts` — that file is edited by TASK-482/484, so a 483
  edit there would be a needless cross-stream collision. The public beacon is
  dispatched additively inside `handlePublicRequest` in
  `core/server/publicSite.tsx` (02-L02, and the snippet route in 03-L02),
  mirroring the existing booking dispatch.
- `core/db/schema.ts` — TASK-483 adds ONLY its `analytics_pageviews` /
  `analytics_sessions` tables; TASK-484 separately adds backup tables. Do not
  reserve, rename, or restructure anything beyond the analytics additions.
- `tests/security/*` — security-gate test expectations: extend additively for
  the new analytics surfaces only.
- `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md` — 483
  and 484 both add sections; edit only the TASK-483-owned section.

**Shared remote test database.** All three streams and the owner share ONE
remote Postgres instance (render.com, `DATABASE_URL` in `.env`), used
concurrently. Therefore:

- All DB-backed tests create uniquely scoped fixtures (e.g. unique site /
  visitor / session ids per run) and clean up only rows they created.
- NEVER truncate or bulk-delete shared tables.
- Ingestion/aggregation test assertions must be scoped to fixture-owned rows
  (filter counts/uniques/bounce by the fixture's site/visitor ids) and must
  NOT depend on global table emptiness or global counts — other streams may
  be writing rows at the same time.

## Testing Requirements

- **Bun lane** (`tests/integration/routes/*`, `tests/security/*`, `tests/perf/*`):
  the public ingestion route, `Bun.serve`/`Bun.file` snippet delivery, DB-backed
  repository/aggregation/retention queries, anti-abuse/security gates, and
  ingestion throughput perf.
- **Vitest lane** (`tests/vitest/*`, `tests/vitest/ui-integration/*`): pure
  domain contracts/normalizers with NO `db/client` coupling (trafficSchemas,
  beacon nonce sign/verify, beacon/visitor contracts, tracking-snippet builder),
  admin client cache, and `AnalyticsPage` render. NOTE: the aggregation
  normalizers (`trafficAggregationQuery`) and `serializeTopPagesCsv` are pure but
  live in `trafficAggregationService.ts`, which imports `db/client`
  (`core/db/client.ts` throws without `DATABASE_URL` and opens a `postgres()` pool
  at import), so they run in the **Bun lane** at `tests/unit/analytics/` (per
  04-L01/04-L03), NOT Vitest — mirroring the `serializeTopContentCsv` precedent.
- DB-touching suites: `set -a && source .env && set +a` first, create uniquely
  scoped fixtures, and clean up only owned rows (never truncate shared tables).
- Baseline: `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
- Security: run the Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md`
  for the public-write + secret-handling changes, or state CI-only clearly.

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — new `analytics_pageviews` / `analytics_sessions` tables,
  indexes, and PII posture (hashed visitor id, no raw IP).
- `_docs/CMS_API.md` — new internal traffic endpoints + public beacon collector.
- `_docs/SECURITY_SPEC.md` — public-write anti-abuse (nonce/HMAC/captcha),
  IP/PII hashing, DNT/consent handling, retention window.
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cached traffic
  client APIs, cache keys, TTLs, and `cacheBus` topics.

## Notes

- This is **new backend**, not a refactor of the content-inventory service. Keep
  the traffic pipeline in its own modules under `core/services/analytics/*` and
  do not entangle it with `analyticsService.ts` counting logic.
- Public ingestion is the only public-write surface added; it MUST reuse the
  existing forms/booking **HMAC nonce** pattern + the `public_write` rate-limit
  bucket + server-side `classifyBot`/DNT filtering, not a weaker one-off flow. It
  does **NOT** call `enforceBotProtection` (binding captcha exemption — a
  token-less beacon would 400 whenever bot protection is enabled; see the
  Security Contract above and TASK-483-02-L02). See
  `core/services/forms/submissionNonce.ts`, `core/server/publicBookingApi.ts`.
- Own all domain schemas/enums/defaults/`normalize*` (the traffic-event
  contract, `trafficEventSchema`, source/device enums, clamps) in the
  domain/service modules; `analyticsRoutes.ts` re-exports/imports, never
  re-declares them. Exception, per the module's existing convention: the admin
  *query* JSON schemas (`trafficOverviewQuerySchema` etc.) are declared inline
  in `core/server/validation/analyticsSchemas.ts`, exactly like the existing
  `overviewQuerySchema`/`topContentQuerySchema` there (TASK-483-04-L01/04-L03);
  the domain clamps/normalizers they mirror stay in
  `trafficAggregationService.ts` and are never duplicated.
- Board/changelog discipline: ONLY the closure leaf **TASK-483-06-L02** edits
  `_docs/_TASKS/README.md` (touching only the TASK-483 rows and its own
  statistics deltas) and creates the changelog entry
  `_docs/_CHANGELOG/1221-*.md` — **TASK-483's pinned changelog number is
  1221**. Numbers 1219 (TASK-510, in flight in the shared main tree — may be
  absent from this worktree's checkout, do NOT reallocate it), 1220 (TASK-482)
  and 1222 (TASK-484) are RESERVED by parallel streams. Implementation
  sub-tasks/leaves never touch the board or the changelog.
