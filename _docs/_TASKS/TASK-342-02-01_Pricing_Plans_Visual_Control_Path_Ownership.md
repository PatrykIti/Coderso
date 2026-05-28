# TASK-342-02-01: Pricing Plans Visual Control Path Ownership

# FileName: TASK-342-02-01_Pricing_Plans_Visual_Control_Path_Ownership.md

**Priority:** High
**Category:** Widgets + Admin UI + Playwright + QA
**Estimated Effort:** Small
**Dependencies:** TASK-342-01, TASK-342-02
**Status:** In Progress (2026-05-28)

---

## Overview

Repair the `pricing-plans` metadata-gap by making the flagged Visual controls
emit truthful persisted-path ownership metadata without changing the current
swatch-first user experience.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRICING_PLANS_WIDGET.md`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `tests/vitest/widgets/pricingPlans.test.tsx`

Current local evidence:

- Public runtime passes.
- Visual and Advanced both render correctly.
- The gap is limited to Visual control ownership metadata for:
  - `pricing-plans.plan.{n}.surface`
  - `pricing-plans.style.cardSurface`
  - `pricing-plans.style.cardBorder`
  - `pricing-plans.style.highlightRing`
  - `pricing-plans.style.spacing`
  - `pricing-plans.style.radius`
  - `pricing-plans.style.featureMarker`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add truthful `path` ownership to the flagged Visual controls or migrate them to a shared path-aware control helper. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if the local swatch-summary color wrapper is replaced with the shared control seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if the shared swatch-summary helper needs a small extension. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Add a strict assertion that the flagged Visual controls now expose persisted paths. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Extend only if editor refactor changes contract-visible behavior. |

## Implementation Pseudocode

```ts
type PricingPlansColorFieldProps = {
  id: string;
  path: string;
  label: string;
  value?: string;
  onChange: (next: string) => void;
  onClear?: () => void;
};

function PricingPlansColorField({ id, path, ...rest }: PricingPlansColorFieldProps) {
  return <WidgetControlRow id={id} path={path} label={rest.label} actions={...}>{...}</WidgetControlRow>;
}

// plan-level fields must use persisted paths, not display ids
path={`plans.${planIndex}.surface`}

// style-level fields must use persisted style paths
path="style.cardSurface"
path="style.cardBorder"
path="style.highlightRing"
path="style.spacing"
path="style.radius"
path="style.featureMarker"

test("pricing plans visual controls expose persisted widget paths", async () => {
  const controls = collectWritableControls("pricing-plans", "visual");
  expect(controls).toContainEqual({ id: "pricing-plans.style.spacing", path: "style.spacing" });
  expect(controls).toContainEqual({ id: "pricing-plans.style.radius", path: "style.radius" });
  expect(controls).toContainEqual({ id: "pricing-plans.style.featureMarker", path: "style.featureMarker" });
});
```

Data flow:

- Keep the current persisted data model unchanged.
- Repair DOM metadata only by pointing each rendered control at the correct
  persisted path.
- Do not use display-only ids like `pricing-plans.plan.1.surface` as a fake
  persisted path.

Error handling:

- If the safest fix is to reuse `SharedColorControl`, keep the current
  clear/theme-default/transparent semantics identical.
- Do not weaken the smoke contract by changing control ownership to `action` or
  hiding the real control from the scan.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- targeted `playwright-cli` replay or single-widget smoke proving
  `pricing-plans` no longer reports `metadata-gap`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRICING_PLANS_WIDGET.md` when the
  metadata-gap is closed or superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `pricing-plans` no longer reports `metadata-gap` in the targeted rerun.
- The flagged controls expose truthful persisted paths.
- No user-facing Pricing Plans editing behavior regresses.
