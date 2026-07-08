# TASK-522-02-L02: Custom-SVG Editor Controls + Palette Copy

# FileName: TASK-522-02-L02-Custom-SVG-Editor-Controls-And-Palette.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-02
**Priority:** High
**Category:** Admin UI
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. ENRICHES the two 522-01-L01 stubs: fills
`pageBlockControlRegistry.customSvg` (`pageEditorControlRegistry.ts`, the `customSvg:[]`
stub) with the SVG paste / drawIn / drawSpeed / label controls, and
`blockOptionCopy.customSvg` (`pageEditorOptions.ts`) with real palette copy. Same map
KEY region as the stub (documented additive seam); no other block-type entry touched.

## Grounded anchors

- `pageBlockControlRegistry: Record<PageBlockType, readonly PageEditorControlDefinition[]>`
  (`pageEditorControlRegistry.ts:654`); `customSvg: []` stub (from 522-01-L01);
  `icon: []` at `:903` for shape reference; the control-definition shape is the same
  `PageEditorControlDefinition` used by `pageUniversalSectionControls` (`:212`).
- `blockOptionCopy: Record<PageBlockType, Omit<BlockOption,"type">>`
  (`pageEditorOptions.ts:85`); `customSvg` stub from 522-01-L01.
- Control field renderer: `SectionRegistryControlField` / block-control descriptors
  drive the compact rail (no `PageEditor.tsx` edit needed — declarative).

## Implementation pseudocode

Descriptors MUST match the LIVE `PageEditorControlDefinition`
(`pageEditorControlRegistry.ts:103-150`) built via the `blockPropControl(type, key,
{label, input, panel?, clamp?, unit?})` helper (`:175`) — which stamps
`id: "block.customSvg.props.<key>"`, `target:"block"`, `path:["props",<key>]`,
`responsive:true`, and the schema `fallback` automatically. The live `input` union is
`text|number|select|segmented|switch|color|swatch|media|items|facets` — there is NO
`textarea`/`toggle`, NO `showWhen`/`help`/`placeholder`/`prop`/`min`/`max`. So the SVG
paste uses `input:"text"` (accepts the pasted SVG string; a dedicated multiline widget
is a possible future foundation extension, out of scope), the boolean uses `"switch"`,
and there is NO conditional visibility (drawSpeed is always shown — inert when drawIn
off; see the parent's control-visibility decision).

```ts
// pageEditorControlRegistry.ts — fill pageBlockControlRegistry.customSvg via blockPropControl:
customSvg: [
  blockPropControl("customSvg", "svg", { label: "SVG source", input: "text", panel: "content" }),
  blockPropControl("customSvg", "label", { label: "Accessible label", input: "text", panel: "content" }),
  blockPropControl("customSvg", "drawIn", { label: "Stroke draw-in", input: "switch", panel: "style" }),
  blockPropControl("customSvg", "drawSpeed", { label: "Draw speed", input: "number", panel: "style",
    clamp: { min: 600, max: 6000 }, unit: "ms" }),
],

// pageEditorOptions.ts — replace the stub copy with real palette copy. BlockOption is
// { type; label; description } — NO icon field, so copy is icon-less (an `icon:` key
// is a TS excess-property error; there is no Shapes import):
customSvg: {
  label: "Custom SVG",
  description: "Paste a sanitized inline SVG (line drawings, logos, diagrams).",
},
```

**No `PageEditor.tsx` edit.** Authoring rides the declarative descriptor rail
(521-05's compact inspector). No `showWhen`: `drawSpeed` is always visible (inert when
`drawIn` is off). The sanitizer behaviour (dropped scripts/handlers/external refs) is
documented in the block description / a rail hint, not a per-control `help` field (no
such field exists). The editor MAY render a sanitized live preview by reusing the
522-02-L01 render path — optional, present-only.

## Regression-test shape (delegated to 522-02-L03, asserted here)

- `pageBlockControlRegistry.customSvg` has 4 controls with the expected ids
  (`block.customSvg.props.{svg,label,drawIn,drawSpeed}`), inputs (`text/text/switch/
  number`), and `drawSpeed.clamp` `{min:600,max:6000}`; the palette lists `customSvg`
  as insertable with its icon-less copy; the control resolver returns the customSvg
  controls for a customSvg block.
- **Lane:** Vitest `tests/vitest/pages/page-editor-control-registry.test.ts`.

## Hard Invariants

1. Enrich ONLY the `customSvg` map key (additive seam; no other type touched).
2. Declarative descriptors only (real `PageEditorControlDefinition` via
   `blockPropControl`) — no `PageEditor.tsx` edit; no invented descriptor fields.
3. No new npm dependency; blockOptionCopy stays icon-less (no lucide import).
</content>
