import { listAudit } from "../../services/audit/auditService";

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

export type AuditRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
};

function parseLimit(input: string | undefined) {
  if (!input) return 50;
  const value = Number(input);
  if (!Number.isFinite(value)) return 50;
  return Math.min(Math.max(Math.floor(value), 1), 200);
}

export function registerAuditRoutes(router: Router, deps: AuditRouteDeps) {
  const { requirePermission } = deps;

  router.get("/audit", requirePermission("audit:read"), async (ctx) => {
    const limit = parseLimit(ctx.query.limit);
    const items = await listAudit(limit);
    return { items };
  });
}
