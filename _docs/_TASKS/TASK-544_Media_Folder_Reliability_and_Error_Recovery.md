# TASK-544: Media Folder Reliability and Error Recovery

# FileName: TASK-544_Media_Folder_Reliability_and_Error_Recovery.md

**Priority:** Medium
**Category:** Media / Service Reliability / Admin Cache / Admin UI
**Estimated Effort:** Medium
**Dependencies:** Existing media folder service, routes, client, and rail; TASK-537 (program order)
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Overview

The audit confirmed three reliability gaps: a concurrent folder-slug update can
escape as 500 despite the route already knowing the stable conflict error, a
rejected list promise remains cached indefinitely, and create/rename/reorder/
delete UI paths dismiss drafts or swallow failures.

This family maps the owned database race in the service, makes request dedupe
retryable, and preserves user state while exposing accessible retry actions. It
adds no route, server/API/domain error code, endpoint, migration, or product
feature. The client-only `media_folders_response_invalid` code names a malformed
folder-list response and never crosses the API boundary.

## Invariants

- PostgreSQL `23505` is mapped only when the violated owned constraint represents
  media folder slug uniqueness, including the supported wrapped-cause shape.
  The existing `media_folder_slug_conflict` mapper returns 409.
- A settled dedupe promise clears in `finally` only when it is still the same
  promise; an old request can never clear a newer in-flight read.
- Only a finite, item-level validated and canonical six-field folder projection may
  enter the browser cache. Validation uses own data-property descriptors without
  invoking accessors; unknown row fields, including backend-only metadata, are
  stripped rather than persisted. No client-only row-count or string-size limit may
  reject a response the unchanged server contract permits. Forced reads and explicit
  clears advance the request generation, so an older completion cannot prime rows
  after invalidation.
- Create/rename UI remains open until success. Every operation exposes an
  accessible error and retry while preserving draft text, selection, and current
  order. The existing nested tree remains always expanded; TASK-544 does not add a
  collapse/expansion feature.
- User-initiated folder operations are serialized by an attempt identity. Error
  feedback has a separate immutable retry token, kind, target, and form generation;
  a success closes only the exact still-current form. Mount, cache-bus, and manual
  Retry loads share a separately guarded loader, preserve the last good tree, and
  cannot clobber a newer mutation error or completion. A synchronous success-only
  cache broadcast is ordered against the triggering mutation attempt so a
  reconciliation failure is deferred and surfaced without replaying that mutation.
- Cache invalidation/broadcast occurs only after a successful mutation.

## Security Contract

- **Visibility:** existing internal admin media-folder endpoints only.
- **Auth/RBAC:** existing authenticated Admin session cookie with `media:read` and
  `media:write` permissions. These generic Admin routes have no API-key mode.
- **CSRF/rate limit:** session writes retain CSRF and admin write bucket; reads
  retain admin read bucket. API key, public nonce/HMAC, and captcha do not apply.
- **Validation:** existing strict route schemas, depth/cycle constraints, and
  centralized error mapping remain fail closed. The recognized owned conflict exposes no
  raw database message to clients; unmatched errors keep the unchanged global-boundary
  behavior.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-544-01 | Folder slug race mapping | TASK-544-01-L01 | ✅ Done |
| TASK-544-02 | Retryable folder cache dedupe | TASK-544-02-L01 | ✅ Done |
| TASK-544-03 | Visible retryable folder UI errors | TASK-544-03-L01 | ✅ Done |
| TASK-544-04 | Tests, smoke, and closure | TASK-544-04-L01 | ✅ Done |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| L-04 update slug race returns 500 | 544-01/L01 | blocker PID plus paired granted/ungranted pg_locks prove create/update write waits, the owned 23505 maps to the domain code, POST/PATCH + toErrorResponse prove bounded 409 JSON, and unrelated 23505 is not laundered |
| L-05 rejected promise is sticky | 544-02/L01 | reject→retry and old/new promise identity tests |
| L-06 UI loses/swallows operation errors | 544-03/L01 | each operation fail→state retained→retry success flow |

## Ownership and land order

Land `544-01 → 544-02 → 544-03 → 544-04`, after TASK-537 and before TASK-543.
Service plus its direct service/media-folder-route tests, client plus its direct promise
tests, and UI plus its direct interaction tests each have one source leaf. Closure reruns
those files read-only and owns only additive broad route-registration coverage, smoke,
docs and metadata. Route production source remains untouched unless fresh evidence shows
its existing central mapper is incomplete.
`_docs/_workflows/task-544-implement.mjs` is orchestrator-owned and must be authored and
freshly audited before activation; no implementation leaf may edit it.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after source leaves.
- Load `.env` before targeted DB-backed media folder service/route suites; use
  unique fixtures and delete only owned rows.
- Targeted client/rail/library Vitest suites with deferred promise/error paths.
- Exactly five canonical live flows cover create, rename, reorder, delete, and failed
  list retry. Use full task-scoped `playwright-cli` commands with method/path-aware
  one-shot malformed-JSON faulting, explicit unroute/empty route-list proof, retained
  state, structured visible/geometry/focus assertions, light/dark, wide/narrow and
  zero console errors, warnings, or page errors.
- Re-run each named failing file once in isolation before classification.
- Before closure, with DB preflight green, run full `bun run test`,
  `bun run precommit:check`, all five Coderso release gates, and
  `bun run scan:security:strict`. Run `bun run precommit` again after staging and
  before the task-scoped manual commit. After that owner commit, run a fresh
  read-only audit against the committed HEAD; the implementation workflow stops at
  this explicit owner handoff and never stages or commits itself.

## Documentation Updates Required

Update `_docs/MEDIA_SPEC.md`, `_docs/ADMIN_CACHE.md`, and
`_docs/ADMIN_CACHE_MAP.md` if the stated retry/invalidation contract changes.
At closure create changelog 1256 and close all descendants.

## Closeout

- The owned PostgreSQL slug constraint now maps deterministically to the existing
  bounded 409; rejected/overlapping folder reads recover through an identity- and
  generation-safe canonical six-field cache; load/create/rename/reorder/delete errors
  stay visible and retry without losing user state. Cache invalidation and broadcasts
  remain success-only.
- The first live run found a real background-load busy-state drift. The generation guard
  and old-first/newer-generation regression fix landed before the final validation. Smoke
  tooling was also made fail-closed after discovering browser `Buffer` unavailability,
  CLI/page unroute asymmetry, native-dialog session poisoning, consumed-Retry semantics,
  and stale probe chronology; failed attempts were discarded rather than counted.
- Targeted validation passed Bun 36/36 and Vitest 78/78. Full validation passed Bun
  1,687 with one optional live OpenAI skip and zero failures across 261 files, plus
  Vitest 6,794/6,794 across 836 files. Core lint/types, `precommit:check`, Admin build
  (2,637 modules; chunk warnings only), Admin boundary (776 files), Admin bundle, and
  all five Coderso release gates passed. Targeted Semgrep had zero findings. The strict
  scan was non-green only for exact unchanged `_docs/_workflows/task-522-author.mjs:185`,
  owned by TASK-545; Bun audit, Trivy, and Gitleaks were clean and no suppression changed.
- Fresh source/test/post/smoke audits reported zero High/Medium/Low findings. Five final
  real CLI flows covered list/create/rename/reorder/delete in light/dark and wide/narrow,
  with visible state/geometry/counter/confirmation assertions, five distinct valid PNG
  hashes, zero canonical console/warning/page errors, and complete cleanup of all nine
  fixtures, DB prefix, setup/theme state, routes, session, helper PIDs, and ports.
- Credential fills redirect output to `/dev/null`, and the recent workflow-artifact scan
  found zero credential-value hits. Older ignored local artifacts are pre-existing and
  require separate user-authorized hygiene. No endpoint, migration, RBAC, security
  contract, Dashboard/widget surface, or non-Dashboard editor model was added or widened.
