# TASK-049-05: Widget Library UI Wiring
# FileName: TASK-049-05_Widget_Library_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-049-03, TASK-049-04, TASK-006-29  
**Status:** Done (2026-02-04)

---

## Overview

Replace all mock data in **Widgets** section with real API data.

---

## UI Requirements

1. **List widgets**
   - Load catalog via `GET /widgets`.
   - Show core + template widgets.
   - Category counts use real data.

2. **Favorites**
   - Toggle stored in `user_settings.widgets.favorites`.
   - Persist on change; show immediately.

3. **Details drawer**
   - Populate with real widget metadata.
   - Show source (core / template).
   - **Template fields are editable inline** (name, description, category, status).
   - For core widgets: read-only fields (no edits).
   - For templates: show status + last updated.
   - Show a small visual preview (same preview tile used in list).

   **Details drawer layout (visual + user‑friendly):**
   - **Header row:** widget name + category badge + status pill + close.
   - **Preview card:** same preview tile as list, larger (16:9).
   - **Editable fields (templates only):**
     - Name (required)
     - Description (textarea)
     - Category (select)
     - Status (draft/published)
   - **Meta (read‑only):** source, last updated, slug.
   - **Primary actions:** `Save changes` + `Insert`.
   - **Secondary:** `Cancel`, `Delete template` (only for templates).

4. **Insert**
   - For **core widget**: allow quick insert into a page.
   - For **template widget**: insert template blocks into page.

   Suggested flow:
   - “Insert” opens modal: pick a target page.
   - UI fetches page by ID → append blocks → `PATCH /pages/:id`.
   - If insert succeeds → toast “Widget inserted”.

5. **Custom Widget**
   - `WidgetCreateDialog` submits to `POST /widgets/templates`.
   - On success, refresh list and open details.

6. **UX polish**
   - Use clear CTAs: `Insert`, `Edit Template`, `Save`, `Cancel`.
   - Show empty states with explanation + action.
   - Validate inline (required name, unique slug hints).

---

## UX Layout Reference (based on current dashboard style)

### Widget Library (main view)
- **Left column:** category list (same visual style as Filters in other pages).
- **Right column:** grid/list cards.
- **Top bar:** search, view toggle, “Custom Widget”.
- **Footer:** pagination + count.

### Widget Details Drawer
- Matches `MediaDetailsDrawer` visual hierarchy.
- Consistent spacing + section headers.
- Uses the same `Sheet` component with scrollable body.

### Insert Dialog
- `Select Page` dropdown + recent pages list.
- `Insert as new section` vs `Insert inside current page` (if opened from Page Builder).
- `Cancel` / `Insert` CTA.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/widgetClient.ts` | create | `/widgets` + template CRUD |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | wire list/search/favorites | replace local state |
| `core/admin/ui/widgets/WidgetCreateDialog.tsx` | connect create | call API |
| `core/admin/ui/widgets/WidgetDetailsDrawer.tsx` | show real data | add source/status |
| `core/admin/ui/widgets/WidgetInsertDialog.tsx` | create | select page + insert |
| `core/admin/services/pageClient.ts` | add `getPage` + `updatePage` helpers | reuse existing endpoints |

---

## Testing Requirements

- `tests/unit/admin/widgetClient.test.ts`
- `tests/integration/ui/widgets-library.test.tsx`
  - list renders
  - toggle favorite persists
  - create template calls API

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widgets-library-ui-wiring.md`
