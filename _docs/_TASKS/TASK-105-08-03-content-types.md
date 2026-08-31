# TASK-105-08-03: Content Types UI
# FileName: TASK-105-08-03-content-types.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-08  
**Parent Task:** TASK-105-08  
**Status:** ⏳ To Do

---

## Overview

Close every line gap in `core/admin/ui/content-types/**` (21 files): the content-type
editor, schema builder, detail-template editor, and their panels/models. Test-only: no
API surface, no production change.

## Scope

Uncovered-line budget: **787** across 21 files (current covered/total + line%):

| File | Covered/Total | Line% |
|---|---|---:|
| `CollectionOverview.tsx` | 24/25 | 96.0% |
| `CollectionWorkspacePage.tsx` | 97/116 | 83.6% |
| `ContentTypeCreateDrawer.tsx` | 32/48 | 66.7% |
| `ContentTypeEditor.tsx` | 75/301 | 24.9% |
| `ContentTypeFieldsPanel.tsx` | 5/24 | 20.8% |
| `ContentTypeList.tsx` | 127/165 | 77.0% |
| `ContentTypePermissionsPanel.tsx` | 1/32 | 3.1% |
| `ContentTypeSettingsCard.tsx` | 7/23 | 30.4% |
| `ContentTypeSidebar.tsx` | 0/8 | 0.0% |
| `ContentTypeTable.tsx` | 7/12 | 58.3% |
| `DetailTemplateBindingPanel.tsx` | 68/92 | 73.9% |
| `DetailTemplateCanvas.tsx` | 140/158 | 88.6% |
| `DetailTemplateEditorPage.tsx` | 240/338 | 71.0% |
| `DetailTemplateInspector.tsx` | 58/96 | 60.4% |
| `FieldEditor.tsx` | 17/102 | 16.7% |
| `SchemaBuilder.tsx` | 22/45 | 48.9% |
| `SchemaBuilderPage.tsx` | 63/150 | 42.0% |
| `SchemaPreviewPanel.tsx` | 0/1 | 0.0% |
| `detailTemplateEditorModel.ts` | 89/96 | 92.7% |
| `pathResolvers.ts` | 13/14 | 92.9% |
| `schemaMapping.ts` | 187/213 | 87.8% |

## Single-Writer File Ownership

- This leaf is the SOLE writer of the 21 source files above and of its named test
  suites under `tests/vitest/ui/*` and `tests/vitest/contentUi/*`. Ownership is by
  NAMED suite, not directory glob.
- Existing suites it may extend (owned by this leaf): `content-type-editor.test.tsx`,
  `content-type-list-parity.test.tsx`, `content-type-create-drawer.test.tsx`,
  `content-type-table.test.tsx`, `content-type-preview-panel.test.tsx`,
  `collection-workspace.test.tsx`, `schemaBuilder.test.tsx` (contentUi),
  `contentTypePathResolvers.test.ts` (contentUi), `detail-template-editor.test.tsx`.
  `entryEditor.test.tsx` (contentUi) is owned by TASK-105-08-08, NOT this leaf.
- New suites per component (`field-editor.test.tsx`,
  `content-type-permissions-panel.test.tsx`, `schema-builder-page.test.tsx`, etc.).
  No other leaf may edit these test files.

## Pseudocode

These are admin React components; every suite that calls `render()` must declare
`// @vitest-environment happy-dom` as its first line. Mock seams: content-types UI
calls `@/services/contentTypesClient` (and
`detailPagesClient`/`pagesClient` for detail templates); the pure models
(`schemaMapping`, `detailTemplateEditorModel`, `pathResolvers`) are Bun-free and get
direct table-driven unit tests with no React render.

```tsx
const listContentTypes = vi.fn(); const saveContentType = vi.fn();
vi.mock("@/services/contentTypesClient", () => ({ listContentTypes, saveContentType /* ... */ }));

function renderSubject() { return render(<ContentTypeEditor contentTypeId="ct-1" />); }
```

Assertion shape per component:

1. Editor lifecycle: load → resolved fields → edit a field → save payload normalization
   → success toast; every control path (name, slug, status, permissions, settings) is
   exercised, including the cancel/revert branch.
2. Field-level: `FieldEditor` renders each field type, dispatches change events with
   the normalized value, and rejects malformed values with an inline error.
3. `SchemaBuilder`/`SchemaBuilderPage`: add/remove/reorder fields, type switch,
   required/unique toggles, and validation error branches.
4. `DetailTemplateEditorPage`/`DetailTemplateCanvas`/`DetailTemplateInspector`/
   `DetailTemplateBindingPanel`: section add/remove, binding resolution, canvas
   selection, and preview; assert visible effect via DOM/ARIA state, not only mock
   calls.
5. `schemaMapping`/`detailTemplateEditorModel`/`pathResolvers`: table-driven unit
   tests over every mapping branch and every resolver fallback.

Work order (worst first): `ContentTypeEditor` (226), `DetailTemplateEditorPage` (98),
`SchemaBuilderPage` (87), `FieldEditor` (85), `ContentTypeList` (38),
`DetailTemplateInspector` (38), `ContentTypePermissionsPanel` (31), then the rest.

## Validation Gates

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest, one file per invocation:
  `export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx`
- `git diff --check`
- line-count gate ≤ 1000 per added/modified file.

## 1000-Line Rule

`ContentTypeEditor` and `DetailTemplateEditorPage` are large surfaces; split their
suites by responsibility (create/edit, fields, permissions, save flow) with a shared
fixture module before they would exceed 1000 lines.

## Security Contract

Test-only, no API surface.

## Acceptance Criteria

1. All 21 files reach `100%` lines.
2. Every field-type branch and every resolver fallback is behavior-asserted.
