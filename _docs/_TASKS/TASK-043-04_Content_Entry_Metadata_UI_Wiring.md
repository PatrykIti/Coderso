# TASK-043-04: Content Entry Metadata UI Wiring
# FileName: TASK-043-04_Content_Entry_Metadata_UI_Wiring.md

**Priority:** High  
**Category:** Admin / UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-03  
**Status:** Done (2026-01-31)

---

## Overview

Wire the Entry Editor metadata panel to the new metadata API. Remove all mock data and make the panel fully functional.

---

## UI Alignment (must match current UI)

**Entry Editor** (`/admin/entries/:type/:id`)
- Right sidebar panel with publishing/status, SEO snippet, tags, and author card.
- Mobile: metadata drawer in `Sheet` (already present).

---

## Behavior Requirements

- **Author card** shows actual entry author (name/email).  
  If missing, display “Unknown author”.
- **Tags** editable: add/remove with chip UI.
  - Enter/Comma adds tag, Backspace removes last tag.
  - Deduplicate and trim.
- **SEO description** persists to `seo_documents` (entry target).
- **Status + scheduledAt** persist to metadata endpoint.
  - If status = `scheduled`, show date input.
  - Scheduled entries are not auto-published (v1).
- Metadata updates do **not** revalidate entry `data`.

---

## File-by-File Plan

### 1) `core/admin/services/entriesClient.ts`
Add:
```ts
export type EntryMetadataPayload = {
  status?: "draft" | "published" | "scheduled" | "archived";
  scheduledAt?: string | null;
  tags?: string[];
  seo?: { title?: string; description?: string; canonicalUrl?: string; robots?: string };
};

export async function updateEntryMetadata(
  typeSlug: string,
  id: string,
  payload: EntryMetadataPayload
) { /* PATCH /metadata */ }
```

### 2) `core/admin/ui/entries/EntryEditor.tsx`
- Add metadata state:
  - `tags`, `scheduledAt`, `seoDescription`, `author`
- Fetch metadata from `getEntry()` and set local state.
- Add `handleMetadataSave()` calling `updateEntryMetadata()`.
- Update UI to reflect scheduled status.

### 3) `core/admin/ui/entries/EntryMetadataPanel.tsx`
- Replace mock author block with props.
- Replace mock tags with real tag list + input handlers.
- Ensure SEO description is controlled by parent.

---

## Example: Tag Input Logic

```ts
const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key !== "Enter" && event.key !== ",") return;
  event.preventDefault();
  const value = event.currentTarget.value.trim();
  if (!value) return;
  onTagsChange?.([...tags, value].slice(0, 20));
  event.currentTarget.value = "";
};
```

---

## Testing Requirements

- `tests/unit/ui/entry-metadata.test.tsx`
  - renders author card from real data
  - adds/removes tags
  - triggers `updateEntryMetadata` on save
- `tests/unit/admin/entriesClient.test.ts`
  - metadata endpoint call uses PATCH + CSRF

---

## Documentation Updates Required

- `_docs/CMS_API.md` if UI expects new response fields.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-ui.md`
