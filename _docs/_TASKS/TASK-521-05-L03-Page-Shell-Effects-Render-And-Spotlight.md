# TASK-521-05-L03: Page-Shell Effects Render + Cursor-Spotlight (`PageDocumentRender`)

# FileName: TASK-521-05-L03-Page-Shell-Effects-Render-And-Spotlight.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-05
**Priority:** High
**Category:** Site Render / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the `PageDocumentRender` page-root region of
`core/services/pages/pageRendererV2.tsx` (`:2324-2370`): stamps the
`data-page-motion` root marker on the front/preview render path (canvas-free — the
builder canvas bypasses `PageDocumentRender`), which the 521-01 runtime locates to
set `[data-reveal-armed]` (the actual gate for 521-02's reveal-hide CSS —
JS-required-to-HIDE), emits a `<noscript>` reveal-visible fallback, renders the
per-page cursor-spotlight overlay + CSS custom properties from validated
`document.settings.effects`, and emits `PAGE_EFFECTS_RUNTIME_SOURCE` (521-01-L04)
ONCE when any effect is present. Disjoint from 521-02 (section) and 521-04
(block-content); lands LAST in the seam.

## Grounded anchors

`PageDocumentRender({ document, breakpoint, emptyContent, runtimeDataByBlockId,
rootTag="main", rootClassName })` (`:2324-2343`); `<Root className={rootClassName
?? "min-h-screen bg-white text-slate-950"} data-page-v2="true">` (`:2361`);
`resolved.sections` (`:2362`). Inline-script mechanism:
`renderSharedWidgetRuntimeScript` (`runtimeScripts.tsx:27`) OR a direct
`<script dangerouslySetInnerHTML>` (precedent `renderPublicPage.tsx:168`).
`PageDocumentRender` is the SHARED FRONT+PREVIEW renderer (`pageRuntimeV2.tsx:58`
`DefaultRuntimePageShellV2`, `siteShell.tsx`) — NOT the admin builder canvas (which
renders via `PageSectionContent` directly, `PageAuthoringCanvas.tsx:938`) — and it
carries NO `isPreview`/`mode` flag (`isPreview`, `pageRuntimeV2.tsx:15`, is NOT
threaded in), so effects run on BOTH front and preview (preview parity is intended;
the canvas is the only surface that stays effect-free). `sanitizeAuthoringCssColor`
is already imported at `pageRendererV2.tsx:66`. Import
`PAGE_EFFECTS_RUNTIME_SOURCE`/`PAGE_EFFECTS_RUNTIME_ID` from `pageEffectsRuntime.ts`
(521-01-L04); `PAGE_SPOTLIGHT_SIZE_CLAMP` from `pageDocumentV2.ts` (521-01-L02);
`PAGE_REVEAL_MOTION_CSS` from `pageRendererV2.tsx` (the reveal-hide rule STRING
exported by 521-02-L02 — the ONLY place the reveal HIDE state ships, per the
committed single path; this leaf MUST emit it or the reveal-hide never applies).

## Implementation pseudocode

```tsx
const effects = resolved.settings.effects;                 // present-only (validated)
const spotlightOn = !!effects?.cursorSpotlight;
const hasSectionEffect = resolved.sections.some((s) => s.style.scrollEffect != null);
const anyMotion = spotlightOn || hasSectionEffect;

// Spotlight CSS custom props from VALIDATED values (never raw):
const spotlightSize = Math.max(120, Math.min(900, effects?.spotlightSize ?? 400));
const spotlightColor = sanitizeAuthoringCssColor(effects?.spotlightColor) ?? "var(--primary)"; // re-sanitize @ render
const rootStyle = spotlightOn
  ? ({ ["--spotlight-color" as string]: spotlightColor,
       ["--spotlight-size" as string]: `${spotlightSize}px` } as CSSProperties)
  : undefined;

// STATIC spotlight background rule (module-scope const in this leaf's region — NOT a
// Tailwind arbitrary variant). Reads the validated custom props off the root; scoped
// under [data-page-spotlight] so it is inert unless the root marker is present, and
// @media (prefers-reduced-motion: no-preference) so reduce users get NO gradient:
const PAGE_SPOTLIGHT_CSS =
  '@media (prefers-reduced-motion: no-preference){'
  + '[data-page-spotlight] [data-page-spotlight-overlay]{'
  + 'background:radial-gradient(var(--spotlight-size,400px) at '
  + 'var(--spotlight-x,50%) var(--spotlight-y,50%),'
  + 'var(--spotlight-color,var(--primary)),transparent 70%)}'
  + '}';

return (
  <Root
    className={rootClassName ?? "min-h-screen bg-white text-slate-950"}
    style={rootStyle}
    data-page-v2="true"
    {...(anyMotion ? { "data-page-motion": "true" } : {})}         // SSR marker the runtime locates to arm reveal
    {...(spotlightOn ? { "data-page-spotlight": "true" } : {})}    // spotlight target
  >
    {/* Reveal HIDE state — the ONLY emit of 521-02-L02's exported rule string
        (committed single path; NOT a Tailwind class). Scoped under the runtime-set
        [data-reveal-armed], so it is inert until the runtime arms. */}
    {hasSectionEffect && (
      <style data-page-motion-css
        dangerouslySetInnerHTML={{ __html: PAGE_REVEAL_MOTION_CSS }} />
    )}
    {/* Belt-and-suspenders: pure JS-disabled users keep reveal content visible.
        (The primary guard is [data-reveal-armed], set by the runtime — 521-02-L02.) */}
    {hasSectionEffect && (
      <noscript dangerouslySetInnerHTML={{
        __html: "<style>[data-page-effect^=\"reveal\"]{opacity:1;transform:none}</style>",
      }} />
    )}
    {spotlightOn && (
      <>
        {/* Radial-gradient background ships as a STATIC CSS STRING (committed
            single-path discipline — the SAME reason 521-02-L02 ships
            PAGE_REVEAL_MOTION_CSS as a static string instead of a nested arbitrary
            Tailwind variant). A raw `[background:radial-gradient(...,...)]` arbitrary
            value contains multiple var() refs + RAW COMMAS, a known fragile/unreliable
            JIT case; we do NOT gamble on it. Scoped under @media
            (prefers-reduced-motion: no-preference) + [data-page-spotlight], reading
            --spotlight-x/y/size/color, emitted once here: */}
        <style data-page-spotlight-css
          dangerouslySetInnerHTML={{ __html: PAGE_SPOTLIGHT_CSS }} />
        {/* Overlay carries ONLY JIT-safe standard utilities; the fragile background
            comes from PAGE_SPOTLIGHT_CSS above. position follows --spotlight-x/y
            (runtime), reduced-motion users get no gradient (the @media guard): */}
        <div aria-hidden="true" data-page-spotlight-overlay
          className="pointer-events-none fixed inset-0 z-0" />
      </>
    )}
    {resolved.sections.map((section) => (
      <PageSectionRender key={section.id} section={section}
        runtimeDataByBlockId={runtimeDataByBlockId} />
    ))}
    {anyMotion && (
      <script data-coderso-runtime-script={PAGE_EFFECTS_RUNTIME_ID}
        dangerouslySetInnerHTML={{ __html: PAGE_EFFECTS_RUNTIME_SOURCE }} />
    )}
  </Root>
);
```

**Security (both boundaries):** `--spotlight-color` is `readSafeColor`-validated at
WRITE (521-01) AND re-run through `sanitizeAuthoringCssColor` at RENDER (matching
every other color in `pageRendererV2.tsx` — `:283`/`:364`/`:561`/etc.; React SSR
does NOT block semicolon-delimited CSS injection inside a `style` value, so the
render-time re-sanitize is required before feeding the radial-gradient);
`--spotlight-size` is a clamped number; the script is a STATIC literal (521-01-L04,
no interpolation). No raw stored string reaches a CSS declaration or the script.
**Front+preview (canvas-free):** emitted through the shared front/preview
`PageDocumentRender`; the builder canvas uses a different renderer
(`PageAuthoringCanvas.tsx:938`), so no scroll listeners fight the editor.
**Present-only:** `anyMotion === false` ⇒ NO marker, NO overlay, NO script, NO
`style` — byte-identical `<Root>`.
**Reduced-motion / touch:** the runtime early-returns (521-01-L04); the overlay CSS
is `motion-safe:`-gated; reduce/coarse users see no spotlight motion.

## Regression-test shape (delegated to L04, asserted here)

- **Vitest render** (`renderToString`, `tests/vitest/pages/page-renderer-v2.test.tsx`
  per 521-05-L04): a doc with `settings.effects.cursorSpotlight:true`
  emits `data-page-spotlight`, `data-page-motion`, the `[data-page-spotlight-overlay]`
  div (JIT-safe utilities only — NO arbitrary `[background:…]` class), a `<style
  data-page-spotlight-css>` whose `__html` === `PAGE_SPOTLIGHT_CSS` (assert it is
  wrapped in `@media (prefers-reduced-motion: no-preference)` and contains the
  `radial-gradient` reading `--spotlight-*`), the `--spotlight-color`/`--spotlight-size`
  custom props, and ONE effects `<script>`;
  a bad `spotlightColor` → `var(--primary)` (render-time `sanitizeAuthoringCssColor`);
  a doc with a section `scrollEffect` but no page effect emits `data-page-motion` +
  the `<style data-page-motion-css>` whose `__html` === `PAGE_REVEAL_MOTION_CSS` +
  the `<noscript>` fallback + the script but NO spotlight overlay; a doc with NO
  effects emits none of these (byte-identity vs pre-521). Script `__html` ===
  `PAGE_EFFECTS_RUNTIME_SOURCE`.

## Hard Invariants

1. Present-only: no effect ⇒ byte-identical `<Root>` (no marker/overlay/script/
   style).
2. `data-page-motion` (front/preview render path, NOT the builder canvas) is the
   SSR marker the runtime locates to set `[data-reveal-armed]`; the reveal-hide
   ships as the imported `PAGE_REVEAL_MOTION_CSS` string in `<style
   data-page-motion-css>` (emitted here when `hasSectionEffect`), gated by that
   runtime-set marker (JS-required-to-HIDE) + a `<noscript>` reveal-visible
   fallback, so content is never permanently hidden.
3. Spotlight color/size from validated values; script static; emitted once. The
   spotlight radial-gradient background ships as the STATIC `PAGE_SPOTLIGHT_CSS`
   string in `<style data-page-spotlight-css>` (committed single-path, matching
   `PAGE_REVEAL_MOTION_CSS`) — NOT a Tailwind arbitrary `[background:radial-gradient(
   …,…)]` variant (raw-comma/nested-var JIT-fragile). The overlay div carries only
   JIT-safe utilities (`pointer-events-none fixed inset-0 z-0`).
4. Reduced-motion + coarse-pointer disable spotlight: the gradient rule is inside
   `@media (prefers-reduced-motion: no-preference)` and the runtime early-returns on
   reduce/coarse pointer.
