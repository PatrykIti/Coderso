import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { prefetchAdminRoute } from "@/utils/adminPrefetch";
import {
  DEFAULT_ADMIN_PATH,
  isExternalHref,
  resolveAdminBasePath,
  resolveAdminHref,
} from "@/utils/adminPaths";

type NavigateOptions = {
  replace?: boolean;
  skipBlockers?: boolean;
};

type AdminNavigationBlocker = (href: string) => boolean;

type AdminRouterValue = {
  path: string;
  navigate: (href: string, options?: NavigateOptions) => void;
  replace: (href: string) => void;
  prefetch: (href: string) => void;
  registerBlocker: (blocker: AdminNavigationBlocker) => () => void;
};

type AdminRouterProviderProps = {
  initialPath?: string;
  children: React.ReactNode;
};

const AdminRouterContext = createContext<AdminRouterValue | null>(null);

const resolveInitialPath = (initialPath?: string) => {
  if (initialPath) return initialPath;
  if (typeof window !== "undefined") {
    return window.location.pathname + window.location.search + window.location.hash;
  }
  return DEFAULT_ADMIN_PATH;
};

export function AdminRouterProvider({ initialPath, children }: AdminRouterProviderProps) {
  const [path, setPath] = useState(() => resolveInitialPath(initialPath));
  const pathRef = useRef(path);
  const blockersRef = useRef(new Set<AdminNavigationBlocker>());

  const adminBasePath = useMemo(() => resolveAdminBasePath(path), [path]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const registerBlocker = useCallback((blocker: AdminNavigationBlocker) => {
    blockersRef.current.add(blocker);
    return () => {
      blockersRef.current.delete(blocker);
    };
  }, []);

  const canNavigate = useCallback((href: string) => {
    for (const blocker of Array.from(blockersRef.current)) {
      if (!blocker(href)) return false;
    }
    return true;
  }, []);

  const syncPathFromWindow = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextPath = window.location.pathname + window.location.search + window.location.hash;
    pathRef.current = nextPath;
    setPath(nextPath);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const nextPath = window.location.pathname + window.location.search + window.location.hash;
      if (nextPath === pathRef.current) {
        syncPathFromWindow();
        return;
      }
      if (!canNavigate(nextPath)) {
        window.history.pushState({}, "", pathRef.current);
        return;
      }
      pathRef.current = nextPath;
      setPath(nextPath);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [canNavigate, syncPathFromWindow]);

  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      if (!href) return;
      if (typeof window === "undefined") return;
      const resolved = resolveAdminHref(adminBasePath, href);
      if (!options?.skipBlockers && !canNavigate(resolved)) return;
      if (isExternalHref(resolved)) {
        window.location.assign(resolved);
        return;
      }
      if (options?.replace) {
        window.history.replaceState({}, "", resolved);
      } else {
        window.history.pushState({}, "", resolved);
      }
      syncPathFromWindow();
    },
    [adminBasePath, canNavigate, syncPathFromWindow]
  );

  const replace = useCallback((href: string) => navigate(href, { replace: true }), [navigate]);

  const prefetch = useCallback(
    (href: string) => {
      if (!href) return;
      prefetchAdminRoute(href, adminBasePath, { activeHref: path });
    },
    [adminBasePath, path]
  );

  const value = useMemo(
    () => ({ path, navigate, replace, prefetch, registerBlocker }),
    [path, navigate, replace, prefetch, registerBlocker]
  );

  return <AdminRouterContext.Provider value={value}>{children}</AdminRouterContext.Provider>;
}

export function useAdminRouter() {
  const context = useContext(AdminRouterContext);
  if (!context) {
    throw new Error("AdminRouterContext is missing");
  }
  return context;
}

export function useOptionalAdminRouter() {
  return useContext(AdminRouterContext);
}
