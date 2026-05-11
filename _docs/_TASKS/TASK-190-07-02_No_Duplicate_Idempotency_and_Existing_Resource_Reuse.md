# TASK-190-07-02: No-Duplicate Idempotency and Existing Resource Reuse
# FileName: TASK-190-07-02_No_Duplicate_Idempotency_and_Existing_Resource_Reuse.md

**Priority:** High
**Category:** Assistant/Core + Execution Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-02, TASK-190-05-03-07, TASK-190-06-02, TASK-190-07-01
**Status:** Done (2026-05-10)

---

## Overview

Ensure composed plans reuse existing resources and stay idempotent.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintExistingResourceMatcher.ts`
- Update `core/services/assistant/adminContextTypes.ts`
- Update `core/services/assistant/adminContextCatalogNormalizer.ts`
- Update `core/services/assistant/adminContextCatalogs.ts`
- Update `tests/unit/assistant/actionExecutorService.test.ts`
- Update `tests/unit/assistant/actionExecutorService.db.test.ts`
- Update `tests/vitest/assistant/admin-context-catalogs.test.ts`
- Update `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`

## Bounded Catalog Contract

This slice owns the assistant-facing bounded catalog summary needed for
existing-resource reuse. `detail-page` must become a cataloged resource here
instead of being matched through one-off service calls.

This slice must also preserve the breadth of the current
`AssistantResourceCatalogSnapshot` contract. Existing optional groups such as
posts, entries, media, commerce, and solution kits remain part of the bounded
catalog story; adding `detailPages` must not narrow provider/context reuse back
to only pages/content types/listings/forms/menus/SEO/widgets.

Required summary shape:

```ts
type AssistantDetailPageSummary = {
  id: string;
  name: string;
  status: "draft" | "published";
  contentTypeId: string;
  contentTypeSlug: string;
  linkedRouteType: string | null;
  updatedAt: string | null;
  blockCount: number;
  bindingCount: number;
};
```

Media summary requirements:

- Reuse the existing media catalog summary shape when it already exists. If it
  must be widened, keep it bounded to safe asset metadata such as id, label/file
  name, alt text, mime/type-like hints, dimensions, size/checksum when already
  available, folder/tag-like labels, and updated timestamp.
- Media catalog summaries must not include raw file bytes, base64 payloads,
  upload tokens, signed/private storage URLs, or secret storage details.
- Existing-media reuse must prefer explicit asset ids selected by the user or
  trusted admin context. Checksum/originalName-style hints may produce a
  confirmation candidate, but filename-only matching is not enough for silent
  attach/replace/delete behavior.

Rules:

- `AssistantResourceCatalogSnapshot` gains a bounded `detailPages` group.
- `AssistantResourceCatalogSnapshot` keeps the current bounded groups for pages,
  posts, entries, content types, custom screens, listings, forms, menus, SEO
  documents, widgets, media, commerce, and solution kits where those owners are
  already available.
- Catalog summaries must stay redacted: no raw blocks, no full binding payloads,
  no preview tokens, and no unpublished entry data.
- This slice extends the existing bounded catalog seam in
  `adminContextCatalogs.ts` / `adminContextCatalogNormalizer.ts`; it does not
  add a parallel detail-page lookup store or one-off planner-only service path.
- Existing-resource reuse must key off deterministic identifiers or explicit
  collection-link metadata from current owner contracts. If an owner seam does
  not yet expose enough information, extend that seam with stable link metadata
  instead of falling back to `name`-only matching.
- `contentTypeId` is the stable collection identity in bounded detail-page
  summaries. `contentTypeSlug` and `linkedRouteType` remain route-facing labels
  and compatibility data; they must not become the primary join key for reuse.
- persistence of canonical list-page links and page-attached listing/query/
  template references stays with `TASK-190-05-02` / current page owner seams,
  concretely `PageData.settings.collectionLink`.
- persistence of stable custom-screen collection metadata stays with exact
  `collectionRole` / `compositionKey` fields from `TASK-190-06-02` / current
  custom-screen owner seams.
- persistence of detail-page-owned secondary-resource metadata stays with
  `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page owner seams.
- this slice only consumes those persisted fields in bounded catalogs and
  matcher logic; it must not introduce planner-owned metadata fallbacks.
- Non-unique fields such as listing query `name` or custom screen `name` are
  advisory labels only; they are not sufficient for silent reuse. The only
  custom-screen exception is an executor-side compatibility fallback for one
  exact-name screen whose `collectionRole` and `compositionKey` are both null;
  same-name screens carrying other metadata must remain dependency conflicts.
- Media labels, file names, and alt text are advisory labels only. They are not
  sufficient for silent media reuse, replacement, or removal without an exact id
  or explicit user confirmation.
- `blueprintExistingResourceMatcher.ts` consumes these summaries for reuse and
  idempotency.
- matcher output feeds the existing `actionExecutorService` / idempotency store
  path; this slice must not introduce a planner-owned or blueprint-owned
  executor wrapper just to apply reuse decisions.
- generic provider/resource/policy exposure for `detail-page` stays deferred to
  `TASK-190-05-03-08`; this slice prepares the bounded summaries that later
  generic assistant seams consume, but it does not widen
  `providerPlanningContext.ts`, `cmsTargetResolver.ts`, or adjacent generic
  policy flows on its own.
- no parallel fuzzy lookup path should be introduced here to compensate for that
  deferral.

## Pseudocode

```ts
export const matchExistingCompositionResources = (graph, catalog) => ({
  contentType: findBySlug(catalog.contentTypes, graph.contentType.slug),
  page: findBySlug(catalog.pages, graph.page.slug),
  detailPage:
    findById(catalog.detailPages, graph.detailPage?.id) ??
    findLinkedDetailPage(
      catalog.detailPages,
      graph.contentType.id,
      graph.route?.detailPageId
    ),
  listingQuery: findExplicitOrUniqueQuery(
    catalog.listings.queries,
    graph.query?.id,
    graph.page?.listingQueryId,
    graph.contentType.slug
  ),
  listingTemplate: findBySlug(catalog.listings.templates, graph.template.slug),
  customScreen: findExplicitOrUniqueScreen(
    catalog.customScreens,
    graph.admin?.id,
    graph.admin?.compositionKey,
    graph.contentType.id,
    graph.admin?.role
  ),
});
```

Matcher rules:

- `page.slug` and `listing-template.slug` remain safe deterministic keys.
- `listing-query.name` and `custom-screen.name` must not be used as silent reuse
  keys because current storage only indexes them; they are not unique.
- `detail-page` fallback by `contentTypeId` alone is allowed only when current
  owner contracts expose exactly one canonical linked detail page for that
  collection; otherwise the matcher returns `unresolved`.
- `contentTypeSlug` may still appear in bounded summaries for route/context
  packaging, but matcher joins must prefer `contentTypeId` because the current
  content-type owner seam allows slug edits.
- If the current owner seam lacks deterministic link metadata for supporting
  resources, extend that seam with explicit `compositionKey`, `collectionRole`,
  or canonical list-page linkage under the exact owner leaves above rather than
  adding fuzzy name heuristics.
- For pages, the concrete persisted owner seam is
  `PageData.settings.collectionLink`; matcher logic consumes that field rather
  than introducing a second page-link store.
- This slice never invents or persists `compositionKey`, `collectionRole`,
  canonical list-page links, or page-attached listing refs inside matcher logic,
  planning state, or provider context.
- For existing media, matcher output may select by explicit id or trusted active
  selection only. Ambiguous media candidates return `unresolved`/`needs_input`
  with candidate options.
- Media reference reuse/removal is target-aware: entry gallery/content fields use
  supported entry/media action contracts, page/widget references use the
  page/widget owner contract, and asset deletion remains out of scope unless a
  media-service delete action exists for that exact request.

## Security Contract

- Visibility: internal planning/dry-run.
- Auth model: unchanged.
- RBAC: execute permissions unchanged.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: resource matches are advisory and revalidated by executors.
- Anti-abuse: repeated prompts must not create resource spam.
- Secret handling: catalog summaries stay bounded/redacted.

## Testing Requirements

- DB-backed no-duplicate tests.
- Bounded detail-page catalog summaries normalize and round-trip through the
  assistant resource catalog builders.
- Existing catalog groups for posts, entries, media, commerce, and solution kits
  remain present or explicitly omitted with owner/gating metadata; adding
  `detailPages` does not regress the current catalog breadth.
- Media catalog summaries normalize without raw bytes, signed URLs, upload
  tokens, or secret storage details.
- Existing resource update/reuse tests.
- Non-unique `listing-query.name` and `custom-screen.name` collisions return
  `unresolved` or equivalent conflict metadata; they do not silently reuse the
  first match.
- Existing detail page document update/reuse tests keyed by stable detail page
  id and content-type ownership, not a second route-pattern owner.
- Matcher consumes canonical list-page / supporting-resource linkage from
  `TASK-190-05-02` / current page owner seams, concretely
  `PageData.settings.collectionLink`, rather than inventing planner-only state.
- Matcher consumes exact `collectionRole` / `compositionKey` fields from
  `TASK-190-06-02` / current custom-screen owner seams rather than inventing
  planner-only state.
- Matcher consumes any extra detail-page-owned secondary-resource metadata from
  `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page owner seams
  rather than inventing planner-only state.
- Generic provider/policy/target-resolver coverage for `detail-page` remains
  owned by `TASK-190-05-03-08`; this slice keeps reuse/idempotency assertions on
  bounded catalog builders and matcher behavior only.
- Existing media add/replace/remove tests prove exact-id reuse, ambiguous
  filename candidates returning `needs_input`, and target-aware handling for
  entry vs page/widget references.
- Idempotency replay tests.
- Conflict when existing resource is incompatible.

## Completion Notes

- Added bounded `detailPages` summaries to the assistant resource catalog
  builder/normalizer with stable `contentTypeId`, advisory `contentTypeSlug`,
  linked route type, update timestamp, and block/binding counts only.
- Preserved catalog breadth for pages, posts, entries, content types, custom
  screens, listings, forms, menus, SEO, widgets, media, commerce, and solution
  kits while adding the new detail-page group.
- Added `blueprintExistingResourceMatcher.ts` and wired it into the current
  `blueprintActionAssembler.ts` path. The matcher consumes current
  resource-catalog summaries, rewrites supported create-like actions to reuse
  existing resources, and returns blocking conflicts for ambiguous/non-unique
  matches before `actionExecutorService` executes anything.
- Reuse remains owner-seam based: pages use persisted
  `PageData.settings.collectionLink`, custom screens use
  `collectionRole` / `compositionKey`, detail pages use stable ids and canonical
  linked summaries, listing query names are only safe when unique, and media
  reuse is exact-id only. Executor-side legacy custom-screen reuse is limited to
  one exact-name screen with null `collectionRole` and null `compositionKey`.
- Generic provider/policy/target-resolver exposure for `detail-page` remains
  deferred to `TASK-190-05-03-08`; this leaf keeps the new behavior inside the
  bounded catalog, matcher, assembler, and executor validation paths.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if cache events change.
- `_docs/ASSISTANT_SITE_BUILDER.md`
