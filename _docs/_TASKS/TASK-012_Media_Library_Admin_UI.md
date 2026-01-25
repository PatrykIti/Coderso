# TASK-012: Media Library Admin UI
# FileName: TASK-012_Media_Library_Admin_UI.md

**Priority:** Medium
**Category:** CMS/Media
**Estimated Effort:** Medium
**Dependencies:** TASK-005
**Status:** To Do

---

## Overview

Build the media library UI for uploads, browsing, and metadata edits.

**Goals:**
- Upload and list media assets.
- Edit metadata (title, alt, caption).
- Delete assets.

---

## Architecture

```
admin/ui/media/
  MediaLibrary.tsx
  MediaGrid.tsx
  MediaDetail.tsx
  UploadDropzone.tsx

tests/unit/mediaUi/
  mediaLibrary.test.tsx
```

---

## Sub-Tasks

### TASK-012-01_Media_list_and_upload_UI

**Status:** To Do

- Drag and drop upload.
- Filter by type (image, pdf, other).
- Pagination and search.
- Show upload progress and error state.

Example upload call:

```ts
const form = new FormData();
form.append("file", file);
await fetch("/admin/api/media", { method: "POST", body: form });
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/media/MediaLibrary.tsx` | list + upload |
| `admin/ui/media/UploadDropzone.tsx` | drag and drop |

Upload sketch:

```tsx
<UploadDropzone
  onUpload={(files) => uploadFiles(files)}
/>
```

---

### TASK-012-02_Media_detail_and_metadata

**Status:** To Do

- Edit title, alt, caption.
- Copy URL.
- Delete asset with confirm dialog.
- Preview image or file icon.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/media/MediaDetail.tsx` | metadata editor |
| `admin/ui/media/MediaGrid.tsx` | grid + select |

Metadata sketch:

```tsx
<MediaDetail
  item={selected}
  onSave={(next) => updateMedia(selected.id, next)}
/>
```

---

## Testing Requirements

- [ ] `tests/unit/mediaUi/mediaLibrary.test.tsx` renders list and upload.
- [ ] `tests/integration/ui/media.test.tsx` updates metadata and deletes.
- [ ] `tests/integration/ui/media.test.tsx` shows error for oversized file.

---

## New Files to Create

- `admin/ui/media/MediaLibrary.tsx`
- `admin/ui/media/MediaGrid.tsx`
- `admin/ui/media/MediaDetail.tsx`
- `admin/ui/media/UploadDropzone.tsx`
- `tests/unit/mediaUi/mediaLibrary.test.tsx`
- `tests/integration/ui/media.test.tsx`

---

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` (UI behavior if needed).
- `_docs/CMS_API.md` (media endpoints usage notes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-library-ui.md`
- Notes: media library UI.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
