# TASK-105-08-06: Media, Commerce, and Search UI
# FileName: TASK-105-08-06-media-commerce-search.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/ui/media/**` (11 files), `core/admin/ui/commerce/**`
(11 files), and `core/admin/ui/search/**` (5 files). `CommerceBulkActionsBar.tsx` sits at
0/3 (a real executable target, not infra noise). Test-only: no API surface, no
production change.

## Scope

Uncovered-line budget: **469** (223 media + 161 commerce + 85 search), 27 files.

`core/admin/ui/media/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `FocalPointPicker.tsx` | 30/41 | 73.2% |
| `MediaCard.tsx` | 22/25 | 88.0% |
| `MediaDetailsDrawer.tsx` | 75/109 | 68.8% |
| `MediaFilterPanel.tsx` | 27/29 | 93.1% |
| `MediaFolderRail.tsx` | 142/151 | 94.0% |
| `MediaLibraryPage.tsx` | 439/568 | 77.3% |
| `MediaPicker.tsx` | 63/77 | 81.8% |
| `MediaSettingsDrawer.tsx` | 12/18 | 66.7% |
| `TagInput.tsx` | 26/29 | 89.7% |
| `UploadDropzone.tsx` | 12/22 | 54.5% |
| `utils.ts` | 71/73 | 97.3% |

`core/admin/ui/commerce/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `CommerceBulkActionsBar.tsx` | 0/3 | 0.0% |
| `CommerceCollectionsPage.tsx` | 47/57 | 82.5% |
| `CommerceEditorPage.tsx` | 80/111 | 72.1% |
| `CommerceFilters.tsx` | 2/6 | 33.3% |
| `CommerceListPage.tsx` | 102/112 | 91.1% |
| `CommerceTable.tsx` | 13/22 | 59.1% |
| `components/AttributesEditor.tsx` | 15/30 | 50.0% |
| `components/CommerceCollectionsPanel.tsx` | 17/18 | 94.4% |
| `components/CommerceContextPanel.tsx` | 5/6 | 83.3% |
| `components/CommerceVariantsCard.tsx` | 7/17 | 41.2% |
| `hooks/useCommerceCatalog.ts` | 23/90 | 25.6% |

`core/admin/ui/search/**`:

| File | Covered/Total | Line% |
|---|---|---:|
| `SearchBar.tsx` | 12/34 | 35.3% |
| `SearchPage.tsx` | 70/102 | 68.6% |
| `SearchResults.tsx` | 40/55 | 72.7% |
| `searchNavigation.ts` | 11/13 | 84.6% |
| `useSearchResults.ts` | 37/51 | 72.5% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 27 source files above and of its test files
  under `tests/vitest/ui/*`, `tests/vitest/mediaUi/*`, and `tests/vitest/search/*`.
- Existing suites it may extend (owned by this leaf): `commerce-page.test.tsx`,
  `commerce-list-page-wave.test.tsx`, `commerce-attributes-editor-collision.test.tsx`,
  `media-library-mutation-retry-wave.test.tsx` (948 lines — watch), and search
  suites under `tests/vitest/search/*`. `tests/vitest/admin/mediaClient.test.ts`
  (935 lines) is owned by TASK-105-08-01 and is NOT extended here.
- New suites per component (`media-details-drawer.test.tsx`,
  `focal-point-picker.test.tsx`, `upload-dropzone.test.tsx`,
  `use-commerce-catalog.test.ts`, `commerce-bulk-actions-bar.test.tsx`,
  `search-bar.test.tsx`, `search-page.test.tsx`, etc.).
  No other leaf may edit these test files.

## Pseudocode

Mock seams: media calls `@/services/mediaClient`/`mediaFoldersClient`; commerce calls
`@/services/commerceClient`; search calls `@/services/searchClient` and
`useSearchResults`/`searchNavigation`. Pure helpers (`media/utils.ts`,
`searchNavigation.ts`) are Bun-free and get direct unit tests.

```tsx
const listMedia = vi.fn(); const uploadMedia = vi.fn();
vi.mock("@/services/mediaClient", () => ({ listMedia, uploadMedia /* ... */ }));

function renderSubject() { return render(<MediaLibraryPage />); }
```

Assertion shape per component:

1. `MediaLibraryPage` (129 uncovered): grid/list toggle, folder navigation, filter,
   selection, upload, delete, retry-on-failure; assert visible effect (selected count,
   aria states) and client payloads.
2. `MediaDetailsDrawer`/`MediaSettingsDrawer`/`FocalPointPicker`/`UploadDropzone`/
   `TagInput`/`MediaPicker`: each control path + drag/drop + validation branch.
3. Commerce: `useCommerceCatalog` (67 uncovered) via `renderHook` covering catalog
   load/query/filter/mutation/error; `CommerceEditorPage`, attributes/variants/
   collections panels, and `CommerceBulkActionsBar` (0/3) get dedicated interaction
   suites.
4. Search: `SearchBar`/`SearchPage`/`SearchResults`/`useSearchResults` cover debounce,
   result rendering, empty/error states, and navigation branches.
5. Pure helpers: table-driven unit tests over `media/utils.ts` and `searchNavigation.ts`.

Work order (worst first): `MediaLibraryPage` (129), `MediaDetailsDrawer` (34),
`useCommerceCatalog` (67), `CommerceEditorPage` (31), `SearchPage` (32),
`SearchBar` (22), `SearchResults` (15), `useSearchResults` (14), `AttributesEditor` (15),
`FocalPointPicker` (11), `UploadDropzone` (10), then the rest.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-details-drawer.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`media-library-mutation-retry-wave.test.tsx` (948) and `mediaClient.test.ts` (935) are
near the gate; split them before extending. Any new suite crossing 1000 lines splits by
responsibility with a shared fixture module.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 27 files reach `100%` lines, including `CommerceBulkActionsBar.tsx`.
2. Every media upload/retry branch and every commerce catalog branch is covered.
