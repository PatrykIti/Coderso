import { randomUUID } from "node:crypto";

import { planAssistantActionsWithProviderDraft } from "../../../core/services/assistant/actionPlannerService";
import type {
  AssistantActionContext,
  AssistantActionDryRunResult,
  AssistantActionExecuteResult,
  AssistantActionPlan,
} from "../../../core/services/assistant/actionPlanTypes";
import { createOpenAiProvider } from "../../../core/services/assistant/providers/openAiProvider";
import { createOpenRouterProvider } from "../../../core/services/assistant/providers/openRouterProvider";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";

export type LiveProviderId = "openai" | "openrouter";

export type LiveProviderAvailability = {
  id: LiveProviderId;
  enabled: boolean;
  missing: string[];
  model: string | null;
};

export type LiveProviderRuntime = {
  id: LiveProviderId;
  model: string;
  provider: AssistantProvider;
};

type LiveProviderEnvKey =
  | "TEST_OPENAI_API_KEY"
  | "TEST_OPENAI_MODEL"
  | "TEST_OPENROUTER_API_KEY"
  | "TEST_OPENROUTER_MODEL";

export type LiveProviderEnv = NodeJS.ProcessEnv & Partial<Record<LiveProviderEnvKey, string>>;

export type LivePlanInput = {
  prompt: string;
  context: AssistantActionContext;
  provider: LiveProviderRuntime;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type ExecuteLivePlanInput = {
  plan: AssistantActionPlan;
  actorId: string;
  idempotencyKey: string;
};

const readEnv = (env: LiveProviderEnv, key: LiveProviderEnvKey) => {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const getLiveProviderAvailability = (
  env: LiveProviderEnv = process.env
): LiveProviderAvailability[] => {
  const openAiKey = readEnv(env, "TEST_OPENAI_API_KEY");
  const openAiModel = readEnv(env, "TEST_OPENAI_MODEL");
  const openRouterKey = readEnv(env, "TEST_OPENROUTER_API_KEY");
  const openRouterModel = readEnv(env, "TEST_OPENROUTER_MODEL");

  return [
    {
      id: "openai",
      enabled: Boolean(openAiKey && openAiModel),
      missing: [
        ...(openAiKey ? [] : ["TEST_OPENAI_API_KEY"]),
        ...(openAiModel ? [] : ["TEST_OPENAI_MODEL"]),
      ],
      model: openAiModel,
    },
    {
      id: "openrouter",
      enabled: Boolean(openRouterKey && openRouterModel),
      missing: [
        ...(openRouterKey ? [] : ["TEST_OPENROUTER_API_KEY"]),
        ...(openRouterModel ? [] : ["TEST_OPENROUTER_MODEL"]),
      ],
      model: openRouterModel,
    },
  ];
};

export const createLiveProviderRuntime = (
  id: LiveProviderId,
  env: LiveProviderEnv = process.env
): LiveProviderRuntime | null => {
  if (id === "openai") {
    const apiKey = readEnv(env, "TEST_OPENAI_API_KEY");
    const model = readEnv(env, "TEST_OPENAI_MODEL");
    if (!apiKey || !model) return null;
    return {
      id,
      model,
      provider: createOpenAiProvider({
        apiKey,
        model,
        retryCount: 0,
      }),
    };
  }

  const apiKey = readEnv(env, "TEST_OPENROUTER_API_KEY");
  const model = readEnv(env, "TEST_OPENROUTER_MODEL");
  if (!apiKey || !model) return null;
  return {
    id,
    model,
    provider: createOpenRouterProvider({
      apiKey,
      model,
      retryCount: 0,
      appName: "Coderso LLM Guide Live CMS Matrix",
    }),
  };
};

export const createEnabledLiveProviderRuntimes = (
  env: LiveProviderEnv = process.env
): LiveProviderRuntime[] =>
  (["openai", "openrouter"] as const)
    .map((id) => createLiveProviderRuntime(id, env))
    .filter((provider): provider is LiveProviderRuntime => Boolean(provider));

const slugifyRunPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export const createLiveRunPrefix = (scope: string, seed = randomUUID()) => {
  const normalizedScope = slugifyRunPart(scope);
  const normalizedSeed = slugifyRunPart(seed).slice(0, 12);
  if (!normalizedScope || !normalizedSeed) {
    throw new Error("assistant_live_prefix_invalid");
  }
  return `llm-live-${normalizedScope}-${normalizedSeed}`;
};

export const assertLiveResourcePrefix = (value: string) => {
  if (!/^llm-live-[a-z0-9][a-z0-9-]{4,}$/.test(value)) {
    throw new Error("assistant_live_prefix_invalid");
  }
  return value;
};

export type LiveCleanupEntry = {
  label: string;
  cleanup: () => Promise<void> | void;
};

export const createLiveCleanupStack = () => {
  const entries: LiveCleanupEntry[] = [];
  return {
    add(label: string, cleanup: () => Promise<void> | void) {
      entries.push({ label, cleanup });
    },
    size() {
      return entries.length;
    },
    async run() {
      const failures: Array<{ label: string; error: unknown }> = [];
      while (entries.length > 0) {
        const entry = entries.pop();
        if (!entry) continue;
        try {
          await entry.cleanup();
        } catch (error) {
          failures.push({ label: entry.label, error });
        }
      }
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.error),
          `assistant_live_cleanup_failed:${failures.map((failure) => failure.label).join(",")}`
        );
      }
    },
  };
};

export const canConnectToLiveDatabase = async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("../../../core/db/client"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
};

export const planWithLiveProvider = async ({
  prompt,
  context,
  provider,
  maxInputTokens = 8_192,
  maxOutputTokens = 768,
  timeoutMs = 30_000,
}: LivePlanInput) =>
  planAssistantActionsWithProviderDraft({
    prompt,
    provider: provider.provider,
    providerModel: provider.model,
    llmAvailable: true,
    context,
    limits: {
      maxInputTokens,
      maxOutputTokens,
      timeoutMs,
    },
  });

export const dryRunLivePlan = async (
  plan: AssistantActionPlan
): Promise<AssistantActionDryRunResult> => {
  const { dryRunAssistantActionPlan } = await import(
    "../../../core/services/assistant/actionExecutorService"
  );
  return dryRunAssistantActionPlan({ plan });
};

export const executeLivePlan = async ({
  plan,
  actorId,
  idempotencyKey,
}: ExecuteLivePlanInput): Promise<AssistantActionExecuteResult> => {
  const { executeAssistantActionPlan } = await import(
    "../../../core/services/assistant/actionExecutorService"
  );
  return executeAssistantActionPlan({
    plan,
    actorId,
    idempotencyKey,
  });
};

export const expectSuccessfulExecution = (result: AssistantActionExecuteResult) => {
  if (result.summary.failed !== 0) {
    const failed = result.results
      .filter((item) => item.status === "failed")
      .map((item) => `${item.type}:${item.errorCode ?? "unknown"}:${item.message}`)
      .join("|");
    throw new Error(`assistant_live_execution_failed:${result.summary.failed}:${failed}`);
  }
  if (!result.results.every((item) => item.status === "success")) {
    throw new Error("assistant_live_execution_result_not_success");
  }
};
