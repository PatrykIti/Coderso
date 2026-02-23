# TASK-063-04-02: Block Library Search and Categories
# FileName: TASK-063-04-02_Block_Library_Search_and_Categories.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-04-01  
**Status:** To Do

---

## Overview
Usprawnic block library w sidebarze: search, kategorie, wyniki.

---

## Scope
1. Wykorzystac i rozszerzyc `blockCatalog` metadata.
2. Dopisac filtrowanie po nazwie/keywords/category.
3. Pokazac puste stany i sekcje "Most used" (jesli sa dane).

---

## Files to Create / Change
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
- `core/admin/ui/posts/editor/sidebars/PostInserterSidebar.tsx`
- `tests/unit/posts/post-block-catalog-search.test.ts` (new)

---

## Pseudocode
```ts
results = searchCatalog(query).groupBy(category)
render tabs or grouped sections
onInsert(type) => insertBlock(type)
```

---

## Acceptance Criteria
1. Search znajduje bloki po label i keywords.
2. Wyniki sa czytelnie pogrupowane.

---

## Testing Requirements
- Unit: search/group helpers.
- Integration: insert from results.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (editor block catalog behavior)
