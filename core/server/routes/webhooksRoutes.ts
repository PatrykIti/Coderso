import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
import {
  createWebhook,
  deleteWebhook,
  listDeliveries,
  listWebhooks,
  updateWebhook,
} from "../../services/webhooks/webhooksService";
import { deliverWebhook } from "../../services/webhooks/deliveryService";
import {
  webhookCreateSchema,
  webhookTestSchema,
  webhookUpdateSchema,
} from "../validation/webhookSchemas";

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
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type WebhookRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerWebhooksRoutes(router: Router, deps: WebhookRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/settings/webhooks", requirePermission("settings:read"), async () => {
    const items = await listWebhooks();
    return { items };
  });

  router.post(
    "/settings/webhooks",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(webhookCreateSchema, ctx.body);
      const body = ctx.body as {
        name: string;
        url: string;
        events: string[];
        enabled?: boolean;
        secret?: string | null;
      };
      try {
        const created = await createWebhook(body);
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "webhook.create",
          targetType: "webhook",
          targetId: created.id,
          metadata: { name: created.name, url: created.url },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: created };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "webhook_name_required") {
            throw new ApiError("webhook_name_required", "Name is required", 400);
          }
          if (error.message === "webhook_url_required") {
            throw new ApiError("webhook_url_required", "URL is required", 400);
          }
          if (error.message === "webhook_events_required") {
            throw new ApiError("webhook_events_required", "Events are required", 400);
          }
        }
        throw error;
      }
    }
  );

  router.patch(
    "/settings/webhooks/:id",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(webhookUpdateSchema, ctx.body);
      try {
        const updated = await updateWebhook(
          ctx.params.id,
          ctx.body as Parameters<typeof updateWebhook>[1]
        );
        if (!updated) {
          throw new ApiError("webhook_not_found", "Webhook not found", 404);
        }
        await logAudit({
          actorId: ctx.user?.id ?? null,
          action: "webhook.update",
          targetType: "webhook",
          targetId: updated.id,
          metadata: { keys: Object.keys(ctx.body ?? {}) },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        return { item: updated };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "webhook_name_required") {
            throw new ApiError("webhook_name_required", "Name is required", 400);
          }
          if (error.message === "webhook_url_required") {
            throw new ApiError("webhook_url_required", "URL is required", 400);
          }
          if (error.message === "webhook_events_required") {
            throw new ApiError("webhook_events_required", "Events are required", 400);
          }
        }
        throw error;
      }
    }
  );

  router.delete(
    "/settings/webhooks/:id",
    requirePermission("settings:write"),
    async (ctx) => {
      const deleted = await deleteWebhook(ctx.params.id);
      if (!deleted) {
        throw new ApiError("webhook_not_found", "Webhook not found", 404);
      }
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "webhook.delete",
        targetType: "webhook",
        targetId: deleted.id,
        metadata: { name: deleted.name, url: deleted.url },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    }
  );

  router.get(
    "/settings/webhooks/:id/deliveries",
    requirePermission("settings:read"),
    async (ctx) => {
      const items = await listDeliveries(ctx.params.id);
      return { items };
    }
  );

  router.post(
    "/settings/webhooks/:id/test",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(webhookTestSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as { event?: string; payload?: Record<string, unknown> };
      const event = body.event ?? "webhook.test";
      const payload = body.payload ?? {
        message: "Webhook test",
        timestamp: new Date().toISOString(),
      };

      const result = await deliverWebhook({
        webhookId: ctx.params.id,
        event,
        payload,
      });

      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "webhook.test",
        targetType: "webhook",
        targetId: ctx.params.id,
        metadata: { status: result.status },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { ok: result.status === "success", result };
    }
  );
}

