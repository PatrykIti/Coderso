# TASK-049: Widget Library — Core + Templates + Favorites
# FileName: TASK-049_Widget_Library_Core_and_Templates.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-009, TASK-010, TASK-002, TASK-004, TASK-020  
**Status:** To Do

---

## Overview

Make the **Widgets** section fully functional (no placeholders):
- Core widgets are listed from the registry.
- Custom widget templates can be created and edited.
- Favorites persist per user.
- Details drawer uses real data.
- “Insert” actions add widgets into pages (via API).

This task is split into DB, services, API, and UI wiring.

**UX Goal:** make this workflow **visual and user-friendly** (WordPress-like but clearer).
- Use real previews (where possible) instead of text-only metadata.
- Keep editing inline in drawers (no hidden “advanced-only” paths).
- Every action must be obvious and reversible (Cancel / Save).

---

## Architecture (Target)

```
core/db/schema.ts
└─ widget_templates (custom templates built in UI)

core/services/widgets/
├─ widgetTemplateService.ts     # CRUD templates + validation
├─ widgetCatalogService.ts      # merge core widgets + templates
└─ widgetInsertService.ts       # add widgets to page data

core/server/routes/
└─ widgetRoutes.ts              # /widgets, /widgets/templates

core/admin/services/
└─ widgetClient.ts              # Admin API client

core/admin/ui/widgets/
├─ WidgetLibraryPage.tsx        # real list + favorites + insert
├─ WidgetCreateDialog.tsx       # create template
├─ WidgetDetailsDrawer.tsx      # real details + insert
└─ WidgetTemplateEditorPage.tsx # edit template blocks
```

---

## Sub-Tasks

### TASK-049-01: Widget Templates DB Schema
Add `widget_templates` table with JSON blocks, status, and metadata.

### TASK-049-02: Widget Templates Service
CRUD for templates + validation with widget schema.

### TASK-049-03: Widget Catalog Service + API Routes
Expose `/widgets` (core + templates) and `/widgets/templates` CRUD.

### TASK-049-04: Widget Favorites (User Settings)
Persist favorites using `user_settings` key `widgets.favorites`.

### TASK-049-05: Widget Library UI Wiring
Replace mocks, wire search/filter/favorites/details/insert.

### TASK-049-06: Widget Template Editor UI
Edit template blocks using existing Page Builder UI.

---

## Testing Requirements

- Unit tests for services (templates CRUD + catalog list).
- API tests for widget routes.
- UI integration tests for library wiring and template editor.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (add “Custom Templates” + favorites + insert flow)
- `_docs/ARCHITECTURE.md` (update widget runtime notes)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widgets-library-core-and-templates.md`
