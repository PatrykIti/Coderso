# 1221 - TASK-483 Real Web Analytics Pipeline

**Date:** 2026-07-05
**Version:** Unreleased
**Tasks:** TASK-483 (01–06, all leaves)
**Type:** Analytics/Public Ingestion/Schema/Security/Admin UI/Caching/Testing/QA/Docs/Task Board

## Overview

Ships a genuine visitor-analytics pipeline so the admin "Analytics" surface
reports what actually happened on the published site (pageviews, unique
visitors, sessions, bounce rate, sources, devices, referrers, real
top-pages-by-views) instead of a content inventory dressed up as analytics. The
new traffic plane is distinct from the existing content-inventory
`analyticsService` (which remains for the secondary overview cards). This entry
closes the whole TASK-483 stream.

## Changes

- **Schema (migration 0064).** New `analytics_sessions` and
  `analytics_pageviews` tables (`0064_analytics_traffic_tables.sql` +
  `meta/0064_snapshot.json` + `meta/_journal.json` idx-64 version-7). Pageviews
  FK to sessions `ON DELETE CASCADE`. No raw IP / User-Agent / full referrer is
  stored; visitor identity is a salted daily non-reversible hash and the
  referrer is host-only.
- **Traffic domain contract.** Schema-first traffic-event contract, source/device
  enums, and `normalize*` helpers owned in `core/services/analytics/*`, separate
  from `analyticsTypes.ts`; repository writers/readers for sessions + pageviews.
- **Public beacon collector (PUBLIC WRITE).** `POST /_analytics/collect`
  dispatched additively inside `handlePublicRequest`. Anti-abuse reuses the
  shared stack: HMAC nonce (`createBeaconNonce`/`assertBeaconNonce`, mirroring
  forms `submissionNonce`), `public_write` rate-limit bucket, server-side
  `classifyBot` + Do-Not-Track/GPC drop, strict reject-unknown validation, and a
  4 KB body cap. Always returns 204. **Binding captcha exemption:** the collector
  does NOT call `enforceBotProtection` — a token-less `sendBeacon` still 204s
  even with bot protection enabled.
- **Tracking snippet.** Privacy-respecting front-end snippet injected on live
  published renders (never on admin preview); honors DNT/GPC before any network
  call; minimal payload (`path`, host-only referrer, language) via
  `navigator.sendBeacon`. Not injected when `analytics.trackingEnabled` is false.
- **Aggregation service.** Real pageviews / unique visitors / sessions / bounce /
  sources / devices / referrers / top-pages-by-views, replacing the synthetic
  `computeScore`. Pure aggregation normalizers + `serializeTopPagesCsv` live in
  the Bun lane (they import `db/client`).
- **Admin traffic API + UI.** New internal `GET /analytics/traffic/overview`,
  `/traffic/top-pages`, `/traffic/top-pages/export` (`content:read`, GET-only,
  reject-unknown query) added inside the already-mounted
  `registerAnalyticsRoutes` via the shared `mapAnalyticsError` boundary.
  `analyticsClient` gains cached traffic APIs
  (`getTrafficOverviewCached`/`getCachedTrafficOverview`,
  `getTopPagesCached`/`getCachedTopPages`) following the shared cache contract;
  `AnalyticsPage`/`AnalyticsCharts` rewired to real series with the CSV export
  preserved. Legacy `TopContentDrawer`/`TopContentTable` removed.
- **Retention & privacy.** Configurable retention pruning of raw rows
  (`ANALYTICS_RETENTION_DAYS`, default 365, clamped [30, 1095]); FK cascade
  removes pageviews with their session. Inline post-ingestion prune has a
  test-safety disable seam (`ANALYTICS_PRUNE_INLINE_DISABLED=1`).
- **Standing-CI test matrix.** Registered every new analytics suite into
  `scripts/run-bun-lane.ts` (the allowlist the PR gate actually runs): the two
  route suites (`publicAnalytics`, `analyticsTraffic`) and the four
  `tests/integration/analytics/*` DB suites into `routeSuites`; the security
  (`analyticsBeacon`) and new perf (`analyticsIngestion`) suites into
  `baselineSuites`. Added `tests/integration/analytics` to the `test:integration`
  glob (the `test:bun` glob entry was landed earlier by 01-L02). New
  `tests/perf/analyticsIngestion.test.ts` gates pure-handler p95 with a stubbed
  repository plus one real DB-backed smoke write, and asserts no raw IP/UA in
  collector logs.
- **Docs.** `_docs/DATA_MODEL.md` (traffic tables + indexes + PII posture),
  `_docs/CMS_API.md` (traffic endpoints + public beacon collector),
  `_docs/SECURITY_SPEC.md` (nonce/IP-hash secrets, DNT/GPC, `public_write`,
  retention window), `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` (new
  cached traffic keys/TTLs + AnalyticsPage mapping).

## Validation

- Analytics matrix green: Bun lane — `tests/integration/analytics/*`,
  `tests/integration/routes/{publicAnalytics,analyticsTraffic}.test.ts`,
  `tests/security/analyticsBeacon.test.ts`, `tests/perf/analyticsIngestion.test.ts`,
  `tests/unit/analytics/*` (51 pass / 0 fail). Vitest lane — traffic contracts,
  beacon nonce/contract, visitor identity, tracking snippet, admin traffic
  client cache, `AnalyticsPage`/injection ui-integration (all pass).
- `bun run test:bun:lane` / `bun run test:coverage:bun` execute the newly
  registered suites (they appear in the run-bun-lane selection log).
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check` clean.

## Security

- Public-write ingestion uses the shared nonce + `public_write` rate-limit +
  server-side bot/DNT controls, not a weaker one-off flow; captcha exemption is
  intentional and covered by the security suite (token-less beacon still 204s).
- No raw IP/UA/full referrer persisted; visitor id is a salted daily hash;
  secrets (`ANALYTICS_BEACON_NONCE_SECRET`, `ANALYTICS_IP_HASH_SECRET`) never
  reach the browser, logs, or the snippet. Perf suite asserts no PII in logs.
- Semgrep/Trivy/Gitleaks are the CI security-scan stage (`scan:security`); no new
  secret material is committed.
