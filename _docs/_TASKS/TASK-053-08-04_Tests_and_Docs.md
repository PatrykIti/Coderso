# TASK-053-08-04: Tests + Docs
# FileName: TASK-053-08-04_Tests_and_Docs.md

**Priority:** Medium  
**Category:** Admin/UI + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-053-08-01..03  
**Status:** Planned  

---

## Tests
- `tests/unit/ui/admin-router.test.tsx`
  - `navigate()` pushes history and updates context path.
  - `popstate` updates path.
- `tests/unit/ui/admin-link.test.tsx`
  - prevents default for internal links.
  - allows meta/ctrl click for new tab.
- `tests/unit/ui/sidebar-nav.test.tsx`
  - uses AdminLink + prefetch hook called on hover.

## Docs
- `_docs/ADMIN_NAVIGATION.md` (new)
  - routing rules
  - which routes are SPA vs hard reload
  - how to use `AdminLink` + `useAdminRouter`
- `_docs/ADMIN_CACHE.md`
  - add section on prefetch + how it uses cached list endpoints
- `_docs/ADMIN_CACHE_MAP.md`
  - add prefetch mapping table
- `_docs/_CHANGELOG/*.md`
  - new entry: Admin SPA navigation + prefetch

