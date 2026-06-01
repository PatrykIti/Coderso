import {
  listSeoDocuments,
  getSeoDocument,
  updateSeoDocumentById,
  runSeoAudit,
} from "../../services/seo/seoService";
import type { SeoAuditCheckId } from "../../services/seo/seoTypes";
import { ApiError } from "../errorHandler";
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

export const mapSeoError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    if (error.message === "seo_not_found") {
      return new ApiError("seo_not_found", "SEO document not found.", 404);
    }
    if (error.message === "seo_audit_checks_required") {
      return new ApiError(
        "seo_audit_checks_required",
        "At least one SEO audit check is required.",
        400
      );
    }
    if (error.message === "seo_audit_target_invalid") {
      return new ApiError(
        "seo_audit_target_invalid",
        "SEO audit targetType and targetId must be provided together.",
        400
      );
    }
  }
  return null;
};

const throwMappedSeoError = (error: unknown): never => {
  const mapped = mapSeoError(error);
  if (mapped) throw mapped;
  if (error instanceof Error) {
    throw new ApiError("seo_error", error.message, 500);
  }
  throw error;
};

export function registerSeoRoutes(router: Router, deps: SeoRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/seo", requirePermission("content:read"), async () => {
    return listSeoDocuments();
  });

  router.get("/seo/:id", requirePermission("content:read"), async (ctx) => {
    const doc = await getSeoDocument(ctx.params.id);
    if (!doc) throw new ApiError("seo_not_found", "SEO document not found.", 404);
    return doc;
  });

  router.patch("/seo/:id", requirePermission("content:write"), async (ctx) => {
    try {
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
    } catch (error) {
      throwMappedSeoError(error);
    }
  });

  router.post("/seo/audit", requirePermission("content:read"), async (ctx) => {
    try {
      validate(seoAuditSchema, ctx.body);
      const body = ctx.body as {
        targetType?: "page" | "entry";
        targetId?: string;
        checks?: SeoAuditCheckId[];
      };
      if ((body.targetType && !body.targetId) || (!body.targetType && body.targetId)) {
        throw new Error("seo_audit_target_invalid");
      }
      return runSeoAudit(body.targetType, body.targetId, body.checks);
    } catch (error) {
      throwMappedSeoError(error);
    }
  });
}
