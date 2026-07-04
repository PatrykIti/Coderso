# 1198 - TASK-477-01 Page Editor Inline Color Swatch Accuracy And Picker

**Date:** 2026-06-26
**Version:** Unreleased
**Tasks:** TASK-477 (in progress), TASK-477-01

## Key Changes

### Page V2 Authoring (inline color marks)

- The inline mark toolbar now offers a native **custom color picker** (a
  rainbow-swatch label wrapping `<input type="color">`) next to the token
  swatches, so authors can apply any sanitized hex color (e.g. orange) to a
  selection — not just the preset tokens. It reuses the existing toolbar
  selection-snapshot + blur guard (TASK-475-01), so the picker focuses without
  ending edit, and the applied color is painted in place (TASK-476-02).
- Fixed the native color dialog not opening when the picker was clicked. The OS
  color dialog opens as the **default action of the `click` event**, but the
  canvas block-frame `onClick` calls `event.preventDefault()` (block selection),
  and the picker's click bubbled into it — cancelling the dialog. The picker now
  stops the click before it reaches the block frame (`onClick` →
  `stopPropagation`, without `preventDefault`), so the native activation is
  preserved. (Swatches were unaffected because their `onClick` already stops
  propagation; the link text input was unaffected because it focuses on
  `mousedown`, not the click default action.)
- The token swatches now **preview the exact color they apply**. They were drawn
  from `DEFAULT_TOKENS` hexes while applying `var(--color-*)` resolved against the
  live theme, so e.g. the accent swatch showed orange but applied near-white and
  the background swatch showed white but applied near-black. Swatches now render
  `backgroundColor: swatch.value` (the token var), which resolves in the page-theme
  scoped canvas.
- The inline palette is curated to the tokens whose `var(--color-*)` resolves
  consistently in both the admin canvas and the front (`primary`, `secondary`,
  `accent`, `border`). The neutral `bg`/`surface`/`text` tokens use CSS variable
  names the admin canvas does not define (it carries `--color-background` /
  `-foreground` / `-muted`; the front emits `--color-bg` / `-surface` / `-text` via
  `tokenCss.ts`), so they previously applied an invalid color in-editor (the
  "white swatch → black text" report). Neutral colors are now reached via the hex
  picker, which works in both contexts.

### Tests

- `tests/vitest/ui/page-authoring-canvas.test.tsx`: a swatch previews its applied
  token var (not a default hex), the custom color picker is present, and firing it
  with a hex applies a `{type:"color", color:"#rrggbb"}` mark over the selection.
  A regression test asserts a click that reaches the block frame is
  `defaultPrevented` while a click on the picker is not (its `stopPropagation`
  preserves the native color-dialog activation).

## Validation

- `bun --cwd core lint` — pass; `bun --cwd core lint:types` — pass.
- `bunx vitest run` — `page-authoring-canvas` 11/11; broader page suites
  (renderer-v2, document-v2, control-registry, control-ui-model, xss-guards)
  159/159.
- `bun run gates:coderso` — baseline.
- Live smoke (`coderso-dev-core-host` + `playwright-cli`, real input + per-token
  probe): all curated swatches' displayed color equals their `var()`-resolved
  applied color; the custom picker applies `#ff8800` (orange), visible in place
  and on commit. No page saved or published.

## Notes / Follow-up

- The same DEFAULT-token preview mismatch on the **block-level** panel swatches
  (Text color / Background / Border / gradient) and the canonical neutral-token
  var-name contract (align `tokenCss` emission + `pageAuthoringSanitizers`
  allowlist + palette) remain open in **TASK-477-02**; the TASK-477 parent stays
  In Progress until it lands.
