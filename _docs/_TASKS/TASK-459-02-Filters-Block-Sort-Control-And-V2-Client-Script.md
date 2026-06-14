# TASK-459-02: Filters Block Sort Control And V2 Client Script
# FileName: TASK-459-02-Filters-Block-Sort-Control-And-V2-Client-Script.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Pages / Public Runtime / Listings
**Estimated Effort:** Large
**Dependencies:** TASK-459-01
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Implement the visitor-facing filter surface on Page v2 per the TASK-459-01
contract: a `filters` BLOCK bound to a collection block's `queryId`, a
visitor sort control, a result-count display, and the client script seam v2
pages currently lack.

Verified starting state (reuse, do not rebuild):

- The widget-era machinery is mature and reachable only from the entry
  detail-page runtime today: `listing-filters` widget markup with facet
  kinds checkbox/radio/range/date-range/taxonomy/sort, searchable options,
  auto-apply, layout variants (`core/widgets/core/listingFilters.tsx:17-47`);
  server hydration via `resolveListingFiltersRuntimeData`
  (`core/server/publicSite.tsx:309-333`,
  `core/services/search/listingRuntimeService.ts:85-150`); client script
  syncing the form to `lq.*` params with fetch-and-swap of listing blocks
  and `history.pushState`
  (`core/widgets/core/listingRuntimeScript.ts:291-336`).
- V2 public pages ship ZERO client JS: `renderPublicPageV2RuntimeHtml` is
  called with `renderBodyScripts` undefined
  (`core/site/renderPublicPage.tsx:375-388`), while the legacy WidgetBlock
  path creates a runtime-script registry and renders scripts (`:287-321`).
  This leaf adds the v2 runtime-script emission seam.
- The server already applies `lq.*` overrides to the v2 collection block end
  to end through `pageRuntimeDataPreparation.ts`, `contentListResolver.ts`,
  and `filterEngine.ts` — only the control surface + script were missing at
  this leaf's start.
- Sort: `lq.<id>.__sort=field:dir` is parsed and validated
  (`filterEngine.ts:374-383` region; sort facet kind with sortOptions in
  `filterContract.ts:29-34`), but no v2 surface emits it.
- Assistant blueprints emitted legacy `mode:'filters'` collection props
  (`blueprintPageSectionComposer.ts:88-113`); this leaf implements the frozen
  normalization decision and the current `filters` block mapping owner is
  `pageRuntimeBindingContract.ts`.

Deliverables:

1. **Filters block:** new `filters` block type — schema/defaults/capability
   in `pageDocumentV2.ts`, renderer in `pageRendererV2.tsx` reusing the
   `listingFilters` facet markup, runtime data via
   `resolveListingFiltersRuntimeData` keyed by the bound `queryId`,
   editor controls (queryId combobox reusing the TASK-457 pattern, facet
   list editor, layout/autoApply/showSearch toggles) through the shared
   primitives. Canvas renders the facet form inert (no live filtering in
   canvas — same discipline as collection pagination affordances).
2. **Un-gating** via a TASK-452-style DELIBERATE catalog amendment: the
   guard suites move to the new frozen catalog (sections unchanged; blocks
   +1 insertable), changelog records the final numbers. The `filters`
   SECTION stays gated.
3. **V2 runtime-script seam:** v2 render path gains body-script emission
   (registry equivalent of the legacy path) so `listingRuntimeScript` loads
   exactly when a page contains a filters block (or a paged collection,
   coordinated with TASK-459-03); script targets v2 block markup for
   fetch-swap (stable wrapper ids/data attributes on the collection block
   output).
4. **Visitor sort control:** sort facet (per contract) rendered by the
   filters block emitting `lq.<id>.__sort`; default from the saved query.
5. **Result count display:** the filters block (or collection block header,
   per contract) renders the total from the execution result fields named
   in TASK-459-01 (truthful full-corpus values arrive with TASK-459-04;
   render the contract fields now).
6. **Assistant normalization:** implement the frozen decision so
   blueprint-built filter pages render real filter UI; composer updated to
   emit the canonical shape.

---

## Sub-Tasks

- [x] Block type plumbing: schema, defaults, capabilities, palette entry,
      TASK-452-style guard-suite amendment.
- [x] Renderer + runtime data binding (facet hydration scoped to the bound
      queryId; fail-closed placeholder for dangling queryId).
- [x] Editor controls panel (queryId combobox, facet editor, toggles) via
      shared primitives.
- [x] V2 body-script emission seam + script wiring (fetch-swap targets,
      pushState, clearQueryPrefix behavior preserved).
- [x] Sort control + result-count display per contract.
- [x] Assistant props normalization + composer update + tests.

## Completion Notes

- The filters block renders alias-aware no-JS forms, sort/search/count
  controls, and the v2 runtime script that fetch-swaps matching collection
  content while preserving the existing UX/UI surface.

## Validation

- `bunx vitest run tests/vitest/widgets/listingRuntimeScript.test.ts tests/vitest/pages/page-runtime-data-binding.test.ts` passed.
- `bun test tests/integration/runtime/pages-runtime.test.ts` passed.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.

---

## Implementation Pseudocode

```tsx
// pageRendererV2.tsx
case "filters": {
  const runtime = await resolveListingFiltersRuntimeData({
    queryId: block.props.queryId,
    facets: block.props.facets,
    searchParams: runtimeSearchParams,
  }); // null/dangling -> inert placeholder (fail closed)
  return <ListingFiltersForm data={runtime} variant={block.props.layout} />;
}

// renderPublicPage.tsx (v2 branch): collect required runtime scripts while
// rendering blocks; emit <script> bodies like the legacy registry does:
const scripts = createPageRuntimeScriptRegistry();
... renderDocument(..., { renderBodyScripts: () => scripts.renderScripts() })
```

Expected data flow: visitor toggles facet -> form serializes to
`lq.<queryId>.*` (aliases applied per contract) -> autoApply fetch-swap or
submit -> server re-validates tokens (allowlist) -> filters block re-renders
with applied state + counts, collection block with filtered rows -> URL
pushState keeps it shareable.

Error handling: dangling queryId -> inert placeholder (same contract as the
collection block); rejected tokens silently dropped (existing semantics);
script failure degrades to full-page form submit (forms must work no-JS:
GET form with named inputs, like the widget version).

Regression-test shape: vitest — block schema round-trip, controls panel,
catalog guard amendment (final frozen counts), composer canonical output;
Bun — public v2 page with filters block renders facet form + applied state
from lq URL, sort control changes order, script tag emitted only when
needed, no-JS GET submit path works.

---

## Security Contract

- **Endpoint visibility:** no new endpoints — filter refresh fetches the
  SAME public page URL (HTML swap), as the widget script does today.
- **Auth model:** anonymous public read; published entries only (existing
  `isEntryPublished` filtering).
- **RBAC / CSRF:** unchanged (no public writes; the facet form is GET).
- **Rate-limit bucket:** unchanged (page renders).
- **Validation:** every visitor token passes the existing `filterEngine`
  allowlist probe against the saved query's source; facet configs are
  author-side, schema-validated, reject-unknown preserved.
- **Anti-abuse controls:** clamps unchanged; no visitor-defined fields.

---

## Testing Requirements

- `bun run test:vitest` (incl. amended TASK-452 guard suites and assistant
  composer suites).
- Bun: pages runtime + public-site suites for filters/sort/count and script
  emission (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (filters block, catalog amendment, v2 runtime
  scripts).
- `_docs/CONTENT_TYPES_SPEC.md` (visitor filtering contract).
- `docs/guide/` authoring note (adding filters to a listing page).
- `_docs/_CHANGELOG/` records the final frozen catalog numbers.
