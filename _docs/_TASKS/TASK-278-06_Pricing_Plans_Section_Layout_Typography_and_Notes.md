# TASK-278-06: Pricing Plans Section Layout Typography and Notes

# FileName: TASK-278-06_Pricing_Plans_Section_Layout_Typography_and_Notes.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-278
**Status:** Done (2026-05-19)

---

## Overview

Add Pricing Plans-owned section layout controls: max-width presets, bounded
typography presets, and footer notes for pricing caveats such as VAT,
enterprise contact notes, or billing disclaimers.

This leaf must not create a generic rich slot system. Footer notes remain simple
Pricing Plans text fields unless a separate task expands widget slot contracts.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:263-267` - BF-08 typography
  and BF-09 footer notes.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:275-276` - BF-12
  configurable max-width.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:467-468` - medium-priority
  product summary.
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md` - feature groups and comparison
  rows are Adapt; this leaf should keep notes simpler than nested slot content.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Add schema/default/normalizer/render support for `layout.maxWidth`, bounded typography presets, and footer note copy. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add Visual controls for width, typography presets, and footer notes without duplicating Advanced token controls. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover layout width markers/classes, typography preset normalization, and footer note rendering. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover editor controls and their mode ownership. |
| `tests/unit/widgets/validator.test.ts` | Cover schema changes. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document layout, typography, and notes fields. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark BF-08/BF-09/BF-12 fixed or deferred. |

## Implementation Pseudocode

```tsx
type PricingMaxWidth = "narrow" | "default" | "wide";
type PricingTypographyPreset = "compact" | "balanced" | "prominent";

type PricingLayout = {
  maxWidth?: PricingMaxWidth;
  typography?: PricingTypographyPreset;
  footerNote?: string;
};

const maxWidthClassMap = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};
```

Data flow:

- Editor controls patch a bounded `layout` object on Pricing Plans data.
- `normalizePricingPlansData` resolves layout enums and clamps footer-note text.
- `PricingPlansBlock` maps layout presets to class maps owned by the widget.
- Renderer outputs notes as plain text after the cards/table.

Error handling:

- Unknown max-width and typography values fall back to current output.
- Footer note is plain text only and clamps to a documented length.
- Do not add raw rich text, markdown, HTML, arbitrary CSS, or nested widget slots
  in this leaf.
- Advanced mode should not gain duplicate controls for these product fields
  unless TASK-256 changes the shared editor-mode policy.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new `layout` object must use
  `additionalProperties: false` and explicit enum values.
- Anti-abuse: footer notes render as text only; no raw HTML, script, or
  user-authored class names.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  spacing/radius adjacency changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-278-06_Pricing_Plans_Section_Layout_Typography_and_Notes.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Authors can choose a bounded Pricing Plans max-width without editing code or
  arbitrary class names.
- Typography controls are preset-based and product-safe.
- Footer notes support common pricing caveats as plain text.
- The implementation does not create a new generic slot or rich-content system.
