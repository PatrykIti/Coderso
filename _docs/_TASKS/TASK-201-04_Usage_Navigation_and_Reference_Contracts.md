# TASK-201-04: Usage Navigation and Reference Contracts
# FileName: TASK-201-04_Usage_Navigation_and_Reference_Contracts.md

**Priority:** High
**Category:** CMS/Media + Admin/API + Navigation
**Estimated Effort:** Large
**Dependencies:** TASK-201
**Status:** To Do

---

## Overview

Replace the hard-coded `Usage` examples in `MediaDetailsDrawer` with a real
bounded usage read model and navigable admin links where targets are known. This
wave closes `BUG-6` without pretending unknown references are clickable.

## Sub-Tasks

- `TASK-201-04-01_Media_Usage_Read_Model.md`
- `TASK-201-04-02_Usage_Entry_Navigation_and_Affordance_Fallback.md`

## Scope

- Add a bounded usage query that identifies where a media asset is referenced.
- Cover existing references in pages, content entries, posts, and commerce
  media ids where current schemas expose them.
- Return summaries only: type, title, context, target id/slug, and safe admin
  href data.
- Render usage entries as `AdminLink` only when a destination is resolvable.
- Render non-clickable summaries/tooltips when the target cannot be navigated.

Out of scope:

- a full inverted media-reference index table unless scan-based lookup cannot
  stay bounded,
- public usage lookup endpoints,
- editing references from the usage list,
- scanning binary files or generated runtime HTML.

## Files to Change

- `core/services/media/mediaService.ts`
- add `core/services/media/mediaUsageService.ts`
- `core/server/routes/mediaRoutes.ts`
- `core/server/validation/mediaSchemas.ts` only if query params are added
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/shared/AdminLink.tsx` for usage reference only
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts` only if usage links should prefetch
- `tests/unit/media/mediaService.test.ts`
- add `tests/unit/media/mediaUsageService.test.ts`
- `tests/integration/routes/media.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/ui/media-details.test.tsx`

## Security Contract

- Visibility: internal admin read endpoint, for example `GET /media/:id/usage`
  if implemented as a route.
- Auth model: authenticated admin session/API key.
- RBAC: `media:read` plus only the minimal content read capability already used
  by the shared admin stack for referenced resources.
- CSRF: not applicable for read-only usage lookup.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: route params/query must be strict and bounded.
- Anti-abuse:
  - return summary data only, never raw page/post/entry payloads,
  - cap result counts per resource family,
  - avoid exposing draft/private content beyond what the admin user can read,
  - unresolved targets must not produce broken clickable links.

## Testing Requirements

- Bun:
  - usage service finds media IDs in current supported owners,
  - usage service caps results and handles malformed JSON safely,
  - route registration and permission coverage for usage endpoint.
- Vitest:
  - media client fetches usage summaries,
  - drawer renders navigable links for resolvable usage,
  - drawer renders non-clickable disabled/fallback state for unresolved usage.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Usage entries are backed by real references, not static examples.
2. Clickable entries navigate through canonical admin helpers.
3. Unresolvable entries no longer look clickable.
