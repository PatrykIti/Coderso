# TASK-278-03: Pricing Plans Billing Value Copy and Price Semantics

# FileName: TASK-278-03_Pricing_Plans_Billing_Value_Copy_and_Price_Semantics.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-278
**Status:** To Do

---

## Overview

Add Pricing Plans-owned value copy and price semantics around the billing model:
annual savings badges, optional structured currency/amount fields, and graceful
free/custom price display.

This leaf must not implement the TASK-256 billing-toggle interactivity repair.
It starts after TASK-256 makes the toggle truthful and then adds Pricing
Plans-specific product semantics around the working cycle state.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:251-255` - BF-04 annual
  savings badge and BF-05 adjacent plan description dependency.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:278-282` - BF-13 currency and
  BF-14 free-plan handling.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:408-419` - runtime toggle is
  broken, owned by TASK-256; this leaf must not duplicate that repair.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:461-465` - high-priority
  missing functionality summary.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` - discount badge is Adapt and
  pricing math must not be inferred in the renderer.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add schema/default/normalizer support for explicit savings labels and optional structured price metadata while preserving legacy `price` and `prices.*` strings. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add plan-level controls for savings copy, free/custom display text, and optional currency/amount fields if the schema introduces them. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover savings label rendering, free/custom price fallbacks, structured price normalization, and legacy string compatibility. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover editor controls for savings/free/custom/currency behavior. |
| `tests/unit/widgets/validator.test.ts` | Cover reject-unknown and accepted structured price payloads if schema changes. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document explicit savings copy and price semantics. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark BF-04/BF-13/BF-14 fixed or deferred. |

## Implementation Pseudocode

```tsx
type PricingPlanPriceMode = "text" | "structured" | "free" | "custom";

type PricingPlanPriceDisplay = {
  mode?: PricingPlanPriceMode;
  amount?: number;
  currency?: string;
  text?: string;
  freeLabel?: string;
  customLabel?: string;
  annualSavingsLabel?: string;
};

function resolvePlanPriceLabel(plan, cycle) {
  const display = normalizePriceDisplay(plan.priceDisplay);
  if (display.mode === "free") return display.freeLabel ?? "Free";
  if (display.mode === "custom") return display.customLabel ?? "Custom";
  if (display.mode === "structured") return formatCurrency(display.amount, display.currency);
  return cycle === "annual" ? plan.prices?.annual ?? plan.price : plan.prices?.monthly ?? plan.price;
}
```

Data flow:

- Editor controls patch `plans[index].priceDisplay` or equivalent bounded
  price fields.
- `normalizePricingPlansData` preserves legacy `price` and `prices.*` strings
  while deriving a safe render model for new fields.
- `PricingPlansBlock` receives the active cycle from TASK-256 runtime state and
  resolves display text without doing discount math.
- Renderer emits text-only price, savings, free, and custom labels.

Error handling:

- Renderer must not calculate discount percentages from monthly/annual prices.
  Savings labels are explicit author-provided copy.
- Missing structured amount/currency falls back to legacy text price.
- Unsupported currency values normalize to a safe uppercase 3-letter value or
  fall back to the legacy text price; define the exact behavior in tests.
- Existing saved payloads without `priceDisplay` render exactly through the
  current string path.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new price-display objects must reject unknown
  fields and clamp numeric values.
- Anti-abuse: price/savings copy is rendered as text only. No raw HTML, script,
  checkout/payment execution, or external provider calls are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-278-03_Pricing_Plans_Billing_Value_Copy_and_Price_Semantics.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Annual savings copy is explicit, author-owned, and rendered only when relevant
  to the active billing cycle.
- Free and custom plans render intentionally instead of falling through to an
  awkward `$0` default.
- Structured price support, if added, remains backward compatible with existing
  `price` and `prices.monthly/annual` strings.
- No payment, checkout, or dynamic pricing logic is introduced.
