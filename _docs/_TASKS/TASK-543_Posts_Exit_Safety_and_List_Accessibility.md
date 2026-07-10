# TASK-543: Posts Exit Safety and List Accessibility

# FileName: TASK-543_Posts_Exit_Safety_and_List_Accessibility.md

**Priority:** High
**Category:** Posts / Autosave / Admin UI / Accessibility
**Estimated Effort:** Small
**Dependencies:** Existing Posts editor and PostsTable contracts
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Overview

The Posts editor exposes an autosave `flush`, but Close currently navigates
without awaiting it and the editor-state wrapper swallows failures. A dirty draft
can therefore be lost. The Posts list also makes a table row mouse-clickable even
though it contains interactive descendants and has no equivalent keyboard row
contract; author/date metadata disappears through the `md..lg` range.

This family makes Close a transactional UI action and restores semantic list
navigation. It adds no API, model, route, or database behavior.

## Invariants

- Close coalesces with any in-flight save, flushes the newest dirty snapshot,
  preserves ascending exact-revision write order, prevents a newer snapshot from
  satisfying an older manual/Close target, prevents double navigation, and navigates only
  after success or proven clean.
- Initial load, an accepted authoritative hydration, and an editor-identity transition
  seed/reset the exact persisted target. Initial and post-hydration clean Close perform
  zero writes, while a clean revert behind an older pending write with different bytes
  queues an exact restoration after that write before navigation.
- Autosave failure propagates to a visible accessible error; the editor, draft,
  and retry action remain available.
- Rows are not synthetic links/buttons. The existing title `AdminLink` remains
  the canonical keyboard and pointer navigation target.
- Author and date/published context stay visible at `md..lg` without duplicating
  status or creating conflicting accessible names.

## Security Contract

No route, auth, RBAC, CSRF, rate-limit, nonce, captcha, or validation contract
changes. Existing post-save permissions and write protections remain the only
mutation boundary.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-543-01 | Autosave flush before Close | TASK-543-01-L01 | ⏳ To Do |
| TASK-543-02 | Posts table keyboard and metadata parity | TASK-543-02-L01 | ⏳ To Do |
| TASK-543-03 | Tests, smoke, and closure | TASK-543-03-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| II-M-02 Close races autosave | 543-01/L01 | initial/post-hydration clean zero-write, dirty→Close success, pending-write revert restoration, identity reset, active-save coalescing, failure stays, double Close once |
| PostsTable nested/non-keyboard row click | 543-02/L01 | row has no click role; title link works by keyboard and pointer |
| author/date disappear at mid viewport | 543-02/L01 | 768/900/1024 px accessible and visual assertions |

## Ownership and land order

Land `543-01 → 543-02 → 543-03`, after TASK-544 and before TASK-540 in the
program. The autosave/editor-state/shell seam and its direct tests belong exclusively to
543-01; PostsTable and its direct tests belong exclusively to 543-02. Closure reruns all
six suites read-only and reopens neither source nor changed-behavior tests.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after source leaves.
- Targeted post autosave hooks, editor shell, PostsTable, list integration, and
  keyboard accessibility Vitest suites.
- At least five light/dark flows covering clean Close, dirty successful Close,
  pending-write revert restoration, failure/retry, double activation, keyboard row
  navigation, and mid-width metadata; focused tests additionally prove post-hydration
  clean zero-write and editor-identity reset. Require zero console errors and visible/ARIA
  assertions.

## Documentation Updates Required

Update Posts editor/list UX docs if behavior is documented. At closure create
changelog 1255 and close all descendants.
