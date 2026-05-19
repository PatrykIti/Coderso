# TASK-272-06: Hero Color Palettes and Contrast Guidance

# FileName: TASK-272-06_Hero_Color_Palettes_and_Contrast_Guidance.md

**Priority:** High
**Category:** Widgets + Hero + Visual Design + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-272-05, TASK-299, TASK-305, TASK-310-02
**Status:** Done (2026-05-19)

---

## Overview

Add Hero-owned palette presets and adopt the landed shared contrast guidance for
Hero headline/body/CTA/background surfaces.

This leaf depends on the landed shared color/contrast seams. It must not
rebuild the generic color-control or contrast-advisory contracts. It only owns
Hero palette application and Hero-specific adoption/mapping of the shared
contrast helper across Hero surfaces.

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
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add Hero palette presets and consume the landed `resolveColorContrastAdvisory` / `ColorContrastNotice` helpers for Hero-owned contrast rows. Do not reopen shared helper work locally. |
| `tests/vitest/widgets/hero.test.tsx` | Assert palette-applied data renders through existing Hero fields and contrast helper calculations remain deterministic if helpers live in the widget owner. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert palette controls and contrast messages render with stable metadata. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover applying palettes, preserving manual overrides, and showing failing/passing contrast status. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Update only if Hero adoption exposes a missing shared contrast-helper behavior that must be fixed centrally instead of locally. |
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

Contrast guidance adoption:

```ts
const headlineContrast = resolveColorContrastAdvisory({
  foreground: style.textColor,
  background: value.background?.color,
  fallbackBackground: "#ffffff",
});
```

Error handling:

- CSS variables, gradients, and images may produce `unknown` contrast state
  through the shared advisory helper rather than a false pass/fail.
- Palette application must not erase CTA labels, links, media, or layout data.
- Manual overrides after palette application remain explicit authored values.
- Do not add a Hero-local contrast algorithm or global/shared color picker UI
  here.

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
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx` only if
  the shared contrast helper itself needs additive work.
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-06_Hero_Color_Palettes_and_Contrast_Guidance.md`
- `_docs/_TASKS/README.md` on status changes

## Final Evidence

- Closed on 2026-05-19 with Hero palette presets plus shared contrast
  advisories that intentionally fall back to `unknown` for gradients, images,
  transparent backgrounds, and unresolved tokens.
- Focused proof lives in `tests/vitest/ui/hero-editor-wave.test.tsx`,
  `tests/vitest/widgets/heroEditors.test.tsx`, and TASK-272-09.

## Acceptance Criteria

- Hero authors can apply predefined palettes without manually editing every
  color field.
- Hero contrast guidance reports pass/fail/unknown without overclaiming image or
  gradient contrast.
- Hero contrast guidance reuses the landed shared advisory contract from
  TASK-299 instead of forking a Hero-local validator.
- Palette application preserves non-color Hero data.
- Shared color-field default/override UI remains owned by the landed
  TASK-305 / TASK-310-02 seam on top of TASK-256 clear semantics.
