import {
  exportConfig,
  importConfig,
  previewImport,
} from "../../services/tools/importExportService";
import { importBundleSchema } from "../validation/importExportSchemas";

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

export function registerImportExportRoutes(
  router: Router,
  deps: ImportExportRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get(
    "/tools/export",
    requirePermission("settings:read"),
    async () => exportConfig()
  );

  router.post(
    "/tools/import/preview",
    requirePermission("settings:read"),
    async (ctx) => {
      validate(importBundleSchema, ctx.body);
      return previewImport(ctx.body as Parameters<typeof previewImport>[0]);
    }
  );

  router.post("/tools/import", requirePermission("settings:write"), async (ctx) => {
    validate(importBundleSchema, ctx.body);
    return importConfig(ctx.body as Parameters<typeof importConfig>[0]);
  });
}
