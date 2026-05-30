# TASK-343-25: Pricing Plans Audit Remediation Family

# FileName: TASK-343-25_Pricing_Plans_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-343-30
**Status:** To Do

---

## Overview

Close Pricing Plans UX truthfulness drift where nominal plan-count copy can
promise cards that are not rendered, Wizard points to Visual-only controls,
destructive actions use inconsistent confirmation patterns, and the public
"Billing toggle" is static despite looking interactive.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRICING_PLANS_WIDGET.md:198-213`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/widgets/core/pricingPlans.tsx`

## Sub-Tasks

- [ ] Make fixed plan-count notices distinguish nominal capacity from actual
  rendered plan count.
- [ ] Remove or rewrite Wizard copy that points to controls not present in
  Wizard.
- [ ] Normalize destructive confirmation patterns for plan/feature removal and
  Advanced repair actions.
- [ ] Make the static billing cycle display look non-interactive, or add a
  runtime-safe interactive contract if product scope requires it.
- [ ] Coordinate color-clear/default state copy with `TASK-343-30`.
- [ ] Record report N0 fixture drift as a fixture caveat and explicitly defer or
  fix the hidden-badge renderer note (N9) so it is not lost.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Fix count copy, Wizard references, destructive confirmations, and color-state integration. |
| `core/widgets/core/pricingPlans.tsx` | Make billing display semantics and hidden badge behavior truthful. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover billing display and rendered count truthfulness. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover Wizard copy and destructive confirmation consistency. |

## Implementation Pseudocode

```ts
function describePlanCapacity(variant: PricingPlansVariantId, plans: PricingPlanItem[]) {
  const capacity = resolvePricingPlanCountForVariant(variant);
  return { capacity, rendered: Math.min(capacity, plans.length), missing: Math.max(0, capacity - plans.length) };
}

function resolveBillingDisplay(data: PricingPlansData) {
  if (data.billing?.enabled) {
    return { role: "status", "aria-live": "polite", mode: "static-cycle-display" };
  }
  return { role: "presentation", mode: "hidden" };
}
```

Do not reference a non-existing `billingToggleInteractive` field unless this
task intentionally widens `PricingPlansData`, schema/defaults, editor contract,
and renderer tests. The current public contract is a static billing status.

## Regression Test Shape

- Four-plan variants cannot claim four rendered cards when only three plans
  exist.
- Wizard copy references only available controls.
- Destructive actions share an intentional confirmation pattern.

## Security Contract

No API routes are added. CTA safe-link handling remains unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRICING_PLANS_WIDGET.md`.
- Update `_docs/_WIDGETS/PRICING_PLANS.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Pricing Plans no longer presents nominal or static states as active rendered
  controls.
- Destructive authoring paths are consistently guarded.
