# TASK-342-03: Commerce Populated Fixture Wave

# FileName: TASK-342-03_Commerce_Populated_Fixture_Wave.md

**Priority:** High
**Category:** Commerce + Widgets + Playwright + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-342-01
**Status:** To Do

---

## Overview

Re-prove populated public runtime for the three commerce widgets that currently
render only stable empty-state fixtures in the 2026-05-27 rerun:

- `product-gallery`
- `product-compare`
- `product-table`

This branch must not assume a renderer bug before proving the owner. The same
repo already has unit/UI evidence for populated runtime output, so the first
question is whether the current failure is a shared fixture/bootstrap drift or a
real widget-local regression.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_TABLE_WIDGET.md`
- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` still marks the three
  public routes as published smoke fixtures.
- Current widget/unit/UI coverage already proves non-empty runtime paths in
  repo-owned tests, so this branch starts with a shared fixture/bootstrap spike
  rather than immediately blaming the renderer.

## Shared Wave Boundary

In scope:

- shared smoke fixture/bootstrap ownership
- inventory/harness expectation drift if proven
- widget-local runtime/editor follow-up only after the shared fixture owner is
  ruled out
- targeted widget tests and populated Playwright replay

Out of scope:

- admin metadata-gap work
- unrelated commerce feature expansion
- generic catalog/editor redesign not needed to restore deterministic populated
  smoke fixtures

## Gate Rule

`TASK-342-03` is a gating subtask, not just a category label.

- It must prove and document the shared owner for commerce fixture recovery
  before `TASK-342-03-01`, `TASK-342-03-02`, or `TASK-342-03-03` begin widget-
  local implementation.
- If a shared smoke/bootstrap or inventory owner is required, that shared work
  must land first and the widget leaves then close with route-specific
  populated-proof reruns, not with empty-state-only documentation.

## Files To Change

| File | Required change |
|---|---|
| `scripts/playwright-widget-contract-smoke.ts` | Touch only if the commerce trio needs deterministic bootstrap, better empty-fixture evidence handling, or stricter route classification. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | Update only if fixture expectations or notes are wrong today. |
| `tests/unit/playwright-widget-contract-smoke.test.ts` | Cover any harness/inventory/bootstrap contract change. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Touch only if Product Gallery admin preview or authoring contributes to the populated replay failure. |
| `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` | Touch only if Product Compare admin preview or authoring contributes to the populated replay failure. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Touch only if Product Table admin preview or authoring contributes to the populated replay failure. |
| `core/widgets/core/productGallery.tsx` | Touch only if Product Gallery runtime logic is proven to be the owner after fixture/bootstrap reconciliation. |
| `core/widgets/core/productCompare.tsx` | Touch only if Product Compare runtime logic is proven to be the owner after fixture/bootstrap reconciliation. |
| `core/widgets/core/productTable.tsx` | Touch only if Product Table runtime logic is proven to be the owner after fixture/bootstrap reconciliation. |
| `tests/vitest/widgets/productGallery.test.tsx` | Extend only if Product Gallery runtime behavior changes. |
| `tests/vitest/widgets/productCompare.test.tsx` | Extend only if Product Compare runtime behavior changes. |
| `tests/vitest/widgets/productTable.test.tsx` | Extend only if Product Table runtime behavior changes. |
| `tests/vitest/ui/product-gallery-admin-preview.test.tsx` | Extend only if Product Gallery admin preview/bootstrap behavior changes. |
| `tests/vitest/ui/product-compare-admin-preview.test.tsx` | Extend only if Product Compare admin preview/bootstrap behavior changes. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Extend only if Product Table preview/bootstrap behavior changes. |

## Sub-Tasks

- [ ] TASK-342-03-01: Product Gallery Populated Fixture and Runtime Replay
- [ ] TASK-342-03-02: Product Compare Populated Fixture and Runtime Replay
- [ ] TASK-342-03-03: Product Table Populated Fixture and Runtime Replay

## Implementation Order

1. Complete this gate task first:
   - decide whether the current failure owner is shared fixture/bootstrap,
     inventory/harness drift, or a widget-local runtime issue
   - record the exact owner files and test updates for that choice
2. Land the shared fixture/bootstrap or harness fix first if that owner is
   proven.
3. Land `product-gallery` first because it is the most representative commerce
   card fixture and already has richer preview/runtime tests.
4. Land `product-compare` second.
5. Land `product-table` last because it has the largest widget/runtime surface
   and should build on the shared fixture decision first.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts` if the harness
  or inventory changes
- targeted Vitest suites named by each leaf
- targeted public `playwright-cli` replay proving a populated runtime route or
  a deterministic fixture/bootstrap closure

## Documentation Updates Required

- Update the affected 27-05 per-widget report(s) when a fixture-gap leaf closes
  or is superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- The commerce wave records an explicit shared owner decision before widget-
  local leaves start implementation.
- The three commerce widgets no longer rely on ambiguous empty-state-only smoke
  fixtures.
- Each widget leaf ends with populated public-route proof after the shared fix
  and/or widget-local fix lands.
- Widget-local code is not changed unless the shared fixture owner is ruled out.

## Progress Notes

- 2026-05-28 reconciliation evidence points to fixture-data drift as the
  current primary owner:
  - `GET /admin/api/commerce/products` returned `0` products in the local
    environment.
  - the three public smoke routes are published and reachable, but they render
    stable empty-state copy instead of populated product output.
  - this branch should therefore start from deterministic product/bootstrap
    recovery and only touch widget-local runtime code if populated replay still
    fails after the shared data owner is restored.
