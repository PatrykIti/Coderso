# TASK-102-05: Docs, CI Rollout, and Adoption Guardrails
# FileName: TASK-102-05_Docs_CI_Rollout_and_Adoption_Guardrails.md

**Priority:** Medium  
**Category:** Docs + QA + Contributor Experience  
**Estimated Effort:** Medium  
**Dependencies:** TASK-102-01..04  
**Status:** Done (2026-03-06)

---

## Overview

Close the rollout by documenting the final runner split, CI commands, contributor rules, and task-board status.
This subtask makes the hybrid strategy sustainable for future work.

## Scope

1. Finalize repo docs for testing and coverage.
2. Update command references and contributor-facing examples.
3. Add closure notes for the adopted model.
4. Sync task board and changelog when implementation lands.

## Documentation Targets

- `README.md`
- `_docs/README.md`
- `_docs/ARCHITECTURE.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` (at implementation closure)

## Contributor Guardrails

- New pure TS/UI tests should default to Vitest.
- New runtime-kernel tests should default to Bun.
- New application code should avoid direct `Bun.*` usage outside runtime adapters.
- Coverage discussions must reference the correct lane.

## Pseudocode

```ts
if (newTest.targetsRuntimeKernel) {
  requireRunner("bun");
} else if (newTest.targetsPureDomainOrUi) {
  requireRunner("vitest");
}

publishDocs();
syncTaskBoard();
syncChangelogWhenImplemented();
```

## Acceptance Criteria

1. Contributor documentation reflects the final hybrid model.
2. CI docs and task docs no longer imply a single-runner worldview.
3. Task board and closure docs stay synchronized with actual rollout status.

## Testing Requirements

- Validate all documented commands after implementation.
- Ensure docs do not describe unimplemented behavior as already shipped.

## Documentation Updates Required

- `README.md`
- `_docs/README.md`
- `_docs/ARCHITECTURE.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/CODERSO_RELEASE_GATES.md`

## Completion Notes (2026-03-06)

- Synced docs across repo entrypoints (`README.md`, `_docs/TESTING_STRATEGY.md`, `_docs/CODERSO_RELEASE_GATES.md`, `AGENTS.md`, `tests/README.md`).
- Added CI/testing workflow and finalized task board plus changelog closure.
