# 1247 - TASK-533 Layout — Grid Row/Col Span, Asymmetric Column Ratios, Per-Edge Section Border & Native Timeline Axis

Date: 2026-07-09
Version: Unreleased
Tasks: TASK-533, TASK-533-01, TASK-533-01-L01, TASK-533-01-L02, TASK-533-01-L03, TASK-533-01-L04, TASK-533-02, TASK-533-02-L01, TASK-533-02-L02, TASK-533-02-L03, TASK-533-02-L04, TASK-533-03, TASK-533-03-L01, TASK-533-03-L02

## Key Changes

Three layout-fidelity gaps catalogued in the owner's CMS-limitations report, all on
Page v2 and all **present-only / jsonb-only**: NO npm dependency, NO DB migration/DDL,
NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO route/RBAC change. Every path a
page without the new fields (and no `timeline` section) touches normalizes AND renders
**byte-identical** to post-530. All additions live in labelled `// ── TASK-533 ──`
regions inside the shared page files so the sibling bundles (531/532/534) merge
additively. Bundle C of the SHARED-SEAMS 531–534 program.

### Gap 1 — grid span + asymmetric column ratio (533-01)

- **Block `colSpan?` / `rowSpan?` (`pageDocumentV2.ts`).** Present-only clamped
  integers (`readOptionalClampedNumber` + `Math.trunc` against `PAGE_BLOCK_SPAN_CLAMP =
  { min: 1, max: 4 }`; NaN/Infinity/out-of-range fail-soft) on `PageBlockStyleV2`. Emit
  ONLY `gridColumn: "span N"` / `gridRow: "span N"` on the block FRAME
  (`toPageBlockRenderProps`, `pageRendererV2.tsx`) — never a raw author value in a CSS
  declaration/markup/URL. Reproduces the reference `.project-card.large{grid-row:span 2}`.
  Emitted ONLY on the auto-flow grid path; SUPPRESSED for a block inside a per-column
  composition (the parent owns track placement), so span cannot fight explicit column
  placement. Joins `pageBlockStyleKeys` + `pageBlockStyleJsonSchema`
  (`additionalProperties:false`), reject-unknown + round-trip tested.
- **Section `columnTemplate?` (`pageDocumentV2.ts`).** A restricted
  `grid-template-columns` string (e.g. `"1.15fr .85fr"`, `"1fr 1.2fr"`,
  `"minmax(0,1fr) minmax(420px,.9fr)"`) on `PageSectionStyleV2` that, when set,
  OVERRIDES the symmetric `pageSectionGridClass(columns)` with an inline
  `gridTemplateColumns` on the content grid (`toPageSectionRenderProps`), reproducing the
  intro (1/1.2fr) and realizacje (1.15/.85fr) ratios. Joins the section `assertKnownKeys`
  allowlist + BOTH `additionalProperties:false` section-style JSON schema mirrors (the
  per-breakpoint `partialSectionStyleJsonSchema` AND the inlined top-level section
  schema). Present-only: unset ⇒ symmetric `grid-cols-N`, byte-identical.

### SECURITY-CRITICAL — restricted grid-template sanitizer (`pageAuthoringSanitizers.ts`)

`columnTemplate` is the ONLY author-controlled STRING reaching a CSS VALUE position, so
it goes through the NEW strict-ALLOWLIST (positive-validation) sanitizer
`sanitizeAuthoringGridTemplate`, DISJOINT from the 531 gradient/multi-layer surface (does
NOT touch `isSafeAuthoringCssGradient` / `isSingleGradientLayer` /
`sanitizeAuthoringCssBackground`). It fails CLOSED (rejection ⇒ the field is OMITTED,
present-only fail-soft — never emitted raw):

1. length cap (≤ 200) then an up-front metacharacter reject —
   `;{}\<>@` backtick, `/*`, `url(`, `expression(`, and any `:` NOT inside a function's
   parens (`:(?![^()]*\))`);
2. a paren-depth-aware TOP-LEVEL whitespace tokenizer so `minmax(0, 1fr)` / `repeat(3,
   1fr)` (the canonical spaced reference/devtools form) stay ONE track instead of being
   shredded;
3. `GRID_MAX_TRACKS = 12` cap; each track must match a tiny grammar
   (`<num>fr|px|%|rem|em` with a leading-dot decimal allowed, `auto`,
   `minmax(min,max)`, `repeat(<int>,…)`);
4. `minmax()`/`repeat()` INNER tokens re-validated against a bounded finite-length
   pattern (`repeat` count `GRID_MAX_REPEAT = 12` — rejects `repeat(999,1fr)`);
5. re-emitted in a CANONICAL no-inner-space form (stable output regardless of author
   spacing).

It is a single React inline-style `gridTemplateColumns` VALUE (no CSS-rule
interpolation, no rule-injection surface) AND additionally sanitizer-gated. Curated
`pageColumnTemplatePresets` back the "Column ratio" control (each round-trips unchanged).

### Gap 2 — per-edge section border / `border-block` (533-02)

- **Section `border?: PageSectionBorderV2` (`pageDocumentV2.ts`).** A per-edge border
  (`{ top?, right?, bottom?, left? }`, each `{ color?, width?, style? }`), at minimum
  top+bottom for the reference `border-block` (`.intro-strip{border-block:1px solid
  rgba(255,255,255,.1)}`), full four-edge supported. Each `color` via
  `sanitizeAuthoringCssColor` (through `readOptionalSafeColor`) — the sole sanctioned
  color path; each `width` clamped `PAGE_SECTION_BORDER_WIDTH_CLAMP = { min: 0, max: 16 }`
  px via `readOptionalClampedNumber`; each `style` `normalizeEnum`-validated against the
  fixed border-style enum. Present-only: whole-object omitted when no edge is authored ⇒
  byte-identical. Joins the section `assertKnownKeys` allowlist + BOTH
  `additionalProperties:false` section-style JSON schema mirrors + the border normalizer.
- **Render (`pageRendererV2.tsx`).** Emits fixed `border-{edge}-color/-width/-style`
  declarations on the NORMAL content box AND, for a full-bleed section, on the `100vw`
  bleed box — NOT the paint-empty full-bleed content box; never a raw author value in a
  free CSS position.
- **Editor client guard (`pageEditorMutationActions.ts`).** The nested length-4
  `style.border.<edge>.color` optimistic-preview override path is routed through
  `sanitizeAuthoringCssColor` (the `[group,key]` destructure would otherwise leave it
  unsanitized in optimistic client state).

### Gap 3 — native timeline vertical axis + glow dots (533-03)

- **`wrapSectionTemplateBlock` timeline branch (`pageRendererV2.tsx`).** The native
  `timeline` section delivered the DOTS but NO connecting axis line. Added (VERTICAL
  variants `default`/`compact`) a CONTINUOUS vertical axis — a per-item connector segment
  (`data-page-timeline-axis` / `data-page-timeline-axis-line`) hoisted into the `relative`
  item box, spanning its FULL height (`inset-y-0`, so the item's own vertical padding is
  INSIDE the segment — no intra-item break), bleeding its bottom by exactly the section
  content row gap so segment N reaches segment N+1's top, with the LAST item ending flush
  at its dot (`bottom:0`, no overshoot). Reproduces `.timeline:before` (aqua→fade rule);
  the dot gains a `box-shadow` glow off the accent (`.timeline article:before`). ADDITIVE
  DOM — the existing `data-page-timeline-item/marker/content` hooks are RETAINED; the
  `horizontal` variant is UNCHANGED (no regression). NO model field, NO author-controlled
  value: axis/dot are fixed structure tinted off the already-sanitized
  `--coderso-section-accent` (the bleed offset is the clamped numeric section gap). The
  `timeline` section is authored via the section-template picker.

### Audit-remediation pass (2026-07-09)

- Tightened the block span so it is emitted ONLY on the auto-flow grid path and
  SUPPRESSED inside per-column composition (a span could otherwise fight explicit column
  placement).
- Hoisted the timeline axis from a marker-column dot-row span (which bridged only the
  24px grid gap and left a ~24px break at each item's own py padding) to a FULL-height
  per-item segment, so the rule is truly continuous.

## Security

No new route, RBAC bucket, method, or endpoint — all additions ride the existing
validated Page v2 `document` write path + SSR render path. `columnTemplate` via the new
`sanitizeAuthoringGridTemplate` strict allowlist (rejection ⇒ omit); `colSpan`/`rowSpan`
and border `width` via `readOptionalClampedNumber` (bounded ints/`px`); border `color`
via `sanitizeAuthoringCssColor`; the timeline axis is fixed structure off the
already-sanitized accent. Present-only + reject-unknown fail-closed READ trap (each new
key joins its allowlist AND the matching `additionalProperties:false` schema in lockstep
+ a round-trip test).

## Tests

`page-authoring-sanitizers` (grid-template allowlist + negatives), `page-document-v2`
(model/schema/normalize round-trip + clamps + present-only byte-identity),
`page-editor-control-registry` (column-ratio / span / per-edge border controls),
`page-renderer-v2` (span emit + suppression, `columnTemplate` override, per-edge border
on content + bleed box, timeline axis DOM).

## Docs

`PAGE_MODEL.md` synced — block `colSpan`/`rowSpan`, section `columnTemplate` +
`sanitizeAuthoringGridTemplate` grammar, per-edge `border`, and the native timeline
vertical axis. `DESIGN_TOKENS.md` unchanged (533 introduces no design token; the axis
reuses the existing `--coderso-section-accent`).

## Gates

All green: core lint, `bun --cwd core lint:types`, root `tsc -p tsconfig.json --noEmit`,
`test:bun` (1495 pass / 1 skip / 0 fail), `test:vitest` (broad `tests/vitest/pages/`
23 files 667/667, incl. the 4 changed pages suites), `gates:coderso` 5/5
(functional/ux/performance/security/reliability). Live ≥5-per-area light+dark Playwright
smoke deferred to the orchestrator post-merge (the dev host serves the MAIN tree).
