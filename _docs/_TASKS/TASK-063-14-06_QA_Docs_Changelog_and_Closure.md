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

## Closure Checklist (Hard Gate)
1. Wszystkie taski `TASK-063-14-01..06` maja status `Done` z data i krotkim closure note.
2. Wyniki testow (z sekcji "Testing Requirements (Target)") sa udokumentowane w changelog entry.
3. `_docs/_TASKS/README.md` pokazuje `TASK-063-14` w sekcji `Done`.
4. `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` zawiera final command matrix + ownership split (bez TODO).
5. Changelog ma finalny wpis zamykajacy (nie `phase 1`), a `_docs/_CHANGELOG/README.md` ma index entry.

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
4. Final docs jasno opisuja semantyke komend i ownership, bez niejednoznacznosci implementacyjnych.

---

## Testing Requirements (Target)
- Mandatory quality gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Required richtext command suites:
  - `bun test tests/unit/posts/post-richtext-command-engine.test.ts`
  - `bun test tests/unit/posts/post-richtext-serializer.test.ts`
  - `bun test tests/unit/posts/post-paste-normalizer.test.ts`
  - `bun test tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx`
  - `bun test tests/unit/ui/post-editor-block-inspector-ownership.test.tsx`
  - `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx`
  - `bun test tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-richtext-selection-contract.test.tsx`
  - `bun test tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx`
- Broader UI regression for post editor shell:
  - `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`
  - `bun test tests/integration/ui/post-editor-writing-canvas-flow.test.tsx`
  - `bun test tests/integration/ui/post-block-inspector.test.tsx`
  - `bun test tests/integration/ui/post-richtext-toolbar.test.tsx`
  - `bun test tests/integration/ui/post-editor-paste-from-word.test.tsx`
  - `bun test tests/integration/ui/post-editor-paste-image.test.tsx`
- Full regression before closure:
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/ARCHITECTURE.md`
