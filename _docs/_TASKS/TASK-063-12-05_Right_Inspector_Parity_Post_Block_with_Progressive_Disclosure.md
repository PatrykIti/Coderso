# TASK-063-12-05: Right Inspector Parity Post/Block with Progressive Disclosure
# FileName: TASK-063-12-05_Right_Inspector_Parity_Post_Block_with_Progressive_Disclosure.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-01, TASK-063-12-04  
**Status:** Done (2026-02-25)

---

## Overview
Przebudowac prawy panel `Post/Block`, aby zachowac visual parity z referencja:
- sekcje publikacyjne i metadata w prostym, czytelnym flow,
- zaawansowane pola (np. SEO) w modelu progressive disclosure (`Advanced`),
- bez utraty obecnej funkcjonalnosci ustawien dokumentu i bloku.

---

## Scope
1. Uporzadkowac sekcje `Post` pod kontrakt referencyjny (status/visibility/categories/tags/featured image/danger zone).
2. Zachowac `Block` tab z aktualna logika atrybutow.
3. Dodac collapsed/expand model dla advanced fields.
4. Utrzymac selection-driven switch `Post <-> Block`.

---

## Current State Analysis (Repo)
1. `DocumentInspector` renderuje obecnie sekcje: publishing badge, title/slug/excerpt, featured image id, taxonomy/tags, SEO summary.
2. SEO i metadata sa stale widoczne (brak progressive disclosure).
3. `BlockInspector` ma stale widoczny „Advanced” segment dla block attrs.
4. Dane editora ida przez `usePostEditorState` i istnieje juz stabilny payload metadata (`title/slug/excerpt/featured/tags/category/seo`).
5. Aktualny kontrakt API nie wystawia dedykowanych pol `visibility` i `sticky` jak w WordPressowym panelu referencyjnym.

---

## Delta vs Reference
1. Referencja ma prostszy flow `Publishing -> Categories -> Tags -> Featured image -> Move to trash`.
2. Aktualny panel jest bardziej techniczny i przeciazony (SEO always-on).
3. Brakuje „danger zone” w warstwie inspector UX.
4. Brak backendowego `visibility/sticky` wymaga jawnej decyzji zakresowej.

---

## Final Implementation Decisions
1. Nie rozszerzamy backendu w tym tasku; nie dodajemy nowych pol API.
2. `DocumentInspector` dostaje nowy porzadek sekcji zgodny z referencja, ale oparty na aktualnych danych:
   - Publishing (status + timestamps read-only),
   - Category/tags,
   - Featured image,
   - Danger zone.
3. SEO/metadata przechodza do `Advanced` (collapsed by default).
4. `BlockInspector` zachowuje aktualna funkcjonalnosc, ale `Advanced` przechodzi na model collapse.
5. `Post/Block` tabs i selection-driven context pozostaja bez zmian kontraktowych.
6. Akcja `Move to trash` po potwierdzeniu przekierowuje usera na liste postow: `/admin/posts` (SPA navigate z `replace: true`, aby `Back` nie wracalo na usuniety editor route).

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
   - zmienic kolejnosc i kompozycje sekcji,
   - dodac `Advanced` collapse,
   - dodac danger zone action area.
2. `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
   - wydzielic advanced attrs do collapse wrapper.
3. `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
   - uporzadkowac labels/options pod nowa prezentacje.
4. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - dopiac ewentualne read-only publishing metadata do Document tab,
   - po delete success wykonac redirect do `/admin/posts`.
5. `tests/integration/ui/post-block-inspector.test.tsx`
   - dopisac asercje collapse/expand i section order.
6. `tests/integration/ui/post-editor-layout-shell.test.tsx`
   - potwierdzic context switch `Post/Block` po selection.
7. `tests/integration/ui/post-editor-smoke-regression.test.tsx`
   - dodac przypadek delete -> redirect `/admin/posts`.

---

## Sub-Tasks
1. Refactor `DocumentInspector` section order i visual style.
2. Dolozyc progressive disclosure wrapper dla advanced metadata.
3. Zweryfikowac `BlockInspector` compatibility z nowym shell.
4. Zaktualizowac testy inspector context i persistence.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-block-inspector.test.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Pseudocode
```ts
<PostInspectorTab>
  <PublishingSection status={status} scheduledAt={scheduledAt} publishedAt={publishedAt} />
  <CategoriesSection categoryId={categoryId} />
  <TagsSection tagsInput={tagsInput} />
  <FeaturedImageSection featuredImage={featuredImage} />
  <DangerZone action="Move to trash" />
  <AdvancedSection defaultCollapsed>
    <SeoFields seo={seoDraft} />
    <TechnicalMetadata />
  </AdvancedSection>
</PostInspectorTab>
```

---

## Acceptance Criteria
1. `Post` tab ma flow zgodny z referencja, bez utraty potrzebnych opcji.
2. `Block` tab dziala bez regresji.
3. Selection kontekstowa poprawnie przelacza panel.

---

## Testing Requirements
- Integration UI:
  - post tab section ordering
  - block tab context switch
  - advanced section collapse/expand
  - danger zone area rendered in document tab
  - delete success redirects to `/admin/posts`
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-block-inspector.test.tsx tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (right inspector contracts)
- `_docs/CMS_API.md` (post inspector behavior notes)
