# TASK-537: Entry Mutation Atomicity and Secret-Minimal Projections

# FileName: TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md

**Priority:** High
**Category:** Content Entries / Data Integrity / Security / Cache
**Estimated Effort:** Large
**Dependencies:** TASK-514, TASK-541 (program order); must land before TASK-517
**Status:** 🚧 In Progress
**Started:** 2026-07-12
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Overview

`updateEntryMetadata` currently performs status/publish, taxonomy, entry
metadata/visibility, and SEO writes through separate transaction owners. A later
taxonomy or SEO failure can occur after an earlier write. Several mutation paths
also materialize wider `content_entries` rows than their consumers need,
including the password hash column.

This family introduces one transaction-aware metadata mutation boundary,
prepares all rejectable values before its first write, invalidates caches only
after commit, and narrows update/publish/delete projections. No endpoint, DDL,
permission, or public visibility behavior is added. TASK-517 remains the owner of
public enforcement and must be freshly audited on the post-537 tree.

## Hard invariants

- A metadata request commits entry status/revision, taxonomy assignments,
  visibility/password state, tags, scheduling, and SEO together or not at all.
- The coordinator's first minimal entry read uses `FOR UPDATE`; standalone publish uses
  the same locked path, serializing password keep/clear decisions and per-entry revision
  numbering.
- After the row lock, a route guard reads one fresh permission snapshot through the same
  transaction executor. It always rechecks `content:write` and additionally checks
  `content:publish` only when the locked state proves a real transition. It must never
  acquire a second global-DB connection while the row lock is held.
- Known validation (schedule, password requirement/hash preparation, taxonomy
  membership, SEO canonical/robots) completes before the first write.
- Transaction-aware helpers accept the caller's DB executor and never open a
  nested transaction or clear caches internally.
- A metadata mutation with SEO clears the global site cache once after commit; another
  changed metadata/status mutation performs one targeted content-entry invalidation after
  commit. Browser cache-bus effects stay client-owned after a successful response;
  rollback emits none. A post-commit cache failure is redacted/reported but still returns
  the durable result, so it cannot be mistaken for a DB rollback or trigger a duplicate retry.
- `accessPassword` is never selected/returned/logged by the audited update,
  publish, delete, or metadata mutation queries/results. Existing duplicate,
  list, and detail public/minimal projections remain unchanged and hash-free. A
  derived `hasPassword` boolean remains the only exposed password-state signal.
- DB fixtures are unique and clean up only their own rows.
- A production-local internal dependency seam in `entryService.ts` makes transaction,
  prepare/apply, hash, authorization, and post-commit ordering testable; public service
  signatures and the endpoint surface remain compatible.

## Security Contract

- **Visibility:** existing internal admin content-entry endpoints only; no new
  public route.
- **Auth/RBAC:** the existing Admin session-cookie authentication remains unchanged.
  Ordinary writes require `content:write`; a transition to published additionally
  requires `content:publish` and an actor id. The leading middleware remains an early
  rejection gate. After the row lock, the route guard reads one permission snapshot
  through that transaction executor and evaluates both required permissions before the
  first write. This eliminates split-snapshot authorization and connection-pool
  self-deadlock while preserving `content:write`-only metadata saves on already-published
  entries. This route has no API-key mode and TASK-537 does not add one.
- **CSRF/rate limiting:** session mutations retain shared CSRF and `admin_write`. No
  nonce/captcha applies.
- **Validation:** existing strict route envelopes remain reject-unknown. `scheduledAt`
  remains present-only at the route boundary and the final scheduled state requires a
  valid non-null date. Domain errors stay machine-readable through the centralized entry
  mapper; `seo_canonical_invalid` and `seo_robots_invalid` map to HTTP 400.
- **Secrets:** plaintext passwords exist only long enough to hash; hashes stay in
  the DB executor and never enter a broad returned row, cache, log, or client DTO.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-537-01 | Entry metadata transaction boundary | TASK-537-01-L01, L02 | 🚧 In Progress — implementation/gates complete |
| TASK-537-02 | Secret-minimal entry projections | TASK-537-02-L01 | 🚧 In Progress |
| TASK-537-03 | Rollback/cache tests and closure | TASK-537-03-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| M-01 multi-step metadata writes are non-atomic | 537-01/L01 + L02 + 537-02/L01 | DB fault injection at taxonomy/SEO/status seams rolls back all rows and revisions |
| M-01 cache may run before the full mutation succeeds | 537-02/L01 + 537-03/L01 | cache spy remains silent on rollback and runs once after commit |
| M-02 update/publish/delete materialize password hash | 537-02/L01 | projection-shape tests and query spies prove the column is absent |

## Ownership and land order

Land `537-01 → 537-02 → 537-03`, after TASK-541 and before TASK-544 in the
audited dependency map. Separate 537-01 leaves own transaction-aware taxonomy and SEO helpers;
537-02 is the sole `entryService.ts` writer and the sole TASK-537 writer of the metadata
route/route test plus the narrow executor-aware RBAC seam in `roleService.ts` and
`rbac.ts` and its shared permission-factory type in `routes/index.ts`. It composes the locked outer transaction, transition guard,
pre-write preparation, cache-after-commit, and minimal projections. TASK-517 may
not implement against the stale pre-537 service shape; rerun its route/cache/
security drift audit after 537.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- With repo env loaded and DB reachable: targeted entry/taxonomy/SEO service and
  content route suites, including unique rollback fixtures.
- Controlled concurrency covers password keep/clear and duplicate revision-number races;
  the internal dependency seam covers deferred apply, injected DB failures, permission
  guard timing, and post-commit invalidation timing without production fallbacks.
- A controlled row-lock test proves the guard cannot run before `FOR UPDATE`, and a
  `DB_POOL_MAX=1` subprocess proves the real RBAC lookup completes through the transaction
  executor without waiting for a second pooled connection.
- The existing Admin entries-client Vitest proves cacheBus reconciliation occurs only
  after a successful metadata HTTP response and emits nothing for a rejected response.
- No optional projection helper module is created. Pure preparation behavior is tested
  through the exact exported taxonomy/SEO helpers in their existing Bun-owned suites.
- Re-run every named failing file once in isolation before classifying a failure.
- Post-audit lenses: atomicity, secret projection, cache-after-commit, route error
  mapping, and TASK-517 compatibility.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
and `_docs/ADMIN_CACHE.md` if cache timing text changes. At closure create
changelog 1249 and mark all descendants done.
