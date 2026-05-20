# TASK-278-05: Pricing Plans Comparison Rows Product Table

# FileName: TASK-278-05_Pricing_Plans_Comparison_Rows_Product_Table.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-278
**Status:** Done (2026-05-19)

---

## Overview

Improve the `comparison-rows` Pricing Plans product table with plan hierarchy in
the header, header CTA/badge treatment, and sticky header behavior for long
feature-derived comparisons.

This leaf builds on the shared table accessibility baseline that
`TASK-256-06-03` already restored on this branch, including caption, `scope`,
plan labels, and CTA context. `TASK-278-05` owns only the Pricing Plans comparison product
experience on top of the current feature-derived rows; it does not widen into
explicit comparison-row or mobile collapse redesign.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:191-194` - BUG-07
  comparison header lacks badge and highlighted hierarchy.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:272-273` - BF-11 sticky
  header.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:421-433` - comparison rows
  render is correct after the shared accessibility baseline landed; the
  remaining open work here is sticky header behavior and product hierarchy.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:465` - BF-11 high-priority
  missing functionality.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` - comparison table is Adapt, but
  this leaf stays on the current feature-derived row model.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add comparison header hierarchy and a bounded sticky-header setting while keeping the current feature-derived row model. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add comparison-specific Visual controls and diagnostics only when `comparison-rows` is selected. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover comparison header badge/CTA hierarchy, sticky header marker/classes, and legacy feature-derived rows. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover comparison-specific editor controls and variant-gated visibility. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if renderer markers or shared output assumptions change. |
| `tests/unit/widgets/validator.test.ts` | Cover the bounded `comparison` settings schema. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document comparison rows behavior and the bounded comparison settings. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark BUG-07/BF-11 fixed or deferred. |

## Implementation Pseudocode

```tsx
type PricingComparisonSettings = {
  stickyHeader?: boolean;
  showHeaderCta?: boolean;
  showHeaderBadges?: boolean;
};

function PricingComparisonHeaderCell({ plan, settings }) {
  return (
    <th className={settings.stickyHeader ? "sticky top-0 z-10" : undefined}>
      {settings.showHeaderBadges && plan.badge ? <PlanBadge plan={plan} /> : null}
      <PlanNamePrice plan={plan} />
      {settings.showHeaderCta ? <PlanCta plan={plan} context="header" /> : null}
    </th>
  );
}
```

Data flow:

- Editor controls patch a bounded `comparison` settings object only when the
  selected variant is `comparison-rows`.
- Normalization preserves the current feature-derived row behavior.
- `PricingComparisonRowsLayout` receives normalized plans, comparison settings,
  and the shared static billing-cycle/default-cycle state from the widget render
  model.
- Renderer emits stable table/header markers for product hierarchy tests.

Error handling:

- If sticky header conflicts with admin canvas clipping, keep the setting off by
  default and document the exact container requirement.
- Legacy feature-derived comparison rows remain the only row model in this leaf.
- Header CTA must reuse the same safe link normalization as plan card CTA.
- `TASK-256-06-03` already closed the table caption/scope/ARIA baseline; this leaf
  must not regress or re-claim that shared work while closing the Pricing Plans
  product hierarchy.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: the bounded `comparison` settings object must use
  a strict schema.
- Anti-abuse: comparison labels, badges, and CTA copy render as text; links keep
  existing safe-href normalization; no raw HTML or scripts.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or shared output assumptions change.
- `bun test tests/unit/widgets/validator.test.ts`
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
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-278-05_Pricing_Plans_Comparison_Rows_Product_Table.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- `comparison-rows` can show plan badge/highlight/CTA hierarchy without forcing
  users to inspect the bottom action row first.
- Long comparison tables have a documented sticky-header behavior or a clearly
  recorded product deferral.
- Legacy feature-derived comparison rows remain backward compatible.
- The task does not overclaim TASK-256 table accessibility findings.
