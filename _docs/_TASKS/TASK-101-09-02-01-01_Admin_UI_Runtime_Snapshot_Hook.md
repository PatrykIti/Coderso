# TASK-101-09-02-01-01: Admin UI Runtime Snapshot Hook
# FileName: TASK-101-09-02-01-01_Admin_UI_Runtime_Snapshot_Hook.md

**Priority:** High
**Category:** Admin/UI + Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-02-01
**Status:** To Do

---

## Overview

Dodac UI hook/provider, ktory zbiera route/active surface/selected entity/visible action hints dla `AssistantPanel` bez DOM scraping i bez surowych danych usera.

## Existing Code to Reuse

- `core/admin/ui/contexts/AdminRouterContext.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/utils/adminPaths.ts` / `@/utils/adminPaths`

## Files to Change

- `core/admin/ui/assistant/useAssistantAdminContext.ts` (new)
- `core/admin/ui/assistant/AssistantPanel.tsx` (update)
- `core/admin/ui/layouts/AdminShell.tsx` (update only if provider/prop bridge is needed)
- `tests/vitest/ui/use-assistant-admin-context.test.tsx` (new)

## Sub-Tasks

1. Resolve route from `useOptionalAdminRouter()` with safe `window.location` fallback.
2. Preserve active admin href from `AdminShell` or route-derived fallback.
3. Parse selected resource hints from known route shapes.
4. Derive visible action hints from route/surface allowlist, not DOM text.
5. Pass snapshot into `planAssistantActions` together with `includeResourceCatalog`.

## Testing Requirements

- Vitest UI hook tests with `AdminRouterProvider`.
- Test fallback without provider.
- Test no PII/session/auth data in snapshot.

## Documentation Updates Required

- Covered by parent closure.
