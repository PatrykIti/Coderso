# TASK-063-09-01: Regression Test Execution Plan
# FileName: TASK-063-09-01_Regression_Test_Execution_Plan.md

**Priority:** High  
**Category:** QA  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-08-03  
**Status:** To Do

---

## Overview
Wykonac pelny plan testow regresyjnych dla TASK-063 i zebrac raport.

---

## Scope
1. Uruchomic lint/types/full tests.
2. Dopisac brakujace testy z listy acceptance taskow 063-02..08.
3. Zebrac raport pass/fail i ewentualne residual risks.

---

## Files to Create / Change
- `tests/integration/ui/*post-editor*.test.tsx`
- `tests/unit/posts/*`
- `_docs/UI/POST_EDITOR_GUTENBERG_ROLLOUT_REPORT.md` (new)

---

## Pseudocode
```ts
run lint/types/tests
if failing: fix code/tests without production fallbacks
publish rollout report with residual risk list
```

---

## Acceptance Criteria
1. Wszystkie gate testy przechodza.
2. Raport QA istnieje i ma statusy.

---

## Testing Requirements
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_GUTENBERG_ROLLOUT_REPORT.md`
