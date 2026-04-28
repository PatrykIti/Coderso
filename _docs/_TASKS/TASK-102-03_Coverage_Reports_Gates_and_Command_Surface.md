# TASK-102-03: Coverage Reports, Gates, and Command Surface
# FileName: TASK-102-03_Coverage_Reports_Gates_and_Command_Surface.md

**Priority:** High  
**Category:** QA + CI + Platform Reliability  
**Estimated Effort:** Medium  
**Dependencies:** TASK-102, TASK-102-01, TASK-102-02, TASK-054-19  
**Status:** Done (2026-03-06)

---

## Overview

Define how coverage and quality gates work after the runner split.
The goal is to avoid one misleading global metric while still producing practical CI outputs.

## Scope

1. Define Bun coverage role for runtime lanes.
2. Define Vitest coverage role for pure TS/UI lanes.
3. Add command naming that keeps contributor workflow clear.
4. Update release gates to reflect runner ownership.

## Coverage Rules

### Bun lane

- Coverage is advisory for executed runtime files.
- Reports use `text` and `lcov`.
- Bun remains authoritative for perf/security/runtime contract suites.

### Vitest lane

- Coverage is source-wide for selected app/UI/SDK code.
- Reports use `text`, `html`, `lcov`, `json-summary`.
- Thresholds should be per-lane and optionally per-file.

## Planned Commands

```json
{
  "test": "bun run test:bun && bun run test:vitest",
  "test:bun": "bun test tests/integration tests/perf tests/security",
  "test:vitest": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:coverage:bun": "bun test --coverage tests/integration tests/perf tests/security"
}
```

## Planned CI Model

```yaml
jobs:
  quality:
    steps:
      - run: bun --cwd core lint
      - run: bun --cwd core lint:types
      - run: bun run test:bun
      - run: bun run test:vitest
      - run: bun run test:coverage
```

## Files to Create / Change

- `package.json`
- CI workflow files
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/TESTING_STRATEGY.md`

## Pseudocode

```ts
const bunResult = await run("test:bun");
const vitestResult = await run("test:vitest");
const vitestCoverage = await run("test:coverage");

if (!bunResult.ok) fail("runtime_lane_failed");
if (!vitestResult.ok) fail("pure_lane_failed");
if (!vitestCoverage.ok) fail("coverage_lane_failed");
```

## Acceptance Criteria

1. Commands make runner ownership obvious.
2. Coverage outputs are lane-specific and non-misleading.
3. Release-gate docs explain why perf/security/runtime suites remain on Bun.

## Testing Requirements

- Validate command names against workspace expectations.
- Dry-run CI command graph after implementation.

## Documentation Updates Required

- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/TESTING_STRATEGY.md`
- `README.md`

## Completion Notes (2026-03-06)

- Added `test:coverage`, `test:coverage:bun`, `test:coverage:bun:full`, and `test:coverage:all`.
- Split Bun baseline coverage from the broader environment-dependent Bun full sweep.
- Added CI workflow `.github/workflows/testing-lanes.yml` with artifacts for `coverage/vitest` and `coverage/bun`.
