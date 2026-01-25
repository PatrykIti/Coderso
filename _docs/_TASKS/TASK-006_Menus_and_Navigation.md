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
  treeBuilder.ts
core/server/routes/
  menuRoutes.ts
core/server/validation/
  menuSchemas.ts
admin/ui/menus/
  MenuList.tsx
  MenuEditor.tsx

tests/unit/menus/
  menuService.test.ts
```

---

## Sub-Tasks

### TASK-006-01_Menu_schema

**Status:** To Do

Tables:
- `menus` (id, name, location)
- `menu_items` (id, menu_id, label, href, page_id, order_index, parent_id)

Constraints:
- `menus.name` unique.
- `menus.location` unique when set (e.g. `primary`, `footer`).
- `menu_items.menu_id` FK with cascade delete.
- `menu_items.parent_id` must reference item in the same menu.
- `menu_items` must have exactly one of `href` or `page_id`.
- `order_index` integer, stable ordering inside same parent.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | menus + menu_items tables |
| `core/db/migrations/*` | migration files |

---

### TASK-006-02_Tree_builder_and_service

**Status:** To Do

Example tree builder:

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

Rules:
- Detect cycles and reject invalid trees.
- Orphaned items (parent missing) become root items.
- Preserve relative order when `order_index` ties.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/menus/menuService.ts` | CRUD + reorder |
| `core/services/menus/treeBuilder.ts` | nested tree helper |

---

### TASK-006-03_Admin_API_endpoints

**Status:** To Do

Endpoints:
- `GET /menus`
- `POST /menus`
- `GET /menus/:id`
- `PATCH /menus/:id`
- `PUT /menus/:id/items`
- `DELETE /menus/:id`

Validation:
- `items` is full replace; missing items are deleted.
- Reject cycles and invalid parent references.
- Ensure `href` or `page_id` exists, not both.

Example payload (update items):

```json
{
  "items": [
    { "id": "1", "label": "Home", "href": "/", "orderIndex": 0, "parentId": null },
    { "id": "2", "label": "About", "href": "/about", "orderIndex": 1, "parentId": null }
  ]
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/menuRoutes.ts` | CRUD + reorder |
| `core/server/validation/menuSchemas.ts` | request validation |

---

### TASK-006-04_Admin_UI

**Status:** To Do

UI:
- List menus.
- Edit menu items (drag reorder, nesting).
- Save changes via API.
- Inline validation (missing label, invalid link).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/menus/MenuList.tsx` | list view |
| `admin/ui/menus/MenuEditor.tsx` | drag and drop editor |

---

## Testing Requirements

- [ ] `tests/unit/menus/menuService.test.ts` builds correct tree.
- [ ] `tests/unit/menus/menuService.test.ts` rejects cycles.
- [ ] `tests/integration/routes/menus.test.ts` covers CRUD endpoints.
- [ ] `tests/integration/routes/menus.test.ts` rejects invalid payload.
- [ ] UI test verifies reorder payload.

---

## New Files to Create

- `core/services/menus/menuService.ts`
- `core/services/menus/treeBuilder.ts`
- `core/server/routes/menuRoutes.ts`
- `core/server/validation/menuSchemas.ts`
- `admin/ui/menus/MenuList.tsx`
- `admin/ui/menus/MenuEditor.tsx`
- `tests/unit/menus/menuService.test.ts`
- `tests/integration/routes/menus.test.ts`

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
