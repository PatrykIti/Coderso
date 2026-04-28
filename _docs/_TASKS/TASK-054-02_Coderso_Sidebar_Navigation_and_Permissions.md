# TASK-054-02: Coderso Sidebar Navigation and Permissions
# FileName: TASK-054-02_Coderso_Sidebar_Navigation_and_Permissions.md

**Priority:** High  
**Category:** Admin/UI + Security/RBAC  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-01  
**Status:** Done

---

## Goal
Wire Coderso group into sidebar and apply permission-aware visibility per module.

## Files to Change
- `core/admin/app/AdminShell.tsx`
- `core/admin/app/AdminApp.tsx`
- `core/admin/config/adminNav.ts` (or current nav source)
- `core/admin/ui/navigation/*`
- `tests/unit/ui/admin-shell-nav.test.tsx`

## Behavior
- Group expand/collapse state persisted in admin UI state.
- Child item visibility controlled by existing permission mapping.
- If all children hidden for a role, hide the entire `Coderso` group.

## Pseudocode
```ts
const children = getCodersoChildren().filter((item) => hasPermission(item.permission));
const showGroup = children.length > 0;

if (showGroup) {
  renderCollapsibleGroup({
    id: "coderso",
    label: "Coderso",
    children,
    expanded: uiState.navGroups.coderso ?? true,
    onToggle: (next) => setUiState("navGroups.coderso", next),
  });
}
```

## Acceptance Criteria
1. `Coderso` group appears and toggles correctly.
2. Permissions hide unauthorized child modules.
3. Active route highlights parent and child correctly.
