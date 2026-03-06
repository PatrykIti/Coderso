# TASK-105-08: Final Per-File 100% Gap Closure
# FileName: TASK-105-08_Final_Per_File_100_Gap_Closure.md

**Priority:** High  
**Category:** QA + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01..07  
**Status:** To Do

---

## Overview

Finish the remaining small branch/statement/line gaps after the bigger waves land.

## Scope

1. Re-run Vitest coverage.
2. Sort by remaining uncovered lines.
3. Close final per-file gaps.

## Pseudocode

```ts
const remaining = parseVitestCoverage().filter((file) => file.linePct < 100);
for (const file of remaining) addSpecificGapTests(file);
```

## Acceptance Criteria

1. Every Vitest-owned file reaches `100%` lines/functions/branches/statements where applicable.
2. No files are removed from ownership just to satisfy the metric.

## Testing Requirements

- `bun run test:coverage`

## Documentation Updates Required

- `tests/RUNNER_OWNERSHIP.md`
