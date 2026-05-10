# TASK-252-06-03: Pricing Plans Tiers Billing Toggle and Highlight

# FileName: TASK-252-06-03_Pricing_Plans_Tiers_Billing_Toggle_and_Highlight.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Add tier, highlight, monthly/annual toggle, and custom price controls without
introducing checkout/payment logic.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/pricing-plans/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md`; for this leaf, start from the current owner fields `header`, `plans`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: tier cards, highlighted plan, monthly/annual billing toggle, enterprise/custom price, and feature icon/checkmark style from `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md`; add schema-owned billing labels/price fields in `core/widgets/core/pricingPlans.tsx`.
- Adapt: discount badges, explicit comparison-row schema, feature groups, and
  mobile comparison fallback remain conditional. Preserve the current
  `comparison-rows` style variant that derives comparison output from plan
  feature strings; either document it as current-state debt or, if upgrading it,
  move explicit comparison rows, mobile fallback, renderer, editor, and tests
  together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `pricing-plans`.
- `Visual`: `Plans`, `Billing toggle`, `Feature rows`, `CTA and highlight`.
- `Advanced`: `Legacy price mapping`, `No-checkout diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/pricingPlans.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/vitest/widgets/pricingPlans.test.tsx`
- `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-03_Pricing_Plans_Tiers_Billing_Toggle_and_Highlight.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizePricingPlansData(data: PricingPlansData): PricingPlansData {
  return {
    header: normalizePricingPlansHeader(data.header),
    plans: normalizePricingPlansPlans(data.plans),
    style: normalizePricingPlansStyle(data.style, {
      preserveLegacyComparisonRows: true,
      explicitComparisonRowsEnabled: isPricingComparisonRowsAdaptEnabled(data),
    }),
  };
}

function normalizePricingPlanItem(item: PricingPlanItem, index: number): PricingPlanItem {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `pricing-plans-${index + 1}`),
  };
}

function PricingPlansVisualEditor(props: WidgetEditorProps<PricingPlansData>) {
  return (
    <WidgetEditorSection id="pricing-plans.plans" title="Plans">
      {props.value.plans.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`pricing-plans.plans.${index}.name`} label="Name" data-widget-control={`pricing-plans.plans.${index}.name`}>
          <Input value={item.name ?? ""} onChange={handleControlChange} />
        </WidgetControlRow>
      ))}
      <WidgetControlRow id="pricing-plans.billing.enabled" label="Billing toggle" data-widget-control="pricing-plans.billing.enabled">
        <Switch checked={props.value.billing?.enabled ?? false} onCheckedChange={(enabled) => props.onChange(updatePricingBilling(props.value, { enabled }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/pricingPlans.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `pricing-plans` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `pricing-plans` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/pricingPlans.tsx`.
- Anti-abuse:
  - Link and media fields must keep existing safe URL/media validation.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-03_Pricing_Plans_Tiers_Billing_Toggle_and_Highlight.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `pricing-plans` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
