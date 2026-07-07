# TASK-521-04: Animated-Icon Block — Curated Inline-SVG + CSS-Keyframes (implement the `icon` block)

# FileName: TASK-521-04-Animated-Icon-Block.md

**Parent Task:** TASK-521
**Priority:** Medium
**Category:** Site Render / Widgets / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-521-01 (icon-block prop model, `animatedIconNames` /
`animatedIconAnimations` / clamps, capability flip).

---

## Scope

Renders the animated-icon block from a curated **inline-SVG + CSS-keyframes** set —
NO npm dependency, CSP-safe, self-hosted, reduced-motion-safe. 521-01-L03 landed the
`icon` block's PROP MODEL (keys/defaults/normalize/Ajv) but left it a non-insertable
placeholder; **521-04 makes the block real**: it (1) adds a NEW glyph module (the
SVG set + keyframe CSS), (2) implements the `renderPageBlockContent` `case "icon"`
(currently `return null`), (3) enriches the editor palette/copy + block controls so
the block is discoverable + authorable, and (4) **FLIPS the `icon` capability**
(`realRuntimeBlockTypes` + `editorInsertableBlockTypes` add,
`pageBlockCapabilityReasons.icon` delete) in 521-04-L03 — landing the flip WITH the
renderer/palette/controls that the frozen flow/registry tests require, and editing
those frozen assertions in 521-04-L04. (The flip is deliberately NOT in 521-01 so
521-01 stays green in isolation — see 521-01-L03 Scope.)

**Single-writer:** NEW `core/services/pages/animatedIconGlyphs.tsx` (521-04 only);
`core/admin/ui/pages/editor/pageEditorOptions.ts` (521-04 only).
`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM — 521-04 owns ONLY the
`case "icon"` block-content region (`:1912-1913`) + any top-of-file icon import,
disjoint from 521-02 (section region) and 521-05 (page-root region), landing after
521-02. `pageEditorControlRegistry.ts` is ALSO a DOCUMENTED ADDITIVE SEAM — 521-04
owns ONLY the `pageBlockControlRegistry.icon` region (`:903`, the empty `icon: []`
per-type array), disjoint from 521-02's `pageUniversalSectionControls` (`:212`);
521-04 appends to the shared `tests/vitest/pages/page-editor-control-registry.test.ts`
after 521-02's cases merge. **`pageDocumentV2.ts` capability-sets region is a
NARROW DOCUMENTED ADDITIVE SEAM for 521-04-L03 only** — 521-04-L03 adds `"icon"` to
`realRuntimeBlockTypes` (`:691`) + `editorInsertableBlockTypes` (`:715`) and DELETES
`pageBlockCapabilityReasons.icon` (`:774`). These three capability symbols are
DISJOINT from 521-01's model regions (section-style, settings, `pageBlockPropKeys`/
defaults/normalize/Ajv) in the same file, and 521-04 lands strictly AFTER 521-01, so
this is the AGENTS-permitted disjoint-region seam (mirroring the `pageRendererV2.tsx`
split) — NOT a single-writer violation. No other 521-04 leaf touches
`pageDocumentV2.ts`. **`core/widgets/registry.ts` /
`core/widgets/modulePackMatrix.ts` are NOT edited** (no new widget — the `icon`
PAGE block is implemented via a renderer `case`).

**Test writer set (frozen-assertion edits owned by 521-04-L04):** because the flip
un-freezes the icon capability, 521-04-L04 is the sole owner of the EDITS to the
currently-frozen icon assertions in `tests/vitest/pages/page-editor-control-registry.test.ts`
(the "3 gated blocks" test `:378-399` — drop `icon` from `gatedBlockReasons`; the
"icon is the only placeholder" test `:401-407` — rewrite/remove) AND
`tests/vitest/ui/page-editor-v2-flow.test.tsx` (`:2324` `not.toContain("Icon")` →
now expects "Icon" in the palette; `:2328-2330` icon insertable/editorInsertable/
runtimeRenderer flip; the `:2008-2016` palette loop then passes for `icon`), plus
`tests/vitest/ui/page-editor-control-ui-model.test.ts` (`:93` palette-presence once
controls exist). These two files (`page-editor-v2-flow.test.tsx`,
`page-editor-control-ui-model.test.ts`) are ADDED to 521's declared writer set here
(they were not previously listed). **Coupling / land order:** the flow palette suite
is only fully green AFTER 521-04-L03 lands the flip + palette + controls and
521-04-L04 lands the test edits — 521-01's flip removal is exactly what keeps the
window between 521-01 and 521-04 green.

## Leaves

| Leaf | Title | File / region |
|------|-------|---------------|
| TASK-521-04-L01 | Curated glyph set + CSS keyframes | NEW `core/services/pages/animatedIconGlyphs.tsx` |
| TASK-521-04-L02 | Renderer `case "icon"` | `pageRendererV2.tsx` — `renderPageBlockContent` (`:1912`) |
| TASK-521-04-L03 | Palette copy + editor controls + **capability flip** | `pageEditorOptions.ts` (`:85`) + `pageEditorControlRegistry.ts` `pageBlockControlRegistry.icon` (`:903`) **[seam]** + `pageDocumentV2.ts` capability-sets region (`:691`/`:715`/`:774`) **[narrow additive seam]** |
| TASK-521-04-L04 | Animated-icon tests + frozen-capability-test edits | Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx` (render) + `tests/vitest/pages/page-editor-control-registry.test.ts` (descriptors append + EDIT `:378-407` frozen icon assertions) + `tests/vitest/ui/page-editor-v2-flow.test.tsx` (EDIT `:2324`/`:2328-2330`/`:2008-2016`) + `tests/vitest/ui/page-editor-control-ui-model.test.ts` (`:93`) + `tests/vitest/content/animatedIcon.test.tsx` (jsdom) |

**Land order:** L01 → L02 → L03 → L04.

## Coordination

- `pageRendererV2.tsx` `case "icon"` ONLY. Do NOT touch section render (521-02) or
  `PageDocumentRender` (521-05).
- **Capability flip (521-04-L03) lands AFTER the renderer case (521-04-L02).** The
  flip makes `runtimeRenderer:"real"` (needs the L02 renderer to exist) AND
  `editorInsertable:true` (needs the L03 palette copy + controls to exist) — so it
  MUST coincide with L03, never earlier. Within 521-04 the leaf land order
  L01→L02→L03→L04 keeps the frozen tests un-edited until L04; that within-subtask
  window is expected (L04 is the tests leaf). 521-01 does NOT flip, so the repo gate
  is green from 521-01 through the start of 521-04.
- Import `animatedIconNames` / `animatedIconAnimations` / `ANIMATED_ICON_*_CLAMP`
  / `resolveAnimatedIconName` read-only from `pageDocumentV2.ts` (521-01). The
  glyph module's key set MUST equal `animatedIconNames` (import-and-assert — a
  glyph missing for an allowlisted name = fallback glyph, never a crash).
- Keyframe CSS is emitted with the block (scoped `<style>` or a shared page-CSS
  string) `motion-safe:`-gated / `@media (prefers-reduced-motion: reduce)` pausing
  the animation.

## Hard Invariants

1. NO npm dependency (curated inline SVG + hand-written keyframes).
2. Reduced-motion: keyframes paused via `@media (prefers-reduced-motion: reduce) {
   animation: none }` (or `motion-safe:` utility) — static glyph for reduce users.
3. Icon `name` resolved against the allowlist at render; unknown → neutral
   fallback glyph (never interpolate `name` into markup).
4. `animation:"none"` = a static (non-animated) glyph; size/color/speed applied as
   bounded inline style / CSS vars only.
5. The block is now insertable + rendered; legacy docs (no `icon` block) unchanged.

## Definition of done

`icon` block renders an animated inline SVG at authored name/animation/size/color/
speed on front + canvas; discoverable in the palette + authorable via controls;
reduced-motion → static; invalid name → fallback; no dependency added; tests green.
