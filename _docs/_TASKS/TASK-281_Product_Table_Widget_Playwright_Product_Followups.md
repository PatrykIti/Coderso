# TASK-281: Product Table Widget Playwright Product Followups

# FileName: TASK-281_Product_Table_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06, TASK-256-07, TASK-256-08
**Status:** In Progress (2026-05-21)

---

## Overview

Create the Product Table-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

This family owns only product and UX improvements that are local to
`product-table`. TASK-256 owns shared widget-contract drift found across many
reports. Do not use TASK-281 to duplicate generic repairs for editor atomic
updates, Clear/none token behavior, generic safe-output helpers, or shared
runtime accessibility helpers.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/productTable.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `core/admin/services/commerceClient.ts`
- `core/server/routes/commerceRoutes.ts`
- `core/server/validation/commerceSchemas.ts`
- `core/widgets/renderers/widgetRenderer.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `tests/vitest/widgets/productTable.test.tsx`
- `tests/vitest/ui/product-table-editor-wave.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/unit/widgets/validator.test.ts`
- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/_WIDGETS/tmp/product-table/MATRIX.md`
- `_docs/WIDGETS.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-281 when
they require generic widget-contract work instead of Product Table-owned
behavior.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| Generic Clear/none token semantics for surface fields | `REPORT_PRODUCT_TABLE_WIDGET.md:120-124` | TASK-256-02 | The report marks Product Table Clear behavior as working; any shared token semantics remain TASK-256. |
| Generic editor update races or mode ownership | TASK-256 report classification | TASK-256-01 | TASK-281 may add Product Table controls, but must use the existing normalized update pattern instead of inventing a generic mode contract. |
| Shared safe-href/media/link policy | Product links/action rows in report | TASK-256-06 or existing safe helpers | Product Table can expose link controls only by consuming the shared safe-url contract. If a new shared helper is required, split it back to TASK-256. |
| Shared runtime instance or client-script binding helpers | UX-04, UX-06, UX-08 if implemented as public interactivity | TASK-256-04 | Product Table can add table-specific controls, but generic script scoping/idempotence belongs to TASK-256. |
| Cross-report fixed/deferred classification | TASK-256-07, TASK-256-08 | TASK-256 | TASK-281 records Product Table implementation evidence after leaves land; TASK-256 keeps the global matrix. |

TASK-281 may depend on TASK-256 results, but it must not restage those shared
repairs. If a TASK-281 leaf discovers that a desired Product Table feature needs
a cross-widget abstraction, open or update the shared owner before implementing
the Product Table slice.

## TASK-281 Scope Matrix

| Report finding | TASK-281 owner | Notes |
|---|---|---|
| BUG-00 admin preview never hydrates commerce data | TASK-281-01 | Product Table admin canvas/runtime preview parity through the existing commerce query contract. |
| BUG-01 missing Slug, Stock, CompareAt, Collections label controls | TASK-281-02 | Complete editor controls for every schema-owned label through the shared column registry. |
| BUG-04 title and price are always visible | TASK-281-02 | Add bounded visibility policy for mandatory columns without allowing an empty unusable table. |
| BF-13 collections count header context is schema-only | TASK-281-02 | Collections count now keeps its editor-owned header label through the shared column registry. |
| BUG-02 and A3 status/title accessible copy | TASK-281-03 | Product Table status badge, title/status copy, row-state treatment, and the non-duplicated accessible title/status baseline. |
| BUG-03 and BF-03 stock quantity is ignored | TASK-281-03 | Optional stock quantity display inside the stock column. |
| BF-04 status row coloring | TASK-281-03 | Bounded row-state presentation, no arbitrary classes. |
| UX-03 and BF-11 product links/action column | TASK-281-04 | Safe product navigation and optional action column. |
| A1, A2, A4, A5, A6 Product Table table semantics | TASK-281-05 | Table caption, `scope`, section/table labels, and local runtime alert/live semantics without redundant wrapper table roles. |
| UX-05, BF-01, BF-02, A7 product media and excerpt columns | TASK-281-06 | Use existing runtime card data; media URL resolution and lazy thumbnail behavior must stay backend-owned/runtime-safe. |
| BF-07 section heading | TASK-281-06 | Product Table-owned contextual header above the table. |
| UX-02, UX-04, UX-06, UX-08, BF-15 front-end controls | TASK-281-07 | Pagination/load-more, search, filters, and sortable headers with explicit route/security policy. |
| UX-01, UX-10, BF-05, BF-06, BF-08, BF-09, BF-10, BF-12 layout/table styling | TASK-281-08 | Variants, density, zebra/hover, max-width, sticky header, typography. `UX-10` is the report summary alias for the row-hover finding documented as `BF-10`. |
| UX-07, UX-09, BF-14 export/currency/diagnostics | TASK-281-09 | CSV/clipboard, locale-aware money formatting, read-only runtime diagnostics. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-281-10 | Final documentation and validation evidence. |

## No-Action Report Findings

| Report finding | Decision | Reason |
|---|---|---|
| Empty-state text editing and live admin preview | No TASK-281 implementation leaf | The report confirms this already works. Keep existing coverage unless nearby implementation changes empty-state behavior. |
| Surface color controls and Clear buttons | No TASK-281 implementation leaf | The report confirms all five Product Table surface controls work. Shared Clear/token semantics stay TASK-256-02. |
| Mobile horizontal scroll | No TASK-281 implementation leaf | The report confirms `overflow-x-auto` works at 375px. TASK-281-08 may add better responsive layout controls, but must preserve this baseline. |
| Collections empty placeholder in source editor | No TASK-281 implementation leaf | The report marks the current placeholder as informational and working. |

## Sub-Tasks

- [x] TASK-281-01: Product Table Admin Preview Resolver Parity
- [x] TASK-281-02: Product Table Column Labels and Visibility Model
- [x] TASK-281-03: Product Table Status Stock and Row State Presentation
- [x] TASK-281-04: Product Table Product Links and Action Column
- [x] TASK-281-05: Product Table Accessibility and Runtime Semantics
- [ ] TASK-281-06: Product Table Media Excerpt and Section Header Context
- [ ] TASK-281-07: Product Table Pagination Search Filter and Sorting UX
- [ ] TASK-281-08: Product Table Variants Density Layout and Sticky Header
- [ ] TASK-281-09: Product Table Export Currency and Advanced Diagnostics
- [ ] TASK-281-10: Product Table Report, Docs, Changelog, and Closure

## Implementation Order

1. Rebase over relevant TASK-256 shared fixes first. Product Table leaves must
   consume shared safe-output, token, and runtime helpers instead of duplicating
   them.
2. Complete TASK-281-01 first so later Product Table editor controls can be
   verified in admin canvas without publishing every test page.
3. Complete TASK-281-02 before any new columns are added. The final column
   registry, labels, and visibility policy become the base for later leaves.
4. Complete TASK-281-03 before links/actions so row state and status copy stay
   stable when rows become interactive.
5. Complete TASK-281-04 before public search/sort controls because navigation
   and row actions define safe product URL handling.
6. Complete TASK-281-05 before TASK-281-07/08 add more table interactions and
   visual variants.
7. Complete TASK-281-06 after the column registry is stable.
8. Complete TASK-281-07 only after route/security behavior is explicit and
   tested.
9. Complete TASK-281-08 after the base renderer/accessibility model is stable.
10. Complete TASK-281-09 after the data/export surface is final.
11. Complete TASK-281-10 last after code, tests, report evidence, widget docs,
    changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation because parallel
  agents frequently touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-281*` files, Product Table owner files, focused Product Table
  tests, Product Table docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board, re-read it immediately
  before staging and verify the cached diff contains only TASK-281 rows/counts
  owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes by itself. Implementation leaves
must keep route ownership explicit:

- Endpoint visibility: unchanged unless a leaf explicitly introduces a Product
  Table preview/runtime query endpoint.
- Auth model: authenticated admin editing for admin preview; public runtime
  rendering for published pages.
- RBAC: admin preview/data queries must require `commerce:read`; widget edits
  continue to require page/template write permissions through existing admin
  flows.
- CSRF: required for any admin write. Existing read-only commerce query preview
  routes may remain non-mutating; any new POST endpoint must document whether it
  needs CSRF or uses a read-only exception.
- Rate-limit bucket: reuse the existing admin/session bucket for admin preview;
  if a public runtime query endpoint is added, use an explicit public read
  bucket with clamped pagination/search input.
- Reject-unknown validation: every new Product Table persisted field must be
  added to `productTableSchema` with `additionalProperties: false`, normalized
  through `normalizeProductTableData()`, and covered by validator tests.
- Anti-abuse: public search/filter/sort/export controls must not expose draft
  products, provider secrets, unbounded queries, raw SQL-like operators, raw
  HTML, inline scripts, or arbitrary class names.
- Secret handling: no secrets, private media URLs, privileged diagnostics, or
  provider keys in widget JSON, browser cache, Playwright report notes, or
  changelog entries.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and that proof is recorded.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts` when runtime
  hydration/query behavior changes.
- `bun test tests/unit/commerce/commerceRoutes.test.ts` or the current route
  registration/error-mapping suite when commerce routes change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget metadata changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
  widget renderer behavior changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` when schema, editor modes, runtime
  variants, accessibility, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Product Table pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Product Table report finding is either owned by TASK-256, covered by a
  TASK-281 physical leaf, marked no-action with evidence, or explicitly
  deferred by TASK-281-10 with a reason.
- TASK-281 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `product-table`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Admin preview and public runtime evidence are kept distinct because BUG-00 is
  specifically about admin/front parity.
- Final closure records report evidence, task status updates, changelog, and
  exact validation output.
