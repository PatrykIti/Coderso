# TASK-054-04: Coderso Module Shell and Responsive Behavior
# FileName: TASK-054-04_Coderso_Module_Shell_and_Responsive_Behavior.md

**Priority:** Medium  
**Category:** Admin/UI + Responsive UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-02, TASK-054-03  
**Status:** Done

---

## Goal
Ensure Coderso module pages use consistent shell behavior, loading states, and mobile navigation patterns.

## Files to Change
- `core/admin/app/AdminShell.tsx`
- `core/admin/ui/layout/*`
- `core/admin/ui/*Page.tsx` for Coderso modules
- `tests/unit/ui/admin-responsive-nav.test.tsx`

## UX Rules
- Desktop: Coderso collapsible tree in left sidebar.
- Mobile: tapping a child item closes drawer and navigates.
- Loading states match existing admin standards (skeleton first, no full-screen flash).
- Empty states explain module purpose in non-technical language.

## Pseudocode
```tsx
function CodersoModulePage({ title, loading, empty, children }) {
  return (
    <AdminPageLayout title={title}>
      {loading ? <ModuleSkeleton /> : empty ? <ModuleEmptyState /> : children}
    </AdminPageLayout>
  );
}

const onMobileNavSelect = (href: string) => {
  navigate(href);
  setMobileNavOpen(false);
};
```

## Acceptance Criteria
1. Mobile drawer closes on Coderso child navigation.
2. Module pages share consistent shell and empty states.
3. No regression in keyboard and screen-reader navigation.
