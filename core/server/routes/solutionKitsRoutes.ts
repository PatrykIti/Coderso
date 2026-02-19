import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  solutionKitIdSchema,
  solutionKitPlanRequestSchema,
} from "../validation/solutionKitSchemas";
import {
  getSolutionKit,
  listSolutionKits,
  previewSolutionKitPlan,
} from "../../services/kits/solutionKitsService";
import type {
  SiteBuilderPlanInput,
  SolutionKitId,
} from "../../services/kits/solutionKitTypes";

export type SolutionKitsRouteHandler =
  | ((ctx: RouteContext) => Promise<unknown> | unknown)
  | ((ctx: RouteContext) => unknown);

export type SolutionKitsRouteDeps = {
  requirePermission: (permission: string) => SolutionKitsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: SolutionKitsRouteHandler[]) => void;
  post: (path: string, ...handlers: SolutionKitsRouteHandler[]) => void;
};

export const mapSolutionKitError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "solution_kit_not_found":
      return new ApiError("solution_kit_not_found", "Solution kit not found", 404);
    case "solution_kit_catalog_empty":
      return new ApiError("solution_kit_catalog_empty", "Solution kit catalog is empty", 500);
    default:
      if (error.message.startsWith("solution_kit_")) {
        return new ApiError(error.message, "Invalid solution kit payload", 400);
      }
      return null;
  }
};

const withSolutionKitErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapSolutionKitError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerSolutionKitsRoutes(router: Router, deps: SolutionKitsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/solution-kits", requirePermission("solution-kits:read"), async () => {
    return withSolutionKitErrors(async () => ({
      items: listSolutionKits(),
    }));
  });

  router.get(
    "/solution-kits/:id",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        validate(solutionKitIdSchema, ctx.params.id);
        const item = getSolutionKit(ctx.params.id as SolutionKitId);
        if (!item) throw new Error("solution_kit_not_found");
        return item;
      });
    }
  );

  router.post(
    "/solution-kits/plan",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        const payload = ctx.body ?? {};
        validate(solutionKitPlanRequestSchema, payload);
        const plan = previewSolutionKitPlan(payload as SiteBuilderPlanInput);
        return plan;
      });
    }
  );
}
