# TASK-012: Media Library Admin UI (Functional)
# FileName: TASK-012_Media_Library_Admin_UI.md

**Priority:** Medium
**Category:** CMS/Media
**Estimated Effort:** Medium
**Dependencies:** TASK-005, TASK-024, TASK-006-03
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
core/admin/ui/media/
  MediaLibrary.tsx
  MediaGrid.tsx
  MediaDetail.tsx
  UploadDropzone.tsx

tests/unit/mediaUi/
  mediaLibrary.test.tsx
```

## Commands (if needed)

No new dependencies.

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
| `core/admin/ui/media/MediaLibrary.tsx` | list + upload |
| `core/admin/ui/media/UploadDropzone.tsx` | drag and drop |

Upload sketch:

```tsx
<UploadDropzone
  onUpload={(files) => uploadFiles(files)}
/>
```

Upload helper sketch:

```ts
async function uploadFiles(files: File[]) {
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    await fetch("/admin/api/media", { method: "POST", body: form });
  }
}
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
| `core/admin/ui/media/MediaDetail.tsx` | metadata editor |
| `core/admin/ui/media/MediaGrid.tsx` | grid + select |

Metadata sketch:

```tsx
<MediaDetail
  item={selected}
  onSave={(next) => updateMedia(selected.id, next)}
/>
```

Grid sketch:

```tsx
<MediaGrid items={items} onSelect={setSelected} />
```

Metadata update sketch:

```ts
await fetch(`/admin/api/media/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
  body: JSON.stringify({ title, alt, caption }),
});
```

---

## Testing Requirements

- [ ] `tests/unit/mediaUi/mediaLibrary.test.tsx` renders list and upload.
- [ ] `tests/integration/ui/media.test.tsx` updates metadata and deletes.
- [ ] `tests/integration/ui/media.test.tsx` shows error for oversized file.

---

## New Files to Create

- `core/admin/ui/media/MediaLibrary.tsx`
- `core/admin/ui/media/MediaGrid.tsx`
- `core/admin/ui/media/MediaDetail.tsx`
- `core/admin/ui/media/UploadDropzone.tsx`
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
