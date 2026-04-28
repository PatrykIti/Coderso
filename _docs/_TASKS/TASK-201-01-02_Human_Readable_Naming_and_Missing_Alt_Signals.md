# TASK-201-01-02: Human Readable Naming and Missing Alt Signals
# FileName: TASK-201-01-02_Human_Readable_Naming_and_Missing_Alt_Signals.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-201-01
**Status:** Done (2026-04-23)

---

## Overview

Make Media cards and details identify assets by readable names instead of
storage UUIDs, and surface missing alt text for image assets. This leaf closes
`UX-1` and `UX-2` while preserving the current storage key and URL contracts.

This leaf does not make `Original File Name` editable. It uses `originalName` as
a read-only identity source for display-name fallback, while `title` owns
user-facing rename behavior.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/media/MediaCard.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/utils.ts`
- `core/admin/ui/media/types.ts`
- `core/services/media/mediaService.ts` if upload title defaults are owned
  server-side
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-details.test.tsx`
- `tests/unit/media/mediaService.test.ts` if server-side defaulting changes

## Security Contract

- Visibility: internal admin UI plus existing media metadata responses.
- Auth model: unchanged.
- RBAC: `media:read` for display, `media:write` only if title defaulting is
  persisted during upload/update.
- CSRF: unchanged for any upload/update mutation.
- Rate-limit bucket: existing `admin_read` / `admin_write`.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - no derived display name may include secret-bearing query strings,
  - alt warnings apply only to image MIME/kind assets,
  - technical IDs can remain available as collapsed/read-only metadata, not as
    the primary name,
  - `originalName` remains read-only unless a separate route/service contract is
    opened by a future task.

## Testing Requirements

- Vitest:
  - display name precedence: non-empty title, original name, storage filename,
    fallback `asset`,
  - original name appears as read-only supporting metadata and is not editable in
    this leaf,
  - image without alt renders an accessibility warning,
  - non-image without alt does not render the warning,
  - card truncation still renders stable accessible text.
- Bun:
  - upload title defaulting if owned by `mediaService`.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Media cards/details no longer primarily show UUID-like names when readable
   metadata exists.
2. New uploads get a readable title default without changing storage keys.
3. Missing image alt text is visible and regression-covered.
