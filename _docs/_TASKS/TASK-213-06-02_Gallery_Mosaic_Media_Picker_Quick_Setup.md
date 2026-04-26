# TASK-213-06-02: Gallery Mosaic Media Picker Quick Setup
# FileName: TASK-213-06-02_Gallery_Mosaic_Media_Picker_Quick_Setup.md

**Priority:** Medium
**Category:** Media Widgets + Admin/UI + Widget Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-213-06, TASK-206
**Status:** To Do

---

## Overview

Fix the Gallery Mosaic media quick-setup gap from the per-widget audit.

Business outcome: editors can create a useful mosaic from the Wizard without
typing raw media IDs or pasting URLs.

Technical contract: reuse `MediaPicker` and the existing media cache/client
from `TASK-206`. Gallery Mosaic currently stores `image`/`video` URL strings and
renders them publicly, so picker output must normalize into a public-runtime
safe shape before persistence.

Current repo verification:

- `core/admin/ui/media/MediaPicker.tsx` and `listMediaCached` already provide a
  shared media selection/cache seam.
- `core/widgets/core/galleryMosaic.tsx` currently stores `image`/`video` URL
  strings and renders them directly. Picker work must not blindly persist media
  ids into those URL fields.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/admin/ui/media/MediaPicker.tsx` as the existing media picker seam
- `core/admin/services/mediaClient.ts` for existing media cache reads only if
  Gallery Mosaic needs to resolve selected media records
- `core/widgets/core/galleryMosaic.tsx`
- related Gallery Mosaic normalizer/schema/defaults when the storage contract
  changes
- `tests/vitest/ui/media-picker.test.tsx` only if shared picker/cache behavior
  changes
- `tests/vitest/widgets/galleryMosaic.test.tsx`

## Implementation Direction

First choose the storage contract, then wire the picker.

Gallery media:

```tsx
<MediaPicker
  value={normalized.items.map((item) => item.mediaId).filter(Boolean)}
  multiple
  maxItems={galleryMosaicItemMax}
  onChange={(mediaIds) => updateItemsFromMediaIds(mediaIds)}
/>
```

For Gallery Mosaic, first choose the storage contract:

1. Add schema-owned `mediaId` fields and a safe runtime/public URL resolver; or
2. Map selected records to sanitized public URLs through the existing media
   client/cache.

Do not store full media records, private delivery URLs, or unresolved picker ids
inside `image`/`video` fields.

## Security Contract

- Visibility: internal admin editors; normalized output may render publicly.
- Auth model: existing admin session/API-key reads for media.
- RBAC: existing media/content read permissions.
- CSRF: no write route changes unless picker changes introduce writes.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation:
  - new Gallery Mosaic structured fields must be added to owner schema and
    normalizer before editor exposure.
- Anti-abuse:
  - no private media URLs, secrets, provider keys, form nonces, or unsanitized
    media payloads in persisted widget data;
  - public runtime must not render unsafe URLs from picked media.

## Testing Requirements

- Widget suites cover:
  - Gallery Mosaic media picker output normalization;
  - Gallery Mosaic public rendering resolves picked media safely or persists
    sanitized public URLs without private delivery data;
- Manual Playwright:
  - add Gallery Mosaic and pick media without raw IDs;
  - verify the mosaic renders picked media after save/reopen;
  - verify picker cache behavior is not duplicated if shared media cache is
    touched.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if media picker cache
  behavior changes.

## Acceptance Criteria

1. Gallery Mosaic quick setup can pick media without raw ID/URL typing.
2. Picker output is schema-owned, normalized, and public-runtime safe.
3. Shared media picker/cache behavior is reused rather than duplicated.
