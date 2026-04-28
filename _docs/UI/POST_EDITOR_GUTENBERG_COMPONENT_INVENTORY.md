# Post Editor Gutenberg Component Inventory

## Purpose
Referencyjna inwentaryzacja komponentow Gutenberg, ktore sa kluczowe do inspiracji przy przebudowie Nextless posts editora.

## Scope
- zrodlo: `_docs/UI/gutenberg-trunk`
- fokus: shell, header, document tools, inserter, list view, outline/stats, rich text contracts
- cel: emulacja UX contract, nie kopiowanie kodu 1:1

## Component Map

| Area | Gutenberg File | Responsibility | State/Store Contracts | Keyboard/Focus/A11y |
|---|---|---|---|---|
| Interface shell | `_docs/UI/gutenberg-trunk/packages/editor/src/components/editor-interface/index.js` | Komponuje regiony (`header`, `content`, `secondarySidebar`, `sidebar`, `footer`) i przelacza tryby visual/text/revisions/preview | `editorStore`, `preferencesStore`, local UI state dla revisions/save-panels | Landmarks labels, conditional rendering sidebars by mode/viewport |
| Header | `_docs/UI/gutenberg-trunk/packages/editor/src/components/header/index.js` | Laczy DocumentTools + center context + right action cluster (saved/preview/publish) | `editorStore`, `blockEditorStore`, `preferencesStore` | Stabilnosc focusu publish button, adaptacja viewport |
| Document tools | `_docs/UI/gutenberg-trunk/packages/editor/src/components/document-tools/index.js` | Add/inserter toggle, Undo/Redo, Document Overview toggle | dispatch `setIsInserterOpened`, `setIsListViewOpened`, shortcuts store | `NavigableToolbar`, `aria-expanded`, tooltip z shortcut |
| Inserter sidebar | `_docs/UI/gutenberg-trunk/packages/editor/src/components/inserter-sidebar/index.js` | Sidebar biblioteki blokow/patterns, context root, close flow | `editorStore`, `blockEditorStore`, `interfaceStore` | ESC close, focus return do Add toggle, mobile focus behavior |
| List view sidebar | `_docs/UI/gutenberg-trunk/packages/editor/src/components/list-view-sidebar/index.js` | Tabbed sidebar: list view + outline | `editorStore` + local tab state | ESC close, global toggle shortcut, focus-on-mount i focus cycling |
| TOC stats panel | `_docs/UI/gutenberg-trunk/packages/editor/src/components/table-of-contents/panel.js` | Statystyki dokumentu + osadzenie outline | `blockEditorStore.getGlobalBlockCount` | `role="note"`, list semantics, keyboard readable stats |
| Document outline | `_docs/UI/gutenberg-trunk/packages/editor/src/components/document-outline/index.js` | Buduje outline headingow, waliduje hierarchie, wybiera blok po kliknieciu | `blockEditorStore`, `editorStore`, `coreStore` | Anchory do blokow, warningi empty/skipped/multiple H1 |
| Block editor contract | `_docs/UI/gutenberg-trunk/packages/block-editor/README.md` | `BlockEditorProvider` + `BlockCanvas` jako kontrakt shella | Controlled state in/out | Semantyczna separacja render vs state |
| Rich text contract | `_docs/UI/gutenberg-trunk/packages/rich-text/README.md` | Canonical model rich text (`RichTextValue`) i manipulacje | helper-based transformations | Deterministyczne text extraction i formatting consistency |

## UX Contracts To Emulate in Nextless
1. Region-based shell z czytelnymi landmarkami i przewidywalnym mountingiem paneli.
2. Header podzielony na: document tools (lewo), context (srodek), publish actions (prawo).
3. Sidebars (inserter/list view/details) zachowuja sie dialogowo: ESC close + focus return.
4. Document overview laczy statystyki i outline zamiast osobnych, niespojnych widokow.
5. Outline jest actionable: klik = select/scroll do sekcji, z walidacja hierarchii naglowkow.
6. Rich text i parsing powinny opierac sie o jeden kontrakt normalizacji (brak ad-hoc parserow per komponent).

## Notes for Nextless
- To jest referencja UX/interaction model.
- Implementacja musi pozostac zgodna z architektura Nextless (internal APIs, existing services, modular React components).
