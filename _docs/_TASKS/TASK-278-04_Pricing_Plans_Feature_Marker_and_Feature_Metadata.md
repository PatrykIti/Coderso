# TASK-278-04: Pricing Plans Feature Marker and Feature Metadata

# FileName: TASK-278-04_Pricing_Plans_Feature_Marker_and_Feature_Metadata.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-03, TASK-278
**Status:** To Do

---

## Overview

Replace the Pricing Plans `icon` marker placeholder with a truthful bounded
feature-marker model and add optional per-feature metadata for premium,
included, coming-soon, or emphasis states.

This leaf must not weaken TASK-256 accessibility work. Feature markers must
remain text-safe and screen-reader-friendly.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:214-216` - UX-03 `icon`
  renders a hardcoded diamond placeholder.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:257-258` - BF-06 custom
  feature icons and per-feature premium states.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:366-369` - Playwright icon
  marker observation.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:469` - low-priority custom
  feature icons summary.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` - icons/checkmarks per feature
  are Keep, but feature data remains text-first.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add a typed feature item model or legacy adapter from string features, replace `icon` placeholder with bounded marker choices, and render per-feature metadata safely. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add controls for marker choice and optional per-feature status/icon presets without raw SVG or custom HTML. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover legacy string features, feature metadata normalization, marker rendering, and no placeholder diamond for `icon`. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover feature metadata editing and marker option behavior. |
| `tests/unit/widgets/validator.test.ts` | Cover schema reject-unknown behavior for feature item objects if introduced. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document feature string legacy support and the new metadata model. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark UX-03/BF-06 fixed or deferred. |

## Implementation Pseudocode

```tsx
type PricingFeatureStatus = "included" | "premium" | "coming-soon";
type PricingFeatureIcon = "check" | "sparkle" | "lock" | "clock";

type PricingFeatureItem = {
  text: string;
  status?: PricingFeatureStatus;
  icon?: PricingFeatureIcon;
};

function normalizePricingFeature(input: string | Partial<PricingFeatureItem>): PricingFeatureItem | null {
  const text = typeof input === "string" ? input.trim() : normalizeText(input.text);
  if (!text) return null;
  return {
    text,
    status: isFeatureStatus(input.status) ? input.status : "included",
    icon: isFeatureIcon(input.icon) ? input.icon : undefined,
  };
}
```

Data flow:

- Editor controls patch feature rows through a normalized feature adapter.
- Legacy `features: string[]` remains the persistence-compatible input shape
  unless this leaf moves schema/editor/renderer/tests to object rows together.
- `PricingPlansBlock` maps normalized feature rows to bounded marker/status
  output.
- Renderer exposes text-safe feature labels and deterministic marker classes.

Error handling:

- Legacy `features: string[]` remains valid and normalizes to feature items at
  render/editor boundaries without destructive rewrites.
- Unknown feature status/icon values fall back to deterministic defaults.
- If the schema keeps `features[]` as strings for this pass, remove or rename
  the misleading `Icon` option instead of exposing a placeholder.
- Feature icon presets must be implemented through local React/lucide icons or
  text-safe symbols already accepted by the design system, not user-authored
  SVG/HTML.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new feature item objects must reject unknown fields.
- Anti-abuse: no raw HTML, script, user-provided SVG, or unbounded icon names.
  Feature copy renders as text only.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if feature item schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-278-04_Pricing_Plans_Feature_Marker_and_Feature_Metadata.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- The `Icon` marker no longer renders an unexplained hardcoded diamond placeholder.
- Feature rows can express bounded per-feature state without raw HTML or custom
  icon payloads.
- Legacy `features: string[]` payloads remain compatible.
- Editor and renderer tests cover marker and metadata behavior.
