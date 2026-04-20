# TASK-190-05-02: Page Upsert Composition Adapter
# FileName: TASK-190-05-02_Page_Upsert_Composition_Adapter.md

**Priority:** High
**Category:** Assistant/Core + Page Action Adapter
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-01
**Status:** To Do

---

## Overview

Adapt composed page sections into `page.upsert` input while preserving backward
compatibility with current catalog-page mode.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- Update:
  - `core/services/assistant/actionPlanTypes.ts`
  - `core/services/assistant/actionPlanSchema.ts`
  - `core/services/assistant/actionExecutorService.ts`
- Add `tests/vitest/assistant/blueprint-page-section-composer.test.ts`

## Pseudocode

```ts
export const composePageUpsertInput = (graph): AssistantPageUpsertAction["input"] => {
  const sections = composeSections(graph.pageSections);
  if (sections.length > 0) {
    return {
      title,
      slug,
      status: "published",
      introTitle,
      introBody,
      blocks: sections.map(toWidgetBlock),
    };
  }
  return currentCatalogPageInput(graph);
};
```

## Security Contract

- Visibility: internal page planning.
- Auth model: existing assistant route.
- RBAC: page write permissions unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: composed blocks pass widget schemas.
- Anti-abuse: no direct HTML/script injection.
- Secret handling: block data redaction.

## Testing Requirements

- Existing catalog page upsert remains unchanged.
- Composed blocks normalize.
- Listing filters + content-list in one page.
- Form embed resolves by form name.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
