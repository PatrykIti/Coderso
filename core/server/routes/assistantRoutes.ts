import { ApiError } from "../errorHandler";
import {
  answerAssistantQuestion,
  getAssistantStatus,
  reindexAssistantDocs,
  type AssistantChatInput,
} from "../../services/assistant/assistantService";
import {
  assistantChatSchema,
  assistantModelMetadataSchema,
  assistantReindexSchema,
} from "../validation/assistantSchemas";
import {
  assistantActionDryRunRequestSchema,
  assistantActionExecuteRequestSchema,
  assistantActionPlanRequestSchema,
} from "../validation/assistantActionSchemas";
import {
  planAssistantActionsWithProviderDraft,
  type AssistantActionPlanInput,
} from "../../services/assistant/actionPlannerService";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../services/assistant/actionExecutorService";
import { buildAssistantResourceCatalogSnapshotWithDefaultDeps } from "../../services/assistant/adminContextCatalogs";
import { hydrateAssistantActiveSurfaceContext } from "../../services/assistant/activeSurfaceHydration";
import type {
  AssistantActionContext,
  AssistantActionPlan,
} from "../../services/assistant/actionPlanTypes";
import {
  getAssistantActionFamilyContract,
  isAssistantKnownActionContractType,
} from "../../services/assistant/actionFamilyContracts";
import { getUserPermissions } from "../../services/auth/roleService";
import { resolveAssistantModelMetadata } from "../../services/assistant/providers";
import type { AssistantLlmProvider } from "../../services/settings/settingsService";
import { assertAssistantPromptWithinBudget } from "../../services/assistant/promptLimits";

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
  getModelMetadata: typeof resolveAssistantModelMetadata;
  planActions: (
    input: AssistantActionPlanInput
  ) => AssistantActionPlan | Promise<AssistantActionPlan>;
  dryRunActions: typeof dryRunAssistantActionPlan;
  executeActions: typeof executeAssistantActionPlan;
  buildResourceCatalog: typeof buildAssistantResourceCatalogSnapshotWithDefaultDeps;
  hydrateActiveSurface: (
    context: AssistantActionContext | undefined,
    options?: { permissions?: readonly string[] }
  ) => Promise<AssistantActionContext | undefined>;
};

const readOptionalStringSetting = async (key: string, fallback: string) => {
  const { getSetting } = await import("../../services/settings/settingsService");
  const value = await getSetting(key);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const readOptionalNumberSetting = async (key: string, fallback: number) => {
  const { getSetting } = await import("../../services/settings/settingsService");
  const value = await getSetting(key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const resolveProviderForActionPlanning = async () => {
  const { getSetting } = await import("../../services/settings/settingsService");
  const { resolveAssistantProvider } = await import("../../services/assistant/providers");
  const enabled = (await getSetting("assistant.llm.enabled")) === true;
  if (!enabled) return { provider: null, providerId: "none" as const, model: "" };
  const provider = await readOptionalStringSetting("assistant.llm.provider", "none");
  const model = await readOptionalStringSetting(
    "assistant.llm.model",
    "google/gemma-3n-e2b-it:free"
  );
  if (provider !== "openai" && provider !== "openrouter") {
    return { provider: null, providerId: "none" as const, model };
  }
  return {
    provider: await resolveAssistantProvider({ provider, model }),
    providerId: provider,
    model,
  };
};

const defaultService: AssistantRouteService = {
  getStatus: getAssistantStatus,
  reindex: reindexAssistantDocs,
  chat: answerAssistantQuestion,
  getModelMetadata: resolveAssistantModelMetadata,
  planActions: async (input) => {
    const planningLlm = await resolveProviderForActionPlanning();
    const [configuredMaxInputTokens, configuredMaxOutputTokens, timeoutMs, modelMetadata] =
      await Promise.all([
        readOptionalNumberSetting("assistant.llm.maxInputTokens", 8192),
        readOptionalNumberSetting("assistant.llm.maxOutputTokens", 2048),
        readOptionalNumberSetting("assistant.llm.timeoutMs", 20000),
        planningLlm.providerId === "openai" || planningLlm.providerId === "openrouter"
          ? resolveAssistantModelMetadata({
              provider: planningLlm.providerId,
              model: planningLlm.model,
            })
          : Promise.resolve(null),
      ]);
    const providerMaxInputTokens =
      modelMetadata?.source === "provider" ? modelMetadata.maxInputTokens : 0;
    const providerMaxOutputTokens =
      modelMetadata?.source === "provider" ? modelMetadata.maxOutputTokens : 0;
    const maxInputTokens = Math.max(configuredMaxInputTokens, providerMaxInputTokens);
    assertAssistantPromptWithinBudget(input.prompt, maxInputTokens);
    return planAssistantActionsWithProviderDraft({
      ...input,
      provider: planningLlm.provider,
      providerModel: planningLlm.model,
      llmAvailable: Boolean(planningLlm.provider),
      limits: {
        maxInputTokens,
        maxOutputTokens: Math.max(configuredMaxOutputTokens, providerMaxOutputTokens),
        timeoutMs,
      },
    });
  },
  dryRunActions: dryRunAssistantActionPlan,
  executeActions: executeAssistantActionPlan,
  buildResourceCatalog: buildAssistantResourceCatalogSnapshotWithDefaultDeps,
  hydrateActiveSurface: async (context, options) => {
    const [
      pageService,
      widgetTemplateService,
      customScreenService,
      detailPageDocumentService,
      collectionWorkspaceService,
    ] = await Promise.all([
      import("../../services/pages/pageService"),
      import("../../services/widgets/widgetTemplateService"),
      import("../../services/customScreens/customScreenService"),
      import("../../services/content/detailPageDocumentService"),
      import("../../services/content/collectionWorkspaceService"),
    ]);
    return hydrateAssistantActiveSurfaceContext(context, {
      getPage: pageService.getPage,
      getWidgetTemplate: widgetTemplateService.getWidgetTemplate,
      getCustomScreen: customScreenService.getCustomScreen,
      getDetailPageDocument: detailPageDocumentService.getDetailPageDocument,
      getCollectionWorkspaceSummary: collectionWorkspaceService.getCollectionWorkspaceSummary,
      permissions: options?.permissions,
    });
  },
};

export type AssistantRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  resolvePermissions?: (ctx: RouteContext) => Promise<string[]> | string[];
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
    case "assistant_prompt_too_large":
      return {
        code: "assistant_prompt_too_large",
        message: "Assistant prompt is too large for the configured model budget",
        status: 413,
      };
    case "assistant_llm_unavailable":
      return {
        code: "assistant_llm_unavailable",
        message: "LLM Guide must be configured before catalog-backed planning or site-kit actions",
        status: 409,
      };
    case "assistant_action_plan_invalid":
      return {
        code: "assistant_action_plan_invalid",
        message: "Assistant action plan payload is invalid",
        status: 400,
      };
    case "settings_value_invalid":
      return {
        code: "assistant_action_plan_invalid",
        message: "Assistant action plan payload is invalid",
        status: 400,
      };
    case "assistant_action_plan_not_ready":
      return {
        code: "assistant_action_plan_not_ready",
        message: "Assistant action plan is not ready for execution",
        status: 400,
      };
    case "assistant_action_idempotency_required":
      return {
        code: "assistant_action_idempotency_required",
        message: "Assistant action execution requires idempotency key",
        status: 400,
      };
    case "assistant_action_idempotency_conflict":
      return {
        code: "assistant_action_idempotency_conflict",
        message: "Assistant action idempotency key was already used for another plan",
        status: 409,
      };
    case "assistant_action_actor_required":
      return {
        code: "assistant_action_actor_required",
        message: "Assistant action execution requires authenticated actor",
        status: 403,
      };
    case "assistant_action_dependency_missing":
      return {
        code: "assistant_action_dependency_missing",
        message: "Assistant action dependency could not be resolved",
        status: 409,
      };
    case "assistant_action_dependency_conflict":
      return {
        code: "assistant_action_dependency_conflict",
        message: "Assistant action dependency conflict",
        status: 409,
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

const withAssistantErrors = async <T>(requestId: string | undefined, fn: () => Promise<T>) => {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasSiteKitContext = (value: unknown) => isRecord(value) && isRecord(value.siteKit);

const hasSiteBuilderIntakeContext = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.siteBuilderIntakeState)) return false;
  const state = value.siteBuilderIntakeState;
  return isRecord(state.activeSession) || typeof state.requestedMode === "string";
};

const hasSiteBuilderPlanningContext = (value: unknown) =>
  hasSiteKitContext(value) || hasSiteBuilderIntakeContext(value);

const activeSurfaceKind = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.activeSurface)) return null;
  const kind = value.activeSurface.kind;
  return typeof kind === "string" ? kind : null;
};

const hasCollectionWorkspaceHint = (value: unknown) =>
  isRecord(value) && isRecord(value.collectionWorkspaceHint);

const resolveRoutePermissions = async (
  ctx: RouteContext,
  resolvePermissions?: AssistantRouteDeps["resolvePermissions"]
) => {
  if (resolvePermissions) return resolvePermissions(ctx);
  if (!ctx.user?.id) return ["content:read"];
  return getUserPermissions(ctx.user.id);
};

const hasSiteKitActions = (plan: unknown) => {
  if (!isRecord(plan) || !Array.isArray(plan.actions)) return false;
  return plan.actions.some(
    (action) =>
      isRecord(action) && typeof action.type === "string" && action.type.startsWith("site-kit.")
  );
};

const collectActionPermissions = (plan: unknown, phase: "dryRun" | "execute") => {
  if (!isRecord(plan) || !Array.isArray(plan.actions)) return [];
  const permissions = new Set<string>();
  for (const action of plan.actions) {
    if (!isRecord(action) || !isAssistantKnownActionContractType(action.type)) {
      continue;
    }
    for (const permission of getAssistantActionFamilyContract(action.type).permissions[phase]) {
      permissions.add(permission);
    }
  }
  return Array.from(permissions);
};

const requireActionPermissions = async (
  ctx: RouteContext,
  plan: unknown,
  phase: "dryRun" | "execute",
  requirePermission: (permission: string) => RouteHandler
) => {
  for (const permission of collectActionPermissions(plan, phase)) {
    await requirePermission(permission)(ctx);
  }
};

export function registerAssistantRoutes(router: Router, deps: AssistantRouteDeps) {
  const { requirePermission, validate } = deps;
  const service: AssistantRouteService = {
    ...defaultService,
    ...(deps.service ?? {}),
  };

  const ensureLlmGuideAvailable = async () => {
    const status = await service.getStatus();
    if (!status.llmAvailable) {
      throw new Error("assistant_llm_unavailable");
    }
  };

  router.get("/assistant/status", requirePermission("settings:read"), async (ctx) =>
    withAssistantErrors(ctx.requestId, async () => {
      return service.getStatus();
    })
  );

  router.post("/assistant/reindex", requirePermission("settings:write"), async (ctx) => {
    validate(assistantReindexSchema, ctx.body ?? {});
    return withAssistantErrors(ctx.requestId, async () => {
      return service.reindex({
        actorId: ctx.user?.id ?? null,
      });
    });
  });

  router.post("/assistant/model-metadata", requirePermission("settings:read"), async (ctx) => {
    validate(assistantModelMetadataSchema, ctx.body ?? {});
    const body = ctx.body as {
      provider: AssistantLlmProvider;
      model: string;
    };
    return withAssistantErrors(ctx.requestId, async () =>
      service.getModelMetadata({
        provider: body.provider,
        model: body.model,
      })
    );
  });

  router.post("/assistant/chat", requirePermission("settings:read"), async (ctx) => {
    validate(assistantChatSchema, ctx.body ?? {});
    const body = ctx.body as AssistantChatInput;
    return withAssistantErrors(ctx.requestId, async () =>
      service.chat({
        message: body.message,
        mode: body.mode,
        detailLevel: body.detailLevel,
        guideMode: body.guideMode,
        context: body.context,
        actorId: ctx.user?.id ?? null,
      })
    );
  });

  router.post(
    "/assistant/actions/plan",
    requirePermission("settings:read"),
    requirePermission("content:read"),
    async (ctx) => {
      validate(assistantActionPlanRequestSchema, ctx.body ?? {});
      const body = (ctx.body ?? {}) as {
        prompt: string;
        context?: AssistantActionContext;
      };
      const includeResourceCatalog = body.context?.includeResourceCatalog === true;
      if (hasSiteBuilderPlanningContext(body.context)) {
        await requirePermission("solution-kits:read")(ctx);
      }
      const surfaceKind = activeSurfaceKind(body.context);
      if (surfaceKind === "widget-template") {
        await requirePermission("widgets:read")(ctx);
      }
      if (surfaceKind === "custom-screen") {
        await requirePermission("content:read")(ctx);
      }
      if (surfaceKind === "page" || surfaceKind === "detail-page") {
        await requirePermission("content:read")(ctx);
        await requirePermission("widgets:read")(ctx);
      }
      return withAssistantErrors(ctx.requestId, async () => {
        if (hasSiteBuilderPlanningContext(body.context)) {
          await ensureLlmGuideAvailable();
        }
        const contextWithCatalog: AssistantActionContext | undefined = includeResourceCatalog
          ? {
              ...(body.context ?? {}),
              resourceCatalog: await service.buildResourceCatalog({}),
            }
          : body.context;
        const context = await service.hydrateActiveSurface(contextWithCatalog, {
          permissions: hasCollectionWorkspaceHint(body.context)
            ? await resolveRoutePermissions(ctx, deps.resolvePermissions)
            : undefined,
        });
        return service.planActions({
          prompt: body.prompt,
          context,
        });
      });
    }
  );

  router.post("/assistant/actions/dry-run", async (ctx) => {
    validate(assistantActionDryRunRequestSchema, ctx.body ?? {});
    const body = (ctx.body ?? {}) as { plan: AssistantActionPlan };
    await requireActionPermissions(ctx, body.plan, "dryRun", requirePermission);
    if (hasSiteKitActions(body.plan)) {
      await requirePermission("solution-kits:read")(ctx);
    }
    return withAssistantErrors(ctx.requestId, async () => {
      if (hasSiteKitActions(body.plan)) {
        await ensureLlmGuideAvailable();
      }
      return service.dryRunActions({
        plan: body.plan,
      });
    });
  });

  router.post("/assistant/actions/execute", async (ctx) => {
    validate(assistantActionExecuteRequestSchema, ctx.body ?? {});
    const body = (ctx.body ?? {}) as {
      plan: AssistantActionPlan;
      idempotencyKey: string;
    };
    await requireActionPermissions(ctx, body.plan, "execute", requirePermission);
    if (hasSiteKitActions(body.plan)) {
      await requirePermission("solution-kits:write")(ctx);
    }
    return withAssistantErrors(ctx.requestId, async () => {
      if (hasSiteKitActions(body.plan)) {
        await ensureLlmGuideAvailable();
      }
      return service.executeActions({
        plan: body.plan,
        idempotencyKey: body.idempotencyKey,
        actorId: ctx.user?.id ?? "",
      });
    });
  });
}
