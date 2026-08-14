# TASK-531-01-L03: Glow + Gradient-Type Controls

# FileName: TASK-531-01-L03-Glow-And-Gradient-Type-Controls.md

**Parent Task:** TASK-531
**Parent Subtask:** TASK-531-01
**Priority:** Medium
**Category:** Admin UI / Content (Pages)
**Estimated Effort:** Small
**Status:** ✅ Done
**Completed:** 2026-07-09

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

**Also close the editor-side value-sanitizer gap for the nested (length-3) glow color path
(in a labelled `TASK-531` region of `core/services/pages/pageEditorMutationActions.ts`) —
finding #4, mirroring sibling 533-02's `border.*.color` handling.**
`sanitizePageEditorControlValue` (`:72-80`) destructures `const [group, key] =
control.overridePath` (`:76`) and routes `group==="style"` to `sanitizeStyleValue(key,
value)` (`:63-70`). For the glow color control the `overridePath` is the length-3
`["style","glow","color"]`, so `group="style"` but `key="glow"` (NOT `"color"`) —
`sanitizeStyleValue` only color-sanitizes when `key` is exactly
`"textColor"|"borderColor"|"accent"`, so the glow color falls through `return value`
UNSANITIZED into the editor's optimistic client state. This is NOT a persistence/SSR hole
(the write boundary re-normalizes via `normalizeGlow` → `readOptionalSafeColor`, and
531-01-L02's `composeGlowBoxShadow` re-guards at render via `sanitizeAuthoringCssColor`), but
the live editor PREVIEW could momentarily hold an unsanitized string. This leaf routes the
nested `style.glow.color` path (and any nested glow numeric) through `sanitizeAuthoringCssColor`
/ numeric handling (see §Security note), exactly as 533-02 OWNS the equivalent
`border.*.color` (length-4) seam.

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
- **Editor value sanitizer (finding #4)** — `pageEditorMutationActions.ts`:
  `sanitizePageEditorControlValue` (`:72-80`), `sanitizeStyleValue` (`:63-70`), the
  `const [group, key] = control.overridePath` destructure (`:76`). `sanitizeAuthoringCssColor`
  is ALREADY imported (`:10`). Extend to route the nested `style.glow.color` path through
  `sanitizeAuthoringCssColor` (and clamp the nested glow numerics), mirroring the sibling
  533-02-L03 border handling.

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

```ts
// ── TASK-531 REGION (pageEditorMutationActions.ts) — nested glow.color/numeric guard ──
// sanitizeStyleValue (:63-70) sees key="glow" (NOT "color") for the length-3 path
// ["style","glow","color"], so it must inspect the FULL overridePath, not just [group,key].
// Route via sanitizePageEditorControlValue (:72-80) which HAS the whole control.overridePath:
export const sanitizePageEditorControlValue = (
  control: PageEditorControlDefinition,
  value: unknown
): unknown => {
  const [group, key, ...rest] = control.overridePath;
  if (group === "props") return sanitizeBlockPropValue(key, value);
  if (group === "style") {
    // ── TASK-531 — nested glow color (length-3 style.glow.color) ──
    if (key === "glow" && rest[0] === "color") return sanitizeAuthoringCssColor(value);
    // (nested glow numerics blur/spread/x/y are clamped by the number input's `clamp`
    //  metadata before reaching here and re-clamped at the write boundary; if a raw
    //  passthrough is a concern, clamp them here too against PAGE_GLOW_*_CLAMP.)
    return sanitizeStyleValue(key, value);
  }
  return value;
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────
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

**Editor-side client-layer gap — closed by this leaf (finding #4).**
`sanitizePageEditorControlValue` (`pageEditorMutationActions.ts:72-80`) reads only
`const [group, key] = control.overridePath`, so for the nested `["style","glow","color"]`
control path it computes `key="glow"` (NOT `"color"`) and `sanitizeStyleValue` (`:63-70`)
does NOT color-sanitize it (it matches only `textColor`/`borderColor`/`accent`), leaving the
glow color UNSANITIZED in the editor's optimistic client state. This is NOT a persistence/SSR
hole (the write boundary re-normalizes via `normalizeGlow`, and `composeGlowBoxShadow`
re-guards at BOTH render boundaries), but the live preview could momentarily hold an
unsanitized string. This leaf extends `sanitizePageEditorControlValue` to detect the nested
glow color path and route it through `sanitizeAuthoringCssColor` — EXACTLY parallel to sibling
533-02-L03's `border.*.color` handling. `sanitizeAuthoringCssColor` is already imported
(`:10`); no new import.

## Hard Invariants

1. Glow controls use existing `color` + `number` inputs; NO new UI kind, NO
   `editorControls/*` component, NO `pageEditorControlUiModel.ts` change.
2. Controls appended in a labelled TASK-531 region to the universal section + block arrays;
   `panel`/`target`/`responsive` set; numeric bounds via `clamp`; enum-less (no `options`).
3. `backgroundType:"gradient"` is reused from the existing enum/control — no new control
   for gradient authoring.
4. The editor value sanitizer routes the nested `style.glow.color` (length-3) path through
   `sanitizeAuthoringCssColor` in a labelled TASK-531 region of
   `pageEditorMutationActions.ts` (the `[group,key]` destructure otherwise leaves it
   UNSANITIZED in optimistic client state — finding #4; parity with sibling 533-02).
