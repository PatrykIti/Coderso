# TASK-534-02-L03: ScrollHint Renderer Case + Noise-Overlay Emit + Glyph Module + `anyMotion` OR-Widen

# FileName: TASK-534-02-L03-ScrollHint-Renderer-And-Noise-Overlay-Emit.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-02
**Priority:** Medium
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. (a) Creates the NEW sole-writer file
`core/services/pages/pageInteractivityGlyphs.tsx` (scroll-hint inline SVG set +
`@keyframes` CSS + the static noise-overlay data-URI, mirroring
`animatedIconGlyphs.tsx`). (b) Edits `pageRendererV2.tsx`: a NEW
`case "scrollHint"` in `renderPageBlockContent`, the PAGE-ROOT region of
`PageDocumentRender` (OR-widen `anyMotion`; emit the present-only page noise
overlay), and the section noise overlay inside `PageSectionRender`. Reproduces the
prototype scroll-hint dot (§ Hero) + grain washes (§ Hero/Proces). Disjoint from
L01/L02.

## Grounded anchors

- Glyph-module precedent: `animatedIconGlyphs.tsx` (`AnimatedIcon` +
  `ANIMATED_ICON_KEYFRAMES_CSS`, imported `pageRendererV2.tsx:40`; block-scoped
  keyframe `<style dangerouslySetInnerHTML={{__html: ANIMATED_ICON_KEYFRAMES_CSS}}>`
  emitted WITH the block `:2287` so it works on BOTH front + canvas).
- `renderPageBlockContent` switch (`case "icon"` `:2254`, `case "customSvg"`).
- PAGE-ROOT region `PageDocumentRender` `:3001-3106`: `effects` `:3004`,
  `spotlightOn` `:3005`, `hasSectionEffect` `:3006`, `usesComposition`/
  `compositionTilt` `:3012-3013`, **`anyMotion` `:3014`** (OR-widen HERE), the
  `<Root>` `data-page-motion`/`data-page-spotlight` `:3056-3057`, present-only
  spotlight `<style>`+overlay `:3073-3082`, composition `<style>` `:3087-3091`, the
  section map `:3093-3099`, and the SINGLE `<script>` emit `:3100-3105`.
- `PageSectionRender` (the section wrapper; grep it — the section noise overlay is a
  present-only `<div data-noise-overlay>` child, disjoint from the block switch).
- `docUsesCompositionEffects` (`pageRendererV2.tsx:2924`) + `usesCompositionTilt`
  (`:2956`, recursing slots via `blockUsesCompositionTilt` `:2942`) are the exact
  precedent for the NEW LOCAL `usesInteractivityRuntime(document)` resolver added in
  THIS leaf (in `pageRendererV2.tsx`, near `:2956`) that OR-widens `anyMotion`. It
  returns true iff any block authors a `switcher`, a filterable `gallery`, or
  `style.magnetic` (recursing slots incl. the new `panel:N`). scrollHint + noise are
  NOT runtime-bearing ⇒ they do NOT widen `anyMotion`.

## Implementation pseudocode

```tsx
// core/services/pages/pageInteractivityGlyphs.tsx (NEW — static literals)
export const SCROLL_HINT_GLYPHS = {
  dot: /* inline <svg> mouse-with-bobbing-dot */,
  chevron: /* inline <svg> double-chevron */,
} as const;
// Static self-generated grain (SVG turbulence data-URI — NO asset, NO author input):
export const NOISE_OVERLAY_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";
export const INTERACTIVITY_KEYFRAMES_CSS =
  // scroll-hint bob (motion-safe only); noise overlay is STATIC (no keyframe).
  "@keyframes cx-scrollhint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}" +
  "@media (prefers-reduced-motion: no-preference){[data-scroll-hint] .cx-hint-dot{animation:cx-scrollhint-bob 1.6s ease-in-out infinite}}" +
  "[data-noise-overlay]{position:absolute;inset:0;pointer-events:none;background-image:" + NOISE_OVERLAY_DATA_URI + ";mix-blend-mode:overlay}";

// pageRendererV2.tsx — case "scrollHint" (block-scoped keyframe rides WITH it, :2287 pattern)
case "scrollHint": {
  const glyph = block.props.glyph === "chevron" ? "chevron" : "dot";
  const label = typeof block.props.label === "string" ? block.props.label : "Scroll";
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }} />
      <div data-scroll-hint className="cx-scroll-hint" aria-hidden="true">
        <span className="cx-hint-dot">{SCROLL_HINT_GLYPHS[glyph]}</span>
        {label ? <span className="sr-only">{label}</span> : null}  {/* escaped text */}
      </div>
    </>
  );
}

// pageRendererV2.tsx — PAGE-ROOT: OR-widen anyMotion (:3014). NOTE — scrollHint has
// NO runtime (CSS keyframe only), so it does NOT widen anyMotion. Only the RUNTIME-
// bearing 534 surfaces (switcher / gallery-filter / magnetic) widen it:
const usesInteractivity = usesInteractivityRuntime(document);   // NEW local resolver (this leaf)
const anyMotion = spotlightOn || hasSectionEffect || compositionTilt || usesInteractivity;

// Present-only page-root noise overlay (a DISJOINT new node; effects.noiseOverlay):
const pageNoise = !!resolved.settings.effects?.noiseOverlay;
// … in <Root> (present-only, only when pageNoise):
{pageNoise && (
  <>
    <style data-page-noise-css dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }} />
    <div aria-hidden="true" data-noise-overlay className="pointer-events-none absolute inset-0" />
  </>
)}

// PageSectionRender — present-only SECTION noise overlay (section.style.noiseOverlay):
{section.style.noiseOverlay && (
  <>
    <style data-section-noise-css dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }} />
    <div aria-hidden="true" data-noise-overlay className="pointer-events-none absolute inset-0" />
  </>
)}
// (the section wrapper must be a positioning context — verify it is position:relative;
//  the overlay is inset:0 absolute; add relative only if the wrapper lacks it.)
```

**One `<script>`:** `anyMotion` OR-widen is the ONLY emit change — the existing
single `<script>` (`:3100`) now also fires when a switcher/filter/magnetic surface
is authored. **scrollHint + noise emit NO `<script>`** (CSS keyframe / static
overlay). **Idempotent CSS:** if the same `INTERACTIVITY_KEYFRAMES_CSS` is emitted
by multiple sites, the rules are idempotent (identical `@keyframes`/selectors) — de
minimis; or gate the page-root/section emit through a single "uses noise/scrollHint"
flag to emit once (prefer the flag if trivial).

## Security note

`pageInteractivityGlyphs.tsx` is 100% STATIC author-free literals — the inline
SVGs and the noise data-URI contain NO stored/user data (no interpolation surface).
`glyph` is re-validated at render against the fixed set; `label` is an escaped
`sr-only` TEXT node (never `dangerouslySetInnerHTML`). The noise overlay uses a
compile-time data-URI with a fixed low opacity — no `sanitizeAuthoringCssBackground`
path, no author color (NO 531 relaxation). `data-noise-overlay`/`data-scroll-hint`
are fixed attribute literals. `anyMotion`'s OR-widen is a boolean — no injection.

## Test lane

**Vitest render** (`renderToString`, `tests/vitest/pages/`) — delegated to
534-02-L04, asserted here: a `scrollHint` block renders `[data-scroll-hint]`
`aria-hidden` with the chosen glyph + `sr-only` label + the bob keyframe CSS; a
page with `settings.effects.noiseOverlay:true` renders a `[data-noise-overlay]`
node + the noise CSS; a section with `style.noiseOverlay:true` renders the section
overlay; a page with a `switcher`/`magnetic`/filterable-gallery emits the single
effects `<script>` (deduped id) via the widened `anyMotion`; a page with ONLY a
`scrollHint`/noise (no runtime surface) emits NO `<script>` (CSS/static only); a
page with none of the 534 surfaces is byte-identical (no overlay, no extra CSS, no
script).

## Regression / owned-breaking-test notes

- **Owned:** the `PageDocumentRender` byte-identity / `anyMotion`-gated-`<script>`
  assertions in `tests/vitest/pages/*` (the 521/522 emit tests). The OR-widen keeps
  them green for no-effect docs (no 534 surface ⇒ `usesInteractivity` false ⇒
  unchanged) but ADD cases proving the widen fires ONLY for runtime-bearing surfaces
  (switcher/filter/magnetic) and NOT for scrollHint/noise-only.
- New renderer `case "scrollHint"` satisfies the exhaustive block-type switch
  (typecheck) alongside 534-02-L01's `case "switcher"`.

## Hard Invariants

1. Present-only: no scrollHint/noise ⇒ byte-identical; `anyMotion` OR-widen only
   affects runtime-bearing surfaces.
2. ONE `<script>` (widened predicate only, `:3100`); scrollHint/noise emit none.
3. Static author-free glyph/noise literals; glyph re-validated; label escaped;
   overlays `aria-hidden`/`pointer-events:none`.
4. scroll-hint bob + any transition CSS `motion-safe:`/reduced-motion guarded; noise
   is STATIC (renders identically under reduced-motion).
