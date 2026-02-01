# TASK-048-03: Media Field UX & Storage Integration
# FileName: TASK-048-03_Media_Field_UX_and_Storage_Integration.md

**Priority:** 🟡 Medium  
**Category:** CMS/Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-005 (Media Storage), TASK-048-01  
**Status:** ⏳ **To Do** (2026-02-01)

---

## Overview

Allow non‑technical users to pick media inside entries:
- Single or multiple assets
- Allowed file types & max items
- Reusable media picker (from Media Library)

---

## Data Model (Entry Data)

Single media:
```json
{ "hero-image": "media-id-123" }
```

Multi media:
```json
{ "gallery": ["media-id-1", "media-id-2"] }
```

Schema meta:
```json
{
  "type": "string",
  "xFieldType": "media",
  "xFieldConfig": { "multiple": true, "accept": ["image/*"] }
}
```

---

## Implementation Checklist

### Admin UI
| File | Change |
|------|--------|
| `core/admin/ui/entries/FieldRenderer.tsx` | replace placeholder with picker |
| `core/admin/ui/media/MediaPicker.tsx` | new reusable picker |
| `core/admin/ui/media/MediaGrid.tsx` | reuse existing card |

### Backend validation
| File | Change |
|------|--------|
| `core/services/content/validation.ts` | allow media string/array |
| `core/services/content/entryService.ts` | validate media IDs exist |

---

## UX Details

Picker shows:
- thumbnail preview
- file name + size
- remove / replace actions

---

## Testing Requirements

- Unit: schema mapping for media config
- Unit: validate media IDs exist
- UI: media picker renders preview

---

## Documentation Updates Required

Update:
- `_docs/MEDIA_SPEC.md`
- `_docs/CONTENT_FIELDS.md`

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-media-field-picker.md` and link TASK-048-03.
