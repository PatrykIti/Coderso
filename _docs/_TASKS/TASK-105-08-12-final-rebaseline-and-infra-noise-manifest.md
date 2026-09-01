# TASK-105-08-12: Final Rebaseline and Infra-Noise Manifest
# FileName: TASK-105-08-12-final-rebaseline-and-infra-noise-manifest.md

**Priority:** High
**Category:** QA + Docs
**Estimated Effort:** Small after active residual leaves land
**Dependencies:** TASK-105-08-03-L01..L03, TASK-105-08-07-L01, TASK-105-08-09-L01, and fresh owner reconciliation for the remaining L12 clusters
**Parent Task:** TASK-105-08
**Status:** ✅ Done
**Completed:** 2026-09-01
**Reopened:** 2026-08-29

---

## Overview

The 2026-08-26 coverage run is **historical rebaseline evidence**, not a completed final
closure. This task was incorrectly marked done while active residual lines remained and its
ledger prose did not match the actual extraction. No document in this family may claim zero
uncovered executable lines until a fresh canonical artifact and per-line reconciliation
exist.

## Historical Artifact and Extraction Truth

The historical artifact recorded lines 98.54% (39,059/39,636) and 577 uncovered lines.
Of those, the L12 extraction at /tmp/l12-findings.json contains 515 residual records across
eight clusters. Its actual counts are **148 UNREACHABLE / 367 REACHABLE-GAP**. The former
149 / 366 prose/table is retracted: it does not match the extraction.

The following independently source-reviewed deltas are now fixed in their owning parent
contracts:

| Cluster | Raw extraction | Verified local correction | Current scoped disposition |
|---|---:|---:|---:|
| 08-03 content types | 11 U / 51 R | Inspector native-select branch: +3 U / -3 R | 14 U / 48 R |
| 08-06 media-commerce | 4 U / 1 R | MediaLibraryPage.tsx:485: +1 U / -1 R | 5 U / 0 R |
| 08-09 misc admin UI | 29 U / 23 R | RoleEditor-dependent branches: +7 U / -7 R | 36 U / 16 R |

Do **not** publish a new global total from those deltas. Other clusters, including the
in-flight pages/posts review, may change their source classifications. The only currently
verified global extraction total is the historical **148 U / 367 R**; the table above is the
bounded current truth for its three reviewed clusters. It proves a residual backlog remains,
not its final size.

## Infra-Noise Manifest

The following 17 historical lines.total === 0 paths remain exclude-with-reason records, not
additions to coverage.exclude and not Istanbul/V8 ignore targets:

core/admin/ui/audit/types.ts; core/admin/ui/authoring/index.ts;
core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx; core/admin/ui/media/types.ts;
core/admin/ui/menus/types.ts; core/admin/ui/pages/PageEditor.tsx;
core/admin/ui/pages/editorControls/index.ts; core/admin/ui/plugins/types.ts;
core/admin/ui/roles/types.ts; core/admin/ui/security/types.tsx;
core/admin/ui/setup/steps/stepTypes.ts; core/admin/ui/store/types.ts;
core/admin/ui/users/types.ts; core/services/assistant/providers/providerTypes.ts;
core/services/customScreens/customScreenSchemas.ts;
core/services/customScreens/screenDocumentContracts.ts; and
core/services/customScreens/screenDocumentOps.ts.

Each is a type-only contract or re-export facade/barrel. Revalidate that fact against the
fresh artifact before closure; do not widen vitest.config.ts exclusions.

## Single-Writer File Ownership

This leaf writes only this contract and its final evidence. It reads coverage artifacts and
all child contracts; it writes no source, tests, task-board rows, changelog, manifest, or
coverage configuration. Active child writers own their named tests and source evidence.

## Implementation Pseudocode

~~~ts
const artifact = await runCanonicalVitestCoverage();
const gaps = analyzeVitestGaps(artifact);

for (const gap of gaps.executableLines) {
  assertExactlyOneCurrentSourceDisposition(gap);
}

assertInfraNoiseManifestStillHasZeroExecutableLines(artifact);
recordArtifactTotalsWithoutInventingAZeroResidualTarget(artifact);
~~~

The fresh artifact is authoritative. Historic L12 JSON can guide triage but cannot override
a new coverage run, changed source line map, or a current source proof.

## Testing Requirements

After every active residual child has its own targeted receipt, run:

~~~bash
bun scripts/run-vitest-coverage.ts
bun scripts/analyze-vitest-gaps.ts
git diff --check
~~~

Record the generated summary, the exact uncovered executable-line set, the per-line owner,
and all four coverage metrics. Reject duplicate, missing, stale, or unclassified records.

## 1000-Line Rule

This leaf changes documentation only. Its fresh artifact must still enforce the 1,000-line
gate for every source/test module touched by active child work.

## Security Contract

Non-API coverage/docs work only. No endpoint, auth/RBAC, CSRF, rate-limit, validation,
persistence, or anti-abuse contract changes. No ignore directive, artifact manipulation, or
synthetic test seam may be used to alter coverage results.

## Sub-Tasks

No standalone child is created here. This task consumes the active residual leaves named in
Dependencies and finalizes their evidence only after a fresh artifact exists.

## Documentation Updates Required

At closure, update this file with the artifact-derived totals and exact residual ledger;
then hand status/board/changelog work to the orchestrator. Do not claim the historical run
as a terminal receipt.

## Acceptance Criteria

1. A fresh canonical run reconciles every executable-line gap exactly once.
2. The 17 zero-executable records remain documented without ignore/config widening.
3. The task reports truthful fresh totals; it never asserts zero residual merely from
   historical evidence.

---

## Closure Evidence — Fresh Canonical Artifact (2026-09-01)

Receipt owner: this leaf. Per *Documentation Updates Required*, only this file and the
generated coverage artifacts under `coverage/vitest/` were written; status/board/changelog
flips are handed to the orchestrator. No source, test, `vitest.config.ts`,
`coverage.exclude`, ignore directive, or `tests/bun-lane-manifest.json` byte was modified by
this receipt (the bun-lane manifest keeps the orchestrator's 2026-09-01 regeneration at 451
rows).

### Run provenance

| Command | Exit | Duration | Notes |
|---|---|---|---|
| `bun scripts/run-vitest-coverage.ts` (attempt 1, 2026-09-01T18:35:31Z) | 1 | 394.22s | `tests/vitest/pages/legacy-widget-block.test.tsx:150` timed out at the wrapper's 15000ms budget; no coverage artifact was emitted. See *Attempt 1 failure* below. |
| `bun scripts/run-vitest-coverage.ts` (attempt 2, 2026-09-01T18:50:19Z, canonical) | 0 | 276.98s | Artifact emitted; same command, no arguments changed. |
| `bun scripts/analyze-vitest-gaps.ts` | 0 | — | Read the fresh `coverage/vitest/coverage-summary.json`. |
| `git diff --check` | 0 | — | Clean. |

Canonical invocation expanded by `scripts/vitestCoverageArgs.ts`:
`vitest run --config vitest.config.ts --coverage --testTimeout=15000 --coverage.clean=false
--coverage.reportsDirectory=coverage/vitest` (vitest v4.1.10). Attempt 2 result:
`Test Files 1186 passed (1186)`, `Tests 10444 passed (10444)` — zero failures.

Artifact: `coverage/vitest/coverage-summary.json` (2026-09-01T18:55:03Z) plus
`coverage/vitest/lcov.info` (per-line detail) and `coverage/vitest/lcov-report/`.

### Fresh totals (all four metrics)

| Metric | Covered / total | pct |
|---|---|---|
| Statements | 43,518 / 45,221 | 96.23% |
| Branches | 31,184 / 35,822 | 87.05% |
| Functions | 11,711 / 11,845 | 98.86% |
| Lines | 39,427 / 39,718 | 99.26% |

Census from the fresh artifact: 698 tracked files, of which 681 carry executable lines —
594 at 100% lines, 87 below 100%, 17 zero-executable — totalling **291 uncovered executable
lines**.

### Delta vs the previous baseline

Previous canonical artifact retained in the tree:
`coverage/vitest-full/coverage-summary.json` (2026-08-26T15:29Z) — 686 tracked files,
lines 98.48% (39,036/39,636), statements 95.45%, branches 86.34%, functions 98.00%, 600
uncovered lines.

| Metric | 2026-08-26 | 2026-09-01 | Delta |
|---|---|---|---|
| Statements | 95.45% (43,080/45,133) | 96.23% (43,518/45,221) | +0.78 pts |
| Branches | 86.34% (30,919/35,810) | 87.05% (31,184/35,822) | +0.71 pts |
| Functions | 98.00% (11,570/11,805) | 98.86% (11,711/11,845) | +0.86 pts |
| Lines | 98.48% (39,036/39,636) | 99.26% (39,427/39,718) | +0.78 pts |
| Uncovered lines | 600 | 291 | −309 |
| Tracked source files | 686 | 698 | +12 / −0 |

* Tracked-file additions (12, all TASK-105-08-08 posts-editor splits, no removals):
  `core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts`,
  `postEditorStateRefresh.ts`, `postEditorStateSaveQueue.ts`, `postEditorStateSession.ts`;
  `core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx`,
  `postEditorCanvasBlockItemModel.ts`, `postEditorCanvasBlocks.tsx`,
  `postEditorCanvasFocus.ts`, `postEditorCanvasSelection.ts`;
  `core/admin/ui/posts/editor/richtext/postRichTextMedia.ts`,
  `postRichTextSelection.ts`, `postRichTextSlashState.ts`.
* 48 files moved to fewer uncovered lines (335 lines closed in total); **0 files regressed**.
  Largest: `usePostEditorState.ts` −67, `PageEditorToolbar.tsx` −37,
  `pageEditorDocumentCommands.ts` −28, `usePageEditorController.ts` −26,
  `PostBlockEditorShell.tsx` −23, `ReviewsModerationPage.tsx` −17, `UsersRolesPage.tsx` −14,
  `ContentTypeList.tsx` −12.

### Infra-noise revalidation — 17/17 confirmed zero-executable

Every record below reports `lines.total === 0` (also `statements.total === 0` and
`functions.total === 0`) in the fresh artifact. No new zero-executable file appeared outside
this list, and `vitest.config.ts` `coverage.exclude` was not widened.

core/admin/ui/audit/types.ts; core/admin/ui/authoring/index.ts;
core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx; core/admin/ui/media/types.ts;
core/admin/ui/menus/types.ts; core/admin/ui/pages/PageEditor.tsx;
core/admin/ui/pages/editorControls/index.ts; core/admin/ui/plugins/types.ts;
core/admin/ui/roles/types.ts; core/admin/ui/security/types.tsx;
core/admin/ui/setup/steps/stepTypes.ts; core/admin/ui/store/types.ts;
core/admin/ui/users/types.ts; core/services/assistant/providers/providerTypes.ts;
core/services/customScreens/customScreenSchemas.ts;
core/services/customScreens/screenDocumentContracts.ts; and
core/services/customScreens/screenDocumentOps.ts.

### Exact residual ledger — 291 uncovered executable lines across 87 files

Derived from `coverage/vitest/lcov.info` `DA:` records with hit count 0 and cross-checked
against `coverage/vitest/coverage-summary.json` (0 mismatches; 87 ledger files exactly equal
the 87 below-100% files; 698 `SF:` blocks with 0 duplicates — no duplicate, missing, stale,
or unclassified record). Line numbers are post-run source line numbers; the owning leaf
contract is attributed per file.

Dispositions are **not** asserted here: per-line UNREACHABLE vs REACHABLE-GAP classification
is source-review work owned by the leaf named on each file, and this receipt publishes no
global U/R split (see *Non-claims*).

#### TASK-105-08-08 (listings) — 11 files / 67 lines
- `core/admin/ui/listings/ListingEditorPage.tsx` (23): 76, 77, 78, 118, 131, 163, 185, 186, 237, 238, 248, 249, 251, 263, 318, 544, 551, 686, 688, 690, 788, 790, 792
- `core/admin/ui/listings/hooks/useListingQueries.ts` (11): 18, 22, 27, 28, 43, 44, 77, 89, 124, 125, 126
- `core/admin/ui/listings/ListingTemplateManager.tsx` (10): 74, 77, 80, 149, 150, 154, 155, 156, 158, 159
- `core/admin/ui/listings/ListingListPage.tsx` (9): 180, 204, 205, 206, 207, 231, 254, 255, 258
- `core/admin/ui/listings/components/BindingEditor.tsx` (4): 59, 67, 76, 199
- `core/admin/ui/listings/hooks/useListingTemplates.ts` (4): 19, 43, 55, 86
- `core/admin/ui/listings/ListingTemplateTable.tsx` (2): 32, 71
- `core/admin/ui/listings/ListingFiltersPage.tsx` (1): 141
- `core/admin/ui/listings/ListingQueryFilters.tsx` (1): 46
- `core/admin/ui/listings/ListingQueryTable.tsx` (1): 23
- `core/admin/ui/listings/listingQuerySummary.ts` (1): 20

#### TASK-105-08-08 (posts) — 9 files / 42 lines
- `core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts` (17): 150, 151, 174, 175, 176, 196, 212, 288, 327, 331, 350, 351, 475, 547, 563, 711, 757
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` (8): 349, 350, 353, 354, 694, 695, 696, 697
- `core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts` (7): 177, 184, 298, 582, 583, 652, 653
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` (5): 281, 337, 338, 346, 348
- `core/admin/ui/posts/PostsListPage.tsx` (1): 77
- `core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts` (1): 60
- `core/admin/ui/posts/editor/hooks/useFocusReturn.ts` (1): 19
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` (1): 415
- `core/admin/ui/posts/editor/richtext/postRichTextSelection.ts` (1): 218

#### TASK-105-08-09 (misc admin UI) — 9 files / 41 lines
- `core/admin/ui/users/UsersRolesPage.tsx` (18): 167, 211, 216, 217, 351, 352, 369, 375, 376, 383, 422, 423, 475, 476, 515, 516, 623, 624
- `core/admin/ui/roles/PermissionsMatrixPage.tsx` (8): 177, 300, 301, 348, 349, 361, 362, 363
- `core/admin/ui/site/siteSettingsValidation.ts` (4): 115, 134, 135, 136
- `core/admin/ui/roles/RoleEditor.tsx` (3): 162, 168, 183
- `core/admin/ui/shared/ExportDialog.tsx` (3): 108, 109, 110
- `core/admin/ui/setup/SetupWizard.tsx` (2): 54, 97
- `core/admin/ui/auth/recaptcha.ts` (1): 55
- `core/admin/ui/security/AccessLogsPage.tsx` (1): 142
- `core/admin/ui/setup/assistantSiteBuilderIntakeUiState.ts` (1): 288

#### TASK-105-08-07 (assistant) — 12 files / 35 lines
- `core/services/assistant/actionPlannerService.ts` (9): 188, 237, 823, 887, 1798, 1816, 1821, 1822, 2074
- `core/services/assistant/blueprints/blueprintCandidateResolver.ts` (5): 37, 38, 39, 40, 223
- `core/admin/ui/assistant/AssistantPanel.tsx` (4): 803, 825, 894, 953
- `core/services/assistant/actionPlanSchema.ts` (3): 165, 1850, 1859
- `core/services/assistant/blueprints/blueprintActionAssembler.ts` (3): 159, 263, 792
- `core/services/assistant/blueprints/blueprintSchemaMerger.ts` (3): 63, 94, 104
- `core/admin/ui/assistant/useAssistantAdminContext.ts` (2): 93, 207
- `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts` (2): 34, 725
- `core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper.tsx` (1): 158
- `core/services/assistant/blueprints/blueprintCompositionGraph.ts` (1): 57
- `core/services/assistant/blueprints/blueprintConflictResolver.ts` (1): 163
- `core/services/assistant/blueprints/blueprintFacetMerger.ts` (1): 75

#### TASK-105-08-08 (pages) — 10 files / 25 lines
- `core/admin/ui/pages/PageListPage.tsx` (8): 117, 142, 235, 333, 350, 368, 369, 377
- `core/admin/ui/pages/editorControls/MediaUrlControl.tsx` (5): 92, 93, 95, 100, 101
- `core/admin/ui/pages/editor/PageEditorRegistryFields.tsx` (3): 892, 903, 904
- `core/admin/ui/pages/editor/PageEditorToolbar.tsx` (2): 483, 484
- `core/admin/ui/pages/editorControls/GalleryItemsControl.tsx` (2): 197, 320
- `core/admin/ui/pages/PagePreview.tsx` (1): 19
- `core/admin/ui/pages/editor/PageEditorLayers.tsx` (1): 147
- `core/admin/ui/pages/editor/pageEditorDocumentCommands.ts` (1): 741
- `core/admin/ui/pages/editorControls/ListItemsControl.tsx` (1): 62
- `core/admin/ui/pages/editorControls/SegmentedControl.tsx` (1): 82

#### TASK-105-08-04 (custom screens UI) — 8 files / 24 lines
- `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts` (15): 125, 239, 257, 258, 331, 388, 485, 535, 536, 537, 538, 539, 540, 541, 542
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` (2): 303, 337
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx` (2): 92, 93
- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx` (1): 122
- `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` (1): 456
- `core/admin/ui/custom-screens/customScreenListModel.ts` (1): 208
- `core/admin/ui/custom-screens/hooks/useCustomScreenDocumentActions.ts` (1): 68
- `core/admin/ui/custom-screens/hooks/useCustomScreenEditorPersistence.ts` (1): 614

#### TASK-105-08-02 (settings) — 6 files / 18 lines
- `core/admin/ui/settings/ApiKeyDialog.tsx` (4): 73, 74, 77, 78
- `core/admin/ui/settings/EmailSettingsPage.tsx` (4): 306, 310, 353, 355
- `core/admin/ui/settings/SecuritySettingsPage.tsx` (4): 72, 426, 475, 478
- `core/admin/ui/settings/AssistantSettingsPage.tsx` (3): 171, 172, 237
- `core/admin/ui/settings/StorageSettingsPage.tsx` (2): 354, 531
- `core/admin/ui/settings/DesignTokensEditor.tsx` (1): 53

#### TASK-105-08-03 (content types) — 6 files / 14 lines
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx` (4): 71, 72, 75, 76
- `core/admin/ui/content-types/DetailTemplateEditorPage.tsx` (3): 288, 289, 290
- `core/admin/ui/content-types/DetailTemplateInspector.tsx` (3): 321, 322, 328
- `core/admin/ui/content-types/schemaMapping.ts` (2): 376, 377
- `core/admin/ui/content-types/CollectionOverview.tsx` (1): 86
- `core/admin/ui/content-types/DetailTemplateBindingPanel.tsx` (1): 266

#### TASK-105-08-10 (custom screens service + SDK) — 4 files / 6 lines
- `core/services/customScreens/bindingResolver.ts` (3): 148, 149, 150
- `core/services/customScreens/screenDocumentMutations.ts` (1): 85
- `core/services/customScreens/screenDocumentReadNormalizer.ts` (1): 285
- `core/services/customScreens/screenEntryPresentationOverrideContract.ts` (1): 204

#### TASK-105-08-06 (media / commerce / search) — 3 files / 5 lines
- `core/admin/ui/commerce/hooks/useCommerceCatalog.ts` (2): 158, 169
- `core/admin/ui/media/MediaLibraryPage.tsx` (2): 485, 754
- `core/admin/ui/commerce/components/AttributesEditor.tsx` (1): 131

#### TASK-105-08-08 (forms) — 3 files / 5 lines
- `core/admin/ui/forms/FormBuilderPage.tsx` (3): 369, 676, 677
- `core/admin/ui/forms/FormListPage.tsx` (1): 237
- `core/admin/ui/forms/FormTable.tsx` (1): 40

#### TASK-105-08-01 (admin services + utils) — 3 files / 4 lines
- `core/admin/services/mediaFoldersClient.ts` (2): 118, 135
- `core/admin/services/entriesClient.ts` (1): 500
- `core/admin/services/entryData.ts` (1): 12

#### TASK-105-08-08 (entries / themes / booking) — 3 files / 5 lines
- `core/admin/ui/entries/EntryList.tsx` (2): 477, 506
- `core/admin/ui/themes/ThemesPage.tsx` (2): 85, 104
- `core/admin/ui/booking/bookingHelpers.ts` (1): 65

Ledger total: 87 files, 291 lines.

### Non-claims

* No zero-residual claim is made: 291 executable lines remain uncovered.
* No global UNREACHABLE / REACHABLE-GAP total is published for the fresh artifact. The only
  verified historical extraction total remains **148 UNREACHABLE / 367 REACHABLE-GAP**
  (515 records); it is not restated against the 2026-09-01 artifact and the two are not
  comparable line-for-line, because source line maps moved (12 new posts-editor modules,
  48 files improved).
* The three reviewed-cluster corrections in the table under
  *Historical Artifact and Extraction Truth* are unchanged by this receipt; their current
  scoped dispositions remain owned by their parent contracts.

### Attempt 1 failure (recorded, not repaired)

`bun scripts/run-vitest-coverage.ts` at 2026-09-01T18:35:31Z exited 1 after 394.22s with
`Test Files 1 failed | 1185 passed (1186)` / `Tests 1 failed | 10443 passed (10444)` and
emitted **no** coverage artifact (the wrapper exits before any report is written):

```
FAIL |coderso-vitest| tests/vitest/pages/legacy-widget-block.test.tsx > legacy-widget block contract (TASK-580-03-L01) > json schema: validates a normalized legacy-widget document; rejects unknown props and over-length types
Error: Test timed out in 15000ms.
 ❯ tests/vitest/pages/legacy-widget-block.test.tsx:150:3
```

No source or test byte was changed in response. The identical canonical command then passed
in full (attempt 2, 1186/1186 files, 10444/10444 tests), so the failure is recorded as a
full-load contention timeout of the wrapper's 15000ms budget, matching the 2026-08-29
whole-lane rerun failure already noted on the board — not as a product or assertion defect.
The wrapper's 15s per-test ceiling versus the config's 30s lane budget remains an open infra
observation for whoever owns `scripts/vitestCoverageArgs.ts`.

### Deviations recorded for the orchestrator

1. `/tmp/l12-findings.json`, referenced by *Historical Artifact and Extraction Truth*, does
   not exist on this machine; triage had to proceed from the fresh artifact alone. The
   contract already frames that JSON as non-authoritative guidance, so nothing was blocked,
   but the 515-record raw ledger is not reproducible from this host as written.
2. The historical figures in this contract and on the board (lines 98.54%, 577 uncovered;
   stmts 95.50, branch 86.38, funcs 98.08) do not match the 2026-08-26 artifact retained in
   the tree (`coverage/vitest-full/coverage-summary.json`: lines 98.48%, 600 uncovered;
   stmts 95.45, branch 86.34, funcs 98.00). This receipt uses the on-disk artifact as the
   comparison baseline and flags the prose mismatch rather than reconciling it silently.
3. `scripts/analyze-vitest-gaps.ts` prints only the top 25 files per cluster and the worst
   40 files, so the exact per-line set above was extracted from `coverage/vitest/lcov.info`
   instead of from that script's summary output; the script was still run and its totals
   agree with the artifact (`TOTALS: stmts 96.23 / branch 87.05 / funcs 98.86 / lines 99.26`,
   `Uncovered lines total: 291`).

## Terminal Status (TASK-105-09, 2026-09-01)

Status written by the closure owner after this leaf's own
`## Closure Evidence — Fresh Canonical Artifact (2026-09-01)` receipt, exactly as
*Documentation Updates Required* above directs. Acceptance criteria 1-3 are met by
that receipt: the canonical run reconciled every executable-line gap exactly once
(87 ledger files, 291 lines, 0 duplicate/missing/stale/unclassified records), the
17 infra-noise paths were revalidated at `lines.total === 0` without widening
`coverage.exclude`, and the fresh totals are published without a zero-residual
claim. Changelog 1325 carries the closure entry and the residual-ledger pointer.
