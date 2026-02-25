# TASK-063-12-05: Right Inspector Parity Post/Block with Progressive Disclosure
# FileName: TASK-063-12-05_Right_Inspector_Parity_Post_Block_with_Progressive_Disclosure.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-01, TASK-063-12-04  
**Status:** To Do

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
  <PublishingSection />
  <CategoriesSection />
  <TagsSection />
  <FeaturedImageSection />
  <DangerZone />
  <AdvancedSection collapsed default>
    <SeoFields />
    <ExtendedMetadata />
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
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-block-inspector.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (right inspector contracts)
- `_docs/CMS_API.md` (post inspector behavior notes)
