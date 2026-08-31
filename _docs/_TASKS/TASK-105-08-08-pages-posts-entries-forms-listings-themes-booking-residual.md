# TASK-105-08-08: Pages, Posts, Entries, Forms, Listings, Themes, Booking, Audit Residual
# FileName: TASK-105-08-08-pages-posts-entries-forms-listings-themes-booking-residual.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-08-11 (splits `bookingPageFixtures.tsx` before this leaf extends it)  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close the near-100% residual gaps across eight already-covered clusters:
`core/admin/ui/pages/**`, `posts/**`, `entries/**`, `forms/**`, `listings/**`,
`themes/**`, `booking/**`, and `audit/**`. These are the last few uncovered lines per
file (all files are already at ≥80% lines, most ≥90%). Test-only: no API surface, no
production change.

## Scope

Uncovered-line budget: **481** across 82 files.

| Cluster | Files | Uncovered |
|---|---:|---:|
| `core/admin/ui/pages/**` | 20 | 153 |
| `core/admin/ui/posts/**` | 20 | 140 |
| `core/admin/ui/entries/**` | 16 | 84 |
| `core/admin/ui/forms/**` | 9 | 24 |
| `core/admin/ui/listings/**` | 11 | 67 |
| `core/admin/ui/themes/**` | 1 | 2 |
| `core/admin/ui/booking/**` | 1 | 1 |
| `core/admin/ui/audit/**` | 4 | 10 |

Full file list (current covered/total):

pages (20): `PageCreateDrawer.tsx` 20/23, `PageListPage.tsx` 187/196, `PagePreview.tsx`
8/9, `editor/PageAuthoringCanvasInline.tsx` 226/227, `editor/PageEditorLayers.tsx` 19/20,
`editor/PageEditorRegistryFields.tsx` 191/205, `editor/PageEditorRoot.tsx` 43/45,
`editor/PageEditorSettingsPanel.tsx` 84/88, `editor/PageEditorToolbar.tsx` 268/307,
`editor/pageEditorDocumentCommands.ts` 303/332, `editor/usePageEditorController.ts` 306/332,
`editor/usePageEditorHostWiring.ts` 58/59, `editorControls/ComboboxControl.tsx` 71/77,
`editorControls/FacetListControl.tsx` 84/85, `editorControls/GalleryCategoryTokensControl.tsx`
25/28, `editorControls/GalleryItemsControl.tsx` 111/113, `editorControls/ListItemsControl.tsx`
20/21, `editorControls/MediaUrlControl.tsx` 37/42, `editorControls/SegmentedControl.tsx` 25/26,
`templates/PageTemplatesPage.tsx` 67/71.

posts (20): `PostsListPage.tsx` 214/215, `PostsTable.tsx` 20/21,
`editor/PostBlockEditorShell.tsx` 243/266, `editor/PostClassicEditorShell.tsx` 354/363,
`editor/PostEditorCanvas.tsx` 348/356, `editor/PostRevisionDrawer.tsx` 46/47,
`editor/postEditorStore.ts` 158/159, `editor/postInsertFlow.ts` 17/19,
`editor/blocks/BlockInserter.tsx` 63/64, `editor/blocks/blockTransforms.ts` 53/54,
`editor/header/PostEditorHeader.tsx` 12/13, `editor/hooks/useFocusReturn.ts` 25/26,
`editor/hooks/usePostEditorPreferences.ts` 61/62, `editor/hooks/usePostEditorState.ts`
1043/1111, `editor/inspector/BlockInspector.tsx` 78/82, `editor/inspector/DocumentInspector.tsx`
27/28, `editor/richtext/PostRichTextAdapter.tsx` 644/651, `editor/richtext/PostRichTextToolbar.tsx`
67/74, `editor/richtext/postRichTextCommandEngine.ts` 179/180,
`editor/settings/postEditorPreferences.ts` 14/15.

entries (16): `EntryCreateDrawer.tsx` 80/83, `EntryDeleteDialog.tsx` 1/2,
`EntryEditor.tsx` 298/331, `EntryFilters.tsx` 6/8, `EntryGrid.tsx` 17/18,
`EntryList.tsx` 224/239, `EntryMetadataPanel.tsx` 111/123, `EntryTable.tsx` 26/27,
`EntryTitleSlugFields.tsx` 3/4, `EntryTypeSidebar.tsx` 32/33, `FieldRenderer.tsx` 104/105,
`entryChecklist.ts` 39/41, `entryMetadataUpdate.ts` 11/12, `entryValueMapping.ts` 27/32,
`useEntryRelationTargets.ts` 25/26, `useEntryTaxonomyTermCreate.ts` 12/16.

forms (9): `FieldSettingsPanel.tsx` 67/68, `FormBuilderPage.tsx` 268/273,
`FormBulkActionsBar.tsx` 2/3, `FormCreateDrawer.tsx` 21/24, `FormFilters.tsx` 1/4,
`FormListPage.tsx` 138/139, `FormSettingsPanel.tsx` 32/34, `FormSubmissionsPage.tsx` 92/98,
`FormTable.tsx` 16/18.

listings (11): `ListingEditorPage.tsx` 203/226, `ListingFiltersPage.tsx` 60/61,
`ListingListPage.tsx` 151/160, `ListingQueryFilters.tsx` 3/4, `ListingQueryTable.tsx` 12/13,
`ListingTemplateManager.tsx` 37/47, `ListingTemplateTable.tsx` 12/14,
`listingQuerySummary.ts` 16/17, `components/BindingEditor.tsx` 63/67,
`hooks/useListingQueries.ts` 46/57, `hooks/useListingTemplates.ts` 40/44.

themes (1): `ThemesPage.tsx` 130/132. booking (1): `bookingHelpers.ts` 107/108.
audit (4): `AuditDetailsDrawer.tsx` 8/10, `AuditFilters.tsx` 1/5, `AuditList.tsx` 143/146,
`AuditTable.tsx` 17/18.

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 82 source files above and of its named test
  suites under `tests/vitest/pages/*`, `tests/vitest/ui/*`, `tests/vitest/posts/*`,
  and `tests/vitest/contentUi/*`. Ownership is by NAMED suite, not directory glob.
- Existing suites it may extend (owned by this leaf): the page-editor family
  (`tests/vitest/pages/page-*.test.ts(x)`, `page-editor-*.test.ts(x)`), post-editor family
  (`usePostEditorState-*.test.tsx`, `post-*.test.ts(x)`), entry suites
  (`entry-*.test.tsx`, `entryEditor.test.tsx` (contentUi), `entry-field-renderer-wave.test.tsx`
  [999 lines — watch], `entry-list-wave.test.tsx` [959 — watch]), form suites
  (`formsPagesWaveFixtures.tsx` [936 — watch], `forms-component-wave.test.tsx` [927 —
  watch], `fieldSettingsPanel.test.tsx`), listing suites, `booking-helpers*.test.ts`,
  and audit suites. `bookingPageFixtures.tsx` (1123) is split by TASK-105-08-11 first.
- New focused suites for the residual lines. No other leaf may edit these test files.

## Pseudocode

Mock seams: pages/posts/entries/forms/listings call their admin clients
(`pagesClient`, `postsClient`, `entriesClient`, `formsClient`, `listingsClient`); audit
calls `auditClient`. Pure helpers (`bookingHelpers`, `entryChecklist`,
`entryValueMapping`, `entryMetadataUpdate`, `listingQuerySummary`, `blockTransforms`,
`postInsertFlow`, `postEditorPreferences`) get direct table-driven unit tests.

```tsx
const getPage = vi.fn(); const savePage = vi.fn();
vi.mock("@/services/pagesClient", () => ({ getPage, savePage /* ... */ }));

function renderSubject() { return render(<PageEditorToolbar /* ... */ />); }
```

Assertion shape per file:

1. For each near-100% file, target the exact uncovered branches visible in the artifact
   (re-derive with `bun scripts/analyze-vitest-gaps.ts` before writing): render the
   missing control path (a specific control option, an error branch, a cancel branch) and
   assert the visible effect + client payload.
2. `usePostEditorState.ts` (68 uncovered of 1111 executable lines): its coverage already
   spans many focused suites (`usePostEditorState-*.test.tsx`). Close the residual in NEW
   small focused suites (e.g. `usePostEditorState-residual-branches.test.tsx`) — never
   grow one suite toward a monolithic 1111-line file.
3. Pure helpers: table-driven over each uncovered default/fallback/mapping branch.

Work order (worst first): pages `PageEditorToolbar` (39), `pageEditorDocumentCommands`
(29), `usePageEditorController` (26); posts `usePostEditorState` (68),
`PostBlockEditorShell` (23); entries `EntryEditor` (33), `EntryList` (15),
`EntryMetadataPanel` (12); listings `ListingEditorPage` (23), `useListingQueries` (11);
then every remaining 1–10 line gap in forms/themes/booking/audit.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pages/page-editor-control-registry.test.ts`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`entry-field-renderer-wave.test.tsx` (999), `entry-list-wave.test.tsx` (959),
`formsPagesWaveFixtures.tsx` (936), `forms-component-wave.test.tsx` (927),
`pageEditorV2FlowHarness.tsx` (exactly 1000), and `pageEditorFlowTestUtils.tsx`
(901, shared by the page-editor-v2 suites) are near the gate; split before extending.
`bookingPageFixtures.tsx` is split by TASK-105-08-11.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 82 files reach `100%` lines.
2. No existing test file is grown past 1000 lines; split-first is honored.
