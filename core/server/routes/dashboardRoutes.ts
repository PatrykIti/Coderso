import { getDashboardData } from "../../services/dashboard/dashboardService";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
};

export type DashboardRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
};

export function registerDashboardRoutes(router: Router, deps: DashboardRouteDeps) {
  const { requirePermission } = deps;

  router.get("/dashboard", requirePermission("content:read"), async () => {
    return getDashboardData();
  });
}
