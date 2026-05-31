# TASK-278-07: Pricing Plans Two-Plan Variant and Pack Docs

# FileName: TASK-278-07_Pricing_Plans_Two_Plan_Variant_and_Pack_Docs.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Runtime Render + Admin UI + Widget Packs
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-06-03, TASK-278
**Status:** Done (2026-05-19)

---

## Overview

Add a dedicated `two-plans` Pricing Plans variant for simple side-by-side
pricing pages, with schema/registry/editor/runtime/docs coverage and pack
matrix updates if readiness changes.

This leaf must not use a new variant to hide shared fixed-count logic. It
builds on the shared variant/count preservation contract already restored by
`TASK-256-06-03` on this branch.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:269-270` - BF-10 missing
  `two-plans` variant.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:459-470` - missing
  functionality summary.
- `core/widgets/core/pricingPlans.tsx` currently supports `three-plans`,
  `four-plans`, and `comparison-rows`.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` keeps tier cards and existing
  plan-count variants, but does not require a standalone grid-count field.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add `two-plans` variant, plan-count map entry, variant registration, renderer layout, and backward-compatible normalizer behavior. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add the variant to selector cards/dropdown and any variant-specific editor note after `TASK-256-06-03` restores shared fixed-count truthfulness. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover `two-plans` render markers, count, and layout class. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover selecting `two-plans` and editor count truthfulness after TASK-256. |
| `tests/vitest/widgets/renderer.test.tsx` | Cover shared renderer registration if needed. |
| `tests/unit/widgets/validator.test.ts` | Cover new variant acceptance and invalid variant rejection. |
| `tests/unit/widgets/registry.test.ts` | Cover variant registration assumptions after `two-plans` is added. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document the `two-plans` variant. |
| `_docs/WIDGETS.md` | Update widget variant inventory if it lists concrete Pricing Plans variants. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack completeness/readiness changes. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark BF-10 fixed or deferred. |

## Implementation Pseudocode

```tsx
export type PricingPlansVariantId =
  | "two-plans"
  | "three-plans"
  | "four-plans"
  | "comparison-rows";

const pricingVariantPlanCountMap = {
  "two-plans": 2,
  "three-plans": 3,
  "four-plans": 4,
  "comparison-rows": 3,
};
```

Data flow:

- Registry exposes `two-plans` through the existing Pricing Plans variant list.
- Editor variant controls call the shared `onVariantChange` path from TASK-256.
- `resolvePricingPlansVariant` and `resolvePricingPlanCountForVariant` normalize
  variant id and visible count.
- Renderer reuses `PricingCardsLayout` with a two-column class map.

Error handling:

- Unknown variants still resolve to the default `three-plans`.
- Existing saved `three-plans`, `four-plans`, and `comparison-rows` payloads do
  not change.
- If TASK-256 changes plan preservation, wire `two-plans` through the same owner
  instead of adding a local hidden-plan workaround.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: registry/schema variant validation must accept only
  known variants and reject unknown ids.
- Anti-abuse: no new user-authored HTML, script, links, or media fields.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`
- Run the repo-wide closeout gates requested for this wave before any transfer:
  `bun run lint`, `bun run test:bun`, `bun run test:vitest`,
  `bun run scan:security:strict`

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md` if readiness changes
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-278-07_Pricing_Plans_Two_Plan_Variant_and_Pack_Docs.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Authors can select a dedicated `two-plans` variant.
- Runtime output renders exactly two centered/side-by-side cards with stable
  responsive behavior.
- Variant registration, validator, editor, renderer, widget docs, and pack docs
  stay synchronized.
- The implementation does not duplicate TASK-256 hidden-plan or count-control
  logic.
