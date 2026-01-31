# TASK-043-04: Content Entry Metadata UI Wiring
# FileName: TASK-043-04_Content_Entry_Metadata_UI_Wiring.md

**Priority:** High  
**Category:** Admin / UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-03  
**Status:** To Do

---

## Overview

Wire Entry Editor metadata panel to the new metadata API and remove all mock data.

---

## UI Changes

### EntryMetadataPanel
- Replace mock author with `entry.author` (name/email fallback).
- Bind tags list to real `tags`.
- Allow add/remove tags (max 20).
- SEO description should be editable and persisted via `/metadata`.
- Publish date + status should update via `/metadata` (scheduled flow).

### EntryEditor
- Load metadata fields from API (`tags`, `seo`, `scheduledAt`).
- Add explicit “Save metadata” action or integrate into existing save flow.
- Ensure saving metadata does not force schema validation for `data`.
- Provide loading/error feedback on metadata updates.

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/admin/ui/entries/EntryEditor.tsx` | Manage metadata state + call `updateEntryMetadata` |
| `core/admin/ui/entries/EntryMetadataPanel.tsx` | Render real author/tags/seo + callbacks |
| `core/admin/services/entriesClient.ts` | Use `updateEntryMetadata()` |
| `tests/unit/ui/entry-metadata.test.tsx` | New test: renders author/tags + triggers save |

---

## UX Notes

- If status is `scheduled`, show scheduled date and disable Publish button (or show “Scheduled” state).
- Tags input should trim and dedupe.
- Author card should show “Unknown author” when no author is linked.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (if UI wiring adds new fields to response expectations).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-ui.md`

