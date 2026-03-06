# TASK-104-03: Admin UI SSR and DOM Move to Vitest
# FileName: TASK-104-03_Admin_UI_SSR_and_DOM_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-104-01  
**Status:** Done (2026-03-06)

---

## Overview

Move Bun-free admin SSR and DOM helper tests to Vitest, especially where `renderToString`,
`document`, `window`, and selection APIs are the real test surface.

## Candidate Test Areas

- `tests/unit/ui/*`
- `tests/unit/authUi/*`
- `tests/unit/pageBuilder/*`
- DOM-rich editor helpers:
  - richtext selection/clear-formatting
  - admin router/admin shell SSR
  - sidebar/nav SSR

## Candidate Source Owners

- `core/admin/ui/contexts/*`
- `core/admin/ui/shared/*`
- `core/admin/ui/posts/editor/richtext/*`
- `core/admin/ui/pages/builder/*`

## Files to Create / Change

- `tests/vitest/ui/*`
- `tests/vitest/ui-dom/*`
- `tests/setup/vitest.ts`
- `vitest.config.ts`

## Pseudocode

```ts
if (suite.usesRenderToString || suite.usesDocumentWindowSelection) {
  moveToVitest(suite, {
    environment: suite.needsDom ? "happy-dom" : "node",
  });
}
```

## Acceptance Criteria

1. SSR/DOM-heavy admin helper suites are no longer Bun-owned by default.
2. DOM tests use explicit Vitest environment markers.
3. New admin helper tests default to `tests/vitest/*`.

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`

## Documentation Updates Required

- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`

## Completion Notes (2026-03-06)

- Migrated Bun-free `tests/unit/ui/*`, `tests/unit/authUi/*`, `tests/unit/pageBuilder/*`, and `tests/integration/ui/*` into Vitest lanes.
- Added `tests/vitest/ui-dom/*` coverage for DOM-dependent editor helpers.
