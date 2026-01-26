import {
  createPage,
  getPage,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
  type PageData,
} from "../../services/pages/pageService";
import { createPreviewToken } from "../../services/pages/previewService";
import {
  listRevisions,
  restoreRevision,
} from "../../services/pages/revisionService";
import {
  pageCreateSchema,
  pagePreviewSchema,
  pageUpdateSchema,
} from "../validation/pageSchemas";

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

export type PageRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerPageRoutes(router: Router, deps: PageRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/pages", requirePermission("content:read"), async () => {
    return listPages();
  });

  router.post("/pages", requirePermission("content:write"), async (ctx) => {
    validate(pageCreateSchema, ctx.body);
    const body = ctx.body as { title: string; slug: string; data: PageData };
    return createPage({ title: body.title, slug: body.slug, data: body.data });
  });

  router.get("/pages/:id", requirePermission("content:read"), async (ctx) => {
    const page = await getPage(ctx.params.id);
    if (!page) throw new Error("page_not_found");
    return page;
  });

  router.patch("/pages/:id", requirePermission("content:write"), async (ctx) => {
    validate(pageUpdateSchema, ctx.body);
    const body = ctx.body as {
      title?: string;
      slug?: string;
      data?: PageData;
    };
    const page = await updatePage(ctx.params.id, {
      title: body.title,
      slug: body.slug,
      data: body.data,
    });
    if (!page) throw new Error("page_not_found");
    return page;
  });

  router.post(
    "/pages/:id/publish",
    requirePermission("content:publish"),
    async (ctx) => {
      if (!ctx.user?.id) throw new Error("auth_required");
      const page = await publishPage(ctx.params.id, ctx.user.id);
      if (!page) throw new Error("page_not_found");
      return { ok: true };
    }
  );

  router.post(
    "/pages/:id/unpublish",
    requirePermission("content:publish"),
    async (ctx) => {
      const page = await unpublishPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");
      return { ok: true };
    }
  );

  router.post(
    "/pages/:id/preview",
    requirePermission("content:read"),
    async (ctx) => {
      validate(pagePreviewSchema, ctx.body);
      const page = await getPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");

      const body = ctx.body as { ttlMinutes?: number };
      const { token } = await createPreviewToken({
        targetType: "page",
        targetId: page.id,
        ttlMinutes: body.ttlMinutes,
      });

      const url = `/preview?type=page&path=/${page.slug}&token=${token}`;
      return { url };
    }
  );

  router.get(
    "/pages/:id/revisions",
    requirePermission("content:read"),
    async (ctx) => {
      return listRevisions(ctx.params.id);
    }
  );

  router.post(
    "/pages/:id/revisions/:revisionId/restore",
    requirePermission("content:write"),
    async (ctx) => {
      await restoreRevision(ctx.params.revisionId);
      return { ok: true };
    }
  );
}
