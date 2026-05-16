# TASK-278-05: Pricing Plans Comparison Rows Product Table

# FileName: TASK-278-05_Pricing_Plans_Comparison_Rows_Product_Table.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-278
**Status:** To Do

---

## Overview

Improve the `comparison-rows` Pricing Plans product table with plan hierarchy in
the header, optional header CTA/badge treatment, and sticky header behavior for
long comparisons.

This leaf starts after TASK-256 repairs baseline table accessibility such as
caption, `scope`, plan labels, and CTA context. TASK-278-05 owns only the
Pricing Plans comparison product experience.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:191-194` - BUG-07
  comparison header lacks badge and highlighted hierarchy.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:272-273` - BF-11 sticky
  header.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:421-433` - comparison rows
  render is correct, but sticky header and baseline accessibility gaps remain.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:465` - BF-11 high-priority
  missing functionality.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` - comparison table is Adapt and
  should only expand with explicit rows and mobile fallback if moved together.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add comparison header hierarchy, optional sticky header flag, and optional explicit comparison-row model only if editor/schema/tests move together. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add comparison-specific Visual controls and diagnostics only when `comparison-rows` is selected. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover comparison header badge/CTA hierarchy, sticky header marker/classes, and legacy feature-derived rows. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover comparison-specific editor controls and variant-gated visibility. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if renderer markers or shared output assumptions change. |
| `tests/unit/widgets/validator.test.ts` | Cover schema changes if explicit comparison rows or sticky settings are added. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document comparison rows behavior and any explicit-row model. |
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

- Editor controls patch `comparison` settings only when the selected variant is
  `comparison-rows`.
- Normalization preserves current feature-derived row behavior unless explicit
  comparison rows are introduced in this same leaf.
- `PricingComparisonRowsLayout` receives normalized plans, comparison settings,
  and the active billing cycle from the widget render model.
- Renderer emits stable table/header markers for product hierarchy tests.

Error handling:

- If sticky header conflicts with admin canvas clipping, keep the setting off by
  default and document the exact container requirement.
- Legacy feature-derived comparison rows remain the fallback unless an explicit
  comparison row schema is introduced in the same leaf.
- Header CTA must reuse the same safe link normalization as plan card CTA.
- TASK-256 remains responsible for table caption/scope/ARIA baseline; this leaf
  should not claim those findings as product closure unless the shared task has
  landed.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: comparison settings and rows must use strict
  schemas if introduced.
- Anti-abuse: comparison labels, badges, and CTA copy render as text; links keep
  existing safe-href normalization; no raw HTML or scripts.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or shared output assumptions change.
- `bun test tests/unit/widgets/validator.test.ts` if schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

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
