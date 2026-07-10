# TASK-537: Entry Mutation Atomicity and Secret-Minimal Projections

# FileName: TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md

**Priority:** High
**Category:** Content Entries / Data Integrity / Security / Cache
**Estimated Effort:** Large
**Dependencies:** TASK-514, TASK-536 (program order); must land before TASK-517
**Status:** ⏳ To Do
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
- Known validation (schedule, password requirement/hash preparation, taxonomy
  membership, SEO canonical/robots) completes before the first write.
- Transaction-aware helpers accept the caller's DB executor and never open a
  nested transaction or clear caches internally.
- Public/site/admin cache invalidation and cache-bus effects happen only after a
  successful outer commit; rollback emits none.
- `accessPassword` is never selected/returned/logged by the audited update,
  publish, delete, or metadata mutation queries/results. Existing duplicate,
  list, and detail public/minimal projections remain unchanged and hash-free. A
  derived `hasPassword` boolean remains the only exposed password-state signal.
- DB fixtures are unique and clean up only their own rows.

## Security Contract

- **Visibility:** existing internal admin content-entry endpoints only; no new
  public route.
- **Auth/RBAC:** session/API-key authentication remains unchanged. Ordinary
  writes require `content:write`; a transition to published additionally requires
  `content:publish` and an actor id.
- **CSRF/rate limiting:** session mutations retain shared CSRF and `admin_write`;
  API keys retain their scoped internal path. No nonce/captcha applies.
- **Validation:** existing strict route envelopes remain reject-unknown. Domain
  errors stay machine-readable and continue through the centralized entry error
  mapper.
- **Secrets:** plaintext passwords exist only long enough to hash; hashes stay in
  the DB executor and never enter a broad returned row, cache, log, or client DTO.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-537-01 | Entry metadata transaction boundary | TASK-537-01-L01, L02 | ⏳ To Do |
| TASK-537-02 | Secret-minimal entry projections | TASK-537-02-L01 | ⏳ To Do |
| TASK-537-03 | Rollback/cache tests and closure | TASK-537-03-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| M-01 multi-step metadata writes are non-atomic | 537-01/L01 + L02 + 537-02/L01 | DB fault injection at taxonomy/SEO/status seams rolls back all rows and revisions |
| M-01 cache may run before the full mutation succeeds | 537-02/L01 + 537-03/L01 | cache spy remains silent on rollback and runs once after commit |
| M-02 update/publish/delete materialize password hash | 537-02/L01 | projection-shape tests and query spies prove the column is absent |

## Ownership and land order

Land `537-01 → 537-02 → 537-03`, after TASK-536 and before TASK-538 in the
program. Separate 537-01 leaves own transaction-aware taxonomy and SEO helpers;
537-02 is the sole `entryService.ts` writer and composes the outer transaction,
pre-write preparation, cache-after-commit, and minimal projections. TASK-517 may
not implement against the stale pre-537 service shape; rerun its route/cache/
security drift audit after 537.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- With repo env loaded and DB reachable: targeted entry/taxonomy/SEO service and
  content route suites, including unique rollback fixtures.
- No optional projection helper module is created. Pure preparation behavior is tested
  through the exact exported taxonomy/SEO helpers in their existing Bun-owned suites.
- Re-run every named failing file once in isolation before classifying a failure.
- Post-audit lenses: atomicity, secret projection, cache-after-commit, route error
  mapping, and TASK-517 compatibility.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
and `_docs/ADMIN_CACHE.md` if cache timing text changes. At closure create
changelog 1249 and mark all descendants done.
