# TASK-551-09: Hot-Path Adoption and Cache Correctness
# FileName: TASK-551-09-Hot-Path-Adoption-And-Cache-Correctness.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Runtime / Cache / Performance / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-551-08 complete; TASK-551-03 query and TASK-551-06
revision handoffs terminal; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Adopt the local/Redis cache in the real public hot path, make an eligible warm
HTML hit execute zero PostgreSQL queries, complete post-commit invalidation for
all rendered dependencies, isolate Admin browser cache by identity/permissions,
and prevent security settings from remaining indefinitely stale across
replicas.

Public cache adoption inherits TASK-551-08's explicit bounded-eventual CAP
contract, not linearizability: healthy worker poll <=250 ms, p99 invalidation
target <=1 second, oldest pending >5 seconds degrades/alerts and enables bypass
readiness, and policy TTL is the hard stale ceiling under global ambiguity.
Admin preview/read-after-write bypasses until its event is observed. Security,
auth, private/password and nonce-bearing data never use this eventual model.

## Locked Adoption Contract

- `publicSite` resolves cache eligibility and canonical generations before any
  redirect/settings/theme/content DB lookup. An eligible HTML hit returns after
  cache/middleware work with exactly zero PostgreSQL queries.
- The renderer records exact dependencies but maps them only to L01's finite
  site/family tags. Record ids/slugs/paths remain digested value-key input and
  never create generation keys. Uncertain linkage uses `site:all`.
- Preview/draft, private/password, authenticated variants, nonce/form-bearing
  HTML, unknown query variants and 5xx remain cache-exempt. Preserve every
  TASK-517 visibility/list/auth exclusion.
- Mutations cover old and new slug/path through the owning finite page/entry/
  post/list/shell/site generations, persist Redis outbox within the mutation
  transaction and apply only after commit. Rollback/no-op emits nothing. A
  memory-generation failure installs a local family bypass fence immediately.
- Admin browser cache is independent from server cache and scoped by deployment,
  authenticated identity and permission fingerprint/epoch. Security secrets
  remain process-local only with at most a 1-second local TTL; Redis carries only
  their generation tag and uncertainty always clears/bypasses to DB.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-551-09-L01 | Public read models, dependency capture, cache-first ordering and zero-query warm hit | ⏳ To Do |
| TASK-551-09-L02 | Pages, entries, posts and current SEO post-commit invalidation | ⏳ To Do |
| TASK-551-09-L03 | Menu/footer/theme/settings/redirect/form/list/detail dependencies and invalidation | ⏳ To Do |
| TASK-551-09-L04 | Admin identity-scoped browser cache and cross-replica-safe local security-settings cache | ⏳ To Do |

**Land order:** `TASK-551-09-L01 → L02 → L03 → L04`.

## Collision Guards and Handoffs

- The parent gate applies before any TASK-551 product implementation:
  TASK-511/TASK-493/TASK-517/TASK-518 are terminal by default, and only a fresh
  exact serialized audit proving every listed schema/journal/env/publicSite/
  entry/SEO/import/lifecycle source and test path disjoint may substitute.
- TASK-517 owns current `publicSite.tsx` visibility/cache-exclusion work. L01
  cannot dispatch until all relevant TASK-517 leaves are terminal or an exact
  serialized handoff is recorded; it re-reads final bytes and preserves their
  behavior/tests. L02 likewise waits for TASK-517's `entryService` writer.
- TASK-493 owns new sitemap/Search Console/indexing behavior, including its
  `publicSite.tsx` and SEO service work. L01/L02 cannot dispatch until those
  writers are terminal or explicitly serialized; then 09 becomes the sole final
  TASK-551 writer of `publicSite.tsx` and the whole current `seoService`, while
  preserving TASK-493 behavior. It never edits TASK-493 schema, routes, Admin UI
  or migrations.
- TASK-511 exclusively owns `core/services/backups/**`. L03 consumes its final
  import/restore post-commit effect seam and never edits backup code. If the
  terminal seam cannot carry `CacheInvalidationPlan`, implementation pauses for
  a task-contract amendment rather than invalidating inside a transaction.
- No 09 leaf edits 07/08 owners, other TASK-551 domain/query owners, migration
  artifacts, package files, workflows, board/changelog or shared docs.
- TASK-551-03 and TASK-551-06 hand off specifications/evidence only: 09-L02 is
  the sole writer for whole entry/post facade/mutation/revision adoption and
  `seoService`; 09-L03 is the sole writer for whole `importExportService` and
  `detailPageDocumentService`. Earlier leaves must not edit those paths.
- L02 likewise owns the complete existing entry/post/SEO test suites and their
  named cohesive splits; L03 owns the complete existing import-export/detail-
  page suites. No earlier leaf may partially edit or extract those tests.

## Security Contract

- **Visibility:** existing public reads and internal Admin APIs only; no new
  public write route.
- **Auth/RBAC:** existing checks remain authoritative and happen before
  protected data; authenticated/private/password output never enters shared
  HTML cache.
- **CSRF/rate limits:** all existing writes retain CSRF and route-family limits;
  cache failure cannot bypass middleware.
- **Validation:** strict cache policy/envelope plus bounded query variants,
  dependency tags and Admin scope envelopes.
- **Secrets/privacy:** no secret/decrypted security value, cookie, nonce, token,
  raw user identifier or private body in Redis/browser key/log/metric.
- **Anti-abuse:** existing form/booking/analytics nonce/HMAC/CAPTCHA remains
  authoritative across hit/miss/outage paths.

## Acceptance Criteria

- Warm eligible public HTML performs exactly zero DB queries with byte-identical
  output; cold and cache-disabled paths remain correct.
- Update/delete/old-new slug plus page/entry/post/SEO/menu/footer/theme/settings/
  redirects/forms/list/detail dependencies select the complete finite family
  invalidation plan after commit in memory and two-client Redis modes.
- Rollback/no-op and failed mutations do not invalidate; Redis failure after a
  durable commit does not turn API success into failure.
- Healthy Redis invalidation meets <=250 ms polling and <=1 second p99 delivery;
  >5-second backlog degrades/alerts and enables bypass readiness. Global
  ambiguity may retain safe public bytes only to policy TTL and is never called
  linearizable or instant cross-replica invalidation.
- Admin cache never hydrates across user or permission scope; storage/cacheBus
  failure is best effort. Security cache is secret-local, generation-checked,
  <=1-second-lived and DB-bypassed on any generation/transport uncertainty.
- Every touched oversized module is split coherently below 1,000 lines before
  behavior is added.

Full perf/fault/smoke/docs/closure and changelog 1263 remain with TASK-551-10.
