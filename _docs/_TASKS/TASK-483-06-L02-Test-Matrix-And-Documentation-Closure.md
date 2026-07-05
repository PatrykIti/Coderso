# TASK-483-06-L02: Test Matrix And Documentation Closure
# FileName: TASK-483-06-L02-Test-Matrix-And-Documentation-Closure.md

**Parent Subtask:** TASK-483-06
**Priority:** High
**Category:** Tools / Analytics / Tests / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-483-03-L02, TASK-483-04-L03, TASK-483-05-L02, TASK-483-06-L01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Prove the end-to-end pipeline across lanes, add an ingestion perf
  gate, bring the source-of-truth docs in sync, and perform the board/changelog
  closure for the whole TASK-483 stream (pinned changelog number **1221**).
- **Owning module(s) to touch:** test suites only (no production behavior change)
  plus the docs listed below. Add a perf suite for the public collector. This
  leaf is also the ONLY TASK-483 file allowed to edit
  `_docs/_TASKS/README.md` and create the `_docs/_CHANGELOG/1221-*.md` entry.
- **Standing-gate wiring (mandatory, this leaf):** the PR-gate Bun job does NOT
  run the `test:bun` glob. It runs ONLY `bun run test:bun:lane` and
  `bun run test:coverage:bun` (`.github/workflows/coderso-pr-gates.yml:135,138`),
  and BOTH invoke `scripts/run-bun-lane.ts` (`package.json:35-36`), which selects
  suites from an EXPLICIT allowlist — `routeSuites` (env-gated via `canRunSuite`)
  plus `baselineSuites` (unconditional) — NOT from any glob. Therefore the ONLY
  way a suite reaches standing CI is by being listed in `run-bun-lane.ts`; the
  `package.json` `test:bun` glob is a local-only convenience that CI never
  executes. Consequences and this leaf's OWNED wiring:
  - `test:bun` glob edits (01-L02 added `tests/integration/analytics` to the
    `test:bun` script + mirrored it in `_docs/TESTING_STRATEGY.md`) give LOCAL
    coverage only; they do NOT put anything in the PR gate. This leaf must NOT
    re-add `tests/integration/analytics` to `test:bun` (avoid duplicate / merge
    conflict on the shared additive surface) — it only VERIFIES 01-L02's local
    glob edit landed.
  - ADD `tests/integration/analytics` to the `test:integration` glob in
    `package.json` (`package.json:42` — additive: append the dir, do not reorder
    the existing list). This is also local/convenience, not the PR gate.
  - REGISTER the new analytics suites in `scripts/run-bun-lane.ts` so they run in
    STANDING CI (this is the load-bearing wiring, not the globs above):
    - `routeSuites` (the DB-backed, env-gated array; matching the EXISTING
      `tests/integration/routes/analytics.test.ts` precedent already listed
      there): add BOTH new route suites — `tests/integration/routes/publicAnalytics.test.ts`
      (02-L02, the security-critical PUBLIC-WRITE ingestion route) and
      `tests/integration/routes/analyticsTraffic.test.ts` (04-L03, admin traffic
      route). Neither 02-L02 nor 04-L03 registers itself in `run-bun-lane.ts`, so
      this leaf OWNS adding them; without it the public-write surface and the
      admin traffic route ship with ZERO PR-gate coverage.
    - `routeSuites` (same env-gated array): add the four new DB-backed suites
      `tests/integration/analytics/{trafficSchema,trafficRepository,trafficAggregation,trafficRetention}.test.ts`
      so they run in CI (env-gated so a missing `DATABASE_URL` skips gracefully
      instead of failing the whole lane).
    - `baselineSuites` (unconditional array — today it contains NO security suite
      and only two perf suites `admin-request-baseline`/`admin-prefetch-budget`):
      add `tests/security/analyticsBeacon.test.ts` and
      `tests/perf/analyticsIngestion.test.ts` so the beacon anti-abuse contract
      and the ingestion perf gate execute in the PR gate. Both need
      `DATABASE_URL`, which the CI Bun job provides (same as the existing
      DB-backed baseline perf suites).
  - Then verify by running the REAL gate commands `bun run test:bun:lane` and
    `bun run test:coverage:bun` and confirming the newly-registered suites appear
    in run-bun-lane's `selected N route suites and M baseline suites` log.
  Without the `run-bun-lane.ts` registration above, a wrong prune order (FK
  violation), a bad cutoff, or a public-write anti-abuse regression could ship
  undetected post-merge — the `test:integration`/`test:bun` glob edits alone do
  NOT close this because CI never runs those globs.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
- **Out-of-scope:** new features; this is the validation + documentation closeout.

## Security Contract

- **Endpoint visibility:** N/A (tests + docs). The docs updates MUST accurately
  describe the public-write collector, its anti-abuse stack, and PII posture.
- **Auth model / RBAC / CSRF / Rate-limit:** documented, not changed here.
- **Validation schema-owner module:** N/A.
- **Anti-abuse controls:** the security suite must assert the beacon's TRUE
  contract — HMAC `nonce` + `public_write` rate-limit + server-side
  `classifyBot`/DNT drop — and MUST assert a token-less/captcha-less `sendBeacon`
  still succeeds (204). Do NOT assert a captcha/`enforceBotProtection` control on
  `/_analytics/collect`: the parent's **binding captcha exemption** forbids it
  (a token-less beacon would throw `bot_protection_required` (400) whenever bot
  protection is enabled — `core/services/security/botProtection.ts:43` enabled
  gate, `:63-66` token-required throw — and silently kill the pipeline). Any
  captcha assertion belongs to forms/booking, never to the analytics collector.
- **Secret/PII handling:** docs must state: no raw IP/UA/full-referrer stored;
  salted daily visitor hash; DNT/GPC honored; configurable retention. A perf or
  log-scan assertion confirms no PII appears in collector logs.

## Implementation Pseudocode

```
End-to-end matrix (run the lanes for the touched surfaces):
  Vitest (Bun-free):
    - trafficSchemas / beaconNonce / beaconContract / visitorIdentity / trackingSnippet
    - analyticsTrafficClient (cache) / analyticsTrafficPage (ui-integration) / injection
  Bun (runtime/route/security/perf):
    - tests/unit/analytics/trafficAggregationQuery.test.ts (normalizers)
    - tests/unit/analytics/  serializeTopPagesCsv (CSV formula-injection guard)
      NOTE: trafficAggregationQuery + serializeTopPagesCsv are Bun lane even
      though pure — they live in trafficAggregationService.ts, which imports
      db/client (core/db/client.ts throws without DATABASE_URL and opens a
      postgres() pool at import), so a Vitest import crashes at module load;
      mirrors the serializeTopContentCsv precedent at
      tests/unit/analytics/analyticsService.test.ts. Owner leaves = 04-L01/04-L03.
    - tests/integration/routes/publicAnalytics.test.ts
    - tests/integration/routes/analyticsTraffic.test.ts
    - tests/integration/analytics/{trafficSchema,trafficRepository,trafficAggregation,trafficRetention}.test.ts
    - tests/security/analyticsBeacon.test.ts
    - tests/perf/analyticsIngestion.test.ts  (new: N beacons under a latency budget)

Perf gate shape (Bun, tests/perf/analyticsIngestion.test.ts):
  - shared remote test DB: tag every beacon with a unique run-scoped identity
    (e.g. path `/perf-<runId>/...` with runId = crypto.randomUUID()) so the
    inserted pageview/session rows are attributable to this run only
  - set ANALYTICS_PRUNE_INLINE_DISABLED=1 (TASK-483-06-L01 seam) so the K
    ingestion writes never fire a cross-suite retention delete
  - fire K valid beacons through handlePublicAnalyticsApi
  - assert p95 latency < budget and no unbounded growth in rate-limit/session maps
  - assert no raw IP/UA string appears in captured logs
  - afterAll: delete exactly the rows whose path/visitor identity carries this
    run's runId marker — never truncate or delete-by-date on shared tables
  - latency/count assertions must tolerate rows from other suites (no
    global-emptiness or global-rowcount assumptions)
  - alternative when gating pure handler latency: inject a trafficRepository
    stub for the K-beacon loop, plus ONE small DB-backed smoke beacon
    (real recordTrafficEvent write, cleaned up in afterAll) to keep the gate
    honest about the persistence path
```

Documentation updates (must match shipped code). Shared-surface scoping:
`_docs/DATA_MODEL.md`, `_docs/CMS_API.md` and `_docs/SECURITY_SPEC.md` are also
edited by the parallel TASK-484 stream (TASK-482 may touch adjacent surfaces) —
add/edit ONLY the TASK-483-owned sections, never restructure, reorder, or
reformat surrounding content:

- `_docs/DATA_MODEL.md` — add `analytics_pageviews` + `analytics_sessions`
  (columns, indexes, FK cascade) and the "no raw IP, salted visitor hash" note.
- `_docs/CMS_API.md` — public `POST /_analytics/collect` (204 semantics, HMAC
  nonce, `public_write` rate-limit, server-side bot/DNT drop; NO
  captcha/`enforceBotProtection` — binding captcha exemption, a token-less
  beacon must still 204) and internal `GET /admin/api/analytics/traffic/*` +
  `.../top-pages/export`.
- `_docs/SECURITY_SPEC.md` — beacon nonce (`ANALYTICS_BEACON_NONCE_SECRET`),
  IP hash secret (`ANALYTICS_IP_HASH_SECRET`, daily salt), DNT/GPC handling,
  `public_write` bucket, retention window (`ANALYTICS_RETENTION_DAYS`).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — new cached traffic client
  APIs, cache keys, TTLs, and the AnalyticsPage mapping row.

Board & changelog closure (this leaf ONLY — pinned coordination facts):

- Create `_docs/_CHANGELOG/1221-<date>-task-483-real-web-analytics-pipeline.md`.
  The changelog number is **firmly pinned to 1221** — do NOT pick the "next
  free" number at closure time: 1219 (TASK-510), 1220 (TASK-482) and
  1222 (TASK-484) are reserved by parallel streams and may not yet be present
  in this worktree's checkout.
- Edit `_docs/_TASKS/README.md` touching ONLY the TASK-483 rows and this
  stream's own statistics deltas — never restructure or renumber other rows.
- Implementation subtasks (01–05 and 06-L01) never touch the board or the
  changelog; this closure leaf is the single writer — matching the
  board/changelog-discipline Note in `TASK-483_Real_Web_Analytics_Pipeline.md`.

Error handling: if `DATABASE_URL` is unreachable, pause DB suites and report
clearly (do not mark closure on unverified DB lanes). If security scanners are
CI-only, state so explicitly.

Regression-test shape: this leaf is the aggregator — it runs the suites authored
across 01–06 plus the new perf suite and confirms all lanes green. Because
ad-hoc runs do not make a suite part of standing CI, and because the PR gate runs
`bun run test:bun:lane` / `bun run test:coverage:bun` (the `run-bun-lane.ts`
allowlist) rather than the `test:bun` glob, this leaf ALSO wires EVERY new
analytics suite into `scripts/run-bun-lane.ts`: the two new route suites
(`publicAnalytics.test.ts`, `analyticsTraffic.test.ts`) and the four
`tests/integration/analytics/*` DB suites into `routeSuites`, and the security
(`analyticsBeacon.test.ts`) + perf (`analyticsIngestion.test.ts`) suites into
`baselineSuites` (see Standing-gate wiring above). The `package.json`
`test:integration`/`test:bun` glob edits are local-only (the `test:bun` analytics
coverage was landed by TASK-483-01-L02 and is only verified here). This leaf then
re-runs `bun run test:bun:lane` (and `bun run test:coverage:bun`) — the actual PR
gate — to prove the gate now executes them, so post-merge regressions in the
public-write ingestion route, the admin traffic route, and the analytics DB
suites are caught by CI rather than only here.

## Testing Requirements

- **Vitest** suites listed above (`tests/vitest/*`, `tests/vitest/ui-integration/*`).
- **Bun** suites listed above (`tests/integration/*`, `tests/security/*`,
  `tests/perf/*`); DB suites need `set -a && source .env && set +a`.
- Security scanners from `_docs/SECURITY_SPEC.md` for the public-write + secret
  changes, or explicit CI-only note.
- **Standing-gate wiring:** VERIFY `tests/integration/analytics` is already in the
  `test:bun` LOCAL glob (landed by TASK-483-01-L02 — do NOT re-add it); ADD
  `tests/integration/analytics` to the `test:integration` glob in `package.json`
  (append; no reorder). Then register in `scripts/run-bun-lane.ts` (the ONLY
  allowlist the PR gate runs): the two new route suites
  (`tests/integration/routes/publicAnalytics.test.ts`,
  `tests/integration/routes/analyticsTraffic.test.ts`) and the four
  `tests/integration/analytics/*` DB suites into `routeSuites`; the
  `tests/security/analyticsBeacon.test.ts` + `tests/perf/analyticsIngestion.test.ts`
  suites into `baselineSuites`. Confirm the REAL gate commands
  `bun run test:bun:lane` and `bun run test:coverage:bun` execute all of them
  (they appear in the `[bun-lane] selected …` log), not just this leaf's manual
  matrix. `bun run test:bun` remains a LOCAL convenience only — it is never run in
  the PR gate, so it does not by itself prove standing-CI coverage.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md` (as detailed above).
- `_docs/_CHANGELOG/1221-*.md` — new closure entry, pinned number **1221**
  (1219/1220/1222 reserved by parallel streams).
- `_docs/_TASKS/README.md` — TASK-483 rows + own statistics deltas only.
