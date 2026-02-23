# Post Editor Nextless Current State

## Purpose
Mapa obecnej implementacji posts editora w Nextless jako baseline do migracji `TASK-063`.

## Entry Points
- Route page: `core/admin/ui/posts/PostEditorPage.tsx`
- Main shell: `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- Primary state hook: `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- Reducer/store: `core/admin/ui/posts/editor/postEditorStore.ts`

## Component Ownership

| Layer | File(s) | Responsibility |
|---|---|---|
| Shell/layout | `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` | Kompozycja editor shell, top bar, canvas, inspector sheet, revisions drawer, runtime preview modal |
| Header/top actions | `core/admin/ui/posts/editor/PostEditorTopBar.tsx` | Ribbon tabs, save/publish/preview, quick insert actions, outline toggle, details toggle |
| Canvas + list view | `core/admin/ui/posts/editor/PostEditorCanvas.tsx`, `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx` | Wspolny canvas blokow, list view, reorder, inline editing flow |
| Rich text engine | `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` | contentEditable, toolbar, slash menu, paste normalization, clipboard image upload |
| Block library | `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`, `core/admin/ui/posts/editor/blocks/blockCatalog.ts` | Inserter dialog + search/categories metadata |
| Block settings | `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`, `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts` | Ustawienia i style per block |
| Document settings | `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx` | Metadata: title/slug/excerpt/taxonomy/SEO/featured image |
| Revisions | `core/admin/ui/posts/editor/PostRevisionDrawer.tsx` | Lista rewizji + restore flow |
| Runtime renderer | `core/services/posts/runtime/postBlockRuntimeMapper.ts`, `core/services/posts/runtime/postBlockRuntimeRenderer.tsx` | Mapowanie dokumentu blokow do runtime renderu i parity z preview/public |

## State and Data Flow
1. `usePostEditorState`:
   - resolve `postId` z router path,
   - hydrate z cache lub API,
   - normalizuje dokument przez `normalizeEditorDocumentForWritingFlow`.
2. `postEditorStore`:
   - reducer dla blokow (`insert/update/delete/move/transform`),
   - history (`undo/redo`),
   - dirty/saving flags.
3. Metadata (title/slug/SEO/tags/category) trzymane w hooku obok reducer state.
4. Autosave/publish/preview:
   - API client: `core/admin/services/postsClient.ts`,
   - silent sync dla autosave/preview (bez hydrate resetu canvasu).
5. Runtime:
   - document normalizer + runtime mapper + runtime renderer,
   - warnings i fallback dla legacy paths.

## Strengths
1. Dobry podzial odpowiedzialnosci na shell/canvas/inspector/services.
2. Writing-first flow i smart paste pipeline juz istnieja.
3. Autosave i preview sa ustabilizowane (silent sync, bez resetu edytora).
4. Runtime parity dla blokow jest utrzymane mapperem i rendererem.

## Coupling / Gap Hotspots
1. Brak centralnego layout state hooka dla wszystkich paneli (inserter/list/details) na poziomie region contract.
2. Header nie jest jeszcze modularny jak Gutenberg (`DocumentTools` + `ActionCluster`).
3. Inserter jest dialogiem, a nie dedykowanym secondary sidebar pattern.
4. List view i outline/stats nie sa jednym spojnym `Document Overview` modulem.
5. Focus return i keyboard contracts sa czesciowe (brak globalnego registry + focus return hooka).
6. Inspector tabs i preferencje usera wymagaja domkniecia i redukcji duplikacji.

## Immediate Refactor Targets (for TASK-063)
1. `PostBlockEditorShell.tsx` -> region shell + central layout state.
2. `PostEditorTopBar.tsx` -> split into `PostEditorHeader`, `PostEditorDocumentTools`, `PostEditorActionCluster`.
3. `BlockInserter` -> dedicated sidebar wrapper with focus return.
4. `PostListViewPanel` + new outline/stats -> unified `Document Overview` sidebar.
5. `PostRichTextAdapter` + paste normalizer -> appender/slash/inserter unified insertion orchestration.
