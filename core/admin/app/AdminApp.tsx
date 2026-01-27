import { useEffect, useMemo, useState } from "react";

import { me } from "@/services/authClient";
import { DashboardPage } from "@/ui/dashboard/DashboardPage";
import { LoginPage } from "@/ui/auth/LoginPage";
import { TwoFactorPage } from "@/ui/auth/TwoFactorPage";
import { ResetPasswordPage } from "@/ui/auth/ResetPasswordPage";
import { SetPasswordPage } from "@/ui/auth/SetPasswordPage";
import { PageListPage } from "@/ui/pages/PageListPage";
import { PageEditor } from "@/ui/pages/PageEditor";
import { MediaLibraryPage } from "@/ui/media/MediaLibraryPage";
import { MenuEditorPage } from "@/ui/menus/MenuEditorPage";
import { UsersRolesPage } from "@/ui/users/UsersRolesPage";
import { SettingsPage } from "@/ui/settings/SettingsPage";
import type { TokenOverrides } from "@/ui/settings/DesignTokensEditor";
import { PluginStorePage } from "@/ui/store/PluginStorePage";

const publicRoutes = new Set([
  "/admin/login",
  "/admin/2fa",
  "/admin/reset",
  "/admin/reset/confirm",
]);

type RouteMatch = {
  element: React.ReactNode;
  params: Record<string, string>;
};

const normalizePath = (input: string) => {
  const base = input.split("?")[0] ?? input;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
};

const matchRoute = (pattern: string, path: string) => {
  const patternParts = normalizePath(pattern).split("/").filter(Boolean);
  const pathParts = normalizePath(path).split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    const value = pathParts[index];
    if (part?.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value ?? "");
      continue;
    }
    if (part !== value) return null;
  }
  return params;
};

const defaultSettingsValues = { siteName: "Nextless", siteLocale: "pl-PL" };
const defaultTokenOverrides: TokenOverrides = {};

const routes = [
  { pattern: "/admin", element: <DashboardPage /> },
  { pattern: "/admin/login", element: <LoginPage /> },
  { pattern: "/admin/2fa", element: <TwoFactorPage /> },
  { pattern: "/admin/reset", element: <ResetPasswordPage /> },
  { pattern: "/admin/reset/confirm", element: <SetPasswordPage /> },
  { pattern: "/admin/pages", element: <PageListPage /> },
  { pattern: "/admin/pages/:id", element: <PageEditor /> },
  { pattern: "/admin/media", element: <MediaLibraryPage /> },
  { pattern: "/admin/menus", element: <MenuEditorPage /> },
  { pattern: "/admin/users", element: <UsersRolesPage /> },
  {
    pattern: "/admin/settings",
    element: (
      <SettingsPage
        values={defaultSettingsValues}
        tokens={defaultTokenOverrides}
        onSave={() => undefined}
        onResetTokens={() => undefined}
      />
    ),
  },
  { pattern: "/admin/store", element: <PluginStorePage /> },
];

const resolveRoute = (path: string): RouteMatch => {
  for (const route of routes) {
    const params = matchRoute(route.pattern, path);
    if (params) return { element: route.element, params };
  }
  return { element: <NotFound />, params: {} };
};

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Page not found
  </div>
);

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

type AdminAppProps = {
  path: string;
};

export function AdminApp({ path }: AdminAppProps) {
  const normalizedPath = normalizePath(path);
  const isPublic = publicRoutes.has(normalizedPath);
  const isProtected = normalizedPath.startsWith("/admin") && !isPublic;

  const [authState, setAuthState] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >(isProtected ? "checking" : "unauthenticated");

  const match = useMemo(() => resolveRoute(normalizedPath), [normalizedPath]);

  useEffect(() => {
    if (!isProtected) return;
    let active = true;
    me()
      .then(() => {
        if (active) setAuthState("authenticated");
      })
      .catch(() => {
        if (active) setAuthState("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, [isProtected, normalizedPath]);

  useEffect(() => {
    if (!isPublic) return;
    let active = true;
    me()
      .then(() => {
        if (active) setAuthState("authenticated");
      })
      .catch(() => {
        if (active) setAuthState("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, [isPublic, normalizedPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authState === "unauthenticated" && isProtected) {
      window.location.assign("/admin/login");
    }
    if (authState === "authenticated" && isPublic) {
      window.location.assign("/admin/");
    }
  }, [authState, isProtected, isPublic]);

  if (isProtected && authState === "checking") {
    return <Loading />;
  }

  return <>{match.element}</>;
}
