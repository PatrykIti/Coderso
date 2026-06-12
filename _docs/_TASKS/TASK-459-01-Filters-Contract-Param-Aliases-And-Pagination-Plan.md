# TASK-459-01: Filters Contract Param Aliases And Pagination Plan
# FileName: TASK-459-01-Filters-Contract-Param-Aliases-And-Pagination-Plan.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Pages / Public Runtime / Listings
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Freeze the visitor-facing catalog contract before implementation. Decisions
to record (each anchored to verified code):

1. **Filters are a BLOCK, composite-first.** The `filters` SECTION stays
   enum-only and gated `listing-section-boundary`
   (`pageDocumentV2.ts:485`) — the gate reason mirrors the composite-first
   rule used for collection/lead-form (`pageDocumentV2.ts:531-545`). The
   deliverable is a new `filters` BLOCK type (capability tables + palette
   entry land in TASK-459-02) bound to a collection block's `queryId`.
2. **Honor, do not drop, the assistant props.** Blueprints already emit
   collection blocks with `mode: "filters"`, `facets`, `autoApply`,
   `showSearch`, `applyLabel`
   (`blueprintPageSectionComposer.ts:88-113`) which
   `mapPageCollectionBlockToContentListData` silently ignores
   (`pageRuntimeDataBinding.ts:200-224`). The contract must define the
   normalization: either (preferred) a document-normalization step that
   rewrites legacy `mode:'filters'` collection props into the new filters
   block + plain collection pair, or runtime honoring of `mode:'filters'`
   on the collection block itself — pick ONE, write it down, and update the
   blueprint composer to emit the canonical shape going forward.
3. **Pretty-param alias layer (design only here).** Today only
   `lq.<listingQueryUUID>.<field>.<op>=value` is parsed
   (`filterContract.ts:216-218`) — unshareable, un-SEO-able. Define a
   per-page/per-query alias map (e.g. `?rooms=3&priceMax=500000` ->
   `lq.Q.data.rooms.eq=3`, `lq.Q.data.price.lte=500000`): where the map
   lives (filters block props vs saved query), reserved names, collision
   rules with real lq tokens, and the SEO/canonical rules (which filtered
   URLs are canonicalized, noindex policy for deep filter combinations,
   alias stability across query edits). Aliases RESOLVE TO lq tokens before
   validation — no second input path.
4. **Collection pagination props.** Define block props
   `pagination: { mode: "none" | "paged" | "load-more", pageSize }`
   (the widget contract already models these modes,
   `contentList.tsx:166-174, 302`) replacing the hard-forced `"none"`
   (`pageRuntimeDataBinding.ts:218-220`), plus the numbered-pager UX (page
   numbers + prev/next + total count — today only prev/next anchors exist,
   `contentList.tsx:1025-1076`). Resolve the clamp story: schema/editor
   1..50 vs runtime 1..24 (`pageDocumentV2.ts:706`,
   `pageEditorControlRegistry.ts:722` vs `pageRuntimeDataBinding.ts:204`,
   `contentListLimitMax = 24`) — pick the single number and where it is
   owned.
5. **Truthful counts strategy.** Facet counts currently iterate the current
   page slice (`listingRuntimeService.ts:128-138`); totals exist on the
   execution result but are not surfaced. Contract: counts and totals are
   computed over the FULL filtered corpus (implementation lands in
   TASK-459-04 via aggregation; TASK-459-02/03 must render whatever this
   contract names, e.g. `total`, `facet.option.count`, `range.min/max`).
6. **Dangling-route policy.** `resolveDetailPathPattern` falls back to
   `/<typeSlug>/:slug` even when no content route is registered
   (`contentListResolver.ts:345-348`; `DEFAULT_CONTENT_ROUTES = []`,
   `settingsService.ts:57`) — cards can 404. Decide: auto-provision an
   enabled content route on first collection/filters bind to a content type
   (mirroring `mergeContentRoutes` defaults,
   `siteSettingsValidation.ts:81-91`) OR suppress card links when no
   enabled route exists. Record the choice + migration note for existing
   pages; implementation in TASK-459-03.

---

## Sub-Tasks

- [ ] Verify every anchor above; freeze the filters-block prop schema
      (queryId binding, facets array shape reusing the
      `listingFilters` facet kinds, layout variant, autoApply, showSearch,
      sort options, aliases map) in this file.
- [ ] Freeze the assistant-props normalization decision (rewrite vs honor)
      with the exact prop mapping table.
- [ ] Freeze the alias grammar + SEO/canonical rules.
- [ ] Freeze pagination props, numbered-pager UX, and the single limit
      clamp.
- [ ] Freeze the counts contract fields and the dangling-route policy.

---

## Implementation Pseudocode

```ts
// Filters block props (to freeze; vocabulary from listingFilters.tsx:17-47):
type FiltersBlockProps = {
  queryId: string;                  // shared with the sibling collection block
  facets: ListingFacetConfig[];     // checkbox|radio|range|date-range|taxonomy|sort
  layout?: "horizontal" | "sidebar";
  autoApply?: boolean;
  showSearch?: boolean;
  aliases?: Record<string, string>; // "rooms" -> "data.rooms.eq" (design here)
};
// Collection block addition:
type CollectionPagination = { mode: "none" | "paged" | "load-more"; pageSize?: number };
```

Expected data flow (contract level): alias params -> alias resolver ->
canonical lq tokens -> existing `parseListingRuntimeOverrides` +
`resolveListingRuntimeOverrides` (`contentListResolver.ts:807-830`) ->
execution -> counts/totals fields per the frozen contract -> render.

Error handling: unknown aliases ignored; alias/lq conflicts resolve in favor
of explicit lq tokens (deterministic, documented); rejectedTokens semantics
unchanged.

Regression-test shape: this leaf produces the contract document (this file,
updated bullets with final anchors) plus type skeletons; executable tests
land with the implementing leaves but their SHAPE (suites + fixtures) is
named here per item.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in this leaf (contract only).
- **Auth model / RBAC / CSRF / rate-limit:** unchanged.
- **Validation:** the contract must preserve the single-validation-path
  invariant — aliases compile to lq tokens BEFORE `filterEngine` allowlist
  validation; reject-unknown preserved on all new block props.
- **Anti-abuse controls:** alias map is author-defined (admin-validated),
  never visitor-defined.

---

## Testing Requirements

- Anchors re-verified with `rg` and pinned in this file at freeze.
- `bun --cwd core lint`, `bun --cwd core lint:types` (type skeletons only).

---

## Documentation Updates Required

- Contract bullets in this file updated with final decisions and exact
  anchors (done at freeze); feeds `_docs/PAGE_MODEL.md` /
  `_docs/CONTENT_TYPES_SPEC.md` updates in later leaves.
