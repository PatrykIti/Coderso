# TASK-520-03-L02: Brand Controls — Mode Selector, Icon Picker/Style & Graphic-With-Text Toggle

# FileName: TASK-520-03-L02-Brand-Icon-Picker-And-Combo-Controls.md

**Parent Subtask:** TASK-520-03
**Priority:** High
**Category:** Admin UI / Content (Menus)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the **brand controls region** of
`core/admin/ui/menus/MenuDesignEditor.tsx` (`BrandLogoPicker` @1210-1277,
`BrandStyleControls` @1287-1414, and the brand block's canvas preview @725-760).
Disjoint from L01's menu-bar region. Adds: a **brand mode selector**
(Text / Image / Icon), an **icon picker** (lucide browser) shown in icon mode,
icon **color/size** style controls, and a **"Show text alongside" combo toggle**
for graphic modes.

## Grounded anchors

`ADD_BLOCK_TYPES`/brand add default `{mode:"text",href:"/"}` @1384; canvas brand
preview @725-760 (img XOR text @750, `resolveBrandImageSrc` @742); `patchBlock`
@888 (block updater); `BrandLogoPicker` @1210-1277 (`MediaPickerControl` @1270,
`writeSrc` @1237); `BrandStyleControls` @1287-1414 (`resolveMenuBrandStyleForDevice`
@1302, `setBrand<K>` @1313, `brandStyleControl(key,label,node)` @1327,
`ColorSwatchControl`); Timeline lucide picker pattern to REUSE:
`core/widgets/core/timelineLucideIcons.ts` (`lucideKebabIconComponents`,
`lucideIconNames`) + `TimelineEditors.tsx` `IconBrowserDialog`/`IconPicker`
@597-720 (icon grid, `humanizeIconName` @99, dynamic-import guard so the full
lucide set stays off the initial admin bundle).

## Implementation pseudocode

```tsx
// --- Brand MODE selector (writes block.props.mode via patchBlock) ---
// Today mode is only set at add time (@1384) — add an explicit selector so authors switch
// between Text / Image / Icon (matches the new 3-value model union from 520-01-L03).
const setBrandMode = (mode: "text" | "image" | "icon") =>
  patchBlock(updateDoc)(block.id, (cur) =>
    cur.type === "brand" ? { ...cur, props: { ...cur.props, mode } } : cur);

<SegmentedControl
  options={["text", "image", "icon"]}
  optionLabels={{ text: "Text", image: "Image", icon: "Icon" }}
  value={block.props.mode}
  onChange={(m) => setBrandMode(m as "text" | "image" | "icon")} />

// --- ICON picker (shown when mode === "icon") — REUSE the lucide browser ---
// Lazy-load lucideKebabIconComponents (dynamic import) exactly like TimelineEditors so the
// full icon set stays OUT of the admin initial static bundle. Store the kebab name:
const setBrandIcon = (name: string | undefined) =>
  patchBlock(updateDoc)(block.id, (cur) =>
    cur.type === "brand"
      ? (name ? { ...cur, props: { ...cur.props, icon: name } }
              : { ...cur, props: (({ icon: _drop, ...rest }) => rest)(cur.props) })
      : cur);

{block.props.mode === "icon" && (
  <BrandIconPicker value={block.props.icon} onChange={setBrandIcon} />  // grid + search, humanizeIconName labels
)}
// BrandIconPicker resolves the current name against lucideKebabIconComponents for the preview swatch;
// an unknown name shows a "not found" hint (mirrors the render-time fallback).

// --- ICON style controls (in BrandStyleControls; extend the mode gate) ---
// Existing gate: text mode ⇒ font*, image mode ⇒ height/maxWidth. ADD:
{block.props.mode === "icon" && brandStyleControl("iconColor", "Icon color",
  <ColorSwatchControl label="Icon color" palette={palette}
    value={toSwatchValue(brandStyle.iconColor ?? DEFAULT_ICON_COLOR)}
    onChange={(v) => setBrand("iconColor", v === null ? "transparent" : v)} />)}
{block.props.mode === "icon" && brandStyleControl("iconSize", "Icon size",
  <NumberSliderControl min={12} max={64} step={1}
    value={brandStyle.iconSize ?? 24}
    onChange={(n) => setBrand("iconSize", n)} />)}

// --- COMBO "Show text alongside" toggle (graphic modes only) ---
const setShowText = (on: boolean) =>
  patchBlock(updateDoc)(block.id, (cur) =>
    cur.type === "brand"
      ? (on ? { ...cur, props: { ...cur.props, showText: true } }
            : { ...cur, props: (({ showText: _d, ...rest }) => rest)(cur.props) })  // present-only: drop false
      : cur);

{(block.props.mode === "image" || block.props.mode === "icon") && (
  <ToggleControl label="Show text alongside"
    checked={block.props.showText === true}
    onChange={setShowText} />
)}
// The per-menu wordmark text is the EXISTING text control (already present); when showText is on
// it renders beside the graphic (front + canvas — 520-04).
```

**Canvas preview parity (@725-760):** extend the admin brand preview to mirror
520-04's front render — icon mode resolves `lucideKebabIconComponents[icon]` to an
`<svg>` with `iconColor`/`iconSize`; `showText` renders the graphic + wordmark
side by side. So the editor canvas shows exactly what publishes. (Preview uses the
SAME resolution logic as 520-04; keep it a small shared inline helper or duplicate
the ≤10-line resolve — do NOT import from `siteShell.tsx`.)

**Alpha color:** `iconColor` uses the 519 alpha-capable swatch when available
(fallback hex-only otherwise); the schema accepts alpha regardless.

## Regression-test shape (Vitest admin — `tests/vitest/ui/menu-design-editor.test.tsx`)

- Mode selector renders Text/Image/Icon; selecting Icon writes `props.mode:"icon"`.
- Icon picker appears only in icon mode; picking `house` writes `props.icon:"house"`;
  clearing removes the key.
- Icon color/size controls appear only in icon mode; write `style.iconColor`/`iconSize`.
- Combo toggle appears only in image/icon mode; on → `props.showText:true`, off →
  key removed (present-only).
- Canvas preview: icon mode renders an `<svg>`; `showText` renders both graphic +
  wordmark (query DOM).

## Hard Invariants

- No model/CSS/front edits (single-writer to brand region + brand canvas preview).
- Icon picker lazy-loads the lucide set (off the initial admin bundle).
- `showText:false`/unset never stored; mode selector writes the 3-value union only.
- Canvas preview mirrors 520-04 (no import from `siteShell.tsx`).
