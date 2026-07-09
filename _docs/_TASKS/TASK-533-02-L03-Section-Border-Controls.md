# TASK-533-02-L03: Per-Edge Section Border Controls

# FileName: TASK-533-02-L03-Section-Border-Controls.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-02
**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Add per-edge section border controls (in a labelled `TASK-533` region of
`core/services/pages/pageEditorControlRegistry.ts`): color + width + style per edge
(top/right/bottom/left), so the author can set a `border-block` (top+bottom) or a
full border. Mirror the existing per-edge factory pattern.

**Also close the editor-side value-sanitizer gap for the nested (length-4) border color
path (in a labelled `TASK-533` region of `core/services/pages/pageEditorMutationActions.ts`).**
`sanitizePageEditorControlValue` (`:72-80`) destructures `const [group, key] =
control.overridePath` and routes `group==="style"` to `sanitizeStyleValue(key, value)`
(`:63-70`). For the border color control the path is `["style","border",side,"color"]`, so
`group="style"` but `key="border"` (NOT `"color"`) — `sanitizeStyleValue` only
color-sanitizes when `key` is exactly `"textColor"|"borderColor"|"accent"`, so the border
color falls through `return value` UNSANITIZED into the editor's optimistic client state.
This is NOT a persistence/SSR hole (the write boundary re-normalizes via
`normalizeSectionStyle` → `readOptionalSafeColor`, and 533-02-L02 re-guards at emit via
`sanitizeAuthoringCssColor`), but the live editor PREVIEW could momentarily hold an
unsanitized string. This leaf routes the nested border color path through
`sanitizeAuthoringCssColor` too (see §Security note).

## Grounded anchors (RE-GREP at implement time)

- **Per-edge control factory precedent** — the block padding/margin factory
  `pageEditorControlRegistry.ts:577-602`
  (`(["top","right","bottom","left"] as const).flatMap((side) => [ control(...) ])`).
  Reuse this exact shape for the section border edges.
- **`pageUniversalSectionControls`** — `:225`. Append the border controls at the END.
- **Color/number/segmented input kinds** — `block.style.borderColor`
  (`input:"color"` `:547-554`), `block.style.borderWidth` (`input:"number"`,
  `clamp` `:556-565`), `block.style.borderStyle` (`input:"segmented"`,
  `options: pageBlockBorderStyles` `:566-576`) are the block-border control precedent
  to mirror per section edge.
- Import `PAGE_SECTION_BORDER_WIDTH_CLAMP` + the border-style enum from
  `pageDocumentV2.ts` (533-02-L01).
- **Editor value sanitizer** — `pageEditorMutationActions.ts`:
  `sanitizePageEditorControlValue` (`:72-80`), `sanitizeStyleValue` (`:63-70`), the
  `const [group, key] = control.overridePath` destructure (`:76`). Extend to route the
  `style.border.*.color` path through `sanitizeAuthoringCssColor` (already imported / add to
  the append-only import block).

## Implementation pseudocode

```ts
// pageUniversalSectionControls — append (TASK-533 region)
...(["top", "right", "bottom", "left"] as const).flatMap((side) => [
  control({
    id: `section.style.border.${side}.color`,
    panel: "style", target: "section", label: `Border ${side} color`,
    path: ["style", "border", side, "color"],
    input: "color", responsive: false,
  }),
  control({
    id: `section.style.border.${side}.width`,
    panel: "style", target: "section", label: `Border ${side} width`,
    path: ["style", "border", side, "width"],
    input: "number", responsive: false,
    clamp: PAGE_SECTION_BORDER_WIDTH_CLAMP,
    // no fallback → unset shows empty (present-only honesty)
  }),
  control({
    id: `section.style.border.${side}.style`,
    panel: "style", target: "section", label: `Border ${side} style`,
    path: ["style", "border", side, "style"],
    input: "segmented", responsive: false,
    options: pageBlockBorderStyles, fallback: "none",
  }),
]),
```

- `responsive:false` — a per-breakpoint section border delta is not part of scope
  (mirror the section effect controls' base-only pattern); the border is
  device-uniform.
- No misleading `fallback` on color/width (present-only honesty; mirror the opacity/
  radius fallback fix precedent `:518-520`).
- Verify the control system supports nested `path` arrays of length 4 (`["style",
  "border", side, "color"]`) — the padding/margin factory uses length-3
  (`["style","padding",side]`); if a depth limit exists, ground it and adjust (the
  model stores `border[side][prop]`, so the control path must reach it).

## Security note

The PERSISTED doc and the SSR render are double-gated: 533-02-L01 re-normalizes at the
write boundary (`normalizeSectionStyle` → `readOptionalSafeColor` color, clamped width,
enum style) and 533-02-L02 re-guards the color at emit (`sanitizeAuthoringCssColor`), so a
tampered client payload can NEVER inject a raw value into a stored doc or rendered HTML.

**Editor-side client-layer gap — closed by this leaf.** `sanitizePageEditorControlValue`
(`pageEditorMutationActions.ts:72-80`) reads only `const [group, key] = control.overridePath`,
so for the length-4 border color path `["style","border",side,"color"]` it sees
`key="border"` and `sanitizeStyleValue` (`:63-70`) does NOT color-sanitize it (it matches
only `textColor|borderColor|accent`) — the raw author color would sit unsanitized in the
editor's optimistic client state until the next server round-trip. Firm decision (option a):
extend `sanitizeStyleValue`/`sanitizePageEditorControlValue` to detect the nested border
color segment (the FINAL path segment is `"color"` AND `overridePath[1]==="border"`, i.e.
match a `style.border.*.color` shape) and route it through `sanitizeAuthoringCssColor`,
closing the client-preview gap in lockstep with the normalize boundary + emit re-guard.
Add a test asserting a bad border color (`"expression(alert(1))"` /
`"url(//evil)"`) is dropped end-to-end (editor value sanitize → normalize → emit).

## Vitest test lane (authored in 533-02-L04)

Assert the 12 border control ids exist (`section.style.border.{top,right,bottom,left}.{color,width,style}`)
with the correct `path` (length-4) and the width `clamp = PAGE_SECTION_BORDER_WIDTH_CLAMP`.
Also assert `sanitizePageEditorControlValue` drops a bad border color for a
`style.border.*.color` control (`"expression(alert(1))"` → sanitized/undefined), proving
the nested length-4 color path now reaches `sanitizeAuthoringCssColor` (regression guard for
the `[group,key]`-destructure gap).

## Regression / breaking-test ownership

Additive; no existing control test breaks. A control-count snapshot delta (if any) is
an owned update for 533-02-L04 (declared).

## Hard Invariants

1. 12 new control ids (4 edges × color/width/style), correct length-4 `path`,
   present-only (no misleading `fallback` on color/width).
2. REUSE the per-edge factory + block-border input kinds; add no new UI kind.
3. Additions in labelled `TASK-533` region (additive merge).
4. The editor value sanitizer routes the nested `style.border.*.color` path through
   `sanitizeAuthoringCssColor` (the `[group,key]` destructure otherwise leaves the length-4
   path unsanitized in optimistic client state); asserted end-to-end. Persistence/SSR stay
   double-gated (normalize + emit).
