import type { RouteContext, Router } from "../router";
import { registerAuthRoutes } from "./authRoutes";
import { registerPageRoutes } from "./pageRoutes";
import { registerMediaRoutes } from "./mediaRoutes";
import { registerMenuRoutes } from "./menuRoutes";
import { registerSettingsRoutes } from "./settingsRoutes";
import { registerContentTypeRoutes } from "./contentTypeRoutes";
import { registerContentEntryRoutes } from "./contentEntryRoutes";
import { registerSearchRoutes } from "./searchRoutes";
import { registerAuditRoutes } from "./auditRoutes";
import { registerThemeRoutes } from "./themeRoutes";
import { registerAdminThemeRoutes } from "./adminThemeRoutes";
import { registerSeoRoutes } from "./seoRoutes";
import { registerAnalyticsRoutes } from "./analyticsRoutes";
import { registerBackupRoutes } from "./backupRoutes";
import { registerImportExportRoutes } from "./importExportRoutes";
import { registerRedirectRoutes } from "./redirectRoutes";
import { registerAdminUsersRoutes } from "./adminUsersRoutes";
import { registerAdminRolesRoutes } from "./adminRolesRoutes";

export type RouteDeps = {
  requireAuth: (ctx: RouteContext) => Promise<void> | void;
  requirePermission: (permission: string) => (ctx: RouteContext) => Promise<void> | void;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerAllRoutes(router: Router, deps: RouteDeps) {
  registerAuthRoutes(router, { requireAuth: deps.requireAuth, validate: deps.validate });
  registerPageRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerMediaRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerMenuRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerSettingsRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerContentTypeRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerContentEntryRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerSearchRoutes(router, { requirePermission: deps.requirePermission });
  registerAuditRoutes(router, { requirePermission: deps.requirePermission });
  registerThemeRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerAdminThemeRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerSeoRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerAnalyticsRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerBackupRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerImportExportRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerRedirectRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerAdminUsersRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
  registerAdminRolesRoutes(router, { requirePermission: deps.requirePermission, validate: deps.validate });
}
