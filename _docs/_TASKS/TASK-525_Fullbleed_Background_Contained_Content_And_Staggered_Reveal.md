# TASK-525: Full-Bleed Background with Width-Constrained Content & Per-Block Staggered Reveal

# FileName: TASK-525_Fullbleed_Background_Contained_Content_And_Staggered_Reveal.md

**Priority:** High
**Category:** Site Render / Content (Pages) / Admin UI / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Medium
**Dependencies:**
- **TASK-523 (root/spotlight fix) — HARD, BRANCH-POINT DEPENDENCY.** 525's worktree
  `feature/task-525` is cut from **`feature/tasks-fixes` HEAD *after* TASK-523
  merges**, NOT from the current HEAD (`6a833a1f`). 523's root/spotlight change
  edits the SAME `core/services/pages/pageRendererV2.tsx` section-render region
  (`PageSectionRender` / `PageSectionContent` / `toPageSectionRenderProps` /
  `toPageSectionStyle`) that 525-01 rewrites (the content-wrapper / max-width
  seam) and 525-02 threads (`--reveal-delay` on the block frame + the
  `PAGE_REVEAL_MOTION_CSS` transition string). 525 MUST branch from the post-523
  HEAD to build on (not clobber) 523's landed changes. **Re-grep every anchor
  against the post-523 on-disk state at implement time — 523 will have shifted
  line numbers in `pageRendererV2.tsx`.** If 523 has NOT yet merged when 525 is
  scheduled, 525 BLOCKS on it (do not start 525-01 against a pre-523 tree). This
  is a land-order/branch-point constraint only; 525 owns DISJOINT symbol regions
  from 523 (523 = root/spotlight runtime; 525 = section content-wrapper max-width
  + per-block reveal delay) and never edits a 523-owned line.
- **TASK-521 (Page Motion & Interaction Effects) — SOFT, LANDED.** 525-02 REUSES
  521's landed reveal vocabulary verbatim: `PageSectionStyleV2.scrollEffect`
  (`reveal-fade`/`reveal-up`), the `data-page-effect` / `data-revealed` /
  `[data-reveal-armed]` runtime contract (`pageEffectsRuntime.ts`), and the
  `PAGE_REVEAL_MOTION_CSS` hide-state string (`pageRendererV2.tsx:591`). 525-02
  adds NO new runtime and NO new keyframe — only a per-block
  `transition-delay` fed off a present-only custom property.
- **TASK-522 (Composable Hero Toolkit) — SOFT, LANDED.** 525-02's block-frame
  var emission rides the same `toPageBlockRenderProps` → `frameVars` seam
  (`pageRendererV2.tsx:809-827`) that 522 uses for `--deco-delay` etc.; the new
  `--reveal-delay` is emitted alongside, present-only, DISJOINT from the 522
  composition vars.

**Status:** ⛔ BLOCKED (branch-point unmet) — TASK-523 has **not** merged into
`feature/tasks-fixes`. On disk the branch is still `feature/tasks-fixes` at HEAD
`6a833a1f`, which is exactly the pre-523 grounding HEAD this contract cites (see
`## Root-cause grounding` and line ~11); `git log --all` shows no TASK-523 /
root-spotlight-FIX merge commit (the only spotlight code present is the landed
521-05 `PAGE_SPOTLIGHT_CSS`, not 523's root/spotlight fix). Per the HARD
BRANCH-POINT DEPENDENCY below, **do NOT start 525-01 against this tree**: cutting
`feature/task-525` now would build against a pre-523 `pageRendererV2.tsx` and
clobber/miss 523's shared section-render edits (`toPageSectionStyle` /
`PageSectionContent` / `toPageSectionRenderProps`). UNBLOCK GATE: (1) TASK-523
merges into `feature/tasks-fixes`; (2) cut `feature/task-525` from the post-523
HEAD; (3) re-grep EVERY `pageRendererV2.tsx` anchor (`toPageSectionStyle` maxWidth,
`PAGE_REVEAL_MOTION_CSS`, the `frameVars` seam, the two owned test assertions) —
523 will have shifted their line numbers — before touching any code. Flip Status to
⏳ To Do only once (1)–(3) are done. No migration / no schema-version bump either
way (pin unchanged).
**Closure changelog:** Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). Do **NOT** hardcode a colliding number and do
**NOT** edit `_CHANGELOG/*` or `_TASKS/README.md` — the orchestrator owns those.

---

## Overview

Two live-surfaced gaps in the Page v2 section render, both against the reference
wow-site (`_docs/projekty-domow-wow-site/index.html`):

1. **"Full width dla tła się udał ale wszystko jest teraz rozsunięte a chcę aby
   było dla pewnej szerokości."** A prior fix (commit `3eac13f9` "bleed full-width
   section backgrounds") made the section BACKGROUND paint edge-to-edge, which was
   correct — BUT the same `"full-width"` variant ALSO drops the CONTENT max-width
   (`maxWidth: "none"`), so the CONTENT now spreads to the viewport edges too. The
   reference does the opposite: a full-bleed background section wraps its content
   in a centered container capped at a max-width
   (`.container{width:min(var(--container),calc(100% - 40px));margin:0 auto}`
   INSIDE the full-bleed section). TARGET: **DECOUPLE** the background bleed from
   the content cap — a full-width section paints its background/section box
   full-bleed to the viewport (100vw) BUT wraps its CONTENT in a centered
   container capped at `section.layout.maxWidth`.

2. **Per-block staggered reveal (owner gap vs reference `[data-reveal][data-delay]
   → --delay`).** Today reveal is SECTION-level only: `scrollEffect`
   (`reveal-fade`/`reveal-up`) toggles `data-revealed` on the whole `<section>` via
   the 521 runtime, so all of a section's content fades in as ONE unit. The
   reference staggers CHILD elements with a per-element `--delay` so items cascade
   in sequence. TARGET: a present-only per-block `revealDelay?: number` (ms,
   clamped) emitting `--reveal-delay`, consumed by the reveal
   `transition-delay`, so children of a revealing section cascade — plus, if
   cheap, a section-level auto-stagger convenience.

525 fixes both, present-only, jsonb-only, **NO migration, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump (`pageDocumentV2.ts:29` stays `2`), NO npm
dependency**:

- **525-01 — Full-bleed background + width-constrained centered content.**
  Decouple the section background bleed from the content max-width in the section
  render. Prefer **reusing `section.layout.maxWidth` for the content cap** plus a
  minimal bleed mechanism (an inner content wrapper capped at
  `section.layout.maxWidth` with `margin:0 auto`, INDEPENDENT of the full-bleed
  background element). If — and ONLY if — grounding shows a model field is needed
  to let ANY section (not just the `full-width` variant) bleed its background with
  contained content, add a present-only **`style.fullBleed?: boolean`**
  (reject-unknown allowlist + JSON schema + normalize, present-only). Land order
  inside 525-01: render decouple first (L01), model+control only if the flag is
  taken (L02), tests (L03).
- **525-02 — Per-block staggered reveal.** Add a present-only
  `PageBlockStyleV2.revealDelay?: number` (ms, `readNumber`-clamped) emitting
  `--reveal-delay` on the block frame, consumed by the reveal `transition-delay`
  in `PAGE_REVEAL_MOTION_CSS` (and the JIT reveal transition utility), so children
  of a revealing section cascade in. Add a "Reveal delay" control to
  `pageUniversalBlockControls` mirroring `block.decoration.delay`. Optionally a
  cheap section/page-settings auto-stagger convenience (each direct child gets an
  incremental delay) if grounding shows it composes for free.

Every change is **present-only** (zero bytes when unauthored — legacy / no-effect
docs normalize + render byte-identical), reject-unknown allowlist +
`additionalProperties:false` JSON schema + normalizer move in lockstep, the
`prefers-reduced-motion` reveal gate is unchanged (reveal is already JS-gated
under `[data-reveal-armed]` + `motion-safe:`).

## Root-cause grounding (verified on `feature/tasks-fixes` HEAD `6a833a1f`; RE-GREP anchors post-523)

> **Anchor note:** the SYMBOL names are the contract. 523 will shift line numbers
> in `pageRendererV2.tsx`; re-grep (`grep -an`) at implement time against the
> post-523 HEAD and trust the symbol, not the number. `rg` misdetects
> `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use `Read` / `grep -an`,
> never trust an empty `rg`.

### RC-1 — full-bleed background AND content share ONE node (max-width drops with the bleed)

**There is NO separate background layer.** The section background AND the content
grid AND the max-width cap are ALL on ONE element — the content `<div>` rendered
inside `PageSectionContent` (`pageRendererV2.tsx:2560-2566`), styled by
`renderProps.style` from `toPageSectionStyle`:

- **`toPageSectionStyle`** (`pageRendererV2.tsx:376`) returns, on one style object
  applied to the content `<div>`: `backgroundColor` / `backgroundImage`
  (`:390-393`), `padding`, **`maxWidth: template.variant === "full-width" ? "none"
  : `${section.layout.maxWidth}px`` (`:404`)**, `margin: "0 auto"` (`:405`). So the
  `full-width` variant sets `maxWidth:"none"` → the SAME `<div>` that paints the
  background ALSO holds the grid, so the content spreads edge-to-edge. The prior
  `3eac13f9` bleed made the section box full-bleed; `:404` is what lets the content
  spread with it.
- **`toPageSectionRenderProps`** (`:530`) builds `sectionClassName`
  (`baseSectionClassName = template.variant === "full-width" ? "w-full" : "w-full
  px-4 py-6"`, `:556`) and `contentClassName` (`"grid w-full" …`, `:559-566`).
- **`PageSectionContent`** (`:2485`) renders the SINGLE content `<div
  className={renderProps.contentClassName} style={renderProps.style} …>`
  (`:2560-2566`) — background + grid + maxWidth all here.
- **`PageSectionRender`** (`:2611`) renders `<section className={
  renderProps.sectionClassName} …>` (`:2647`) wrapping either a
  `[data-parallax-inner]` div or `PageSectionContent` directly (`:2666-2680`).

**FIX shape (525-01-L01):** decouple the two. The full-bleed BACKGROUND stays on
the outer full-width element; the CONTENT grid moves into (or gains) a CENTERED
inner wrapper capped at `section.layout.maxWidth` with `margin:0 auto`, INDEPENDENT
of the bleeding element — mirroring the reference
`.container{width:min(var(--container),calc(100% - 40px));margin:0 auto}` inside a
full-width section. Verify the exact structure at implement time (post-523):
decide whether to (a) keep background on the content `<div>` but wrap the GRID in
an inner max-width `<div>`, or (b) move `maxWidth` off `toPageSectionStyle` and
onto a dedicated inner wrapper while the section box keeps the bleed. Preserve
byte-identity for the non-full-width case (where `maxWidth` already = the
`section.layout.maxWidth` cap and no bleed happens).

**Control exposure (grounded):** `section.layout.maxWidth` IS an editor control
(`pageEditorControlRegistry.ts:237`, `path:["layout","maxWidth"]`, clamp
`320..1920` — see `pageDocumentV2.ts:2405`); `full-width` is a SECTION TEMPLATE
VARIANT (`pageSectionTemplates.ts:41`, e.g. hero `variants:[…,"full-width"]`), not
a free per-section toggle. So today ONLY a `full-width`-variant template can bleed.
**Recommendation (minimal model change):** reuse `section.layout.maxWidth` for the
content cap (already authored + clamped) and add the bleed as pure render
structure for the `full-width` variant. Add a present-only
`style.fullBleed?: boolean` ONLY if 525-01-L01 grounding concludes ANY section
(not just `full-width`) should be able to bleed its background with contained
content — in which case 525-01-L02 adds the flag (model+schema+normalize+control)
and the render keys the bleed off `fullBleed || variant==="full-width"`.

### RC-2 — reveal is SECTION-level only; no per-block delay/stagger exists anywhere

- Section reveal today: `scrollEffect` (`section.style.scrollEffect`,
  `reveal-fade`/`reveal-up`) → `toPageSectionRenderProps` appends the JIT reveal
  utility (`motion-safe:transition-[opacity,transform] motion-safe:duration-700
  motion-safe:data-[revealed=true]:opacity-100
  motion-safe:data-[revealed=true]:translate-y-0`, `:551-555`) to the
  `<section>`; `PageSectionRender` emits `data-page-effect={scrollEffect}`
  (`:2636`); the HIDE state is the exported **`PAGE_REVEAL_MOTION_CSS`**
  (`:591-595`) — `[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}`
  + `…[data-page-effect="reveal-up"]…{transform:translateY(1rem)}`. The 521
  runtime (`pageEffectsRuntime.ts`, emitted once at the page root by 521-05) sets
  `data-reveal-armed` + observes and sets `data-revealed`. Everything is JS-gated
  (marker absent ⇒ content shown, SEO/no-JS/reduced-motion safe) and
  `motion-safe:`.
- **No per-block reveal delay exists.** Confirmed — no `revealDelay`,
  `--reveal-delay`, or per-block `data-delay`/stagger anywhere in
  `core/services/pages/`. Reveal fires the whole section as one unit.
- Block-frame CSS-var emission seam (verified): **`toPageBlockRenderProps`**
  (`pageRendererV2.tsx:809`) merges `splitBlockComposition(...).frameVars`
  (present-only composition vars like `--deco-delay`) onto the
  `[data-block-id]` frame `style` (`:820`) — the natural, already-inheriting home
  for `--reveal-delay`.

**FIX shape (525-02):** emit a present-only `--reveal-delay` on the block frame
from `block.style.revealDelay` and CONSUME it as `transition-delay` in the reveal
CSS. Because `--reveal-delay` is a custom property it INHERITS down into a
revealing section's children, so a per-block delay (or a section auto-stagger that
seeds an incremental `--reveal-delay` per direct child) makes the children cascade
without a new runtime or keyframe. The `transition-delay` must be added BOTH to the
JIT reveal transition utility path (so the delay applies as the block transitions
to its revealed state) — grounded exactly in 525-02-L02.

### Model / schema / control anchors (verified)

- **`PageBlockStyleV2`** (`pageDocumentV2.ts:570-631`) carries present-only style
  fields (`decoration?`, `tilt?`, `layer?`, `surfacePreset?`, `hoverEffect?`,
  `marquee?`, `composition?`, `:585-630`). `revealDelay?: number` is added adjacent.
- **`pageBlockStyleKeys`** (`as const` allowlist, `:705-735`, ending
  `"composition"`) — `"revealDelay"` joins it (reject-unknown).
- **Block-style JSON schema properties** (the `$defs/pageBlockStyle` object,
  props `:1421-1453`, closing `:1454`, `additionalProperties:false`) — add
  `revealDelay: numericSchema(min,max)` mirroring the `decoration.delay`
  numeric schema (`:1423`).
- **Block-style normalizer** (`normalizeBlockStyle` region, 522 fields
  `:2702-2815`, closing `:2816`) — `revealDelay` normalizes present-only via
  `readNumber` (`:1879`, `Number.isFinite` clamp) right alongside the 522 fields.
- **`pageUniversalBlockControls`** (`pageEditorControlRegistry.ts:434`) — the
  block-level controls incl. `block.decoration.delay` (`:604-614`,
  `input:"number"`, `clamp:{min:0,max:4000}`, `unit:"ms"`); the new
  `block.style.revealDelay` control mirrors it.

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 525-01 | Full-bleed background + width-constrained centered content (decouple bg bleed from content max-width) | `core/services/pages/pageRendererV2.tsx` **[`toPageSectionStyle` maxWidth + `toPageSectionRenderProps` / `PageSectionContent` content-wrapper region — seam]**; IF a flag is added: `core/services/pages/pageDocumentV2.ts` **[`PageSectionStyleV2` + section-style allowlist + section-style JSON schema + section-style normalizer — seams]** + `core/services/pages/pageEditorControlRegistry.ts` **[section `fullBleed` control — seam]**; owned old full-width width tests `tests/vitest/pages/page-renderer-v2.test.tsx` | L01 render decouple (bg bleed vs content cap), L02 model+schema+control IF `fullBleed` flag added, L03 tests + owned old full-width test update | TASK-523 |
| 525-02 | Per-block staggered reveal (present-only `revealDelay` → `--reveal-delay` → reveal `transition-delay`) | `core/services/pages/pageDocumentV2.ts` **[`PageBlockStyleV2` + `pageBlockStyleKeys` allowlist + block-style JSON schema + block-style normalizer — seams]**; `core/services/pages/pageRendererV2.tsx` **[`toPageBlockRenderProps` frame-var emit + `PAGE_REVEAL_MOTION_CSS` / reveal transition — seam, DISJOINT from 525-01's section region]**; `core/services/pages/pageEditorControlRegistry.ts` **[`pageUniversalBlockControls` `block.style.revealDelay` control — seam]** | L01 model+schema+normalize, L02 render/CSS wiring (`--reveal-delay` → `transition-delay`) + optional section auto-stagger, L03 control, L04 tests | 525-01 |

**Land order (strictly sequential):** 525-01 (full-bleed decouple) → 525-02
(per-block staggered reveal). 525-01 lands first because it touches the section
content-wrapper structure; 525-02 threads block-frame vars + the reveal CSS in a
DISJOINT region. Both land AFTER 523 (branch-point).

## Coordination / collision guards

- **525 BRANCHES FROM POST-523 HEAD.** 523's root/spotlight change edits the SAME
  `pageRendererV2.tsx` section-render region 525-01 rewrites and 525-02 threads;
  525 is cut AFTER 523 merges and re-greps every anchor against the post-523
  on-disk state. 525 owns DISJOINT symbols from 523 (523 = root/spotlight runtime
  + `PAGE_SPOTLIGHT_CSS`; 525 = section content wrapper max-width + per-block
  `--reveal-delay`) and never edits a 523-owned line.
- **`pageRendererV2.tsx` is shared by 525-01 and 525-02 in DISJOINT regions:**
  525-01 owns ONLY `toPageSectionStyle` (`:376`) + the section content-wrapper
  markup in `toPageSectionRenderProps` / `PageSectionContent`; 525-02 owns ONLY
  `toPageBlockRenderProps` frame-var emit (`:809`) + `PAGE_REVEAL_MOTION_CSS`
  (`:591`) + the reveal transition utility (`:551-555`). No overlap. Land 525-01
  first.
- **`pageDocumentV2.ts` = 525-02 (`PageBlockStyleV2` `revealDelay`) and, ONLY IF
  the flag is taken, 525-01-L02 (`PageSectionStyleV2` `fullBleed`)** — DISJOINT
  (block-style vs section-style regions, different allowlists/schemas/normalizers).
- **`pageEditorControlRegistry.ts` = 525-02 (`block.style.revealDelay`) and, ONLY
  IF the flag is taken, 525-01-L02 (section `fullBleed`)** — DISJOINT id
  namespaces (`block.style.*` vs `section.style.*`).
- **OWNED breaking-test change (525-01-L03).** Every existing test asserting the OLD
  full-width behavior (content `maxWidth:"none"` spreading edge-to-edge) is UPDATED
  to the new correct placement (background full-bleed; content capped at
  `section.layout.maxWidth`, centered). Grounding found **exactly two** such
  assertions in `tests/vitest/pages/page-renderer-v2.test.tsx` — the CTA-variant
  `toPageSectionRenderProps(...).style.maxWidth === "none"` (~`:256`) and
  `fullWidthProps.style.maxWidth === "none"` in the gutter/backgrounds-fill-the-band
  test (~`:794`) — BOTH owned by 525-01-L03. The `:794` test's `w-full` siblings
  (`:792`/`:795`/`:797`) stay CORRECT under option A and are preserved. This is a
  DECLARED breaking-test rebaseline OWNED by 525-01-L03 — not drift, not a weakened
  assertion.
- **`prefers-reduced-motion` guard unchanged:** 525-02 adds only a
  `transition-delay` inside the EXISTING `motion-safe:` / `[data-reveal-armed]`
  reveal gate; no new keyframe, no new `@media` gate, no runtime early-return
  change. A `transition-delay` on a `motion-safe:`-gated transition is inert under
  reduced-motion (no transition runs) — motion-neutral.
- **`pageEffectsRuntime.ts` / `hero.tsx` / `PageEditor.tsx` are NOT edited by 525.**
  525-02 adds NO runtime — the existing 521 reveal runtime already sets
  `data-revealed`; the delay is pure CSS.
- rg misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use `Read`
  / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog = then-current next-free at closure (grep
  `_docs/_CHANGELOG/` highest+1).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the
pages write permission) and the SSR render path. The only new
attacker-influenceable surfaces are the `revealDelay` NUMBER and (if taken) the
`fullBleed` BOOLEAN.

1. **`revealDelay` (bounded number, no injection).** Normalized via `readNumber`
   (`pageDocumentV2.ts:1879`, `Number.isFinite` + clamp) at write. It is emitted
   ONLY as the `--reveal-delay` CSS custom property (`${n}ms`) consumed by a fixed
   `transition-delay` declaration — never a raw CSS declaration, never markup,
   never a URL. A NaN/Infinity/out-of-range value clamps to a bounded literal
   (fail-soft). No string, no interpolation of author text into CSS.
2. **`fullBleed` (if taken) — plain boolean.** Normalized present-only (`=== true`
   → `true`, else omitted); it only toggles fixed render structure (an inner
   max-width wrapper), no author-controlled value reaches CSS. The `100vw` bleed
   is a fixed literal, not author-derived.
3. **Present-only + reject-unknown (fail-closed READ trap).** `revealDelay` (and
   `fullBleed` if taken) joins its allowlist (`pageBlockStyleKeys` /
   section-style keys, fed to `assertKnownKeys`) AND the matching
   `additionalProperties:false` JSON schema in lockstep, and ships a round-trip
   test — a forgotten allowlist entry would silently degrade every stored doc
   carrying the key to empty on read. Unset → the key is OMITTED (never `null`,
   never `0`-as-present) so no-effect docs stay byte-identical.
4. **No new markup/URL/interpolation surface; `100vw` and `transition-delay` are
   static literals; the reveal remains JS-gated + `motion-safe:`.**

## Hard Invariants

1. **Present-only** — `revealDelay` (and `fullBleed` if taken) and the content-
   wrapper change emit ZERO bytes when unauthored; legacy / no-effect docs
   normalize + render byte-identical to the post-523 output. A non-full-width
   section and a block with no `revealDelay` produce identical normalized JSON +
   HTML.
2. **`prefers-reduced-motion` unchanged** — 525-02 adds only a `transition-delay`
   inside the existing `motion-safe:` / `[data-reveal-armed]` gate; no keyframe,
   CSS gate, or runtime early-return altered. Reveal stays JS-gated.
3. **No new npm dependency** (`core/package.json` unchanged).
4. **No DB migration / no DDL** — new fields on existing `section.style` /
   `block.style` jsonb.
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:29` stays `2`).
6. **Full-bleed background decoupled from content cap** — after 525-01 a
   full-width section paints its background/section box full-bleed (100vw) BUT
   wraps its content in a centered container capped at `section.layout.maxWidth`;
   the non-full-width case is byte-identical.
7. **Numbers only via `readNumber`** (`revealDelay` clamped at write + a bounded
   `${n}ms` emit at render).
8. **Reject-unknown + fail-soft** — new fields join their allowlist + one
   normalizer + a round-trip test; an out-of-range number clamps (soft); an
   unknown KEY rejects (`PageDocumentError`).
9. **Owned breaking-test change** — any old full-width content-width assertion is
   rebaselined by 525-01-L03 to the new correct placement (documented, not drift).

## Acceptance Criteria (measured LIVE vs the reference — ≥5 real-flow scenarios per area)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effect (computed styles, geometry,
DOM/attribute state), side-by-side with the reference wow-site
(`_docs/projekty-domow-wow-site/index.html`).

1. **Full-bleed bg, contained content.** A `full-width`-variant section with a
   background color/image + `section.layout.maxWidth:1120` paints its background
   edge-to-edge (section box width ≈ viewport 100vw) while its CONTENT grid sits
   in a centered container whose computed width ≈ `min(1120px, viewport - gutter)`
   and is horizontally centered (`margin:auto`) — matching the reference
   `.container` inside a full-bleed section.
2. **Content max-width honored.** Changing `section.layout.maxWidth` in the editor
   moves the content cap live (content narrows/widens) while the background stays
   full-bleed; the two are independent.
3. **Non-full-width byte-identity.** A `default`/`centered`-variant section
   renders normalized JSON + HTML byte-identical to the post-523 output (no new
   wrapper, no attribute change) — the decouple touches only the full-width (or
   `fullBleed`) path.
4. **Per-block staggered reveal.** A section with `scrollEffect:"reveal-up"` whose
   direct child blocks carry `revealDelay:0 / 120 / 240` reveals its children in
   sequence (computed `transition-delay` `0ms / 120ms / 240ms` on the respective
   `[data-block-id]` frames) as the section scrolls into view — cascading, not one
   unit; matches the reference `[data-delay]` cascade.
5. **Reveal delay present-only + reduced-motion.** A block with no `revealDelay`
   emits NO `--reveal-delay` (byte-identical); with
   `prefers-reduced-motion:reduce`, the section + its blocks appear instantly (no
   transition, no delay effect) — identical to 521's reduced-motion behavior.
6. **Auto-stagger convenience (if shipped).** Toggling section/page auto-stagger
   assigns each direct child an incremental `--reveal-delay` (e.g. 0/80/160ms) with
   no per-block authoring; off → no `--reveal-delay` (byte-identical).
7. **Security negatives.** `revealDelay:NaN` / `1e9` / `-500` →
   `readNumber` clamps to the bounded range (no unbounded delay, no raw value in
   CSS); an unknown block-style / section-style key still throws
   `PageDocumentError`; the stored doc round-trips with the clamped/omitted value.
8. **No-effect byte-identity (whole doc).** A page with no `revealDelay`, no
   `fullBleed`, and no full-width section produces normalized JSON + rendered HTML
   byte-identical to the post-523 output.

## Definition of done

Both subtasks landed in order, branched from the post-523 HEAD; a full-width
section paints its background full-bleed (100vw) while its content stays in a
centered container capped at `section.layout.maxWidth` (non-full-width
byte-identical); a revealing section's blocks cascade in via a present-only
per-block `revealDelay` → `--reveal-delay` → reveal `transition-delay` (with an
optional cheap section auto-stagger), all `readNumber`-clamped, present-only,
reject-unknown, fail-soft; the old full-width content-width test is rebaselined;
reveal stays JS-gated + `motion-safe:`, `prefers-reduced-motion` unchanged; no npm
dependency, no migration, no schemaVersion bump, no route;
`pageEffectsRuntime.ts` / `hero.tsx` / `PageEditor.tsx` untouched; legacy /
no-effect docs byte-identical; Security Contract satisfied (`revealDelay` via
`readNumber`, `fullBleed` present-only boolean, static `100vw`/`transition-delay`
literals); every gate green (root `tsc -p tsconfig.json --noEmit`, `bun --cwd core
lint:types`, `bun --cwd core lint`, vitest, `bun test`, `gates:coderso`);
≥5-scenario-per-area Playwright smoke passes light + dark with 0 console errors
side-by-side vs the reference; closure documented under the then-current next-free
changelog (grep `_docs/_CHANGELOG/` highest+1).
