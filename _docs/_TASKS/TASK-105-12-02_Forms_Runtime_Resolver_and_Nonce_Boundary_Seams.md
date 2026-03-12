# TASK-105-12-02: Forms Runtime Resolver and Nonce Boundary Seams
# FileName: TASK-105-12-02_Forms_Runtime_Resolver_and_Nonce_Boundary_Seams.md

**Priority:** High  
**Category:** Platform + Forms  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-12  
**Status:** Done (2026-03-12)

---

## Overview

Refactor the small mixed forms helpers so pure access/nonce logic can live cleanly in the Vitest lane.

## Scope

1. `core/services/forms/formRuntimeResolver.ts`
2. `core/services/forms/submissionNonce.ts`
3. matching tests for resolver access mode and nonce contract

## Acceptance Criteria

1. Pure forms runtime-access/nonce logic no longer imports DB/runtime modules at module load time.
2. The matching tests can move to Vitest cleanly.
3. Route or persistence behavior remains unchanged.

## Completion Notes

- Refactored `formRuntimeResolver.ts` so `formsService` is loaded lazily only inside the runtime data path.
- Moved `formRuntimeResolver.test.ts` and `submissionNonce.test.ts` into `tests/vitest/forms/*`.
- Confirmed the small access/nonce seam is now Vitest-safe without changing the runtime contract.

## Testing Requirements

- targeted `vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
