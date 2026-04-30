# TASK-244-02-01: Hero Gradient, Background, and Media Overlay Clear

# FileName: TASK-244-02-01_Hero_Gradient_Background_and_Media_Overlay_Clear.md

**Priority:** High
**Category:** Widgets + Hero
**Estimated Effort:** Medium
**Dependencies:** TASK-244-02
**Status:** To Do

---

## Overview

Add clear controls for Hero background gradient, background color, and media
overlay fields. This is the bug that triggered TASK-244: once a Hero gradient is
configured, the visual editor has no natural way to remove it.

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

Current runtime already behaves mostly correctly when `background.gradient` is
absent: `HeroBlock` resolves `background.gradient ?? ""` and omits
`backgroundImage` if no gradient/image/video is present. The missing piece is
editor affordance and payload cleanup.

Do not add a `"none"` gradient string. Do not save `"transparent"` as the
gradient off state.

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

Runtime assertions should check absence of rendered style, not only visual
equivalence.

```ts
expect(hero.getAttribute("style") ?? "").not.toContain("background-image");
expect(hero.querySelector("[data-hero-background-overlay]")).toBeNull();
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- Add or update tests that prove:
  - configured gradient still renders;
  - cleared gradient omits `backgroundImage`;
  - editor `Clear` removes `background.gradient`;
  - background color clear removes `background.color`;
  - media overlay clear removes the overlay field and overlay node where
    applicable.
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
