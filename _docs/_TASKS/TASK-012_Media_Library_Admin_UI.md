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
```

---

## Sub-Tasks

### TASK-012-1: Media list and upload UI

**Status:** To Do

- Drag and drop upload.
- Filter by type (image, pdf, other).
- Pagination and search.

Example upload call:

```ts
const form = new FormData();
form.append("file", file);
await fetch("/admin/api/media", { method: "POST", body: form });
```

---

### TASK-012-2: Media detail and metadata

**Status:** To Do

- Edit title, alt, caption.
- Copy URL.
- Delete asset with confirm dialog.

---

## Testing Requirements

- [ ] Upload returns new media item in list.
- [ ] Metadata edits persist.
- [ ] Delete removes asset from list.

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
