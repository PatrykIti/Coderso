# TASK-104-05: Refactor-First Domain and Posts Eligibility
# FileName: TASK-104-05_Refactor_First_Domain_and_Posts_Eligibility.md

**Priority:** Medium  
**Category:** Platform + Refactor Safety  
**Estimated Effort:** Large  
**Dependencies:** TASK-104-01  
**Status:** To Do

---

## Overview

Some low-coverage areas should not be moved blindly.
They first need eligibility refactors so tests can move to Vitest without pulling Bun/runtime concerns with them.

## Priority Areas

- `assistant`
- `posts`
- `search`
- `forms`
- `server`
- `validation`

## Example Refactor Targets

- split pure selectors/normalizers from runtime adapters
- move schema/validation helpers out of runtime modules
- isolate `Bun.*`, DB, or route orchestration from pure logic

## Files to Create / Change

- domain modules in `core/services/*`
- selected `tests/unit/*`
- optional helper modules extracted from runtime-heavy files

## Pseudocode

```ts
const { runtimeAdapter, pureLogic } = splitRuntimeAndPureParts(module);
keepBunTests(runtimeAdapter);
moveVitestTests(pureLogic);
```

## Acceptance Criteria

1. Refactor-first areas are explicitly decomposed before any migration attempt.
2. New pure seams are created only where they reduce long-term runner confusion.

## Testing Requirements

- targeted Bun suites for runtime adapters
- targeted Vitest suites for extracted pure logic

## Documentation Updates Required

- `tests/README.md`
- relevant task notes
