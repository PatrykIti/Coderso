# TASK-104-01: Coverage Audit and Runner Ownership Matrix
# FileName: TASK-104-01_Coverage_Audit_and_Runner_Ownership_Matrix.md

**Priority:** High  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-104  
**Status:** To Do

---

## Overview

Build the source-of-truth matrix for:
- current Bun baseline coverage hotspots,
- unit test ownership (`Vitest`, `Bun`, `refactor first`),
- target migration waves.

## Scope

1. Extract coverage hotspots from `coverage/bun/lcov.info`.
2. Group files by area and ownership intent.
3. Publish a ranked backlog of areas to attack next.

## Initial Targets

- `core/admin/ui/widgets/*`
- `core/admin/utils/*`
- `core/admin/services/*`
- `packages/sdk/src/*`
- `core/services/customScreens/*`
- `core/services/search/*`

## Files to Create / Change

- optional machine-readable audit artifact under `tests/` or `.tmp/`
- `_docs/_TASKS/TASK-104_Bun_Coverage_Remediation_and_Runner_Ownership_Program.md`
- `tests/README.md`

## Pseudocode

```ts
const audit = parseLcov("coverage/bun/lcov.info");
const grouped = groupByArea(audit);
const ownership = classifyUnitSuites();

publishMatrix({
  hotspots: grouped,
  ownership,
});
```

## Acceptance Criteria

1. Every high-risk low-coverage area has an explicit owner category.
2. The matrix can be used to create wave-based implementation tasks without re-auditing manually.

## Testing Requirements

- `bun run test:coverage:bun`

## Documentation Updates Required

- `tests/README.md`
- main TASK-104 file
