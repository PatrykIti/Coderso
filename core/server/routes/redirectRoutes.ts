import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "../../services/redirects/redirectService";
import { redirectCreateSchema, redirectUpdateSchema } from "../validation/redirectSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type RedirectRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerRedirectRoutes(router: Router, deps: RedirectRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/redirects", requirePermission("settings:read"), async () => {
    return listRedirects();
  });

  router.post("/redirects", requirePermission("settings:write"), async (ctx) => {
    validate(redirectCreateSchema, ctx.body);
    return createRedirect(ctx.body as Parameters<typeof createRedirect>[0]);
  });

  router.patch(
    "/redirects/:id",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(redirectUpdateSchema, ctx.body);
      const updated = await updateRedirect(ctx.params.id, ctx.body as Parameters<typeof updateRedirect>[1]);
      if (!updated) throw new Error("redirect_not_found");
      return updated;
    }
  );

  router.delete(
    "/redirects/:id",
    requirePermission("settings:write"),
    async (ctx) => {
      const deleted = await deleteRedirect(ctx.params.id);
      if (!deleted) throw new Error("redirect_not_found");
      return { ok: true };
    }
  );
}
