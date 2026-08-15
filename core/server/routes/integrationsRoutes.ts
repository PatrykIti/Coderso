import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
import {
  getIntegration,
  listIntegrations,
  requestIntegration,
  runIntegrationHealthCheck,
  updateIntegration,
} from "../../services/integrations/integrationsService";
import {
  integrationRequestSchema,
  integrationUpdateSchema,
} from "../validation/integrationsSchemas";

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
  patch: (path: string, ...handlers: RouteHandler[]) => void;
};

export type IntegrationsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerIntegrationsRoutes(router: Router, deps: IntegrationsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/settings/integrations", requirePermission("settings:read"), async () => {
    const items = await listIntegrations();
    return { items };
  });

  router.get("/settings/integrations/:id", requirePermission("settings:read"), async (ctx) => {
    const item = await getIntegration(ctx.params.id);
    if (!item) {
      throw new ApiError("integration_not_found", "Integration not found", 404);
    }
    return { item };
  });

  router.patch("/settings/integrations/:id", requirePermission("settings:write"), async (ctx) => {
    validate(integrationUpdateSchema, ctx.body);
    try {
      const updated = await updateIntegration(
        ctx.params.id,
        ctx.body as { config?: Record<string, string | null> }
      );
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "integration.update",
        targetType: "integration",
        targetId: ctx.params.id,
        metadata: { keys: Object.keys((ctx.body as { config?: object })?.config ?? {}) },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { item: updated };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "integration_not_found") {
          throw new ApiError("integration_not_found", "Integration not found", 404);
        }
        if (error.message === "integration_config_invalid") {
          throw new ApiError("integration_config_invalid", "Invalid integration config", 400);
        }
        if (error.message === "secret_master_key_invalid") {
          throw new ApiError("secret_master_key_invalid", "Master key invalid", 400);
        }
      }
      throw error;
    }
  });

  router.post(
    "/settings/integrations/:id/check",
    requirePermission("settings:write"),
    async (ctx) => {
      try {
        const updated = await runIntegrationHealthCheck(ctx.params.id);
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "integration.check",
          targetType: "integration",
          targetId: ctx.params.id,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: updated };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "integration_not_found") {
            throw new ApiError("integration_not_found", "Integration not found", 404);
          }
          if (error.message === "secret_master_key_missing") {
            throw new ApiError("secret_master_key_missing", "Master key missing", 400);
          }
          if (error.message === "secret_master_key_invalid") {
            throw new ApiError("secret_master_key_invalid", "Master key invalid", 400);
          }
        }
        throw error;
      }
    }
  );

  router.post(
    "/settings/integrations/requests",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(integrationRequestSchema, ctx.body);
      try {
        const body = ctx.body as {
          name: string;
          website?: string | null;
          notes?: string | null;
        };
        const created = await requestIntegration(body);
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "integration.request",
          targetType: "integration_request",
          targetId: created.id,
          metadata: { name: created.name },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: created };
      } catch (error) {
        if (error instanceof Error && error.message === "integration_request_invalid") {
          throw new ApiError("integration_request_invalid", "Name is required", 400);
        }
        throw error;
      }
    }
  );
}
