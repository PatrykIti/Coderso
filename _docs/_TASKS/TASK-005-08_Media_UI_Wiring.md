# TASK-005-08: Media UI Wiring (Admin)
# FileName: TASK-005-08_Media_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005-07, TASK-012  
**Status:** Done (2026-01-28)  

---

## Overview

Wire Media Library UI to the live media API. Replace placeholders with real API calls for list, upload, update metadata, and delete.

## UI Screens In Scope

- `core/admin/ui/media/MediaLibraryPage.tsx`
- `core/admin/ui/media/MediaDetailsPanel.tsx`
- `core/admin/ui/media/MediaUploadDialog.tsx`

## Admin Client (new)

Create `core/admin/services/mediaClient.ts`:

```ts
export async function listMedia() {}
export async function uploadMedia(file: File) {}
export async function updateMedia(id: string, payload: { alt?: string; title?: string; caption?: string }) {}
export async function deleteMedia(id: string) {}
```

## Wiring Steps

1. Replace mock media list with `listMedia()`.
2. Hook upload dialog to `uploadMedia()`.
3. Update metadata panel to call `updateMedia()`.
4. Delete action calls `deleteMedia()` and refreshes list.

## Tests

- `tests/unit/admin/mediaClient.test.ts`
- Update existing media UI tests to account for loading state.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-ui-wiring.md`
