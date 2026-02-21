# TASK-057: Gutenberg-Like Posts Block Editor
# FileName: TASK-057_Gutenberg_Like_Posts_Block_Editor.md

**Priority:** High  
**Category:** Admin/UI + CMS/Posts  
**Estimated Effort:** Large  
**Dependencies:** TASK-055, TASK-053-07, TASK-053-08  
**Status:** To Do

---

## Overview
Zbudowac dedykowany, blokowy edytor postow inspirowany Gutenbergem, ale dostosowany do Nextless:
- prosty start dla nietechnicznego uzytkownika,
- bogate mozliwosci edycji tekstu,
- stabilny model danych, zgodny z runtime i obecnym API posts,
- brak dead code i brak dublowania engine entries.

Nowy edytor ma zastapic obecny "generic entry-like" flow dla `/admin/coderso/posts/:id`.

## UX Principles
1. **Simple by default:** widoczne tylko najczesciej uzywane akcje (pisanie, naglowki, listy, obrazy, linki).
2. **Power on demand:** zaawansowane opcje dostepne przez slash command, inserter i inspector.
3. **Fast editing:** autosave, undo/redo, szybkie skróty klawiaturowe, brak zbędnych przeładowań.
4. **WordPress-like mental model:** `List view`, `Document/Block` panel, `Publish` workflow, revisions.

## Scope
1. Kontrakt danych blokowego dokumentu posta + kompatybilnosc wsteczna.
2. Nowy shell edytora posta z modularna architektura komponentow.
3. Rich text engine dla blokow tekstowych (wiele opcji formatowania).
4. Inserter, slash command, list view, transformacje blokow i DnD.
5. Inspector `Document` i `Block` z czytelnymi ustawieniami.
6. Autosave + revisions + preview/publish workflow dla posts.
7. Runtime renderowanie blokow posta na froncie (parity z edytorem).
8. Pelny pakiet testow, docs, changelog i rollout strategy.

## Non-Goals
- 1:1 klon wszystkich pluginowych funkcji WordPress Gutenberg.
- Wprowadzanie nowego, osobnego modelu DB dla posts.
- Przebudowa calego Page Buildera na Gutenberg.

## Implementation Notes
- Reuzywamy obecny modul `Posts` i API aliasy `/admin/api/posts*`.
- `Posts` pozostaje aliasem na `content_entries` z reserved type `post`.
- Edytor implementujemy modularnie (wiele malych plikow), bez jednego gigantycznego komponentu.

## Sub-Tasks
- `TASK-057-01_Post_Block_Document_Contract_and_Backward_Compatibility.md`
- `TASK-057-02_Post_Editor_Shell_and_State_Architecture.md`
- `TASK-057-03_Rich_Text_Engine_and_Text_Formatting_Capabilities.md`
- `TASK-057-04_Block_Inserter_Slash_Command_List_View_and_Transforms.md`
- `TASK-057-05_Document_and_Block_Inspector_Panels.md`
- `TASK-057-06_Post_Autosave_Revisions_Preview_and_Publish_Flow.md`
- `TASK-057-07_Post_Block_Runtime_Renderer_and_Public_Parity.md`
- `TASK-057-08_Post_Editor_QA_Docs_Changelog_and_Rollout.md`

## Acceptance Criteria
1. `/admin/coderso/posts/:id` otwiera blokowy edytor postow (nie generyczny entry editor).
2. Uzytkownik ma prosty workflow pisania + zaawansowane opcje tekstowe bez chaosu UX.
3. Autosave/revisions dzialaja przewidywalnie i bez utraty tresci.
4. Preview/runtime renderuje posty zgodnie z tym, co widac w edytorze.
5. Wszystkie zmiany maja testy (unit/integration/ui/runtime), lint i types przechodza.

## Testing Requirements
- Unit: dokument blokow, normalizacja, transformacje, rich-text adapters.
- Integration: posts API autosave/revisions/restore/publish.
- UI integration: inserter, slash command, inspector, DnD, undo/redo.
- Runtime: renderowanie blokow + backward compatibility dla legacy posts.
- Performance sanity: bez regresji czasu wejscia do edytora i autosave.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CONTENT_MODELING_COOKBOOK.md` (sekcja pisania postow)
- `_docs/_CHANGELOG/*.md`
