# TASK-105-01: Vitest Coverage Matrix and Invariants
# FileName: TASK-105-01_Vitest_Coverage_Matrix_and_Invariants.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105  
**Status:** Done (2026-03-06)

---

## Overview

Freeze the exact list of uncovered and partially covered Vitest-owned files before the deeper waves start.

## Scope

1. Snapshot current `coverage/vitest/lcov.info`.
2. Group files into:
   - zero coverage,
   - low coverage but small files,
   - large product clusters,
   - branch-only cleanup.
3. Publish the execution matrix used by the rest of `TASK-105`.

## Candidate Outputs

- `tests/RUNNER_OWNERSHIP.md` update
- optional machine-readable snapshot in `.tmp/` or `tests/`

## Pseudocode

```ts
const report = parseVitestLcov();
const grouped = classifyByGap(report);
publishVitestMatrix(grouped);
```

## Acceptance Criteria

1. Every later subtask can point at frozen file groups.
2. The repo has one clear definition of what remains between current state and `100%`.

## Completion Notes

- initial baseline captured at `38.01 / 33.57 / 31.52 / 40.18`
- current re-baseline after delivered waves: `40.73 / 36.10 / 34.93 / 43.04`
- execution order remains `zero-first -> small leafs -> medium product clusters -> large editor/widgets`

## Testing Requirements

- `bun run test:coverage`

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md`
