# TASK-487-03: Riders — Wire Dead Tags Input + Surface Entry SEO Fields
# FileName: TASK-487-03-Riders-Tags-And-Seo-Surface.md

**Parent Task:** TASK-487
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Two small, independent fixes adjacent to the entry editor surface, batched here
because they touch the same files as the revision work and use existing,
already-validated service contracts (no new endpoints).

1. **Dead Tags input** — `EntryCreateDrawer.tsx:190` renders a Tags `<Input>`
   with no `value`/`onChange`; typed tags are silently discarded. Bind it to
   local state and persist via the existing `updateEntryMetadata` contract
   (`entriesClient.ts:354`), which already accepts `tags: string[]`.
2. **SEO surface gap** — `updateEntryMetadata`
   (`entryService.ts:884`/`:947`) already persists SEO `title`, `canonicalUrl`,
   and `robots`, but the metadata panel only surfaces `description`
   (`EntryEditor.tsx:933` → `EntryMetadataPanel`). Surface the three missing
   fields so editors can actually set them.

These riders are lower priority than 01/02 and can ship independently; they do
not block or depend on the revision work.

---

## Sub-Tasks

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| TASK-487-03-L01 | Wire the dead Tags input in `EntryCreateDrawer` to entry metadata | Small | ⏳ To Do |
| TASK-487-03-L02 | Surface SEO `title` / `canonicalUrl` / `robots` in the entry metadata panel | Small | ⏳ To Do |

---

## Dependencies

- None. Both leaves use the existing `PATCH /content/:type/entries/:id/metadata`
  contract; no schema or endpoint changes.

---

## Testing Requirements

- Vitest lane (Bun-free): `tests/vitest/ui/content-entry-editor.test.tsx` and/or
  `tests/vitest/ui/content-entries.test.tsx` — assert tags round-trip on create
  and SEO field round-trip on metadata save.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- No DB schema change → no migration artifacts.
