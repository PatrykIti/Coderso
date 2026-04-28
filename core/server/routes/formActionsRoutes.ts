import {
  listFormActions,
  listFormActionRuns,
  setFormActions,
} from "../../services/forms/formActionsService";
import {
  isFormActionRunStatus,
  retryFormAutomationRun,
} from "../../services/forms/formAutomationRunner";
import { ApiError } from "../errorHandler";
import {
  formActionsUpdateSchema,
  formActionRetrySchema,
  formActionRunsQuerySchema,
} from "../validation/formActionSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string; email?: string; name?: string | null };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
};

export type FormActionsRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const normalizeRunsQuery = (query: Record<string, string | undefined>) => {
  const status = query.status;
  const limitRaw = query.limit;
  const limit =
    typeof limitRaw === "string" && limitRaw.trim().length > 0
      ? Number(limitRaw)
      : undefined;

  const payload = {
    ...(status ? { status } : {}),
    ...(limit !== undefined && Number.isFinite(limit) ? { limit } : {}),
  };

  return payload;
};

export function registerFormActionsRoutes(router: Router, deps: FormActionsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get(
    "/forms/:id/actions",
    requirePermission("forms:read"),
    async (ctx) => {
      return listFormActions(ctx.params.id);
    }
  );

  router.put(
    "/forms/:id/actions",
    requirePermission("forms:write"),
    async (ctx) => {
      validate(formActionsUpdateSchema, ctx.body);
      try {
        return await setFormActions(ctx.params.id, ctx.body);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "form_not_found") {
            throw new ApiError("form_not_found", "Form not found", 404);
          }
          if (
            error.message === "form_action_invalid_payload" ||
            error.message === "form_action_invalid_type" ||
            error.message === "form_action_invalid_condition" ||
            error.message === "form_action_invalid_config"
          ) {
            throw new ApiError("form_action_invalid", "Invalid action configuration", 400);
          }
        }
        throw error;
      }
    }
  );

  router.get(
    "/forms/:id/action-runs",
    requirePermission("forms:read"),
    async (ctx) => {
      const queryPayload = normalizeRunsQuery(ctx.query);
      validate(formActionRunsQuerySchema, queryPayload);
      const status =
        typeof queryPayload.status === "string" && isFormActionRunStatus(queryPayload.status)
          ? queryPayload.status
          : undefined;
      const limit =
        typeof queryPayload.limit === "number" ? queryPayload.limit : undefined;

      return listFormActionRuns(ctx.params.id, {
        ...(status ? { status } : {}),
        ...(limit !== undefined ? { limit } : {}),
      });
    }
  );

  router.post(
    "/forms/action-runs/:runId/retry",
    requirePermission("forms:write"),
    async (ctx) => {
      validate(formActionRetrySchema, ctx.body ?? {});
      try {
        return await retryFormAutomationRun(ctx.params.runId);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "form_action_run_not_found") {
            throw new ApiError("form_action_run_not_found", "Action run not found", 404);
          }
          if (error.message === "form_action_run_retry_invalid_status") {
            throw new ApiError(
              "form_action_run_retry_invalid_status",
              "Only failed runs can be retried",
              400
            );
          }
        }
        throw error;
      }
    }
  );
}
