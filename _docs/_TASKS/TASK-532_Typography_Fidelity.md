# TASK-532: Typography Fidelity — Fluid Font-Size, Heavier Weights, Text-Transform, Decorative Eyebrow Rule & TextColor-On-Text (Bundle B)

# FileName: TASK-532_Typography_Fidelity.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Medium
**Dependencies:**
- **TASK-530 — HARD, LANDS FIRST.** 532 is one of the FOUR additive
  page-toolkit-fidelity bundles (531 gradients, 532 typography [this], 533
  shadows/glow, 534 tokens) that close the gaps catalogued in the owner's 7-agent
  report `_TMP-cms-ograniczenia.md`. All four are ADDITIVE to the post-530
  `PageDocumentV2` and merge additively; 532 keeps every model/schema/control
  addition inside a clearly-labelled **`TASK-532`** region so a parallel worktree
  merges without collision.
- TASK-424 (`PageBlockStyleV2` token-backed typography surface —
  `fontFamily`/`fontSize`/`fontWeight`/`lineHeight`/`letterSpacing`; the
  `pageTypographyBlockControls` cluster; `toPageBlockTypographyStyle`), TASK-425
  (responsive-override machinery every new style field rides for free —
  `PageBlockResponsiveOverrideV2.style?: PageBlockStyleV2`), TASK-522/524/525
  (present-only style-field precedent, the `pageBlockStyleKeys` allowlist + the SINGLE
  hoisted `pageBlockStyleJsonSchema` (`$defs/pageBlockStyle`, `additionalProperties:false`)
  referenced by `$ref` on BOTH the inline and responsive-override paths, the
  `sanitizeAuthoringCssColor` write-boundary color whitelist).

**Status:** ⏳ To Do
**Closure changelog:** Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). Highest on disk at authoring is **1242**
(TASK-530); the four bundles 531–534 take **1243+**. Do **NOT** hardcode a
colliding number and do **NOT** edit `_CHANGELOG/*` or `_TASKS/README.md` — the
orchestrator/closure subtask owns those.

---

## Overview

The prototype `_docs/projekty-domow-wow-site` composes its type with tools the
post-530 Page Editor v2 typography surface cannot express, so authoring it against
the CMS silently degrades (`_TMP-cms-ograniczenia.md` §1, §4.7, §4.8):

1. **Fluid font-size (§ "Font-size = dyskretne tokeny `2xs..5xl`, brak `clamp()`/rem").**
   The prototype uses `clamp(2.6rem,5vw,4.4rem)`, `1.45rem`, `.78rem`; the CMS only
   offers ten discrete tokens (`pageTypographyFontSizes` `2xs..5xl`,
   `pageDocumentV2.ts:230`), so a fluid value snaps to the nearest token and loses
   viewport scaling. → add a present-only `style.fontSizeCustom` accepting a SAFE
   `clamp()`/`rem`/`px`/`em`/`vw` numeric-unit value (validated to a strict
   numeric-unit-clamp grammar — **NO arbitrary CSS**), taking precedence over the
   discrete `fontSize` token when set.
2. **Font-weight beyond bold (§ "`font-weight: 950`… clamp do `bold`").** The
   prototype's step numbers / realization badge use `font-weight:950`; the CMS enum
   `pageTypographyFontWeights` (`:242`) stops at `bold` (700). → extend the enum with
   `extrabold` (800) and `black` (900).
3. **Text-transform (§ "Brak `text-transform`").** The prototype writes uppercase
   LITERALLY into content because the CMS has no transform. → add a present-only
   `style.textTransform` enum (`none`/`uppercase`/`lowercase`/`capitalize`).
4. **Decorative eyebrow RULE (§ "dekoracyjnej kreski eyebrow").** The prototype's
   `.eyebrow span` is a 34px gradient line (`linear-gradient(90deg,aqua,transparent)`);
   today it is faked with a `◆` glyph or `—`. → extend the EXISTING `divider` block
   (`pageDocumentV2.ts:65`, props `["tone","thickness"]` `:863`) with a present-only
   `width` (short-rule length) + `align` + optional `gradient` decorative variant, so
   a slim gradient eyebrow rule is a real primitive (reuse, not a new block type).
5. **TextColor on the `text` block (§ "`t()` (blok text) nie wystawia `textColor`").**
   The `text` block's body inherits the section's muted color; the plain-text `<p>`
   reads `--coderso-block-text` from the frame BUT the RICH-text path
   (`renderTextBlock` `format==="rich"`, `pageRendererV2.tsx:1218-1233`) renders a bare
   `<div>` + `renderSanitizedRichTextHtml(html, typographyStyle)` where the typography
   style carries NO color, so an authored `textColor` never paints the rich body. →
   thread the present-only, `sanitizeAuthoringCssColor`-validated `style.textColor`
   into BOTH text-block render paths and confirm the universal `block.style.textColor`
   control surfaces on the `text` block.

Every addition is **present-only** (zero bytes when unauthored ⇒ a post-530 document
normalizes + renders **byte-identical**), joins the **reject-unknown allowlist**
(`assertKnownKeys` + `additionalProperties:false` + a round-trip test), routes any
color ONLY through `sanitizeAuthoringCssColor` / `sanitizeAuthoringCssBackground`,
adds **NO DB migration**, does **NOT** bump `PAGE_DOCUMENT_SCHEMA_VERSION`
(`pageDocumentV2.ts:29` stays `2`), and adds **NO npm dependency**.

## Grounding corrections vs the seed map (VERIFIED on disk 2026-07-09)

> SYMBOL names are the contract; RE-GREP (`grep -an`) at implement time — 522/524/525
> shifted the seed's line numbers. Post-530 actuals as re-grepped:

- `PAGE_DOCUMENT_SCHEMA_VERSION = 2` — **`:29`** (seed said `:29` ✓; the seed's `L29`
  is correct). DO NOT bump.
- `PageSectionStyleV2` — **`:534`** (seed `L534` ✓). `PageBlockStyleV2` — **`:596`**
  (seed `L596` ✓).
- `pageBlockStyleKeys` allowlist — **`:746`** (seed `L746` ✓); it ALREADY carries the
  522/524/525 additions (`decoration`…`revealDelay`) through `:779`.
- Section-style allowlist is the INLINE `assertKnownKeys([...])` inside
  `normalizeSectionStyle` (**`:2488`**) — there is NO named `sectionStyleKeys` const
  (seed correct). **532 does NOT touch section style** (all five gaps are block-level
  + the divider block), so 532 leaves `normalizeSectionStyle` untouched — a smaller
  footprint than the seed's generic map implies.
- Block-style JSON schema is a SINGLE hoisted object `pageBlockStyleJsonSchema`
  (`$defs/pageBlockStyle`, `:1424`, `additionalProperties:false` at `:1426`) referenced by
  `$ref` (`pageBlockStyleJsonSchemaRef` → `#/$defs/pageBlockStyle`, `:1513-1514`) on BOTH
  the inline block-style path (`blockJsonSchemaForType :1574`) AND the responsive-override
  style path (`blockResponsiveJsonSchemaForType :1547`). **There is NO
  `partialBlockStyleJsonSchema`** (`grep -an partialBlockStyleJsonSchema
  core/services/pages/pageDocumentV2.ts` returns nothing; "partial" exists only at the
  TS-type / normalizer level — the `partial` param of `normalizeBlockStyle`). The discrete
  typography schema sits at `:1450-1451` (`fontSize`/`fontWeight` via
  `nullableEnumSchema(...)`). 532 adds its new keys to the SINGLE
  `pageBlockStyleJsonSchema` object ONCE — that one edit covers both inline and responsive
  via the shared `$ref`, and both keep `additionalProperties:false`. Do NOT hunt for or
  fabricate a duplicate "partial" schema.
- `normalizeBlockStyle` — **`:2661`** (seed `L2661` ✓); its typography branch is
  `:2760-2791` (`fontSize`/`fontWeight` via `normalizeNullableEnum`).
- `pageTypographyFontWeights` — **`:242`** (`["normal","medium","semibold","bold"]`);
  `pageTypographyFontWeightCssValues` — **`:453`** (`{normal:"400"…bold:"700"}`);
  `pageTypographyFontSizeCssValues` — **`:440`**; `pageTypographyFontSizes` — **`:230`**.
- **CORRECTION to report §5 / seed item (5).** The claim "`text` block does NOT expose
  textColor" is only HALF true. The MODEL already has `style.textColor?` (`:612`), the
  universal `block.style.textColor` control (`pageEditorControlRegistry.ts:471`) is
  NOT type-gated so it already shows on `text`, and `toPageBlockVisualStyle` (`:714`)
  already emits `--coderso-block-text` + `color` on the frame — so the PLAIN text `<p>`
  (which reads `text-[var(--coderso-block-text,#334155)]`, `:1214`) already honors it.
  The REAL residual gap is the **RICH** path (`:1218-1233`): a bare `<div>` +
  `renderSanitizedRichTextHtml(html, toPageBlockTypographyStyle(block))` where the
  typography style excludes color, so the rich body ignores `textColor`. 532's item (5)
  is therefore a SURGICAL rich-path fix (thread the validated color onto the wrapper),
  not a model/control introduction. The leaf spells this out and its test asserts the
  rich body color.
- `divider` block: `pageBlockPropKeys.divider = ["tone","thickness"]` (`:863`),
  `pageBlockDefaultProps.divider = {tone:"neutral",thickness:1}` (`:1123`),
  `blockPropJsonSchemaForType` divider branch (`:1339`), `normalizeBlockProp` divider
  branch (`:3256`), render `case "divider"` (`pageRendererV2.tsx:2187`, an `<hr>`),
  `pageDividerTones = ["neutral","muted","accent"]` (`:166`).
- Sanitizers: `sanitizeAuthoringCssColor` (`pageAuthoringSanitizers.ts:93`),
  `isSafeAuthoringCssColor` (`:79`), `sanitizeAuthoringCssBackground` (`:100`),
  `isSafeAuthoringCssGradient` (`:87`). NO numeric-unit/`clamp()` grammar exists yet →
  532-01-L01 adds `isSafeAuthoringCssLength` + `sanitizeAuthoringCssFontSize` HERE, in
  a labelled `TASK-532` region (bundle 531 relaxes the GRADIENT helpers in the same
  file — disjoint region).
- Control-ui kinds (`pageEditorControlUiModel.ts`): the union has `text`/`segmented`/
  `select`/`swatch`/`slider`/… (`:43-79`); no new kind is needed — `fontSizeCustom`
  uses `input:"text"`, `textTransform` uses `input:"select"`/`segmented` (enum), the
  extended weight enum reuses the existing `segmented` control.

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only**, join `assertKnownKeys` (`pageDocumentV2.ts` — the
block-style allowlist `pageBlockStyleKeys:746`), ship a round-trip test, and are
mirrored into the SINGLE `pageBlockStyleJsonSchema` `$defs` object (`$defs/pageBlockStyle`,
`additionalProperties:false` at `:1426`), which is `$ref`-shared by BOTH the inline and
responsive-override style paths — so ONE schema edit covers both. (There is no
`partialBlockStyleJsonSchema`.) Legacy/post-530 docs normalize byte-unchanged. **NO
migration; `:29` stays `2`.**

```ts
// ===== TASK-532 region (Bundle B — Typography Fidelity) =====
// (1) FLUID font-size (present-only; takes precedence over the discrete token):
export const pageTypographyFontWeights =            // (2) EXTEND enum (:242)
  ["normal","medium","semibold","bold","extrabold","black"] as const;
export const pageTypographyFontWeightCssValues = {  // (2) EXTEND map (:453)
  normal:"400", medium:"500", semibold:"600", bold:"700", extrabold:"800", black:"900",
};
export const pageTypographyTextTransforms =         // (3) NEW enum
  ["none","uppercase","lowercase","capitalize"] as const;
export type PageTypographyTextTransform = (typeof pageTypographyTextTransforms)[number];
// PageBlockStyleV2 (:596) gains:
//   fontSizeCustom?: string;               // (1) safe clamp/rem/px/em/vw length, present-only
//   textTransform?: PageTypographyTextTransform;  // (3) present-only ("none" resets/omits)
// divider block props (:863) gain:  width?, align?, gradient?  // (4) eyebrow rule
```

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 532-01 | Typography-fidelity MODEL + sanitizer grammar + controls + render | `core/services/pages/pageAuthoringSanitizers.ts` **[`TASK-532` length-grammar region — seam]**; `core/services/pages/pageDocumentV2.ts` **[`TASK-532` region: font-weight enum+css, `fontSizeCustom`/`textTransform` block-style fields + allowlist + normalize + JSON schema, divider `width`/`align`/`gradient` props — seams]**; `core/services/pages/pageRendererV2.tsx` **[`toPageBlockTypographyStyle` emit + `renderTextBlock` rich-path color + `case "divider"` render — seams]**; `core/services/pages/pageEditorControlRegistry.ts` **[`pageTypographyBlockControls` + `divider` per-type controls — seams]** | L01 fluid font-size grammar + model, L02 weight-enum + text-transform + eyebrow divider model, L03 text-block textColor render fix, L04 controls, L05 render emit, L06 tests | TASK-530 |
| 532-02 | Tests, docs, closure | test files (own) + `_docs/*.md` | — | 532-01 |

**Land order (strictly sequential):** 532-01 (all model + sanitizer + controls +
render) → 532-02 (closure). Because 531/533/534 run on parallel worktrees, EVERY 532
edit to a shared seam file lives inside a `// ===== TASK-532 … =====` comment fence
so a three-way merge is additive.

## Coordination / collision guards

> **Cross-bundle RECONCILE (531/532/533/534), 2026-07-09 — PASS.** No two bundles add
> the same field name, control id, or CSS token with a different meaning (verified:
> `glow`/`fontSizeCustom`+`textTransform`/`colSpan`+`rowSpan`+`columnTemplate`+`border`/
> `magnetic`+`noiseOverlay`+`switcher`+`scrollHint` are all distinct; all clamp consts,
> types, and `*.style.*` control ids are unique). Canonical region sigil pinned to
> **`// ── TASK-53x ──`** across all four bundles (this contract was authored with an
> `===== TASK-532 =====` sigil — treat that as equivalent to the canonical `// ── TASK-532 ──`
> form and use the canonical form when the leaf lands). 532 is DISJOINT from 531's sole
> ownership of `pageAuthoringSanitizers.ts` multi-layer changes (532 only adds the NEW
> `isSafeAuthoringCssLength`/`sanitizeAuthoringCssFontSize` region + reuses
> `hasBalancedParens`). Append-anchor rule (all four bundles): append each new entry on
> its OWN line inside the labelled region; NEVER rewrite the array's closing
> `] as const;` line, a function's `return` line, or a schema object's closing brace —
> that keeps three-way merges additive. Impl-plan: 532 may run in a PARALLEL worktree
> with 531/533/534; the shared-seam files require only trivial adjacent-append merge
> resolution at land time (see the program-level land order).

- **Shared seams with 531/533/534 (parallel bundles).** Each bundle ADDS distinct new
  fields in DISJOINT, labelled regions. 532 owns:
  - `pageDocumentV2.ts`: the `TASK-532` const region (weight enum+css, `textTransform`
    enum), the two new `PageBlockStyleV2` fields (`fontSizeCustom`, `textTransform`),
    the new `pageBlockStyleKeys` entries, the divider prop additions, and the matching
    normalize + JSON-schema branches. 532 does NOT touch `pageShadowTokens` (533),
    gradient helpers (531), or token defs (534).
  - `pageAuthoringSanitizers.ts`: a NEW `isSafeAuthoringCssLength` /
    `sanitizeAuthoringCssFontSize` region — DISJOINT from bundle 531's relaxation of
    `isSingleGradientLayer`/`isSafeAuthoringCssGradient` (531 edits the gradient
    helpers; 532 adds a length helper; no overlapping lines).
  - `pageRendererV2.tsx`: `toPageBlockTypographyStyle` (`:764`) emit lines, the
    `renderTextBlock` rich wrapper (`:1218`), and `case "divider"` (`:2187`) — disjoint
    from any shadow/gradient/token render region the sibling bundles touch.
  - `pageEditorControlRegistry.ts`: the `pageTypographyBlockControls` array (`:807`) +
    the `divider` entry in `pageBlockControlRegistry` — sibling bundles append their own
    id-namespaced controls elsewhere.
- **`pageBlockStyleKeys` (`:746`) is an append-only shared list.** 532 appends
  `"fontSizeCustom"`, `"textTransform"` inside a `// TASK-532` comment fence; 531/533/534
  append their own keys in their own fences. A three-way merge of disjoint appended
  lines is clean.
- **Owned breaking tests (explicit — corrected 2026-07-09, TWO assertions break).**
  Extending `pageTypographyFontWeights` from 4→6 members breaks exactly TWO assertions on
  disk (the earlier "exactly ONE" claim was wrong — it missed the literal-token pin at
  page-document-v2.test.ts:787):
  1. **`tests/vitest/pages/page-editor-control-ui-model.test.ts:139-143`** — pins a
     HARDCODED 4-member literal `resolveById("block.style.fontWeight").toMatchObject({
     kind:"segmented", options:["normal","medium","semibold","bold"], labels:{...} })`.
     `toMatchObject` matches arrays by EXACT length+elements, so the 6-member resolved
     `options` will FAIL — update this literal to the 6-member form
     `["normal","medium","semibold","bold","extrabold","black"]`.
  2. **`tests/vitest/pages/page-document-v2.test.ts:785-789`** — the "JSON schema accepts
     typography tokens plus nulls and rejects unknown tokens" block sets
     `style = { fontWeight: "black" }` (cast as unknown) and asserts
     `expect(validate(unknownToken)).toBe(false)`. It pins weight membership via the LITERAL
     string `"black"`, NOT the symbol `pageTypographyFontWeights` — so a
     `grep pageTypographyFontWeights` MISSES it. Once L02 grows the enum to include
     `"black"` (900), the shared `pageBlockStyleJsonSchema` `$defs/pageBlockStyle`
     (`fontWeight: nullableEnumSchema(pageTypographyFontWeights)` at `:1451`) ACCEPTS it,
     `validate()` returns `true`, and `.toBe(false)` FAILS. Re-baseline the invalid-token
     fixture to a token that stays OUTSIDE the 6-member enum (e.g. `fontWeight: "ultra"` or
     `"ultrablack"`), preserving the reject-unknown-token intent.
  **The two files previously claimed non-breaking:** (a)
  `tests/vitest/pages/page-editor-control-registry.test.ts:669` asserts `options:
  pageTypographyFontWeights` by REFERENCE against the imported enum (registry `:836` sets
  `options: pageTypographyFontWeights` by the same reference), so growing the enum grows
  BOTH sides and the assertion holds — no re-baseline; (b) the previously-stated
  "`page-document-v2.test.ts` has NO weight-membership/length pin (`grep
  pageTypographyFontWeights` returns nothing there)" is WRONG — it pins via the literal
  string, see item 2 above. **Do NOT rely on `grep pageTypographyFontWeights` alone:** also
  grep the literal weight strings (`"black"`, `"extrabold"`, and each existing member used
  as an invalid-token fixture) across `tests/vitest/**` before landing. Re-baseline ONLY
  these two assertions; never weaken a behavior assertion. NOTE: labels auto-humanize
  (`getPageEditorOptionLabel` falls back to `humanizeOptionToken` → "Extrabold"/"Black"),
  so NO `pageEditorOptionLabelCatalog` edit is needed and the `labels` subset match
  (`toMatchObject`) is unaffected.
- **Precedence rule (must be reconciled once).** When BOTH `fontSize` (token) and
  `fontSizeCustom` are set, the RENDER emits `fontSizeCustom` (the model keeps both;
  the emitter in `toPageBlockTypographyStyle` prefers custom). The control leaf shows
  both controls (no `showWhen` exists in the registry) with a help note; the test
  asserts custom-wins.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (closure subtask owns
  them). rg misdetects `pageRendererV2.tsx`/`pageDocumentV2.ts` as binary — use
  `Read`/`grep -an`.

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the pages
write permission) and the SSR render path. Attacker-influenceable new surfaces are (1)
the `fontSizeCustom` STRING (the only new free-text CSS surface), (2) the `textColor`
threaded into the rich path, (3) new enums, and (4) the divider `gradient` color/flag —
each constrained at BOTH the write (normalize) boundary and the render boundary
(defence in depth).

1. **`fontSizeCustom` — strict numeric-unit-clamp grammar (NO arbitrary CSS).** The
   only free-text CSS value. Validated by a NEW `isSafeAuthoringCssLength`
   (`pageAuthoringSanitizers.ts`, 532-01-L01) that accepts ONLY: a bare number +
   allowlisted unit (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`), OR a single
   `clamp(<len>,<len-or-vw>,<len>)` / `min(...)` / `max(...)` whose arguments are each
   that same length grammar — with a length cap, balanced-paren check, and a
   reject-anything-else fail-closed default (returns `null` ⇒ field omitted). It
   REJECTS `url(`, `expression(`, `;`, `{`, `}`, `/*`, `<`, `\`, and any
   non-allowlisted token — so no CSS declaration/injection, no `url()` fetch, no
   comment-based escape ever reaches the inline `font-size`. Applied at write
   (`normalizeBlockStyle`) AND asserted safe at the render emit (the emitter only
   writes an already-sanitized value). Grammar-fuzz + injection vectors in 532-01-L06.
2. **Colors via the whitelist only.** `textColor` (rich path) + divider `gradient`
   color run through `sanitizeAuthoringCssColor` / `sanitizeAuthoringCssBackground`
   (`pageAuthoringSanitizers.ts:93/100`) at write, never raw; a bad value ⇒ `null` ⇒
   omitted. No raw author string reaches a CSS declaration.
3. **Enums fail-closed.** `fontWeight` (now 6 members), `textTransform`, divider
   `align` are `normalizeEnum`/`normalizeNullableEnum`-guarded — an invalid VALUE
   throws `PageDocumentError` in write mode (matching every existing page enum). They
   reach CSS only as fixed keywords / a fixed weight-map value, never interpolation.
4. **Allowlist + round-trip (fail-closed READ trap).** Every new key joins its
   reject-unknown allowlist (`assertKnownKeys` + `additionalProperties:false`) AND a
   persistence round-trip test — a forgotten allowlist entry silently degrades a stored
   doc to empty on read. No new key ships without its round-trip assertion.

## Hard Invariants

1. **Present-only** — every new field emits ZERO bytes when unauthored; post-530 /
   no-effect docs normalize + render **byte-identical**.
2. **No new npm dependency**, **no DB migration / DDL**, **no
   `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`:29` stays `2`).
3. **`fontSizeCustom` is a strict numeric-unit-clamp grammar** — never arbitrary CSS;
   fail-closed to omitted on any non-conforming input.
4. **Reject-unknown + fail-soft** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad VALUES fail-soft (omit/clamp/whitelist),
   unknown enum VALUES + unknown KEYS reject (`PageDocumentError`).
5. **`fontSizeCustom` wins over `fontSize`** at render when both set; the discrete
   token remains the fallback and unset state.
6. **Colors only via `sanitizeAuthoringCssColor`/`sanitizeAuthoringCssBackground`** —
   no raw author color/gradient string in any emitted declaration.
7. **Additive-merge discipline** — every shared-file edit sits inside a labelled
   `TASK-532` region so parallel bundles 531/533/534 merge without collision.

## Acceptance Criteria (measured LIVE vs the prototype — ≥5 real-flow scenarios)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with `playwright-cli`,
light + dark, 0 console errors, screenshots to `_docs/_workflows/_smoke/`, compared to
`_docs/projekty-domow-wow-site`. Assert VISIBLE effects (computed styles), not control
presence.

1. **Fluid font-size.** A heading with `style.fontSizeCustom:"clamp(2.6rem,5vw,4.4rem)"`
   renders a computed `font-size` that scales with viewport width across desktop/tablet/
   mobile; a plain `"1.45rem"` renders 23.2px; setting it while a discrete `fontSize`
   token is also set → the custom value wins; pasting `url(x)`/`expression(1)`/`12px;}`
   → field omitted (falls back to token/baked size), nothing injected.
2. **Heavier weights.** `fontWeight:"extrabold"` → computed `font-weight:800`;
   `"black"` → `900`; `"bold"` still `700`; unset unchanged.
3. **Text-transform.** `textTransform:"uppercase"` → computed `text-transform:uppercase`
   on the text node; `capitalize`/`lowercase` likewise; `"none"`/unset → omitted.
4. **Eyebrow rule.** A `divider` block with `gradient:true` + `width:34` +
   `align:"left"` renders a slim gradient rule matching `.eyebrow span`; `tone`/
   `thickness` still work; unset `gradient` → the legacy `<hr>` is byte-identical.
5. **TextColor on text.** A `text` block (both PLAIN and RICH `format`) with
   `style.textColor:"#22d3ee"` paints the body aqua on front + canvas (computed
   `color`), not the inherited section muted; a bad color → omitted (inherits);
   unset → byte-identical.
6. **Security negatives.** `fontSizeCustom:"expression(alert(1))"`/`"1px;color:red"`
   → omitted; `fontWeight:"ultra"`/`textTransform:"rotate"`/`divider.align:"skew"` →
   `PageDocumentError` in write mode; `textColor:"javascript:alert(1)"` → omitted; the
   stored doc round-trips with sanitized values.
7. **No-effect byte-identity + cross-device.** A page with none of the new fields is
   byte-identical to post-530 output; every effect authored in the editor matches after
   publish on the real front; `fontSizeCustom` is `responsive:true` (a real per-device
   `font-size` string is CSS-expressible, unlike class deltas) so tablet/mobile custom
   sizes render.

## Definition of done

Both subtasks landed in order, AFTER 530; fluid font-size (safe clamp/rem grammar),
heavier weights (extrabold/black), text-transform, the decorative eyebrow divider, and
text-block textColor (plain + rich) persist, round-trip, reject unknown keys, and
fail-soft on bad values; `fontSizeCustom` is grammar-validated (never arbitrary CSS)
and wins over the discrete token; colors ride the whitelist; no npm dep, no migration,
no schemaVersion bump, no route; every shared-file edit is inside a labelled `TASK-532`
region; post-530 / no-effect docs byte-identical; the ONE owned hardcoded-literal
assertion (`page-editor-control-ui-model.test.ts:139-143`) is re-baselined to the 6-member
weight list (registry `:669` compares by-reference and `page-document-v2.test.ts` has no
weight pin, so neither re-baselines; no behavior weakening); every gate green (root
`tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`, `bun --cwd core lint`,
Vitest, `bun test`, `gates:coderso`); ≥5-scenario Playwright smoke passes light + dark
with 0 console errors side-by-side vs the prototype; closure documented under the
then-current next-free changelog (grep `_docs/_CHANGELOG/` highest+1; highest on disk
1242 at authoring; 531–534 take 1243+).
</content>
</invoke>
