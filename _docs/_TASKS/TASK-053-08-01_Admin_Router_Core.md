# TASK-053-08-01: Admin Router Core
# FileName: TASK-053-08-01_Admin_Router_Core.md

**Priority:** High  
**Category:** Admin/UI + Core/Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-053-08  
**Status:** Done (2026-02-17)  

---

## Goal
Provide a minimal SPA router for the admin panel that manages path state, pushState,
replaceState and popstate without introducing a heavy router library.

## Files to Change
- `core/admin/app/AdminApp.tsx`
- `core/admin/main.tsx`
- `core/admin/utils/adminPaths.ts` (reuse helpers)
- `core/admin/ui/contexts/AdminRouterContext.tsx` (new)

## Pseudocode
```ts
// AdminRouterContext.tsx
const AdminRouterContext = createContext({
  path: string,
  navigate: (href, opts) => void,
  prefetch: (href) => void,
  replace: (href) => void,
});

export function AdminRouterProvider({ initialPath, children }) {
  const [path, setPath] = useState(initialPath);
  const adminBasePath = resolveAdminBasePath(path);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((href, { replace = false } = {}) => {
    if (isExternalHref(href)) return window.location.assign(href);
    const target = resolveAdminHref(adminBasePath, href);
    if (replace) history.replaceState({}, "", target);
    else history.pushState({}, "", target);
    setPath(window.location.pathname);
  }, [adminBasePath]);

  const prefetch = useCallback((href) => {/* no-op stub here */}, []);

  return <Provider value={{ path, navigate, prefetch }}>{children}</Provider>;
}

// AdminApp.tsx
const { path } = useAdminRouter();
const normalizedPath = normalizePath(path);
```

## Implementation Notes
- Router lives inside Admin runtime only (no changes to public site).
- Keep `window.location.assign` for hard redirects (login/logout/reset/preview).
- Keep `window.open` for preview links.

## Acceptance Criteria
- `AdminApp` reacts to `history.pushState` + `popstate` without reload.
- `AdminApp` uses context `path` instead of prop for route matching.
