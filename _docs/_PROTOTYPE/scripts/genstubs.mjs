// One-off scaffolder: creates a stub file per prototype page (skips existing).
// Run: node scripts/genstubs.mjs   (from _docs/_PROTOTYPE)
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const PAGES = [
  ["auth/LoginPage", "LoginPage", "Sign in"],
  ["auth/TwoFactorPage", "TwoFactorPage", "Two-factor authentication"],
  ["auth/ResetPasswordPage", "ResetPasswordPage", "Reset password"],
  ["auth/SetPasswordPage", "SetPasswordPage", "Set a new password"],
  ["DashboardPage", "DashboardPage", "Dashboard"],
  ["content/PageListPage", "PageListPage", "Pages"],
  ["content/PageEditorPreview", "PageEditorPreview", "Page editor"],
  ["content/PostsListPage", "PostsListPage", "Posts"],
  ["content/PostEditorPreview", "PostEditorPreview", "Post editor"],
  ["content/MenuListPage", "MenuListPage", "Menus"],
  ["content/MenuEditorPreview", "MenuEditorPreview", "Menu editor"],
  ["media/MediaLibraryPage", "MediaLibraryPage", "Media library"],
  ["advanced/EnginePage", "EnginePage", "Engine — content types"],
  ["advanced/ContentTypeEditorPreview", "ContentTypeEditorPreview", "Content type"],
  ["advanced/SchemaBuilderPreview", "SchemaBuilderPreview", "Schema builder"],
  ["advanced/CollectionWorkspacePage", "CollectionWorkspacePage", "Collection workspace"],
  ["advanced/EntriesPage", "EntriesPage", "Entries"],
  ["advanced/EntryEditorPreview", "EntryEditorPreview", "Entry editor"],
  ["advanced/CustomScreensPage", "CustomScreensPage", "Custom screens"],
  ["advanced/CustomScreenEditorPreview", "CustomScreenEditorPreview", "Custom screen editor"],
  ["advanced/CustomScreenEntriesPage", "CustomScreenEntriesPage", "Custom screen entries"],
  ["advanced/FormsPage", "FormsPage", "Forms"],
  ["advanced/FormBuilderPreview", "FormBuilderPreview", "Form builder"],
  ["advanced/FormSubmissionsPage", "FormSubmissionsPage", "Form submissions"],
  ["advanced/ListingsPage", "ListingsPage", "Listings"],
  ["advanced/ListingEditorPreview", "ListingEditorPreview", "Listing editor"],
  ["advanced/FiltersPage", "FiltersPage", "Filters"],
  ["advanced/SearchModulePage", "SearchModulePage", "Search modules"],
  ["advanced/BookingPage", "BookingPage", "Booking"],
  ["advanced/ReviewsPage", "ReviewsPage", "Reviews moderation"],
  ["advanced/CommercePage", "CommercePage", "Commerce"],
  ["advanced/CommerceEditorPreview", "CommerceEditorPreview", "Product editor"],
  ["advanced/PopupsPage", "PopupsPage", "Popups"],
  ["advanced/PopupEditorPreview", "PopupEditorPreview", "Popup editor"],
  ["advanced/SolutionKitsPage", "SolutionKitsPage", "Solution kits"],
  ["advanced/WidgetLibraryPage", "WidgetLibraryPage", "Widget library"],
  ["advanced/PageTemplatesPage", "PageTemplatesPage", "Page templates"],
  ["store/PluginStorePage", "PluginStorePage", "Plugin store"],
  ["store/PluginDetailsPage", "PluginDetailsPage", "Plugin details"],
  ["themes/ThemesPage", "ThemesPage", "Admin UI theme"],
  ["tools/SearchPage", "SearchPage", "Global search"],
  ["tools/SeoManagerPage", "SeoManagerPage", "SEO manager"],
  ["tools/AnalyticsPage", "AnalyticsPage", "Analytics"],
  ["tools/BackupsPage", "BackupsPage", "Backups"],
  ["tools/ImportExportPage", "ImportExportPage", "Import / export"],
  ["tools/RedirectsPage", "RedirectsPage", "Redirects"],
  ["admin/UsersRolesPage", "UsersRolesPage", "Users & roles"],
  ["admin/PermissionsMatrixPage", "PermissionsMatrixPage", "Roles matrix"],
  ["admin/AuditLogsPage", "AuditLogsPage", "Audit logs"],
  ["admin/AccessLogsPage", "AccessLogsPage", "Access logs"],
  ["settings/GeneralSettingsPage", "GeneralSettingsPage", "General"],
  ["settings/SiteSettingsPage", "SiteSettingsPage", "Site"],
  ["settings/AssistantSettingsPage", "AssistantSettingsPage", "Assistant"],
  ["settings/SecuritySettingsPage", "SecuritySettingsPage", "Security"],
  ["settings/IpAllowlistPage", "IpAllowlistPage", "IP allowlist"],
  ["settings/SessionsPage", "SessionsPage", "Sessions"],
  ["settings/LoginAlertsPage", "LoginAlertsPage", "Login alerts"],
  ["settings/ApiKeysPage", "ApiKeysPage", "API keys"],
  ["settings/WebhooksPage", "WebhooksPage", "Webhooks"],
  ["settings/EmailSettingsPage", "EmailSettingsPage", "Email"],
  ["settings/StorageSettingsPage", "StorageSettingsPage", "Storage"],
  ["settings/IntegrationsPage", "IntegrationsPage", "Integrations"],
];

let created = 0;
for (const [rel, component, title] of PAGES) {
  const file = join("src/pages", `${rel}.tsx`);
  if (existsSync(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  const body = `import { StubPage } from "@/pages/StubPage";

export function ${component}() {
  return <StubPage title="${title}" />;
}
`;
  writeFileSync(file, body);
  created += 1;
}
console.log(`genstubs: created ${created} stub page(s)`);
