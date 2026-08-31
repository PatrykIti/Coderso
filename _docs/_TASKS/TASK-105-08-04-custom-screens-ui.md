# TASK-105-08-04: Custom Screens UI
# FileName: TASK-105-08-04-custom-screens-ui.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/ui/custom-screens/**` (38 files): entries/list
pages, list-view designer, screen block inspectors, runtime render blocks, and the
custom-screen hooks/models. Four files currently sit at 0 covered lines
(`ListViewDesigner`, `ListViewColumnInspector`, `ListViewElementLibrary`,
`CustomScreenEntriesBulkActionsBar`) — they are real, executable targets, not infra
noise. Test-only: no API surface, no production change.

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

- This leaf is the SOLE writer of the 38 source files above and of its test files
  under `tests/vitest/ui/*` and `tests/vitest/customScreens/*`.
- Existing suites it may extend (owned by this leaf): `custom-screen-list-view.test.ts`,
  `custom-screen-list-view-canvas.test.tsx`, `custom-screen-entry-draft.test.ts`,
  `custom-screen-preview-data.test.ts`, `custom-screen-editor-*.test.tsx`,
  `custom-screen-entry-presentation-media.test.ts`, `custom-screen-binding-panel.test.tsx`,
  `custom-screen-authoring-boundary.test.ts`, `use-screen-related-entries.test.tsx`
  (watch: this one is at 999 lines — split before extending).
- New suites per component (`list-view-designer.test.tsx`,
  `list-view-column-inspector.test.tsx`, `list-view-element-library.test.tsx`,
  `custom-screen-entries-bulk-actions-bar.test.tsx`, `screen-block-inspector.test.tsx`,
  etc.). No other leaf may edit these test files.

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

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view.test.ts`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`use-screen-related-entries.test.tsx` is already 999 lines; split it before extending.
Any new suite that would cross 1000 lines splits by responsibility with a shared
fixture module.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 38 files reach `100%` lines, including the four currently-zero files.
2. Every runtime render block branch and every list-view editor branch is covered.
