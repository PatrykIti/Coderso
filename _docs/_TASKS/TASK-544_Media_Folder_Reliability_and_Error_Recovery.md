# TASK-544: Media Folder Reliability and Error Recovery

# FileName: TASK-544_Media_Folder_Reliability_and_Error_Recovery.md

**Priority:** Medium
**Category:** Media / Service Reliability / Admin Cache / Admin UI
**Estimated Effort:** Medium
**Dependencies:** Existing media folder service, routes, client, and rail; TASK-537 (program order)
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Overview

The audit confirmed three reliability gaps: a concurrent folder-slug update can
escape as 500 despite the route already knowing the stable conflict error, a
rejected list promise remains cached indefinitely, and create/rename/reorder/
delete UI paths dismiss drafts or swallow failures.

This family maps the owned database race in the service, makes request dedupe
retryable, and preserves user state while exposing accessible retry actions. It
adds no route, error code, endpoint, migration, or product feature.

## Invariants

- PostgreSQL `23505` is mapped only when the violated owned constraint represents
  media folder slug uniqueness, including the supported wrapped-cause shape.
  The existing `media_folder_slug_conflict` mapper returns 409.
- A settled dedupe promise clears in `finally` only when it is still the same
  promise; an old request can never clear a newer in-flight read.
- Create/rename UI remains open until success. Every operation exposes an
  accessible error and retry while preserving draft text, selection, expansion,
  and optimistic order or rolling it back deterministically.
- Cache invalidation/broadcast occurs only after a successful mutation.

## Security Contract

- **Visibility:** existing internal admin media-folder endpoints only.
- **Auth/RBAC:** authenticated session/API-key with existing `media:read` and
  `media:write` permissions.
- **CSRF/rate limit:** session writes retain CSRF and admin write bucket; reads
  retain admin read bucket. No public nonce/captcha applies.
- **Validation:** existing strict route schemas, depth/cycle constraints, and
  centralized error mapping remain fail closed. Constraint inspection reveals no
  raw database message to clients.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-544-01 | Folder slug race mapping | TASK-544-01-L01 | ⏳ To Do |
| TASK-544-02 | Retryable folder cache dedupe | TASK-544-02-L01 | ⏳ To Do |
| TASK-544-03 | Visible retryable folder UI errors | TASK-544-03-L01 | ⏳ To Do |
| TASK-544-04 | Tests, smoke, and closure | TASK-544-04-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| L-04 update slug race returns 500 | 544-01/L01 | concurrent/forced owned 23505 maps to domain code and route 409; unrelated 23505 is not laundered |
| L-05 rejected promise is sticky | 544-02/L01 | reject→retry and old/new promise identity tests |
| L-06 UI loses/swallows operation errors | 544-03/L01 | each operation fail→state retained→retry success flow |

## Ownership and land order

Land `544-01 → 544-02 → 544-03 → 544-04`, after TASK-537 and before TASK-543.
Service plus its direct service/media-folder-route tests, client plus its direct promise
tests, and UI plus its direct interaction tests each have one source leaf. Closure reruns
those files read-only and owns only additive broad route-registration coverage, smoke,
docs and metadata. Route production source remains untouched unless fresh evidence shows
its existing central mapper is incomplete.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after source leaves.
- Load `.env` before targeted DB-backed media folder service/route suites; use
  unique fixtures and delete only owned rows.
- Targeted client/rail/library Vitest suites with deferred promise/error paths.
- At least five flows covering create, rename, reorder, delete, and failed list
  retry; assert retained state, visible errors, light/dark, zero console errors.
- Re-run each named failing file once in isolation before classification.

## Documentation Updates Required

Update `_docs/MEDIA_SPEC.md`, `_docs/ADMIN_CACHE.md`, and
`_docs/ADMIN_CACHE_MAP.md` if the stated retry/invalidation contract changes.
At closure create changelog 1256 and close all descendants.
