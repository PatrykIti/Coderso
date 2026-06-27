import { type ComponentType } from "react";

import { DashboardPage } from "@/pages/DashboardPage";
import { ScreensIndexPage } from "@/pages/ScreensIndexPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { LoginPage } from "@/pages/auth/LoginPage";
import { TwoFactorPage } from "@/pages/auth/TwoFactorPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { SetPasswordPage } from "@/pages/auth/SetPasswordPage";

import { PageListPage } from "@/pages/content/PageListPage";
import { PageEditorPreview } from "@/pages/content/PageEditorPreview";
import { PostsListPage } from "@/pages/content/PostsListPage";
import { PostEditorPreview } from "@/pages/content/PostEditorPreview";
import { MenuListPage } from "@/pages/content/MenuListPage";
import { MenuEditorPreview } from "@/pages/content/MenuEditorPreview";
import { MediaLibraryPage } from "@/pages/media/MediaLibraryPage";

import { EnginePage } from "@/pages/advanced/EnginePage";
import { ContentTypeEditorPreview } from "@/pages/advanced/ContentTypeEditorPreview";
import { SchemaBuilderPreview } from "@/pages/advanced/SchemaBuilderPreview";
import { CollectionWorkspacePage } from "@/pages/advanced/CollectionWorkspacePage";
import { EntriesPage } from "@/pages/advanced/EntriesPage";
import { EntryEditorPreview } from "@/pages/advanced/EntryEditorPreview";
import { CustomScreensPage } from "@/pages/advanced/CustomScreensPage";
import { CustomScreenEditorPreview } from "@/pages/advanced/CustomScreenEditorPreview";
import { CustomScreenEntriesPage } from "@/pages/advanced/CustomScreenEntriesPage";
import { CustomScreenEntryEditorPreview } from "@/pages/advanced/CustomScreenEntryEditorPreview";
import { FormsPage } from "@/pages/advanced/FormsPage";
import { FormBuilderPreview } from "@/pages/advanced/FormBuilderPreview";
import { FormSubmissionsPage } from "@/pages/advanced/FormSubmissionsPage";
import { ListingsPage } from "@/pages/advanced/ListingsPage";
import { ListingEditorPreview } from "@/pages/advanced/ListingEditorPreview";
import { FiltersPage } from "@/pages/advanced/FiltersPage";
import { SearchModulePage } from "@/pages/advanced/SearchModulePage";
import { BookingPage } from "@/pages/advanced/BookingPage";
import { ReviewsPage } from "@/pages/advanced/ReviewsPage";
import { CommercePage } from "@/pages/advanced/CommercePage";
import { CommerceEditorPreview } from "@/pages/advanced/CommerceEditorPreview";
import { PopupsPage } from "@/pages/advanced/PopupsPage";
import { PopupEditorPreview } from "@/pages/advanced/PopupEditorPreview";
import { SolutionKitsPage } from "@/pages/advanced/SolutionKitsPage";
import { WidgetLibraryPage } from "@/pages/advanced/WidgetLibraryPage";
import { PageTemplatesPage } from "@/pages/advanced/PageTemplatesPage";

import { PluginStorePage } from "@/pages/store/PluginStorePage";
import { PluginDetailsPage } from "@/pages/store/PluginDetailsPage";
import { ThemesPage } from "@/pages/themes/ThemesPage";

import { SearchPage } from "@/pages/tools/SearchPage";
import { SeoManagerPage } from "@/pages/tools/SeoManagerPage";
import { AnalyticsPage } from "@/pages/tools/AnalyticsPage";
import { BackupsPage } from "@/pages/tools/BackupsPage";
import { ImportExportPage } from "@/pages/tools/ImportExportPage";
import { RedirectsPage } from "@/pages/tools/RedirectsPage";

import { UsersRolesPage } from "@/pages/admin/UsersRolesPage";
import { PermissionsMatrixPage } from "@/pages/admin/PermissionsMatrixPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { AccessLogsPage } from "@/pages/admin/AccessLogsPage";

import { GeneralSettingsPage } from "@/pages/settings/GeneralSettingsPage";
import { SiteSettingsPage } from "@/pages/settings/SiteSettingsPage";
import { AssistantSettingsPage } from "@/pages/settings/AssistantSettingsPage";
import { SecuritySettingsPage } from "@/pages/settings/SecuritySettingsPage";
import { IpAllowlistPage } from "@/pages/settings/IpAllowlistPage";
import { SessionsPage } from "@/pages/settings/SessionsPage";
import { LoginAlertsPage } from "@/pages/settings/LoginAlertsPage";
import { ApiKeysPage } from "@/pages/settings/ApiKeysPage";
import { WebhooksPage } from "@/pages/settings/WebhooksPage";
import { EmailSettingsPage } from "@/pages/settings/EmailSettingsPage";
import { StorageSettingsPage } from "@/pages/settings/StorageSettingsPage";
import { IntegrationsPage } from "@/pages/settings/IntegrationsPage";

export type RouteShell = "app" | "auth";
export type RouteDef = {
  path: string;
  title: string;
  group: string;
  shell?: RouteShell;
  Component: ComponentType;
};

export const routes: RouteDef[] = [
  { path: "/", title: "Dashboard", group: "Main", Component: DashboardPage },
  { path: "/screens", title: "All screens", group: "Prototype", Component: ScreensIndexPage },

  // Auth
  { path: "/login", title: "Sign in", group: "Auth", shell: "auth", Component: LoginPage },
  { path: "/2fa", title: "Two-factor", group: "Auth", shell: "auth", Component: TwoFactorPage },
  { path: "/reset", title: "Reset password", group: "Auth", shell: "auth", Component: ResetPasswordPage },
  { path: "/reset/confirm", title: "Set password", group: "Auth", shell: "auth", Component: SetPasswordPage },

  // Main content
  { path: "/pages", title: "Pages", group: "Main", Component: PageListPage },
  { path: "/pages/:id", title: "Page editor", group: "Editors", Component: PageEditorPreview },
  { path: "/posts", title: "Posts", group: "Main", Component: PostsListPage },
  { path: "/posts/:id", title: "Post editor", group: "Editors", Component: PostEditorPreview },
  { path: "/menus", title: "Menus", group: "Main", Component: MenuListPage },
  { path: "/menus/:id", title: "Menu editor", group: "Editors", Component: MenuEditorPreview },
  { path: "/media", title: "Media library", group: "Main", Component: MediaLibraryPage },

  // Advanced
  { path: "/advanced/engine", title: "Engine", group: "Advanced", Component: EnginePage },
  { path: "/advanced/engine/:id/schema", title: "Schema builder", group: "Editors", Component: SchemaBuilderPreview },
  { path: "/advanced/engine/:id/collection", title: "Collection", group: "Advanced", Component: CollectionWorkspacePage },
  { path: "/advanced/engine/:id", title: "Content type", group: "Editors", Component: ContentTypeEditorPreview },
  { path: "/advanced/entries", title: "Entries", group: "Advanced", Component: EntriesPage },
  { path: "/advanced/entries/:type/:id", title: "Entry editor", group: "Editors", Component: EntryEditorPreview },
  { path: "/advanced/custom-screens", title: "Screens", group: "Advanced", Component: CustomScreensPage },
  { path: "/advanced/custom-screens/:id/entries/:entryId", title: "Screen entry (edit)", group: "Editors", Component: CustomScreenEntryEditorPreview },
  { path: "/advanced/custom-screens/:id/entries", title: "Published screen (list)", group: "Advanced", Component: CustomScreenEntriesPage },
  { path: "/advanced/custom-screens/:id", title: "Screen editor", group: "Editors", Component: CustomScreenEditorPreview },
  { path: "/advanced/forms", title: "Forms", group: "Advanced", Component: FormsPage },
  { path: "/advanced/forms/:id/submissions", title: "Form submissions", group: "Advanced", Component: FormSubmissionsPage },
  { path: "/advanced/forms/:id", title: "Form builder", group: "Editors", Component: FormBuilderPreview },
  { path: "/advanced/listings", title: "Listings", group: "Advanced", Component: ListingsPage },
  { path: "/advanced/listings/:id", title: "Listing editor", group: "Editors", Component: ListingEditorPreview },
  { path: "/advanced/filters", title: "Filters", group: "Advanced", Component: FiltersPage },
  { path: "/advanced/search", title: "Search module", group: "Advanced", Component: SearchModulePage },
  { path: "/advanced/booking", title: "Booking", group: "Advanced", Component: BookingPage },
  { path: "/advanced/reviews", title: "Reviews", group: "Advanced", Component: ReviewsPage },
  { path: "/advanced/commerce", title: "Commerce", group: "Advanced", Component: CommercePage },
  { path: "/advanced/commerce/:id", title: "Product editor", group: "Editors", Component: CommerceEditorPreview },
  { path: "/advanced/popups", title: "Popups", group: "Advanced", Component: PopupsPage },
  { path: "/advanced/popups/:id", title: "Popup editor", group: "Editors", Component: PopupEditorPreview },
  { path: "/advanced/solution-kits", title: "Solution kits", group: "Advanced", Component: SolutionKitsPage },
  { path: "/advanced/widgets", title: "Widget library", group: "Advanced", Component: WidgetLibraryPage },
  { path: "/advanced/page-templates", title: "Page templates", group: "Advanced", Component: PageTemplatesPage },

  // Store + visual
  { path: "/store", title: "Plugin store", group: "Store", Component: PluginStorePage },
  { path: "/store/plugins/:id", title: "Plugin details", group: "Store", Component: PluginDetailsPage },
  { path: "/themes", title: "Admin UI theme", group: "Visual", Component: ThemesPage },

  // Tools
  { path: "/search", title: "Global search", group: "Tools", Component: SearchPage },
  { path: "/seo", title: "SEO manager", group: "Tools", Component: SeoManagerPage },
  { path: "/analytics", title: "Analytics", group: "Tools", Component: AnalyticsPage },
  { path: "/backups", title: "Backups", group: "Tools", Component: BackupsPage },
  { path: "/tools/import-export", title: "Import / export", group: "Tools", Component: ImportExportPage },
  { path: "/redirects", title: "Redirects", group: "Tools", Component: RedirectsPage },

  // Admin
  { path: "/users", title: "Users & roles", group: "Admin", Component: UsersRolesPage },
  { path: "/roles", title: "Roles matrix", group: "Admin", Component: PermissionsMatrixPage },
  { path: "/audit", title: "Audit logs", group: "Admin", Component: AuditLogsPage },
  { path: "/access-logs", title: "Access logs", group: "Admin", Component: AccessLogsPage },

  // Settings
  { path: "/settings", title: "General settings", group: "Settings", Component: GeneralSettingsPage },
  { path: "/settings/general", title: "General settings", group: "Settings", Component: GeneralSettingsPage },
  { path: "/settings/site", title: "Site settings", group: "Settings", Component: SiteSettingsPage },
  { path: "/settings/assistant", title: "Assistant", group: "Settings", Component: AssistantSettingsPage },
  { path: "/settings/security", title: "Security", group: "Settings", Component: SecuritySettingsPage },
  { path: "/settings/security/ip-allowlist", title: "IP allowlist", group: "Settings", Component: IpAllowlistPage },
  { path: "/settings/security/sessions", title: "Sessions", group: "Settings", Component: SessionsPage },
  { path: "/settings/security/login-alerts", title: "Login alerts", group: "Settings", Component: LoginAlertsPage },
  { path: "/settings/api-keys", title: "API keys", group: "Settings", Component: ApiKeysPage },
  { path: "/settings/webhooks", title: "Webhooks", group: "Settings", Component: WebhooksPage },
  { path: "/settings/email", title: "Email", group: "Settings", Component: EmailSettingsPage },
  { path: "/settings/storage", title: "Storage", group: "Settings", Component: StorageSettingsPage },
  { path: "/settings/integrations", title: "Integrations", group: "Settings", Component: IntegrationsPage },
];

export { NotFoundPage };

const segmentsOf = (value: string) => value.split("/").filter(Boolean);

export function matchRoute(path: string): { route: RouteDef; params: Record<string, string> } | null {
  const pathParts = segmentsOf(path);
  for (const route of routes) {
    const patternParts = segmentsOf(route.path);
    if (patternParts.length !== pathParts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < patternParts.length; i += 1) {
      const part = patternParts[i];
      if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(pathParts[i]);
      else if (part !== pathParts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}
