# TASK-273: Listing Filters Widget Playwright Product Followups

# FileName: TASK-273_Listing_Filters_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-07, TASK-256-08, TASK-262-03, TASK-315, TASK-316
**Status:** Done (2026-05-20)

---

## Overview

Create the widget-specific Listing Filters follow-up family for
`_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`.

This family owns only product and UX repairs that are local to
`listing-filters`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-273 to duplicate shared fixes for editor-mode atomic updates, generic
Clear/design-token semantics, raw script policy, global accessibility baselines,
or cross-widget runtime binding rules.
If implementation uncovers a new shared drift that is not already owned by an
existing shared task, split it into a separate shared follow-up instead of
patching it inside TASK-273.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/listingFilters.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/services/search/filterContract.ts`
- `core/widgets/core/listingRuntimeScript.ts`
- `core/services/search/listingRuntimeService.ts`
- `core/server/publicSite.tsx`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/widgets/core/searchBox.tsx`
- `core/widgets/core/contentList.tsx`
- `core/services/content/contentListResolver.ts`
- `core/widgets/core/entryTeaser.tsx`
- `core/admin/ui/listings/ListingFiltersPage.tsx`
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/widgets/searchBox.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `tests/vitest/ui/listing-filters-query-parser.test.ts`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/WIDGETS.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-273 because
TASK-256 already owns them as shared widget-contract drift or global policy.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| Raw `<script dangerouslySetInnerHTML>` policy and global runtime-script bootstrap/HMR concerns | `REPORT_LISTING_FILTERS_WIDGET.md:126-127` | TASK-256-04, TASK-256-07, TASK-256-08 | Shared interactive runtime binding/script policy. TASK-273 may touch `listingRuntimeScript.ts` only for Listing Filters-specific DOM markers or widget-local controls that do not change shared refresh, rebinding, `popstate`, or block-replacement ownership. |
| Full rewrite from uncontrolled SSR form controls to controlled React state | `REPORT_LISTING_FILTERS_WIDGET.md:128` | TASK-256-04, TASK-256-07 | The local canvas fallback bug at `REPORT_LISTING_FILTERS_WIDGET.md:189-202` is TASK-273-01-owned; only the broader controlled-input/runtime form architecture stays shared. |
| Missing baseline IDs, labels, form/button accessible names, and shared interactive ARIA conventions | `REPORT_LISTING_FILTERS_WIDGET.md:129-132,249-262,348-350` | TASK-256-04, TASK-256-07 | Shared accessible runtime-control contract. TASK-273 leaves must not regress ARIA and must add local labels only for new Listing Filters controls. |
| Color picker and generic clear/design-token editor behavior | `REPORT_LISTING_FILTERS_WIDGET.md:115` | TASK-256-02 | Shared clear/design-token editor contract; Listing Filters already uses `ClearableInputField` for existing surface fields. |
| Generic editor mode atomic-update and duplicated Advanced-scope rules | `_docs/WIDGETS.md:90-105`; adjacent report mode findings | TASK-256-01 | TASK-273 may add Listing Filters mode content, but must not introduce a new mode-switch/update contract. |

## TASK-273 Scope Matrix

| Report finding | TASK-273 owner | Notes |
|---|---|---|
| Admin canvas always renders placeholder after selecting a query | TASK-273-01 | Local `resolved.listingQueryId ?? listingQueryId` fallback bug in `ListingFiltersBlock`. |
| Add facet does not add non-sort facets; sort-to-filter kind changes disappear | TASK-273-01 | Editor draft state is normalized through a persistence-only helper that drops empty fields. |
| Facet ID collisions, tokenized ID mismatch, and no inline validation | TASK-273-01 | Keep persisted IDs deterministic while preserving editable in-progress rows. |
| First-open listing query load shows `Not authenticated` | TASK-316 | Shared session-settling/retry and hook adoption live in the shared listing-query picker owner. |
| Missing selected-query guidance next to the picker | TASK-273-01 | Picker-local setup copy belongs with the local canvas/draft-state repair. |
| Field path free-text, all operators exposed for every kind, text-area option formats, missing facet preview | TASK-273-02 | Editor authoring improvement for existing facet model. |
| Range/date-range text inputs, taxonomy hierarchy, and large option sets | TASK-273-03 | Adds Listing Filters-owned control configuration and renderer behavior. |
| Active filter count/chips, clear-all, misleading fallback counts, and auto-apply submit copy | TASK-273-04 | Runtime state UX around current `lq.<queryId>.*` values. |
| Linked-results pagination ownership, AJAX loading state, and network error state | TASK-262-03, TASK-315, TASK-273-05 | Content List already owns shared `__page` navigation UI. TASK-273-05 keeps only Listing Filters-local markers/copy and report evidence; shared refresh/rebinding/error behavior routes to TASK-315. |
| Horizontal/sidebar/drawer layouts, collapsible facets, and max-width control | TASK-273-06 | Listing Filters-specific layout/product surface expansion. |
| Wizard facet onboarding, runtime diagnostics outside Advanced, and editor entry guidance | TASK-273-07 | Mode-level onboarding/diagnostics only; picker-inline setup guidance stays TASK-273-01 and shared retry behavior stays TASK-316. |
| Report fixed/deferred evidence, widget docs, changelog, board closure | TASK-273-08 | Final family closure and validation record. |

## Shared Owner Safeguards

- `core/widgets/core/listingRuntimeScript.ts` is shared by Listing Filters and
  Search Box form submission, and its query-id replacement contract also
  refreshes linked `content-list` and `entry-teaser` blocks that render
  `data-listing-query-id`. TASK-273 may add only Listing Filters-specific DOM
  markers, local helper copy, or widget-only controls that keep using the
  existing shared refresh path. Any fetch lifecycle, `popstate`, rebinding,
  stale-response, or block-replacement semantics must route to TASK-315.
- Linked-results pagination already belongs to the Content List runtime surface
  landed in TASK-262-03. `core/services/content/contentListResolver.ts` and
  `core/widgets/core/contentList.tsx` already compute and render Previous/Next
  navigation for the same `lq.<queryId>.__page` token. TASK-273 must not add a
  second `__page` owner or duplicate previous/next UI inside `listing-filters`.
- `core/admin/ui/listings/hooks/useListingQueries.ts` is the shared listing-query
  picker owner. Any retry/session-settling or picker load-state changes
  discovered while implementing Listing Filters must route to TASK-316 instead
  of reintroducing widget-local fetch hooks.
- If a leaf exposes a new shared runtime, accessibility, or truthful-control
  gap outside the current TASK-273 local owners, stop and create a separate
  shared task instead of widening this family.
- New runtime-script coverage must live in
  a new `tests/vitest/widgets/listingRuntimeScript.test.ts` suite and cover
  Listing Filters plus Search Box listing-mode interactions whenever shared
  script behavior changes.

## Sub-Tasks

- [x] TASK-273-01: Admin Canvas, Facet Draft State, and Query Loading
- [x] TASK-273-02: Facet Field, Operator, Options, and Preview Editors
- [x] TASK-273-03: Range, Date, Taxonomy, and Searchable Option Controls
- [x] TASK-273-04: Active Filters, Clear All, Counts, and Auto Apply State
- [x] TASK-273-05: Pagination, Page Reset, Loading, and Error State
- [x] TASK-273-06: Layout Variants, Collapsible Facets, and Width Controls
- [x] TASK-273-07: Wizard, Diagnostics, and Mode Onboarding
- [x] TASK-273-08: Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over TASK-256 shared fixes first when a leaf touches mode
   update helpers, Clear/design-token behavior, or shared accessibility helpers.
   Consume existing shared owners instead of duplicating them:
   TASK-262-03 for linked-results pagination, TASK-315 for shared listing
   runtime refresh semantics, and TASK-316 for shared listing-query picker
   loading/retry behavior.
2. Complete TASK-273-01 first. Later editor leaves depend on stable editable
   facet draft rows and a working admin canvas.
3. Complete TASK-273-02 before TASK-273-03 because field/operator/option
   authoring determines the final facet data shape.
4. Complete TASK-273-03 before TASK-273-04 so active chips and counts can read
   the final control configuration.
5. Complete TASK-273-05 before TASK-273-06 so local status/error anchors and
   current-state pagination evidence are stable before layout variants add new
   widget chrome around the same runtime surface.
6. Complete TASK-273-07 after TASK-273-01 and TASK-273-02 stabilize the editor
   flow; it does not depend on the later layout-variant expansion.
7. Complete TASK-273-08 last after code, tests, Playwright report evidence,
   widget docs, changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-273*` files, Listing Filters owner files, Listing Filters
  tests, Listing Filters docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-273 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add public routes or new widget-local admin API
routes. If a leaf discovers missing shared listing-query response data or admin
route behavior, split that work to a separate shared task instead of widening
TASK-273.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Listing Filters schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: query/facet fields must stay schema-owned and bounded. Do not add
  public writes, raw HTML/script fields, unbounded class names, browser-stored
  secrets, or client-owned provider/index configuration.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-query-parser.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, variants, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing/radius/clear adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget registry wiring changes.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
  after creating that new suite when `getListingRuntimeClientScript`
  URL/query/reset/loading/error behavior changes; include Search Box
  listing-mode no-regression cases because the script is shared.
- `bun run gates:coderso`
- `bun run lint` before final closure because this family crosses root-level UI,
  runtime, and docs owners.
- `bun run test:bun` before final closure because runtime/server/search owners
  are part of the implementation path.
- `bun run test:vitest` before final closure.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/LISTING_FILTERS.md` when schema, editor modes,
  runtime variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Listing Filters pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Listing Filters report finding is either owned by TASK-256, routed to
  an extracted/shared owner (`TASK-262-03`, `TASK-315`, `TASK-316`), covered by
  a TASK-273 physical leaf, or explicitly deferred by TASK-273-08 with a
  reason.
- TASK-273 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing
  `listing-filters` payloads unless the leaf documents and tests a
  migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
