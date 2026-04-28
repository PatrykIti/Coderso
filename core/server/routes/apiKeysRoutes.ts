import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../../services/security/apiKeysService";
import { apiKeyCreateSchema } from "../validation/apiKeySchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

export type ApiKeyRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerApiKeysRoutes(router: Router, deps: ApiKeyRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get(
    "/settings/api-keys",
    requirePermission("settings:read"),
    async () => {
      const items = await listApiKeys();
      return { items };
    }
  );

  router.post(
    "/settings/api-keys",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(apiKeyCreateSchema, ctx.body);
      const body = ctx.body as { name: string; scopes: string[] };

      try {
        const created = await createApiKey({
          name: body.name,
          scopes: body.scopes,
        });
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "api_keys.create",
          targetType: "api_key",
          targetId: created.apiKey.id,
          metadata: { name: created.apiKey.name, scopes: created.apiKey.scopes },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: created.apiKey, secret: created.secret };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "api_key_name_required") {
            throw new ApiError("api_key_name_required", "Name is required", 400);
          }
          if (error.message === "api_key_scopes_required") {
            throw new ApiError("api_key_scopes_required", "Scopes are required", 400);
          }
        }
        throw error;
      }
    }
  );

  router.post(
    "/settings/api-keys/:id/rotate",
    requirePermission("settings:write"),
    async (ctx) => {
      try {
        const rotated = await rotateApiKey(ctx.params.id);
        if (!rotated) {
          throw new ApiError("api_key_not_found", "API key not found", 404);
        }
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "api_keys.rotate",
          targetType: "api_key",
          targetId: rotated.apiKey.id,
          metadata: { name: rotated.apiKey.name },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: rotated.apiKey, secret: rotated.secret };
      } catch (error) {
        if (error instanceof Error && error.message === "api_key_revoked") {
          throw new ApiError("api_key_revoked", "API key revoked", 400);
        }
        throw error;
      }
    }
  );

  router.post(
    "/settings/api-keys/:id/revoke",
    requirePermission("settings:write"),
    async (ctx) => {
      const revoked = await revokeApiKey(ctx.params.id);
      if (!revoked) {
        throw new ApiError("api_key_not_found", "API key not found", 404);
      }
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "api_keys.revoke",
        targetType: "api_key",
        targetId: revoked.id,
        metadata: { name: revoked.name },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    }
  );
}

