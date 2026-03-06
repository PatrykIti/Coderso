# TASK-104-06: Bun Baseline Purity and Runtime Coverage Hardening
# FileName: TASK-104-06_Bun_Baseline_Purity_and_Runtime_Coverage_Hardening.md

**Priority:** High  
**Category:** QA + Runtime + Coverage  
**Estimated Effort:** Large  
**Dependencies:** TASK-104-01, TASK-104-02, TASK-104-03, TASK-104-04  
**Status:** To Do

---

## Overview

After Bun-free suites move away, improve real Bun-owned coverage instead of widening Bun scope further.

## Scope

1. Keep `test:coverage:bun` focused on true Bun-owned surfaces.
2. Add/expand tests for runtime-owned gaps.
3. Re-measure and compare coverage after each migration wave.

## Priority Bun Areas

- plugin assets/runtime loader
- perf helpers and request metrics under Bun
- route/runtime integration helpers that remain Bun-owned
- DB-backed service suites that are intentionally Bun-owned

## Files to Create / Change

- Bun-owned tests in `tests/integration/*`, `tests/perf/*`, `tests/security/*`
- `package.json` coverage commands if baseline scope changes
- docs explaining baseline vs full Bun coverage

## Pseudocode

```ts
if (isTrueBunOwner(file)) {
  addRuntimeCoverage(file);
} else {
  removePressureByMovingSuiteToVitest(file);
}
```

## Acceptance Criteria

1. Bun baseline becomes a cleaner runtime quality signal.
2. Coverage rises because of true Bun-owned testing, not because of distorted scope.

## Testing Requirements

- `bun run test:coverage:bun`
- `bun run test:coverage:bun:full` when env is available

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `tests/README.md`
