# TASK-272-05: Hero Shadow, Typography, Font, and Motion Controls

# FileName: TASK-272-05_Hero_Shadow_Typography_Font_and_Motion_Controls.md

**Priority:** Medium
**Category:** Widgets + Hero + Visual Design + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-272-04, TASK-305, TASK-310-02
**Status:** To Do

---

## Overview

Add bounded Hero visual controls for shadows, font family/weight, and entrance
motion effects.

This leaf must use strict enum/token maps. It must not accept arbitrary CSS
classes, raw animation names, or unbounded font-family strings.
Any color-adjacent UI in this leaf must continue consuming the landed shared
color-field helpers from TASK-305 / TASK-310-02 instead of reopening local Hero
picker logic.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:211-212` - BF-02 missing box-shadow
  controls.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:223-224` - BF-06 missing font weight
  and font-family controls.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:241-242` - BF-12 missing animation and
  scroll effects.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:294-296` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Extend `style` with bounded `cardShadow`, `mediaShadow`, `buttonShadow`, `headlineWeight`, `bodyWeight`, `fontFamily`, and `motion` or equivalent fields. Map each field through fixed class/style maps. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add Visual controls grouped under Colors/Borders or a new Hero-only Appearance section. Keep one option per line where labels would otherwise crowd the inspector. |
| `tests/vitest/widgets/hero.test.tsx` | Assert every new token maps to expected runtime output and invalid values normalize to defaults or are rejected by schema. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert editor controls are present with stable `data-widget-control` ownership. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover changing shadow, typography weight/family, and motion tokens without disrupting existing content/media fields. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update if any new Hero style field supports `none`. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema fields change. |
| `_docs/_WIDGETS/HERO.md` | Document the bounded token lists. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BF-02/BF-06/BF-12 fixed or record evidence. |

## Implementation Pseudocode

```ts
const heroShadowClassMap = {
  none: "",
  soft: "shadow-sm",
  medium: "shadow-md",
  strong: "shadow-xl",
} as const;

const heroFontFamilyClassMap = {
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
} as const;

const heroMotionClassMap = {
  none: "",
  "fade-in":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none",
  "slide-up":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none",
} as const;
```

Error handling:

- Unknown tokens must be rejected by schema or normalized to `none`/`inherit`.
- Motion must be disabled when users prefer reduced motion via Tailwind
  `motion-safe` classes or equivalent CSS.
- Shadows must not force a border/background if the user intentionally cleared
  those fields through TASK-256/TASK-244 semantics.
- Do not add custom CSS text fields.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new style fields are strict enums.
- Anti-abuse: no arbitrary class names, raw CSS, external font URLs, scripts, or
  user-controlled animation names.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-05_Hero_Shadow_Typography_Font_and_Motion_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Hero card, media frame, and CTA shadows are configurable through bounded
  tokens.
- Hero font family and weight controls are configurable through bounded tokens.
- Hero motion effects are configurable, reduced-motion safe, and tested.
- Runtime output never depends on arbitrary user-authored class names or CSS.
