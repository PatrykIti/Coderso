# 1249 - TASK-537 Entry Mutation Atomicity and Secret-Minimal Projections

Date: 2026-07-12
Version: Unreleased
Tasks: TASK-537, TASK-537-01, TASK-537-01-L01, TASK-537-01-L02,
TASK-537-02, TASK-537-02-L01, TASK-537-03, TASK-537-03-L01

## Key Changes

### Atomic entry metadata boundary

- Entry status/revision, taxonomy assignments, visibility/password/schedule, tags,
  and SEO now commit through one locked transaction or roll back together. Known
  schedule, password, taxonomy, and SEO validation completes before the first write.
- Taxonomy and SEO retain their standalone public behavior while exposing narrow
  caller-executor prepare/apply seams that cannot open nested transactions or clear
  caches inside a composed entry mutation.
- The existing internal Admin endpoints, URLs, strict request envelopes, CSRF,
  `admin_write` rate limiting, and public visibility behavior remain unchanged. No
  endpoint, database migration, dependency, API-key mode, or widget/editor surface was
  added; configurable product widgets remain Dashboard-only.

### Secret-minimal projections, RBAC, and cache timing

- Update, publish, delete, and metadata paths use explicit minimal query projections.
  No read/return projection materializes the stored `accessPassword` hash; the
  SQL-derived `hasPassword` boolean remains the only exposed password-state signal. A
  freshly prepared hash exists transiently only inside the coordinator's DB-write path
  (local preparation and write plan) and is never returned, cached, or logged.
- Locked mutations recheck the required permissions with one minimal joined
  `user_roles` to `roles` snapshot through the transaction executor. Legacy strings
  normalize to a one-element requirement, non-empty arrays are all-of, wildcard roles
  satisfy non-empty requirements, and an empty requirement fails closed.
- Site-cache effects run only after durable commit: SEO metadata clears globally once,
  other changed metadata/status invalidates the affected entry once, and no-op or
  rollback emits neither. Post-commit cache failure is redacted and does not turn a
  committed mutation into a retryable database failure. Browser cache-bus
  reconciliation remains client-owned after a successful response.

### Test integrity and follow-on contract

- The initial audit found two Medium test gaps. The rollback matrix now compares a
  non-null schedule and password-hash baseline across all five write seams, and the
  deferred taxonomy/SEO matrix covers both resolve and reject outcomes with exact
  cache effects. Three fresh final lenses then reported 0 High/Medium/Low findings.
- TASK-517 remains open and untouched. Before implementation it must add TASK-537 as a
  dependency, reground stale `entryService.ts` anchors, keep
  `getEntryAccessPasswordHash` as its sole raw-hash projection, replace occupied pin
  1236 and stale board/changelog-index pin 1230 with one free number synchronized across
  its parent, 517-03, board, and changelog index. Its proposed memoized gated-route
  signal must invalidate through the new post-commit cache seam and must not bypass the
  locked mutation contract.

## Validation and smoke

- Targeted Bun passed 109/109 tests and 663 assertions; entries-client Vitest passed
  19/19. Full validation passed Bun 1,680 pass / 1 optional live OpenAI skip / 0 fail
  with 8,866 assertions across 261 files, and Vitest 836/836 files with 6,746/6,746
  tests. Core/root static checks, `precommit:check`, and all five Coderso release gates
  passed.
- Targeted Semgrep reported zero findings. The strict scan remained non-green only for
  the exact unchanged TASK-545-owned finding in
  `_docs/_workflows/task-522-author.mjs`; Bun audit, Trivy, and Gitleaks were clean and
  no scanner configuration changed.
- Six canonical live scenarios used `coderso-dev-core-host` and separate full
  `playwright-cli -s=wf537smoke ...` commands. They proved visible save/reopen,
  schedule presence/rejection, secret-minimal password state, complete rollback, and
  publish/unpublish front parity in light/dark and wide/narrow viewports with zero
  console errors, warnings, or page errors. Eight unique valid PNGs were captured and
  all fixtures, routes, preferences, sessions, ports, and helper processes were cleaned
  or restored. Setup/debug/cleanup probes with an existing dialog warning or expected
  4xx responses were discarded before canonical measurement and are not counted as
  clean acceptance flows.
