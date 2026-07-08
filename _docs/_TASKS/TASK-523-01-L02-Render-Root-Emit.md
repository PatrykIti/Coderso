# TASK-523-01-L02: Render Root Emit — Page Canvas Background (present-only, re-sanitize)

# FileName: TASK-523-01-L02-Render-Root-Emit.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-01
**Priority:** High
**Category:** Site Render / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the `PageDocumentRender` `rootStyle`/`<Root>` region of
`core/services/pages/pageRendererV2.tsx` (`:2847-2861`): threads a re-sanitized
`settings.background` into `rootStyle` as an inline `background` style, present-only,
so a page WITHOUT a background stays byte-identical and a page WITH one overrides the
`min-h-screen bg-white text-slate-950` `bg-white` utility. Disjoint from 523-02's
`PAGE_SPOTLIGHT_CSS` (`:2700`) + overlay (`:2879`).

## Grounded anchors

`PageDocumentRender` (`:2783`); `const effects = resolved.settings.effects` (`:2822`);
`const spotlightOn = !!effects?.cursorSpotlight` (`:2823`); the `rootStyle` build
(`:2847-2852`, currently `spotlightOn ? { --spotlight-color, --spotlight-size } :
undefined`); `<Root className={rootClassName ?? "min-h-screen bg-white
text-slate-950"} style={rootStyle} data-page-v2="true" …>` (`:2856-2861`).
`sanitizeAuthoringCssBackground` is ALREADY imported (`:80`); the section-background
re-sanitize precedent `const safe = sanitizeAuthoringCssBackground(value)` (`:347`)
and the color re-sanitize precedent for the spotlight (`sanitizeAuthoringCssColor(
effects?.spotlightColor)` `:2844-2846`). `CSSProperties` is already used for
`rootStyle` (`:2851`).

## Implementation pseudocode

```tsx
// (1) Re-sanitize settings.background at RENDER (defence-in-depth — React SSR does
//     NOT block a semicolon-delimited CSS injection inside a `style` value; matches
//     every other color/background in this renderer, e.g. :347). Present-only: a
//     page without a background yields `undefined`.
const canvasBackground = sanitizeAuthoringCssBackground(resolved.settings.background) ?? undefined;

// (2) MERGE the background into rootStyle present-only. rootStyle must now be built
//     when spotlightOn OR canvasBackground is set (previously spotlightOn-only :2847).
//     Keep the exact --spotlight-* vars; ADD `background` only when present. When
//     NEITHER is set, rootStyle stays `undefined` ⇒ byte-identical <Root>.
const rootStyle: CSSProperties | undefined =
  spotlightOn || canvasBackground
    ? {
        ...(spotlightOn
          ? {
              ["--spotlight-color" as string]: spotlightColor,   // existing :2849
              ["--spotlight-size" as string]: `${spotlightSize}px`, // existing :2850
            }
          : {}),
        ...(canvasBackground ? { background: canvasBackground } : {}),
      }
    : undefined;

// (3) <Root> unchanged except that `style={rootStyle}` (:2857) now also carries the
//     background. The inline `background` overrides the `bg-white` utility in the
//     default className; when canvasBackground is undefined the className is the only
//     background source (byte-identical to today).
<Root
  className={rootClassName ?? "min-h-screen bg-white text-slate-950"}
  style={rootStyle}
  data-page-v2="true"
  {...(anyMotion ? { "data-page-motion": "true" } : {})}
  {...(spotlightOn ? { "data-page-spotlight": "true" } : {})}
>
```

## Security

`settings.background` is `sanitizeAuthoringCssBackground`-validated at WRITE
(523-01-L01) AND re-run through `sanitizeAuthoringCssBackground` at RENDER here
(matching every other color/background in `pageRendererV2.tsx` — `:298`/`:347`/`:382`
/`:608` — because React SSR does NOT block `;`-delimited CSS injection inside a
`style` value). A non-safe stored value → `null`/`undefined` ⇒ NO `background` in
`rootStyle` (fail-soft, present-only). No raw stored string reaches the inline
`style`. Colors/gradients reach CSS ONLY via `sanitizeAuthoringCssBackground` (write
+ render).

## Vitest test lane

`tests/vitest/pages/page-renderer-v2.test.tsx` (the established `renderToString` SSR
suite — `tests/unit/pages/` is Bun-only). Delegated to 523-01-L04; asserted here.

## Regression-test shape (delegated to L04, asserted here)

- A doc with `settings.background = "#0ea5e9"` emits an inline `style` on the `<Root>`
  containing that background (and, if `spotlightOn`, the `--spotlight-*` vars too —
  both present, not clobbered).
- A doc with a safe gradient renders the gradient in the root `style`.
- A doc with NO `settings.background` and spotlight OFF ⇒ `<Root>` has NO inline
  `style` (byte-identical vs post-522 — `rootStyle` stays `undefined`).
- A doc with NO background but spotlight ON ⇒ `style` carries ONLY the `--spotlight-*`
  vars (no `background` key), byte-identical to 521's emit.
- A directly-mutated bad `settings.background` (bypassing normalize) → re-sanitized to
  `undefined` at render ⇒ no `background` in `style` (defence-in-depth).

## Hard Invariants

1. Present-only: no `background` (and spotlight off) ⇒ `rootStyle === undefined` ⇒
   byte-identical `<Root>` vs post-522.
2. `background` from `sanitizeAuthoringCssBackground` at RENDER (re-sanitized, never
   raw); merged into `rootStyle` WITHOUT dropping the `--spotlight-*` vars when both
   are present.
3. The inline `background` overrides the default `bg-white` utility; when unset the
   className is the sole background (unchanged).
4. Disjoint from 523-02 (`PAGE_SPOTLIGHT_CSS`/overlay) — this leaf touches ONLY
   `rootStyle`/`<Root>`.
