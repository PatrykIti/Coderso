# 1245 - TASK-534 Declarative Interactivity: Tabs/Switcher Block, Filterable Gallery, Polish (Noise Overlay / Scroll-Hint / Magnetic)

Date: 2026-07-09
Version: Unreleased
Tasks: TASK-534 (absorbs TASK-527)

> Changelog number resolved next-free at closure. `1243` (TASK-535) was the last
> used in this tree; TASK-534 takes `1245` (its actual changelog — this file). The
> orchestrator owns `_docs/_TASKS/README.md` + the changelog registry; the number
> stayed stable on merge as 1245.

## Key Changes

**Bundle D** of the page-toolkit fidelity program — a cohesive family of
DECLARATIVE interactivity closing `_TMP-cms-ograniczenia.md` §1 ("Brak
interaktywności JS") and §4.9 #9, reproducing `_docs/projekty-domow-wow-site`.
Everything is **present-only** (zero bytes when unauthored ⇒ byte-identical to the
post-530/535 document + HTML), joins a **reject-unknown allowlist**
(`assertKnownKeys` + strict JSON schema `additionalProperties:false` + round-trip
test), rides the **ONE existing** `pageEffectsRuntime` `<script>` as static
dependency-free IIFE clauses, is `prefers-reduced-motion` + keyboard + aria-tablist
safe, and needs **NO npm dependency, NO DB migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION`
bump** (stays `2`), **NO new route/RBAC**.

### (A) Segmented SWITCHER / TABS block (absorbs TASK-527)

- NEW `pageBlockTypes` member `"switcher"` added the customSvg way — ATOMICALLY
  across every exhaustive `Record<PageBlockType,…>` surface (`pageBlockTypes`,
  `pageBlockPropKeys`, `pageBlockDefaultProps`, `realRuntimeBlockTypes`,
  `editorInsertableBlockTypes`, `layoutBlockTypes`, `pageBlockRenderDefaults.ts`,
  `pageEditorOptions.ts` `blockOptionCopy`, `pageEditorControlRegistry.ts`
  `pageBlockControlRegistry`, and the test-tree `pageEditorBlockLabels` map) so root
  `tsc` stays green. N labelled panels live in SIX new `panel:1..panel:6`
  `pageBlockSlotKeys` slots; `switcher` joins `layoutBlockTypes` so
  `getPageBlockActiveSlotKeys` returns its panel slots (the schema + normalize slot
  validation read `pageBlockCapabilities[type].slots`).
- Renderer (`pageRendererV2.tsx` `case "switcher"`): real `role="tablist"` with N
  `role="tab"` (roving `tabindex`, `aria-selected`, `aria-controls`) + N
  `role="tabpanel"` (`aria-labelledby`, resting `hidden` on the inactive panels for
  no-JS progressive enhancement). Tab labels render as escaped React TEXT nodes.
- Runtime clause (`PAGE_EFFECTS_RUNTIME_SOURCE`): click toggles the active panel,
  ArrowLeft/Right/Up/Down/Home/End rove selection + roving tabindex. Placed BEFORE
  the reduced-motion whole-IIFE early-return so it WORKS for reduce users; the
  crossfade is CSS `motion-safe:`-guarded.

### (B) FILTERABLE gallery/portfolio

- Present-only `filterable` + `filterCategories` props on the EXISTING `gallery`
  block + an optional per-item `category` (a SPACE-SEPARATED SET of single kebab
  tokens `^[\w-]{1,48}$`). The renderer emits a `role="tablist"` chip bar
  (`[data-gallery-filter]`, `[data-filter]` chips) above the grid and stamps each
  figure with `[data-filter-item]` + `data-category`; the runtime show/hides items on
  chip click via `cat.split(" ").indexOf(f)` (token-split, no substring false
  positive, no `innerHTML`/`eval`). Unset ⇒ `renderGallery` output byte-identical.
- The `gallery` block is now editor-insertable (its `gallery-editor-controls-pending`
  capability reason is cleared — the filter/layout controls shipped).

### (C) POLISH

- **Noise/grain overlay** — present-only `PageEffectsV2.noiseOverlay` (page root) +
  `PageSectionStyleV2.noiseOverlay` (section). Paints a STATIC self-generated
  SVG-turbulence layer (`pageInteractivityGlyphs.tsx` data-URI — no asset, no author
  color, no `sanitizeAuthoringCssBackground` relaxation). Renders identically under
  reduced-motion; `[data-noise-host]{position:relative}` supplies the positioning
  context for the `inset:0` overlay.
- **Scroll-hint block** — NEW `pageBlockTypes` member `"scrollHint"` (customSvg
  pattern), a CSS-keyframe-only `aria-hidden` dot/chevron (`glyph` enum) with an
  optional `sr-only` `label`. The bob is `@media (prefers-reduced-motion:
  no-preference)`-gated; NO runtime.
- **Magnetic button** — present-only `PageBlockStyleV2.magnetic`. A NEW clause in
  `PAGE_EFFECTS_RUNTIME_SOURCE` (after the 522 `[data-block-tilt]` clause, before
  `}catch`) attracts `[data-magnetic]` toward the pointer, transforms only, rAF +
  `passive`, clamped ±14px. Placed AFTER the reduced-motion early-return (motion →
  suppressed for reduce) + its own `pointer:fine` gate (no magnet on touch).

### Runtime — ONE `<script>`, split placement

All three clauses live in the single `PAGE_EFFECTS_RUNTIME_SOURCE`; the SINGLE emit
in `PageDocumentRender` carries them, its `anyMotion` predicate OR-widened
(append-only) by a new `usesInteractivityRuntime(document)` resolver
(`pageCompositionEffects.tsx`) that returns true only for RUNTIME-BEARING surfaces
(switcher / filterable gallery / magnetic). scrollHint + noise are CSS/static and do
NOT widen `anyMotion`. The interaction TOGGLES (switcher, filter) sit BEFORE the
reduced-motion early-return (they must work for reduce users — accessibility); the
magnetic MOTION clause sits AFTER it (suppressed for reduce). Idempotent via the
existing per-window init flag (535). STATIC literals — zero interpolation of stored
data; no `${`, `eval`, `Function(`, or `innerHTML` sink.

### CSS

`PAGE_INTERACTIVITY_CSS` (`pageCompositionEffects.tsx`, present-only emit): switcher
tab bar (horizontal-scroll on mobile), pill/underline selected states via
`var(--primary)`, panel crossfade + filter fade + magnetic transition (all inside
`prefers-reduced-motion: no-preference`), while the FUNCTIONAL `[hidden]` /
`.is-hidden` `display:none` rules sit OUTSIDE the guard so tabs/filters WORK for
reduce users.

## Security

No new route/RBAC/method. Enums (`switcher.variant`, `scrollHint.glyph`) are
`normalizeEnum` fail-CLOSED on write; `magnetic`/`noiseOverlay`/`filterable` are
`readBoolean`-coerced present-only; `activeIndex` is clamped; free-text labels render
as escaped TEXT nodes (never `dangerouslySetInnerHTML`); category strings are
single-token `^[\w-]{1,48}$` allowlisted (out-of-pattern DROPPED, fail-soft) at BOTH
write and render, so `data-category`/`data-filter` can never break out of the
attribute. Every new key joins its `assertKnownKeys` allowlist + JSON schema in
lockstep with a round-trip test (fail-closed read trap); an unknown prop throws
`PageDocumentError`.

## Tests (owned)

- `tests/vitest/pages/task-534-interactivity-model.test.ts` — switcher/scrollHint/
  gallery-filter/magnetic/noise round-trip, enum fail-closed on write, category
  fail-soft drop, activeIndex clamp, unknown-key reject, legacy byte-identity, slot-
  host `getPageBlockActiveSlotKeys`, Ajv lockstep, the `{label,href}`→`{label}`
  schema-safety pin.
- `tests/vitest/pages/pageEffectsRuntime.test.ts` — EXTENDED: switcher/filter markers
  precede the reduced-motion early-return, magnetic follows it + opens its own
  `pointer:fine` gate, token-split match, no `${`/`eval`/`Function`/`innerHTML`.
- `tests/vitest/pages/task-534-interactivity-render.test.tsx` — tablist/panels,
  escaped labels, filter bar + `data-category`, un-filtered byte-identity, scrollHint
  glyph + bob CSS, page/section noise overlays, single-`<script>` emit gate widened
  only by runtime-bearing surfaces.
- `tests/vitest/pages/task-534-interactivity-css.test.ts` — selectors present,
  functional rules outside the reduced-motion guard, motion rules inside it, token
  color only, no `${`/`url()`.
- `tests/vitest/content/task-534-interactivity-runtime.test.tsx` — behavioral IIFE
  exec: click/keyboard switcher toggle, filter show/hide + multi-category match,
  magnetic clamped transform + reset, and the reduced-motion/coarse-pointer guards
  (toggles work for reduce, magnetic suppressed).
- `tests/vitest/pages/page-editor-control-registry.test.ts` + `.../ui/page-editor-v2-flow.test.tsx` +
  `page-document-v2*.test.ts` — owned-breaking updates for the exhaustive-record /
  catalog / palette / slot-key / capability enumerations + the grain-overlay
  present-only Effects-panel test. The two `task-534-interactivity-model` Ajv-schema
  tests now share ONE lazily-compiled+memoized validator (`getSchemaValidator`) instead
  of compiling the recursive `pageDocumentV2JsonSchema` twice — the second compile had
  crept past the 30s cap under parallel load (31.3s timeout flake); one compile removes
  the double cost and the flake.
- `tests/integration/runtime/pages-runtime.test.ts` — the "renders every insertable
  block" parity fixture (`runtimeParityPageData`) gains a `switcher` block (two tabs +
  two `panel:1`/`panel:2` slots) and a `scrollHint` block, because 534 made both
  editor-insertable (and cleared `gallery`'s pending reason). The test loops over the
  LIVE `insertablePageBlockTypes` and asserts `data-page-block="<type>"` for each, so the
  fixture had to enumerate the two new insertable types (else the assertion fails on the
  missing switcher/scrollHint markup). This is a bun integration test (DB-backed), which
  is why the gap only surfaced once the suite ran against a database.

## Gates

All gates green at closure (worktree provisioned with `.env`/`DATABASE_URL` from the
main tree; `.env` stays gitignored, not committed):

- `bun --cwd core lint` — pass (exit 0).
- `bun --cwd core lint:types` — pass (exit 0).
- root `tsc -p tsconfig.json --noEmit` — pass (exit 0), re-run green after the
  pages-runtime fixture edit.
- `test:vitest` — changed/owned set (9 files) 364/364; broad `tests/vitest/pages/` +
  `tests/vitest/content/` 712/712 (39 files). The Ajv-compile timeout flake is fixed
  (shared memoized validator).
- `test:bun` — 1489 pass / 1 skip / 6 fail on the FULL parallel run; the 6 are the
  documented shared-REMOTE-DB transient class — cache-size timing
  (`getSiteCacheStats().size` 1-vs-0 races), 15s pagination timeouts, and a
  `settings_value_invalid` from a polluted `site.contentRoutes` row — they VARY run to
  run (a second full run failed a DIFFERENT 3) and pass in isolation. None touch 534's
  code surface (pages model/render/CSS/runtime/controls; 534 adds no settings/route/
  cache/DB path). The ONE genuinely 534-caused failure — `pages-runtime`'s "renders
  every insertable block" parity test tripping on the new insertable `switcher`/
  `scrollHint` — was FIXED (fixture now enumerates both) and re-verified green in
  isolation (1/1).
- `gates:coderso` — functional / ux / performance / security / reliability ALL PASS
  (5/5, exit 0). The security gate passes now that `DATABASE_URL` is present (the earlier
  "missing DATABASE_URL" note was an environment gap, not a 534 defect — 534 adds no
  route/RBAC/DB).

## Open follow-ups (explicit)

- **INFO (deferred to orchestrator, post-merge):** the live ≥5-scenario light+dark
  Playwright smoke on `:5173`/`:3000` reproducing `_docs/projekty-domow-wow-site`
  (barn/villa/eco switcher, portfolio filter, magnetic button, grain wash +
  scroll-hint, cross-device + publish→front parity, security negatives). The dev host
  serves the MAIN tree, so live smoke runs after merge.
- **INFO:** `test:bun`'s 6/1489 failures are the known shared-remote-DB
  cache-timing/timeout/settings-pollution transient (vary per run, green in isolation),
  not a 534 regression.
