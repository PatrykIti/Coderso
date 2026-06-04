import { lazy, type ComponentType, type LazyExoticComponent } from "react";

import type { AssistantSettingsValues, GeneralSettingsValues } from "@/ui/settings/settingsValues";

export type LazyRouteComponent<Props = Record<string, never>> = {
  Component: LazyExoticComponent<ComponentType<Props>>;
  preload: () => Promise<{ default: ComponentType<Props> }>;
};

export function lazyNamedRoute<Props = Record<string, never>>(
  loader: () => Promise<unknown>,
  exportName: string
): LazyRouteComponent<Props> {
  let promise: Promise<{ default: ComponentType<Props> }> | null = null;

  const load = () => {
    promise ??= loader().then((module) => {
      const exports = module as Record<string, unknown>;
      const component = exports[exportName];
      if (typeof component !== "function") {
        throw new Error(`admin_route_export_missing:${exportName}`);
      }
      return { default: component as ComponentType<Props> };
    });
    return promise;
  };

  return {
    Component: lazy(load),
    preload: load,
  };
}

export type GeneralSettingsRouteProps = {
  values?: Partial<GeneralSettingsValues>;
  onSave?: (values: GeneralSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

export type AssistantSettingsRouteProps = {
  values?: Partial<AssistantSettingsValues>;
  onSave?: (values: AssistantSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

export type PermissionSnapshotRouteProps = {
  permissions?: string[];
};

export const DashboardRoute = lazyNamedRoute(
  () => import("@/ui/dashboard/DashboardPage"),
  "DashboardPage"
);

export const AnalyticsRoute = lazyNamedRoute(
  () => import("@/ui/analytics/AnalyticsPage"),
  "AnalyticsPage"
);

export const AuditRoute = lazyNamedRoute(() => import("@/ui/audit/AuditList"), "AuditList");

export const AccessLogsRoute = lazyNamedRoute(
  () => import("@/ui/security/AccessLogsPage"),
  "AccessLogsPage"
);

export const BackupsRoute = lazyNamedRoute(() => import("@/ui/backups/BackupsPage"), "BackupsPage");

export const SearchRoute = lazyNamedRoute(() => import("@/ui/search/SearchPage"), "SearchPage");

export const SeoRoute = lazyNamedRoute(() => import("@/ui/seo/SeoManagerPage"), "SeoManagerPage");

export const RedirectsRoute = lazyNamedRoute(
  () => import("@/ui/redirects/RedirectsPage"),
  "RedirectsPage"
);

export const ImportExportRoute = lazyNamedRoute(
  () => import("@/ui/import-export/ImportExportPage"),
  "ImportExportPage"
);

export const FormListRoute = lazyNamedRoute(
  () => import("@/ui/forms/FormListPage"),
  "FormListPage"
);

export const FormActionLogsRoute = lazyNamedRoute(
  () => import("@/ui/forms/FormActionLogsPage"),
  "FormActionLogsPage"
);

export const FormBuilderRoute = lazyNamedRoute(
  () => import("@/ui/forms/FormBuilderPage"),
  "FormBuilderPage"
);

export const ContentTypeListRoute = lazyNamedRoute(
  () => import("@/ui/content-types/ContentTypeList"),
  "ContentTypeList"
);

export const ContentTypeEditorRoute = lazyNamedRoute(
  () => import("@/ui/content-types/ContentTypeEditor"),
  "ContentTypeEditor"
);

export const CollectionWorkspaceRoute = lazyNamedRoute(
  () => import("@/ui/content-types/CollectionWorkspacePage"),
  "CollectionWorkspacePage"
);

export const DetailTemplateEditorRoute = lazyNamedRoute(
  () => import("@/ui/content-types/DetailTemplateEditorPage"),
  "DetailTemplateEditorPage"
);

export const SchemaBuilderRoute = lazyNamedRoute(
  () => import("@/ui/content-types/SchemaBuilderPage"),
  "SchemaBuilderPage"
);

export const EntryListRoute = lazyNamedRoute(() => import("@/ui/entries/EntryList"), "EntryList");

export const EntryEditorRoute = lazyNamedRoute(
  () => import("@/ui/entries/EntryEditor"),
  "EntryEditor"
);

export const CustomScreenListRoute = lazyNamedRoute(
  () => import("@/ui/custom-screens/CustomScreenListPage"),
  "CustomScreenListPage"
);

export const CustomScreenEntryEditorRoute = lazyNamedRoute(
  () => import("@/ui/custom-screens/CustomScreenEntryEditor"),
  "CustomScreenEntryEditor"
);

export const CustomScreenEntriesRoute = lazyNamedRoute(
  () => import("@/ui/custom-screens/CustomScreenEntriesPage"),
  "CustomScreenEntriesPage"
);

export const CustomScreenEditorRoute = lazyNamedRoute(
  () => import("@/ui/custom-screens/CustomScreenEditorPage"),
  "CustomScreenEditorPage"
);

export const PostsListRoute = lazyNamedRoute(
  () => import("@/ui/posts/PostsListPage"),
  "PostsListPage"
);

export const PostEditorRoute = lazyNamedRoute(
  () => import("@/ui/posts/PostEditorPage"),
  "PostEditorPage"
);

export const ListingListRoute = lazyNamedRoute(
  () => import("@/ui/listings/ListingListPage"),
  "ListingListPage"
);

export const ListingEditorRoute = lazyNamedRoute(
  () => import("@/ui/listings/ListingEditorPage"),
  "ListingEditorPage"
);

export const ListingFiltersRoute = lazyNamedRoute(
  () => import("@/ui/listings/ListingFiltersPage"),
  "ListingFiltersPage"
);

export const ListingSearchRoute = lazyNamedRoute(
  () => import("@/ui/listings/ListingSearchPage"),
  "ListingSearchPage"
);

export const BookingRoute = lazyNamedRoute(() => import("@/ui/booking/BookingPage"), "BookingPage");

export const ReviewsModerationRoute = lazyNamedRoute(
  () => import("@/ui/reviews/ReviewsModerationPage"),
  "ReviewsModerationPage"
);

export const CommerceListRoute = lazyNamedRoute(
  () => import("@/ui/commerce/CommerceListPage"),
  "CommerceListPage"
);

export const CommerceEditorRoute = lazyNamedRoute(
  () => import("@/ui/commerce/CommerceEditorPage"),
  "CommerceEditorPage"
);

export const PopupsListRoute = lazyNamedRoute(
  () => import("@/ui/popups/PopupsListPage"),
  "PopupsListPage"
);

export const PopupEditorRoute = lazyNamedRoute(
  () => import("@/ui/popups/PopupEditorPage"),
  "PopupEditorPage"
);

export const SolutionKitsRoute = lazyNamedRoute(
  () => import("@/ui/kits/SolutionKitsPage"),
  "SolutionKitsPage"
);

export const PageListRoute = lazyNamedRoute(
  () => import("@/ui/pages/PageListPage"),
  "PageListPage"
);

export const PageEditorRoute = lazyNamedRoute(() => import("@/ui/pages/PageEditor"), "PageEditor");

export const MediaLibraryRoute = lazyNamedRoute(
  () => import("@/ui/media/MediaLibraryPage"),
  "MediaLibraryPage"
);

export const MenuListRoute = lazyNamedRoute(
  () => import("@/ui/menus/MenuListPage"),
  "MenuListPage"
);

export const MenuEditorRoute = lazyNamedRoute(
  () => import("@/ui/menus/MenuEditorPage"),
  "MenuEditorPage"
);

export const UsersRolesRoute = lazyNamedRoute<PermissionSnapshotRouteProps>(
  () => import("@/ui/users/UsersRolesPage"),
  "UsersRolesPage"
);

export const PermissionsMatrixRoute = lazyNamedRoute<PermissionSnapshotRouteProps>(
  () => import("@/ui/roles/PermissionsMatrixPage"),
  "PermissionsMatrixPage"
);

export const ThemesRoute = lazyNamedRoute(() => import("@/ui/themes/ThemesPage"), "ThemesPage");

export const WidgetLibraryRoute = lazyNamedRoute(
  () => import("@/ui/widgets/WidgetLibraryPage"),
  "WidgetLibraryPage"
);

export const WidgetTemplateEditorRoute = lazyNamedRoute(
  () => import("@/ui/widgets/WidgetTemplateEditorPage"),
  "WidgetTemplateEditorPage"
);

export const GeneralSettingsRoute = lazyNamedRoute<GeneralSettingsRouteProps>(
  () => import("@/ui/settings/GeneralSettingsPage"),
  "GeneralSettingsPage"
);

export const AssistantSettingsRoute = lazyNamedRoute<AssistantSettingsRouteProps>(
  () => import("@/ui/settings/AssistantSettingsPage"),
  "AssistantSettingsPage"
);

export const SiteSettingsRoute = lazyNamedRoute(
  () => import("@/ui/site/SiteSettingsPage"),
  "SiteSettingsPage"
);

export const SecuritySettingsRoute = lazyNamedRoute(
  () => import("@/ui/settings/SecuritySettingsPage"),
  "SecuritySettingsPage"
);

export const IpAllowlistRoute = lazyNamedRoute(
  () => import("@/ui/settings/IpAllowlistPage"),
  "IpAllowlistPage"
);

export const SessionsRoute = lazyNamedRoute(
  () => import("@/ui/settings/SessionsPage"),
  "SessionsPage"
);

export const LoginAlertsRoute = lazyNamedRoute(
  () => import("@/ui/settings/LoginAlertsPage"),
  "LoginAlertsPage"
);

export const ApiKeysRoute = lazyNamedRoute(
  () => import("@/ui/settings/ApiKeysPage"),
  "ApiKeysPage"
);

export const WebhooksRoute = lazyNamedRoute(
  () => import("@/ui/settings/WebhooksPage"),
  "WebhooksPage"
);

export const EmailSettingsRoute = lazyNamedRoute(
  () => import("@/ui/settings/EmailSettingsPage"),
  "EmailSettingsPage"
);

export const StorageSettingsRoute = lazyNamedRoute(
  () => import("@/ui/settings/StorageSettingsPage"),
  "StorageSettingsPage"
);

export const IntegrationsRoute = lazyNamedRoute(
  () => import("@/ui/settings/IntegrationsPage"),
  "IntegrationsPage"
);

export const PluginStoreRoute = lazyNamedRoute(
  () => import("@/ui/store/PluginStorePage"),
  "PluginStorePage"
);

export const PluginDetailsRoute = lazyNamedRoute(
  () => import("@/ui/store/PluginDetailsPage"),
  "PluginDetailsPage"
);
