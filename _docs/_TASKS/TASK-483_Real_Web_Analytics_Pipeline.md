# TASK-483: Real Web Analytics Pipeline
# FileName: TASK-483_Real_Web_Analytics_Pipeline.md

**Priority:** High
**Category:** Tools / Analytics
**Estimated Effort:** Very Large
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

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
  full Drizzle migration artifacts (SQL + `meta/*_snapshot.json` + `meta/_journal.json`).
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

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-01 | Traffic Schema And Domain Contract | Large | ⏳ To Do |
| TASK-483-02 | Public Ingestion Route And Anti-Abuse | Large | ⏳ To Do |
| TASK-483-03 | Front-End Tracking Snippet | Medium | ⏳ To Do |
| TASK-483-04 | Traffic Aggregation Service And Admin API | Large | ⏳ To Do |
| TASK-483-05 | Admin Client And Analytics Page Rewire | Medium | ⏳ To Do |
| TASK-483-06 | Retention, Privacy, Tests And Docs | Medium | ⏳ To Do |

Implement in dependency order: **01 → 02 → 03 → 04 → 05 → 06**. 04 may start
once 01 lands (it reads the tables); 03 depends on 02 (it posts to the beacon
endpoint); 05 depends on 04; 06 depends on all.

## Testing Requirements

- **Bun lane** (`tests/integration/routes/*`, `tests/security/*`, `tests/perf/*`):
  the public ingestion route, `Bun.serve`/`Bun.file` snippet delivery, DB-backed
  repository/aggregation/retention queries, anti-abuse/security gates, and
  ingestion throughput perf.
- **Vitest lane** (`tests/vitest/*`, `tests/vitest/ui-integration/*`): pure
  domain contracts/normalizers, nonce sign/verify, aggregation shaping where
  Bun-free, CSV serialization, admin client cache, and `AnalyticsPage` render.
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
  existing forms/booking nonce + `enforceBotProtection` patterns, not a weaker
  one-off flow. See `core/services/forms/submissionNonce.ts`,
  `core/services/security/botProtection.ts`, `core/server/publicBookingApi.ts`.
- Own all schemas/enums/defaults/`normalize*` in the domain/service modules;
  `core/server/validation/analyticsSchemas.ts` and `analyticsRoutes.ts`
  re-export, never re-declare.
- Do NOT create a changelog entry and do NOT edit `_docs/_TASKS/README.md`; the
  orchestrator syncs the board.
