# TASK-102: Hybrid Testing Strategy and Coverage Architecture
# FileName: TASK-102_Hybrid_Testing_Strategy_and_Coverage_Architecture.md

**Priority:** High  
**Category:** Platform + QA + Docs  
**Estimated Effort:** Large  
**Dependencies:** TASK-015, TASK-016, TASK-017, TASK-054-19, TASK-054-199  
**Status:** To Do

---

## Overview

Define and implement a testing architecture that matches the product shape of Nextless:
- Bun stays the runtime kernel,
- runtime plugin and widget bundles continue to work without unnecessary rebuilds,
- source-wide coverage improves for pure TS and admin/UI code without forcing runtime suites out of Bun.

This task is not a generic "migrate from Bun to Vitest".
It is a platform task that separates:
- runtime-kernel validation,
- pure application and UI validation,
- coverage signals,
- CI release gates.

## Business Context

Nextless is intentionally WordPress-like in runtime behavior:
- runtime plugins are installed and activated on disk,
- bundles are loaded dynamically,
- the CMS should not require a full rebuild every time behavior expands,
- the runtime environment is part of the product contract.

Because of that, Bun runtime tests are not incidental implementation details.
They are part of the business guarantee.

At the same time, the repo needs stronger coverage and faster feedback for:
- admin React UI,
- domain services,
- SDK contracts,
- pure widget and content logic.

The target state is a hybrid model:
- Bun for runtime kernel and release-blocking runtime gates,
- Vitest for Bun-free unit and UI suites with source-wide coverage.

## Goals

1. Preserve Bun as the only production runtime kernel.
2. Make runtime-bound suites explicit and stable instead of treating them as generic unit tests.
3. Introduce Vitest only for layers that should remain independent from Bun runtime APIs.
4. Add source-wide coverage for pure TS/UI lanes, including files currently untouched by tests.
5. Align CI and release gates with architecture boundaries instead of using one blended signal.

## Non-Goals

1. Replacing Bun as the production runtime.
2. Moving all tests to Vitest.
3. Chasing one global coverage percentage for the entire monorepo.
4. Rewriting runtime-kernel code only to satisfy test tooling.

## Architecture Rules

1. `Bun.*` APIs are allowed in runtime adapters and runtime-kernel code only.
2. Domain, SDK, and admin/UI code should depend on interfaces or plain JS/TS primitives.
3. Runtime/plugin lifecycle tests must execute in Bun.
4. Source-wide coverage should come from Vitest lanes, not from forcing runtime code into synthetic runners.

## Current Repo State

- Root scripts execute test suites through `bun test`.
- A large part of the suite imports `bun:test`.
- Some integration suites rely directly on `Bun.serve`.
- Runtime code uses `Bun.file` and `Bun.serve`.
- There is no central repo-level testing strategy document that explains runner ownership or coverage intent.

## Target State

### Bun owns

- runtime server contract,
- plugin install/upgrade/rollback flows,
- bundle loading and activation,
- real runtime route contracts,
- performance and security release gates.

### Vitest owns

- pure TS domain services,
- admin/UI suites,
- SDK contracts,
- Bun-free widget and content logic,
- source-wide coverage reports for these lanes.

## Files to Create / Change

- `_docs/TESTING_STRATEGY.md` (new)
- `_docs/ARCHITECTURE.md`
- `_docs/README.md`
- `README.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `vitest.config.ts` (planned)
- optional `tests/vitest/*` or migrated `tests/unit/*`
- CI workflow files and package scripts

## Sub-Tasks

1. `TASK-102-01_Runtime_Kernel_Test_Boundaries_and_Bun_Suite_Ownership.md`
2. `TASK-102-02_Vitest_Workspace_for_Pure_TS_Admin_and_SDK.md`
3. `TASK-102-03_Coverage_Reports_Gates_and_Command_Surface.md`
4. `TASK-102-04_Test_Utilities_Fixtures_and_Migration_Wave_1.md`
5. `TASK-102-05_Docs_CI_Rollout_and_Adoption_Guardrails.md`

## Implementation Order

1. Document ownership and lane boundaries.
2. Add Vitest config for Bun-free lanes only.
3. Migrate the easiest high-signal suites first (`tests/unit/ui/*`, SDK, pure services).
4. Keep Bun runtime/integration/perf/security lanes intact.
5. Add lane-specific coverage and CI gates.
6. Finalize docs, commands, and contributor guardrails.

## Pseudocode

```ts
for (const testFile of repoTests) {
  if (dependsOnBunRuntime(testFile) || validatesRuntimeContract(testFile)) {
    assignRunner(testFile, "bun");
    continue;
  }

  if (isPureDomainOrUi(testFile)) {
    assignRunner(testFile, "vitest");
    collectCoverage(testFile, "vitest");
    continue;
  }

  markForReview(testFile);
}
```

## Acceptance Criteria

1. The repo has one explicit testing strategy document aligned with WordPress-like runtime goals.
2. Bun and Vitest responsibilities are documented by lane, folder, and test type.
3. A migration plan exists that improves coverage without weakening runtime guarantees.
4. CI/release gates are described as lane-specific responsibilities.
5. Future contributors can decide runner ownership without guesswork.

## Testing Requirements

- Documentation review against current runtime assumptions.
- Proposed commands and config examples must be internally consistent.
- Any implementation follow-up must still run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - relevant Bun and Vitest suites for changed lanes

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `_docs/ARCHITECTURE.md`
- `_docs/README.md`
- `README.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_CHANGELOG/*.md` (only when implementation work lands)
