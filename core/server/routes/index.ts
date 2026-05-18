import type { RouteContext, Router } from "../router";
import { registerAuthRoutes } from "./authRoutes";
import { registerPageRoutes } from "./pageRoutes";
import { registerMediaRoutes } from "./mediaRoutes";
import { registerMenuRoutes } from "./menuRoutes";
import { registerSettingsRoutes } from "./settingsRoutes";
import { registerContentTypeRoutes } from "./contentTypeRoutes";
import { registerContentEntryRoutes } from "./contentEntryRoutes";
import { registerCustomScreenRoutes } from "./customScreenRoutes";
import { registerSearchRoutes } from "./searchRoutes";
import { registerAuditRoutes } from "./auditRoutes";
import { registerThemeRoutes } from "./themeRoutes";
import { registerAdminThemeRoutes } from "./adminThemeRoutes";
import { registerSeoRoutes } from "./seoRoutes";
import { registerAnalyticsRoutes } from "./analyticsRoutes";
import { registerDashboardRoutes } from "./dashboardRoutes";
import { registerBackupRoutes } from "./backupRoutes";
import { registerImportExportRoutes } from "./importExportRoutes";
import { registerRedirectRoutes } from "./redirectRoutes";
import { registerAdminUsersRoutes } from "./adminUsersRoutes";
import { registerAdminRolesRoutes } from "./adminRolesRoutes";
import { registerSessionAdminRoutes } from "./sessionAdminRoutes";
import { registerAccessLogRoutes } from "./accessLogRoutes";
import { registerIpAllowlistRoutes } from "./ipAllowlistRoutes";
import { registerFormsRoutes } from "./formsRoutes";
import { registerFormActionsRoutes } from "./formActionsRoutes";
import { registerApiKeysRoutes } from "./apiKeysRoutes";
import { registerWebhooksRoutes } from "./webhooksRoutes";
import { registerEmailSettingsRoutes } from "./emailSettingsRoutes";
import { registerIntegrationsRoutes } from "./integrationsRoutes";
import { registerPluginsRoutes } from "./pluginsRoutes";
import { registerUserSettingsRoutes } from "./userSettingsRoutes";
import { registerWidgetRoutes } from "./widgetRoutes";
import { registerWidgetTemplateRoutes } from "./widgetTemplateRoutes";
import { registerWidgetTemplateCategoryRoutes } from "./widgetTemplateCategoryRoutes";
import { registerTaxonomyRoutes } from "./taxonomyRoutes";
import { registerAssistantRoutes } from "./assistantRoutes";
import { registerListingsRoutes } from "./listingsRoutes";
import { registerDetailPageRoutes } from "./detailPageRoutes";
import { registerFilterRoutes } from "./filterRoutes";
import { registerBookingRoutes } from "./bookingRoutes";
import { registerCommerceRoutes } from "./commerceRoutes";
import { registerPopupsRoutes } from "./popupsRoutes";
import { registerReviewsRoutes } from "./reviewsRoutes";
import { registerSolutionKitsRoutes } from "./solutionKitsRoutes";
import { registerPostsRoutes } from "./postsRoutes";

export type RouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  requirePermission: (permission: string) => (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerAllRoutes(router: Router, deps: RouteDeps) {
  registerAuthRoutes(router, { requireAuth: deps.requireAuth, validate: deps.validate });
  registerPageRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerMediaRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerMenuRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerContentTypeRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerContentEntryRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerCustomScreenRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerPostsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerSearchRoutes(router, { requirePermission: deps.requirePermission });
  registerAuditRoutes(router, { requirePermission: deps.requirePermission });
  registerThemeRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerAdminThemeRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerSeoRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerAnalyticsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerDashboardRoutes(router, { requirePermission: deps.requirePermission });
  registerBackupRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerImportExportRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerRedirectRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerAdminUsersRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerAdminRolesRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerSessionAdminRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerAccessLogRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerIpAllowlistRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerFormsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerFormActionsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerApiKeysRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerWebhooksRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerEmailSettingsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerIntegrationsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerPluginsRoutes(router, {
    requirePermission: deps.requirePermission,
  });
  registerSettingsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerUserSettingsRoutes(router, { requireAuth: deps.requireAuth, validate: deps.validate });
  registerWidgetRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerWidgetTemplateRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerWidgetTemplateCategoryRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerTaxonomyRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerAssistantRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerListingsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerDetailPageRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerFilterRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerBookingRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerPopupsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerReviewsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerSolutionKitsRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
  registerCommerceRoutes(router, {
    requirePermission: deps.requirePermission,
    validate: deps.validate,
  });
}
