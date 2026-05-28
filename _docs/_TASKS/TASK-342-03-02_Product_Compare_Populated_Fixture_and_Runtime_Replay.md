# TASK-342-03-02: Product Compare Populated Fixture and Runtime Replay

# FileName: TASK-342-03-02_Product_Compare_Populated_Fixture_and_Runtime_Replay.md

**Priority:** High
**Category:** Commerce + Widgets + Playwright + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-342-01, TASK-342-03
**Status:** To Do

---

## Overview

Turn the current Product Compare public smoke from an empty-state-only fixture
into a deterministic populated runtime replay, or prove with repo-owned
evidence that the remaining issue belongs to shared fixture/bootstrap ownership
rather than the Product Compare renderer.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `core/widgets/core/productCompare.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/ui/product-compare-admin-preview.test.tsx`

Current local evidence:

- Public route `/test-product-compare-0516` returns `200`.
- The current runtime shows:
  - `No products to compare`
  - `Update source filters or publish products.`
- Repo-owned tests already prove populated matrix/cards runtime output and admin
  preview behavior, so implementation must first verify whether the public
  smoke issue is:
  - stale query/filter fixture data,
  - missing deterministic bootstrap content,
  - or a Product Compare-specific runtime regression after a known-good
    populated fixture is restored.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `scripts/playwright-widget-contract-smoke.ts` | Touch only if Product Compare needs shared fixture/bootstrap support or better empty-fixture evidence handling. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | Update only if Product Compare fixture expectation metadata is wrong today. |
| `tests/unit/playwright-widget-contract-smoke.test.ts` | Cover any harness/inventory/bootstrap change. |
| `core/widgets/core/productCompare.tsx` | Touch only if a known-good populated fixture still exposes Product Compare runtime drift. |
| `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` | Touch only if the replay exposes Product Compare preview/query drift. |
| `tests/vitest/widgets/productCompare.test.tsx` | Extend when Product Compare runtime behavior changes. |
| `tests/vitest/ui/product-compare-editor-wave.test.tsx` | Extend when Product Compare authoring/query behavior changes. |
| `tests/vitest/ui/product-compare-admin-preview.test.tsx` | Extend when Product Compare preview/bootstrap behavior changes. |

## Implementation Pseudocode

```ts
1. Re-open the Product Compare fixture page and inspect its current source/query
   state plus any resolved admin-preview payload.
2. Re-run Product Compare against a known-good populated product dataset:
   - if shared smoke/bootstrap owns the missing content, fix that owner first
   - else, continue into Product Compare runtime/query logic
3. After the owner is proven, update tests and rerun public Playwright proof:
   expect(populatedComparisonHeaders > 0);
   expect(pageText).not.toContain("No products to compare");

Decision gate:
- If admin preview resolves rows but the public route stays empty, investigate
  Product Compare runtime/query/render mapping.
- If preview and public route are both empty, treat shared fixture/bootstrap or
  page-source drift as the primary owner first.
```

Data flow:

- Shared fixture/bootstrap evidence decides whether this leaf touches Product
  Compare code at all.
- If widget code changes, keep persisted Product Compare schema backward
  compatible.

Error handling:

- Do not "fix" the report by weakening the empty-fixture classifier while the
  public route still shows an actual empty state.
- If the route remains empty but the root cause is shared/bootstrap-owned,
  record that and keep Product Compare runtime unchanged.

## Security Contract

No API routes are added by default.

- Endpoint visibility: none by default.
- Auth/RBAC/CSRF/rate-limit: unchanged unless a shared internal bootstrap owner
  is proven and documented separately.
- Reject-unknown validation: unchanged Product Compare schema stays strict.
- Anti-abuse: no new public write surface may be introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-admin-preview.test.tsx`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts` if the harness
  or inventory changes
- targeted public `playwright-cli` replay proving either populated compare
  output or a shared/bootstrap-only closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md` with
  the final classification and rerun outcome.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Product Compare ends with populated public runtime proof on
  `/test-product-compare-0516`.
- If the real fix was shared fixture/bootstrap work, this leaf still closes only
  after that shared fix produces populated proof for the Product Compare route.
- The final report no longer leaves Product Compare in an ambiguous
  empty-state-only status.
