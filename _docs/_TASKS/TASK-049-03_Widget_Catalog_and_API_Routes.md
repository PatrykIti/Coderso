# TASK-049-03: Widget Catalog + API Routes
# FileName: TASK-049-03_Widget_Catalog_and_API_Routes.md

**Priority:** High  
**Category:** CMS/Widgets (API)  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-02  
**Status:** Done (2026-02-04)

---

## Overview

Expose a **widget catalog** API:
- Core widgets (registry)
- Custom templates (DB)

Provide CRUD for templates.

---

## API Endpoints

### GET `/widgets`
Returns combined list (core + templates).

```json
{
  "items": [
    {
      "id": "hero",
      "source": "core",
      "name": "Hero",
      "description": "Primary hero layout",
      "category": "layout",
      "variants": ["split", "centered"],
      "status": "published"
    },
    {
      "id": "tmpl_123",
      "source": "template",
      "name": "Homepage Hero A",
      "description": "Custom hero stack",
      "category": "layout",
      "variants": ["default"],
      "status": "draft"
    }
  ]
}
```

### GET `/widgets/templates`
List templates only.

### POST `/widgets/templates`
Create a new template.

### GET `/widgets/templates/:id`
Get template detail (includes blocks).

### PATCH `/widgets/templates/:id`
Update metadata or blocks.

### DELETE `/widgets/templates/:id`
Delete template.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/widgetRoutes.ts` | create routes | register in `routes/index.ts` |
| `core/server/validation/widgetSchemas.ts` | create | validate payload |
| `core/services/widgets/widgetCatalogService.ts` | create | merge core + templates |
| `core/services/widgets/widgetTemplateService.ts` | use | CRUD |

---

## Validation Rules

```ts
export const widgetTemplateCreateSchema = {
  type: "object",
  required: ["name", "category"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    category: { enum: ["layout", "content", "forms", "navigation", "media"] },
    status: { enum: ["draft", "published"] },
    blocks: { type: "array", items: blockSchema },
  },
};
```

---

## Testing Requirements

- `tests/integration/routes/widgets.test.ts`
  - list catalog
  - create template
  - update template
  - delete template

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widgets-api-routes.md`
