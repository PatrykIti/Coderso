import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPlanQuestion,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "./actionPlanTypes";
import { normalizeAssistantActionPlan } from "./actionPlanSchema";
import { assistantActionTypes } from "./actionRegistry";

export type AssistantProviderDraftAdapterInput = {
  draft: unknown;
  prompt: string;
};

const allowedDraftKeys = new Set([
  "intentId",
  "promptKind",
  "intentFamily",
  "title",
  "answer",
  "summary",
  "confidence",
  "assumptions",
  "questions",
  "actions",
]);

const allowedActionTypes = new Set<AssistantPlannedAction["type"]>(assistantActionTypes);

const secretKeyPattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const containsSecretLikeKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretLikeKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => {
    if (secretKeyPattern.test(key)) return true;
    return containsSecretLikeKey(nested);
  });
};

const text = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const optionalText = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  return text(value, "");
};

const number = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const questions = (value: unknown): AssistantPlanQuestion[] =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item, index) => ({
          id: text(item.id, `provider-question-${index + 1}`),
          label: text(item.label, "Clarify setup"),
          description: text(
            item.description,
            "The provider draft did not include enough safe structured detail."
          ),
          required: item.required !== false,
        }))
    : [];

const buildRecoveryPlan = (
  prompt: string,
  reason: string,
  inputQuestions?: AssistantPlanQuestion[]
): AssistantActionPlan => ({
  id: "plan-provider-draft-needs-input",
  status: "needs_input",
  intentId: "provider-draft-needs-input",
  promptKind: "unknown",
  intentFamily: "unknown",
  title: "Need safer planner output",
  answer:
    "I need a safer structured plan before I can prepare executable actions.",
  summary: reason,
  confidence: 0.2,
  assumptions: [`Original prompt: ${prompt.trim() || "empty prompt"}`],
  questions:
    inputQuestions && inputQuestions.length > 0
      ? inputQuestions
      : [
          {
            id: "provider-draft-clarification",
            label: "What should I create or change?",
            description:
              "Please clarify the target admin surface and resources before I prepare a typed action plan.",
            required: true,
          },
        ],
  actions: [],
});

const normalizeProviderActions = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const actions: AssistantPlannedAction[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const type = item.type;
    if (typeof type !== "string" || !allowedActionTypes.has(type as AssistantPlannedAction["type"])) {
      return null;
    }
    if (!isRecord(item.input)) return null;
    actions.push({
      id: text(item.id, `provider-action-${actions.length + 1}`),
      type: type as AssistantPlannedAction["type"],
      title: text(item.title, type),
      description: text(item.description, "Provider drafted action."),
      input: item.input,
    } as AssistantPlannedAction);
  }
  return actions;
};

export const adaptProviderDraftPlan = (
  input: AssistantProviderDraftAdapterInput
): AssistantActionPlan => {
  if (!isRecord(input.draft)) {
    return buildRecoveryPlan(input.prompt, "Provider draft was not an object.");
  }
  if (containsSecretLikeKey(input.draft)) {
    return buildRecoveryPlan(input.prompt, "Provider draft contained secret-like keys.");
  }
  for (const key of Object.keys(input.draft)) {
    if (!allowedDraftKeys.has(key)) {
      return buildRecoveryPlan(input.prompt, "Provider draft contained unknown fields.");
    }
  }

  const draftQuestions = questions(input.draft.questions);
  const actions = normalizeProviderActions(input.draft.actions);
  if (actions === null) {
    return buildRecoveryPlan(input.prompt, "Provider draft contained unsupported actions.");
  }
  if (actions.length === 0) {
    return buildRecoveryPlan(
      input.prompt,
      "Provider draft did not contain executable actions.",
      draftQuestions
    );
  }

  try {
    return normalizeAssistantActionPlan({
      id: "plan-provider-draft",
      status: "ready",
      intentId: text(input.draft.intentId, "provider-draft"),
      promptKind: optionalText(input.draft.promptKind) as AssistantPromptKind | undefined,
      intentFamily: optionalText(input.draft.intentFamily) as AssistantIntentFamily | undefined,
      title: text(input.draft.title, "Provider Draft Plan"),
      answer: text(input.draft.answer, "I prepared a typed plan from the provider draft."),
      summary: text(input.draft.summary, "Provider drafted typed actions."),
      confidence: number(input.draft.confidence, 0.5),
      assumptions: stringArray(input.draft.assumptions),
      questions: [],
      actions,
    });
  } catch {
    return buildRecoveryPlan(input.prompt, "Provider draft failed strict plan schema.");
  }
};
