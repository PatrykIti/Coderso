# TASK-063-12: Post Editor Reference Parity with 46 Template
# FileName: TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-11  
**Status:** In Progress (2026-02-25)

---

## Overview
Domknac wdrozenie UI/UX post editora tak, aby docelowo odpowiadalo referencji:
- `_docs/UI/admin_panel/46-post-editor/code.html`

Przy zachowaniu aktualnej logiki Nextless (save/autosave/preview/publish/revisions/insert flow)
i bez dodawania nowych public endpointow.

Zakres parity:
1. Header composition i hierarchy akcji.
2. Left `Document Outline` rail (z dopuszczalna dodatkowa zakladka `List view`).
3. Center unified article canvas (geometria, spacing, typography, placeholder surfaces).
4. Right `Post/Block` inspector flow.
5. Gear settings modal jako glowne miejsce globalnych ustawien edytora.
6. Responsive i focus mode parity.

---

## Current State Summary (Baseline)
1. Najwieksze rozjazdy sa w header hierarchy, lewej szynie (Outline vs List view), geometrii canvas i right inspector information architecture.
2. Logika editora (`save/autosave/preview/publish/revisions/insert`) jest stabilna i ma byc zachowana.
3. Braki parity sa glownie warstwa kompozycji UI, spacing/tokens i progressive disclosure.
4. Kluczowy punkt ryzyka: potencjalne regresje testow integracyjnych UI po refactorze komponentow shell/header/inspector.

---

## Locked Decisions and Allowed Deviations
1. Brak nowych public endpointow i brak przebudowy backend kontraktow posts.
2. Dodatkowy `List view` po lewej jest dopuszczony, ale `Outline` musi pozostac domyslny i primary.
3. Secondary controls (`Outline`, `Details`, `Focus`, `Revisions`) zostaja, ale poza primary header action cluster.
4. W `DocumentInspector` nie dodajemy nowych backendowych pol `visibility/sticky`; parity realizujemy na dostepnym kontrakcie.
5. SEO/metadata pozostaja funkcjonalnie dostepne, ale ida do `Advanced` (collapsed by default).
6. Preferences baseline: localStorage + migration + internal `user_settings` sync (dual persistence).
7. Focus mode po zmianach ma przywracac poprzedni stan paneli po wyjsciu.
8. Styling ma korzystac z istniejacego systemu template tokenow (fonts/colors/spacing), bez hardcoded one-off values.
9. Rozwiazanie ma byc przygotowane pod przyszly model opcjonalnych UI templates per screen/per editor.

---

## Security Contract
- **Visibility:** internal (`/admin/*`, opcjonalnie `/admin/api/user-settings`).
- **Auth model:** authenticated admin session / admin API key scopes.
- **Rate-limit bucket:** `admin_read` / `admin_write`.
- **Public hardening:** brak nowych public routes; nonce/HMAC/reCAPTCHA nie dotyczy.

---

## Sub-Tasks
1. `TASK-063-12-01` - Reference contract freeze and delta matrix.
2. `TASK-063-12-02` - Header parity and action hierarchy.
3. `TASK-063-12-03` - Left outline parity with optional list tab.
4. `TASK-063-12-04` - Canvas geometry, typography, and block surface parity.
5. `TASK-063-12-05` - Right inspector parity (`Post/Block`) with progressive disclosure.
6. `TASK-063-12-06` - Gear settings modal upgrade and preferences contract.
7. `TASK-063-12-07` - Responsive parity, focus mode, and mobile sheets.
8. `TASK-063-12-08` - QA, docs, changelog, and closure.

---

## Implementation Order (Locked)
1. `063-12-01` contract freeze + parity matrix.
2. `063-12-02` header hierarchy.
3. `063-12-03` left outline parity.
4. `063-12-04` canvas parity.
5. `063-12-05` right inspector parity.
6. `063-12-06` gear modal/preferences contract.
7. `063-12-07` responsive/focus mode parity.
8. `063-12-08` QA/docs/changelog/closure.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/services/userSettingsClient.ts`
- `core/services/settings/userSettingsService.ts`
- `tests/integration/routes/userSettings.test.ts`
- `tests/unit/settings/userSettingsService.test.ts`
- `tests/unit/admin/userSettingsClient.test.ts`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/integration/ui/post-editor-listview-outline.test.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx`
- `tests/integration/ui/post-editor-settings-dialog.test.tsx`
- `tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Pseudocode
```ts
const uiContract = loadReferenceContract("46-post-editor");
const currentUi = inspectPostEditorUi();
const delta = compareContracts(uiContract, currentUi);

applyDeltaInOrder([
  "header",
  "left_outline",
  "canvas",
  "right_inspector",
  "gear_settings",
  "responsive",
]);

runQualityGates();
```

---

## Acceptance Criteria
1. Desktop shell parity: `left rail + center canvas + right inspector` zgodne wizualnie z referencja.
2. Header parity: right actions `Preview`, `Publish/Update`, `Gear`; czytelny lewy navigation/status model.
3. Left rail parity: `Document Outline` jest primary mode; opcjonalny `List view` nie zaburza kontraktu.
4. Canvas parity: szerokosc/spacing/typografia i media placeholders odpowiadaja referencji.
5. Right rail parity: `Post/Block` tabs + sekcje publikacyjne/metadane w ukladzie zblizonym do wzoru.
6. Gear modal jest glownym punktem ustawien edytora i jest spojny wizualnie z shell.
7. Brak regresji save/autosave/preview/publish/revisions/runtime.

---

## Testing Requirements
- Integration UI:
  - header action flow and hierarchy
  - left outline primary flow and insert trigger
  - unified canvas visuals and block placeholders
  - right inspector `Post/Block` context switching
  - gear settings modal open/save/restore
  - responsive + focus mode behavior
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
