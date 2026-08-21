# 1318. Page V2 Post-Audit Remediation II (TASK-539)

**Date:** 2026-08-20
**Version:** 0.1.0
**Tasks:** TASK-539 (TASK-539-01, TASK-539-02, TASK-539-03, TASK-539-04, TASK-539-05,
TASK-539-06, TASK-539-07, TASK-539-08; 19 executable leaves: TASK-539-01-L01,
TASK-539-01-L02, TASK-539-02-L01, TASK-539-02-L02, TASK-539-02-L03,
TASK-539-03-L01, TASK-539-03-L02, TASK-539-03-L03, TASK-539-03-L04,
TASK-539-03-L05, TASK-539-04-L01, TASK-539-04-L02, TASK-539-05-L01,
TASK-539-05-L02, TASK-539-06-L01, TASK-539-06-L02, TASK-539-07-L01,
TASK-539-07-L02, TASK-539-08-L01)

---

## 🚀 Key Changes

### Page model, schema, and normalization (TASK-539-01)

- **Deep present-key layer merge.** `mergePageBlockLayerPresentKeys` performs a
  present-key deep merge for only the nested `layer` record and is the single
  owner used by both preview and public CSS. Responsive `layer.anchor` is
  base-only: fresh writes reject it at the exact path, stored reads remove only
  it, and the responsive schema exposes only `x/y/z`.
- **Stable facade freeze.** `pageDocumentV2.ts` keeps its grounded baseline of
  exactly 74 types + 125 runtime exports and adds exactly 4 named types + 8
  named runtime values (final surface 78 types + 133 runtime values). The
  source-owner facade suite pins the full type/value owner map, rejects direct
  declarations/default/export-star/duplicates, and proves every facade/direct
  export is reference-identical.
- **Strict gallery contract.** Gallery items accept only
  `{src, alt, caption, category?}` with bounded lengths; fresh writes require
  canonical trimmed scalars, unknown nested keys and legacy aliases map to
  `page_document_unknown_field` at the exact nested path, and stored reads alone
  adapt legacy aliases with fixed precedence.
- **Strict responsive style contracts.** `PageSectionResponsiveStyleV2` /
  `PageBlockResponsiveStyleV2` are dedicated `Partial<Omit<...>>` types whose
  strict schemas/normalizers reject or drop structural base-only keys instead of
  storing silent public no-ops.

### Grid and background sanitizer corrections (TASK-539-02)

- **Unitful grid lengths.** Unitless grid lengths accept only zero; nonzero
  values require an allowlisted CSS unit. Grid and background boundaries reject
  every C0/C1 control and non-ASCII-space Unicode/ECMAScript whitespace before
  trimming/tokenizing.
- **Split background layers.** `parseAuthoringCssBackgroundPaint` returns
  separate gradient image layers and an optional canonical final color; the
  image stack preserves its exact trimmed source substring and is emitted only
  to `background-image`, with the final color only to `background-color`.
- TASK-541's `parseCssColorValue(..., "authoring")` stays the semantic color
  owner; Page applies its existing second allowlist
  (`var(--color-primary|secondary|accent|bg|surface|text|border)`) through the
  exported Page adapters.
- Regenerated kit demo artifact and re-baselined kit color expectations.

### Gallery controls, gating, shared placement, and responsive canvas (TASK-539-03)

- Gallery-control gating vocabulary, z-clamp, and cohesive registry/test split;
  media URL, gallery-item, and gallery-category controls; PageEditor wiring on
  the TASK-481-split facade with flow-test split and Page-local responsive
  clearance.
- **Shared grid placement contract.** `resolvePageBlockGridPlacement(section,
  blockPath, { includeHiddenBlocks })` and `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE`
  live only in `pageBlockGridPlacement.ts` and classify blocks as
  `block-frame` / `section-template-wrapper` / `none` against the consumer's
  exact rendered-root policy.
- Narrow responsive canvas rendering for authored content on smaller devices.

### Independent transform channels (TASK-539-04)

- Separate layer reveal, hover, tilt, and magnetic wrappers so compositions no
  longer clobber one another; additive transform proof suite.

### Renderer behavior and geometry corrections (TASK-539-05)

- Correct stamping/rendering of all page effects and their geometry, with a
  focused renderer/geometry proof suite and source/test splits.

### Responsive CSS parity (TASK-539-06)

- Per-device emission of typography spans, layers, and full-bleed rules, proven
  by a focused responsive parity suite.

### Per-root idempotent effects runtime (TASK-539-07)

- `bindOne` binds each page root and the footer exactly once, with idempotence
  proven for main + footer. Parser-order rescan replaces the previous
  MutationObserver-based observation, so roots that appear later in the document
  (for example a separately mounted footer) are still initialized.
- **Per-event passive policy.** keydown listeners register non-passive (fixing
  the Chromium "Unable to preventDefault inside passive event listener" warning
  on ArrowRight/Home/End keyboard roving) while pointer/click listeners keep the
  passive optimization.

### Tests, docs, smoke, and closure (TASK-539-08)

- New Bun runtime suite `tests/integration/runtime/task-539-page-parity-runtime.test.ts`
  proving Page document parity through real requests; existing oversized
  `pages-runtime.test.ts` ran read-only.
- **Nine-flow real-input Playwright smoke** (`wf539smoke`): deep nesting,
  override/reset cycles, every-control-visible-effect, cross-device, and
  publish→front parity — 9/9 PASS, 0 console errors, screenshots verified.
- **Runtime defect found by the smoke:** keydown passive listener (see
  TASK-539-07 above) plus the parser-order rescan regression test.
- Docs updated: `_docs/PAGE_MODEL.md` (per-root effects runtime),
  `_docs/SECURITY_SPEC.md`, `_docs/CMS_SPEC.md`,
  `docs/develop/content-and-widgets.md`, and
  `docs/guide/screens/page-editor-preview-settings-and-history.md`.

## ✅ Validation

- 1131 targeted Vitest tests green across 4 batches (incl. the regenerated
  rescan suite: 22 tests).
- `bun run precommit:check` EXIT=0 (core/store/SDK lint + types + root tsc).
- Admin/site production build + 900-file admin boundary check + bundle check.
- DB preflight (24 tables) and pages routes 9/9, parity runtime 1/1, pages
  runtime 10/10, site-shell 8/8 integration suites.
- `tests/bun-lane-manifest.json` regenerated (442 files, 16/16 lane suites).
- Full-suite run: 2 flakes re-passed in isolation (27/27); 3 pre-existing
  failures confirmed against the base checkout (`smokeEvidenceClosureDelta`,
  `trackedSourcesAreText`, `smoke-evidence-inventory`), plus one env-dependent
  npm-bundled-dependency patch.
- Post-implementation audit: 0 HIGH / 1 MEDIUM (start-gate only, resolved by
  this atomic closure) / 6 LOW. LOW workflow-leaf inventory findings deferred to
  the permanent sentinel backlog as `TASK-9999-03` (execution-ready, with
  evidence that the deferred items are docs/process-only and have zero product
  or contract impact; `_docs/_workflows/*.mjs` remains byte-pinned by TASK-545).

## 📚 Docs

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md`, `_docs/CMS_SPEC.md`,
  `docs/develop/content-and-widgets.md`,
  `docs/guide/screens/page-editor-preview-settings-and-history.md`,
  `_docs/_TASKS/README.md` (board row + statistics), `_docs/_CHANGELOG/README.md`
  (index row + reservation update).
