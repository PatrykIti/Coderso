import { listAccessLogs } from "../../services/access/accessLogService";
import { accessLogQuerySchema } from "../validation/accessLogSchemas";

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

export type AccessLogRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const parseNumber = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const parseDate = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

export function registerAccessLogRoutes(router: Router, deps: AccessLogRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/access-logs", requirePermission("audit:read"), async (ctx) => {
    const limit = parseNumber(ctx.query.limit) ?? 100;
    const status = ctx.query.status;
    const query = ctx.query.q;
    const userId = ctx.query.userId;
    const from = parseDate(ctx.query.from);
    const to = parseDate(ctx.query.to);

    validate(accessLogQuerySchema, {
      limit,
      status: status ?? undefined,
      q: query ?? undefined,
      userId: userId ?? undefined,
      from: ctx.query.from ?? undefined,
      to: ctx.query.to ?? undefined,
    });

    const items = await listAccessLogs({
      limit,
      status: status === "success" || status === "failed" ? status : undefined,
      query: query ?? undefined,
      userId: userId ?? undefined,
      from,
      to,
    });

    return { items };
  });
}
