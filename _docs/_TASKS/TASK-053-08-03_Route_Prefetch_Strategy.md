# TASK-053-08-03: Route Prefetch Strategy (Optional)
# FileName: TASK-053-08-03_Route_Prefetch_Strategy.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-053-08-01  
**Status:** Planned  

---

## Goal
Add lightweight, optional prefetching for common routes to reduce perceived loading
when switching screens.

## Prefetch Policy
- Trigger on **hover/focus** of sidebar nav items.
- Only prefetch **list endpoints** (safe, cached).
- Respect existing cache TTL (use `list*Cached({ force: true, background: true })`).
- No prefetch for auth/public routes.

## Files to Change
- `core/admin/ui/contexts/AdminRouterContext.tsx` (prefetch registry)
- `core/admin/ui/shared/SidebarNav.tsx` (enable `prefetch` on nav items)
- `core/admin/services/*` (reuse cached list calls)

## Pseudocode
```ts
const PREFETCHERS = [
  { match: "/pages", run: () => listPagesCached({ force: true }) },
  { match: "/widgets", run: () => Promise.all([
      listWidgetCatalogCached({ force: true }),
      listWidgetTemplateCategoriesCached({ force: true }),
    ])
  },
  { match: "/content-types", run: () => listContentTypesCached({ force: true }) },
  { match: "/entries", run: () => listContentTypesCached({ force: true }) },
  { match: "/menus", run: () => listMenusCached({ force: true }) },
  { match: "/media", run: () => listMediaCached({ force: true }) },
];

function prefetch(href) {
  const path = stripAdminBasePath(href, adminBasePath);
  const prefetcher = PREFETCHERS.find((item) => path.startsWith(item.match));
  if (prefetcher) requestIdleCallback(() => prefetcher.run());
}
```

## Acceptance Criteria
- Hovering sidebar item triggers prefetch without blocking UI.
- Prefetch does not override unsaved state (list endpoints only).
- Prefetch remains optional and safe.

