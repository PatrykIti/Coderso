# TASK-054-23-05: QA, Docs, Changelog, and Closure
# FileName: TASK-054-23-05_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium  
**Category:** QA + Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-23-01, TASK-054-23-02, TASK-054-23-03, TASK-054-23-04  
**Status:** To Do

---

## Overview

Domknac follow-up `Coderso/Screens` po zmianie kontraktu:
- walidacja runner ownership,
- docs source-of-truth sync,
- changelog,
- task board cleanup.

## Scope

1. Uruchomic lint/typecheck.
2. Uruchomic Bun route coverage dla touched custom screens API contract.
3. Uruchomic Vitest suites dla custom screens, widget registry scoping i admin UI flows.
4. Zaktualizowac docs i changelog.
5. Zamknac parent/subtasks w kanbanie.

## Sub-Tasks

1. Uruchomic finalny QA command set dla touched custom screens/widget surfaces.
2. Zaktualizowac docs source-of-truth dla kontraktu screens/widgets.
3. Dodac changelog entry i zsynchronizowac `_docs/_CHANGELOG/README.md`.
4. Przestawic taski/subtaski na `Done` i zaktualizowac `_docs/_TASKS/README.md`.

## Files to Create / Change

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*.md`
- `_docs/_TASKS/README.md`

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/customScreensRoutes.test.ts`
- `vitest run tests/vitest/admin/custom-screen-schemas.test.ts`
- `vitest run tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/bindingResolver.test.ts`
- `vitest run tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/widget-library.test.tsx`
- `vitest run tests/unit/widgets/registry.test.ts`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/_CHANGELOG/*.md`
- `_docs/_TASKS/README.md`
