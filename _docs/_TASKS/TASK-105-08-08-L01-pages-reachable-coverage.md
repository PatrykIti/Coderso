# TASK-105-08-08-L01: Pages Reachable Coverage
# FileName: TASK-105-08-08-L01-pages-reachable-coverage.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** UI Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-08-L03 through L06 validation-complete repair receipts; fresh L01 contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Cover only pages behavior that a supported UI, command, or host contract can execute.
This leaf deliberately includes the valid custom-host palette fallback in
`pageEditorDocumentCommands.ts:592-615`; the host contract accepts no-content sections at
`pageEditorHostContract.ts:141-143,213`, and `usePageEditorController.ts:495-511` creates
that palette. It must not construct an unsupported registry entry or cast a private value
to cover L03's dead-path work.

## Exact Single-Writer Scope

**Test writers (new, each planned at ≤800 physical lines):**

- `tests/vitest/ui/task-105-08-08-page-list-create-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-page-templates-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-page-editor-shell-toolbar-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-page-editor-registry-controls-residual.test.tsx`
- `tests/vitest/ui/task-105-08-08-page-editor-commands-controller-residual.test.tsx`

Every listed new DOM suite must begin literally with
`// @vitest-environment happy-dom` as its first physical line, before imports.

**Read-only coverage targets:**

- `core/admin/ui/pages/PageCreateDrawer.tsx:146-147,189`
- `core/admin/ui/pages/PageListPage.tsx:117,142,235,332-333,350,368-369,377`
- `core/admin/ui/pages/templates/PageTemplatesPage.tsx:234,254,276,336`
- `core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx:598`
- `core/admin/ui/pages/editor/PageEditorLayers.tsx:147`
- `core/admin/ui/pages/editor/PageEditorRoot.tsx:329,690`
- `core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx:195,306,318,326`
- `core/admin/ui/pages/editor/PageEditorToolbar.tsx:106,297,327,543,836-838,849-851,854-856,859-861,864-866,869-871,895-901,904-906,909-911,914-916,923`
- `core/admin/ui/pages/editor/PageEditorRegistryFields.tsx:565,567,578,608,618,620,635,647-648,752,880`
- `core/admin/ui/pages/editorControls/ComboboxControl.tsx:122-123,158-160,316`
- `core/admin/ui/pages/editorControls/FacetListControl.tsx:277`
- `core/admin/ui/pages/editorControls/GalleryCategoryTokensControl.tsx:121-123`
- `core/admin/ui/pages/editorControls/GalleryItemsControl.tsx:197,320`
- `core/admin/ui/pages/editorControls/MediaUrlControl.tsx:92-93,95,100-101`
- `core/admin/ui/pages/editor/pageEditorDocumentCommands.ts:137,340,538-539,592-615,675-684,741`
- `core/admin/ui/pages/editor/usePageEditorController.ts:92,131-140,315,358,495-511,517,525,534,796-803,809-810,823-827`
- `core/admin/ui/pages/editor/usePageEditorHostWiring.ts:73`

No source file, fixture/harness, existing test file, task board, changelog, route, client,
schema, or coverage configuration is writable here. In particular,
`pageEditorV2FlowHarness.tsx` is exactly 1,000 lines and
`page-editor-control-registry.test.ts` is 999 lines: both are read-only inputs.

## Implementation Pseudocode

```tsx
// List/create suite: drive the public drawer/list controls and client/cache seam.
// The Slug <label> (PageCreateDrawer.tsx:136-138) has no htmlFor and the input has no
// accessible name — resolve it by its placeholder ("/about"), not getByLabelText.
await user.type(screen.getByPlaceholderText("/about"), "new-page");
expect(onDraftChange).toHaveBeenCalledWith(expect.objectContaining({ slug: "new-page" }));
await user.click(screen.getByRole("button", { name: /cancel/i }));
expect(onOpenChange).toHaveBeenCalledWith(false);

// Command/controller suite: use a fully typed local PageEditorHost fixture, not a cast.
const firstSection = initialDocument.sections[0]!;
const host = {
  ...fullyTypedHostFixture,
  palette: { sections: ["content"], blocks: ["text"] },
} satisfies PageEditorHost;
renderSubject({ host, document: initialDocument, selectedSectionId: null });
await user.click(screen.getByRole("button", { name: /text/i }));
expect(onDocumentChange).toHaveBeenCalledWith(expect.objectContaining({
  sections: [expect.objectContaining({ id: firstSection.id, blocks: expect.any(Array) })],
}));
```

1. The list/create suite proves cold cache hydration/subscription, default page creation
   navigation, bulk-delete selection reset and toast, plus visible drawer close/open state.
2. The templates suite proves empty-state creation, typed naming, Edit navigation, and
   cancellation.
3. The shell/toolbar suite uses user-visible controls to prove canvas/layer/settings state,
   event propagation, recovery ordering/error display, Escape priority, and supported
   hotkeys.
4. The registry-controls suite interacts with actual combobox, facet, gallery, token,
   media URL, and gradient fields and asserts their public update payloads.
5. The command/controller suite exercises real insert/reorder behavior and the no-selection
   `pageEditorDocumentCommands.ts:592-615` fallback: a typed host palette narrows to
   `{ sections: ["content"], blocks: ["text"] }`, the existing first section is selected
   as fallback, and the new text block is asserted there. It also covers normalizer/error
   paths and host wiring.

Use existing public fixtures only as read-only imports. Mock admin clients at their existing
module seams; do not mock a private command/controller helper or assert only that a handler
was registered. Every assertion must include visible DOM state or the externally observable
document/client payload.

## Security Contract

Internal admin UI coverage only. No endpoint, session/RBAC rule, CSRF behavior, rate-limit
bucket, schema allowlist, persistence, cache policy, or public-write anti-abuse behavior may
change. Existing page server validation remains authoritative; test fixtures must contain no
secrets or privileged settings.

## Testing Requirements and Gates

Run each owned suite independently:

```bash
for test_path in \
  tests/vitest/ui/task-105-08-08-page-list-create-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-page-templates-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-page-editor-shell-toolbar-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-page-editor-registry-controls-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-page-editor-commands-controller-residual.test.tsx; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
```

Then run the full Vitest lane with a V8 include for every read-only target above (the full
lane is required because existing focused suites remain coverage consumers):

```bash
coverage_dir="$(mktemp -d /tmp/task105-08-08-l01-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/pages/PageCreateDrawer.tsx \
  --coverage.include=core/admin/ui/pages/PageListPage.tsx \
  --coverage.include=core/admin/ui/pages/templates/PageTemplatesPage.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorLayers.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorRoot.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorToolbar.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorRegistryFields.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/ComboboxControl.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/FacetListControl.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/GalleryCategoryTokensControl.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/GalleryItemsControl.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/MediaUrlControl.tsx \
  --coverage.include=core/admin/ui/pages/editor/pageEditorDocumentCommands.ts \
  --coverage.include=core/admin/ui/pages/editor/usePageEditorController.ts \
  --coverage.include=core/admin/ui/pages/editor/usePageEditorHostWiring.ts
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const failures = Object.entries(summary)
  .filter(([key]) => key !== "total")
  .filter(([, value]) => value.lines.pct !== 100);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exit(1);
NODE
```

Finish with:

```bash
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/task-105-08-08-page-*-residual.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l tests/vitest/ui/task-105-08-08-page-*-residual.test.tsx
```

Any `wc -l` result over 1,000 is a failed gate; split a suite before adding more cases.

## Closure Checklist

- [ ] All listed reachable lines are covered by real supported behavior.
- [ ] L03 has resolved its dead-path lines; no cast/private mock crossed that boundary.
- [ ] All five new tests and all V8 targets pass at 100% lines.
- [ ] Every writer path remains at or below 1,000 physical lines.

## Fixture Pointers (fresh contract audit, 2026-08-31)

Read-only basis: `.tmp/receipts-20260831/audits/l01-l02-source-contract-audit-20260831.md`
(L01 verdict CLEAN: 162/162 line refs VERIFIED, 0 stale, 0 dropped).

- Editor suites (shell/toolbar, registry-controls, commands/controller): import the public
  seam from `tests/vitest/ui/pageEditorV2Fixtures.tsx` (`createDocument`, `createPage`,
  `mount`, `flush`, plus the interaction helpers used by 8+ existing suites).
  `tests/vitest/ui/pageEditorV2FlowHarness.tsx` (exactly 1,000 lines, 0 `test(` blocks) is
  directly importable and exports the same helpers. Do NOT modify either file.
- Typed `PageEditorHost` fixture: none is exported anywhere in `tests/` — build a local
  `satisfies PageEditorHost` fixture (type reachable via `core/admin/ui/pages/PageEditor.tsx:11`).
  Precedent: `tests/vitest/ui/page-editor-shell-branches-wave.test.tsx:52`
  (`makeTestHost(overrides): PageEditorHost`).
- List/create suite: use `tests/vitest/ui/pagePostListFixtures.tsx` (673 lines, 0 `test(`
  blocks; mocks both `PageTable` and `PostsTable`) — the seam `page-list-wave.test.tsx` uses.
  Do NOT import `tests/vitest/ui/pageListPageWaveFixtures.tsx` — it is itself a test file and
  importing it re-registers its cases inside the new suite.
- Templates suite: no dedicated fixture module exists; local-mock precedent is
  `tests/vitest/ui/page-templates-surface.test.tsx` (`renderAdminUi` from
  `tests/utils/adminRouterRender`) and `tests/vitest/pages/page-template-editor-wave.test.tsx:69`.
  Client seam: `core/admin/ui/pages/templates/usePageTemplates.ts`.

## Contract Amendment — 2026-08-31 (orchestrator): V8 gate instrument

The full-lane single-readout `lines.pct` check is not a line-stable instrument at lane
scale (1,177 files / 10,372 tests): identical commands produced different uncovered sets
per target, and three independent focused-run V8 executions (agent artifact
`/tmp/l01-mine-final-cov`, orchestrator re-runs `/tmp/l01-verify-v8.jCy1WU` and
`/tmp/l01-verify-media.yFUqkm`) proved 11 of the 24 lane-reported residual lines have
zero uncovered statements at focused scale (PageListPage ×8, pageEditorDocumentCommands
538-539, PageEditorLayers 147 — the last with interaction-level evidence: the suite clicks
"Add block to Column 2" and asserts the palette opens). An initial reading also credited
MediaUrlControl 92-101 as covered; a per-statement dump corrected it — counts are 0 in
every artifact (the read-only media suite mocks `getCachedMedia` with a non-null empty
array, so the `assets === null` cold arm is driven by no suite). The vitest V8 provider
merges per-worker process coverages and Istanbul conversions per environment; this merge
under-reports at scale (receipt §5).

Corrected instrument (invariant unchanged — every reachable line must be covered):

1. **Authoritative coverage evidence** = focused-run V8 (the five new suites, same 17
   `--coverage.include` paths), cross-checking disputed lines' statement counts in
   `coverage-final.json` when the summary's line metric and the statement data disagree.
2. **Residual standard** = the TASK-105-08-04 receipt precedent: lines unreachable through
   supported behavior are documented per line with rationale (defensive-guard class), and
   never "covered" by casts, private-helper mocks, or synthetic unsupported states.
   Confirmed residual after the follow-up — 13 lines, 6 sites:
   - defensive: `PageEditorRegistryFields.tsx` 892/903/904 (L03-audited `default:`
     unsupported-control branch), `pageEditorDocumentCommands.ts:741` (no-selection guard;
     only invocation sites are the selection-gated buttons at `PageEditorRoot.tsx:514/:524`,
     no keybinding), `GalleryItemsControl.tsx` 197/320 (never-invoked no-op source-handler
     placeholders; identity-less rows never arise in supported flows), `PageEditorToolbar.tsx`
     483-484 (`!saved` guard; `saveDocument: Promise<PageEditorResourceDetail>` at
     `pageEditorHostContract.ts:192` is non-nullable, so `saveCurrentDraft` returns truthy
     or throws);
   - fixture-seam-bound: `MediaUrlControl.tsx` 92-101 (cold-cache arm; reaching it would
     require a fixture change outside this leaf's closed writer scope).
3. **Reachable residuals were covered by the 2026-08-31 follow-up** (statement counts 0→1
   each, evidenced in `gate2-focused-v8-scounts-proof.json`): `PageEditorToolbar.tsx:106`
   (new pure test of the exported `findRecoverableAutosaveRevision`, `:99`) and
   `PageEditorRoot.tsx:690` (builder-arm reopen chip clicked after supported select +
   hide-panel; the floating chip is discriminated by its shell-owned placement classes —
   the fixture's button stub drops `aria-pressed`, so `:not([aria-pressed])` matches the
   rail toggle, not the chip).
4. Full-lane static gates (lint, types, tsc, boundary, diff) and the per-file suite runs
   are unchanged and remain mandatory. The Phase 4 canonical rebaseline (TASK-105-08-12)
   must account for this lane-scale attribution artifact.

## Closure (2026-09-02)

Closed under this doc's 2026-08-31 amendment (instrument standard plus explicit residual disposition). Delivered suites (commit ef6e2e7c "fix(posts): split editor state canvas and richtext seams for reachable coverage"): tests/vitest/ui/task-105-08-08-page-editor-commands-controller-residual.test.tsx, -page-editor-registry-controls-residual.test.tsx, -page-editor-shell-toolbar-residual.test.tsx, -page-list-create-residual.test.tsx, -page-templates-residual.test.tsx.
Fresh instrument re-run 2026-09-02 confirms every named reachable page row is hit; remaining page lines are the instrument-level residuals enumerated in TASK-105-08-12 (08-08 pages cluster: 10 files / 25 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
