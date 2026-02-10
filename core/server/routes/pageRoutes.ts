import {
  createPage,
  duplicatePage,
  deletePage,
  getPage,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
  type PageData,
} from "../../services/pages/pageService";
import { listPageTemplateOptions } from "../../services/pages/pageTemplateService";
import { createPreviewToken } from "../../services/pages/previewService";
import {
  listRevisions,
  restoreRevision,
} from "../../services/pages/revisionService";
import { logAudit } from "../../services/audit/auditService";
import { getActiveThemeProfile } from "../../services/themes/themeProfileService";
import {
  createPublicUrlContextFromHeaders,
  resolvePreviewUrl,
} from "../utils/previewUrls";
import {
  pageCreateSchema,
  pagePreviewSchema,
  pagePublishSchema,
  pageUpdateSchema,
} from "../validation/pageSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
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

  router.get(
    "/pages/template-options",
    requirePermission("content:read"),
    async () => {
      const profile = await getActiveThemeProfile();
      const themeName = profile?.themeName ?? "default";
      const resolved = await listPageTemplateOptions({ themeName });
      return {
        themeName: resolved.themeName,
        templates: resolved.templates.map((item) => ({ key: item.key, label: item.label })),
      };
    }
  );

  router.post("/pages", requirePermission("content:write"), async (ctx) => {
    validate(pageCreateSchema, ctx.body);
    const body = ctx.body as {
      title: string;
      slug: string;
      data: PageData;
      template?: string;
    };
    return createPage({
      title: body.title,
      slug: body.slug,
      data: body.data,
      template: body.template,
      authorId: ctx.user?.id,
    });
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
      validate(pagePublishSchema, ctx.body);
      if (!ctx.user?.id) throw new Error("auth_required");
      const body = ctx.body as { data?: PageData };
      const page = await publishPage(ctx.params.id, ctx.user.id, body.data);
      if (!page) throw new Error("page_not_found");
      await logAudit({
        actorId: ctx.user.id,
        action: "pages.publish",
        targetType: "page",
        targetId: page.id,
        metadata: { slug: page.slug },
      });
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
      const { token, expiresAt } = await createPreviewToken({
        targetType: "page",
        targetId: page.id,
        ttlMinutes: body.ttlMinutes,
      });

      const slugPath = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      const previewUrl = await resolvePreviewUrl({
        targetType: "page",
        token,
        path: slugPath,
      }, createPublicUrlContextFromHeaders(ctx.headers));
      return { token, previewUrl, expiresAt };
    }
  );

  router.post(
    "/pages/:id/duplicate",
    requirePermission("content:write"),
    async (ctx) => {
      const clone = await duplicatePage(ctx.params.id, ctx.user?.id);
      if (!clone) throw new Error("page_not_found");
      return clone;
    }
  );

  router.delete(
    "/pages/:id",
    requirePermission("content:write"),
    async (ctx) => {
      const page = await getPage(ctx.params.id);
      if (!page) throw new Error("page_not_found");
      const deleted = await deletePage(ctx.params.id);
      if (!deleted) throw new Error("page_not_found");
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.delete",
        targetType: "page",
        targetId: deleted.id,
        metadata: { slug: deleted.slug, title: deleted.title },
      });
      return { ok: true };
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
      const revision = await restoreRevision(ctx.params.revisionId);
      await logAudit({
        actorId: ctx.user?.id ?? null,
        action: "pages.restore",
        targetType: "page",
        targetId: revision.pageId,
        metadata: { revisionId: revision.id },
      });
      return { ok: true };
    }
  );
}
