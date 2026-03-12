# TASK-105-11-02: Custom Screens and Pure Domain Legacy Suites Move to Vitest
# FileName: TASK-105-11-02_Custom_Screens_and_Pure_Domain_Legacy_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-01  
**Status:** To Do

---

## Overview

Migrate the next Bun-free legacy suites that still validate pure domain logic rather than Bun runtime behavior.

## Scope

1. `tests/unit/customScreens/*`
2. remaining Bun-free helper/domain suites in `tests/unit/sdk/*`
3. selected pure-domain leaves that still have no Vitest equivalent but do not depend on DB/runtime/plugin lifecycle

## Candidate Targets

- `tests/unit/customScreens/bindingResolver.test.ts`
- legacy SDK helpers that remain Bun-free after the duplicate cleanup
- selected pure-domain leaves identified during the ownership sweep

## Acceptance Criteria

1. Pure custom-screen and SDK helper suites no longer depend on `bun:test`.
2. The moved suites run green under `tests/vitest/*`.
3. Coverage ownership for `core/services/customScreens/*` and related helpers becomes cleaner and more explicit.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11_Legacy_Bun_Free_Test_Migration_Cleanup.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
