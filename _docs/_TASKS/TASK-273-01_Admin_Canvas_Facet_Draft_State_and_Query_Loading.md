# TASK-273-01: Admin Canvas, Facet Draft State, and Query Loading

# FileName: TASK-273-01_Admin_Canvas_Facet_Draft_State_and_Query_Loading.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-273, TASK-316
**Status:** Done (2026-05-19)

---

## Overview

Repair the critical Listing Filters editor flow so selecting a listing query
shows a real admin canvas preview, adding a facet creates a visible editable
draft row, and the widget surfaces clear picker-local setup guidance around the
shared listing-query owner.

This leaf must not rewrite the shared editor mode contract. It owns the
Listing Filters-local data flow between `ListingFiltersEditors.tsx`,
`normalizeListingFiltersData`, `normalizeListingFacetConfigs`, and
`ListingFiltersBlock`.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:151-159` - first-open query
  loading can show `Not authenticated`, and the query picker lacks clear setup
  guidance. Shared retry/session-settling ownership routes to TASK-316; this
  leaf keeps only Listing Filters-local guidance/canvas behavior.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:166-172` - `Add facet`
  creates a checkbox draft with an empty field, then normalization drops it.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:189-202` - admin canvas
  always renders the placeholder because empty `resolved.listingQueryId` wins
  over the configured `listingQueryId`.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:300-308` - admin/frontend
  preview mismatch root cause.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:318-324` - critical repair
  priority list.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:108,118,125` - ID collision,
  tokenized ID mismatch, and missing feedback for invalid/incomplete facets.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Resolve configured `listingQueryId` when `resolved.listingQueryId` is blank; preserve runtime normalization for persisted render data. |
| `core/services/search/filterContract.ts` | Keep persistence/runtime facet normalization strict; add a separate editor-safe draft normalization helper only if the editor cannot own draft state locally. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Stop passing in-progress facet rows through strict persistence normalization on every keystroke; add inline duplicate/invalid ID and missing-field feedback; keep kind changes visible. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Add admin-canvas fallback regression and strict persisted facet normalization coverage. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Assert `Add facet`, sort-to-checkbox changes, duplicate IDs, missing field feedback, and local setup guidance around the shared picker state. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark the fixed admin canvas/facet-draft findings and local picker-guidance evidence; shared query-loading recovery routes to TASK-316. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document the editor draft versus persisted runtime facet validation boundary. |

## Implementation Pseudocode

```tsx
function resolveListingFiltersRuntimeQueryId(data: ListingFiltersData) {
  return resolveOptionalText(data.resolved?.listingQueryId) ?? resolveOptionalText(data.listingQueryId);
}

type ListingFacetDraft = ListingFacetConfig & {
  field: string;
};

type ListingFacetDraftValidation = {
  facetId: string;
  errors: string[];
};

function normalizeListingFiltersEditorDraft(value: ListingFiltersData) {
  const persisted = normalizeListingFiltersData(value);
  const drafts = normalizeListingFacetDrafts(value.facets, persisted.facets);
  return {
    persistedData: {
      ...persisted,
      facets: normalizeListingFacetConfigs(drafts.map(stripDraftOnlyFields)),
    },
    drafts,
    validation: validateListingFacetDrafts(drafts),
  };
}

function normalizeListingFacetDrafts(rawFacets: unknown, persistedFacets: ListingFacetConfig[]): ListingFacetDraft[] {
  if (!Array.isArray(rawFacets)) return persistedFacets;
  return rawFacets.map((entry, index) => ({
    id: normalizeDraftId(entry.id, `facet-${index + 1}`),
    kind: normalizeDraftKind(entry.kind),
    label: normalizeDraftLabel(entry.label, `Facet ${index + 1}`),
    field: typeof entry.field === "string" ? entry.field : "",
    op: resolveDefaultOperator(normalizeDraftKind(entry.kind)),
    options: normalizeDraftOptions(entry.options),
    sortOptions: normalizeDraftSortOptions(entry.sortOptions),
  }));
}

```

Data flow:

- `ListingFiltersBlock` uses a helper that treats blank `resolved.listingQueryId`
  as absent and falls back to configured `listingQueryId` for admin canvas
  preview.
- Editor state uses draft normalization for incomplete rows; only save/runtime
  validation uses `normalizeListingFacetConfigs`.
- Draft validation is parallel editor state, not part of `ListingFacetConfig`;
  it must be stripped before `onChange`, save, persistence, or
  `ListingFiltersData` runtime rendering.
- Duplicate tokenized IDs are detected in editor state before persistence, with
  the canonical token shown next to the user-entered ID.
- `kind` changes keep the row visible, set the default operator for the target
  kind, and show missing-field feedback instead of deleting the row.

Error handling:

- Local setup guidance reflects the shared picker loading/error state without
  changing auth/session semantics. Shared retry/manual refresh behavior is owned
  by TASK-316, and broader Wizard/Visual diagnostics copy is owned by
  TASK-273-07.
- Do not swallow permanent authorization failures or change route auth behavior.
- Persisted invalid non-sort facets still fail closed or are omitted according
  to the existing runtime contract until a schema migration explicitly changes
  that contract.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged existing internal admin query-list endpoint.
- RBAC: unchanged listing-query read permissions and page/template/widget write
  permissions.
- CSRF: unchanged because this leaf adds no write route.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: persisted `listing-filters` payloads remain
  schema-owned with `additionalProperties: false`; draft-only validation state
  must not be persisted.
- Anti-abuse: query IDs, facet IDs, fields, operators, and options stay
  normalized and bounded; no client-owned query execution or provider/index
  configuration is introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults/normalizer
  fields change.
- `bun run gates:coderso`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/_TASKS/TASK-273-01_Admin_Canvas_Facet_Draft_State_and_Query_Loading.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Admin canvas renders the configured Listing Filters preview after a query is
  selected, even when `resolved.listingQueryId` is an empty string.
- `Add facet` creates a visible editable non-sort row and does not disappear
  before the field path is entered.
- Changing a sort facet to checkbox/radio/taxonomy/range/date-range keeps the
  row visible and shows actionable missing-field validation.
- Duplicate or token-colliding facet IDs are visible editor errors rather than
  silent dropped rows.
- Listing Filters shows clear picker-local setup guidance next to the shared
  listing query picker, while transient session-settling retry behavior is
  owned by TASK-316 and mode-level diagnostics remain TASK-273-07.
