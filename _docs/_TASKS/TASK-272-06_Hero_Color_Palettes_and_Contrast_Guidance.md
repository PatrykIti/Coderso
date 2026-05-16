# TASK-272-06: Hero Color Palettes and Contrast Guidance

# FileName: TASK-272-06_Hero_Color_Palettes_and_Contrast_Guidance.md

**Priority:** High
**Category:** Widgets + Hero + Visual Design + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-272-05
**Status:** To Do

---

## Overview

Add Hero-owned palette presets and Hero-specific contrast guidance for the
headline, body copy, CTA buttons, and background/media overlays.

This leaf depends on TASK-256 for the shared color field contract. It must not
rebuild the generic `ColorField` default-vs-overridden semantics. It only owns
Hero palette application and Hero-specific contrast calculations.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:220-221` - BF-05 missing predefined
  color palettes.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:229-230` - BF-08 missing WCAG
  contrast validator.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:257` - A2 missing contrast validator.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:291,293` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Add any optional palette id field only if runtime needs to remember the chosen palette. Prefer applying palettes into existing explicit style/background fields so runtime remains deterministic. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add Hero palette presets and contrast status messages using the existing color field outputs after TASK-256 shared state lands. |
| `tests/vitest/widgets/hero.test.tsx` | Assert palette-applied data renders through existing Hero fields and contrast helper calculations remain deterministic if helpers live in the widget owner. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert palette controls and contrast messages render with stable metadata. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover applying palettes, preserving manual overrides, and showing failing/passing contrast status. |
| `tests/unit/widgets/validator.test.ts` | Run and update only if schema fields are added. |
| `_docs/_WIDGETS/HERO.md` | Document palette behavior and contrast guidance limitations. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BF-05/BF-08/A2 fixed or record evidence. |

## Implementation Pseudocode

```ts
const heroPalettePresets = {
  light: {
    background: { color: "#ffffff" },
    style: { textColor: "#111827", bodyColor: "#374151", primaryButtonBg: "#2563eb" },
  },
  dark: {
    background: { color: "#0f172a" },
    style: { textColor: "#ffffff", bodyColor: "#dbeafe", primaryButtonBg: "#60a5fa" },
  },
} as const;

function applyHeroPalette(value: HeroData, paletteId: keyof typeof heroPalettePresets): HeroData {
  const preset = heroPalettePresets[paletteId];
  return {
    ...value,
    background: { ...value.background, ...preset.background },
    style: { ...value.style, ...preset.style },
  };
}
```

Contrast guidance:

```ts
function getHeroContrastStatus(foreground: string | undefined, background: string | undefined) {
  const ratio = calculateWcagContrast(foreground, background);
  if (ratio === null) return { state: "unknown" };
  return { state: ratio >= 4.5 ? "pass" : "fail", ratio };
}
```

Error handling:

- CSS variables, gradients, and images may produce `unknown` contrast state
  rather than a false pass/fail.
- Palette application must not erase CTA labels, links, media, or layout data.
- Manual overrides after palette application remain explicit authored values.
- Do not add global/shared color picker UI here.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: add strict enum validation only if a persisted
  palette id is introduced.
- Anti-abuse: palette data is static in code; no arbitrary CSS, scripts, or
  remote palette imports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-06_Hero_Color_Palettes_and_Contrast_Guidance.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Hero authors can apply predefined palettes without manually editing every
  color field.
- Hero contrast guidance reports pass/fail/unknown without overclaiming image or
  gradient contrast.
- Palette application preserves non-color Hero data.
- Shared color-field default/override UI remains owned by TASK-256.
