import {
  createContentType,
  deleteContentType,
  listContentTypes,
  updateContentType,
} from "../../services/content/typeService";
import {
  contentTypeCreateSchema,
  contentTypeUpdateSchema,
} from "../validation/contentSchemas";

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
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type ContentTypeRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerContentTypeRoutes(
  router: Router,
  deps: ContentTypeRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get("/content-types", requirePermission("content:read"), async () => {
    return listContentTypes();
  });

  router.post(
    "/content-types",
    requirePermission("content:write"),
    async (ctx) => {
      validate(contentTypeCreateSchema, ctx.body);
      const body = ctx.body as {
        name: string;
        slug: string;
        schema: Record<string, unknown>;
      };
      return createContentType(body);
    }
  );

  router.patch(
    "/content-types/:id",
    requirePermission("content:write"),
    async (ctx) => {
      validate(contentTypeUpdateSchema, ctx.body);
      const body = ctx.body as {
        name?: string;
        slug?: string;
        schema?: Record<string, unknown>;
      };
      const updated = await updateContentType(ctx.params.id, body);
      if (!updated) throw new Error("content_type_not_found");
      return updated;
    }
  );

  router.delete(
    "/content-types/:id",
    requirePermission("content:write"),
    async (ctx) => {
      const removed = await deleteContentType(ctx.params.id);
      if (!removed) throw new Error("content_type_not_found");
      return { ok: true };
    }
  );
}
