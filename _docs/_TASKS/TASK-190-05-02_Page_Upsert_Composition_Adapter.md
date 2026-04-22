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
- Update `core/services/assistant/actionPlanTypes.ts` if composer-owned page
  metadata must widen the existing `page.upsert` contract in place
- Update `core/services/assistant/actionPlanSchema.ts` if the reviewed
  `page.upsert` contract widens for persisted collection-link metadata
- Update `core/services/assistant/actionExecutorService.ts` if the widened
  `page.upsert` contract must write page-owned collection metadata into
  `PageData.settings.collectionLink`
- Update `core/server/validation/pageSchemas.ts` if current page create/update/
  publish route validation must accept `PageData.settings.collectionLink`
- Update `core/services/pages/pageService.ts` only if explicit canonical
  list-page linkage or page-level collection references must persist in the
  current page contract
- Update `core/admin/services/pagesClient.ts` only if that persisted page
  metadata must round-trip through the current admin cached client
- Update `core/admin/ui/pages/PageEditor.tsx` only if the current page editor
  needs UI/form ownership for explicit canonical list-page or collection-linked
  page metadata
- Add `tests/vitest/assistant/blueprint-page-section-composer.test.ts`
- Update `tests/vitest/assistant/action-plan-schema.test.ts` if the existing
  `page.upsert` contract widens for `collectionLink`
- Update `tests/unit/assistant/actionExecutorService.test.ts` if assistant page
  execution writes `collectionLink`
- Update `tests/unit/pages/validation.test.ts` if page route payload validation
  widens for `settings.collectionLink`
- Update `tests/vitest/admin/pagesClient.test.ts` only if page-owner metadata
  round-trip is widened in this leaf
- Update `tests/vitest/ui/page-editor.test.tsx` or existing page-editor UI tests
  only if the current editor contract is widened in this leaf

Prefer reuse:

- the current `page.upsert` action shape already supports block-backed page
  payloads and should remain the owner, but the current reviewed contract does
  not carry `PageData.settings.collectionLink`,
- if this leaf persists canonical collection-link metadata through assistant
  execution, widen the existing `page.upsert` contract in place through
  `actionPlanTypes.ts`, `actionPlanSchema.ts`, and `actionExecutorService.ts`;
  do not add a second page-link action, workspace-owned write path, or hidden
  post-processing flow beside `page.upsert`,
- if collection workspace / no-duplicate matching needs explicit canonical
  list-page linkage or persisted page-level references to listing query,
  listing template, or supporting collection resources, those fields belong to
  the current page owner seam in this leaf:
  - persist them in the page data/settings contract,
  - round-trip them through `page.upsert`, page service, and current page admin
  editor/client,
  - do not invent workspace-only or matcher-only metadata stores for them.

Explicit page-owned metadata contract:

- This leaf freezes the page-owned persistence seam under the existing page data
  contract instead of leaving canonical collection links as an implied future
  extension.
- The default owner path is `PageData.settings.collectionLink` inside the
  existing `currentData` / `publishedData` JSON contract handled by
  `pageService.ts`.
- Minimal contract for downstream consumers:

```ts
type PageCollectionLink = {
  contentTypeId: string;
  pageRole: "canonical-list-page" | "supporting-page";
  compositionKey?: string | null;
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};
```

- `contentTypeId` is the stable collection owner key.
- `pageRole` distinguishes the one canonical public list page from secondary
  supporting pages for the same collection.
- `compositionKey` is optional, but if later adjunct waves need a stable page
  identity beyond `pageRole`, this is the exact field that downstream matcher /
  workspace leaves consume; do not introduce an alternate page-link key later.
- `listingQueryId` and `listingTemplateId` are explicit canonical refs owned by
  the page seam; they are not browser-only annotations and they do not move into
  workspace or matcher state.
- `core/server/validation/pageSchemas.ts` owns strict route-payload acceptance
  for `data.settings.collectionLink` on current page create/update/publish
  flows. If manual page routes should round-trip this metadata, this leaf must
  widen that existing schema in place instead of leaving `collectionLink` as a
  service-only hidden field.
- `pageService.ts` owns normalization/read-write of `settings.collectionLink`
  inside page data.
- `actionPlanTypes.ts`, `actionPlanSchema.ts`, and
  `actionExecutorService.ts` own the reviewed assistant transport for this
  metadata when composer-generated `page.upsert` actions create or update the
  canonical list page.
- `pagesClient.ts` owns cached round-trip for that metadata, and `PageEditor.tsx`
  owns any manual editing UI if this metadata becomes operator-visible.
- Downstream leaves such as `TASK-190-06-03-01` and `TASK-190-07-02` must read
  this persisted metadata from the page seam; they must not re-derive canonical
  list pages from title/slug heuristics once this contract exists.

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
- If this leaf persists canonical collection metadata through assistant-created
  pages, the reviewed `page.upsert` contract round-trips that metadata through
  `actionPlanTypes.ts`, `actionPlanSchema.ts`, and `actionExecutorService.ts`
  instead of relying on an implicit service-only side channel.
- `PageData.settings.collectionLink` round-trips through `page.upsert`,
  `pageService.ts`, and `pagesClient.ts` without requiring a second page
  metadata store.
- Current page route validation accepts `data.settings.collectionLink` and
  continues to reject unknown sibling settings keys.
- Canonical list-page linkage and page-attached listing query/template refs are
  read from `settings.collectionLink`, not re-derived from route or slug
  heuristics once this contract exists.
- Any manual editor support for that metadata stays page-owned in the current
  Page editor seam rather than moving into workspace-only controls.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
