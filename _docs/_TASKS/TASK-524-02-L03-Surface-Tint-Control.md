# TASK-524-02-L03: "Surface Tint" Control in `pageUniversalBlockControls`

# FileName: TASK-524-02-L03-Surface-Tint-Control.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-02
**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

One control descriptor appended to `pageUniversalBlockControls` in
`core/services/pages/pageEditorControlRegistry.ts`: a "Surface tint" alpha color
control bound to `["style","surfaceTint"]`, mirroring the existing
`block.style.textColor` / `block.style.background` alpha color controls. Applies to
ANY block (universal array). DISJOINT id-namespace (`block.surface.tint`).

## Grounded anchors (RE-GREP post-523)

- **`pageUniversalBlockControls`** (`pageEditorControlRegistry.ts:434`,
  `readonly PageEditorControlDefinition[]`). Existing alpha color controls to MIRROR:
  ```ts
  control({ id: "block.style.textColor",  panel: "style",      target: "block",
    label: "Text color",  path: ["style","textColor"],  input: "color", responsive: true }),  // :455
  control({ id: "block.style.background", panel: "background", target: "block",
    label: "Background",  path: ["style","background"],  input: "color", responsive: true }),  // :465
  ```
  The 522 block surface controls (`block.surface.preset` `:664`, `block.hover.effect`
  `:674`, `block.tilt.*` `:639`) also live here — the new control sits alongside
  `block.surface.preset` in the same conceptual group.
- The live `control({...})` helper (`:152`) → `PageEditorControlDefinition` (`:103`):
  `path` is a `readonly string[]`, `input` from `text|number|select|segmented|switch|
  color|swatch|media|items|facets` (`color` = the alpha-capable swatch when 519 is
  present), `panel`/`target`/`responsive` REQUIRED, no `showWhen`/`appliesTo`.

## Implementation pseudocode

```ts
// pageEditorControlRegistry.ts — append to pageUniversalBlockControls (near block.surface.preset):
control({
  id: "block.surface.tint",
  panel: "style",              // (or "background" to sit beside block.style.background — pick to
                               //  match the 522 block.surface.preset panel; keep it discoverable)
  target: "block",
  label: "Surface tint",
  path: ["style", "surfaceTint"],
  input: "color",              // alpha-capable swatch (TASK-519); mirrors block.style.textColor
  responsive: true,            // surfaceTint IS a per-device-overridable CSS-var seed (like textColor/background)
}),
```

- Use `input:"color"` (NOT `swatch`) to match the existing `block.style.textColor` /
  `block.style.background` alpha color controls — the 519 alpha swatch is wired behind
  the `color` input. `responsive:true` matches those two (the CSS custom-property seed
  is per-device-expressible, unlike the base-only 522 effect enums).
- Reset: clearing the swatch yields an empty/undefined value → the normalizer omits
  `surfaceTint` (present-only) → CSS falls back to the background-derived / literal glow.
- Choose `panel` to sit beside the related 522 control (`block.surface.preset`) so the
  author sees tint + preset together; confirm the live panel key at implement time.

## Security note

The control only WRITES a color string into `style.surfaceTint`; that value is
sanitized by `sanitizeAuthoringCssColor` at the normalize boundary (524-02-L01) and
again read-only at render (524-02-L02). The control descriptor carries no logic and no
attacker surface — it is a declarative binding.

## Vitest test lane

- `tests/vitest/pages/page-editor-control-registry.test.ts` — assert
  `pageUniversalBlockControls` contains a `block.surface.tint` control with
  `path === ["style","surfaceTint"]`, `input === "color"`, and required
  `panel`/`target`/`responsive`. Authored in 524-02-L04.

## Regression / breaking-test ownership

- Purely additive to the universal array; no existing control assertion changes. If a
  test asserts the exact LENGTH of `pageUniversalBlockControls`, that count bump is an
  expected additive rebaseline owned by 524-02-L04 (not drift).

## Hard Invariants

1. Uses the live `control({...})` shape (array `path`, `input:"color"`, required
   `panel`/`target`/`responsive`; no `showWhen`/`appliesTo`).
2. Universal (any block); DISJOINT id `block.surface.tint`; mirrors the existing
   alpha color controls.
3. Clearing the control omits `surfaceTint` (present-only reset via the normalizer).
</content>
