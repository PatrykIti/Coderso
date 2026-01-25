# TASK-006: Menus and Navigation
# FileName: TASK-006_Menus_and_Navigation.md

**Priority:** Medium
**Category:** CMS/Menus
**Estimated Effort:** Medium
**Dependencies:** TASK-001, TASK-004
**Status:** To Do

---

## Overview

Implement menu storage, nesting, and admin API endpoints. Menus are used by
navigation and footer widgets.

**Goals:**
- CRUD menus and menu items.
- Nested items with stable ordering.
- Admin UI for editing menus.

---

## Architecture

```
core/db/schema.ts
core/services/menus/
  menuService.ts
core/server/routes/
  menuRoutes.ts
admin/ui/menus/
  MenuList.tsx
  MenuEditor.tsx
```

---

## Sub-Tasks

### TASK-006-01_Menu_schema_and_service

**Status:** To Do

Example (service helper):

```ts
function buildTree(items) {
  const byId = new Map(items.map(i => [i.id, { ...i, children: [] }]));
  const roots = [];
  for (const item of items) {
    const node = byId.get(item.id);
    if (item.parentId) byId.get(item.parentId)?.children.push(node);
    else roots.push(node);
  }
  return roots.sort((a, b) => a.orderIndex - b.orderIndex);
}
```

---

### TASK-006-02_Admin_API_endpoints

**Status:** To Do

Endpoints:
- `GET /menus`
- `POST /menus`
- `GET /menus/:id`
- `PATCH /menus/:id`
- `PUT /menus/:id/items`
- `DELETE /menus/:id`

Example payload (update items):

```json
{
  "items": [
    { "id": "1", "label": "Home", "href": "/", "orderIndex": 0, "parentId": null },
    { "id": "2", "label": "About", "href": "/about", "orderIndex": 1, "parentId": null }
  ]
}
```

---

### TASK-006-03_Admin_UI

**Status:** To Do

UI:
- list menus
- edit menu items (drag reorder, nesting)
- save changes via API

---

## Testing Requirements

- [ ] Create menu and items.
- [ ] Reorder and nesting preserved.
- [ ] API returns tree structure.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (menu endpoints behavior).
- `_docs/DATA_MODEL.md` (if schema changes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-menus-and-navigation.md`
- Notes: menu schema, API, admin UI.

---

## Additional Docs

- `_docs/WIDGETS.md` (navigation widget integration).
