# TASK-313: Shared Commerce Widget Money Minor-Unit Parity

# FileName: TASK-313_Shared_Commerce_Widget_Money_Minor_Unit_Parity.md

**Priority:** High
**Category:** Widgets + Commerce + Shared Contract + QA
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** Done (2026-05-19)

---

## Overview

Repair the shared commerce-widget money formatter so Product Gallery, Product
Table, and Product Compare render pricing in the same minor-unit contract as
the commerce admin surfaces.

This task was split out during `TASK-280` because `formatCommerceMoney()` is a
shared helper and the suspected cents/minor-unit bug must not be patched
locally inside a single widget family.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` `NEW-02`: the frontend
  rendered `$19,900.00` for a product shown as `$199.00` in Commerce admin.
- `core/admin/ui/commerce/CommerceTable.tsx` formats admin pricing with
  `amount / 100`, while `core/widgets/core/commerceWidgetShared.ts`
  `formatCommerceMoney()` currently formats the raw integer directly.
- `formatCommerceMoney()` is used by Product Gallery, Product Table, and
  Product Compare, so any fix is a shared commerce-widget contract change.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/commerceWidgetShared.ts` | Normalize shared widget money display to the same minor-unit contract used by commerce admin. |
| `tests/vitest/widgets/productGallery.test.tsx` | Update Product Gallery pricing expectations to the shared corrected contract. |
| `tests/vitest/widgets/productTable.test.tsx` | Update Product Table pricing expectations to the shared corrected contract. |
| `tests/vitest/widgets/productCompare.test.tsx` | Update Product Compare pricing expectations to the shared corrected contract. |
| `_docs/_TASKS/TASK-280-02_Product_Gallery_Compact_Variant_Surface_and_Price_Display.md` | Replace the open shared formatter suspicion with the final shared-task outcome once landed. |
| `_docs/_TASKS/TASK-279_Product_Compare_Widget_Playwright_Product_Followups.md` | Update only if Product Compare task docs need the shared formatter closure referenced explicitly. |
| `_docs/_TASKS/TASK-281_Product_Table_Widget_Playwright_Product_Followups.md` | Update only if Product Table task docs need the shared formatter closure referenced explicitly. |
| `_docs/_CHANGELOG/README.md` | Add a changelog index row when the shared formatter fix is completed. |
| `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-313-shared-commerce-widget-money-parity.md` | Add the shared formatter closure entry using the actual completion date when the task is done. |

## Implementation Pseudocode

Minor-unit formatting:

```ts
function formatCommerceMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return "-";
  const normalizedCurrency = normalizeCurrency(currency);
  const majorAmount = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorAmount);
}
```

Data flow:

- Runtime widgets continue to consume integer `pricing.amount` /
  `compareAtAmount` values from commerce services.
- The shared formatter converts those minor-unit integers into displayed
  currency strings at render time.
- Product Gallery, Product Table, and Product Compare tests are updated
  together so the helper change cannot silently fix one widget and regress the
  others.

Error handling:

- Invalid or non-finite amounts still render as `-`.
- Unsupported currencies keep the current fallback path, but the fallback must
  also use the normalized major-unit value.
- Do not widen this task into locale selection, tax formatting, or provider
  currency-conversion logic.

Regression-test shape:

```ts
test("shared commerce widget money formatter uses the admin minor-unit contract", () => {
  expect(formatCommerceMoney(19900, "USD")).toBe("$199.00");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged; this task affects rendering only.
- Anti-abuse: no raw HTML, inline scripts, arbitrary CSS, or client-owned price
  conversion rules are introduced.
- Secret handling: pricing display changes must not expose provider secrets,
  tax internals, or privileged commerce settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_TASKS/TASK-313_Shared_Commerce_Widget_Money_Minor_Unit_Parity.md`
- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-280-02_Product_Gallery_Compact_Variant_Surface_and_Price_Display.md`
- `_docs/_TASKS/TASK-279_Product_Compare_Widget_Playwright_Product_Followups.md` only if the shared formatter closure needs an explicit reference
- `_docs/_TASKS/TASK-281_Product_Table_Widget_Playwright_Product_Followups.md` only if the shared formatter closure needs an explicit reference
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-313-shared-commerce-widget-money-parity.md`

## Acceptance Criteria

- Shared commerce widget pricing matches the commerce admin minor-unit contract.
- Product Gallery, Product Table, and Product Compare all render the corrected
  amounts without local formatter duplication.
- The shared formatter fix is tracked and documented as its own task rather
  than being hidden inside a single widget family.
