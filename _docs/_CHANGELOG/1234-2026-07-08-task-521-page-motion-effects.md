# 1234 - TASK-521 Page Motion & Interaction Effects — Section Scroll/Parallax/Reveal, Animated-Icon Block, Hero Mouse-Tilt & Per-Page Effects (Compact Side-Inspector Panel)

Date: 2026-07-08
Version: Unreleased
Tasks: TASK-521, TASK-521-01, TASK-521-01-L01, TASK-521-01-L02, TASK-521-01-L03, TASK-521-01-L04, TASK-521-01-L05, TASK-521-02, TASK-521-02-L01, TASK-521-02-L02, TASK-521-02-L03, TASK-521-03, TASK-521-03-L01, TASK-521-03-L02, TASK-521-03-L03, TASK-521-03-L04, TASK-521-04, TASK-521-04-L01, TASK-521-04-L02, TASK-521-04-L03, TASK-521-04-L04, TASK-521-05, TASK-521-05-L01, TASK-521-05-L02, TASK-521-05-L03, TASK-521-05-L04, TASK-521-06

## Key Changes

Adds one cohesive family of motion/interaction effects to Pages v2 — section
scroll effects (reveal / parallax), an animated-icon block, hero mouse-tilt, and
per-page ambient effects — plus the owner-mandated relocation of page settings
into a compact side-inspector panel. Every effect is **present-only** (emits ZERO
bytes when unauthored; a legacy / no-effect document normalizes AND renders
**byte-identical** to the pre-521 output), joins its **reject-unknown allowlist**
(`assertKnownKeys` + strict `pageDocumentV2JsonSchema` `additionalProperties:false`)
with a round-trip test, and respects **`prefers-reduced-motion`** (BOTH a CSS
`motion-safe:`/`motion-reduce:` guard AND a
`matchMedia('(prefers-reduced-motion: reduce)').matches` early-return in each
runtime IIFE). **NO npm dependency, NO DB migration / DDL, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump** (stays `2`), NO new route/RBAC — all config
rides existing jsonb (`section.style`, `currentData.settings.effects`,
`hero.style`, block props). Runtime scripts are static dependency-free IIFEs
emitted ONLY on the front/preview render path (`PageDocumentRender`), never on the
builder canvas (Hard Invariant 7). Landed strictly in order 521-01 → 521-02 →
521-03 → 521-04 → 521-05 → 521-06 (single-writer files + documented additive seams
in `pageRendererV2.tsx` / `pageEditorControlRegistry.ts`).

- **Effects MODEL + shared runtime infra (521-01, `core/services/pages/pageDocumentV2.ts`
  + NEW `core/services/pages/pageEffectsRuntime.ts`):** the shared effect vocabulary
  — `pageSectionScrollEffects` (`none`/`reveal-fade`/`reveal-up`/`parallax`),
  `animatedIconAnimations` (`none`/`spin`/`pulse`/`bounce`/`draw`), the
  `animatedIconNames` glyph allowlist + `ANIMATED_ICON_NAME_PATTERN` +
  `resolveAnimatedIconName` (fail-soft → `"sparkles"`), and the clamps
  `PAGE_PARALLAX_INTENSITY_CLAMP` (0..40), `PAGE_SPOTLIGHT_SIZE_CLAMP` (120..900),
  `ANIMATED_ICON_SIZE_CLAMP` (16..160), `ANIMATED_ICON_SPEED_CLAMP` (400..4000).
  `PageSectionStyleV2` gains present-only `scrollEffect`/`parallaxIntensity`;
  `PageDocumentSettingsV2` gains present-only `effects` (`PageEffectsV2`:
  `cursorSpotlight`/`spotlightColor`/`spotlightSize`); `pageBlockPropKeys.icon`
  extends to `["name","label","animation","size","color","speed"]`. Enums are
  `normalizeEnum`-guarded (fail-CLOSED on write — invalid enum VALUE throws
  `PageDocumentError`), numbers `readNumber`-clamped (fail-soft), colors via
  `readSafeColor`. `pageEffectsRuntime.ts` holds the dependency-free
  reveal/parallax/spotlight IIFE source (`PAGE_EFFECTS_RUNTIME_SOURCE`/`_ID`).
- **Section scroll/parallax/reveal (521-02, `pageEditorControlRegistry.ts`
  [`pageUniversalSectionControls`] + `pageRendererV2.tsx` [section region]):**
  section-inspector descriptors for `scrollEffect` + `parallaxIntensity` (shown
  only for `parallax`); `PageSectionRender` stamps the reveal/parallax data
  attributes + wrapper + runtime on the FRONT/preview only — the builder canvas
  (`PageSectionContent`) renders content at rest and never emits the runtime.
  IntersectionObserver reveal-on-enter, rAF scroll parallax within the clamped
  travel; reduced-motion → content at rest.
- **Hero mouse-tilt (521-03, `core/widgets/core/hero.tsx` +
  `HeroEditors.tsx`):** present-only `hero.style.tilt`
  (`HeroTilt = "none"|"subtle"|"strong"`, `heroTilts`) — a 3D parallax-on-hover
  via CSS `perspective` + a tiny `mousemove` runtime. Normalizes **fail-SOFT** via
  a hero-local `resolveHeroTilt` (mirrors `resolveHeroMotionPreset`; unknown →
  `"none"`, never throws — NOT pageDocumentV2 `normalizeEnum`). Reduced-motion or a
  coarse/touch pointer → NO tilt; `"none"`/unset is byte-identical to today.
- **Animated-icon block (521-04, NEW `core/services/pages/animatedIconGlyphs.tsx` +
  `pageEditorOptions.ts` + `pageRendererV2.tsx` [`case "icon"`] +
  `pageEditorControlRegistry.ts` [`pageBlockControlRegistry.icon`]):** the
  previously non-functional `icon` PAGE block is implemented as a real, insertable,
  runtime-rendered animated-icon block from a curated **inline-SVG + CSS-keyframes**
  set — no Lottie, no npm dependency, CSP-safe. NO new `pageBlockTypes` member; the
  `icon` member was promoted into `realRuntimeBlockTypes`/`editorInsertableBlockTypes`
  and its capability "pending" reason removed. `name` resolves against the
  `animatedIconNames` allowlist (unknown → `"sparkles"`); `speed` drives
  `--anim-speed`; `motion-reduce` pauses the keyframes. It is a renderer `case`, NOT
  a composite widget — `core/widgets/registry.ts`/`modulePackMatrix.ts` unchanged,
  the widget-pack matrix gains no row.
- **Per-page effects + compact side-inspector panel (521-05,
  `core/admin/ui/pages/PageEditor.tsx` + `pageRendererV2.tsx` [page-root region]):**
  page settings relocated OUT of the full-height slide-out drawer INTO a compact
  panel in the SAME right side-inspector rail as section/block settings (triggered
  by a button next to the section-panel icon, reusing the `Settings2` import), with
  a new **Effects** section authoring `settings.effects` (cursor-follow spotlight
  color/size). `PageDocumentRender` attaches the page-level effect attributes + the
  spotlight overlay (`--spotlight-x/y/-color/-size`) and emits the shared effects
  runtime once — front/preview only; reduced-motion / coarse pointer → no spotlight.
- **Security (defence in depth, at write AND render).** Colors → `readSafeColor`
  (whitelist; alpha via TASK-519); the icon `name` → kebab pattern at write +
  `resolveAnimatedIconName` allowlist at render (unknown → neutral `"sparkles"`
  glyph, never interpolated into markup); numbers → `readNumber` clamps; enums →
  `normalizeEnum` fail-CLOSED (invalid VALUE / unknown KEY throws `PageDocumentError`),
  except hero `tilt` which is fail-SOFT via `resolveHeroTilt`. All runtime scripts
  are STATIC string literals — no stored/user data is ever interpolated into the
  source; each reads per-instance config from validated data-attributes / CSS custom
  properties and runs behind a reduced-motion early-return (semgrep-clean: no
  `eval`/`new Function` in shipped source). Every new key ships its reject-unknown
  allowlist entry + a round-trip assertion (fail-closed READ trap).
- **Docs:** `_docs/PAGE_MODEL.md` (new § Motion And Interaction Effects — section
  scroll effects, animated-icon block props, hero tilt, per-page `PageEffectsV2` +
  compact-panel relocation), `_docs/WIDGETS.md` (hero tilt + animated-icon block,
  no widget-pack row), `_docs/DESIGN_TOKENS.md` (effect enums/clamps table, the
  `--anim-speed`/`--spotlight-*` custom properties, the `prefers-reduced-motion`
  guarantee) updated.
- **Tests:** all new 521 model/SSR/render/descriptor/behavioral tests live in the
  Vitest lane (`tests/vitest/pages/page-document-v2*.test.ts` round-trip +
  reject-unknown + fail-soft + Ajv `additionalProperties`, `page-renderer-v2.test.tsx`
  SSR shape / present-only byte-identity, `page-editor-control-registry.test.ts`
  descriptors, `widgets/hero*.test.tsx` tilt, `ui/page-editor-v2-flow.test.tsx`
  compact panel, `content/{sectionScrollEffect,heroTilt,animatedIcon,cursorSpotlight}.test.tsx`
  + `pages/pageEffectsRuntime.test.ts` jsdom behavior); the pre-existing Bun lanes
  (incl. `tests/integration/runtime/pages-runtime.test.ts`) stay green. All gates
  green (`bun --cwd core lint`/`lint:types`, root `tsc -p tsconfig.json --noEmit`,
  `bun run test:bun`, `bun run test:vitest`, `gates:coderso`). The ≥5-scenario-per-area
  LIVE Playwright smoke (section effects + animated icon + hero tilt + per-page
  spotlight/compact panel on the real front + admin, light + dark) is run by the
  orchestrator post-merge (the dev host serves the MAIN tree, not this worktree).

## Open follow-ups (explicit, not dropped)

- Configurable scroll reveal threshold (currently a fixed IO threshold).
- Additional curated animated-icon glyphs / animations beyond the initial set.
- Section scroll effects on nested blocks (currently the section CONTAINER only).
