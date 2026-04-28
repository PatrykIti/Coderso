# TASK-105-02: Admin Services Zero Coverage Wave
# FileName: TASK-105-02_Admin_Services_Zero_Coverage_Wave.md

**Priority:** High  
**Category:** QA + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-01  
**Status:** Done (2026-03-06)

---

## Overview

Cover the smallest zero-coverage service/client files first. These are the fastest legitimate gains.

## Priority Files

- `core/admin/services/apiKeysClient.ts`
- `core/admin/services/emailClient.ts`
- `core/admin/services/integrationsClient.ts`
- `core/admin/services/taxonomyClient.ts`
- `core/admin/services/webhooksClient.ts`
- `core/admin/utils/sessionCache.ts`

## Pseudocode

```ts
test("client builds correct request path");
test("client handles empty/default states");
test("cache helper reads/writes stable keys");
```

## Acceptance Criteria

1. All listed zero-coverage files gain direct tests.
2. Coverage rises through real path/method/state assertions, not snapshots alone.

## Completion Notes

- shipped direct Vitest suites for `apiKeysClient`, `emailClient`, `integrationsClient`, `taxonomyClient`, `webhooksClient`, and `sessionCache`
- verified via targeted Vitest and full coverage reruns

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
