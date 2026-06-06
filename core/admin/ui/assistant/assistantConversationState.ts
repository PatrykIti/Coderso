import type {
  AssistantActionDryRunResponse,
  AssistantActionExecuteResponse,
  AssistantActionPlanResponse,
  AssistantChatResponse,
  AssistantMode,
} from "@/services/assistantClient";
import type { AssistantPlanningState } from "../../../services/assistant/actionPlanTypes";
import { isAssistantActionPlan } from "../../../services/assistant/actionPlanTypes";
import { redactAssistantSafetyText } from "../../../services/assistant/assistantRedaction";
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

const STORAGE_KEY = "coderso.assistant.conversation.state";
const LEGACY_STORAGE_KEY = "nextless.assistant.conversation.state";
const SCHEMA_VERSION = 1;
const MAX_MESSAGES = 40;
const MAX_TEXT_LENGTH = 2_000;
export const ASSISTANT_CONVERSATION_STATE_MAX_CHARS = 32_768;
const TTL_MS = 30 * 60 * 1000;
const secretLikePattern =
  /(token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer|x-amz-signature|signed[-_\s]?url)/i;

const topLevelKeys = new Set([
  "schemaVersion",
  "savedAt",
  "expiresAt",
  "messages",
  "activePlan",
  "activePreview",
  "activeExecution",
  "planningState",
  "assistantMode",
]);

type StoredConversationState = AssistantConversationSnapshot & {
  schemaVersion: 1;
  savedAt: string;
  expiresAt: string;
};

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>) =>
  Object.keys(value).every((key) => allowed.has(key));

const readText = (value: unknown, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || secretLikePattern.test(trimmed)) return null;
  return redactAssistantSafetyText(trimmed, maxLength);
};

const isSecretLikePayload = (value: unknown): boolean => {
  if (typeof value === "string") return secretLikePattern.test(value);
  if (Array.isArray(value)) return value.some(isSecretLikePayload);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => secretLikePattern.test(key) || isSecretLikePayload(nested)
  );
};

const redactStoragePayload = (value: unknown): unknown => {
  if (typeof value === "string") return redactAssistantSafetyText(value, MAX_TEXT_LENGTH);
  if (Array.isArray(value)) return value.slice(0, 100).map(redactStoragePayload);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      secretLikePattern.test(key) ? "[REDACTED]" : redactStoragePayload(nested),
    ])
  );
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
  const redacted = redactStoragePayload(value);
  if (!isAssistantActionPlan(redacted) || isSecretLikePayload(redacted)) return null;
  return redacted;
};

const normalizeSafeObject = <T>(value: unknown): T | null => {
  const redacted = redactStoragePayload(value);
  if (!isRecord(redacted) || isSecretLikePayload(redacted)) return null;
  return redacted as T;
};

export const readAssistantConversationState = (): AssistantConversationSnapshot | null => {
  if (!canUseStorage()) return null;
  try {
    const currentRaw = window.localStorage.getItem(STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = currentRaw ?? legacyRaw;
    if (!raw) return null;
    if (raw.length > ASSISTANT_CONVERSATION_STATE_MAX_CHARS) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      !hasOnlyKeys(parsed, topLevelKeys) ||
      parsed.schemaVersion !== SCHEMA_VERSION
    ) {
      return null;
    }
    const expiresAt = typeof parsed.expiresAt === "string" ? Date.parse(parsed.expiresAt) : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return null;
    }
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .map(normalizeEntry)
          .filter((entry): entry is PersistedAssistantEntry => Boolean(entry))
          .slice(-MAX_MESSAGES)
      : [];
    if (!currentRaw && legacyRaw) {
      window.localStorage.setItem(STORAGE_KEY, legacyRaw);
    }
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
    activePlan: normalizePlan(snapshot.activePlan),
    activePreview: normalizeSafeObject<AssistantActionDryRunResponse>(snapshot.activePreview),
    activeExecution: normalizeSafeObject<AssistantActionExecuteResponse>(snapshot.activeExecution),
    planningState: normalizeAssistantPlanningState(snapshot.planningState),
    assistantMode: snapshot.assistantMode,
    savedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + TTL_MS).toISOString(),
  };
  const serialized = JSON.stringify(payload);
  if (serialized.length > ASSISTANT_CONVERSATION_STATE_MAX_CHARS) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, serialized);
};

export const clearAssistantConversationState = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
};
