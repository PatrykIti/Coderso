# TASK-272-04: Hero Layout Height, Full Bleed, and Media Center Variant

# FileName: TASK-272-04_Hero_Layout_Height_Full_Bleed_and_Media_Center_Variant.md

**Priority:** High
**Category:** Widgets + Hero + Layout + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-01, TASK-272-01, TASK-272-02
**Status:** To Do

---

## Overview

Add Hero-only layout options for full-height/full-bleed use cases and introduce
a `media-center` variant for product-showcase Hero layouts.

This leaf also clarifies Hero internal spacing labels so authors can
distinguish Hero content spacing from generic page/builder container spacing.
Shared page viewport controls stay outside this widget leaf.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:181-187` - UX-04 padding controls need
  clearer labeling.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:214-215` - BF-03 full-height/full-bleed
  Hero option.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:244-245` - BF-13 missing
  `media-center` variant.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:292,298` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Add strict `layout.height` and `layout.bleed` or equivalent bounded fields. Add `media-center` to variants, schema/default normalizer, runtime layout class map, and `createHeroWidget`. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add `media-center` variant card and Hero layout controls with explanatory labels. Rename Advanced spacing labels to Hero content spacing without duplicating generic builder layout controls. |
| `core/admin/services/userSettingsClient.ts` and `core/services/settings/userSettingsService.ts` | Add `media-center` to Hero preset variant validation if presets can store it. |
| `tests/vitest/widgets/hero.test.tsx` | Assert `media-center`, height, and bleed render stable classes/styles and legacy variants still work. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert variant cards include `media-center` and Advanced labels distinguish Hero content spacing. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover selecting `media-center`, height/full-bleed controls, and no data loss when switching variants. |
| `tests/unit/widgets/validator.test.ts` | Update if variant/schema validation has explicit Hero coverage. |
| `tests/unit/widgets/registry.test.ts` | Update if variant registration assertions include Hero variants. |
| `_docs/_WIDGETS/HERO.md` | Document new layout fields and variant. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if this changes Hero pack readiness/completeness. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark UX-04/BF-03/BF-13 fixed or record evidence. |

## Implementation Pseudocode

```ts
type HeroLayout = {
  align?: "left" | "center" | "right";
  maxWidth?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  contentWidth?: "none" | "sm" | "md" | "lg" | "xl";
  height?: "auto" | "screen" | "large";
  bleed?: "contained" | "full-bleed";
};

const heroVariants = ["centered", "split", "media-left", "media-center"] as const;
```

Runtime flow:

```tsx
const minHeightClass =
  layout.height === "screen" ? "min-h-screen" : layout.height === "large" ? "min-h-[80vh]" : "";

const bleedClass = layout.bleed === "full-bleed" ? "w-screen max-w-none" : "w-full";

const layoutClass =
  variant === "media-center"
    ? "flex flex-col items-center gap-8 text-center"
    : existingLayoutClass;
```

Error handling:

- Unknown layout tokens normalize to safe defaults.
- Existing `centered`, `split`, and `media-left` payloads must not gain
  full-screen behavior unless explicitly configured.
- Full-bleed must be bounded to the widget shell and must not use raw CSS input.
- `media-center` must support `image` and `video` while preserving the
  `centered + image` background behavior for the existing `centered` variant.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new variant/layout fields must be strict enums and
  keep `additionalProperties: false`.
- Anti-abuse: no arbitrary class names, raw CSS, or scriptable layout input.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-04_Hero_Layout_Height_Full_Bleed_and_Media_Center_Variant.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Hero supports a bounded full-height option without custom CSS.
- Hero supports a bounded full-bleed option without raw class input.
- `media-center` is registered, editable, preset-compatible, and covered by
  runtime/editor tests.
- Advanced spacing copy clearly names Hero content spacing and does not claim to
  own generic page/builder padding controls.
