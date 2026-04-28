import {
  createReview,
  deleteReview,
  getReview,
  listReviews,
  moderateReviewStatus,
  updateReview,
  type ReviewCreateInput,
  type ReviewUpdateInput,
} from "../../services/reviews/reviewService";
import type { ReviewStatus } from "../../services/reviews/reviewTypes";
import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  reviewCreateSchema,
  reviewListQuerySchema,
  reviewStatusSchema,
  reviewUpdateSchema,
} from "../validation/reviewSchemas";

export type ReviewsRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type ReviewsRouteDeps = {
  requirePermission: (permission: string) => ReviewsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: ReviewsRouteHandler[]) => void;
  post: (path: string, ...handlers: ReviewsRouteHandler[]) => void;
  patch: (path: string, ...handlers: ReviewsRouteHandler[]) => void;
  delete: (path: string, ...handlers: ReviewsRouteHandler[]) => void;
};

const parseNumber = (value: string | undefined) => {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
};

const normalizeListQuery = (query: Record<string, string | undefined>) => {
  const entityType =
    typeof query.entityType === "string" && query.entityType.trim().length > 0
      ? query.entityType.trim()
      : undefined;
  const entityId =
    typeof query.entityId === "string" && query.entityId.trim().length > 0
      ? query.entityId.trim()
      : undefined;
  const status =
    typeof query.status === "string" && query.status.trim().length > 0
      ? query.status.trim()
      : undefined;
  const limit = parseNumber(query.limit);
  const offset = parseNumber(query.offset);

  return {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(status ? { status } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };
};

export const mapReviewError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "review_not_found":
      return new ApiError("review_not_found", "Review not found", 404);
    default:
      if (error.message.startsWith("review_")) {
        return new ApiError(error.message, "Invalid review payload", 400);
      }
      return null;
  }
};

const withReviewErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapReviewError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerReviewsRoutes(router: Router, deps: ReviewsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/reviews", requirePermission("reviews:read"), async (ctx) => {
    return withReviewErrors(async () => {
      const query = normalizeListQuery(ctx.query);
      validate(reviewListQuerySchema, query);
      const items = await listReviews(query as Parameters<typeof listReviews>[0]);
      return { items };
    });
  });

  router.get("/reviews/:id", requirePermission("reviews:read"), async (ctx) => {
    return withReviewErrors(async () => {
      const item = await getReview(ctx.params.id);
      if (!item) throw new Error("review_not_found");
      return item;
    });
  });

  router.post("/reviews", requirePermission("reviews:write"), async (ctx) => {
    return withReviewErrors(async () => {
      validate(reviewCreateSchema, ctx.body ?? {});
      return createReview((ctx.body ?? {}) as ReviewCreateInput);
    });
  });

  router.patch("/reviews/:id", requirePermission("reviews:write"), async (ctx) => {
    return withReviewErrors(async () => {
      validate(reviewUpdateSchema, ctx.body ?? {});
      const updated = await updateReview(ctx.params.id, (ctx.body ?? {}) as ReviewUpdateInput);
      if (!updated) throw new Error("review_not_found");
      return updated;
    });
  });

  router.patch("/reviews/:id/status", requirePermission("reviews:write"), async (ctx) => {
    return withReviewErrors(async () => {
      const payload = ctx.body ?? {};
      validate(reviewStatusSchema, payload);
      const status = (payload as { status: ReviewStatus }).status;
      const updated = await moderateReviewStatus(ctx.params.id, status, {
        moderatedBy: ctx.user?.id ?? null,
      });
      if (!updated) throw new Error("review_not_found");
      return updated;
    });
  });

  router.delete("/reviews/:id", requirePermission("reviews:write"), async (ctx) => {
    return withReviewErrors(async () => {
      const deleted = await deleteReview(ctx.params.id);
      if (!deleted) throw new Error("review_not_found");
      return { ok: true };
    });
  });
}
