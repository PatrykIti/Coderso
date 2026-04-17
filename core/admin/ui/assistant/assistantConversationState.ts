import type {
  AssistantActionDryRunResponse,
  AssistantActionExecuteResponse,
  AssistantActionPlanResponse,
  AssistantChatResponse,
  AssistantMode,
} from "@/services/assistantClient";
import type { AssistantPlanningState } from "../../../services/assistant/actionPlanTypes";
import { isAssistantActionPlan } from "../../../services/assistant/actionPlanTypes";
import { normalizeAssistantPlanningState } from "../../../services/assistant/cmsPlanningState";

export type PersistedAssistantEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sourceQuestion?: string;
  response?: AssistantChatResponse;
  error?: string;
};

export type AssistantConversationSnapshot = {
  messages: PersistedAssistantEntry[];
  activePlan: AssistantActionPlanResponse | null;
  activePreview: AssistantActionDryRunResponse | null;
  activeExecution: AssistantActionExecuteResponse | null;
  planningState: AssistantPlanningState | null;
  assistantMode: AssistantMode | null;
};

const STORAGE_KEY = "nextless.assistant.conversation.state";
const SCHEMA_VERSION = 1;
const MAX_MESSAGES = 40;
const MAX_TEXT_LENGTH = 2_000;
const TTL_MS = 30 * 60 * 1000;
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)/i;

type StoredConversationState = AssistantConversationSnapshot & {
  schemaVersion: 1;
  savedAt: string;
  expiresAt: string;
};

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readText = (value: unknown, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || secretLikePattern.test(trimmed)) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, Math.max(0, maxLength - 3))}...` : trimmed;
};

const isSecretLikePayload = (value: unknown): boolean => {
  if (typeof value === "string") return secretLikePattern.test(value);
  if (Array.isArray(value)) return value.some(isSecretLikePayload);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => secretLikePattern.test(key) || isSecretLikePayload(nested));
};

const normalizeAssistantMode = (value: unknown): AssistantMode | null =>
  value === "docs-only" || value === "llm-guide" ? value : null;

const normalizeEntry = (value: unknown): PersistedAssistantEntry | null => {
  if (!isRecord(value)) return null;
  const id = readText(value.id, 120);
  const role = value.role === "user" || value.role === "assistant" ? value.role : null;
  const text = readText(value.text);
  if (!id || !role || !text) return null;
  const sourceQuestion = readText(value.sourceQuestion);
  const error = readText(value.error, 120);
  return {
    id,
    role,
    text,
    ...(sourceQuestion ? { sourceQuestion } : {}),
    ...(error ? { error } : {}),
  };
};

const normalizePlan = (value: unknown): AssistantActionPlanResponse | null => {
  if (!isAssistantActionPlan(value) || isSecretLikePayload(value)) return null;
  return value;
};

const normalizeSafeObject = <T>(value: unknown): T | null => {
  if (!isRecord(value) || isSecretLikePayload(value)) return null;
  return value as T;
};

export const readAssistantConversationState = (): AssistantConversationSnapshot | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.schemaVersion !== SCHEMA_VERSION) return null;
    const expiresAt = typeof parsed.expiresAt === "string" ? Date.parse(parsed.expiresAt) : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.map(normalizeEntry).filter((entry): entry is PersistedAssistantEntry => Boolean(entry)).slice(-MAX_MESSAGES)
      : [];
    return {
      messages,
      activePlan: normalizePlan(parsed.activePlan),
      activePreview: normalizeSafeObject<AssistantActionDryRunResponse>(parsed.activePreview),
      activeExecution: normalizeSafeObject<AssistantActionExecuteResponse>(parsed.activeExecution),
      planningState: normalizeAssistantPlanningState(parsed.planningState),
      assistantMode: normalizeAssistantMode(parsed.assistantMode),
    };
  } catch {
    return null;
  }
};

export const writeAssistantConversationState = (snapshot: AssistantConversationSnapshot) => {
  if (!canUseStorage()) return;
  const nowMs = Date.now();
  const payload: StoredConversationState = {
    schemaVersion: SCHEMA_VERSION,
    messages: snapshot.messages.slice(-MAX_MESSAGES).map((entry) => ({
      ...entry,
      text: readText(entry.text) ?? "[redacted]",
      sourceQuestion: readText(entry.sourceQuestion) ?? undefined,
      response: undefined,
    })),
    activePlan: isSecretLikePayload(snapshot.activePlan) ? null : snapshot.activePlan,
    activePreview: isSecretLikePayload(snapshot.activePreview) ? null : snapshot.activePreview,
    activeExecution: isSecretLikePayload(snapshot.activeExecution) ? null : snapshot.activeExecution,
    planningState: normalizeAssistantPlanningState(snapshot.planningState),
    assistantMode: snapshot.assistantMode,
    savedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + TTL_MS).toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearAssistantConversationState = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
};
