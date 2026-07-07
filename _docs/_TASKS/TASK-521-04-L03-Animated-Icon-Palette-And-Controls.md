# TASK-521-04-L03: Palette Copy + Editor Controls

# FileName: TASK-521-04-L03-Animated-Icon-Palette-And-Controls.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-04
**Priority:** Medium
**Category:** Admin UI (Pages)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Makes the `icon` block insertable + authorable. THREE edits, in
this leaf, landing AFTER the renderer case (521-04-L02) so `runtimeRenderer:"real"`
is truthful:

1. **Capability flip** — `core/services/pages/pageDocumentV2.ts` capability-sets
   region (the NARROW additive seam the parent declares): add `"icon"` to
   `realRuntimeBlockTypes` (`:691`) and `editorInsertableBlockTypes` (`:715`,
   `insertableBlockTypes` aliases it), and DELETE `pageBlockCapabilityReasons.icon`
   (`:774`, no longer pending). This flips
   `pageBlockCapabilities.icon` to `{ runtimeRenderer:"real", editorInsertable:true,
   insertable:true }` (no `reason`). Disjoint from 521-01's model regions in the same
   file; the frozen-test edits this un-freezes are owned by 521-04-L04.
2. **Palette copy** — enrich `blockOptionCopy.icon` in
   `core/admin/ui/pages/editor/pageEditorOptions.ts` (`:85+`).
3. **Block controls** — populate the **per-type** `pageBlockControlRegistry.icon`
   region (`core/services/pages/pageEditorControlRegistry.ts:903`, currently the
   empty `icon: []`) with block-control descriptors (icon-name picker, animation
   segmented, size/speed number sliders, color swatch) so the inspector exposes them
   ONLY for the `icon` block.

Uses the existing `blockPropControl(type, key, {…})` factory
(`:175`) exactly like every other per-type block — the SAME seam the parent
declares for 521-04. The universal `pageUniversalBlockControls` array (`:362`) is
**NOT touched** (it merges onto EVERY block type at `:971`
`[...universalControls, ...pageBlockControlRegistry[type]]`, so per-type controls
belong in `pageBlockControlRegistry.icon`, never in the universal array).

## Grounded anchors

`blockOptionCopy: Record<PageBlockType, Omit<BlockOption,"type">>`
(`pageEditorOptions.ts:85`) — `icon` already has an entry (exhaustive Record); this
leaf refines its `label`/`description` and (if the shape carries it) the palette
icon/grouping so it surfaces in the block picker (`WidgetPicker.tsx` /
`LibraryPanel.tsx`). Per-type block controls: `pageBlockControlRegistry.icon`
(`pageEditorControlRegistry.ts:903`, currently `icon: []`), populated via
`blockPropControl(type, key, definition)` (`:175`) — mirroring
`blockPropControl("statistic", "value", { label:"Value", input:"text" })` (`:897`)
and `blockPropControl("columns", "count", { label:"Column count", input:"number",
panel:"layout", clamp:{…} })`. `PageEditorControlInput` (`:54`) is a **bare string
union** (`"text"|"number"|"select"|"segmented"|"switch"|"color"|"swatch"|"media"|…`);
`options?: readonly string[]` (`:112`) carries **bare enum strings only**; a slider
is `input:"number"` + `clamp:{min,max}` (`:132`) + optional `unit` (`:136`). There
is NO `input.kind` object, no `"slider"` member, no `{value,label}` option objects,
no `min/max/suffix` descriptor fields, and NO per-descriptor applicable-block-types
field (`PageEditorControlDefinition`, `:103`, has none — per-type scoping comes
purely from living in `pageBlockControlRegistry.icon`). Import `animatedIconNames`
/ `animatedIconAnimations` (bare `readonly string[]`) from `pageDocumentV2.ts`
(521-01).

## Implementation pseudocode

```ts
// (0) pageDocumentV2.ts capability-sets seam — flip icon to a real, insertable
//     block (lands AFTER the L02 renderer case so runtimeRenderer:"real" is true):
//   realRuntimeBlockTypes (:691)      → add "icon"
//   editorInsertableBlockTypes (:715) → add "icon"  (insertableBlockTypes aliases it)
//   pageBlockCapabilityReasons (:774) → DELETE the icon "icon-runtime-renderer-pending" entry
// Result: pageBlockCapabilities.icon === { runtimeRenderer:"real",
//   editorInsertable:true, insertable:true } (no reason). 521-04-L04 edits the frozen
//   tests that asserted the old placeholder state.

// (1) pageEditorOptions.ts — enrich the existing icon entry (match the shape of
//     neighboring entries at :86-89):
icon: { label: "Icon", description: "Animated inline icon (spin / pulse / bounce / draw)." },

// (2) pageEditorControlRegistry.ts — populate pageBlockControlRegistry.icon (:903),
//     via blockPropControl("icon", key, {…}); bare `input`, `options` as string[]:
icon: [
  blockPropControl("icon", "name", {
    label: "Icon",
    input: "select",
    options: [...animatedIconNames],          // bare string[] (imported enum)
  }),
  blockPropControl("icon", "animation", {
    label: "Animation",
    panel: "style",
    input: "segmented",
    options: [...animatedIconAnimations],      // "none"|"spin"|"pulse"|"bounce"|"draw"
  }),
  blockPropControl("icon", "size", {
    label: "Size",
    panel: "style",
    input: "number",
    clamp: { min: 16, max: 160 },
    unit: "px",
  }),
  blockPropControl("icon", "speed", {
    label: "Speed",
    panel: "style",
    input: "number",
    clamp: { min: 400, max: 4000 },
    unit: "ms",
  }),
  blockPropControl("icon", "color", {
    label: "Color",
    panel: "style",
    input: "color",                            // 519 alpha swatch when landed; hex otherwise
  }),
],
```

**Step note:** `blockPropControl`'s `Pick` (`:177-184`) forwards only
`label|input|panel|options|optionsSource|filterBy|clamp|unit` — it does **NOT**
forward `step` (even though `PageEditorControlDefinition.step`, `:134`, exists).
So EITHER omit `step` (the number adapter's default step applies) OR extend the
`blockPropControl` `Pick` to include `"step"` in a single additive line if a
non-default step is required. Default: omit `step`.

**Match the existing per-type descriptor shape EXACTLY** (read `:175-200` +
sibling entries `:897`/`:912` first) — bare `input`, `options` as `string[]`,
`clamp:{min,max}` for numeric ranges, `unit` for the readout. Do NOT introduce
`input.kind`, `{value,label}` option objects, `min/max/suffix`, or an
applicable-types filter (none exist in the live shape and would not typecheck).

## Regression-test shape (delegated to L04, asserted here)

- `blockOptionCopy.icon` label/description updated; `pageBlockControlRegistry.icon`
  contains the 5 icon descriptors with write ids `block.icon.props.{name,animation,
  size,speed,color}` and paths `props.{…}`; the name/animation `options` (bare
  `string[]`) `===` `animatedIconNames` / `animatedIconAnimations` (imported);
  `size`/`speed` carry `clamp:{min:16,max:160}` / `clamp:{min:400,max:4000}` +
  `unit:"px"`/`"ms"`. `pageUniversalBlockControls` (`:362`) is unchanged (the icon
  controls do NOT leak onto heading/quote/statistic/etc.).

## Hard Invariants

1. No `PageEditor.tsx` edit (renders through the generic block-control field).
2. Controls live in `pageBlockControlRegistry.icon` (`:903`) via `blockPropControl`
   — the universal array (`:362`) is untouched (no noise on other block types).
3. `options` values `===` the imported model enums (bare `string[]`, no re-typing,
   no `{value,label}` wrapping).
4. Bare `input` union members only (`"select"`/`"segmented"`/`"number"`/`"color"`);
   number sliders use `clamp`+`unit`, never a fabricated `"slider"` member.
5. **Capability flip lands HERE** (`pageDocumentV2.ts` `:691`/`:715`/`:774`), AFTER
   the L02 renderer case (so `runtimeRenderer:"real"` is truthful) and TOGETHER with
   the palette copy + controls (so `editorInsertable:true` coincides with a usable
   palette entry — the flow palette loop passes). It is a disjoint additive seam in
   `pageDocumentV2.ts`, not a single-writer breach; 521-01 does NOT flip. The frozen
   capability tests are edited by 521-04-L04.
