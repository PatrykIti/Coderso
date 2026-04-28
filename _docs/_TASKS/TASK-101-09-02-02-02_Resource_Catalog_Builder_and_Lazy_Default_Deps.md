# TASK-101-09-02-02-02: Resource Catalog Builder and Lazy Default Deps
# FileName: TASK-101-09-02-02-02_Resource_Catalog_Builder_and_Lazy_Default_Deps.md

**Priority:** High
**Category:** Core/Assistant + Coderso Services
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-02-02-01
**Status:** Done (2026-04-11)

---

## Overview

Dostarczyc async builder katalogu admin resources z dependency injection oraz lazy default deps dla DB/runtime-backed serwisow.

Builder ma reuse’owac istniejace serwisy domenowe, ale nie moze wymuszac import-time DB/runtime coupling w Bun-free normalizatorach i plannerze.

## Existing Code to Reuse

- `core/services/content/typeService.ts` (`listContentTypes`)
- `core/services/customScreens/customScreenService.ts` (`listCustomScreens`)
- `core/services/content/listingQueriesService.ts` (`listListingQueries`)
- `core/services/content/listingTemplatesService.ts` (`listListingTemplates`)
- `core/services/forms/formsService.ts` (`listForms`, `listFormFields`)
- `core/services/widgets/widgetCatalogService.ts` (`listWidgetCatalog`)

## Files to Change

- `core/services/assistant/adminContextCatalogs.ts` (new)
- `tests/vitest/assistant/admin-context-catalogs.test.ts` (new if builder remains import-safe)
- optional `tests/unit/assistant/adminContextCatalogs.test.ts` (new only for default-deps runtime smoke)

## Pseudocode

```ts
export async function buildAssistantResourceCatalogSnapshot(input, deps) {
  const [contentTypes, customScreens, listingQueries, listingTemplates, forms, widgets] =
    await Promise.all([
      deps.listContentTypes(),
      deps.listCustomScreens(),
      deps.listListingQueries(),
      deps.listListingTemplates(),
      deps.listFormsWithFields(),
      deps.listWidgetCatalog(),
    ]);

  return normalizeAssistantResourceCatalog(
    { contentTypes, customScreens, listingQueries, listingTemplates, forms, widgets },
    input.budget
  );
}
```

## Sub-Tasks

1. Add `AssistantResourceCatalogDeps` interface.
2. Add injected-deps builder that is testable in Vitest.
3. Add lazy `buildAssistantResourceCatalogSnapshotWithDefaultDeps` helper that imports DB/runtime services only inside the function.
4. Join forms with fields through `listFormFields(form.id)`.
5. Normalize partial dependency failures into warnings or omitted groups without malformed output.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/admin-context-catalogs.test.ts --config vitest.config.ts`
- If default deps are exercised against DB/runtime services, use Bun and only run DB-backed smoke when `DATABASE_URL` is reachable.

## Documentation Updates Required

- Covered by parent TASK-101-09-02-02 closure docs.

## Completion Notes (2026-04-11)

- Added `adminContextCatalogs.ts` with injected deps and lazy default deps.
- Builder joins forms with fields, reuses existing domain services through lazy imports, and returns machine-readable unavailable-group warnings on partial failures.

## Validation (2026-04-11)

- `bunx vitest run tests/vitest/assistant/admin-context-catalogs.test.ts --config vitest.config.ts`
