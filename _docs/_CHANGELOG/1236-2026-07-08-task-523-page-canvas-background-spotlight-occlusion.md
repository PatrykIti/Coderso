# 1236 - TASK-523 Page Canvas Background & Occlusion-Proof Cursor Spotlight — Per-Page `settings.background` + Additive Screen-Blend Spotlight (visible over opaque sections, nav-safe, reduced-motion-safe)

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-523, TASK-523-01, TASK-523-01-L01, TASK-523-01-L02, TASK-523-01-L03, TASK-523-01-L04, TASK-523-02, TASK-523-02-L01, TASK-523-02-L02

## Key Changes

Two owner deliverables, both riding the EXISTING page-settings + page-render seams
landed by TASK-521, both **present-only, jsonb-only, no-dependency, no-migration,
no-schema-bump** (`PAGE_DOCUMENT_SCHEMA_VERSION` stays `2`; a page with neither a
canvas background nor the cursor spotlight normalizes AND renders **byte-identical**
to post-522). Landed strictly in order 523-01 → 523-02 (disjoint sub-regions of the
same `pageRendererV2.tsx` render path; 523-02 rebased onto 523-01).

- **(D1) Page canvas background — `settings.background` (523-01):** a present-only
  per-page canvas background (a safe solid color OR CSS gradient in the MODEL) on a
  NEW sibling key `settings.background` (alongside `template`/`showInNav`/`effects`).
  - **Model + JSON schema + normalize allowlist (523-01-L01,
    `core/services/pages/pageDocumentV2.ts`):** `PageDocumentSettingsV2` gains
    present-only `background?: string`; `normalizeSettings` adds `background` to the
    `assertKnownKeys` reject-unknown allowlist and the strict `pageDocumentV2JsonSchema`
    `additionalProperties:false` settings shape (`background: {type:"string"}`). The
    value flows through the SINGLE color/gradient path `sanitizeAuthoringCssBackground`
    (safe color/gradient, else `null` ⇒ the key is dropped, fail-soft); an absent value
    stays `undefined`, an unset value drops the key ⇒ `defaultSettings` and legacy/
    post-522 documents stay byte-identical.
  - **Render root emit (523-01-L02, `pageRendererV2.tsx`):** the page canvas background
    is RE-sanitized at render (`sanitizeAuthoringCssBackground`, defence-in-depth — React
    SSR does not block a `;`-delimited CSS injection in a `style` value) and emitted as an
    inline `style.background` on the page `<Root>`, overriding the default `min-h-screen
    bg-white text-slate-950` utility only when authored. `rootStyle` is now built when the
    spotlight OR a canvas background is present (adds `background` alongside the exact
    `--spotlight-*` vars); when NEITHER is present it stays `undefined` ⇒ byte-identical
    `<Root>`.
  - **Page-settings "Page background" control (523-01-L03, `PageEditor.tsx`):** the
    compact page-settings side-inspector panel gains a **Design → "Page background"**
    control — the shared color-only `ColorSwatchControl` (alpha-capable via TASK-519's
    custom input), mirroring the Effects spotlight-color control. A new `updateBackground`
    live-draft writer (mirroring `updateEffects`) writes `settings.background` onto the
    document draft via `setDocumentDraft` (undo/dirty wrapper), persisted on every save/
    publish; clearing drops the key (present-only byte-identity). Gradients stay
    model/import-only (the field + sanitizer accept color OR gradient, but the panel
    widget authors solid colors only).

- **(D2) Occlusion-proof cursor spotlight (523-02,
  `pageRendererV2.tsx PAGE_SPOTLIGHT_CSS` + overlay div):** the 521 cursor-follow
  spotlight overlay previously painted at `z-0`, BEHIND opaque section backgrounds, so the
  glow was visible only through translucent glass/SVG surfaces. Now the overlay's static
  layering is a **NON-gated base rule** (`position:fixed;inset:0;z-index:30;
  mix-blend-mode:screen;pointer-events:none`) that lifts it ABOVE opaque section content and
  ADDS light (screen blend) without hiding content or blocking clicks; the moving
  `radial-gradient` stays inside `@media (prefers-reduced-motion: no-preference)` so reduced-
  motion users get a correctly-layered but MOTIONLESS (no-gradient) overlay. The overlay
  z-index (`30`) is STRICTLY BELOW the front sticky nav (`sticky z-40`) so screen-blend never
  tints the menu bar (the inequality holds because `<Root>` forms no stacking context and
  nav + `PageDocumentRender` are sibling fragment children; `isolation:isolate` is the
  deliberate NON-choice on `<Root>` — it would trap the fixed overlay above the nav). The
  overlay `<div>` loses its `z-0` utility (layering now owned by the CSS rule).
  - **Layer-z clamp lowered:** `PAGE_LAYER_Z_CLAMP.max` drops from `40` to `20` — the only
    other author-controllable surface in the same root stacking context is a layered-canvas
    `[data-layer]` (`layer.z` → `z-index`), so capping it STRICTLY BELOW the overlay's `30`
    guarantees no authored layer can reach the spotlight and occlude the glow. Invariant:
    `PAGE_LAYER_Z_CLAMP.max (20) < overlay z-index (30) < nav z-index (40)`.

- **Gradient hardening (was TASK-523 FU-1 — landed here, single-writer
  `core/services/pages/pageAuthoringSanitizers.ts`):** `isSafeAuthoringCssGradient` now
  rejects any `url(` token AND any top-level comma-separated multi-layer form (new
  `isSingleGradientLayer`: exactly one gradient head + its balanced parens, with NOTHING
  after the matching close paren). This closes the
  `linear-gradient(...), url(//evil.example/beacon.png)` outbound-fetch layer (valid CSS
  with two background layers, which a browser would fetch on render) and the nested
  `radial-gradient(circle,url(//x))` case that the pre-523 charset admitted as an inert
  malformed gradient. The charset already excluded `;`/`{`/`}`/`<`/`>`/`:` (no declaration
  or `</style>` breakout); this addition closes the residual `url()`-layer fetch surface.
  The hardening applies to EVERY caller of `sanitizeAuthoringCssBackground` (page canvas
  background + all TASK-522 background authoring), not just the page canvas.

- **Security:** `settings.background` is validated by `sanitizeAuthoringCssBackground` at
  BOTH write (`normalizeSettings`) AND render (`PageDocumentRender`, defence-in-depth) — no
  raw stored string ever reaches a CSS declaration; a bad value fails soft (sanitizer →
  `null` ⇒ key omitted). The spotlight overlay is additive (`mix-blend-mode:screen`),
  non-blocking (`pointer-events:none`), and nav-safe (`z-index:30 < 40`). The gradient
  `url()`/multi-layer hardening removes an outbound-beacon fetch surface.

- **Docs:** `_docs/PAGE_MODEL.md` (new § Page Canvas Background & Occlusion-Proof Cursor
  Spotlight — `settings.background`, gradient hardening, spotlight overlay layering),
  `_docs/DESIGN_TOKENS.md` (new § page canvas background & spotlight layering z-index
  boundary), and `_docs/SECURITY_SPEC.md` (new § Page canvas background color boundary +
  gradient hardening) updated.

- **Tests:** all new 523 model/SSR/render tests live in the Vitest lane —
  `tests/vitest/pages/page-document-v2.test.ts` (`settings.background` round-trip +
  reject-unknown + Ajv `additionalProperties` + safe-gradient + fail-soft injection +
  the `url()`-nested/multi-layer-beacon REJECT assertions from the FU-1 hardening),
  `tests/vitest/pages/page-renderer-v2.test.tsx` (canvas-background root emit + present-only
  byte-identity + spotlight overlay z-30/mix-blend-mode/base-rule layering + nav `z-40`
  anchors + `z-index:30 < 40` + no-stacking-context-on-`<Root>` guards), and NEW
  `tests/vitest/admin/pageSettingsPanel.test.tsx` (the exported `PageSettingsSubpanel`
  "Page background" control + `onBackgroundChange` live-draft/clear behavior). All gates
  green (`bun --cwd core lint`/`lint:types`, root `tsc -p tsconfig.json --noEmit`,
  `bun run test:bun`, `bun run test:vitest`, `gates:coderso`). The ≥5-scenario-per-area
  LIVE Playwright smoke (canvas background solid/gradient on front + preview; spotlight
  visible over opaque sections, nav untinted, click-through, reduced-motion motionless;
  present-only byte-identity) is run by the orchestrator post-merge (the dev host serves
  the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- **Panel gradient authoring.** The page-settings "Page background" widget authors SOLID
  colors only (the shared `ColorSwatchControl` is color-only). Gradients round-trip and
  render through `settings.background` but are author-able via the MODEL/import only; a
  dedicated in-panel gradient builder is a future foundation extension.
- **TASK-523 FU-1 is now CLOSED** (the `isSafeAuthoringCssGradient` `url(`/multi-layer
  rejection landed here rather than deferred); no residual gradient-sanitizer follow-up
  remains.
