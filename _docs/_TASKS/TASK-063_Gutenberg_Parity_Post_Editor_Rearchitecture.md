# TASK-063: Gutenberg Parity Post Editor Rearchitecture
# FileName: TASK-063_Gutenberg_Parity_Post_Editor_Rearchitecture.md

**Priority:** High  
**Category:** Admin/UI + CMS/Posts  
**Estimated Effort:** Large  
**Dependencies:** TASK-060, TASK-061, TASK-062  
**Status:** In Progress (2026-02-23)

---

## Overview
Przebudowac UI/UX edytora postow w Nextless tak, aby byl bliski mental modelowi Gutenberg:
- shell z regionami (`header`, `content`, `secondary sidebar`, `details sidebar`, `footer`),
- toolbar "Document tools" + akcje save/preview/publish,
- lewy inserter/list view jako zamykane sidebary,
- outline/statystyki dokumentu,
- lepszy focus/accessibility i workflow dla nietechnicznych userow.

Referencja funkcjonalna i UX:
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/editor-interface/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/header/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/document-tools/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/inserter-sidebar/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/list-view-sidebar/index.js`
- `_docs/UI/gutenberg-trunk/packages/editor/src/components/table-of-contents/panel.js`

---

## Goals
1. Upodobnic interakcje edytora do Gutenberga bez kopiowania kodu 1:1.
2. Zachowac obecny model danych postow i runtime parity (bez dead code).
3. Uporzadkowac layout i odpowiedzialnosci komponentow (clean architecture).
4. Domknac a11y i keyboard workflow.
5. Dowozic zmiany etapowo (small safe increments + testy regresyjne).

---

## Non-Goals
1. Import/Vendor calego Gutenberga do runtime Nextless.
2. Przepisanie backendu posts API.
3. Zmiana architektury strony pages editor (zakres dotyczy posts editor).

---

## Architecture Notes
1. Reuzywamy obecny `PostBlockDocument`, `postEditorStore`, `postsService`, `postsRoutes`.
2. Warstwa UI ma byc modularna:
   - `layout/*` (skeleton i regiony),
   - `header/*` (document tools + actions),
   - `sidebars/*` (inserter/list view/details),
   - `canvas/*` (writing flow),
   - `hooks/*` (focus, shortcuts, layout state).
3. Wszystkie endpointy pozostaja internal (`/admin/api/posts/*`), bez nowych public route.
4. Integrujemy sie z taskami TOC (`TASK-062`) zamiast tworzyc drugi mechanizm outline/anchors.

---

## Sub-Tasks
1. `TASK-063-01` - Gutenberg reference audit and gap matrix.
2. `TASK-063-02` - Editor shell composition (interface skeleton + regions).
3. `TASK-063-03` - Header/document tools/save-publish parity.
4. `TASK-063-04` - Inserter sidebar and block library parity.
5. `TASK-063-05` - List view, outline, and document stats.
6. `TASK-063-06` - Writing canvas flow (+ appender/slash/paste parity hardening).
7. `TASK-063-07` - Details inspector tabs and preference persistence.
8. `TASK-063-08` - Keyboard shortcuts, focus management, and accessibility.
9. `TASK-063-10` - Stitch template migration + floating plus + focus mode.
10. `TASK-063-09` - QA, docs, changelog, and closure.

## Detailed Sub-Task Files
1. `TASK-063-01-01_Gutenberg_Component_Inventory.md`
2. `TASK-063-01-02_Nextless_Current-State_Inventory.md`
3. `TASK-063-01-03_Gap_Prioritization_and_Migration_Plan.md`
4. `TASK-063-02-01_Layout_State_Model_and_Hooks.md`
5. `TASK-063-02-02_Region_Components_and_Composition.md`
6. `TASK-063-02-03_Responsive_Region_Behavior.md`
7. `TASK-063-03-01_Document_Tools_Cluster.md`
8. `TASK-063-03-02_Save_Preview_Publish_Cluster.md`
9. `TASK-063-03-03_Header_Integration_and_Regression_Guards.md`
10. `TASK-063-04-01_Inserter_Sidebar_Shell.md`
11. `TASK-063-04-02_Block_Library_Search_and_Categories.md`
12. `TASK-063-04-03_Inserter_Focus_and_A11y_Contracts.md`
13. `TASK-063-05-01_Document_Stats_Selectors.md`
14. `TASK-063-05-02_Outline_Builder_and_Validation_Rules.md`
15. `TASK-063-05-03_ListView_and_Outline_Sidebar_UI.md`
16. `TASK-063-06-01_Inline_Appender_Insert_Points.md`
17. `TASK-063-06-02_Unified_Inserter_Slash_Appender_Flow.md`
18. `TASK-063-06-03_Smart_Paste_Hardening_and_TOC_Directives.md`
19. `TASK-063-07-01_Tabbed_Details_Sidebar_Shell.md`
20. `TASK-063-07-02_Inspector_Refactor_Document_vs_Block.md`
21. `TASK-063-07-03_Details_Preferences_Persistence.md`
22. `TASK-063-08-01_Shortcut_Registry_and_Keymaps.md`
23. `TASK-063-08-02_Focus_Return_and_Escape_Contracts.md`
24. `TASK-063-08-03_ARIA_Landmarks_and_Accessibility_Labels.md`
25. `TASK-063-10-01_Template_Contract_Mapping_and_Component_Inventory.md`
26. `TASK-063-10-02_Shell_Layout_Migration_to_Stitch_Reference.md`
27. `TASK-063-10-03_Floating_Appender_Plus_and_Insert_Flow.md`
28. `TASK-063-10-04_Focus_Mode_Full_Width_Toggle_and_Persistence.md`
29. `TASK-063-10-05_QA_Docs_Changelog_and_Closure.md`
30. `TASK-063-09-01_Regression_Test_Execution_Plan.md`
31. `TASK-063-09-02_Docs_Changelog_and_Kanban_Closure.md`

---

## Implementation Order
1. Najpierw analiza i matrix (`063-01`), zeby nie robic losowych zmian.
2. Potem shell/layout (`063-02`) i header/actions (`063-03`).
3. Nastepnie sidebary (`063-04`, `063-05`).
4. Potem canvas behavior (`063-06`) i details/preferences (`063-07`).
5. Nastepnie a11y/shortcuts (`063-08`) oraz migracja visual template + focus mode (`063-10`).
6. Na koniec full closure (`063-09`).

---

## Acceptance Criteria
1. Posts editor ma workflow bliski Gutenberg (header tools, sidebary, outline, details).
2. Brak regresji save/autosave/preview/publish/revisions.
3. Brak dublowania logiki i dead code po migracji.
4. Wszystkie zmiany pokryte testami unit/integration UI.

---

## Testing Requirements
- Unit: layout state, outline selectors, preference state, shortcut handlers.
- Integration UI: shell regions, toggles sidebars, focus return, save/publish flow.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
