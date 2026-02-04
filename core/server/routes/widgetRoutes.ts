import type { RouteContext } from "../router";
import { listWidgetCatalog } from "../../services/widgets/widgetCatalogService";

export type WidgetRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type WidgetRouteDeps = {
  requirePermission: (permission: string) => WidgetRouteHandler;
};

export type Router = {
  get: (path: string, ...handlers: WidgetRouteHandler[]) => void;
};

export function registerWidgetRoutes(router: Router, deps: WidgetRouteDeps) {
  const { requirePermission } = deps;

  router.get("/widgets", requirePermission("widgets:read"), async () => {
    const items = await listWidgetCatalog();
    return { items };
  });
}
