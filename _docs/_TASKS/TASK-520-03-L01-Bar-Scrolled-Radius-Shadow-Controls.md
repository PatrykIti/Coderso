# TASK-520-03-L01: Menu-Bar Controls — Radius, Custom Shadow, Scrolled-State Group & Preview Toggle

# FileName: TASK-520-03-L01-Bar-Scrolled-Radius-Shadow-Controls.md

**Parent Subtask:** TASK-520-03
**Priority:** High
**Category:** Admin UI / Content (Menus)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the **menu-bar controls region** of
`core/admin/ui/menus/MenuDesignEditor.tsx` (`MenuBarPanel` @980-1080 + the canvas
preview region for the scrolled toggle). Disjoint from L02's brand region. Adds:
a **Radius** number control, a **Custom shadow** value control, a **Scrolled
state** control group (gated on `layout.sticky`), and a **preview "scrolled"
toggle** so authors see the scrolled variant in the admin canvas.

## Grounded anchors

`MenuBarPanel` @920-978 (`layout` resolve @922-924, `setField` @926, `setColor`
@927-928, `layoutControl(key,label,node)` @958-978, `layoutOverride`/`layoutIsSet`);
existing controls: surfaceColor @987, borderColor @997, alignment @1008,
borderWidth @1049, shadow enum @1058-1066 (`shadowLabels` @298 = `{none:"None",
sm:"Soft", md:"Strong"}`), sticky @1069-1074; `ColorSwatchControl`,
`SegmentedControl`/number control primitives already imported; the canvas preview
`<style>{buildMenuDocumentCss(doc)}</style>` region that renders the live bar.

## Implementation pseudocode

```tsx
// Extend setColor to cover the new scrolled colors (it currently hard-codes the two base keys):
const setColor = (field: "surfaceColor" | "borderColor" | "surfaceColorScrolled" | "borderColorScrolled") =>
  (value: string | null) => setField(field, value === null ? "transparent" : value);

// --- Card group additions (near borderWidth @1049 / shadow @1058) ---
{layoutControl("radius", "Corner radius",
  <NumberSliderControl min={0} max={40} step={1}
    value={layout.radius ?? 0}
    onChange={(n) => setField("radius", n)} />)}

{layoutControl("shadowCustom", "Custom shadow",
  <TextValueControl
    placeholder="e.g. 0 18px 50px rgba(0,0,0,.24)"
    helper="Overrides the shadow preset. Color accepts hex, rgb/rgba, hsl/hsla, var(--color-*) or transparent (same as other color fields)."
    value={layout.shadowCustom ?? ""}
    onChange={(v) => setField("shadowCustom", v.trim() === "" ? undefined : v)} />)}
// NOTE: an invalid value is DROPPED by the 520-01 normalizer on save/round-trip; on
// re-read the control shows empty ⇒ visible fail-soft feedback (assert in test).

// --- Scrolled-state group (only meaningful when sticky) ---
{layout.sticky && (
  <div className="grid gap-3" data-menu-scrolled-group="true">
    <p className="…uppercase text-muted-foreground">Scrolled state</p>
    {layoutControl("surfaceColorScrolled", "Scrolled surface",
      <ColorSwatchControl label="Scrolled surface" palette={palette}
        value={toSwatchValue(layout.surfaceColorScrolled ?? layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
        onChange={setColor("surfaceColorScrolled")} />)}
    {layoutControl("borderColorScrolled", "Scrolled border",
      <ColorSwatchControl label="Scrolled border" palette={palette}
        value={toSwatchValue(layout.borderColorScrolled ?? layout.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
        onChange={setColor("borderColorScrolled")} />)}
    {layoutControl("borderWidthScrolled", "Scrolled border width",
      <NumberSliderControl min={0} max={8} step={1}
        value={layout.borderWidthScrolled ?? layout.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
        onChange={(n) => setField("borderWidthScrolled", n)} />)}
    {layoutControl("shadowScrolled", "Scrolled shadow preset",
      <SegmentedControl options={["none","sm","md"]} optionLabels={shadowLabels}
        value={layout.shadowScrolled ?? layout.shadow ?? "none"}
        onChange={(next) => setField("shadowScrolled", next as MenuBarLayout["shadowScrolled"])} />)}
    {layoutControl("shadowCustomScrolled", "Scrolled custom shadow",
      <TextValueControl placeholder="0 18px 50px rgba(0,0,0,.24)"
        helper="Overrides the scrolled preset."
        value={layout.shadowCustomScrolled ?? ""}
        onChange={(v) => setField("shadowCustomScrolled", v.trim() === "" ? undefined : v)} />)}
  </div>
)}
```

**Canvas preview scrolled toggle:** near the canvas `<style>` region, add a small
toggle that stamps `data-scrolled="true"` on the preview header element so the
520-02 `[data-scrolled="true"]` rules apply IN THE CANVAS (authors see the
scrolled variant without leaving the editor). Local React state
`previewScrolled`; when true, add the attribute to the preview header wrapper.
This is preview-only chrome (no model write, no front effect).

**ColorSwatchControl / alpha:** the scrolled color swatches consume whatever
alpha-capable control TASK-519 ships (drop-in for `ColorSwatchControl`). If 519 has
not landed, `ColorSwatchControl` (hex-only) is used and the alpha owner tokens are
entered via its raw text field; the value still round-trips (the schema accepts
alpha). No behavior gate on 519 beyond the swatch UI.

## Regression-test shape (Vitest admin — `tests/vitest/ui/menu-design-editor.test.tsx`)

- Radius control renders; changing it calls `setField("radius", n)` /
  `patchMenuSectionForDevice(...,"layout",{radius:n})`.
- Custom shadow control renders; typing a value writes `shadowCustom`; clearing
  writes `undefined`; an invalid value that the model drops shows empty on re-render
  (fail-soft feedback).
- Scrolled-state group is HIDDEN when `sticky` is off and SHOWN when on; its five
  controls write the `*Scrolled` keys.
- Preview scrolled toggle stamps `data-scrolled="true"` on the preview header (query
  the DOM attribute).
- `ControlDefaultHint` is ABSENT for every new bar key (`radius`,
  `borderWidthScrolled`, `shadowScrolled`, `surfaceColorScrolled`,
  `borderColorScrolled`, `shadowCustom`, `shadowCustomScrolled`): they are held out
  of `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS` (520-01 Hard Invariant #1) so
  `resolveMenuControlDefault(section,"base",…)` returns `value===undefined` and the
  507 guard hides the hint (`MenuDesignEditor.tsx:625`). Assert NO
  `[data-menu-control-default-hint="radius"]` (etc.) node renders when the key is
  unset — do NOT assert a hint value. The controls render without crashing and
  surface static helper text instead of a resolved-default hint.

## Hard Invariants

- No model/CSS/front edits (single-writer to MenuBarPanel + canvas preview region).
- Scrolled group gated on `sticky`; preview toggle is preview-only.
- Extra keys threaded via the L01-widened section helpers (no `as any`).
