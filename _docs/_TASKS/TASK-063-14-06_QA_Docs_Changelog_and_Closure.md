# TASK-063-14-06: QA Docs Changelog and Closure
# FileName: TASK-063-14-06_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-14-02, TASK-063-14-03, TASK-063-14-04, TASK-063-14-05  
**Status:** To Do

---

## Overview
Domknac walidacje, dokumentacje i changelog dla taska `TASK-063-14`.

---

## Scope
1. Uruchomic lint/types oraz dedykowane testy richtext command matrix.
2. Uruchomic full regression gates.
3. Zaktualizowac task board i changelog.
4. Potwierdzic parity matrix po poprawkach command behavior.

---

## Detailed File-Level Plan
1. `_docs/_TASKS/README.md`
   - statusy `TASK-063-14` i subtaskow.
2. `_docs/_CHANGELOG/README.md`
   - wpis nowego changelogu.
3. `_docs/_CHANGELOG/<new>.md`
   - szczegoly fixow command reliability.
4. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
   - final status command parity.

---

## Acceptance Criteria
1. Wszystkie taski `063-14-01..06` maja status `Done`.
2. Changelog i board sa zsynchronizowane.
3. QA gates przechodza bez bledow.

---

## Testing Requirements
- Mandatory:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`
- Plus targeted:
  - `bun test tests/unit/posts/post-richtext-serializer.test.ts`
  - `bun test tests/integration/ui/post-editor-richtext-commands.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
