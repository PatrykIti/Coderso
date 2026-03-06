# TASK-102-01: Runtime Kernel Test Boundaries and Bun Suite Ownership
# FileName: TASK-102-01_Runtime_Kernel_Test_Boundaries_and_Bun_Suite_Ownership.md

**Priority:** High  
**Category:** Platform + Runtime + QA  
**Estimated Effort:** Medium  
**Dependencies:** TASK-102, TASK-015, TASK-054-19  
**Status:** To Do

---

## Overview

Define exactly which tests must stay in Bun because they validate runtime-kernel behavior.
This subtask protects the WordPress-like product contract from being diluted by a blanket migration to Vitest.

## Scope

1. Inventory current Bun-only suites and code paths that rely on:
   - `Bun.serve`
   - `Bun.file`
   - runtime plugin activation
   - on-disk bundle reads
   - runtime asset serving
2. Create a durable ownership matrix for Bun suites.
3. Mark ambiguous suites for adapter refactor or later review.

## Candidate Areas

- `core/server/*`
- runtime plugin/store install flows
- `tests/integration/store/*`
- `tests/integration/server/*`
- `tests/perf/*`
- `tests/security/*`

## Files to Create / Change

- `_docs/TESTING_STRATEGY.md`
- `_docs/ARCHITECTURE.md`
- optional `tests/README.md` or lane-level notes if needed

## Ownership Matrix

| Area | Runner | Reason |
|------|--------|--------|
| Runtime HTTP server | Bun | Uses `Bun.serve` and file/runtime semantics |
| Plugin install / rollback | Bun | Validates dynamic bundle lifecycle |
| Public/admin route runtime contracts | Bun | Must match production runtime behavior |
| Security gates | Bun | Release-blocking runtime hardening |
| Performance gates | Bun | Measures real runtime behavior |

## Pseudocode

```ts
function resolveRunnerForSuite(filePath: string): "bun" | "review" {
  if (importsBunRuntime(filePath)) return "bun";
  if (touchesRuntimeBundleLifecycle(filePath)) return "bun";
  if (belongsToPerfOrSecurityGate(filePath)) return "bun";
  return "review";
}
```

## Acceptance Criteria

1. Every runtime-kernel suite category has an explicit reason for staying on Bun.
2. No release-blocking runtime, security, or performance suite is proposed for Vitest.
3. Ambiguous suites are listed for later refactor instead of silently reassigned.

## Testing Requirements

- Validate the inventory against the actual repo layout.
- Cross-check critical runtime suites against current `bun test` execution paths.

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/ARCHITECTURE.md`
