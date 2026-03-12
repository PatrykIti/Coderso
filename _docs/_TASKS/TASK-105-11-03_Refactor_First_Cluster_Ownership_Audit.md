# TASK-105-11-03: Refactor-First Cluster Ownership Audit
# FileName: TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-11-01, TASK-105-11-02  
**Status:** To Do

---

## Overview

Re-audit the remaining `tests/unit/*` clusters that were previously marked `refactor first` and classify what:
- still must stay in Bun,
- can now move to Vitest after incremental refactors,
- needs a new dedicated migration task instead of ad-hoc cleanup.

## Scope

1. `tests/unit/posts/*`
2. `tests/unit/forms/*`
3. `tests/unit/search/*`
4. `tests/unit/server/*`
5. `tests/unit/assistant/*`
6. `tests/unit/validation/*`

## Acceptance Criteria

1. Remaining Bun unit suites are explicitly justified.
2. Newly-eligible Bun-free suites are called out with concrete migration targets.
3. No ambiguous cluster remains undocumented.

## Testing Requirements

- documentation and ownership review against current source/runtime coupling
- targeted smoke validation if any suite ownership actually changes

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md`
- `tests/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
