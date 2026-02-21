import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
};

type AdminRouterValue = {
  path: string;
  navigate: (href: string, options?: NavigateOptions) => void;
  replace: (href: string) => void;
  prefetch: (href: string) => void;
};

type AdminRouterProviderProps = {
  initialPath?: string;
  children: React.ReactNode;
};

const AdminRouterContext = createContext<AdminRouterValue | null>(null);

const resolveInitialPath = (initialPath?: string) => {
  if (initialPath) return initialPath;
  if (typeof window !== "undefined") {
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
  }
  return DEFAULT_ADMIN_PATH;
};

export function AdminRouterProvider({
  initialPath,
  children,
}: AdminRouterProviderProps) {
  const [path, setPath] = useState(() => resolveInitialPath(initialPath));

  const adminBasePath = useMemo(() => resolveAdminBasePath(path), [path]);

  const syncPathFromWindow = useCallback(() => {
    if (typeof window === "undefined") return;
    setPath(
      window.location.pathname + window.location.search + window.location.hash
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => syncPathFromWindow();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncPathFromWindow]);

  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      if (!href) return;
      if (typeof window === "undefined") return;
      const resolved = resolveAdminHref(adminBasePath, href);
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
    [adminBasePath, syncPathFromWindow]
  );

  const replace = useCallback(
    (href: string) => navigate(href, { replace: true }),
    [navigate]
  );

  const prefetch = useCallback(
    (href: string) => {
      if (!href) return;
      prefetchAdminRoute(href, adminBasePath, { activeHref: path });
    },
    [adminBasePath, path]
  );

  const value = useMemo(
    () => ({ path, navigate, replace, prefetch }),
    [path, navigate, replace, prefetch]
  );

  return (
    <AdminRouterContext.Provider value={value}>
      {children}
    </AdminRouterContext.Provider>
  );
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
