# TASK-342-03-01: Product Gallery Populated Fixture and Runtime Replay

# FileName: TASK-342-03-01_Product_Gallery_Populated_Fixture_and_Runtime_Replay.md

**Priority:** High
**Category:** Commerce + Widgets + Playwright + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-342-01, TASK-342-03
**Status:** Done (2026-05-28)

---

## Overview

Turn the current Product Gallery public smoke from an empty-state-only fixture
into a deterministic populated runtime replay, or prove with repo-owned
evidence that the remaining issue belongs to shared fixture/bootstrap ownership
rather than the Product Gallery renderer.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `core/widgets/core/productGallery.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `tests/vitest/ui/product-gallery-admin-preview.test.tsx`

Current local evidence:

- Public route `/test-product-gallery-widget` returns `200`.
- The current runtime shows:
  - `No products found`
  - `Adjust query filters or publish products.`
- Repo-owned tests already prove populated runtime cards, links, media, and
  view-all behavior, so implementation must first verify whether the public
  smoke issue is:
  - stale query/filter fixture data,
  - missing deterministic bootstrap content,
  - or a Product Gallery-specific runtime regression after a known-good
    populated fixture is restored.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `scripts/playwright-widget-contract-smoke.ts` | Touch only if Product Gallery needs shared fixture/bootstrap support or better empty-fixture evidence handling. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | Update only if Product Gallery fixture expectation metadata is wrong today. |
| `tests/unit/playwright-widget-contract-smoke.test.ts` | Cover any harness/inventory/bootstrap change. |
| `core/widgets/core/productGallery.tsx` | Touch only if a known-good populated fixture still exposes Product Gallery runtime drift. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Touch only if the replay exposes Product Gallery preview/query drift. |
| `tests/vitest/widgets/productGallery.test.tsx` | Extend when Product Gallery runtime behavior changes. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Extend when Product Gallery authoring/query behavior changes. |
| `tests/vitest/ui/product-gallery-admin-preview.test.tsx` | Extend when Product Gallery preview/bootstrap behavior changes. |

## Implementation Pseudocode

```ts
1. Re-open the Product Gallery fixture page and inspect its current source/query
   state plus any resolved admin-preview payload.
2. Re-run Product Gallery against a known-good populated product dataset:
   - if shared smoke/bootstrap owns the missing content, fix that owner first
   - else, continue into Product Gallery runtime/query logic
3. After the owner is proven, update tests and rerun public Playwright proof:
   expect(populatedCardCount > 0);
   expect(pageText).not.toContain("No products found");

Decision gate:
- If admin preview shows populated `resolved.items` but the public route stays
  empty, investigate Product Gallery runtime/query/render mapping.
- If admin preview and public route are both empty with the same fixture page,
  treat shared fixture/bootstrap or page-source drift as the primary owner first.
```

Data flow:

- Shared fixture/bootstrap evidence decides whether this leaf touches Product
  Gallery code at all.
- If widget code changes, keep persisted Product Gallery schema backward
  compatible.

Error handling:

- Do not "fix" the report by weakening the empty-fixture classifier while the
  public route still shows an actual empty state.
- If the route remains empty but the root cause is shared/bootstrap-owned,
  record that and keep Product Gallery runtime unchanged.

## Security Contract

No API routes are added by default.

- Endpoint visibility: none by default.
- Auth/RBAC/CSRF/rate-limit: unchanged unless a shared internal bootstrap owner
  is proven and documented separately.
- Reject-unknown validation: unchanged Product Gallery schema stays strict.
- Anti-abuse: no new public write surface may be introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-admin-preview.test.tsx`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts` if the harness
  or inventory changes
- targeted public `playwright-cli` replay proving either populated cards or a
  shared/bootstrap-only closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_GALLERY_WIDGET.md` with
  the final classification and rerun outcome.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Product Gallery ends with populated public runtime proof on
  `/test-product-gallery-widget`.
- If the real fix was shared fixture/bootstrap work, this leaf still closes only
  after that shared fix produces populated proof for the Product Gallery route.
- The final report no longer leaves Product Gallery in an ambiguous
  empty-state-only status.

## Completion Notes (2026-05-28)

- Product Gallery did not require widget-local runtime changes after the shared
  commerce fixture bootstrap was restored.
- Targeted proof passed:
  - `bun scripts/playwright-widget-contract-smoke.ts --session task-342-03-product-gallery --widget product-gallery --admin http://localhost:5173/admin --front http://localhost:3000 --output-json .tmp/task-342-03-product-gallery.json --output-md .tmp/task-342-03-product-gallery.md --strict`
- Direct public replay confirmed populated cards for:
  - `Fixture Starter Home`
  - `Fixture Urban Loft`
  - `Fixture Garden Suite`
