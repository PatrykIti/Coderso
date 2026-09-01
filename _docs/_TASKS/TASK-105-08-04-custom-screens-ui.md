# TASK-105-08-04: Custom Screens UI
# FileName: TASK-105-08-04-custom-screens-ui.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** 🚧 In Progress
**Started:** 2026-08-22

---

## Overview

Close every line gap in `core/admin/ui/custom-screens/**` (38 files): entries/list
pages, list-view designer, screen block inspectors, runtime render blocks, and the
custom-screen hooks/models. Four files currently sit at 0 covered lines
(`ListViewDesigner`, `ListViewColumnInspector`, `ListViewElementLibrary`,
`CustomScreenEntriesBulkActionsBar`) — they are real, executable targets, not infra
noise. The leaf is test-first and has no API surface. Its only permitted production changes
are the post-audit `CustomScreenListPage.tsx` drawer-reset correction and
`CustomScreenCreateDrawer.tsx` controlled-Select correction below; all other work remains
test-only.

## Scope

Uncovered-line budget: **448** across 38 files (current covered/total + line%):

| File | Covered/Total | Line% |
|---|---|---:|
| `CustomScreenCreateDrawer.tsx` | 14/19 | 73.7% |
| `CustomScreenEditorLayout.tsx` | 6/7 | 85.7% |
| `CustomScreenEditorRouteSession.tsx` | 74/81 | 91.4% |
| `CustomScreenEditorSettingsPanel.tsx` | 5/8 | 62.5% |
| `CustomScreenEntriesBulkActionsBar.tsx` | 0/3 | 0.0% |
| `CustomScreenEntriesFilters.tsx` | 1/5 | 20.0% |
| `CustomScreenEntriesPage.tsx` | 135/262 | 51.5% |
| `CustomScreenEntriesTable.tsx` | 25/31 | 80.6% |
| `CustomScreenEntryPresentationPanel.tsx` | 13/16 | 81.3% |
| `CustomScreenEntryRouteSession.tsx` | 346/356 | 97.2% |
| `CustomScreenFilters.tsx` | 3/4 | 75.0% |
| `CustomScreenListPage.tsx` | 132/158 | 83.5% |
| `CustomScreenTable.tsx` | 10/12 | 83.3% |
| `CustomScreenWorkspacePreviewDialog.tsx` | 12/14 | 85.7% |
| `ListViewCanvas.tsx` | 23/31 | 74.2% |
| `ListViewColumnInspector.tsx` | 0/8 | 0.0% |
| `ListViewDesigner.tsx` | 0/27 | 0.0% |
| `ListViewElementLibrary.tsx` | 0/3 | 0.0% |
| `ScreenAuthoringCanvas.tsx` | 69/92 | 75.0% |
| `ScreenBlockInspector.tsx` | 13/46 | 28.3% |
| `ScreenBlockInspectorSection.tsx` | 7/8 | 87.5% |
| `ScreenBlockInspectorTabs.tsx` | 66/68 | 97.1% |
| `ScreenRuntimeContainerBlocks.tsx` | 48/50 | 96.0% |
| `ScreenRuntimeLeafBlocks.tsx` | 129/132 | 97.7% |
| `ScreenRuntimeSectionList.tsx` | 35/36 | 97.2% |
| `customScreenEntryDraft.ts` | 80/105 | 76.2% |
| `customScreenEntryPresentation.ts` | 61/74 | 82.4% |
| `customScreenEntryPresentationMedia.ts` | 80/84 | 95.2% |
| `customScreenListModel.ts` | 121/142 | 85.2% |
| `customScreenListToasts.ts` | 2/3 | 66.7% |
| `customScreenPreviewData.ts` | 54/61 | 88.5% |
| `routeParams.ts` | 25/26 | 96.2% |
| `screenRuntimeRendererModel.ts` | 128/133 | 96.2% |
| `hooks/useCustomScreenDocumentActions.ts` | 110/136 | 80.9% |
| `hooks/useCustomScreenEditorPersistence.ts` | 248/253 | 98.0% |
| `hooks/useCustomScreens.ts` | 34/42 | 81.0% |
| `hooks/useScreenEntryPreferences.ts` | 235/253 | 92.9% |
| `hooks/useScreenRelatedEntries.ts` | 172/175 | 98.3% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 38 source files above. It owns only the named
  custom-screen suites and harnesses below; it does not own a directory-wide
  `tests/vitest/ui/*` claim.
- Existing suites it may extend (owned by this leaf): `custom-screen-list-view.test.ts`,
  `custom-screen-list-view-canvas.test.tsx`, `custom-screen-entry-draft.test.ts`,
  `custom-screen-preview-data.test.ts`, `custom-screen-editor-*.test.tsx`,
  `custom-screen-entry-presentation-media.test.ts`, `custom-screen-binding-panel.test.tsx`,
  `custom-screen-authoring-boundary.test.ts`, `use-screen-related-entries.test.tsx`
  and `use-screen-related-entries-machine.test.ts`. The original suite is now 627
  lines and the extracted machine suite is 444 lines; they are independently runnable.
- New suites per component (`list-view-designer.test.tsx`,
  `list-view-column-inspector.test.tsx`, `list-view-element-library.test.tsx`,
  `custom-screen-entries-bulk-actions-bar.test.tsx`, `screen-block-inspector.test.tsx`,
  etc.). No other leaf may edit these test files.
- Restart inventory owned here: `custom-screen-editor-*.test.ts(x)`,
  `custom-screen-entries-page-wave.test.tsx`, `custom-screen-entry-*.test.ts(x)`,
  `custom-screen-list-*.test.ts(x)`, `custom-screens-list-page-wave2.test.tsx`,
  `screen-authoring-canvas-wave.test.tsx`, `screen-block-inspector.test.tsx`,
  `screen-runtime-renderer-model-extra.test.ts`,
  `ui-integration/custom-screen-runtime-renderer.test.tsx`,
  `ui-integration/screen-editor-sections.test.tsx`,
  `ui-integration/support/customScreenRuntimeRendererHarness.tsx`,
  `custom-screen-route-params.test.ts`,
  `custom-screen-section-inspector.test.tsx`,
  `custom-screen-workspace-preview-dialog.test.tsx`,
  `use-custom-screen-document-actions.test.tsx`,
  `use-custom-screens.test.tsx`, `use-screen-entry-preferences-extra.test.ts`,
  `use-screen-related-entries*.test.ts(x)`,
  `support/customScreenEditorPageHarness.tsx`,
  `support/customScreenEntriesPageHarness.tsx`,
  `support/customScreenEntryNavigationHarness.tsx`,
  `support/customScreenListPageHarness.tsx`, and
  `support/screenAuthoringCanvasHarness.tsx`, and
  `support/screenBlockInspectorTestHarness.tsx`.

## Pseudocode

Mock seams: pages call `@/services/customScreensClient`; the entries page also
calls `@/services/entriesClient`, `@/services/contentTypesClient`, `@/services/apiClient`
(`isApiClientError`), `@/services/cachePolicy` (`cacheKeys`), and
`@/utils/cacheBus`; editor hooks call the persistence/document-action modules.
(`customScreenShortcutsClient` is NOT a seam here: its consumers are
`navigation/sidebarConfig.ts` and `layouts/AdminShell.tsx`, leaf 09 territory.) Pure
models (`customScreenEntryDraft`, `customScreenEntryPresentation`,
`customScreenListModel`, `customScreenPreviewData`, `routeParams`,
`screenRuntimeRendererModel`) are Bun-free and get direct table-driven
unit tests with no React render.

```tsx
const listCustomScreens = vi.fn(); const listEntries = vi.fn();
vi.mock("@/services/customScreensClient", () => ({ listCustomScreens, listEntries /* ... */ }));

function renderSubject() { return render(<CustomScreenEntriesPage screenId="cs-1" />); }
```

Assertion shape per component:

1. Pages (`CustomScreenEntriesPage`, `CustomScreenListPage`,
   `CustomScreenEntryRouteSession`): load → table/detail → filter/sort/select →
   bulk-action → delete/create drawers, each asserting DOM/ARIA visible effect and the
   expected client call payload.
2. Zero-line targets get a dedicated suite each: `ListViewDesigner` (add/remove/move
   columns, select element), `ListViewColumnInspector` (property edits per column type),
   `ListViewElementLibrary` (element add), `CustomScreenEntriesBulkActionsBar`
   (select-all, activate/archive).
3. Runtime render blocks (`ScreenRuntimeContainerBlocks`, `ScreenRuntimeLeafBlocks`,
   `ScreenRuntimeSectionList`) render every block type with a fixture document and
   assert output presence for each branch.
4. Hooks: `renderHook` for `useCustomScreens`, `useCustomScreenDocumentActions`,
   `useCustomScreenEditorPersistence`, `useScreenEntryPreferences`,
   `useScreenRelatedEntries`; cover loading/error/success + mutation + persistence
   conflict branches.
5. Pure models: table-driven over every normalizer/default/legacy-adapter branch.

Work order (worst first): `CustomScreenEntriesPage` (127), `ListViewDesigner` (27),
`ScreenBlockInspector` (33), `CustomScreenListPage` (26), `ListViewColumnInspector` (8),
`useCustomScreenDocumentActions` (26), `customScreenEntryDraft` (25), then the rest.

### Post-Audit Source Corrections

The two visible create-entry points in `CustomScreenListPage.tsx` must both call the
existing `handleDrawerOpenChange(true)` handler rather than writing `setCreateOpen(true)`
directly. The handler already increments the drawer key and clears `createError`; bypassing
it leaves a failed create alert visible after a user cancels and reopens the drawer.

~~~tsx
const openCreateDrawer = () => handleDrawerOpenChange(true);

// Header action and empty-table create action share this behavior.
<Button onClick={openCreateDrawer}>New screen</Button>;
<CustomScreenTable onCreate={openCreateDrawer} />;
~~~

Keep close handling and the existing `handleDrawerOpenChange` logic intact. The regression
test must reject a create, visibly assert the drawer error, close it, and reopen through the
other visible entry point, then assert the error is absent and the remounted form is empty.

`CustomScreenCreateDrawer.tsx` must keep its content-type Radix `Select` controlled before
and after a choice: pass the existing `contentTypeId` string directly, including its initial
empty string, instead of converting that empty value to `undefined`. This preserves the same
placeholder and submit validation while preventing the controlled/uncontrolled warning during
the real selection flow. The wave-2 regression must select a content type and assert that the
interaction emits no controlled/uncontrolled warning. No API, persistence, auth/RBAC, schema,
or cache contract changes are permitted.

Successful `updateEntry` fixtures in the entries-page suite must echo the submitted normalized
data. The current service validates the data but does not canonicalize it before persistence,
so test-only server reversion values would misrepresent the real client/service contract rather
than prove a UI behavior.

### Runtime-smoke dependency

This leaf has no ownership of the shared TASK-540 runtime-smoke adapter. Its required fast
smoke exposed a pre-existing adapter caller that omits the TASK-569 `expectedRevision`
precondition on definition PATCHes. TASK-105-08-14 owns that request-shape repair only.
Its task105-l04-fast-20260822-r2 report is diagnostic only: the launcher remained live and
its hashes refer to transient flat PNG paths. TASK-105-08-15 exclusively owns the terminal
launcher and durable-evidence boundary after this leaf's static and targeted-suite receipt.
Its one r3 command is failed diagnostic evidence only: it terminated before scenarios because
storage preflight counted unrelated sessions. TASK-105-08-16 exclusively owns the narrow
preflight repair and the only eligible r4 runtime receipt. L04 remained in progress until L16's
fresh r4 terminal exit and 13/13 archive-hash receipt was recorded (satisfied 2026-08-22 —
see the Bounded r4 Runtime-Acceptance Receipt below); L04's operative hold is now family
changelog closure only, and L05 proceeds per the parent-declared order.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false` after each
  repair round; the root project includes Vitest files whereas `core/tsconfig.json` does
  not. Before advancing, attribute every dirty-worktree diagnostic to its named owner; a
  nonzero root result is not an L04 failure only when the parent ownership matrix records
  zero L04 paths.
- targeted Vitest, one file per invocation:
  - `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view.test.ts`
  - `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-page-wave2.test.tsx`
  - `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entries-page-wave.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.
- Runtime-smoke acceptance is delegated to TASK-105-08-16 after L15's failed diagnostic r3.
  Do not extend this leaf into `scripts/runtime-smoke`. The historical L14 r2 and L15 r3 reports
  are diagnostic only and cannot advance L04 or L05.

## 1000-Line Rule

`use-screen-related-entries.test.tsx` was split by responsibility before further
extension: hook/render behavior remains in the 627-line `.tsx` suite and pure
plan/reducer cases live in the 444-line `use-screen-related-entries-machine.test.ts`.
Keep both suites independently runnable; any future extension still splits before either
file exceeds the hard limit.
Any new suite that would cross 1000 lines splits by responsibility with a shared
fixture module.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 38 files reach `100%` lines, including the four currently-zero files.
2. Every runtime render block branch and every list-view editor branch is covered.

## Bounded r4 Runtime-Acceptance Receipt (2026-08-22)

TASK-105-08-16's sole authorized command,
`bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session task105-l04-fast-20260822-r4`,
exited naturally with `0`. Its session-scoped report records a healthy server, cleanup pass,
seven passing scenarios, and zero console/page errors or failures. Independent post-run checks
verified the exact report-plus-13-screenshot archive, `13/13` recorded hashes, no live session
process, and byte/mode restoration of all 13 flat screenshot baselines.

The current native-plan contract separately pins its 496-action invariant; `report.json` does
not contain a logical-action counter and is not used to claim one. The historical r2/r3 reports
remain diagnostic only. L04's delegated runtime acceptance therefore passes, and L05 may begin
in the parent-declared order. L04 remains `🚧 In Progress` until family closure; no board,
changelog, source, or test ownership changes here.

## Post-Audit Closure Record (2026-08-26)

Five-lens post-audit workflow (wf_cec64984-1bc: scope-fidelity, test-integrity,
byte-identity, cross-stream/TASK-540-collision, model-correctness/residuum — each an
independent fresh-context agent) plus orchestrator verification of every finding:

- **Byte-identity: CLEAN.** `git diff HEAD -- core/admin/ui/custom-screens/**` shows exactly
  the two authorized corrections (ListPage drawer-reset delegation, CreateDrawer controlled
  Select); both match the contract pseudocode with their mandated wave-2 regression tests
  (`custom-screens-list-page-wave2.test.tsx:78-148` — reject→error→close→reopen via the OTHER
  entry point→error absent + form empty; controlled/uncontrolled warning assert :100-114).
  Four zero-line targets carry real behavioral coverage (dedicated designer suite, 13 tests;
  bulk bar driven through the page's selection state), no silencing mechanisms anywhere.
- **Cross-stream / TASK-540 collisions: CLEAN.** No other TASK-105* leaf or TASK-540 stream
  claims any L04-owned suite as output (TASK-540 leaves treat them read-only; the runtime-smoke
  stream owns no Vitest files; `custom-screen-task-540-flow.test.tsx` stays TASK-540-owned and
  unmodified). No shared fixture edited, no changelog/board row claimed, no commits made.
- **Test-integrity: clean except one LOW** — duplicate describe name across the three split
  editor suites (draft-and-save/hydration-authority/visit-authority, cosmetic name-filter
  collision only; suites remain independently runnable). One LOW test-title overclaim fixed at
  closure: `use-custom-screen-document-actions.test.tsx:127` renamed to "patch handlers update
  the definition block data" (the old title claimed a no-op-false assertion the body never
  made). All 40 owned files ≤ 1000 lines (max 974); no skip/todo/only.
- **Scope-fidelity:** production surface exactly the two authorized corrections; zero drift in
  `core/services/customScreens/**`. One MEDIUM was audit-input staleness, not a stream
  violation: three contract-listed restart-inventory files
  (`ui-integration/screen-editor-sections.test.tsx`, `use-screen-entry-preferences-extra.test.ts`,
  `support/screenAuthoringCanvasHarness.tsx`) sat outside the audit union; verified at closure
  that their diffs are additive L04-owned test edits within single-writer ownership. LOWs:
  the leaf authored its own contract amendments (authorized owner file), r2-r4 smoke-evidence
  dirs are contract-disclaimed diagnostics owned by the TASK-105-08-14/15/16 boundary, and one
  stale backlog cross-reference in the non-authoritative TASK-105-10 inventory list.
- **Residuum (24 lines / 8 files): all 24 UNREACHABLE**, dual-agent convergence: the L12
  reconciliation classifier and this audit's model-correctness lens independently reached the
  same verdicts, and the sole divergence (`ScreenBlockInspector.tsx:456`, first called
  REACHABLE-GAP) was settled by the orchestrator's empirical probe — clicking the sole
  "Link" option fired the handler zero times because Radix `useControllableState`'s controlled
  setter skips `onChange` when `value2 !== prop`; every UI interaction re-picks the selected
  value. Per-line evidence recorded in both workflow journals; disposition consumed by the
  `TASK-105-08-12` final-rebaseline ledger.

L04 remains `🚧 In Progress` only for family changelog closure (board/changelog sync at the
TASK-105-08 parent-author step); all implementation and post-audit criteria are satisfied.

### AC#1 criterion amendment (2026-08-27)

AC#1's literal wording ("All 38 files reach `100%` lines") predates the program-wide
reachable-lines convention the family converged on during rebaseline. As resolved by the
authoritative artifact and this record's residuum classification, AC#1 is satisfied under
that convention: every reachable line is covered, and the final 24 uncovered lines across
8 inventory files are individually source-proven UNREACHABLE (see Residuum above;
disposition row `08-04-custom-screens | 8 | 24 | 24 UNREACHABLE | 0` in the
`TASK-105-08-12` reconciliation ledger). No owner decision is outstanding.
