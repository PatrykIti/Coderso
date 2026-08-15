import type { ReactNode } from "react";

import { LoginPage } from "@/ui/auth/LoginPage";
import { TwoFactorPage } from "@/ui/auth/TwoFactorPage";
import { ResetPasswordPage } from "@/ui/auth/ResetPasswordPage";
import { SetPasswordPage } from "@/ui/auth/SetPasswordPage";
import { PagePreview } from "@/ui/pages/PagePreview";
import type {
  AssistantSettingsValues,
  GeneralSettingsValues,
  SettingsValues,
} from "@/ui/settings/settingsValues";
import {
  AccessLogsRoute,
  AnalyticsRoute,
  ApiKeysRoute,
  AssistantSettingsRoute,
  AuditRoute,
  BackupsRoute,
  BookingRoute,
  CollectionWorkspaceRoute,
  CommerceCollectionsRoute,
  CommerceEditorRoute,
  CommerceListRoute,
  ContentTypeEditorRoute,
  ContentTypeListRoute,
  CustomScreenEditorRoute,
  CustomScreenEntriesRoute,
  CustomScreenEntryEditorRoute,
  CustomScreenListRoute,
  DashboardRoute,
  DetailTemplateEditorRoute,
  EmailSettingsRoute,
  EntryEditorRoute,
  EntryListRoute,
  FormActionLogsRoute,
  FormSubmissionsRoute,
  FormBuilderRoute,
  FormListRoute,
  GeneralSettingsRoute,
  ImportExportRoute,
  IntegrationsRoute,
  IpAllowlistRoute,
  ListingEditorRoute,
  ListingFiltersRoute,
  ListingListRoute,
  ListingSearchRoute,
  LoginAlertsRoute,
  MediaLibraryRoute,
  MenuDesignEditorRoute,
  MenuEditorRoute,
  MenuListRoute,
  PageEditorRoute,
  PageListRoute,
  PermissionsMatrixRoute,
  PluginDetailsRoute,
  PluginStoreRoute,
  PopupEditorRoute,
  PopupsListRoute,
  PostEditorRoute,
  PostsListRoute,
  RedirectsRoute,
  ReviewsModerationRoute,
  SchemaBuilderRoute,
  SearchRoute,
  SecuritySettingsRoute,
  SeoRoute,
  SessionsRoute,
  SiteSettingsRoute,
  SolutionKitsRoute,
  StorageSettingsRoute,
  ThemesRoute,
  UsersRolesRoute,
  WebhooksRoute,
  WidgetLibraryRoute,
  PageTemplatesRoute,
  PageTemplateEditorRoute,
} from "@/app/adminRouteComponents";

type RouteMatch = {
  params: Record<string, string>;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => ReactNode;
};

type SettingsState = {
  status: "idle" | "loading" | "ready" | "error";
  values: SettingsValues;
  error: string | null;
};

type RouteRenderContext = {
  authPermissions: string[];
  settingsState: SettingsState;
  settingsSaving: boolean;
  saveGeneralSettings: (values: GeneralSettingsValues) => Promise<void>;
  saveAssistantSettings: (values: AssistantSettingsValues) => Promise<void>;
};

type RouteDefinition = {
  pattern: string;
  permission?: string;
  anyPermissions?: string[];
  render: (ctx: RouteRenderContext) => ReactNode;
};

export const normalizePath = (input: string) => {
  const withoutHash = input.split("#")[0] ?? input;
  const base = withoutHash.split("?")[0] ?? withoutHash;
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

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Page not found
  </div>
);

const AccessDenied = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
    <div>
      <h1 className="text-base font-semibold text-foreground">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account does not have permission to open this admin area.
      </p>
    </div>
  </div>
);

const resolveRoute = (path: string, routes: RouteDefinition[]): RouteMatch => {
  for (const route of routes) {
    const params = matchRoute(route.pattern, path);
    if (params) {
      return {
        params,
        permission: route.permission,
        anyPermissions: route.anyPermissions,
        render: route.render,
      };
    }
  }
  return { render: () => <NotFound />, params: {} };
};

/**
 * TASK-488-02-L02: the full admin route table extracted from `AdminApp.tsx`
 * (which dropped below the 1,000-line gate). The literal
 * `/advanced/commerce/collections` route is registered BEFORE the
 * `/advanced/commerce/:id` param route so `collections` is never captured as a
 * product id (first-match-wins).
 */
export const adminRoutes: RouteDefinition[] = [
  { pattern: "/", render: () => <DashboardRoute.Component />, permission: "content:read" },
  { pattern: "/login", render: () => <LoginPage /> },
  { pattern: "/2fa", render: () => <TwoFactorPage /> },
  { pattern: "/reset", render: () => <ResetPasswordPage /> },
  { pattern: "/reset/confirm", render: () => <SetPasswordPage /> },
  {
    pattern: "/analytics",
    render: () => <AnalyticsRoute.Component />,
    permission: "content:read",
  },
  { pattern: "/audit", render: () => <AuditRoute.Component />, permission: "audit:read" },
  {
    pattern: "/access-logs",
    render: () => <AccessLogsRoute.Component />,
    permission: "audit:read",
  },
  { pattern: "/backups", render: () => <BackupsRoute.Component />, permission: "backups:read" },
  { pattern: "/search", render: () => <SearchRoute.Component />, permission: "content:read" },
  { pattern: "/seo", render: () => <SeoRoute.Component />, permission: "content:read" },
  {
    pattern: "/redirects",
    render: () => <RedirectsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/tools/import-export",
    render: () => <ImportExportRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/advanced/forms",
    render: () => <FormListRoute.Component />,
    permission: "forms:read",
  },
  {
    pattern: "/advanced/forms/:id/action-runs",
    render: () => <FormActionLogsRoute.Component />,
    permission: "forms:read",
  },
  {
    pattern: "/advanced/forms/:id/submissions",
    render: () => <FormSubmissionsRoute.Component />,
    permission: "forms:read",
  },
  {
    pattern: "/advanced/forms/:id",
    render: () => <FormBuilderRoute.Component />,
    permission: "forms:read",
  },
  {
    pattern: "/advanced/engine",
    render: () => <ContentTypeListRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/engine/:id",
    render: () => <ContentTypeEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/engine/:id/collection",
    render: () => <CollectionWorkspaceRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/engine/:id/collection/detail-template/:detailPageId",
    render: () => <DetailTemplateEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/engine/:id/schema",
    render: () => <SchemaBuilderRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/entries",
    render: () => <EntryListRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/entries/:type/:id",
    render: () => <EntryEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/custom-screens",
    render: () => <CustomScreenListRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/custom-screens/:id/entries/:entryId",
    render: () => <CustomScreenEntryEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/custom-screens/:id/entries",
    render: () => <CustomScreenEntriesRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/custom-screens/:id",
    render: () => <CustomScreenEditorRoute.Component />,
    permission: "content:read",
  },
  { pattern: "/posts", render: () => <PostsListRoute.Component />, permission: "content:read" },
  {
    pattern: "/posts/:id",
    render: () => <PostEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/listings",
    render: () => <ListingListRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/listings/:id",
    render: () => <ListingEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/filters",
    render: () => <ListingFiltersRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/search",
    render: () => <ListingSearchRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/booking",
    render: () => <BookingRoute.Component />,
    permission: "booking:read",
  },
  {
    pattern: "/advanced/reviews",
    render: () => <ReviewsModerationRoute.Component />,
    permission: "reviews:read",
  },
  {
    pattern: "/advanced/commerce",
    render: () => <CommerceListRoute.Component />,
    permission: "commerce:read",
  },
  {
    pattern: "/advanced/commerce/collections",
    render: () => <CommerceCollectionsRoute.Component />,
    permission: "commerce:read",
  },
  {
    pattern: "/advanced/commerce/:id",
    render: () => <CommerceEditorRoute.Component />,
    permission: "commerce:read",
  },
  {
    pattern: "/advanced/popups",
    render: () => <PopupsListRoute.Component />,
    permission: "popups:read",
  },
  {
    pattern: "/advanced/popups/:id",
    render: () => <PopupEditorRoute.Component />,
    permission: "popups:read",
  },
  {
    pattern: "/advanced/solution-kits",
    render: () => <SolutionKitsRoute.Component />,
    permission: "solution-kits:read",
  },
  { pattern: "/pages", render: () => <PageListRoute.Component />, permission: "content:read" },
  {
    pattern: "/pages/:id",
    render: () => <PageEditorRoute.Component />,
    permission: "content:read",
  },
  { pattern: "/preview", render: () => <PagePreview /> },
  {
    pattern: "/media",
    render: () => <MediaLibraryRoute.Component />,
    permission: "media:read",
  },
  { pattern: "/menus", render: () => <MenuListRoute.Component />, permission: "menus:read" },
  {
    pattern: "/menus/:id",
    render: () => <MenuEditorRoute.Component />,
    permission: "menus:read",
  },
  {
    pattern: "/menus/:id/design",
    render: () => <MenuDesignEditorRoute.Component />,
    permission: "menus:read",
  },
  {
    pattern: "/users",
    render: ({ authPermissions: permissions }) => (
      <UsersRolesRoute.Component permissions={permissions} />
    ),
    anyPermissions: ["users:read", "roles:read"],
  },
  {
    pattern: "/roles",
    render: ({ authPermissions: permissions }) => (
      <PermissionsMatrixRoute.Component permissions={permissions} />
    ),
    permission: "roles:read",
  },
  { pattern: "/themes", render: () => <ThemesRoute.Component />, permission: "themes:read" },
  {
    pattern: "/advanced/widgets",
    render: () => <WidgetLibraryRoute.Component />,
    permission: "widgets:read",
  },
  {
    pattern: "/advanced/page-templates",
    render: () => <PageTemplatesRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/advanced/page-templates/:id",
    render: () => <PageTemplateEditorRoute.Component />,
    permission: "content:read",
  },
  {
    pattern: "/settings",
    render: ({ settingsState, settingsSaving, saveGeneralSettings }) => (
      <GeneralSettingsRoute.Component
        values={settingsState.values}
        isLoading={settingsState.status === "loading"}
        isSaving={settingsSaving}
        error={settingsState.error}
        onSave={saveGeneralSettings}
      />
    ),
    permission: "settings:read",
  },
  {
    pattern: "/settings/general",
    render: ({ settingsState, settingsSaving, saveGeneralSettings }) => (
      <GeneralSettingsRoute.Component
        values={settingsState.values}
        isLoading={settingsState.status === "loading"}
        isSaving={settingsSaving}
        error={settingsState.error}
        onSave={saveGeneralSettings}
      />
    ),
    permission: "settings:read",
  },
  {
    pattern: "/settings/site",
    render: () => <SiteSettingsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/assistant",
    render: ({ settingsState, settingsSaving, saveAssistantSettings }) => (
      <AssistantSettingsRoute.Component
        values={settingsState.values}
        isLoading={settingsState.status === "loading"}
        isSaving={settingsSaving}
        error={settingsState.error}
        onSave={saveAssistantSettings}
      />
    ),
    permission: "settings:read",
  },
  {
    pattern: "/settings/security",
    render: () => <SecuritySettingsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/security/ip-allowlist",
    render: () => <IpAllowlistRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/security/sessions",
    render: () => <SessionsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/security/login-alerts",
    render: () => <LoginAlertsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/api-keys",
    render: () => <ApiKeysRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/webhooks",
    render: () => <WebhooksRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/email",
    render: () => <EmailSettingsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/storage",
    render: () => <StorageSettingsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/settings/integrations",
    render: () => <IntegrationsRoute.Component />,
    permission: "settings:read",
  },
  {
    pattern: "/store",
    render: () => <PluginStoreRoute.Component />,
    permission: "store:browse",
  },
  {
    pattern: "/store/plugins/:id",
    render: () => <PluginDetailsRoute.Component />,
    permission: "store:browse",
  },
];

export type { RouteMatch, RouteRenderContext, SettingsState };

export const resolveAdminRoute = (
  path: string,
  options: {
    isProtected: boolean;
    canAccessRoute: (route: Pick<RouteMatch, "permission" | "anyPermissions">) => boolean;
  }
): RouteMatch => {
  const route = resolveRoute(path, adminRoutes);
  if (options.isProtected && !options.canAccessRoute(route)) {
    return { ...route, render: () => <AccessDenied /> };
  }
  return route;
};
