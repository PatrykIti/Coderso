import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "../../services/redirects/redirectService";
import { ApiError } from "../errorHandler";
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

export const mapRedirectError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  const code = error instanceof Error ? error.message : String(error);
  switch (code) {
    case "redirect_not_found":
      return new ApiError("redirect_not_found", "Redirect not found.", 404);
    case "redirect_exists":
      return new ApiError(
        "redirect_exists",
        "A redirect with this source path already exists.",
        409
      );
    case "redirect_invalid":
      return new ApiError("redirect_invalid", "Redirect data is invalid.", 400);
    case "redirect_target_external":
      return new ApiError(
        "redirect_target_external",
        "Redirect destination must be an internal path.",
        400
      );
    case "redirect_loop":
      return new ApiError("redirect_loop", "Redirect would create a loop.", 400);
    default:
      return null;
  }
};

const withRedirectErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapRedirectError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerRedirectRoutes(router: Router, deps: RedirectRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/redirects", requirePermission("settings:read"), async () => {
    return withRedirectErrors(() => listRedirects());
  });

  router.post("/redirects", requirePermission("settings:write"), async (ctx) => {
    validate(redirectCreateSchema, ctx.body);
    return withRedirectErrors(() =>
      createRedirect(ctx.body as Parameters<typeof createRedirect>[0])
    );
  });

  router.patch("/redirects/:id", requirePermission("settings:write"), async (ctx) => {
    validate(redirectUpdateSchema, ctx.body);
    return withRedirectErrors(async () => {
      const updated = await updateRedirect(
        ctx.params.id,
        ctx.body as Parameters<typeof updateRedirect>[1]
      );
      if (!updated) throw new Error("redirect_not_found");
      return updated;
    });
  });

  router.delete("/redirects/:id", requirePermission("settings:write"), async (ctx) => {
    return withRedirectErrors(async () => {
      const deleted = await deleteRedirect(ctx.params.id);
      if (!deleted) throw new Error("redirect_not_found");
      return { ok: true };
    });
  });
}
