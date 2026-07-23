# TASK-532-01-L04: Controls — Fluid Size, Text-Transform, Extended Weights, Eyebrow Divider

# FileName: TASK-532-01-L04-Typography-And-Divider-Controls.md

**Parent Task:** TASK-532
**Parent Subtask:** TASK-532-01
**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-07-09

---

## Scope

Executable leaf. Adds the editor control descriptors for Bundle B in
`core/services/pages/pageEditorControlRegistry.ts`, all inside a labelled `TASK-532`
fence: a `fontSizeCustom` text control + a `textTransform` select — both appended to
the shared `pageTypographyBlockControls` cluster (so they show on every
typography-capable block); the extended `fontWeight` `options` pick up the new
`extrabold`/`black` members automatically (enum read by reference); and the divider
eyebrow controls (`width`/`align`/`gradient`) appended to the per-type `divider`
entry in `pageBlockControlRegistry`. No new control-ui KIND is required.

## Grounded anchors (SYMBOL names authoritative; RE-GREP at implement time)

- `pageTypographyBlockControls` (`:807`) — the shared typography cluster
  (`fontFamily`/`fontSize`/`fontWeight`/`lineHeight`/`letterSpacing`); `fontWeight`
  control (`:828`, `input:"segmented"`, `options: pageTypographyFontWeights`);
  `fontSize` control (`:818`, `input:"segmented"`, `options: pageTypographyFontSizes`).
- `control({...})` helper + `PageEditorControlDefinition` shape: `path` is a
  `readonly string[]`, `input` ∈ `text|number|select|segmented|switch|color|swatch|
  media|items|facets`, enum `options` is a `readonly string[]` (labels ARE the enum
  strings), `panel`/`target`/`responsive` REQUIRED. NO `showWhen`/`appliesTo`.
- `pageBlockControlRegistry` (`:951+`); the `divider` per-type entry — grep
  `divider:` in the registry (today it may be `divider: []` or minimal; enrich it).
  `blockPropControl(type,key,{...})` helper (`:175`) for per-type prop controls.
- Imports (append-only, read-only from `pageDocumentV2`): `pageTypographyTextTransforms`,
  `pageDividerAligns`, `PAGE_DIVIDER_WIDTH_CLAMP` (all added by L01/L02).
- Control-ui model: no new kind — `input:"text"` → `{kind:"text"}`
  (`pageEditorControlUiModel.ts:74`); `input:"select"`/`segmented` enum →
  `segmented`/`select`; the extended weight enum still renders `segmented`.

## Implementation pseudocode

```ts
// pageTypographyBlockControls (:807) — append inside a // ===== TASK-532 ===== fence,
// AFTER the fontSize control (:818) so the fluid size sits next to the token size:
control({
  id: "block.style.fontSizeCustom",
  panel: "typography",
  target: "block",
  label: "Fluid size",
  // Help copy surfaced by the shell if it supports a `help`/`description` field
  // (grep the live PageEditorControlDefinition — only add a key the type declares):
  // "clamp()/rem/px — wins over the token size when set."
  path: ["style", "fontSizeCustom"],
  input: "text",
  responsive: true,        // a per-device font-size STRING is CSS-expressible (unlike class deltas)
}),
control({
  id: "block.style.textTransform",
  panel: "typography",
  target: "block",
  label: "Text transform",
  path: ["style", "textTransform"],
  input: "select",         // 4 options → the ui-model upgrades small sets to segmented
  responsive: true,
  options: pageTypographyTextTransforms,   // ["none","uppercase","lowercase","capitalize"]
  fallback: "none",        // unset renders as CSS default (none)
}),
// fontWeight control (:828): NO edit needed — `options: pageTypographyFontWeights`
// reads the enum by reference, so extrabold/black appear automatically once L02 grew
// the enum. (Confirm the segmented pill row still fits 6 members; horizontal scroll is
// the existing idiom for long segmented rows.)

// pageBlockControlRegistry.divider (grep `divider:`) — enrich, inside the TASK-532
// fence, keeping the existing tone/thickness controls:
divider: [
  /* …existing tone + thickness controls… */
  blockPropControl("divider", "gradient", { label: "Gradient rule", input: "switch", panel: "style" }),
  blockPropControl("divider", "width",    { label: "Rule length", input: "number", panel: "style",
    clamp: PAGE_DIVIDER_WIDTH_CLAMP, unit: "px" }),
  blockPropControl("divider", "align",    { label: "Rule align", input: "segmented", panel: "style",
    options: pageDividerAligns }),
],
```

## Control-visibility note (live constraint)

The registry has NO value-conditional visibility (`showWhen`) and NO type predicate on
universal controls, so BOTH `fontSize` (token) and `fontSizeCustom` are ALWAYS shown on
every typography-capable block; the "fluid wins over token" precedence is a RENDER rule
(L05) — the label/help copy tells the author. The divider controls are per-type
(`pageBlockControlRegistry.divider`) so they show ONLY on a divider block. Every new
control is a harmless no-op when its field is unset (e.g. `divider.width` with no
`gradient` still adjusts the `<hr>` length, which is a benign enhancement).

## Regression-test shape (delegated to 532-01-L06, asserted here)

- **Registry (Vitest `page-editor-control-registry.test.ts`):**
  `getPageEditorControlsForTarget({kind:"block",type:"text"})` includes
  `block.style.fontSizeCustom` (`input:"text"`) and `block.style.textTransform`
  (`options` deep-equals `pageTypographyTextTransforms`); the `fontWeight` control's
  `options` now has 6 members incl. `extrabold`/`black`; a `divider` block's controls
  include `divider.gradient`/`divider.width`/`divider.align`; a NON-typography block
  (e.g. `image`) does NOT get `fontSizeCustom`/`textTransform` (they ride
  `pageTypographyBlockControls`, gated by typography-capability — confirm the live
  gating; if universal, assert presence everywhere consistently).
- **UI-model (Vitest `page-editor-control-ui-model.test.ts`):** `fontSizeCustom` →
  `{kind:"text"}`; `textTransform` → `{kind:"segmented"|"select"}` with the 4 options;
  `divider.align` → segmented; `divider.width` → slider/sliderStepper; `divider.gradient`
  → toggle.
- **Lane:** Vitest `tests/vitest/pages/page-editor-control-registry.test.ts` +
  `page-editor-control-ui-model.test.ts`.

## Security note

Controls are declarative descriptors only — no attacker surface. They write to the
same allowlisted/normalized model paths owned by L01/L02 (`fontSizeCustom` →
grammar sanitizer, `textTransform`/`fontWeight`/`divider.align` → fail-closed enums,
`divider.width` → clamp), so a malicious value entered through any control is caught at
the write boundary (`normalizeBlockStyle`/`normalizeBlockProp`), never at the control.
No control introduces a raw-CSS or raw-color path.

## Hard Invariants

1. Descriptors use the live `control(...)`/`blockPropControl(...)` helpers; `path` is a
   `readonly string[]`; `input` from the live union; no `showWhen`/`appliesTo`.
2. `fontWeight` options grow via the enum reference (no manual option list).
3. Reset paths use the enum `"none"` member / `fallback`, never a bogus `""` option.
4. All additions inside a labelled `TASK-532` region; divider controls are per-type.
</content>
