# TASK-063-12-08: QA, Docs, Changelog, and Closure
# FileName: TASK-063-12-08_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA/Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-02, TASK-063-12-03, TASK-063-12-04, TASK-063-12-05, TASK-063-12-06, TASK-063-12-07  
**Status:** To Do

---

## Overview
Finalnie domknac rollout `TASK-063-12`:
- pelna walidacja quality gates,
- porownanie parity vs referencja,
- docs/changelog/kanban sync.

---

## Scope
1. Wykonac lint/types/test suites.
2. Zrobic final parity checklist (`reference matrix`) z pass/fail.
3. Uzupelnic docs architecture/API/module notes.
4. Dodac changelog i zsynchronizowac statusy taskow.

---

## Current State Analysis (Repo)
1. Testy istnieja dla header/layout/canvas/inspector/settings/responsive, ale aktualnie odzwierciedlaja pre-parity behavior.
2. Brakuje fizycznego pliku parity matrix dla `46-post-editor` jako source-of-truth odbioru.
3. Brakuje finalnego changelog wpisu dla `TASK-063-12`.
4. `TASK-063` i board sa juz przygotowane na nowy epik, ale closure wymaga aktualizacji statusow po wdrozeniu.

---

## Final Closure Decisions
1. Warunkiem zamkniecia jest zielone `lint + lint:types + full test gates`.
2. Finalny parity report musi explicite oznaczyc:
   - `must-match` areas,
   - `allowed deviations`,
   - `residual risks`.
3. Changelog i docs sa mandatory i traktowane jako czesc Definition of Done.
4. Jesli jakikolwiek gate nie przejdzie, task pozostaje `In Progress` (brak soft-close).

---

## Exact QA Execution Plan
1. `bun --cwd core lint`
2. `bun --cwd core lint:types`
3. `bun test tests/unit tests/integration tests/perf tests/security`
4. Targeted UI regression reruns:
   - `bun test tests/integration/ui/post-editor-header-workflow.test.tsx`
   - `bun test tests/integration/ui/post-editor-listview-outline.test.tsx`
   - `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx`
   - `bun test tests/integration/ui/post-block-inspector.test.tsx`
   - `bun test tests/integration/ui/post-editor-settings-dialog.test.tsx`
   - `bun test tests/integration/ui/post-editor-layout-responsive.test.tsx`
   - `bun test tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Manual QA Checklist (Must Pass)
1. Header: left context + right primary actions + gear modal open/close.
2. Left rail: `Outline` default, insert `+`, list tab optional.
3. Canvas: width/spacing/title parity + media placeholder behavior.
4. Right rail: `Post/Block` switch + advanced collapse + danger zone.
5. Focus mode: hide + restore side panel state.
6. Mobile: sheets order and deterministic open/close.

---

## Sub-Tasks
1. Run mandatory gates i naprawic regresje.
2. Uzupelnic rollout report z residual risks.
3. Zaktualizowac `_docs/_TASKS/README.md` i status umbrella taskow.
4. Dodac finalny wpis changelog dla `TASK-063-12`.

---

## Physical Files (Planned)
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

---

## Pseudocode
```bash
bun --cwd core lint
bun --cwd core lint:types
bun test tests/unit tests/integration tests/perf tests/security
```

```ts
const parityReport = compareFinalUiWithReference();
assert(parityReport.criticalMismatches.length === 0);
publishDocsAndChangelog(parityReport);
```

---

## Acceptance Criteria
1. Wszystkie quality gates sa zielone.
2. Parity matrix ma status finalny i udokumentowane ewentualne dozwolone odchylenia.
3. TASK-063-12 i subtaski sa zsynchronizowane z board/changelog/docs.
4. Wpis changelog zawiera task IDs `TASK-063-12` oraz `TASK-063-12-01..08`.

---

## Testing Requirements
- Mandatory:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`
- Manual smoke:
  - header actions and gear modal
  - left outline primary flow
  - right inspector context
  - focus mode and responsive sheets
  - preview/publish/revisions flow without regressions

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
