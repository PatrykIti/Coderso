import {
  listSeoDocuments,
  getSeoDocument,
  updateSeoDocumentById,
  runSeoAudit,
} from "../../services/seo/seoService";
import { seoAuditSchema, seoUpdateSchema } from "../validation/seoSchemas";

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

export type SeoRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerSeoRoutes(router: Router, deps: SeoRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/seo", requirePermission("content:read"), async () => {
    return listSeoDocuments();
  });

  router.get("/seo/:id", requirePermission("content:read"), async (ctx) => {
    const doc = await getSeoDocument(ctx.params.id);
    if (!doc) throw new Error("seo_not_found");
    return doc;
  });

  router.patch("/seo/:id", requirePermission("content:write"), async (ctx) => {
    validate(seoUpdateSchema, ctx.body);
    const body = ctx.body as {
      title?: string;
      description?: string;
      canonicalUrl?: string;
      robots?: string;
    };
    const doc = await updateSeoDocumentById(ctx.params.id, body);
    if (!doc) throw new Error("seo_not_found");
    return doc;
  });

  router.post("/seo/audit", requirePermission("content:read"), async (ctx) => {
    validate(seoAuditSchema, ctx.body);
    const body = ctx.body as { targetType?: "page" | "entry"; targetId?: string };
    if ((body.targetType && !body.targetId) || (!body.targetType && body.targetId)) {
      throw new Error("validation_error");
    }
    return runSeoAudit(body.targetType, body.targetId);
  });
}
