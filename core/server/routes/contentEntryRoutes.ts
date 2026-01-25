import {
  createEntry,
  createEntryPreview,
  getEntry,
  listEntries,
  publishEntry,
  unpublishEntry,
  updateEntry,
} from "../../services/content/entryService";
import { getContentTypeBySlug } from "../../services/content/typeService";
import {
  contentEntryCreateSchema,
  contentEntryPreviewSchema,
  contentEntryUpdateSchema,
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
};

export type ContentEntryRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerContentEntryRoutes(
  router: Router,
  deps: ContentEntryRouteDeps
) {
  const { requirePermission, validate } = deps;

  router.get(
    "/content/:type/entries",
    requirePermission("content:read"),
    async (ctx) => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      return listEntries(type.id);
    }
  );

  router.post(
    "/content/:type/entries",
    requirePermission("content:write"),
    async (ctx) => {
      validate(contentEntryCreateSchema, ctx.body);
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const body = ctx.body as { title: string; slug: string; data: unknown };
      return createEntry(type.id, {
        title: body.title,
        slug: body.slug,
        data: body.data as Record<string, unknown>,
      });
    }
  );

  router.get(
    "/content/:type/entries/:id",
    requirePermission("content:read"),
    async (ctx) => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      return entry;
    }
  );

  router.patch(
    "/content/:type/entries/:id",
    requirePermission("content:write"),
    async (ctx) => {
      validate(contentEntryUpdateSchema, ctx.body);
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");

      const body = ctx.body as {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      };
      return updateEntry(entry.id, body);
    }
  );

  router.post(
    "/content/:type/entries/:id/preview",
    requirePermission("content:read"),
    async (ctx) => {
      validate(contentEntryPreviewSchema, ctx.body);
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");

      const body = ctx.body as { ttlMinutes?: number };
      const { token, expiresAt } = await createEntryPreview(
        entry.id,
        body.ttlMinutes
      );
      const url = `/preview?type=content&contentType=${type.slug}&slug=${entry.slug}&token=${token}`;
      return { url, expiresAt };
    }
  );

  router.post(
    "/content/:type/entries/:id/publish",
    requirePermission("content:publish"),
    async (ctx) => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      if (!ctx.user?.id) throw new Error("auth_required");
      await publishEntry(entry.id, ctx.user.id);
      return { ok: true };
    }
  );

  router.post(
    "/content/:type/entries/:id/unpublish",
    requirePermission("content:publish"),
    async (ctx) => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      await unpublishEntry(entry.id);
      return { ok: true };
    }
  );
}
