# 1238 - TASK-525 Full-Bleed Background with Width-Constrained Content & Per-Block Staggered Reveal

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-525, TASK-525-01, TASK-525-01-L01, TASK-525-01-L02, TASK-525-01-L03, TASK-525-02, TASK-525-02-L01, TASK-525-02-L02, TASK-525-02-L03, TASK-525-02-L04

## Key Changes

Fixes two live-surfaced Page v2 section-render gaps against the reference wow-site, both
**present-only, jsonb-only** — NO npm dependency, NO DB migration / DDL, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO route/RBAC. Legacy / no-effect docs
normalize AND render **byte-identical** to the prior output.

### 525-01 — Full-bleed background decoupled from the content max-width

Owner report: "full width dla tła się udał ale wszystko jest teraz rozsunięte a chcę aby
było dla pewnej szerokości." The prior `3eac13f9` bleed made the section background paint
edge-to-edge (correct) but the SAME `full-width` variant also dropped the content cap
(`maxWidth:"none"`), spreading the CONTENT to the viewport edges too. 525-01 **decouples**
the background bleed from the content cap.

- **`core/services/pages/pageRendererV2.tsx`** — `toPageSectionStyle` no longer emits
  `maxWidth:"none"` for the full-width path. A new `isPageSectionFullBleed(section,
  template)` predicate (`template.variant === "full-width" || section.style.fullBleed ===
  true`) drives two decoupled outputs:
  - **Content node** (`toPageSectionStyle`, full-bleed branch): always capped/centered at
    `layout.maxWidth` via `width:min(${maxWidth}, calc(100% - 40px));maxWidth;margin:0
    auto`, with a fixed **20px** side gutter (`PAGE_SECTION_FULL_BLEED_GUTTER`) mirroring
    the reference `.container{width:min(var(--container),calc(100% - 40px))}`.
  - **Background box** (new exported `toPageSectionBleedStyle`): applied to the OUTER
    `<section>` — a FIXED-literal `100vw` bleed (`width:100vw;margin-left/right:calc(50% -
    50vw)`) carrying the sanitized background color/URL, clamped radius, and shadow. Returns
    `undefined` for non-full-bleed sections → the `<section>` style stays byte-identical
    (composition cssVars only). Merged with the 522 composition cssVars in
    `PageSectionRender`.
  - The non-full-bleed branch keeps the pre-525 single-node contract (background + cap on
    the content div) **byte-identical**.
- **`core/services/pages/pageDocumentV2.ts`** — added present-only
  `PageSectionStyleV2.fullBleed?: boolean` so ANY section (not just the `full-width`
  template variant) can bleed its background with contained content. Joins the section-style
  allowlist, both JSON schemas (`partialSectionStyleJsonSchema` + the full-doc section-style
  schema, `additionalProperties:false`), and the section-style normalizer (emitted ONLY when
  `=== true`; `false`/unset omitted → byte-identical). Reject-unknown + round-trip tested.
- **`core/services/pages/pageEditorControlRegistry.ts`** — added the
  `section.style.fullBleed` switch control (`panel:"background"`, `responsive:false` — the
  bleed is fixed render structure, not a per-property CSS delta, so a per-device override
  would be a silent no-op).
- **Owned breaking-test rebaseline (525-01-L03):** the two existing assertions of the OLD
  full-width `maxWidth:"none"` behavior in `tests/vitest/pages/page-renderer-v2.test.tsx`
  were rebaselined to the new correct placement (background full-bleed via the bleed style;
  content capped at `layout.maxWidth`, centered). Declared, not drift.

### 525-02 — Per-block staggered reveal

Reveal was SECTION-level only (521's `scrollEffect` fades a whole section as one unit).
525-02 lets a revealing section's blocks CASCADE via a present-only per-block delay, reusing
521's reveal runtime/attributes (`data-reveal-armed`/`data-page-effect`/`data-revealed`) with
**NO new runtime and NO new keyframe**.

- **`core/services/pages/pageDocumentV2.ts`** — added present-only
  `PageBlockStyleV2.revealDelay?: number` (ms), clamped by the new
  `PAGE_REVEAL_DELAY_CLAMP = { min: 0, max: 4000 }` (same bound as the decoration delay).
  Joins `pageBlockStyleKeys` (reject-unknown), the block-style JSON schema
  (`numericSchema(min,max)`, `additionalProperties:false`), and the block-style normalizer
  (normalized via `readNumber` — `Number.isFinite` + clamp; NaN/Infinity fail-soft to `0`,
  out-of-range clamps; emitted ONLY when authored → byte-identical). Round-trip tested.
- **`core/services/pages/pageRendererV2.tsx`** — `toPageBlockRenderProps` emits a
  present-only `--reveal-delay: ${n}ms` custom property on the `[data-block-id]` frame
  (empty object when unauthored → byte-identical frame). `PAGE_REVEAL_MOTION_CSS` gains
  per-CHILD reveal rules INSIDE the existing `@media (prefers-reduced-motion:
  no-preference)` + `[data-reveal-armed]` gate: a **state-independent** per-block transition
  (`transition:opacity .7s,transform .7s;transition-delay:var(--reveal-delay,0ms)`) plus
  `:not([data-revealed])` hide-state and `[data-revealed]` reveal-state visual values. The
  transition MUST be state-agnostic (not gated by `:not([data-revealed])`): per the CSS
  Transitions spec the transition is governed by the after-change computed style, so a
  transition only on the hidden rule would reset once the section flips `data-revealed`,
  making blocks JUMP with no fade/delay/cascade. Because `--reveal-delay` INHERITS, a
  per-block delay staggers each child; the section runtime still toggles `data-revealed` on
  the section only.
- **`core/services/pages/pageEditorControlRegistry.ts`** — added the
  `block.style.revealDelay` number control (`unit:"ms"`, `clamp {0,4000}`,
  `responsive:false`) mirroring `block.decoration.delay`.

### Security / accessibility

- Only bounded literals reach CSS: `revealDelay` emits ONLY `--reveal-delay: ${n}ms`
  (clamped at the write boundary, consumed by a fixed `transition-delay`); `fullBleed`
  toggles fixed render structure (the `100vw` bleed + 20px gutter are static literals). No
  author string is interpolated into a raw declaration/markup/URL.
- Both fields are present-only + reject-unknown (fail-closed READ trap): each joins its
  allowlist AND the matching `additionalProperties:false` JSON schema in lockstep, with a
  round-trip test; unset → the key is OMITTED (never `null`/`0`-as-present).
- `prefers-reduced-motion` unchanged: 525-02 adds only a `transition-delay` inside the
  existing `motion-safe:` / `[data-reveal-armed]` gate (inert under reduced-motion — no
  transition runs). No keyframe, CSS gate, or runtime early-return altered.
  `pageEffectsRuntime.ts` / `hero.tsx` / `PageEditor.tsx` untouched.

### Docs

- `_docs/PAGE_MODEL.md` — documented `PageBlockStyleV2.revealDelay` + `--reveal-delay`
  cascade, `PageSectionStyleV2.fullBleed`, and the full-bleed background/content decouple
  (superseding the stale `full-width` "pins `max-width: none`" notes).
- `_docs/DESIGN_TOKENS.md` — added the `--reveal-delay` custom property + `PAGE_REVEAL_DELAY_CLAMP`.

### Gates

All green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
`tsc -p tsconfig.json --noEmit`, `bun run test:bun` (the 8 failures are the known
`starterContent.test.ts` shared-DB seed-count transient — passes 3/3 in isolation; NOT
525-related), `bun run test:vitest` (pages suite 508/508), `gates:coderso` (5/5:
functional/ux/performance/security/reliability). The LIVE ≥5-per-area light+dark Playwright
smoke (full-bleed bg + contained content, live `maxWidth` cap, non-full-width byte-identity,
per-block cascade, reduced-motion parity — side-by-side vs the reference wow-site) is run by
the orchestrator post-merge (the dev host serves the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- Optional section/page-settings **auto-stagger convenience** (each direct child seeded an
  incremental `--reveal-delay` with no per-block authoring) was scoped as OPTIONAL and is
  NOT shipped — per-block `revealDelay` covers the owner gap. Can be added later as pure
  render structure (no model change) if desired.
- LIVE Playwright smoke deferred to the orchestrator post-merge (per the standing worktree
  smoke policy).
