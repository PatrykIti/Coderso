# TASK-533: Layout — Grid Row/Col Span, Asymmetric Column Ratios, Per-Edge Section Border & Native Timeline Axis

# FileName: TASK-533_Layout_Grid_Span_Asymmetric_Border_Timeline.md

**Priority:** High
**Category:** Site Render / Content (Pages) / Admin UI / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Medium
**Dependencies:**
- **Additive to PageDocumentV2 post-TASK-530 (SHARED-SEAMS PROGRAM 531–534).** 533
  is Bundle C of the four parallel page-toolkit fidelity bundles (531 gradient/
  multi-layer bg, 532 typography/shadow, **533 layout grid/border/timeline**, 534
  tokens). All four ADD distinct fields to the SAME shared seams
  (`pageDocumentV2.ts`, `pageRendererV2.tsx`, `pageEditorControlRegistry.ts`,
  `pageEditorControlUiModel.ts`, `editorControls/*`). 533 keeps EVERY addition in a
  clearly-labelled `TASK-533` region inside each shared file so parallel worktrees
  merge ADDITIVELY (no shared line rewritten; new keys appended to allowlists /
  schema property maps / control arrays / normalizer bodies in disjoint blocks).
- **SOFT, LANDED — reuses existing seams:** the section content-grid emit
  (`toPageSectionRenderProps` `contentClassName`/`style`, `pageRendererV2.tsx:639-650`),
  the block frame-var emit (`toPageBlockRenderProps` `style` merge,
  `pageRendererV2.tsx:951-955` — the same seam 525-02 uses for `--reveal-delay` and
  522 for `--layer-*`), the block border emit (`toPageBlockVisualStyle`,
  `pageRendererV2.tsx:723-749`), and the timeline template render
  (`wrapSectionTemplateBlock` timeline branch, `pageRendererV2.tsx:2468-2500`).
- **NO DB migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump
  (`pageDocumentV2.ts:29` stays `2`), NO npm dependency.**

**Status:** ⏳ To Do

**Closure changelog:** Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). `1242` is the last used (TASK-530); 531–534 take
`1243+`. Do **NOT** hardcode a colliding number and do **NOT** edit `_CHANGELOG/*`
or `_TASKS/README.md` — the orchestrator owns those.

---

## Overview

Three layout-fidelity gaps catalogued in `_TMP-cms-ograniczenia.md` (owner's 7-agent
report, §4.5 / §6 / §10, plus §1 "grids only symmetric, no span"), all measured
against the reference wow-site (`_docs/projekty-domow-wow-site/`). Every change is
**additive to PageDocumentV2, present-only** (omit when unset ⇒ byte-identical to
post-530), **reject-unknown** (`assertKnownKeys` allowlist +
`additionalProperties:false` schema + round-trip test), colors ONLY via
`sanitizeAuthoringCssColor`, **no migration / no schemaVersion bump / no npm dep**.

### Gap 1 — grids are symmetric only; no row/col span; no asymmetric column ratio (§1, §6, §4.5)

- **Section grid is symmetric.** `toPageSectionRenderProps` paints the content grid
  with `pageSectionGridClass(columns)` (`pageRendererV2.tsx:641-645` →
  `pageRendererV2.tsx:492-498`), which is a Tailwind `md:grid-cols-N` of EQUAL
  tracks. The reference expresses asymmetric ratios everywhere:
  `.intro-strip-grid{grid-template-columns:1fr 1.2fr}`,
  `.project-grid{grid-template-columns:1.15fr .85fr;grid-auto-rows:260px}`,
  `.hero-grid{grid-template-columns:minmax(0,1fr) minmax(420px,.9fr)}`
  (`_docs/projekty-domow-wow-site/assets/styles.css:69,76,79`). Today these all
  collapse to `columns: 2` (equal). **TARGET:** a present-only section
  `columnTemplate?: string` (a SANITIZED, restricted `grid-template-columns` value,
  e.g. `"1.15fr .85fr"` / `"1fr 1.2fr"`) that, when set, OVERRIDES the symmetric
  grid class with an inline `gridTemplateColumns`, reproducing the intro (1/1.2fr)
  and realizacje (1.15/.85fr) ratios.
- **No block span.** A block can pick a single `column` (`PageBlockStyleV2.column`,
  `pageDocumentV2.ts:611`, 1..4) but cannot SPAN columns or rows. The reference
  `.project-card.large{grid-row:span 2}` and `.offer-card.feature{grid-row:span 2}`
  (`styles.css:79`) make the Aurora card 2× taller; today it is faked with header
  padding only (`_TMP-cms-ograniczenia.md:55,109`). **TARGET:** present-only
  `PageBlockStyleV2.colSpan?: number` / `rowSpan?: number` (clamped integers) that
  emit `gridColumn: span N` / `gridRow: span N` on the block frame, reproducing
  `.project-card.large` (span-2 row).

### Gap 2 — no per-edge section border (border-block) (§4.5, §6)

- **Section style has NO border field at all.** `PageSectionStyleV2`
  (`pageDocumentV2.ts:534-571`) carries `background`, `radius`, `shadow`,
  `scrollEffect`, `surfacePreset`, `composition`, `fullBleed` — but no border. The
  reference `.intro-strip{border-block:1px solid rgba(255,255,255,.1)}` and
  `.dark-panel-section:before{…border-block:1px solid rgba(255,255,255,.08)}`
  (`styles.css:76,77`) draw top+bottom hairlines; `_TMP-cms-ograniczenia.md:50,88`
  flags "brak per-edge border (border-block sekcji)". **TARGET:** a present-only
  section `border?` object with per-edge color+width (at minimum `top`/`bottom` for
  `border-block`; full four-edge preferred), colors via `sanitizeAuthoringCssColor`
  + numeric widths clamped, emitted as fixed `border-{edge}-color`/`-width`/`-style`
  declarations on the section box in `toPageSectionStyle`.

### Gap 3 — native `timeline` section renders dots but NO vertical axis line (§10)

- **The `timeline` section type EXISTS and IS rendered** — it is NOT unused in code
  (`_TMP-cms-ograniczenia.md:157` "do sprawdzenia czy daje oś" — VERIFIED here).
  `pageSectionTemplates.ts:62-64` defines it; `wrapSectionTemplateBlock`
  (`pageRendererV2.tsx:2468-2500`) wraps each block in a `grid
  grid-cols-[auto_minmax(0,1fr)]` row with a `data-page-timeline-marker` DOT
  (`:2481-2488`) + `data-page-timeline-content` (`:2489-2497`). **So it delivers the
  DOTS but NOT the connecting vertical AXIS LINE.** The reference draws the axis as
  a pseudo-element on the timeline CONTAINER:
  `.timeline:before{position:absolute;left:24px;top:0;bottom:0;width:1px;
  background:linear-gradient(var(--aqua),rgba(255,255,255,.06))}` plus glow dots
  `.timeline article:before{…box-shadow:0 0 28px var(--aqua)}`
  (`styles.css:79`). `_TMP-cms-ograniczenia.md:120` confirms the smoke used a manual
  GRID (not the native `timeline`) precisely because the axis was missing.
  **TARGET:** add a continuous vertical axis line to the native `timeline` render
  (vertical variant) so the per-item dots sit on a real axis — plus document how to
  select the `timeline` section type so it is discoverable. This is a RENDER-STRUCTURE
  + CSS addition; no model field is required (the axis is fixed structure keyed off
  the section `accent`, already `--coderso-section-accent`, `pageRendererV2.tsx:2486`).

533 fixes all three, present-only, jsonb-only, **NO migration, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump, NO npm dependency**.

## Root-cause grounding (verified on `feature/tasks` HEAD; RE-GREP anchors at implement time)

> **Anchor note:** the SYMBOL names are the contract; the sibling bundles (531/532/
> 534) shift line numbers in the shared files. Re-grep (`grep -an`) at implement time
> and trust the symbol, not the number. `rg` misdetects `pageRendererV2.tsx` /
> `pageDocumentV2.ts` as binary — use `Read` / `grep -an`, never trust an empty `rg`.

### RC-1 — symmetric grid + single-column block placement

- **`pageSectionGridClass`** (`pageRendererV2.tsx:492-498`) returns
  `grid-cols-1 md:grid-cols-N` (EQUAL tracks) for `columns` 1..4. Consumed by
  **`toPageSectionRenderProps`** `contentClassName` (`:641-648`) via `columns =
  getPageSectionEffectiveColumns(section)` (`:625`), with the content grid style
  from `toPageSectionStyle` (`:650`). There is NO `gridTemplateColumns` override
  path — asymmetric ratios cannot be expressed.
- **Block placement** is single-column only: `PageBlockStyleV2.column?: number|null`
  (`pageDocumentV2.ts:611`, clamp `PAGE_SECTION_BLOCK_COLUMN_CLAMP` 1..4, normalized
  `pageDocumentV2.ts:2677-2686`). No `colSpan`/`rowSpan` anywhere in
  `core/services/pages/` (grep verified: 0 hits). The block frame `style` is emitted
  in **`toPageBlockRenderProps`** (`pageRendererV2.tsx:942-955`) — the natural home
  for a present-only `gridColumn`/`gridRow` span (same merge seam as `--reveal-delay`
  and `--layer-*`).

**FIX shape (533-01):** (a) add present-only `PageSectionStyleV2.columnTemplate?:
string` — a SANITIZED restricted grid-track string — emitted as inline
`gridTemplateColumns` on the content grid (overriding the symmetric class) in
`toPageSectionRenderProps`; (b) add present-only `PageBlockStyleV2.colSpan?: number`
/ `rowSpan?: number` (clamped ints) emitted as `gridColumn: "span N"` / `gridRow:
"span N"` on the block frame in `toPageBlockRenderProps`. Both present-only, both
reject-unknown, both fail-soft-clamped.

### RC-2 — no section border field

- **`PageSectionStyleV2`** (`pageDocumentV2.ts:534-571`) — no border member.
  **Section-style allowlist** = the INLINE `assertKnownKeys([...])` literal inside
  `normalizeSectionStyle` (`pageDocumentV2.ts:2495-2514` — there is NO named
  `sectionStyleKeys` const). **Section-style JSON schema = TWO strict
  `additionalProperties:false` mirrors** (like 531's glow) — (a)
  `partialSectionStyleJsonSchema`, the standalone RESPONSIVE-OVERRIDE section style at
  `pageDocumentV2.ts:1629` (`additionalProperties:false` `:1631`; last field
  `fullBleed: booleanSchema` `:1651`); and (b) the inlined TOP-LEVEL section-style
  schema at `:1827-1850` inside `pageDocumentV2JsonSchema` validating `sections[].style`
  (`additionalProperties:false` `:1830`; last field `fullBleed: booleanSchema` `:1848`).
  Grep the anchor `fullBleed: booleanSchema` (exactly two section-style hits: `:1651`
  partial, `:1848` inlined) to find BOTH — a `radius: numericSchema(0, 64)` grep is
  WRONG (matches the partial `:1637` + the unrelated block schema `:1439`, MISSES the
  inlined mirror `:1836` which uses the expanded `{ type: "number", ... }` form).
  **Section-style normalizer** = `normalizeSectionStyle` (`pageDocumentV2.ts:2488`).
  **`toPageSectionStyle`** (`pageRendererV2.tsx:405`) is the emit seam.
- The BLOCK border precedent is UNIFORM (single edge set): `borderColor` /
  `borderWidth` / `borderStyle` on `PageBlockStyleV2` (`pageDocumentV2.ts:619-621`),
  emitted in `toPageBlockVisualStyle` (`pageRendererV2.tsx:723-749`). 533's SECTION
  border is PER-EDGE (distinct shape) so it does not reuse the block border keys.

**FIX shape (533-02):** add a present-only `PageSectionStyleV2.border?` object with
per-edge `{ top?, bottom?, left?, right? }` each `{ color?: string, width?: number,
style?: enum }` (at minimum top/bottom for `border-block`). Color via
`sanitizeAuthoringCssColor` (through `readOptionalSafeColor`), width via
`readOptionalClampedNumber` (`pageDocumentV2.ts:1997`), style via `normalizeEnum`
against a fixed border-style enum. Emit fixed `border-{edge}-{prop}` declarations in
`toPageSectionStyle`; omit entirely when unauthored.

### RC-3 — timeline dots without an axis line

- **`wrapSectionTemplateBlock`** timeline branch (`pageRendererV2.tsx:2468-2500`):
  each block → `<div … data-page-timeline-item> <span
  data-page-timeline-marker …/> <div data-page-timeline-content>{rendered}</div>
  </div>`. The dot is `h-3 w-3 rounded-full ring-4 ring-white` tinted
  `var(--coderso-section-accent,#0d9488)` (`:2481-2488`). There is NO element
  drawing a continuous line between the dots — the axis is missing.
- **`pageSectionTemplateClass`** timeline branch (`pageRendererV2.tsx:540-544`) sets
  the section content-grid class per variant (`content-start` etc.). The container
  that holds all timeline items is the section content grid (from
  `toPageSectionRenderProps`).

**FIX shape (533-03):** VERIFY (documented above: dots yes, axis no), then ADD the
axis. Two grounded options — pick at implement time: (A) draw the axis as a fixed
absolutely-positioned line element/pseudo on the timeline CONTAINER (mirroring
`.timeline:before`, keyed off `--coderso-section-accent`), OR (B) draw a per-item
connector segment on each `data-page-timeline-item` (a `border-l`/pseudo on the
marker column) so the segments visually join into a continuous axis (more robust to
the section grid structure). Prefer whichever composes with the existing
`grid-cols-[auto_minmax(0,1fr)]` marker column WITHOUT a model field. Keep the
horizontal-variant behavior intact. Optionally upgrade the dot to a glow
(`box-shadow` off accent) to match `.timeline article:before`. Document how to add a
`timeline` section (it is a section TEMPLATE, `pageSectionTemplates.ts:62`, selected
via the section-template picker — surface it if it is not already offered).

### Model / schema / control anchors (verified)

- **`PageSectionStyleV2`** (`pageDocumentV2.ts:534-571`) — add `columnTemplate?:
  string` (533-01) + `border?: PageSectionBorderV2` (533-02) adjacent, in a labelled
  `TASK-533` block. **Section-style allowlist** (inline `assertKnownKeys` array
  `:2495-2514`) — add `"columnTemplate"`, `"border"`. **BOTH section-style JSON
  schema mirrors** — `partialSectionStyleJsonSchema` (`:1629`, append after `fullBleed`
  `:1651`) AND the inlined top-level section-style schema (`:1827-1850`, append after
  `fullBleed` `:1848`); grep `fullBleed: booleanSchema` (two section hits) to land both
  — add both properties to each. **`normalizeSectionStyle`**
  (`:2488`) — normalize both present-only.
- **`PageBlockStyleV2`** (`pageDocumentV2.ts:596-672`) — add `colSpan?: number` /
  `rowSpan?: number` (533-01) adjacent to `column` (`:611`), in a labelled
  `TASK-533` block. **`pageBlockStyleKeys`** (`:746-780`) — append `"colSpan"`,
  `"rowSpan"`. **Block-style JSON schema** (`pageBlockStyleJsonSchema` `:1424`,
  `additionalProperties:false` `:1426`) — add both as `numericSchema`.
  **`normalizeBlockStyle`** (`:2661`) — clamp both via `readOptionalClampedNumber`.
- **Controls** (`pageEditorControlRegistry.ts`): `pageUniversalSectionControls`
  (`:225`) gains `section.style.columnTemplate` (533-01) + section `border` controls
  (533-02, per-edge, mirroring the per-edge block padding/margin control factory
  `:577-602`); `pageUniversalBlockControls` (`:449`) gains `block.style.colSpan` /
  `block.style.rowSpan` (533-01, `input:"number"` mirroring `block.style.column`).
- **Clamps (533 region, `pageDocumentV2.ts`):** `PAGE_SECTION_BLOCK_COLUMN_CLAMP`
  precedent (`:249`-region). Add `PAGE_BLOCK_SPAN_CLAMP {min:1,max:4}` and
  `PAGE_SECTION_BORDER_WIDTH_CLAMP {min:0,max:16}` in a labelled `TASK-533` block.

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 533-01 | Grid row/col SPAN + ASYMMETRIC column ratios (present-only block `colSpan`/`rowSpan` + section `columnTemplate`) | `core/services/pages/pageDocumentV2.ts` **[TASK-533 region: `PageBlockStyleV2` `colSpan`/`rowSpan` + `PageSectionStyleV2` `columnTemplate`; `pageBlockStyleKeys` + section-style allowlist additions; block + section JSON schema additions; block + section normalizer additions; new clamps — seams]**; `core/services/pages/pageRendererV2.tsx` **[TASK-533 region: `toPageBlockRenderProps` span emit `:951-955`; `toPageSectionRenderProps` `columnTemplate` inline `gridTemplateColumns` `:641-650` — seams]**; `core/services/pages/pageEditorControlRegistry.ts` **[TASK-533 region: `block.style.colSpan`/`rowSpan` + `section.style.columnTemplate` controls — seam]**; `core/services/pages/pageAuthoringSanitizers.ts` **[TASK-533 region: `sanitizeAuthoringGridTemplate` — new restricted grid-track sanitizer]** | L01 model+schema+normalize+sanitizer, L02 render emit (span + columnTemplate), L03 controls, L04 tests | 530 |
| 533-02 | Per-edge section border (`border-block`) | `core/services/pages/pageDocumentV2.ts` **[TASK-533 region: `PageSectionStyleV2` `border` + `PageSectionBorderV2` type; section-style allowlist `"border"`; section JSON schema `border` object; `normalizeSectionStyle` border normalize; `PAGE_SECTION_BORDER_WIDTH_CLAMP` — seams, DISJOINT from 533-01's block-style region]**; `core/services/pages/pageRendererV2.tsx` **[TASK-533 region: per-edge border emit on the NORMAL `toPageSectionStyle` content-box return `:441` AND the `toPageSectionBleedStyle` bleed-box return `:480` (full-bleed frame) — NOT the paint-empty full-bleed content-box return `:432`; DISJOINT from 533-01's frame/grid region]**; `core/services/pages/pageEditorControlRegistry.ts` **[TASK-533 region: `section.style.border.*` per-edge controls — DISJOINT id namespace]**; `core/services/pages/pageEditorMutationActions.ts` **[TASK-533 region: route the nested `style.border.*.color` path through `sanitizeAuthoringCssColor` in `sanitizeStyleValue`/`sanitizePageEditorControlValue` — the `[group,key]` destructure otherwise leaves the length-4 path unsanitized in optimistic client state]** | L01 model+schema+normalize, L02 render emit, L03 controls, L04 tests | 533-01 |
| 533-03 | Native timeline vertical axis + dots | `core/services/pages/pageRendererV2.tsx` **[TASK-533 region: `wrapSectionTemplateBlock` timeline branch `:2468-2500` + timeline axis structure/CSS — DISJOINT from 533-01/02 regions]** | L01 verify-then-add axis render, L02 tests | 533-02 |

**Land order (strictly sequential):** 533-01 (grid span + ratio) → 533-02 (section
border) → 533-03 (timeline axis). 01 lands first because it establishes the
`TASK-533` labelled regions + clamps in the shared files that 02 appends to; 02
appends the section-border region (disjoint from 01's block-style + grid region);
03 is renderer-only (disjoint from both). Each reads the CURRENT on-disk state of
the shared files before editing so it builds on, not clobbers, prior 533 land and
any concurrently-merged sibling-bundle land.

## Coordination / collision guards

> **Cross-bundle RECONCILE (531/532/533/534), 2026-07-09 — PASS.** No two bundles add
> the same field name, control id, or CSS token with a different meaning (verified:
> `colSpan`/`rowSpan`/`columnTemplate`/`border` vs 531 `glow`, 532
> `fontSizeCustom`/`textTransform`, 534 `magnetic`/`noiseOverlay`/`switcher`/`scrollHint`
> are all distinct; clamps `PAGE_BLOCK_SPAN_CLAMP`/`PAGE_SECTION_BORDER_WIDTH_CLAMP` and
> all `*.style.*` control ids are unique). Canonical region sigil pinned to
> **`// ── TASK-53x ──`** across all four bundles (this contract was authored with a
> `// --- TASK-533 ---` sigil — treat as equivalent and emit the canonical `// ── TASK-533 ──`
> form when the leaf lands). 533-01 adds ONLY the NEW `sanitizeAuthoringGridTemplate` to
> `pageAuthoringSanitizers.ts` — DISJOINT from 531's sole ownership of that file's
> multi-layer/gradient relaxation. **Serialize note:** 533-02's per-edge `border` emit
> and 531's section-gradient+glow emit BOTH append to the `toPageSectionStyle`
> (`pageRendererV2.tsx:405`) function body; the appends are disjoint labelled regions,
> so a three-way merge is additive, but if 531 and 533 land into the same integration
> branch concurrently expect a trivial adjacent-append merge at that seam (resolve
> both-keep). Append-anchor rule (all four bundles): append each new entry on its OWN
> line inside the labelled region; NEVER rewrite the array's closing `] as const;` line,
> a function's `return` line, or a schema object's closing brace.

- **PARALLEL-BUNDLE ADDITIVITY (531/532/533/534).** 533 keeps EVERY shared-file
  addition inside a clearly-labelled `// --- TASK-533 … ---` region: new fields
  appended at the END of the relevant type block, new allowlist entries appended at
  the END of the array, new schema properties appended at the END of the property
  map, new normalizer branches appended at the END of the normalizer body, new
  controls appended at the END of the control array. NO shared line is rewritten;
  the sibling bundles append their own disjoint regions. This makes three-way merges
  purely additive (no textual conflict beyond trivial adjacent-append hunks).
- **`pageDocumentV2.ts` is shared by 533-01 (block-style + section
  `columnTemplate`) and 533-02 (section `border`) in DISJOINT regions:** 01 owns the
  `PageBlockStyleV2` `colSpan`/`rowSpan` + `pageBlockStyleKeys` + block schema +
  block normalizer, PLUS the section `columnTemplate` (a single string field);
  02 owns the section `border` object (type + allowlist entry + schema object +
  normalizer branch). Land 01 first; 02 reads the on-disk allowlist/normalizer after
  01 and appends.
- **`pageRendererV2.tsx` shared by all three in DISJOINT regions:** 01 =
  `toPageBlockRenderProps` frame span emit (`:951-955`) + `toPageSectionRenderProps`
  `gridTemplateColumns` (`:641-650`); 02 = `toPageSectionStyle` border emit
  (`:405`); 03 = `wrapSectionTemplateBlock` timeline branch (`:2468-2500`). No
  overlap.
- **`pageEditorControlRegistry.ts` shared in DISJOINT id namespaces:** 01 =
  `block.style.colSpan`/`rowSpan` + `section.style.columnTemplate`; 02 =
  `section.style.border.*`. 03 adds no control.
- **NO breaking test expected.** Every 533 field is purely ADDITIVE + present-only;
  existing byte-identity / round-trip / renderer tests pass unchanged. If the
  timeline axis addition (533-03) changes the rendered timeline DOM shape, any
  EXISTING timeline structural assertion in `tests/vitest/pages/page-renderer-v2.test.tsx`
  that pins the OLD (axis-less) node shape is an OWNED rebaseline for 533-03-L02
  (documented there — a declared structural update, not a weakened assertion). 533-03
  MUST grep for existing `data-page-timeline-*` assertions before editing and either
  preserve them (if the axis is additive DOM) or rebaseline them explicitly.
- **`pageAuthoringSanitizers.ts` — 533-01 adds `sanitizeAuthoringGridTemplate`**
  (a NEW restricted grid-track sanitizer) in a labelled `TASK-533` region. It does
  NOT touch `isSafeAuthoringCssGradient` / `isSingleGradientLayer` /
  `sanitizeAuthoringCssBackground` (those are 531's security-critical relaxation
  surface — DISJOINT). Guard: 533 forbidden-paths include the gradient-layer
  functions.
- rg misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use `Read`
  / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog = then-current next-free at closure (grep
  `_docs/_CHANGELOG/` highest+1; `1242` last used).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the pages
write permission) and the SSR render path. The new attacker-influenceable surfaces
are: `colSpan`/`rowSpan` NUMBERS, the `columnTemplate` STRING, and the section
`border` per-edge color STRINGS + width NUMBERS.

1. **`colSpan` / `rowSpan` (bounded numbers, no injection).** Normalized via
   `readOptionalClampedNumber` (`pageDocumentV2.ts:1997`) against
   `PAGE_BLOCK_SPAN_CLAMP {1,4}` + `Math.trunc`. Emitted ONLY as
   `gridColumn: "span N"` / `gridRow: "span N"` where `N` is a bounded integer —
   never a raw author value in a CSS declaration, never markup, never a URL. NaN /
   Infinity / out-of-range clamps (fail-soft).
2. **`columnTemplate` (STRING — sanitizer-gated, the highest-risk surface).** This is
   the ONLY author-controlled STRING reaching a CSS VALUE position
   (`grid-template-columns`), so it MUST go through a NEW restricted sanitizer
   `sanitizeAuthoringGridTemplate` (533-01) that ALLOWLISTS a tiny grid-track
   grammar and REJECTS everything else: accept ONLY a whitespace-separated list of
   tracks where each track matches a strict pattern — a bounded number of tracks
   (≤ e.g. 12), each track one of `<number>fr` | `<number>px` | `<number>%` | `auto`
   | `minmax(<len-or-fr>, <len-or-fr>)` | `repeat(<int>, <len-or-fr>)`, numbers
   bounded and `Number.isFinite`. REJECT any `;`, `}`, `{`, `/*`, `url(`,
   `expression(`, `<`, `\`, backtick, `@`, `:` outside `minmax`/`repeat`, or any
   token not in the grammar → return `null` (omit). This is a strict ALLOWLIST
   (positive validation), NOT a blocklist. On rejection the field is OMITTED
   (present-only fail-soft), never emitted raw. Never interpolate author text into a
   CSS RULE string — it is a single React inline-style `gridTemplateColumns` value,
   which the DOM treats as a value (no rule-injection surface) AND is additionally
   sanitizer-gated.
3. **Section `border` colors via `sanitizeAuthoringCssColor`.** Each per-edge
   `color` is normalized through `readOptionalSafeColor` →
   `sanitizeAuthoringCssColor` (`pageAuthoringSanitizers.ts:93`) at the write
   boundary (the ONLY sanctioned color path). Each `width` via
   `readOptionalClampedNumber` against `PAGE_SECTION_BORDER_WIDTH_CLAMP {0,16}`.
   Each `style` via `normalizeEnum` against a fixed border-style enum. Emitted as
   fixed `border-{edge}-color/-width/-style` declarations — no raw author value in a
   free CSS position.
4. **Present-only + reject-unknown (fail-closed READ trap).** Every new key
   (`colSpan`, `rowSpan`, `columnTemplate`, `border`) joins its allowlist
   (`pageBlockStyleKeys` / the inline section-style key array) AND the matching
   `additionalProperties:false` JSON schema in lockstep, and ships a round-trip test.
   A forgotten allowlist entry would silently degrade every stored doc carrying the
   key to empty on read. Unset → the key is OMITTED (never `null`, never `0`/`""`
   -as-present) so no-effect docs stay byte-identical.
5. **Timeline axis (533-03) introduces NO author-controlled value** — the axis is
   fixed render structure/CSS keyed off the already-sanitized
   `--coderso-section-accent`. No new field, no new attacker surface.

## Hard Invariants

1. **Present-only** — `colSpan`, `rowSpan`, `columnTemplate`, and section `border`
   emit ZERO bytes when unauthored; legacy / no-effect docs normalize + render
   byte-identical to post-530. A block with no span + a section with no
   `columnTemplate`/`border` produce identical normalized JSON + HTML.
2. **Additive-merge discipline** — every shared-file change is an APPENDED
   `TASK-533` region; no shared line rewritten, so 531/532/534 merge additively.
3. **No new npm dependency** (`core/package.json` unchanged).
4. **No DB migration / no DDL** — new fields on existing `section.style` /
   `block.style` jsonb.
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:29` stays `2`).
6. **`columnTemplate` is strict-allowlist-sanitized** (`sanitizeAuthoringGridTemplate`);
   rejection → OMIT (never emit raw). It is the only author STRING reaching a CSS
   value position and is the security focus of 533.
7. **Numbers only via `readOptionalClampedNumber`** (`colSpan`/`rowSpan`/border
   `width`), colors only via `sanitizeAuthoringCssColor` (border `color`).
8. **Reject-unknown + fail-soft** — new fields join their allowlist + one normalizer
   + a round-trip test; out-of-range numbers / bad grid strings clamp/omit (soft);
   an unknown KEY rejects (`PageDocumentError`).
9. **Timeline axis is additive DOM** — 533-03 adds an axis element/CSS without
   removing the existing `data-page-timeline-item/marker/content` hooks; any existing
   timeline structural test is preserved or explicitly rebaselined (owned by
   533-03-L02).

## Acceptance Criteria (measured LIVE vs the reference — ≥5 real-flow scenarios per area)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effect (computed styles, geometry,
DOM/attribute state), side-by-side with the reference wow-site
(`_docs/projekty-domow-wow-site/`).

1. **Asymmetric column ratio.** A 2-column section with
   `style.columnTemplate:"1.15fr .85fr"` paints its content grid with computed
   `grid-template-columns` where track 1 ≈ 1.35× track 2 (matching `.project-grid`);
   `"1fr 1.2fr"` reproduces `.intro-strip-grid`. Unset → symmetric `grid-cols-N`
   byte-identical.
2. **Block row/col span.** A block with `style.rowSpan:2` inside a grid section
   spans two rows (computed `grid-row: span 2`, rendered ~2× the row height of its
   siblings — reproduces `.project-card.large`); `colSpan:2` spans two columns
   (`grid-column: span 2`). Unset → no `gridRow`/`gridColumn`, byte-identical.
3. **Per-edge section border (border-block).** A section with
   `style.border:{top:{color:"#fff2",width:1},bottom:{color:"#fff2",width:1}}`
   paints a 1px top + 1px bottom hairline (computed `border-top-width:1px` +
   `border-bottom-width:1px`, no left/right) — matching `.intro-strip`'s
   `border-block`. A four-edge border draws all four; unset → no border,
   byte-identical.
4. **Native timeline axis + dots.** A `timeline` section with 3+ blocks renders a
   continuous vertical axis line connecting the dots (an element with a visible
   non-zero-height vertical rule tinted off the section accent) with a glow dot per
   item (`data-page-timeline-marker` present + a computed box-shadow/ring) —
   matching `.timeline:before` + `.timeline article:before`. The horizontal variant
   still renders (no regression).
5. **Present-only + no-effect byte-identity (whole doc).** A page with no `colSpan`/
   `rowSpan`/`columnTemplate`/`border` and no `timeline` section produces normalized
   JSON + rendered HTML byte-identical to the post-530 output.
6. **Override/reset cycle.** Setting then clearing `columnTemplate` / span / border
   in the editor returns the section/block to the symmetric/border-less baseline
   (control fallback shows unset; normalized doc omits the key).
7. **Security negatives.** `columnTemplate:"1fr;} body{display:none}"` /
   `"url(evil)"` / `"expression(alert(1))"` / `"repeat(999,1fr)"` →
   `sanitizeAuthoringGridTemplate` REJECTS → the key is OMITTED (no raw value in
   `grid-template-columns`, no rule injection); `rowSpan:NaN` / `1e9` / `-3` →
   `readOptionalClampedNumber` clamps or omits; a bad border `color` (`"javascript:"`
   / `"url(x)"`) is dropped by `sanitizeAuthoringCssColor`; an unknown block-style /
   section-style key still throws `PageDocumentError`; the stored doc round-trips
   with the clamped/omitted values.
8. **Reference reproduction (side-by-side).** The intro strip (1/1.2fr + top/bottom
   hairline), the realizacje grid (1.15/.85fr with the Aurora card row-spanning 2),
   and a native timeline with a visible aqua axis match the reference visually
   (light + dark), replacing the workarounds catalogued in `_TMP-cms-ograniczenia.md`
   (§55/§88/§109/§120).

## Definition of done

All three subtasks landed in order; a section can express an asymmetric column ratio
via a strict-sanitized `columnTemplate`; a block can span rows/columns via
present-only clamped `colSpan`/`rowSpan`; a section can draw a per-edge
(`border-block` minimum) border via `sanitizeAuthoringCssColor` colors + clamped
widths; the native `timeline` section renders a continuous vertical axis with glow
dots (verified: dots existed, axis added) and is discoverable; all present-only,
reject-unknown, fail-soft, additive to PageDocumentV2 in labelled `TASK-533` regions
so 531/532/534 merge additively; no npm dependency, no migration, no schemaVersion
bump, no route; legacy / no-effect docs byte-identical; Security Contract satisfied
(`columnTemplate` via the new `sanitizeAuthoringGridTemplate` strict allowlist,
spans/widths via `readOptionalClampedNumber`, border colors via
`sanitizeAuthoringCssColor`, timeline axis is fixed structure); every gate green
(root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`, `bun --cwd core
lint`, vitest pages, `bun test`, `gates:coderso`); ≥5-scenario-per-area
`playwright-cli` smoke passes light + dark with 0 console errors side-by-side vs the
reference; closure documented under the then-current next-free changelog (grep
`_docs/_CHANGELOG/` highest+1). `PAGE_MODEL.md` / `DESIGN_TOKENS.md` synced by the
closure subtask.
