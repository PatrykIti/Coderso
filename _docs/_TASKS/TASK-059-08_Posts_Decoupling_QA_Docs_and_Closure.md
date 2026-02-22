# TASK-059-08: Posts Decoupling QA, Docs, and Closure
# FileName: TASK-059-08_Posts_Decoupling_QA_Docs_and_Closure.md

**Priority:** Medium  
**Category:** QA/Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059-01, TASK-059-02, TASK-059-03, TASK-059-04, TASK-059-05, TASK-059-06, TASK-059-07  
**Status:** To Do

---

## Overview
Domknac caly TASK-059 przez pelne testy, finalna dokumentacje i wpisy changelog + kanban sync.

## Scope
1. Pelny pass checkow:
   - `bun --cwd core lint`,
   - `bun --cwd core lint:types`,
   - `bun test` (pelny zestaw),
   - dedykowane integration dla migracji posts.
2. Finalny regression review:
   - posts CRUD, autosave, revisions, preview, publish,
   - runtime widget `posts-feed`,
   - listings/search source `posts`.
3. Dokumentacja:
   - architektura finalna po decouplingu,
   - kontrakt API/posts runtime/widget.
4. Changelog + task board closure.

## Files to Create / Change
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md` (jesli zmiany cache policy)
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/<next>.md`

## Pseudocode
```sh
bun --cwd core lint
bun --cwd core lint:types
bun test
```

## Acceptance Criteria
1. Full test suite przechodzi bez regresji.
2. TASK-059 i wszystkie subtaski maja status `Done`.
3. Dokumentacja/changelog odzwierciedla finalny kontrakt posts jako niezaleznego bytu.

## Testing Requirements
- Full regression matrix.
- Dedicated migration + runtime widget regression cases.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
