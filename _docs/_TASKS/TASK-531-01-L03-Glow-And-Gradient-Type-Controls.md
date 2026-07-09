# TASK-531-01-L03: Glow + Gradient-Type Controls

# FileName: TASK-531-01-L03-Glow-And-Gradient-Type-Controls.md

**Parent Task:** TASK-531
**Parent Subtask:** TASK-531-01
**Priority:** Medium
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Appends the `glow.*` control group to the universal SECTION and BLOCK
control arrays in `core/services/pages/pageEditorControlRegistry.ts` (TASK-531 region),
and confirms `backgroundType:"gradient"` is offered on both targets (it already is —
`pageBackgroundTypes` includes `"gradient"` and the existing `backgroundType` `select`
controls source that enum, so NO enum/control change is needed there; this leaf only adds
the glow controls + verifies the gradient option renders).

NO new control UI kind is needed: `glow.color` uses `input:"color"` and the four numeric
fields use `input:"number"` with `clamp` — both already in the input union
(`pageEditorControlRegistry.ts:67-75`). NO `pageEditorControlUiModel.ts` change, NO
`editorControls/*` component change.

## Grounded anchors (verified 2026-07-09)

- `pageEditorControlRegistry.ts`: `control()` helper `:165`,
  `PageEditorControlDefinition :116` (`path: readonly string[]`, `input`,
  `panel`/`target`/`responsive` REQUIRED, numeric bounds via `clamp:{min,max}`),
  `pageUniversalSectionControls :225` (append the section glow group after the existing
  `section.style.shadow` control `:305`), `section.style.backgroundType :276` (already
  offers gradient), `pageUniversalBlockControls :449` (append the block glow group after
  `block.style.shadow` `:535`), `block.style.backgroundType :489` (already offers
  gradient). Input union `:67-75`.
- Clamp constants owned by 531-01-L02: `PAGE_GLOW_BLUR_CLAMP` (0..120),
  `PAGE_GLOW_SPREAD_CLAMP` (-40..80), `PAGE_GLOW_OFFSET_CLAMP` (-80..80) — imported
  read-only from `pageDocumentV2.ts` (append-only import sub-region).

## Implementation pseudocode

```ts
// ── TASK-531 REGION — section glow group, appended to pageUniversalSectionControls ──
control({ id: "section.style.glow.color", panel: "style", target: "section",
  label: "Glow color", path: ["style", "glow", "color"], input: "color", responsive: true }),
control({ id: "section.style.glow.blur", panel: "style", target: "section",
  label: "Glow blur", path: ["style", "glow", "blur"], input: "number", responsive: true,
  clamp: { min: PAGE_GLOW_BLUR_CLAMP.min, max: PAGE_GLOW_BLUR_CLAMP.max } }),
control({ id: "section.style.glow.spread", panel: "style", target: "section",
  label: "Glow spread", path: ["style", "glow", "spread"], input: "number", responsive: true,
  clamp: { min: PAGE_GLOW_SPREAD_CLAMP.min, max: PAGE_GLOW_SPREAD_CLAMP.max } }),
control({ id: "section.style.glow.x", panel: "style", target: "section",
  label: "Glow offset X", path: ["style", "glow", "x"], input: "number", responsive: true,
  clamp: { min: PAGE_GLOW_OFFSET_CLAMP.min, max: PAGE_GLOW_OFFSET_CLAMP.max } }),
control({ id: "section.style.glow.y", panel: "style", target: "section",
  label: "Glow offset Y", path: ["style", "glow", "y"], input: "number", responsive: true,
  clamp: { min: PAGE_GLOW_OFFSET_CLAMP.min, max: PAGE_GLOW_OFFSET_CLAMP.max } }),
// ── END section glow group ───────────────────────────────────────────────────

// ── TASK-531 REGION — block glow group, appended to pageUniversalBlockControls ──
// (same five descriptors with id "block.style.glow.*", target: "block")
```

**Design notes.** No value-conditional visibility (`showWhen`) exists in the registry
(live constraint), so the glow numeric controls are ALWAYS shown and are harmless no-ops
when `glow.color` is unset (normalize omits the whole glow without a valid color).
`glow.color` reaching the schema-nullable `color` path clears the glow (color required),
matching the present-only reset idiom. The gradient background TYPE is already an option
of the `backgroundType` `select` (`pageBackgroundTypes` = `none|color|image|gradient`), so
authoring a gradient is: set `backgroundType:"gradient"` + type/paste the gradient into the
existing `background` control — no new control. This leaf only verifies (in 531-01-L04 /
smoke) that selecting `"gradient"` on a SECTION now paints (post-L02) as it already does on
a block.

## Owned breaking-test edit — frozen path Sets (name here, land in this leaf's commit)

`tests/vitest/pages/page-editor-control-registry.test.ts` iterates EVERY universal
control and asserts each control's `path` AND `overridePath` are members of two HARDCODED
literal `Set`s — `validSectionPaths` (`:78-103`, checked via `expectControlPath` at `:219`
from the "universal section controls use schema-owned array paths" test `:216`) and
`validBlockPaths` (`:105-150`, checked via `:269` from the block test `:266`). The ten new
`style.glow.*` path strings appended by this leaf are NOT in those Sets, so BOTH tests FAIL
until the Sets are updated. This is a pre-existing test broken by 531 and MUST be updated in
THIS leaf's atomic commit (the append of the glow controls and the Set update land together
so `expectControlPath` stays green). The self-referential assertions at `:347`/`:360`/
`:945`/`:1048`/`:1120` are SAFE (they map over the source arrays) — only the two hardcoded
Sets break.

Add to `validSectionPaths` (`:78-103`): `"style.glow.color"`, `"style.glow.blur"`,
`"style.glow.spread"`, `"style.glow.x"`, `"style.glow.y"`.
Add to `validBlockPaths` (`:105-150`): the same five (block target uses the identical
`style.glow.*` tail).

## Regression-test shape (delegated to 531-01-L04)

- The registry adapter maps each `input:"color"` glow control to the `color`/`swatch` UI
  model and each `input:"number"` to `slider`/`number`; a snapshot/coverage test asserts
  the 5 section + 5 block glow controls exist with the right `path`/`clamp`, and that
  `backgroundType` still lists `"gradient"` for both targets.
- The two frozen path Sets (`validSectionPaths` `:78-103`, `validBlockPaths` `:105-150`)
  gain the five `style.glow.*` entries in lockstep with the control append, so the
  "universal … controls use schema-owned array paths" tests (`:216` section, `:266` block)
  stay green (see the owned breaking-test edit above).
- **Lane:** Vitest (control-registry model test — the registry is a pure data module).

## Security note

Controls only shape authoring UX; every glow value still passes the 531-01-L02 write
normalizer (`sanitizeAuthoringCssColor` on color, clamps on numbers, reject-unknown nested
keys) and the render-time `composeGlowBoxShadow`. No control can bypass the write boundary.

## Hard Invariants

1. Glow controls use existing `color` + `number` inputs; NO new UI kind, NO
   `editorControls/*` component, NO `pageEditorControlUiModel.ts` change.
2. Controls appended in a labelled TASK-531 region to the universal section + block arrays;
   `panel`/`target`/`responsive` set; numeric bounds via `clamp`; enum-less (no `options`).
3. `backgroundType:"gradient"` is reused from the existing enum/control — no new control
   for gradient authoring.
