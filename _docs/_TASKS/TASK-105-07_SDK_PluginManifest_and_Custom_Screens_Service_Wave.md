# TASK-105-07: SDK Plugin Manifest and Custom Screens Service Wave
# FileName: TASK-105-07_SDK_PluginManifest_and_Custom_Screens_Service_Wave.md

**Priority:** Medium  
**Category:** QA + SDK + Domain  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-01  
**Status:** Done (2026-03-06)

---

## Overview

Cover two strategically important domains that still have glaring gaps:
- SDK/plugin manifest logic,
- custom screens domain service.

## Priority Files

- `packages/sdk/src/pluginManifest.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/services/customScreens/bindingResolver.ts`
- `core/admin/services/customScreensClient.ts`

## Notes

Some of these may require:
- better unit seams,
- test doubles,
- or explicit split between pure logic and DB/runtime adapters.

## Pseudocode

```ts
validateManifestBranches();
assertManifestErrorCodes();
testCustomScreenServiceValidationAndStateTransitions();
```

## Acceptance Criteria

1. SDK manifest logic is covered by real branch tests.
2. Custom screens service gains direct behavioral coverage, not only UI proxy coverage.

## Completion Notes

- `packages/sdk/src/pluginManifest.ts` now has direct manifest validation and normalization tests
- `packages/sdk/src/client.ts` and `packages/sdk/src/server.ts` gained direct registration-path tests
- `core/services/customScreens/customScreenService.ts` gained direct service and normalization coverage

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
