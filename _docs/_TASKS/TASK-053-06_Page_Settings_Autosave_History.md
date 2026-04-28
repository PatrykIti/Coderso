# TASK-053-06: Page Settings Autosave + History
# FileName: TASK-053-06_Page_Settings_Autosave_History.md

**Priority:** Medium  
**Category:** CMS/Pages + Admin/UI + Data  
**Estimated Effort:** Large  
**Dependencies:** TASK-002-02, TASK-052-05  
**Status:** Done (2026-03-06)  

---

## Overview

Introduce WordPress-like autosave behavior for **Page Settings** changes. When the settings drawer is closed with unsaved changes, create an autosave snapshot and surface it in history with a clear label ("Autosave" / "Not saved").

---

## Decisions

- Keep **only 1 autosave** per page (overwrite the previous autosave).
- Add a **History** button in the Page Editor top bar, aligned to the right of the row that contains Page Settings.

---

## Scope

1. **Detect unsaved changes** in Page Settings (title, slug, template, layout, showInNav, revisionRetention).
2. **Autosave on close** (or debounce) into a dedicated autosave record.
3. **History entry**: list autosave in history with a distinct label (not a publish revision).
4. **Restore/Discard**: allow restoring autosave or discarding it.
5. **Retention**: keep only the latest autosave per page.

## Security Contract

- **Visibility:** internal (`/admin/api/pages/*`)
- **Auth model:** authenticated admin session / admin API key with `content:read` / `content:write`
- **Rate-limit bucket:** `admin_read` / `admin_write`
- **Anti-abuse controls:** no public write surface; CSRF on mutating routes; no nonce/HMAC/reCAPTCHA required

---

## Proposed Data Model

Option A (preferred): extend `page_revisions` with a kind field.

```ts
page_revisions: {
  id,
  page_id,
  version,
  data,
  created_at,
  created_by,
  kind: "publish" | "autosave";
}
```

- `kind="publish"` for normal publish revisions.
- `kind="autosave"` for unsaved settings snapshots.
- Keep only the latest autosave per page.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | update | add `kind` to `page_revisions` (migration required) |
| `core/services/pages/revisionService.ts` | update | support autosave kind + overwrite last autosave |
| `core/services/pages/pageService.ts` | update | create autosave revision from settings changes |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | update | track dirty state, trigger autosave on close |
| `core/admin/ui/pages/PageEditor.tsx` | update | add History button (top bar, right side) |
| `core/admin/ui/pages/PageRevisionDrawer.tsx` | new | history drawer for page revisions + autosave entry |
| `core/admin/ui/pages/PageRevisionDrawer.tsx` | new | allow restore/discard autosave |
| `tests/unit/services/pageRevisionAutosave.test.ts` | new | verify autosave creation + overwrite behavior |
| `tests/unit/ui/page-revision-drawer.test.tsx` | new | autosave label and restore flows |

---

## Acceptance Criteria

1. Closing Page Settings with unsaved changes creates an autosave snapshot.
2. Autosaves are clearly labeled in history and are not treated as published revisions.
3. Only the most recent autosave per page is kept.
4. Users can restore or discard autosave changes.
5. History button is visible in the Page Editor top bar (right-aligned in the settings row).

---

## Testing Requirements

- `bun test tests/unit/services/pageRevisionAutosave.test.ts`
- `bun test tests/unit/ui/page-revision-drawer.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (autosave vs publish revisions)
- `_docs/CMS_SPEC.md` (autosave behavior + history labels)
