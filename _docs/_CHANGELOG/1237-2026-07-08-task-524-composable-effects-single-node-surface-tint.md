# 1237 - TASK-524 Composable Effects — Single-Node Surface+Transform Co-location & Independent Surface Tint

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-524, TASK-524-01, TASK-524-01-L01, TASK-524-01-L02, TASK-524-01-L03, TASK-524-02, TASK-524-02-L01, TASK-524-02-L02, TASK-524-02-L03, TASK-524-02-L04

## Key Changes

Direct FOLLOW-UP fix to TASK-522 (Composable Hero Toolkit), branched from the post-523
HEAD. Live use of the 522 toolkit surfaced two defects that made the reference
"glass card with a floating badge" hero impossible to reproduce faithfully. Both are
fixed **present-only, jsonb-only** — **NO npm dependency** (`core/package.json`
unchanged), **NO DB migration / DDL**, **NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump**
(stays `2`), **NO route/RBAC**; legacy / no-effect docs normalize AND render
**byte-identical** to the post-522/523 output; `prefers-reduced-motion` is unchanged
(the anchor rewrite is a static-offset swap, motion-neutral).

- **524-01 — Surface floats with its content (co-location on ONE node).** 522 routed a
  transform-writing effect (decoration `float`/`drift`/`pulse`/`orbit`, hover
  `lift`/`lift-glow`/`scale`) onto an INNER wrapper while `data-surface` stayed on the
  frame — so only the inner content animated and the glass surface stayed static
  ("only the text floats, not the glass"). Root cause: the `[data-layer-anchor]`
  self-offset in `PAGE_COMPOSITION_EFFECTS_CSS` was written via
  `transform:translate(…)`, which an effect `transform` on the same node would clobber.
  **Fix (`core/services/pages/pageCompositionEffects.tsx`):** switch the nine anchor
  rules to the independent CSS **`translate:` property** (`translate:-100% -100%`, etc.)
  — a separate composited channel from `transform` (offsets identical). **Fix
  (`core/services/pages/pageRendererV2.tsx` `splitBlockComposition`):** a transform
  decoration/hover now stays **co-located with `data-surface`/`data-layer` on the SAME
  frame node**, so the whole glass card floats/lifts with its content (matching the
  reference `.floating-chip`). **TILT** remains the SOLE inner effect (it needs a
  perspective PARENT — the frame, stamped `data-tilt-parent`), so its node stays a
  descendant; tilt + decoration on one block is a documented edge. The glass/glass-grid
  surfaces gained `overflow:hidden` (524-03 radius-clip) so the node clips to its inline
  border-radius throughout the transform (anchored chips are `[data-layer]` SIBLINGS in
  `.cx-layered-canvas`, never DOM children, so never clipped). The `translate:` property
  is a CSS Transforms L2 feature (Chrome/Edge 104, Firefox 72, Safari 14.1; universal on
  the 2026 evergreen baseline).
- **524-02 — Independent surface tint (decouple glass glow from `block.background`).**
  522 seeded `--surface-glow`/`--deco-ring`/`--orb-color` from the block's plain-color
  `style.background`, so a row of chips with differing backgrounds got inconsistent glass
  tints with no way to set the tint independently ("each chip a different glass tint;
  one green, one none"). **Model/schema (`core/services/pages/pageDocumentV2.ts`):** new
  present-only `PageBlockStyleV2.surfaceTint?: string` (alpha-capable), joined to the
  `pageBlockStyleKeys` allowlist AND the block-style JSON schema
  (`additionalProperties:false`) in lockstep, normalized via `readOptionalSafeColor`
  (`sanitizeAuthoringCssColor`-backed) — omitted on a bad/absent value (never
  `null`/`""`). **Resolver (`pageCompositionEffects.tsx` `resolveBlockCompositionAttrs`):**
  `surfaceTint` seeds the glow FIRST and takes **precedence**; the 522
  `style.background`-derived value remains a FALLBACK only when no `surfaceTint` is
  authored (a chip with a background and NO tint stays byte-identical to 522); a
  gradient/url tint is left out (invalid inside `radial-gradient()`). **Control
  (`core/services/pages/pageEditorControlRegistry.ts` `pageUniversalBlockControls`):** a
  new `block.surface.tint` "Surface tint" alpha color control (mirrors
  `block.style.textColor`, `input:"color"`, `responsive:true`).
- **Per-device tint (`core/services/pages/pageResponsiveCss.ts`).** Because the control
  is `responsive:true`, a per-breakpoint `surfaceTint` override emits: the tablet/mobile
  `@media` rule retargets the same three frame custom props
  (`--surface-glow`/`--deco-ring`/`--orb-color`) with `!important` (mirrors the
  `--layer-*` retarget), gated — like the base resolver — on a plain non-gradient/url
  tint AND an active `surfacePreset`/`hoverEffect`/decoration motion ∈
  `{radiate,pulse,drift,float}`; an unsafe/gradient tint fails closed to a diagnostic.
- **Owned breaking-test rebaseline (524-01-L03).** 522's four flip-signature placement
  assertions (A/B/F/C — `data-deco`/`data-hover`/`--deco-*` asserted `toBeUndefined()`
  on the frame because 522 routed them to the inner node) are rebaselined to the new
  correct placement (surface + `data-deco`/`data-hover` on the SAME node; tilt still
  inner) — a DECLARED rebaseline, not drift, not a weakened assertion. A new "glass+float
  move together" render test asserts `data-surface` sits on the SAME node as `data-deco`.
- **Security.** The only new attacker-influenceable surface is the `surfaceTint` COLOR
  string, sanitized via `sanitizeAuthoringCssColor` at the write boundary and again read
  only as the already-validated `--surface-glow`/`--deco-ring`/`--orb-color` custom
  properties at render (defence in depth) — never a raw declaration.
  `expression(alert(1))`/`url(javascript:…)` → field omitted (present-only) → CSS falls
  back to the reference literal. `surfaceTint` joins its allowlist + JSON schema +
  normalizer + a round-trip test in lockstep (reject-unknown fail-closed); unknown keys
  still throw `PageDocumentError`. No new markup, URL, interpolation, route, or RBAC.
- **Docs:** `PAGE_MODEL.md` (`surfaceTint` field + background-fallback precedence,
  per-device scope, the surface+effect co-location / `translate:` anchor note),
  `DESIGN_TOKENS.md` (`--surface-glow` seed precedence + per-device retarget),
  `SECURITY_SPEC.md` (`style.surfaceTint` CSS-sink note).
- **Gates:** all green — `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `tsc -p tsconfig.json --noEmit`, `bun run test:vitest` (changed pages files 305/305 +
  broad `tests/vitest/pages/` 507/507), `bun run test:bun` (1492 pass; the 3
  cross-file `pages-runtime` cache-isolation transients pass 18/18 in isolation, are
  unrelated to 524, and touch no 524-owned file), `gates:coderso` (5/5). The LIVE
  ≥5-per-area light+dark Playwright smoke (composed side-by-side vs the reference
  wow-site hero) is run by the orchestrator post-merge (the dev host serves the MAIN
  tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- Live ≥5-scenario-per-area Playwright smoke (glass floats with content; anchored+floating
  badge; hover-lift+glass; tilt perspective combo; independent tint round-trip;
  reduced-motion; no-effect byte-identity; security negatives) deferred to the
  orchestrator post-merge against the MAIN dev host.
- The 3 `tests/integration/runtime/pages-runtime.test.ts` cache-isolation failures under
  the full `--parallel=1` run are a known shared-`getSiteCacheStats` cross-file
  pollution transient (green in isolation), not a 524 regression — tracked with the
  broader smoke-DB test-isolation backlog.
