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
5. Po `TASK-195` editor daje jawny success feedback dla publish/update i
   actionable autosave pause state z retry.
6. Inspector ma picker-based category / featured-image UX, SEO badge na
   zwiniętym `Advanced`, oraz display-only slug route context.
7. Revisions drawer pokazuje bounded preview snapshot przed restore.

## Coupling / Gap Hotspots
1. Inserter/list/details korzysta juz ze wspolnego layout hooka, ale shell nadal
   pozostaje miejscem integracji wielu owner seams.
2. Header jest rozbity na `PostEditorHeader` + `PostEditorActionCluster`, ale
   dalsza praca nadal powinna pilnowac presentational vs async bridge ownership.
3. List view i outline/stats nie sa jeszcze jednym spojnym `Document Overview`
   modulem.
4. Focus return i keyboard contracts sa dobre dla biezacego shellu, ale dalsze
   refaktory musza utrzymac te same owner seams.
5. Inspector tabs i preferencje usera nadal wymagaja pilnowania, zeby nie
   duplikowac visibility state poza shell/layout contract.

## Immediate Refactor Targets (for TASK-063)
1. `PostBlockEditorShell.tsx` -> region shell + central layout state.
2. `PostEditorTopBar.tsx` -> split into `PostEditorHeader`, `PostEditorDocumentTools`, `PostEditorActionCluster`.
3. `BlockInserter` -> dedicated sidebar wrapper with focus return.
4. `PostListViewPanel` + new outline/stats -> unified `Document Overview` sidebar.
5. `PostRichTextAdapter` + paste normalizer -> appender/slash/inserter unified insertion orchestration.
