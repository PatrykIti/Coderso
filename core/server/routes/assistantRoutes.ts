import { ApiError } from "../errorHandler";
import {
  answerAssistantQuestion,
  getAssistantStatus,
  reindexAssistantDocs,
  type AssistantChatInput,
} from "../../services/assistant/assistantService";
import {
  assistantChatSchema,
  assistantReindexSchema,
  assistantSiteBuilderExecuteSchema,
  assistantSiteBuilderPlanSchema,
  assistantSiteBuilderValidateSchema,
} from "../validation/assistantSchemas";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
  type GuidedSiteBuilderExecuteInput,
  type GuidedSiteBuilderPlanInput,
  type GuidedSiteBuilderValidateRunInput,
} from "../../services/assistant/siteBuilderExecutor";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  requestId?: string;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
};

type AssistantRouteService = {
  getStatus: typeof getAssistantStatus;
  reindex: typeof reindexAssistantDocs;
  chat: typeof answerAssistantQuestion;
  previewSiteBuilderPlan: typeof previewGuidedSiteBuilderPlan;
  executeSiteBuilder: typeof executeGuidedSiteBuilder;
  validateSiteBuilderRun: typeof validateGuidedSiteBuilderRun;
};

const defaultService: AssistantRouteService = {
  getStatus: getAssistantStatus,
  reindex: reindexAssistantDocs,
  chat: answerAssistantQuestion,
  previewSiteBuilderPlan: previewGuidedSiteBuilderPlan,
  executeSiteBuilder: executeGuidedSiteBuilder,
  validateSiteBuilderRun: validateGuidedSiteBuilderRun,
};

export type AssistantRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  service?: Partial<AssistantRouteService>;
};

const mapAssistantError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "assistant_disabled":
      return { code: "assistant_disabled", message: "Assistant is disabled", status: 403 };
    case "assistant_index_missing":
      return {
        code: "assistant_index_missing",
        message: "Assistant docs index is not ready",
        status: 503,
      };
    case "assistant_reindex_failed":
      return {
        code: "assistant_reindex_failed",
        message: "Assistant reindex failed",
        status: 500,
      };
    case "assistant_message_invalid":
      return {
        code: "assistant_message_invalid",
        message: "Invalid assistant message",
        status: 400,
      };
    case "assistant_rate_limited":
      return {
        code: "assistant_rate_limited",
        message: "Assistant rate limit exceeded",
        status: 429,
      };
    case "assistant_budget_exceeded":
      return {
        code: "assistant_budget_exceeded",
        message: "Assistant token budget exceeded",
        status: 429,
      };
    case "site_builder_kit_not_found":
      return {
        code: "site_builder_kit_not_found",
        message: "Selected site builder kit was not found",
        status: 404,
      };
    case "site_builder_run_not_found":
      return {
        code: "site_builder_run_not_found",
        message: "Site builder run was not found",
        status: 404,
      };
    case "solution_kit_not_found":
      return {
        code: "solution_kit_not_found",
        message: "Solution kit not found",
        status: 404,
      };
    case "solution_kit_install_run_not_found":
      return {
        code: "solution_kit_install_run_not_found",
        message: "Solution kit install run not found",
        status: 404,
      };
    default:
      if (error.message.startsWith("solution_kit_")) {
        return {
          code: error.message,
          message: "Invalid guided site builder payload",
          status: 400,
        };
      }
      return null;
  }
};

const withAssistantErrors = async <T>(
  requestId: string | undefined,
  fn: () => Promise<T>
) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapAssistantError(error);
    if (mapped) {
      throw new ApiError(mapped.code, mapped.message, mapped.status, {
        requestId: requestId ?? null,
      });
    }
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("assistant_error", error.message, 500, {
        requestId: requestId ?? null,
      });
    }
    throw error;
  }
};

export function registerAssistantRoutes(router: Router, deps: AssistantRouteDeps) {
  const { requirePermission, validate } = deps;
  const service: AssistantRouteService = {
    ...defaultService,
    ...(deps.service ?? {}),
  };

  router.get(
    "/assistant/status",
    requirePermission("settings:read"),
    async (ctx) =>
      withAssistantErrors(ctx.requestId, async () => {
        return service.getStatus();
      })
  );

  router.post(
    "/assistant/reindex",
    requirePermission("settings:write"),
    async (ctx) => {
      validate(assistantReindexSchema, ctx.body ?? {});
      return withAssistantErrors(ctx.requestId, async () => {
        return service.reindex({
          actorId: ctx.user?.id ?? null,
        });
      });
    }
  );

  router.post(
    "/assistant/chat",
    requirePermission("settings:read"),
    async (ctx) => {
      validate(assistantChatSchema, ctx.body ?? {});
      const body = ctx.body as AssistantChatInput;
      return withAssistantErrors(ctx.requestId, async () =>
        service.chat({
          message: body.message,
          mode: body.mode,
          context: body.context,
          actorId: ctx.user?.id ?? null,
        })
      );
    }
  );

  router.post(
    "/assistant/site-builder/plan",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      validate(assistantSiteBuilderPlanSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as GuidedSiteBuilderPlanInput;
      return withAssistantErrors(ctx.requestId, async () =>
        service.previewSiteBuilderPlan(body)
      );
    }
  );

  router.post(
    "/assistant/site-builder/execute",
    requirePermission("solution-kits:write"),
    async (ctx) => {
      validate(assistantSiteBuilderExecuteSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as GuidedSiteBuilderExecuteInput;
      return withAssistantErrors(ctx.requestId, async () =>
        service.executeSiteBuilder({
          ...body,
          actorId: ctx.user?.id ?? null,
        })
      );
    }
  );

  router.post(
    "/assistant/site-builder/validate",
    requirePermission("solution-kits:read"),
    async (ctx) => {
      validate(assistantSiteBuilderValidateSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as GuidedSiteBuilderValidateRunInput;
      return withAssistantErrors(ctx.requestId, async () =>
        service.validateSiteBuilderRun(body)
      );
    }
  );
}
