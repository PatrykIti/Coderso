import { ApiError } from "../errorHandler";
import {
  addAllowlistEntry,
  listAllowlist,
  removeAllowlistEntry,
} from "../../services/security/ipAllowlistService";
import { logAudit } from "../../services/audit/auditService";
import { ipAllowlistCreateSchema } from "../validation/ipAllowlistSchemas";

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
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type IpAllowlistRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerIpAllowlistRoutes(router: Router, deps: IpAllowlistRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/ip-allowlist", requirePermission("settings:read"), async () => {
    const items = await listAllowlist();
    return { items };
  });

  router.post(
    "/ip-allowlist",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(ipAllowlistCreateSchema, ctx.body);
      const body = ctx.body as {
        cidr: string;
        label?: string;
        description?: string;
      };
      const entry = await addAllowlistEntry(body.cidr, body.label, body.description);
      if (!entry) {
        throw new ApiError("invalid_cidr", "Invalid CIDR", 400);
      }
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "security.allowlist_add",
        targetType: "ip_allowlist",
        targetId: entry.id,
        metadata: { cidr: entry.cidr },
      });
      return entry;
    }
  );

  router.delete(
    "/ip-allowlist/:id",
    requirePermission("settings:write"),
    async (ctx) => {
      const removed = await removeAllowlistEntry(ctx.params.id);
      if (!removed) {
        throw new ApiError("allowlist_not_found", "Allowlist entry not found", 404);
      }
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "security.allowlist_remove",
        targetType: "ip_allowlist",
        targetId: ctx.params.id,
        metadata: { cidr: removed.cidr },
      });
      return { ok: true };
    }
  );
}
