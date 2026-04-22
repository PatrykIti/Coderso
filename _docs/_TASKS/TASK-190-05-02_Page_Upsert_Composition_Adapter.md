# TASK-190-05-02: Page Upsert Composition Adapter
# FileName: TASK-190-05-02_Page_Upsert_Composition_Adapter.md

**Priority:** High
**Category:** Assistant/Core + Page Action Adapter
**Estimated Effort:** Large
**Dependencies:** TASK-190-03-01, TASK-190-05-01
**Status:** To Do

---

## Overview

Adapt composed page sections into `page.upsert` input while preserving backward
compatibility with current catalog-page mode.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- Add `tests/vitest/assistant/blueprint-page-section-composer.test.ts`

Prefer reuse:

- the current `page.upsert` action shape already supports block-backed page
  payloads and should remain the owner unless this leaf proves a concrete schema
  gap,
- do not widen `actionPlanTypes`, `actionPlanSchema`, or
  `actionExecutorService.ts` in this slice unless existing `page.upsert` cannot
  represent the composed page payload.
- if collection workspace / no-duplicate matching needs explicit canonical
  list-page linkage or persisted page-level references to listing query,
  listing template, or supporting collection resources, those fields belong to
  the current page owner seam in this leaf:
  - persist them in the page data/settings contract,
  - round-trip them through `page.upsert`, page service, and current page admin
    editor/client,
  - do not invent workspace-only or matcher-only metadata stores for them.

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
- Any explicit canonical list-page or page-attached collection metadata added
  for workspace/reuse round-trips through the current page owner seam rather
  than a workspace-only or matcher-only store.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
