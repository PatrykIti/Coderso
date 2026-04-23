# TASK-201-04-02: Usage Entry Navigation and Affordance Fallback
# FileName: TASK-201-04-02_Usage_Entry_Navigation_and_Affordance_Fallback.md

**Priority:** Medium
**Category:** CMS/Media + Admin/UI + Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-201-04-01
**Status:** To Do

---

## Overview

Render media usage summaries in the details drawer with correct navigation
behavior. Resolvable resources should use canonical admin navigation helpers;
unresolvable resources should be visibly informational, not clickable.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/types.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts` only if usage links join prefetch
- `core/admin/ui/shared/AdminLink.tsx` for reference only
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- `tests/perf/admin-prefetch-budget.test.ts` only if usage prefetch semantics
  change

## Security Contract

- Visibility: internal admin drawer only.
- Auth model: usage data comes from the authenticated admin usage endpoint.
- RBAC: render only what the endpoint returns for the current user.
- CSRF: not applicable for read-only render.
- Rate-limit bucket: endpoint-owned `admin_read`.
- Reject-unknown validation: client normalizes known usage summary fields and
  treats unknown target types as non-navigable.
- Anti-abuse:
  - no manual href string concatenation outside canonical helpers,
  - no clickable styling for missing/unsafe destinations,
  - no prefetch storm when opening the details drawer.

## Testing Requirements

- Vitest:
  - usage loading, empty, and error states,
  - page/post/entry/commerce links resolve through current admin helpers,
  - unknown target renders as disabled/informational,
  - accessible names describe the destination.
- Perf only if prefetch changes:
  - admin prefetch budget remains under existing limits.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/ADMIN_CACHE.md` only if usage summaries get cached
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Clicking a real usage entry opens the referenced admin editor/list route.
2. Unknown/unavailable targets do not appear clickable.
3. Usage loading and errors are visible without blocking metadata editing.
