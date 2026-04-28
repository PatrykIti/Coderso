# TASK-053-08-02: Admin Links and Redirects
# FileName: TASK-053-08-02_Admin_Links_and_Redirects.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-053-08-01  
**Status:** Done (2026-02-17)  

---

## Goal
Use SPA navigation for all internal admin links (sidebar + primary actions) while
preserving full reload for external/public/auth routes.

## Files to Change
- `core/admin/ui/shared/AdminLink.tsx` (new)
- `core/admin/ui/shared/SidebarNav.tsx`
- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/content-types/SchemaBuilderPage.tsx`
- `core/admin/ui/auth/LoginPage.tsx` (keep hard reload)
- `core/admin/ui/auth/TwoFactorPage.tsx` (keep hard reload)
- `core/admin/app/AdminApp.tsx` (ensure auth redirects stay full reload)

## Pseudocode
```tsx
// AdminLink.tsx
export function AdminLink({ href, onClick, prefetch, ...props }) {
  const { navigate, prefetch: prefetchRoute } = useAdminRouter();
  const adminBasePath = useAdminBasePath();
  const resolved = resolveAdminHref(adminBasePath, href);

  const handleClick = (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (isExternalHref(resolved)) return;
    event.preventDefault();
    navigate(resolved);
  };

  return (
    <a
      href={resolved}
      onClick={(e) => { onClick?.(e); handleClick(e); }}
      onMouseEnter={() => prefetch && prefetchRoute(resolved)}
      onFocus={() => prefetch && prefetchRoute(resolved)}
      {...props}
    />
  );
}
```

## Acceptance Criteria
- Sidebar navigation is SPA (no hard reload).
- Primary actions (Edit, Create, Templates) use `navigate()` where applicable.
- Auth routes remain hard reload (login/reset).
