import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  solutionKitApplyRequestSchema,
  solutionKitIdSchema,
  solutionKitPlanRequestSchema,
  solutionKitRollbackRequestSchema,
  solutionKitRunIdSchema,
  solutionKitRunsQuerySchema,
} from "../validation/solutionKitSchemas";
import {
  applySolutionKitInstall,
  getSolutionKitInstallRun,
  getSolutionKit,
  listSolutionKitInstallItems,
  listSolutionKitInstallRuns,
  listSolutionKits,
  previewSolutionKitPlan,
  rollbackSolutionKitInstall,
} from "../../services/kits/solutionKitsService";
import type {
  SiteBuilderPlanInput,
  SolutionKitId,
} from "../../services/kits/solutionKitTypes";
import type {
  ApplySolutionKitInstallInput,
  RollbackSolutionKitInstallInput,
  SolutionKitInstallMode,
} from "../../services/kits/solutionKitsInstallService";

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
    case "solution_kit_install_run_not_found":
      return new ApiError(
        "solution_kit_install_run_not_found",
        "Solution kit install run not found",
        404
      );
    case "solution_kit_rollback_source_not_found":
      return new ApiError(
        "solution_kit_rollback_source_not_found",
        "No successful apply run found for this solution kit",
        404
      );
    case "solution_kit_catalog_empty":
      return new ApiError("solution_kit_catalog_empty", "Solution kit catalog is empty", 500);
    case "solution_kit_rollback_invalid_source":
      return new ApiError(
        "solution_kit_rollback_invalid_source",
        "Rollback source must be a successful apply run",
        409
      );
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

const toNumberLimit = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export function registerSolutionKitsRoutes(router: Router, deps: SolutionKitsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/solution-kits", requirePermission("solution-kits:read"), async () => {
    return withSolutionKitErrors(async () => ({
      items: listSolutionKits(),
    }));
  });

  router.get(
    "/solution-kits/runs",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        const queryPayload: Record<string, string> = {};
        if (typeof ctx.query.kitId === "string") queryPayload.kitId = ctx.query.kitId;
        if (typeof ctx.query.mode === "string") queryPayload.mode = ctx.query.mode;
        if (typeof ctx.query.limit === "string") queryPayload.limit = ctx.query.limit;
        validate(solutionKitRunsQuerySchema, queryPayload);

        const items = await listSolutionKitInstallRuns({
          kitId: (ctx.query.kitId as SolutionKitId | undefined) ?? undefined,
          mode: (ctx.query.mode as SolutionKitInstallMode | undefined) ?? undefined,
          limit: toNumberLimit(ctx.query.limit),
        });
        return { items };
      });
    }
  );

  router.get(
    "/solution-kits/runs/:runId",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        validate(solutionKitRunIdSchema, ctx.params.runId);
        const run = await getSolutionKitInstallRun(ctx.params.runId);
        if (!run) throw new Error("solution_kit_install_run_not_found");
        const items = await listSolutionKitInstallItems(ctx.params.runId);
        return { run, items };
      });
    }
  );

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

  router.post(
    "/solution-kits/:id/apply",
    requirePermission("solution-kits:write"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        validate(solutionKitIdSchema, ctx.params.id);
        validate(solutionKitApplyRequestSchema, ctx.body ?? {});
        const payload = (ctx.body ?? {}) as {
          dryRun?: boolean;
          continueOnError?: boolean;
        };
        const request: ApplySolutionKitInstallInput = {
          kitId: ctx.params.id as SolutionKitId,
          actorId: ctx.user?.id ?? null,
          dryRun: payload.dryRun,
          continueOnError: payload.continueOnError,
        };
        return applySolutionKitInstall(request);
      });
    }
  );

  router.post(
    "/solution-kits/:id/rollback",
    requirePermission("solution-kits:write"),
    async (ctx) => {
      return withSolutionKitErrors(async () => {
        validate(solutionKitIdSchema, ctx.params.id);
        validate(solutionKitRollbackRequestSchema, ctx.body ?? {});
        const payload = (ctx.body ?? {}) as {
          sourceRunId?: string;
          continueOnError?: boolean;
        };
        const request: RollbackSolutionKitInstallInput = {
          kitId: ctx.params.id as SolutionKitId,
          actorId: ctx.user?.id ?? null,
          sourceRunId: payload.sourceRunId,
          continueOnError: payload.continueOnError,
        };
        return rollbackSolutionKitInstall(request);
      });
    }
  );
}
