# 1246 - TASK-532 Typography Fidelity — Fluid Font-Size, Heavier Weights, Text-Transform, Decorative Eyebrow Rule & TextColor-On-Text (Bundle B)

Date: 2026-07-09
Version: Unreleased
Tasks: TASK-532, TASK-532-01, TASK-532-02, TASK-532-01-L01…L06

## Key Changes

Bundle B of the four additive page-toolkit-fidelity bundles (531 gradients, **532
typography**, 533 shadows/glow, 534 tokens) that close the gaps catalogued in the
owner's `_TMP-cms-ograniczenia.md`. Every addition is **present-only** (ZERO bytes
when unauthored ⇒ post-530 / no-effect docs normalize AND render byte-identical),
joins the reject-unknown allowlist + a round-trip test, routes any color ONLY
through the `sanitizeAuthoringCssColor` whitelist, and adds **NO DB migration, NO
npm dependency, NO route/RBAC, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`)**.
Every shared-seam edit sits inside a labelled `// ── TASK-532 ──` region so the
parallel bundles 531/533/534 merge additively.

- **(1) Fluid font-size (`PageBlockStyleV2.fontSizeCustom`, present-only).** The
  prototype composes type with `clamp(2.6rem,5vw,4.4rem)`, `1.45rem`, `.78rem`; the
  CMS only offered ten discrete tokens (`2xs..5xl`). Added a present-only fluid
  font-size string that **WINS over the discrete `fontSize` token** at render
  (`toPageBlockTypographyStyle`, `pageRendererV2.tsx` — custom assigned inline,
  token is the fallback/unset path). Validated by a NEW **strict numeric-unit-clamp
  grammar** `isSafeAuthoringCssLength` / `sanitizeAuthoringCssFontSize`
  (`pageAuthoringSanitizers.ts`, own `TASK-532` region reusing `hasBalancedParens`):
  accepts ONLY a bare number + allowlisted unit (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`)
  or a single `clamp()`/`min()`/`max()` of such lengths (clamp needs exactly 3
  args) — 64-char cap, balanced-paren check, and a fail-closed reject of
  `url(`/`expression(`/`;`/`{`/`}`/`<`/`\`/`:`/comment escapes. NEVER arbitrary
  CSS; a non-conforming value ⇒ `null` ⇒ field omitted (falls back to token). The
  control (`block.style.fontSizeCustom`, "Fluid size") is `input:"text"`,
  `responsive:true` (a per-device font-size string is CSS-expressible).
- **(2) Heavier weights.** Extended `pageTypographyFontWeights`
  (`normal`/`medium`/`semibold`/`bold` → +`extrabold`/`black`) and
  `pageTypographyFontWeightCssValues` (+`800`/`900`) for the prototype's
  `font-weight:950` step numbers / realization badge. The heavier weights paint
  INLINE via the css-values map (like `normal`), not a baked `font-*` class.
- **(3) Text-transform (`PageBlockStyleV2.textTransform`, present-only enum).** New
  `pageTypographyTextTransforms` (`none`/`uppercase`/`lowercase`/`capitalize`) +
  `PageTypographyTextTransform` type. Fail-closed enum; `"none"` resets ⇒ omitted;
  emits a fixed CSS keyword inline on the text node
  (`block.style.textTransform`, `input:"select"`).
- **(4) Decorative eyebrow RULE — EXTENDS the existing `divider` block (no new
  block type).** New present-only props `width` (px, clamped
  `PAGE_DIVIDER_WIDTH_CLAMP` 8..400, default 34), `align`
  (`pageDividerAligns` `left`/`center`/`right`), `gradient` (boolean). With
  `gradient:true` the renderer swaps the `<hr>` for a slim `<span>` painting
  `linear-gradient(90deg, <tone-color>, transparent)` (tone color from the
  `pageDividerToneBorderColor` whitelist — no raw author string), positioned by
  `align` via auto margins — matching the prototype's `.eyebrow span`. With
  `gradient` unset the legacy `<hr>` is byte-identical. Controls: "Gradient rule"
  (switch), "Rule length" (number, px), "Rule align" (segmented).
- **(5) TextColor on the `text` block — rich-path fix.** The model already carried
  `style.textColor`, the universal `block.style.textColor` control already showed on
  `text`, and the PLAIN `<p>` path already honored it via the inherited
  `--coderso-block-text` var; but the RICH (`format:"rich"`) path rendered a bare
  wrapper `<div>` whose typography style excluded color, so an authored `textColor`
  never painted the rich body. Surgical fix (`renderTextBlock`): thread the
  `sanitizeAuthoringCssColor`-validated color onto the rich wrapper as inline
  `color` + a `[&_*]:text-[color:inherit]` child hint (+ the text data-attributes),
  ONLY when authored (unset ⇒ byte-identical, no attribute leak). The `.prose`
  wrapper class is inert here (the Tailwind typography plugin is NOT installed, so
  no competing descendant-color rule exists); the painted color is proven only by
  the LIVE computed-color smoke (acceptance #5), which is orchestrator-run
  post-merge (see Open follow-ups).

- **Model / schema / normalize (`pageDocumentV2.ts`, all inside a `TASK-532`
  region).** New keys join the `pageBlockStyleKeys` allowlist and the SINGLE hoisted
  `pageBlockStyleJsonSchema` (`$defs/pageBlockStyle`, `additionalProperties:false`,
  `$ref`-shared by BOTH the inline and responsive-override paths — one edit covers
  both); divider props join `pageBlockPropKeys.divider`, the divider
  `blockPropJsonSchemaForType` branch, and the divider `normalizeBlockProp` branch.
  `fontSizeCustom` schema is a loose `string`+`maxLength:64` (the grammar is the
  write-boundary security boundary; the cap is defence-in-depth). Enums fail closed
  (`PageDocumentError` on an unknown value in write mode); numbers clamp fail-soft;
  each new key round-trips.
- **Security.** No new route/RBAC/method. `fontSizeCustom` is the only new free-text
  CSS surface and is grammar-validated at the write boundary (fail-closed to
  omitted); `textColor` (rich path) + the divider gradient tone color ride
  `sanitizeAuthoringCssColor`; enums fail closed; every new key joins its
  reject-unknown allowlist + a persistence round-trip assertion.
- **Tests (owned).** New coverage in `page-authoring-sanitizers.test.ts` (length
  grammar + injection fuzz), `page-document-v2.test.ts` (round-trip / reject-unknown
  / precedence), `page-renderer-v2.test.tsx` (custom-wins emit, weight css-values,
  text-transform, eyebrow gradient rule, rich-path textColor markup),
  `page-editor-control-registry.test.ts` and `page-editor-control-ui-model.test.ts`
  (new controls). FOUR declared re-baselines (none weakens a behavior assertion, per
  the corrected "Owned breaking tests" contract): (a) the hardcoded 4-member weight
  literal in `page-editor-control-ui-model.test.ts` → the 6-member list; (b) the
  literal-token invalid fixture in `page-document-v2.test.ts` moved OUTSIDE the grown
  6-member enum (the enum now accepts `"black"`); (c) the exhaustive
  `Record<PageTypographyFontWeight,…>` in `page-block-render-defaults.test.tsx` gains
  `extrabold:null, black:null` (required TS fix — new weights paint inline, not a
  baked class) + widened `anyWeightClass` regex; (d) `page-editor-v2-flow.test.tsx`
  re-baselines the typography-panel raw-text-input count from `0` to exactly `1`
  (the new "Fluid size" control, pinned by label) + adds "Text transform" to the
  segmented group. `page-editor-control-registry.test.ts` compares weight `options`
  by REFERENCE, so it needs no re-baseline.
- **Docs.** `PAGE_MODEL.md` (typography style keys: `fontSizeCustom` grammar +
  precedence, extended `fontWeight`, `textTransform`, the rich-path `textColor` fix,
  the eyebrow-divider `width`/`align`/`gradient` extension) and `DESIGN_TOKENS.md`
  (Pages v2 typography consumption: fluid size, extended weights, text-transform; a
  new "Pages v2 typography fidelity (TASK-532)" enums/clamps/grammar table incl.
  `PAGE_DIVIDER_WIDTH_CLAMP`).

## Gates

All green:

- `bun --cwd core lint` — PASS (exit 0)
- `bun --cwd core lint:types` — PASS (exit 0)
- root `tsc -p tsconfig.json --noEmit` — PASS (exit 0)
- `test:vitest` — changed files (7 owned: `page-authoring-sanitizers`,
  `page-block-render-defaults`, `page-document-v2`, `page-editor-control-registry`,
  `page-editor-control-ui-model`, `page-renderer-v2`, `page-editor-v2-flow`) + broad
  `tests/vitest/pages/` + `tests/vitest/ui/page-editor-v2-flow` — 24 files, 711/711
  pass (at `--testTimeout=30000`; the default-5s run showed 3 Ajv-schema-compilation
  timeout flakes, all TASK-522/525 schema tests, ALL green isolated:
  `page-document-v2` 113/113).
- `test:bun` — **1495 pass / 1 skip / 0 fail** (1496 tests / 260 files) on a clean
  re-run (exit 0). An earlier full-suite run surfaced 7 fails that were the KNOWN
  slow-remote-DB 15s-timeout transient under `--parallel=1` load (e.g.
  `site-shell-runtime.test.ts` full-HTML render); each passed in isolation at a 45s
  timeout (`site-shell-runtime` 8/8) and the clean re-run went 0-fail. NO TASK-532
  regression.
- `gates:coderso` — 5/5 PASS (functional, ux, performance, security, reliability).

## Open follow-ups (explicit, not dropped)

- **Live `.prose` textColor smoke is orchestrator-run post-merge.** The rich-path
  textColor fix (item 5) paints correctly by construction (no competing
  descendant-color rule — the Tailwind typography plugin is not installed), but the
  painted computed color is proven only by a LIVE Chromium check (acceptance #5).
  The full ≥5-scenario-per-area light+dark Playwright smoke vs the prototype
  (`_docs/projekty-domow-wow-site`) is deferred to the orchestrator post-merge (the
  dev host serves the MAIN tree).
