# TASK-049-02: Widget Templates Service
# FileName: TASK-049-02_Widget_Templates_Service.md

**Priority:** High  
**Category:** CMS/Widgets (Services)  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-01  
**Status:** Done (2026-02-02)

---

## Overview

Implement service-layer CRUD for widget templates.
Templates store blocks (WidgetBlock[]) and basic metadata so they can be inserted into pages.

---

## Service Contracts

### Types

```ts
export type WidgetTemplateStatus = "draft" | "published";

export type WidgetTemplate = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: "layout" | "content" | "forms" | "navigation" | "media";
  status: WidgetTemplateStatus;
  blocks: WidgetBlock[];
  createdAt: Date;
  updatedAt: Date;
};

export type WidgetTemplateInput = {
  name: string;
  slug?: string;
  description?: string | null;
  category: WidgetTemplate["category"];
  status?: WidgetTemplateStatus;
  blocks?: WidgetBlock[];
};
```

### Functions

```ts
listWidgetTemplates(): Promise<WidgetTemplate[]>
getWidgetTemplate(id: string): Promise<WidgetTemplate | null>
createWidgetTemplate(input: WidgetTemplateInput, actorId?: string): Promise<WidgetTemplate>
updateWidgetTemplate(id: string, input: Partial<WidgetTemplateInput>, actorId?: string): Promise<WidgetTemplate>
deleteWidgetTemplate(id: string): Promise<void>
```

---

## Behavior Rules

- `slug` auto-generated from `name` if missing.
- `blocks` default to empty array.
- `status` default to `draft`.
- Validate `blocks` structure using the same schema as `pages.data.blocks` (blockSchema).
- `updateWidgetTemplate` should not accept empty name or invalid category.

**Note:** Do not import React components on the server.
Validation should be structural (JSON schema), not editor/render validation.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/widgets/widgetTemplateService.ts` | create | CRUD + validation |
| `core/services/widgets/widgetTemplateValidation.ts` | create | validate input + blocks |
| `core/utils/slugify.ts` | create | shared slugify helper |
| `core/db/schema.ts` | use new table | CRUD via drizzle |

---

## Example (pseudo)

```ts
export async function createWidgetTemplate(input: WidgetTemplateInput, actorId?: string) {
  const name = normalizeName(input.name);
  const slug = normalizeSlug(input.slug ?? slugify(name));
  const blocks = normalizeBlocks(input.blocks ?? []);
  const status = input.status ?? "draft";

  const [row] = await db.insert(widgetTemplates).values({
    name,
    slug,
    description: input.description ?? null,
    category: input.category,
    status,
    blocks,
    createdBy: actorId ?? null,
    updatedBy: actorId ?? null,
  }).returning();

  return row;
}
```

---

## Testing Requirements

- `tests/unit/widgets/widgetTemplatesService.test.ts`
  - create/update/delete template
  - slug auto-generation
  - invalid category rejected
  - blocks validation rejects malformed data

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-templates-service.md`
