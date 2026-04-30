# TASK-244-02-01: Hero Gradient, Background, and Media Overlay Clear

# FileName: TASK-244-02-01_Hero_Gradient_Background_and_Media_Overlay_Clear.md

**Priority:** High
**Category:** Widgets + Hero
**Estimated Effort:** Medium
**Dependencies:** TASK-244-01-01, TASK-244-01-02
**Status:** To Do

---

## Overview

Add clear controls for Hero background gradient, background color, media overlay,
and style-owned CTA button backgrounds. This is the bug that triggered TASK-244:
once a Hero gradient is configured, the visual editor has no natural way to
remove it.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `tests/vitest/widgets/hero.test.tsx`
- `tests/vitest/widgets/heroEditors.test.tsx`
- `tests/vitest/ui/hero-editor-wave.test.tsx`
- `_docs/_WIDGETS/HERO.md`

## Implementation Notes

Current runtime already behaves mostly correctly for the gradient path when
`background.gradient` is absent: `HeroBlock` resolves
`background.gradient ?? ""` and omits `backgroundImage` if no
gradient/image/video is present. Do not treat that as sufficient for the full
Hero background contract. `hero.tsx:349` currently emits
`backgroundColor: background.color ?? "transparent"`, so clearing
`background.color` still renders a transparent background style. The
implementation must change the runtime style construction so an absent/cleared
`background.color` omits `backgroundColor` entirely, while a deliberately saved
manual value such as `"transparent"` can still render as the user's configured
color.

Do not add a `"none"` gradient string. Do not save `"transparent"` as the
gradient off state.

Do not treat inline media overlay and background media overlay as the same
editor path. `HeroEditors.tsx:1044-1103` exposes `media.overlay` only for
non-centered inline media, while `HeroEditors.tsx:1338-1373` owns centered
background media and currently has no overlay clear affordance. Runtime overlay
currently comes from legacy/inline `media.overlay` at `hero.tsx:338`, while
`background.media` has no `overlay` field in the type/schema at `hero.tsx:60-70`
and `hero.tsx:164-180`. Extend the existing `background.media` contract with
`overlay?: string`, update `heroSchema`, `resolveBackgroundMedia`,
`updateBackgroundMedia`, and the renderer to prefer `background.media.overlay`
for centered background media. Keep a narrow compatibility adapter for existing
centered Heroes that still have legacy `media.overlay`. Do not create a second
Hero editor flow.

Current code references:

- `hero.tsx:17`, `hero.tsx:112`, `hero.tsx:337-351`, `hero.tsx:440-443`, and
  `hero.tsx:550-551` own background/media overlay output.
- `hero.tsx:51`, `hero.tsx:55`, `hero.tsx:154`, `hero.tsx:158`,
  `hero.tsx:380`, and `hero.tsx:392` own primary/secondary button
  backgrounds.
- `HeroEditors.tsx:1097-1100` owns media overlay editing.
- `HeroEditors.tsx:1338-1373` owns background media editing and must receive
  the background-media overlay clear affordance through the real
  `background.media.overlay` contract.
- `HeroEditors.tsx:1215-1239` owns CTA button background editing.
- `HeroEditors.tsx:1338-1348` and `HeroEditors.tsx:1557-1570` own background
  color/gradient editing in visual and advanced modes.

## Implementation Pseudocode

Add a clear action to `GradientField`.

```tsx
function GradientField({ label, value, onChange, onClear }: Props) {
  const hasValue = typeof value === "string" && value.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!hasValue}>
          Clear
        </Button>
      </div>
      {/* existing gradient controls */}
    </div>
  );
}
```

Remove nested background keys instead of merging `undefined`.

```ts
const clearBackgroundField = (key: keyof NonNullable<HeroData["background"]>) => {
  const { [key]: _removed, ...background } = value.background ?? {};
  update({
    background: Object.keys(background).length > 0 ? background : undefined,
  });
};
```

Button style clears use the owning `style` object and must remove the exact
style keys.

```ts
clearStyleField("primaryButtonBg");
clearStyleField("secondaryButtonBg");
```

Runtime assertions should check absence of rendered style, not only visual
equivalence.

```ts
expect(hero.getAttribute("style") ?? "").not.toContain("background-image");
expect(hero.getAttribute("style") ?? "").not.toContain("background-color: transparent");
expect(hero.querySelector("[data-hero-background-overlay]")).toBeNull();
expect(html).not.toContain("background:#224466");
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- Add or update tests that prove:
  - configured gradient still renders;
  - cleared gradient omits `backgroundImage`;
  - editor `Clear` removes `background.gradient`;
  - background color clear removes `background.color` and runtime omits
    `backgroundColor` instead of falling back to `"transparent"`;
  - media overlay clear removes the overlay field and overlay node where
    applicable.
  - centered background media overlay clear is covered separately from
    non-centered inline media overlay, including schema acceptance for
    `background.media.overlay` and compatibility for legacy `media.overlay`.
  - primary and secondary button background clear remove `primaryButtonBg` and
    `secondaryButtonBg` without serializing `"transparent"`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/WIDGETS.md` if global `Clear` semantics are documented there
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Hero gradient has a visible `Clear` action in every editor mode that exposes
   the gradient.
2. Clear removes the nested Hero background key from widget data.
3. Runtime omits cleared `backgroundImage`, `backgroundColor`, and overlay
   output.
4. Existing Hero gradient/image/video behavior remains backward compatible.
5. Primary and secondary button background clears remove the style keys and do
   not pin transparent button backgrounds into saved widget data.
