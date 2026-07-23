# TASK-539: Page V2 Post-Audit Remediation II

# FileName: TASK-539_Page_V2_Post_Audit_Remediation_II.md

**Priority:** High
**Category:** Pages / Builder / Public Render / Responsive CSS / Runtime / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-521–535, TASK-538, TASK-541; TASK-540 must be fully terminal before implementation; collision dependencies TASK-478/TASK-481
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at implementation closure)
**Contract Repair:** 2026-07-23 — refreshed against current source, tests, repository rules, and the active TASK-540 state

---

## Overview

TASK-535 remains closed. This family owns only residuals revealed by the later
repository/runtime audit: dead responsive controls, shallow nested-layer merging,
strict-gallery gaps, unsafe/invalid CSS grammar edges, transform clobbering,
incomplete render hooks/geometry, and page-runtime initialization that misses a
later footer document.

All model additions/corrections are JSONB-only and schema version 2 remains
unchanged. No endpoint, DDL, dependency, or new product primitive is introduced.
Optional fields remain present-only. Absent values and already-canonical no-effect/
no-override documents keep their normalized JSON and rendered bytes unchanged.
Authored colors that TASK-541 accepts in a noncanonical spelling are deliberately
reconstructed to canonical bytes; this is not a byte-identity promise for arbitrary
legacy color input.

Implementation is blocked until TASK-540 is `✅ Done`, every physical TASK-540
descendant is terminal, changelog 1252 exists, and the task/changelog indexes are
synchronized. Because TASK-540 is still active while this contract is repaired, the
TASK-539 orchestrator must run a fresh read-only pre-implementation audit against the
post-TASK-540 HEAD and complete dirty status before any source edit.

## Mandatory modularity invariant

Several current Page production and test files already exceed the repository's
1,000-physical-line ceiling. The leaf that owns the final behavior change also owns
the cohesive split of its legacy source/test files; a preliminary split leaf may not
create a second writer. Stable public import paths become explicit compatibility
facades—never `export *` dumping grounds—and preserve public runtime reference
identity. Every resulting human-authored production and test file must be at most
1,000 physical lines.

The implementation workflow captures the verified pre-TASK-539 baseline and checks
the union of every production/test path changed from that baseline through the final
working tree, including paths committed at intermediate checkpoints. A result above
1,000 is a failed leaf/family gate and is never eligible for TASK-9999 deferral.

## Shared contracts fixed by this family

- `mergePageBlockLayerPresentKeys` performs present-key deep merge for only the
  nested `layer` record and is the one owner used by preview and public CSS.
  Responsive `layer.anchor` is base-only: a write rejects it at the exact path,
  stored read removes only it, and the responsive schema exposes only `x/y/z`.
- The model owner defines `PageSectionResponsiveStyleV2` and
  `PageBlockResponsiveStyleV2` as dedicated `Partial<Omit<...>>` contracts with
  every excluded member restored as optional `never`; the stable Page facade
  explicitly re-exports them, and responsive editor/CSS consumers use them instead
  of a broad base style. Their strict schemas and normalizers reject/drop structural
  base-only keys instead of storing silent public no-ops. Section responsive style excludes
  `scrollEffect`, `parallaxIntensity`, `surfacePreset`, `composition`, `fullBleed`,
  `noiseOverlay`, `columnTemplate`, and `border`. Block responsive style excludes
  `decoration`, `tilt`, `tiltGlare`, `surfacePreset`, `hoverEffect`, `marquee`,
  `composition`, `revealDelay`, and `magnetic`. Fresh writes reject the exact key;
  stored reads drop only that key and retain valid siblings. Structural
  `block.style.column` remains the one intentional schema-valid exception and public
  CSS emits its exact `not_css_expressible` diagnostic.
- Gallery writes accept only `{src,alt,caption,category?}`. `src` is bounded to
  2,048 characters, `alt` to 500, `caption` to 2,000, and the schema, model,
  controls, and tests import the same exported owners. Fresh writes require
  canonical trimmed scalar bytes; stored reads alone trim/cap legacy values and use
  the fixed alias precedence `src > url > image > assetUrl`, `alt > title > ""`,
  and `caption > title > label > name > description > ""`. Unknown nested keys
  and legacy aliases on fresh writes use `page_document_unknown_field` at the exact
  nested path; malformed/missing/unsafe/over-limit values use
  `page_document_invalid`. Stored read alone adapts legacy aliases. The exact
  `{src:"",alt:"",caption:""}` draft sentinel is canonical and persistent, counts
  toward the 120-item bound, and emits no public node until it has media or caption.
- `parseAuthoringCssBackgroundPaint` returns separate gradient image layers and
  an optional canonical final color. After validation, its `image` member preserves
  the exact trimmed source substring/spelling of the image-layer stack (including
  internal comma whitespace); only the final color is canonicalized. Consumers emit
  the image stack only to `background-image` and the final color only to
  `background-color`. When a combined representation is needed it is reconstructed
  from that validated image substring plus canonical color, never from an unparsed
  whole author string.
- TASK-541's `parseCssColorValue(..., "authoring")` is the semantic owner for
  single colors. Page applies its existing second allowlist afterward: only
  `var(--color-primary|secondary|accent|bg|surface|text|border)` tokens are
  accepted. The exported Page adapters `sanitizeAuthoringCssColor` and
  `isSafeAuthoringCssColor`, plus the final-color branch of the background-paint
  parser, all delegate the untouched raw color input through that same owner and
  Page filter. TASK-539 may not recreate a color grammar or widen token names.
  Color canonicalization never reconstructs a validated image-layer stack: its
  exact outer-trimmed source substring remains byte-identical.
- Unitless grid lengths accept only zero; nonzero values require an allowlisted
  CSS unit. Before trimming/tokenizing, the grid and background boundaries reject
  every C0/C1 control and every Unicode/ECMAScript whitespace code point other than
  ASCII space, including `U+FEFF`.
- `resolvePageBlockGridPlacement(section, blockPath, { includeHiddenBlocks })` and
  `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` live only in
  `pageBlockGridPlacement.ts`. They classify a block as `block-frame`,
  `section-template-wrapper`, or `none` against the consumer's exact rendered-root
  policy: Admin passes `true`, public renderer passes its real
  `context.includeHiddenBlocks`, and responsive CSS passes `false`.
- Gallery `items/layout/filterable/filterCategories` and divider
  `tone/thickness/gradient/width/align` are base-only because public responsive
  props support only heading/text alignment. For every base-only control, desktop/
  base owns visibility input, displayed value, auxiliary fields/defaults, shell,
  override badge/reset, commit, and mutation even while tablet/mobile is active; a
  legacy device override is neither displayed nor reset from that field. Media URL
  selection is URL-not-ID, clears to `null`, and invalidates stale async resolution
  on value, target-scope, callback-target, and unmount changes. Canvas rail clearance
  is absent below `sm` and reasserted with property-specific right padding at both
  `sm` and `lg`.
- The renderer uses one fixed present-only transform-host formula with independently
  owned `--cx-*` channels for reveal, decoration, hover, tilt, and magnetic. Every
  transform-bearing decoration (`float`, `drift`, `pulse`, and `orbit`) writes only
  the shared decoration channel; `radiate` retains its independent box-shadow
  behavior. The same host hook is stamped on decorative ambient orbs so their
  variables have a visual consumer; layer anchoring remains on the independent
  `translate` property.
- `marquee.seamless === true` renders one rail with two equal adjacent segments only
  when every child subtree is replica-safe. The recursive safety predicate rejects
  `video`, `form`, `collection`, `filters`, `embed`, and any descendant group with
  authored marquee settings. An unsafe subtree deterministically uses the ordinary
  one-segment path, so scripts, nonces, public-write/listing runtimes, live embeds/
  video, and nested marquee identities are never duplicated. A safe replica is
  `aria-hidden` and `inert`; `inert`, rather than an impossible post-render rewrite
  of opaque descendants, owns focus suppression. Its locally resolved IDs,
  `htmlFor`, whitespace-token IDREFs (`aria-labelledby`, `aria-describedby`,
  `aria-controls`), local `href`/`xlinkHref` fragments, SVG `url(#...)` references,
  and renderer-owned block/slot/runtime hooks are deterministically namespaced.
  `PAGE_MARQUEE_REPLICA_ATTRIBUTE` and its selector are fixed shared literals owned
  by `pageCompositionEffects.tsx`; renderer and runtime import them. False/absent
  seamless and unsafe seamless each render one segment and no replica.
- `pageRendererTimelineGeometry.ts` owns and exports
  `PageTimelineItemGeometry` plus
  `resolvePageTimelineItemGeometry(section,template,index,total)`; the renderer
  consumes that helper and the focused geometry suite imports the owner directly.
- A shared global initializer rescans the supplied root/document on every emitted
  script and uses per-element ownership (`WeakSet` or equivalent); it deduplicates
  listeners without blocking later footer discovery.

## Security Contract

- **Routes:** no new route. Existing `/admin/api/*` Page writes/previews stay
  internal and session-cookie-only. Create, update, and autosave require
  `content:write`; publish requires `content:publish`; session writes require
  `X-CSRF-Token`; the rate-limit bucket is `admin_write`; and PageDocumentV2
  validation rejects unknown fields. Public Page rendering remains read-only.
  TASK-539 does not invent an API-key auth path.
- **CSS/markup:** grid/background/color/category values use positive allowlists
  at write and render. Responsive raw `<style>` emission revalidates the same
  parsed value and never interpolates an unvalidated author string.
- **Runtime:** emitted scripts are static literals, use no `eval`, `Function`, or
  user-data `innerHTML`, and preserve reduced-motion/pointer gates. Replica-unsafe
  subtrees stay single-copy, including the nonce-bearing public form surface.
- **Anti-abuse:** no public write is added; nonce/captcha do not apply.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-539-01 | Page model, schema, and normalization | TASK-539-01-L01, L02 | ⏳ To Do |
| TASK-539-02 | Grid and background sanitizer corrections | TASK-539-02-L01, L02 | ⏳ To Do |
| TASK-539-03 | Gallery controls, gating, shared placement, and responsive canvas | TASK-539-03-L01..L05 | ⏳ To Do |
| TASK-539-04 | Independent transform channels | TASK-539-04-L01, L02 | ⏳ To Do |
| TASK-539-05 | Renderer behavior and geometry corrections | TASK-539-05-L01, L02 | ⏳ To Do |
| TASK-539-06 | Responsive CSS parity | TASK-539-06-L01, L02 | ⏳ To Do |
| TASK-539-07 | Per-root idempotent effects runtime | TASK-539-07-L01, L02 | ⏳ To Do |
| TASK-539-08 | Tests, docs, smoke, and closure | TASK-539-08-L01 | ⏳ To Do |

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| H-05 magnetic hook missing; H-06 footer not initialized | 539-04/L01 + 539-05/L01 + 539-07/L01 | rendered-document selector test and main+footer real interaction |
| H-07 responsive custom font/transform; H-08 spans | 539-03/L05 + 539-05/L01 + 539-06/L01 | one placement result, emitted media CSS, and computed desktop/mobile styles/geometry |
| H-09 gallery authoring; M-18 loose item schema | 539-01/L01 + 539-03/L01..L04 + 539-05/L01 | strict round-trip/reject and author→filter flow |
| M-06 shallow `layer` merge; M-11 z clamp | 539-01/L01 + 539-03/L01 + 539-06/L01 | base+partial device merge and 0..20 UI/model parity |
| M-07/M-08 transform collisions | 539-04/L01 + 539-05/L01 + 539-07/L01 | combined reveal+hover+drift+tilt+magnetic+layer computed transforms |
| M-09 marquee; M-10 glow pointer events | 539-04/L01 + 539-05/L01 | single-rail geometry, safe-replica identity/inert isolation, unsafe-subtree fallback, and click-through |
| M-12 shrink-to-fit; M-17 timeline endpoint | 539-05/L01 | bounding-box geometry assertions |
| M-13 responsive full-bleed paint; M-14 color as image | 539-02/L01 + 539-05/L01 + 539-06/L01 | split paint and 100vw breakpoint geometry |
| M-15 divider no-op; M-16 unitless grid | 539-01/L01 + 539-02/L01 + 539-03/L01 + 539-05/L02 | stale-prop cleanup, gating, existing-renderer regression, and sanitizer corpus |
| L-01 false cursor residue; L-02 orphan parallax intensity | 539-01/L01 + 539-03/L01 | byte identity and visibility/normalization tests |
| II-M-01 Page fixed rail clearance | 539-03/L03 + L04 | 320/390/480 px usable canvas geometry |

## Single-writer order and collision guards

Land strictly:

```text
539-01-L01 -> 539-01-L02 ->
539-02-L01 -> 539-02-L02 ->
539-03-L05 -> 539-03-L01 -> 539-03-L02 -> 539-03-L03 -> 539-03-L04 ->
539-04-L01 -> 539-04-L02 ->
539-05-L01 -> 539-05-L02 ->
539-06-L01 -> 539-06-L02 ->
539-07-L01 -> 539-07-L02 ->
539-08-L01
```

Each production/test path has exactly one writer leaf. Source-owner leaves perform
their mandatory cohesive splits before behavior edits and update their own
compatibility suites. Later proof leaves create new additive task-specific suites;
they do not reopen or rebaseline a source owner's test files. Consumer helper names
must match the owning model/sanitizer/placement/composition leaf exactly.

TASK-539 lands after TASK-540 and before TASK-542 in the audited remediation dependency
map. It consumes the completed TASK-538 renderer seam and landed TASK-541 color
contract directly. A nonterminal TASK-540, missing changelog 1252, unsynchronized
TASK-540 graph, or stale post-TASK-540 audit is a hard start blocker.

TASK-539 does not run in-place while TASK-478 or TASK-481 is active. Forbidden
foreign paths are copied exactly into every implementation dispatch from those
tasks' current ownership lists. Use an isolated worktree or land after both,
rebase/read the current files, and rerun the contract audit. TASK-539 fixes its
narrow canvas locally in `PageEditor.tsx` and must not edit TASK-540's
`CanvasEditor.tsx`, `ScreenAuthoringCanvas.tsx`, or Custom Screen paths.
TASK-542 overlaps site-shell behavior/tests; TASK-539 lands first and the streams never
run in parallel.

The concurrent TASK-548 contract stream is read-only to TASK-539. Its explicit
forbidden paths are `_docs/_TASKS/TASK-548*.md`,
`_docs/_workflows/task-548-*.mjs`, `_docs/_CHANGELOG/1261-*`, the changelog-1261
index row, the TASK-548 board row/statistics bytes, `_docs/SECURITY_SPEC.md`, and
`docs/guide/screens/page-editor-preview-settings-and-history.md`. The last two are
future shared writer paths owned by TASK-548-07-L01 and TASK-548-06-L01 respectively.
TASK-539 lands those two documentation deltas before either TASK-548 writer starts;
the task board records the reciprocal order
`TASK-539-08-L01 → TASK-548-06-L01/TASK-548-07-L01`. Both writer statuses must still
be `⏳ To Do` immediately before TASK-539's shared-doc edit. If either has started,
TASK-539 does not race it: documentation and closure are hard-blocked pending a new
explicit cross-family coordination contract. After TASK-539 lands, TASK-548 consumes
the current bytes and owns its own compiler/report/coverage sequence.
Before implementation, copy TASK-548's exact then-live source/test ownership paths
into dispatch collision guards. Closure reads both shared indexes fresh, preserves
every foreign TASK-548 byte, and recomputes statistics from the complete live task
tree rather than applying a hard-coded delta.

The orchestrator owns `_docs/_workflows/task-539-fix.mjs` for this contract repair.
Before source implementation it authors the sole live
`_docs/_workflows/task-539-implement.mjs`, which captures the post-TASK-540 baseline,
enforces this exact land order/single-writer matrix, runs the family line gate, rejects
missing audit results, and coordinates post-audit/smoke/closure. Agents do not commit.

## Testing Requirements

- Every source leaf updates or creates the behavior tests needed by its own targeted
  gate before running that gate. Later proof leaves add only their newly named
  cross-contract/property suites; they must not defer or rebaseline a source-owner
  expectation.
- `bun --cwd core lint:types` and `bun --cwd core lint` after every source leaf.
- Every leaf runs the implementation workflow's baseline-to-current touched-file line
  gate; every resulting production/test file must be `<=1000`.
- Targeted Page model/sanitizer/composition/renderer/responsive/runtime/control/UI
  Vitest suites; targeted Bun page/site-shell runtime suites where real runtime
  behavior is involved.
- Registered `tests/integration/routes/pages.test.ts` coverage for canonical gallery
  round-trip, nested reject-unknown 400/no-persistence, and error mapping.
- Final aggregate validation includes both builds, the full Bun+Vitest run, Vitest
  coverage, `precommit:check`, Coderso gates, strict security scan, workflow checks,
  family line receipt, and `git diff --check`; targeted gates remain mandatory.
- About five independent post-audit lenses and the exact changed tests again.
- At least nine real Playwright flows: deep gallery/filter, magnetic/reduced
  motion, main+footer runtime, all transform effects combined, device typography+
  spans including all placement classes and a legal maximum-depth nested path,
  responsive full-bleed/background, safe marquee identity/geometry plus unsafe
  form/listing fallback, glow/timeline click-through/geometry, and narrow Page editor.
  Assert computed styles, geometry, DOM/ARIA state, light/dark, and zero console
  errors.

## Documentation Updates Required

Update `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_SPEC.md`,
`docs/develop/content-and-widgets.md`,
and `docs/guide/screens/page-editor-preview-settings-and-history.md`. These five
files are the exhaustive documentation ownership for TASK-539. At closure create
changelog 1251, enumerate the parent, all 8 children, and all 18 leaves in its task
coverage, and close all descendants without reopening TASK-535.

No HIGH or MEDIUM may be deferred. A LOW may be deferred only by linking a concrete
execution-ready TASK-9999 leaf and proving zero current UI/UX/accessibility, data,
security, privacy, auth/RBAC/API, persistence/migration, performance, reliability,
and test-integrity impact in both files. Line-limit, dependency, skipped-test, docs,
smoke, gate, or audit failures are never eligible.
