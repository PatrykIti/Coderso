# TASK-521-04-L02: Renderer `case "icon"` (block-content region)

# FileName: TASK-521-04-L02-Animated-Icon-Renderer-Case.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-04
**Priority:** Medium
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the `renderPageBlockContent` `case "icon"` region of
`core/services/pages/pageRendererV2.tsx` (`:1912-1913`), replacing `return null`
with a render that reads the validated icon-block props and mounts `<AnimatedIcon>`
(521-04-L01) + emits a keyed `<style data-anim-icon-css>` carrying the static
keyframe CSS (idempotent — dup copies inert). Disjoint from 521-02
(section region) and 521-05 (page-root region).

## Grounded anchors

`renderPageBlockContent` switch (`:1900-1916`), `case "icon": return null;`
(`:1912-1913`); block props accessed as `block.props.<key>` (validated by 521-01
normalize — e.g. `readBadgeIcon(block.props.icon)` pattern at `:1029`); the file
already imports lucide marks at `:2` and resolves icon maps (`pageBadgeIconMap`,
`:1030`) and `sanitizeAuthoringCssColor` (`:66`, the token-backed color policy every
render-time color runs through — `:283`/`:284`/`:364`/`:367`/`:561`/`:565`/`:566`).
Import `AnimatedIcon` + `ANIMATED_ICON_KEYFRAMES_CSS` from `./animatedIconGlyphs`
(521-04-L01); `resolveAnimatedIconName` from `./pageDocumentV2` (defence-in-depth at
render). **Canvas note:** the builder canvas renders icons via
`PageSectionContent` → `renderPageBlockContent case "icon"`
(`PageAuthoringCanvas.tsx:938`), NOT through `PageDocumentRender` — so the keyframe
CSS MUST ride with the block (block-scoped emit), not the page shell, or the icon
animates on the front but is dead in the canvas (fails Acceptance 3's "front +
canvas"). **Grounded correction — there is NO render-scoped dedup Set here:** the
`renderPageBlockContent` context param is named `context` and typed
`PageBlockRenderContext` (`pageRendererV2.tsx:171-188`:
`blockPath`/`depth`/`includeHiddenBlocks`/`renderBlockFrame`/`renderInlineText`/
`renderColumnsSlotTrailing`/`runtimeDataByBlockId`/`layoutMode`/`slotKey`/
`parentBlock`) — it carries NEITHER a `runtimeScripts` registry NOR any `Set`, and
is NOT the widget `WidgetRenderContext`; the identifier `renderContext` does not
exist anywhere in `pageRendererV2.tsx` (grep=0, runtimeScripts is never threaded
into this renderer). So the keyframe CSS CANNOT be deduped via a render-scoped Set
without editing `PageBlockRenderContext` + all its call sites (outside 521-04's
declared `case "icon"` seam). PRIMARY mechanism = a keyed `<style data-anim-icon-css>`
emitted per icon block: identical `@keyframes`/`@media` rule sets dedupe in the
browser, so React SSR duplicates are harmless (idempotent CSS).

## Implementation pseudocode

```tsx
case "icon": {
  const name = resolveAnimatedIconName(block.props.name);          // render-boundary allowlist
  const animation = (block.props.animation as AnimatedIconAnimation) ?? "none";
  const size = clampInt(block.props.size, 16, 160, 48);
  const color = sanitizeAuthoringCssColor(block.props.color) ?? "var(--primary)"; // re-sanitize @ render
  const speed = clampInt(block.props.speed, 400, 4000, 1600);
  return (
    <>
      {/* keyframe CSS rides WITH the block (block-scoped) so it is present in BOTH
          the front shell AND the builder canvas (canvas bypasses PageDocumentRender).
          A keyed <style data-anim-icon-css> per icon block: React SSR duplicates are
          HARMLESS because identical @keyframes/@media rule sets dedupe in the browser
          (no render-scoped Set exists on PageBlockRenderContext — see anchors). */}
      <style data-anim-icon-css dangerouslySetInnerHTML={{ __html: ANIMATED_ICON_KEYFRAMES_CSS }} />
      <AnimatedIcon name={name} animation={animation} size={size} color={color} speed={speed} />
    </>
  );
}
```

**Keyframe CSS emission (block-scoped, canvas-safe, idempotent):** emit a keyed
`<style data-anim-icon-css>{ANIMATED_ICON_KEYFRAMES_CSS}</style>` from INSIDE
`case "icon"` (block level) so it appears wherever an icon block renders — front
shell AND builder canvas (the canvas renders via `renderPageBlockContent` directly,
so a page-shell/`PageDocumentRender`-only `<style>` would be ABSENT in the canvas
and break Acceptance 3). **This is the PRIMARY mechanism, not a fallback:** the
block-content `context` is `PageBlockRenderContext` (`pageRendererV2.tsx:171`) — it
carries NO `runtimeScripts` registry and NO `Set<string>`, so there is no
render-scoped dedup channel to thread here (adding one would require editing
`PageBlockRenderContext` + all call sites, outside 521-04's `case "icon"` seam).
React SSR renders one `<style>` per icon block, but the payload is a fixed set of
`@keyframes` + one `@media (prefers-reduced-motion)` guard, so identical duplicates
dedupe in the browser CSSOM — repetition is harmless and tiny. `ANIMATED_ICON_KEYFRAMES_CSS`
is a STATIC literal (no interpolation). Document the mechanism in the closure.
(If a single-emit is later deemed necessary, the ONLY grounded route is a scoped
model change — add a `Set<string>` field to `PageBlockRenderContext` and thread it
through the call sites — which is explicitly OUT of this leaf's seam and would move
to 521-01; not required, since duplicate identical CSS is inert.)

**Defence in depth:** `name` is re-resolved through `resolveAnimatedIconName` at
render (never trust stored data), `size`/`speed` re-clamped, and **`color` is
re-run through `sanitizeAuthoringCssColor` at render** (matching every other color
in `pageRendererV2.tsx` — `readSafeColor`-validated at WRITE + sanitized again at
RENDER, both boundaries; React SSR does NOT block semicolon-delimited CSS injection
inside a `style` value, so the render-time re-sanitize is required, not optional).
`animation` falls back to `"none"`.

## Regression-test shape (delegated to L04, asserted here)

- **Vitest render** (`renderToString`, `tests/vitest/pages/page-renderer-v2.test.tsx`
  per 521-04-L04): an `icon` block with
  `{name:"star",animation:"spin",size:64,color:"#0ea5e9",speed:1200}` renders an
  `<svg width="64">` inside `[data-anim-icon="spin"]` with `--anim-speed:1200ms`
  and `color:#0ea5e9`; `animation:"none"` → no `data-anim-icon` attr (static);
  `name:"bogus"` → sparkles fallback; `color:"expression(1)"` → `var(--primary)`
  (render-time `sanitizeAuthoringCssColor`); a `<style data-anim-icon-css>` carrying
  `ANIMATED_ICON_KEYFRAMES_CSS` is present whenever an icon block renders (front +
  canvas), and its body is IDENTICAL for every icon block (duplicate copies are
  inert — asserted by matching the emitted style text to the static constant, NOT
  by a strict single-occurrence count).

## Hard Invariants

1. Render-boundary re-validation: name allowlist, size/speed clamp, AND
   `sanitizeAuthoringCssColor(color)` (both write + render boundaries for color).
2. Keyframe CSS is BLOCK-scoped (present in front + canvas) via a keyed
   `<style data-anim-icon-css>`; the payload is a STATIC constant so duplicate
   emits from multiple icon blocks are IDEMPOTENT (identical `@keyframes`/`@media`
   dedupe in the browser — no render-scoped Set exists on `PageBlockRenderContext`
   to force a single emit, and none is required).
3. `animation:"none"` = static glyph; reduced-motion handled by the CSS media
   guard (L01).
