# TASK-104-04: SDK and Shared Contracts Move to Vitest
# FileName: TASK-104-04_SDK_and_Shared_Contracts_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + SDK + Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-104-01  
**Status:** Done (2026-03-06)

---

## Overview

Move SDK/shared contract tests out of Bun wherever runtime/database coupling is not required.

## Candidate Test Areas

- `tests/unit/sdk/exports.test.ts`
- `tests/unit/sdk/hookContext.test.ts`
- `tests/unit/plugins/pluginManifest.test.ts`
- `tests/unit/content/revisionSnapshot.test.ts`
- selected validation and schema tests with no DB/runtime dependency

## Candidate Source Owners

- `packages/sdk/src/*`
- `core/services/content/revisionSnapshot.ts`
- `core/plugins/runtime/manifestValidator.ts`

## Files to Create / Change

- `tests/vitest/sdk/*`
- optional `tests/vitest/contracts/*`
- `vitest.config.ts`

## Pseudocode

```ts
for (const suite of sharedContractSuites) {
  if (requiresDbOrRuntime(suite)) keepInBun(suite);
  else moveToVitest(suite);
}
```

## Acceptance Criteria

1. SDK/shared contract tests stop inflating Bun backlog when they do not need Bun.
2. `packages/sdk/src/*` gets clearer Vitest ownership.

## Testing Requirements

- `bun run test:vitest`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`

## Documentation Updates Required

- `tests/README.md`

## Completion Notes (2026-03-06)

- Moved Bun-free shared contract suites such as `hookContext`, `exports`, and `revisionSnapshot` into Vitest.
- Left `pluginManifest.test.ts` in Bun after validation confirmed runtime/database coupling through plugin runtime helpers.
