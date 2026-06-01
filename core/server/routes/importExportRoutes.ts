import {
  exportConfig,
  importConfig,
  previewImport,
} from "../../services/tools/importExportService";
import type {
  ExportIncludeOption,
  ExportRequest,
  ExportTarget,
} from "../../services/tools/importExportTypes";
import { ApiError } from "../errorHandler";
import { exportRequestSchema, importBundleSchema } from "../validation/importExportSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

export type ImportExportRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const exportQueryKeys = new Set(["target", "include"]);

const validationError = (path: string, message: string, keyword: string) =>
  new ApiError("validation_error", "Invalid payload", 400, [{ path, message, keyword }]);

const assertKnownQuery = (query: Record<string, string | undefined>, allowed: Set<string>) => {
  const unknown = Object.keys(query).find((key) => query[key] !== undefined && !allowed.has(key));
  if (unknown) {
    throw validationError(unknown, "must NOT have additional properties", "additionalProperties");
  }
};

const parseIncludeQuery = (value: string | undefined) => {
  if (value === undefined) return undefined;
  return value
    .split(",")
    .map((option) => option.trim())
    .filter((option) => option.length > 0) as ExportIncludeOption[];
};

export const mapImportExportError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  const code = error instanceof Error ? error.message : String(error);
  switch (code) {
    case "export_target_invalid":
      return new ApiError("export_target_invalid", "Export target is not supported.", 400);
    case "export_include_required":
      return new ApiError("export_include_required", "Select at least one export option.", 400);
    case "export_include_invalid":
      return new ApiError("export_include_invalid", "Export options are invalid.", 400);
    case "import_bundle_version_invalid":
      return new ApiError(
        "import_bundle_version_invalid",
        "Import bundle version is not supported.",
        400
      );
    case "import_bundle_exported_at_invalid":
      return new ApiError(
        "import_bundle_exported_at_invalid",
        "Import bundle timestamp is invalid.",
        400
      );
    case "theme_profile_invalid":
      return new ApiError("theme_profile_invalid", "Theme profile data is invalid.", 400);
    case "theme_route_invalid":
      return new ApiError("theme_route_invalid", "Theme route data is invalid.", 400);
    case "theme_routes_duplicate":
      return new ApiError("theme_routes_duplicate", "Theme routes contain duplicate paths.", 400);
    case "admin_theme_template_invalid":
      return new ApiError(
        "admin_theme_template_invalid",
        "Admin theme template data is invalid.",
        400
      );
    case "admin_theme_profile_invalid":
      return new ApiError(
        "admin_theme_profile_invalid",
        "Admin theme profile data is invalid.",
        400
      );
    case "admin_theme_template_not_found":
      return new ApiError(
        "admin_theme_template_not_found",
        "Admin theme profile references a missing template.",
        400
      );
    case "menu_invalid":
      return new ApiError("menu_invalid", "Menu data is invalid.", 400);
    case "menu_item_label_required":
      return new ApiError("menu_item_label_required", "Menu item label is required.", 400);
    case "menu_item_link_invalid":
      return new ApiError(
        "menu_item_link_invalid",
        "Menu item must reference either a URL or page.",
        400
      );
    case "menu_item_page_missing":
      return new ApiError("menu_item_page_missing", "Menu item references a missing page.", 400);
    case "menu_item_id_duplicate":
      return new ApiError("menu_item_id_duplicate", "Menu item identifiers must be unique.", 400);
    case "menu_items_cycle":
      return new ApiError("menu_items_cycle", "Menu item hierarchy contains a cycle.", 400);
    case "redirect_invalid":
      return new ApiError("redirect_invalid", "Redirect data is invalid.", 400);
    case "redirects_duplicate":
      return new ApiError("redirects_duplicate", "Redirects contain duplicate source paths.", 400);
    default:
      if (code.startsWith("import_") && code.endsWith("_invalid")) {
        return new ApiError(code, "Import bundle contains an invalid identifier.", 400);
      }
      return null;
  }
};

const withImportExportErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapImportExportError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerImportExportRoutes(router: Router, deps: ImportExportRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/tools/export", requirePermission("settings:read"), async (ctx) => {
    assertKnownQuery(ctx.query, exportQueryKeys);
    const payload: ExportRequest = {};
    if (ctx.query.target !== undefined) {
      payload.target = ctx.query.target as ExportTarget;
    }
    const include = parseIncludeQuery(ctx.query.include);
    if (include !== undefined) {
      payload.include = include;
    }
    validate(exportRequestSchema, payload);
    return withImportExportErrors(async () => exportConfig(payload));
  });

  router.post("/tools/import/preview", requirePermission("settings:read"), async (ctx) => {
    validate(importBundleSchema, ctx.body);
    return withImportExportErrors(async () =>
      previewImport(ctx.body as Parameters<typeof previewImport>[0])
    );
  });

  router.post("/tools/import", requirePermission("settings:write"), async (ctx) => {
    validate(importBundleSchema, ctx.body);
    return withImportExportErrors(async () =>
      importConfig(ctx.body as Parameters<typeof importConfig>[0])
    );
  });
}
