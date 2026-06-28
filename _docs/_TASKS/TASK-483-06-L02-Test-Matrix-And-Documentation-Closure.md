# TASK-483-06-L02: Test Matrix And Documentation Closure
# FileName: TASK-483-06-L02-Test-Matrix-And-Documentation-Closure.md

**Parent Subtask:** TASK-483-06
**Priority:** High
**Category:** Tools / Analytics / Tests / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-483-03-L02, TASK-483-04-L03, TASK-483-05-L02, TASK-483-06-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Prove the end-to-end pipeline across lanes, add an ingestion perf
  gate, and bring the source-of-truth docs in sync.
- **Owning module(s) to touch:** test suites only (no production behavior change)
  plus the docs listed below. Add a perf suite for the public collector.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
- **Out-of-scope:** new features; this is the validation + documentation closeout.

## Security Contract

- **Endpoint visibility:** N/A (tests + docs). The docs updates MUST accurately
  describe the public-write collector, its anti-abuse stack, and PII posture.
- **Auth model / RBAC / CSRF / Rate-limit:** documented, not changed here.
- **Validation schema-owner module:** N/A.
- **Anti-abuse controls:** the security suite must assert the documented controls
  actually fire (nonce, captcha threshold, rate-limit, bot/DNT drop).
- **Secret/PII handling:** docs must state: no raw IP/UA/full-referrer stored;
  salted daily visitor hash; DNT/GPC honored; configurable retention. A perf or
  log-scan assertion confirms no PII appears in collector logs.

## Implementation Pseudocode

```
End-to-end matrix (run the lanes for the touched surfaces):
  Vitest (Bun-free):
    - trafficSchemas / beaconNonce / beaconContract / visitorIdentity / trackingSnippet
    - trafficAggregationQuery / serializeTopPagesCsv
    - analyticsTrafficClient (cache) / analyticsTrafficPage (ui-integration) / injection
  Bun (runtime/route/security/perf):
    - tests/integration/routes/publicAnalytics.test.ts
    - tests/integration/routes/analyticsTraffic.test.ts
    - tests/integration/analytics/{trafficSchema,trafficRepository,trafficAggregation,trafficRetention}.test.ts
    - tests/security/analyticsBeacon.test.ts
    - tests/perf/analyticsIngestion.test.ts  (new: N beacons under a latency budget)

Perf gate shape (Bun, tests/perf/analyticsIngestion.test.ts):
  - fire K valid beacons through handlePublicAnalyticsApi
  - assert p95 latency < budget and no unbounded growth in rate-limit/session maps
  - assert no raw IP/UA string appears in captured logs
```

Documentation updates (must match shipped code):

- `_docs/DATA_MODEL.md` — add `analytics_pageviews` + `analytics_sessions`
  (columns, indexes, FK cascade) and the "no raw IP, salted visitor hash" note.
- `_docs/CMS_API.md` — public `POST /_analytics/collect` (204 semantics, nonce,
  captcha, rate-limit) and internal `GET /admin/api/analytics/traffic/*` +
  `.../top-pages/export`.
- `_docs/SECURITY_SPEC.md` — beacon nonce (`ANALYTICS_BEACON_NONCE_SECRET`),
  IP hash secret (`ANALYTICS_IP_HASH_SECRET`, daily salt), DNT/GPC handling,
  `public_write` bucket, retention window (`ANALYTICS_RETENTION_DAYS`).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cached traffic client
  APIs, cache keys, TTLs, and the AnalyticsPage mapping row.

Error handling: if `DATABASE_URL` is unreachable, pause DB suites and report
clearly (do not mark closure on unverified DB lanes). If security scanners are
CI-only, state so explicitly.

Regression-test shape: this leaf is the aggregator — it runs the suites authored
across 01–06 plus the new perf suite and confirms all lanes green.

## Testing Requirements

- **Vitest** suites listed above (`tests/vitest/*`, `tests/vitest/ui-integration/*`).
- **Bun** suites listed above (`tests/integration/*`, `tests/security/*`,
  `tests/perf/*`); DB suites need `set -a && source .env && set +a`.
- Security scanners from `_docs/SECURITY_SPEC.md` for the public-write + secret
  changes, or explicit CI-only note.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` (as detailed above).
