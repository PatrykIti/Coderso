# TASK-523: Page Canvas Background & Occlusion-Proof Cursor Spotlight

# FileName: TASK-523_Page_Canvas_Background_And_Spotlight_Occlusion.md

**Priority:** High
**Category:** Admin UI (Pages) / Site Render / Schema (JSON model) / Accessibility / Security
**Estimated Effort:** Medium
**Dependencies:**
- **TASK-521 (page motion & interaction effects)** — 521-05 landed the per-page
  `settings.effects` sub-object (`PageEffectsV2`), the compact page-settings
  side-inspector panel (`PageSettingsSubpanel`, `PageEditor.tsx:4955`), the
  `PageDocumentRender` `rootStyle`/`spotlightOn` emit, and the `PAGE_SPOTLIGHT_CSS`
  overlay rule. TASK-523 extends BOTH that model surface (a new sibling
  `settings.background` field) and that render surface (the spotlight overlay
  occlusion fix). All 523 anchors are grounded on the live 521 code.
- **TASK-522 (composable hero toolkit)** — established `sanitizeAuthoringCssBackground`
  as the single safe color-OR-gradient path (already imported in both
  `pageDocumentV2.ts:22` and `pageRendererV2.tsx:80`) and the present-only
  root-emit discipline (`usesComposition` / `docUsesCompositionEffects`). 523-01's
  `settings.background` reuses that exact sanitizer; 523 lands AFTER 522, so the
  present-only byte-identity bar is "byte-identical vs post-522".
- **TASK-519 (alpha color input)** — the page-settings color control authors
  alpha-capable colors (`hex8`/`rgba()`); `settings.background` accepts a safe
  color OR gradient via `sanitizeAuthoringCssBackground`.

**Status:** ✅ Done
**Closure changelog:** 1236
(`_docs/_CHANGELOG/1236-2026-07-08-task-523-page-canvas-background-spotlight-occlusion.md`;
README next-pointer bumped to 1237). All subtasks Done; all gates green; TASK-523 FU-1
(gradient `url()`/multi-layer hardening) landed here rather than deferred.

---

## Overview

Two owner deliverables, both riding the EXISTING page-settings + page-render seams
that TASK-521 landed, both **present-only, jsonb-only, no-dependency, no-migration,
no-schema-bump**:

- **(D1) Page canvas background** — a per-page background (safe solid color OR CSS
  gradient in the MODEL) whose SOLID-color half is authored in the compact
  page-settings panel (the shared color-only `ColorSwatchControl`; gradients stay
  model/import-only) and emitted on the page `<Root>`. Today the page root is
  hard-wired to the `min-h-screen bg-white
  text-slate-950` utility (`pageRendererV2.tsx:2856`); there is NO way to set a
  page-level canvas background/gradient. A present-only inline `style.background`
  overrides the `bg-white` utility only when authored. Rides a NEW sibling key
  `settings.background` (alongside `template`/`showInNav`/`effects`), normalized on
  write AND re-sanitized on render through `sanitizeAuthoringCssBackground` — the
  ONLY path a color/gradient reaches CSS.

- **(D2) Occlusion-proof cursor spotlight** — the 521 cursor-follow spotlight
  overlay (`PAGE_SPOTLIGHT_CSS` `:2700`, overlay `<div>` `:2879`) renders at
  `z-0`, which puts the radial glow BEHIND opaque section backgrounds — so it only
  shows through translucent SVG/glass surfaces and is invisible over normal opaque
  sections. Fix: raise the overlay above the opaque section backgrounds and blend
  it additively (`mix-blend-mode: screen`, `pointer-events: none` stays) so it ADDS
  light without blocking clicks or hiding content — the occlusion-proof recipe for
  a fixed pointer-follow glow over opaque surfaces (`position:fixed;z-index` above
  section content but BELOW the front sticky nav; `mix-blend-mode:screen`;
  `pointer-events:none`), justified from CSS first principles rather than an external
  asset. (The `_docs/projekty-domow-wow-site/assets/styles.css` `.cursor-glow`
  reference cited in earlier drafts is ABSENT from this worktree and is not relied
  on.) The static positioning
  (position/inset/z-index/mix-blend-mode/pointer-events) moves to a NON-gated base
  rule so reduced-motion users get a correctly-layered but MOTIONLESS overlay; the
  moving radial-gradient stays inside the `@media (prefers-reduced-motion:
  no-preference)` gate.

Every change is **present-only** (zero bytes emitted / byte-identical `<Root>` when
unauthored — for D1 a page with no `settings.background`; for D2 a page with
`cursorSpotlight` OFF), joins the **reject-unknown allowlist** with a **round-trip
test**, and does **NOT** bump `PAGE_DOCUMENT_SCHEMA_VERSION` (`pageDocumentV2.ts:29`
stays `2`), **NO DB migration** (rides existing `currentData.settings` jsonb), **NO
npm dependency**.

## Gap analysis (grounded — anchors verified on `feature/tasks-fixes` @ worktree
`/home/coder/project/Coderso-task-523`)

### G-1 — page canvas background (MISSING)

- `PageDocumentSettingsV2` (`pageDocumentV2.ts:464-484`) = `template`, `showInNav`,
  `revisionRetention?`, `collectionLink?`, `menuAppearance?`, `effects?` — **no
  page-level background**. `defaultSettings` (`:740`) = `{ template:"page-v2",
  showInNav:true }` (no background — present-only keeps legacy docs byte-identical).
- `normalizeSettings` (`:2349`) allowlists
  `["template","showInNav","revisionRetention","collectionLink","menuAppearance","effects"]`
  (`:2351-2356`) — **no `background`**. `sanitizeAuthoringCssBackground` is ALREADY
  imported (`:22`); named wrappers ALREADY exist in the same single-writer file —
  `readSafeBackground` (`:1855`, used `:2440`) and `readOptionalSafeBackground`
  (`:1858` = `undefined→undefined`, `null→null`, else `sanitizeAuthoringCssBackground`,
  used `:2610`) — so L01 either reuses `readOptionalSafeBackground` (idiomatic; the
  `null` it returns is dropped by the present-only spread) or hand-rolls an inline
  `undefined`-collapsing guard to make the omit intent literal (see L01).
- `settings` JSON schema (`:1669`, `additionalProperties:false`) lists
  `template`/`showInNav`/`revisionRetention`/`menuAppearance` — **no `background`**.
- `PageDocumentRender` (`pageRendererV2.tsx:2783`) builds `rootStyle` (`:2847`)
  ONLY when `spotlightOn` (the `--spotlight-*` vars); `<Root>` default className is
  `min-h-screen bg-white text-slate-950` (`:2856`) — **no page-background thread**;
  an inline `style.background` overrides the `bg-white` utility.
- The page-settings panel `PageSettingsSubpanel` (`PageEditor.tsx:4955`) hosts
  title/slug/show-in-nav/revision-retention + the Effects section (spotlight
  color/size) — **no "Page background" control**.

### G-2 — cursor-spotlight occlusion (BUG)

- `PAGE_SPOTLIGHT_CSS` (`pageRendererV2.tsx:2700`) is a single
  `@media (prefers-reduced-motion: no-preference)` rule setting the overlay's
  `background:radial-gradient(... at var(--spotlight-x) var(--spotlight-y),
  var(--spotlight-color), transparent 70%)`. The overlay `<div>` (`:2879`) has
  `className="pointer-events-none fixed inset-0 z-0"`. **BUG:** `z-0` paints the
  glow BEHIND opaque section backgrounds → it shows only through translucent
  SVG/glass; over a normal opaque section it is invisible. There is **no
  `mix-blend-mode`**, and the overlay's static positioning is coupled INSIDE the
  reduced-motion gate via the `z-0` utility on the div (the div itself is emitted
  ungated, but the layering intent — "sit above and add light" — is not expressed).

## Subtasks

| Subtask | Title | Single-writer file(s) |
|---------|-------|-----------------------|
| TASK-523-01 | Page canvas background (model + schema + normalize + root emit + panel control + tests) | `pageDocumentV2.ts` (model/schema/normalize) · `pageRendererV2.tsx` (root emit) · `PageEditor.tsx` (panel control) · Vitest |
| TASK-523-02 | Occlusion-proof cursor spotlight (CSS + overlay + tests) | `pageRendererV2.tsx` (`PAGE_SPOTLIGHT_CSS` + overlay) · Vitest |

**Land order:** 523-01 → 523-02. (523-02 edits the SAME `pageRendererV2.tsx` render
region as 523-01-L02 but a DISJOINT sub-region — 523-01-L02 threads `settings.background`
into `rootStyle`/`<Root>`; 523-02 rewrites `PAGE_SPOTLIGHT_CSS` + the overlay div —
so 523-01 lands first and 523-02 rebases onto it.)

## Coordination

- `pageDocumentV2.ts` = 523-01-L01 ONLY (the `PageDocumentSettingsV2` type +
  `normalizeSettings` allowlist/wire + `settings` JSON schema; disjoint from the
  `effects`/`menuAppearance` sub-objects, which stay untouched).
- `pageRendererV2.tsx` — 523-01-L02 owns the `rootStyle`/`<Root>` background thread
  (`:2847-2861`); 523-02-L01 owns `PAGE_SPOTLIGHT_CSS` (`:2700`) + the spotlight
  overlay `<div>` (`:2879`). Disjoint sub-regions; 523-02 rebases on 523-01.
- `PageEditor.tsx` = 523-01-L03 ONLY (the "Page background" control inside
  `PageSettingsSubpanel`, mirroring the Effects `ColorSwatchControl`); disjoint from
  the Effects section region.

## Write-path decision (grounded nuance — carried into 523-01-L03)

`background` is a `settings` field, so it could ride EITHER persistence path the
panel exposes: (a) the explicit `handleSettingsSave` → `updatePage` payload
(`PageEditor.tsx:2244`/`:2257`) that title/slug/`showInNav`/`revisionRetention` use
(explicit "Save settings" click only), OR (b) the LIVE document draft via
`setDocumentDraft` that `effects`/`updateEffects` (`:2283`) use (carried on EVERY
save/publish; `setDocumentDraft` `:1107-1118` is the undo/dirty-tracking wrapper
around `setPageDocument`). **Decision: 523-01-L03 mirrors the `effects`/`updateEffects`
live-draft path** — a canvas background is a design choice the author expects to
persist on a normal draft-save/publish (like the spotlight color it sits next to),
NOT to be silently lost unless they click the separate "Save settings" button. It
writes `pageDocument.settings.background` via `setDocumentDraft` (present-only: drop
the key on clear), so the edit joins undo-history + dirty detection like
`updateEffects`, NOT a side-state merged only into `handleSettingsSave`. The
grounded "mirror the spotlightColor control" instruction resolves to this path
(spotlightColor persists on every save via the document draft — 523-01-L03 does the
same for `background`).

## Hard Invariants

1. **Present-only** — `settings.background` omitted when unset ⇒ document AND
   `<Root>` byte-identical vs post-522 (`defaultSettings` unchanged; `rootStyle`
   stays `undefined` when neither spotlight nor background is present). For 523-02,
   `cursorSpotlight` OFF ⇒ NO overlay, NO `<style data-page-spotlight-css>` — byte
   identical.
2. **Reject-unknown** — `assertKnownKeys` allowlist + `additionalProperties:false`
   updated in lockstep; an unknown `settings` key rejects; a bad `background` value
   fails soft (sanitizer returns `null` ⇒ key omitted).
3. **Colors/gradients ONLY via `sanitizeAuthoringCssBackground`** — at WRITE
   (`normalizeSettings`) AND at RENDER (`PageDocumentRender`, defence-in-depth,
   matching every other color in the renderer). No raw stored string reaches a CSS
   declaration.
4. **Occlusion fix additive, non-blocking, reduced-motion-safe, nav-safe** — the
   spotlight overlay renders ABOVE opaque section backgrounds with
   `mix-blend-mode:screen` (adds light, never hides content) but STRICTLY BELOW the
   front sticky nav (`sticky z-40`, `navigation.tsx:1728` / `widgetRenderer.tsx:276`;
   overlay pinned e.g. `z-index:30`) so screen-blend never tints the menu bar; keeps
   `pointer-events:none` (never blocks clicks); the static positioning
   (position/inset/z-index/mix-blend-mode/pointer-events) is a NON-gated base rule; the
   moving radial-gradient stays inside `@media (prefers-reduced-motion: no-preference)`
   — reduce users get a correctly-layered but MOTIONLESS (no gradient) overlay. The
   z-30 < z-40 inequality holds because `<Root>` (`pageRendererV2.tsx:2856`) forms NO
   stacking context and nav+`PageDocumentRender` are sibling fragment children
   (`core/site/pageRuntimeV2.tsx:42-66`); this is FRAGILE (a future
   `transform`/`filter`/`opacity`/`will-change`/`isolation` ancestor would trap the
   fixed overlay ABOVE the nav) so it is HELD IN A TEST (523-02-L02: nav `z-40` grep
   anchors + `z-index:30 < 40` + no-stacking-context-on-`<Root>`), and
   `isolation:isolate` is the deliberate NON-choice on `<Root>`.
5. **No migration, no schema-version bump (`PAGE_DOCUMENT_SCHEMA_VERSION` stays 2),
   no npm dependency.**

## Acceptance Criteria

1. A page with `settings.background` set to a safe color OR gradient renders that
   background on the page `<Root>` (overriding `bg-white`), on front AND preview; a
   page WITHOUT it is byte-identical to post-522.
2. `settings.background` round-trips through normalize→serialize→normalize; an
   unknown `settings` key rejects (`assertKnownKeys` + Ajv `additionalProperties:
   false`); an injection-shaped or BARE `url(...)`/`expression(...)` background fails
   soft (sanitizer → `null` ⇒ key omitted); a safe gradient survives. KNOWN sanitizer
   property (do NOT over-claim `url(...)` always → `null`): a `url(...)` NESTED inside
   a gradient shell (`radial-gradient(circle,url(//x))`) PASSES
   `sanitizeAuthoringCssBackground`'s gradient charset and is stored+rendered verbatim
   as an INERT malformed gradient (no `;`/`{`/`}`/`<`/`>`/`:` breakout — the browser
   discards it, no fetch/no injection); this is pinned by an L04 regression, and the
   sanitizer tightening is filed as a follow-up (§ Follow-ups), NOT a 523 change.
3. The compact page-settings panel has a "Page background" SOLID-color control
   (the shared `ColorSwatchControl`, which is color-only — no `allowGradient` prop)
   writing `settings.background` on the live document draft via `setDocumentDraft`
   (persisted on every save/publish, mirroring the spotlight color). Gradients remain
   author-able via the MODEL/import (the `settings.background` field + sanitizer
   accept color OR gradient), but are not authored through this panel widget.
4. The cursor spotlight is VISIBLE over opaque section backgrounds (raised z-index +
   `mix-blend-mode:screen`) but does NOT tint the front sticky nav (overlay z-index
   strictly below the nav's z-40), does NOT block clicks (`pointer-events:none`), and
   moves only for reduced-motion:no-preference users (the gradient stays gated); a
   spotlight-OFF page is byte-identical. The z-30 < z-40 nav-safety guarantee is HELD
   IN A TEST, not just prose (523-02-L02): the nav's `sticky z-40` grep anchors
   (`navigation.tsx:1728` / `widgetRenderer.tsx:276`) are asserted so a nav z-index
   drop breaks a test; the overlay `z-index` is asserted strictly `< 40`; and `<Root>`
   carries no stacking-context-forming style (`isolation:isolate` is the deliberate
   NON-choice on `<Root>` — it would trap the fixed overlay).
5. All gates green (root `tsc` + `bun --cwd core lint:types` + Vitest lane +
   `gates:coderso`); no migration; `PAGE_DOCUMENT_SCHEMA_VERSION` stays `2`; no new
   dependency.

## Follow-ups (out of 523's single-writer scope — filed, not silently absorbed)

- **FU-1 — tighten `isSafeAuthoringCssGradient` to reject nested `url(`/`image-set(`/
  `element(`.** `sanitizeAuthoringCssBackground` gates gradients on
  `gradientCharsetPattern = /^(?:linear|radial|conic)-gradient\([0-9a-z #%,.()/\s-]*\)$/i`
  + balanced parens (`pageAuthoringSanitizers.ts:59-60`), whose charset admits
  `(`/`)`/`/` and excludes `:` — so `radial-gradient(circle,url(//evil.example/x))`
  and `radial-gradient(circle,url(/a/b.png))` PASS and are stored+emitted verbatim.
  This is a PRE-EXISTING TASK-522 property that 523 newly exposes on the page canvas;
  it stays MEDIUM (not HIGH) because the charset excludes `;`/`{`/`}`/`<`/`>`/`:` (no
  declaration/`</style>` breakout) AND CSS gradient functions reject `url()` (a
  conforming browser discards the whole malformed gradient — no fetch, no injection):
  a latent parser-quirk / future-CSS surface, not an active exploit. 523 does NOT
  block on this and does NOT widen L01's scope by editing the sanitizer file (L01's
  single-writer file is `pageDocumentV2.ts`); 523 only PINS the behavior with an L04
  regression (`radial-gradient(circle,url(//x))` survives as an inert malformed
  gradient — no throw, no breakout). The fix — reject any `url(` / `image-set(` /
  `element(` substring inside `isSafeAuthoringCssGradient` (single-writer
  `pageAuthoringSanitizers.ts`, with its own gradient-token tests) — is this
  follow-up. If FU-1 lands, L01's `radial-gradient(...url...)` regression flips to a
  reject/omit assertion.

## Definition of done

Page canvas background authors + round-trips + renders present-only; the cursor
spotlight is occlusion-proof (visible over opaque sections, additive, click-through,
reduced-motion-safe); no-background/spotlight-off pages byte-identical; all
invariants hold; tests + gates green; closure documented under the then-current
next-free changelog.
