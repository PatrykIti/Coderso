# TASK-278-02: Pricing Plans Content Wizard and Destructive Edit UX

# FileName: TASK-278-02_Pricing_Plans_Content_Wizard_and_Destructive_Edit_UX.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-06-03, TASK-278, TASK-313
**Status:** Done (2026-05-19)

---

## Overview

Improve Pricing Plans editor authoring flow: Wizard must cover the minimum
useful plan content, destructive plan removal must be confirmable or undoable,
highlighted plans must be visible in the plan list, disabled billing labels must
not look active, duplicate Advanced token controls must be resolved under the
shared mode policy, Advanced reset/fix controls must use product-readable copy,
and newly added feature rows should be ready for immediate editing.

This leaf must not implement the reopened shared fixed-count plan-count/variant
synchronization work from `TASK-313`. It assumes that shared contract has
landed and keeps this scope to Pricing Plans authoring affordances.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:218-220` - UX-04 Wizard lacks
  badge, CTA, features, and period.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:206-208,372-374` - UX-01
  Advanced duplicates Visual token controls.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:222-224` - UX-05 Advanced
  "Normalization and safeguards" copy is unclear.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:226-232` - UX-06 and UX-07
  remove confirmation and highlighted indicator.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:234-236` - UX-08 billing
  labels visible when disabled.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:343-345` - remove plan
  observation.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:378-398` - disabled billing
  labels, Wizard limits, and feature autofocus observation.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:450-455` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add Wizard fields for period, badge, CTA label/href, and one or more features; remove/read-only-label duplicated Pricing Plans Advanced spacing/radius controls according to TASK-256 shared mode policy; rename/explain Pricing Plans Advanced reset/fix controls after TASK-256 Advanced ownership is settled; add highlighted list badge; gate billing labels when disabled; add confirm/undo remove behavior; focus newly added feature input. |
| `core/widgets/core/pricingPlans.tsx` | Add only normalizer/schema support required by Wizard-owned fields if not already present. Do not duplicate TASK-256 variant/count logic. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover Wizard content fields, Advanced duplicate-token cleanup, Advanced reset/fix copy, disabled billing label behavior, highlighted list indicator, remove confirmation/undo, and feature autofocus. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Update only if schema/default ownership changes. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document Wizard minimum fields and destructive-edit behavior. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark UX-01/UX-04/UX-05/UX-06/UX-07/UX-08 and feature autofocus fixed or deferred. |

## Implementation Pseudocode

```tsx
function PricingPlanWizardCard({ plan, index, onPatch }) {
  return (
    <PlanEditorCard>
      <Input label="Name" value={plan.name} />
      <Input label="Price" value={plan.price} />
      <Input label="Period" value={plan.period} />
      <Input label="Badge" value={plan.badge} />
      <Input label="CTA label" value={plan.ctaLabel} />
      <Input label="CTA URL" value={plan.ctaHref} />
      <FeatureQuickList planIndex={index} maxInitialRows={3} />
    </PlanEditorCard>
  );
}

function requestRemovePlan(planIndex: number) {
  setPendingRemoval(planIndex);
}
```

Data flow:

- Wizard patches the same `plans[]` fields used by Visual mode.
- Remove confirmation/undo works on normalized plan arrays but restores the
  removed plan object without regenerating unrelated plan ids.
- Billing toggle label controls read from `billingToggle` and become inactive
  when `billingToggle.enabled !== true`.
- Feature autofocus is editor-only state and never persists into widget data.
- Advanced reset/fix buttons call the existing normalization helpers but expose
  Pricing Plans-specific labels and helper copy instead of raw normalization
  jargon.
- Advanced spacing/radius duplicate Visual controls are either removed or marked
  as read-only diagnostics according to the shared TASK-256 mode-ownership
  policy, without creating a second writer for the same fields.

Error handling:

- Removal cannot drop below `pricingPlanMin`.
- Undo restores the exact removed plan payload at its previous index when still
  within bounds.
- If toast infrastructure is not available in this editor layer, use the repo's
  existing confirm dialog pattern instead of inventing a widget-local modal.
- Disabled billing label fields are either hidden or visibly disabled and must
  not mutate inactive labels accidentally.
- Feature autofocus should fall back silently when the field no longer exists
  due to quick subsequent edits.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged unless this leaf adds schema fields.
- Anti-abuse: Wizard CTA URL fields still flow through Pricing Plans
  `normalizeWidgetSafeHref`; no raw HTML or script fields are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx` if schema
  behavior changes.
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
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` with UX-01, UX-04, UX-05,
  UX-06, UX-07, UX-08, and feature-autofocus evidence or deferral notes.
- `_docs/_TASKS/TASK-278-02_Pricing_Plans_Content_Wizard_and_Destructive_Edit_UX.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Wizard can create a publishable Pricing Plans card without forcing the user
  into Visual mode for badge, period, CTA, and basic features.
- Removing a plan requires confirmation or offers a working undo path.
- Highlighted plan state is visible in the repeated plan list.
- Disabled billing-toggle label fields are not presented as active controls.
- Pricing Plans Advanced no longer presents duplicated spacing/radius controls
  as a second active editing surface.
- Advanced reset/fix controls have user-facing labels that explain the affected
  Pricing Plans data.
- Adding a feature supports immediate keyboard editing.
