# TASK-273: Listing Filters Widget Playwright Product Followups

# FileName: TASK-273_Listing_Filters_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-07, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Listing Filters follow-up family for
`_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`.

This family owns only product and UX repairs that are local to
`listing-filters`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-273 to duplicate shared fixes for editor-mode atomic updates, generic
Clear/design-token semantics, raw script policy, global accessibility baselines,
or cross-widget runtime binding rules.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/listingFilters.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/services/search/filterContract.ts`
- `core/widgets/core/listingRuntimeScript.ts`
- `core/admin/ui/listings/ListingFiltersPage.tsx`
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `tests/vitest/ui/listing-filters-query-parser.test.ts`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/WIDGETS.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-273 because
TASK-256 already owns them as shared widget-contract drift or global policy.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| Raw `<script dangerouslySetInnerHTML>` policy and global runtime-script bootstrap/HMR concerns | `REPORT_LISTING_FILTERS_WIDGET.md:125-128` | TASK-256-04, TASK-256-07, TASK-256-08 | Shared interactive runtime binding/script policy. TASK-273 may touch `listingRuntimeScript.ts` only for Listing Filters loading/error/page behavior. |
| Full rewrite from uncontrolled SSR form controls to controlled React state | `REPORT_LISTING_FILTERS_WIDGET.md:128`, `REPORT_LISTING_FILTERS_WIDGET.md:189-202` | TASK-256-04, TASK-256-07 | The local canvas bug is owned by TASK-273-01; broad controlled-input policy is shared runtime form architecture. |
| Missing baseline IDs, labels, form/button accessible names, and shared interactive ARIA conventions | `REPORT_LISTING_FILTERS_WIDGET.md:129-132,249-262,348-350` | TASK-256-04, TASK-256-07 | Shared accessible runtime-control contract. TASK-273 leaves must not regress ARIA and must add local labels only for new Listing Filters controls. |
| Color picker and generic clear/design-token editor behavior | `REPORT_LISTING_FILTERS_WIDGET.md:115` | TASK-256-02 | Shared clear/design-token editor contract; Listing Filters already uses `ClearableInputField` for existing surface fields. |
| Generic editor mode atomic-update and duplicated Advanced-scope rules | `_docs/WIDGETS.md:90-105`; adjacent report mode findings | TASK-256-01 | TASK-273 may add Listing Filters mode content, but must not introduce a new mode-switch/update contract. |

## TASK-273 Scope Matrix

| Report finding | TASK-273 owner | Notes |
|---|---|---|
| Admin canvas always renders placeholder after selecting a query | TASK-273-01 | Local `resolved.listingQueryId ?? listingQueryId` fallback bug in `ListingFiltersBlock`. |
| Add facet does not add non-sort facets; sort-to-filter kind changes disappear | TASK-273-01 | Editor draft state is normalized through a persistence-only helper that drops empty fields. |
| Facet ID collisions, tokenized ID mismatch, and no inline validation | TASK-273-01 | Keep persisted IDs deterministic while preserving editable in-progress rows. |
| First-open listing query load shows `Not authenticated` and missing selected-query guidance | TASK-273-01, TASK-273-07 | Local query picker retry/guidance only; do not change auth/session semantics. |
| Field path free-text, all operators exposed for every kind, text-area option formats, missing facet preview | TASK-273-02 | Editor authoring improvement for existing facet model. |
| Range/date-range text inputs, taxonomy hierarchy, and large option sets | TASK-273-03 | Adds Listing Filters-owned control configuration and renderer behavior. |
| Active filter count/chips, clear-all, misleading fallback counts, and auto-apply submit copy | TASK-273-04 | Runtime state UX around current `lq.<queryId>.*` values. |
| Pagination control, filter-change page reset, AJAX loading state, and network error state | TASK-273-05 | Listing runtime URL/refresh behavior only. |
| Horizontal/sidebar/drawer layouts, collapsible facets, and max-width control | TASK-273-06 | Listing Filters-specific layout/product surface expansion. |
| Wizard facet onboarding, runtime diagnostics outside Advanced, and editor entry guidance | TASK-273-07 | Mode content only; shared mode-update mechanics remain TASK-256. |
| Report fixed/deferred evidence, widget docs, changelog, board closure | TASK-273-08 | Final family closure and validation record. |

## Shared Owner Safeguards

- `core/widgets/core/listingRuntimeScript.ts` is shared by `listing-filters`
  and `search-box` (`SearchBoxBlock` renders `data-listing-runtime-form` and
  imports `getListingRuntimeClientScript`). TASK-273 changes in that file must
  either scope behavior through Listing Filters-specific data markers or prove
  the shared listing-mode behavior with explicit Search Box regressions.
- Pagination is a server-to-widget contract, not only a client URL control.
  `core/services/search/listingRuntimeService.ts` computes runtime `total`
  values, while `core/server/publicSite.tsx` currently chooses the
  `ListingFiltersData.resolved` fields passed into the public widget render.
  TASK-273-05 must carry current page, page size, total items, and total pages
  through that path before the widget renders pagination UI.
- New runtime-script coverage must live in
  a new `tests/vitest/widgets/listingRuntimeScript.test.ts` suite and cover
  Listing Filters plus Search Box listing-mode interactions whenever shared
  script behavior changes.

## Sub-Tasks

- [ ] TASK-273-01: Admin Canvas, Facet Draft State, and Query Loading
- [ ] TASK-273-02: Facet Field, Operator, Options, and Preview Editors
- [ ] TASK-273-03: Range, Date, Taxonomy, and Searchable Option Controls
- [ ] TASK-273-04: Active Filters, Clear All, Counts, and Auto Apply State
- [ ] TASK-273-05: Pagination, Page Reset, Loading, and Error State
- [ ] TASK-273-06: Layout Variants, Collapsible Facets, and Width Controls
- [ ] TASK-273-07: Wizard, Diagnostics, and Mode Onboarding
- [ ] TASK-273-08: Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over TASK-256 shared fixes first when a leaf touches mode
   update helpers, Clear/design-token behavior, or shared accessibility helpers.
2. Complete TASK-273-01 first. Later editor leaves depend on stable editable
   facet draft rows and a working admin canvas.
3. Complete TASK-273-02 before TASK-273-03 because field/operator/option
   authoring determines the final facet data shape.
4. Complete TASK-273-03 before TASK-273-04 so active chips and counts can read
   the final control configuration.
5. Complete TASK-273-05 before TASK-273-06 when drawer/collapsible layouts bind
   runtime refresh/loading controls.
6. Complete TASK-273-07 after the editor surface stabilizes.
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

This planning family does not add API routes.

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

- Every Listing Filters report finding is either owned by TASK-256, covered by
  a TASK-273 physical leaf, or explicitly deferred by TASK-273-08 with a reason.
- TASK-273 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing
  `listing-filters` payloads unless the leaf documents and tests a
  migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
