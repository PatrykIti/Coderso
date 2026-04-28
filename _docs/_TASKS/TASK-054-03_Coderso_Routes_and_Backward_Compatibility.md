# TASK-054-03: Coderso Routes and Backward Compatibility
# FileName: TASK-054-03_Coderso_Routes_and_Backward_Compatibility.md

**Priority:** High  
**Category:** Admin/UI Routing + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-01, TASK-054-02  
**Status:** Done

---

## Goal
Introduce canonical `Coderso` routes while preserving old routes used by bookmarks, docs, and user habits.

## Files to Change
- `core/admin/app/AdminApp.tsx`
- `core/admin/utils/adminPaths.ts`
- `core/admin/ui/navigation/AdminLink.tsx`
- `tests/unit/ui/admin-router.test.tsx`

## Route Contract
- Canonical:
  - `/admin/coderso/engine`
  - `/admin/coderso/entries`
  - `/admin/coderso/widgets`
  - `/admin/coderso/forms`
  - `/admin/coderso/posts`
- Legacy aliases (redirect/replace):
  - `/admin/content-types` -> `/admin/coderso/engine`
  - `/admin/content` -> `/admin/coderso/entries`
  - `/admin/widgets` -> `/admin/coderso/widgets`
  - `/admin/forms` -> `/admin/coderso/forms`

## Pseudocode
```ts
const routeAliases: Record<string, string> = {
  "/admin/content-types": "/admin/coderso/engine",
  "/admin/content": "/admin/coderso/entries",
  "/admin/widgets": "/admin/coderso/widgets",
  "/admin/forms": "/admin/coderso/forms",
};

function resolveAdminRoute(pathname: string) {
  return routeAliases[pathname] ?? pathname;
}

if (resolved !== pathname) {
  navigate(resolved, { replace: true });
}
```

## Acceptance Criteria
1. Old links open expected Coderso screens.
2. No navigation loops for aliases.
3. Deep links copied from browser stay stable on refresh.
