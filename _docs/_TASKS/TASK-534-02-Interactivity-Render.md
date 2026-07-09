# TASK-534-02: Interactivity RENDER — Switcher + ScrollHint Cases, Gallery Filter, Noise Overlay Emit

# FileName: TASK-534-02-Interactivity-Render.md

**Parent Task:** TASK-534
**Priority:** High
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Large
**Status:** ⏳ To Do

---

## Scope

Render subtask. Edits DISJOINT symbol regions of
`core/services/pages/pageRendererV2.tsx` (documented additive seam) and creates the
NEW sole-writer file `core/services/pages/pageInteractivityGlyphs.tsx` (scroll-hint
inline SVG + `@keyframes` CSS + the static noise-overlay data-URI, mirroring
`animatedIconGlyphs.tsx`). Stamps the DOM contracts the 534-01-L03 runtime binds:
switcher tablist/panels, gallery filter chips + `data-category`, scroll-hint glyph,
noise-overlay node. OR-widens the single `anyMotion` emit predicate. Depends on
534-01 (imports its exports read-only).

## Leaves

| Leaf | Scope |
|------|-------|
| **534-02-L01** | `renderPageBlockContent` NEW `case "switcher"` — tablist + panels + `data-switcher` contract |
| **534-02-L02** | `renderGallery` — filter chips + `data-category` + `[data-gallery]`/`[data-filter-item]` when `props.filterable` |
| **534-02-L03** | NEW `case "scrollHint"` + PAGE-ROOT region: OR-widen `anyMotion`, emit noise-overlay `<style>`+node (page root) + `PageSectionRender` section noise; NEW `pageInteractivityGlyphs.tsx` |
| **534-02-L04** | Render (`renderToString`) tests |

## Coordination

- `pageRendererV2.tsx` = documented additive seam; each leaf owns a DISJOINT symbol
  region (block switch cases vs `renderGallery` vs page-root/section). Append-only
  import block (`:1-50`) extended by all three (from `./pageInteractivityGlyphs`
  and `./pageCompositionEffects`). Any write outside a leaf's region is a reconcile
  failure.
- `pageInteractivityGlyphs.tsx` = 534-02 sole-writer (new file).
- The single effects `<script>` emit (`:3100`) is UNCHANGED except its `anyMotion`
  predicate is OR-widened (append-only boolean) — NEVER a second `<script>`.
- Every visual transition ships a CSS `motion-safe:` guard (crossfade, scroll-hint
  bob) — the CSS itself lives in 534-03 (`pageCompositionEffects.tsx`); this
  subtask emits the guarded nodes/attributes + the block-scoped keyframe CSS for
  the scroll-hint glyph (like `ANIMATED_ICON_KEYFRAMES_CSS`, `:2287`).
