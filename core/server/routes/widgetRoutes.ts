import type { RouteContext } from "../router";
import { listWidgetCatalog } from "../../services/widgets/widgetCatalogService";
import { registerEntryTeaserPreviewRoutes } from "./entryTeaserPreviewRoutes";
import { registerProductComparePreviewRoutes } from "./productComparePreviewRoutes";

export type WidgetRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type WidgetRouteDeps = {
  requirePermission: (permission: string) => WidgetRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: WidgetRouteHandler[]) => void;
  post: (path: string, ...handlers: WidgetRouteHandler[]) => void;
};

export function registerWidgetRoutes(router: Router, deps: WidgetRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/widgets", requirePermission("widgets:read"), async () => {
    const items = await listWidgetCatalog();
    return { items };
  });

  registerEntryTeaserPreviewRoutes(router, {
    requirePermission,
    validate,
  });

  registerProductComparePreviewRoutes(router, {
    requirePermission,
    validate,
  });
}
