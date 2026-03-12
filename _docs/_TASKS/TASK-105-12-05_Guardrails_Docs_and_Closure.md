# TASK-105-12-05: Guardrails, Docs, and Closure
# FileName: TASK-105-12-05_Guardrails_Docs_and_Closure.md

**Priority:** Medium  
**Category:** Docs + Architecture  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-12-01, TASK-105-12-02, TASK-105-12-03, TASK-105-12-04  
**Status:** Done (2026-03-12)

---

## Overview

Document the import-boundary rules so future contributors stop creating mixed modules that break Bun/Vitest ownership.

## Acceptance Criteria

1. `AGENTS.md` explicitly warns against import-time DB/settings/runtime coupling in Bun-free modules.
2. `_docs/TESTING_STRATEGY.md` and `tests/README.md` explain the same rule at architecture level.
3. The task board and changelog are synchronized for the refactor track.

## Completion Notes

- Added an explicit import-boundary rule to `AGENTS.md`.
- Added the same architectural rule to `_docs/TESTING_STRATEGY.md` and `tests/README.md`.
- This establishes the expected coding pattern for Bun/Vitest-friendly modules before further refactor slices land.

## Testing Requirements

- docs review for consistency with shipped code and command surface

## Documentation Updates Required

- `AGENTS.md`
- `_docs/TESTING_STRATEGY.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
