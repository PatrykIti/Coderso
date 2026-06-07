import {
  hashStableAssistantIntakeValue,
  redactAssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeDiagnostic,
} from "../../../services/assistant/assistantSiteBuilderIntakeRedaction";
import {
  assistantSiteBuilderIntakeModes,
  assistantSiteBuilderIntakeStepIds,
  assistantSiteBuilderReviewStateIds,
  type AssistantSiteBuilderIntakeMode,
  type AssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeStepId,
  type AssistantSiteBuilderReviewStateId,
} from "../../../services/assistant/assistantSiteBuilderIntakeTypes";
import { listSiteBuilderIntakeStepDefinitionsForMode } from "../../../services/assistant/assistantSiteBuilderIntakeRegistry";

export const ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_VERSION = 1 as const;
export const ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_MAX_CHARS = 8_192;
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export type AssistantSiteBuilderIntakeBrowserSnapshot = {
  version: AssistantSiteBuilderIntakeSession["version"];
  mode: AssistantSiteBuilderIntakeMode;
  currentStepId: AssistantSiteBuilderIntakeStepId;
  answeredStepIds: AssistantSiteBuilderIntakeStepId[];
  factsHash: string;
  reviewState: AssistantSiteBuilderReviewStateId | null;
  readyForReview: boolean;
  readyForExecution: boolean;
  redactionApplied: boolean;
};

export type AssistantSiteBuilderIntakeBrowserState = {
  schemaVersion: typeof ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_VERSION;
  savedAt: string;
  expiresAt: string;
  session: AssistantSiteBuilderIntakeBrowserSnapshot;
};

const topLevelKeys = new Set(["schemaVersion", "savedAt", "expiresAt", "session"]);
const sessionKeys = new Set([
  "version",
  "mode",
  "currentStepId",
  "answeredStepIds",
  "factsHash",
  "reviewState",
  "readyForReview",
  "readyForExecution",
  "redactionApplied",
]);
const intakeModes = new Set<string>(assistantSiteBuilderIntakeModes);
const stepIds = new Set<string>(assistantSiteBuilderIntakeStepIds);
const reviewStateIds = new Set<string>(assistantSiteBuilderReviewStateIds);
const hashPattern = /^[a-f0-9]{8,64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>) =>
  Object.keys(value).every((key) => allowed.has(key));

const readIsoDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? value : null;
};

const readMode = (value: unknown): AssistantSiteBuilderIntakeMode | null =>
  typeof value === "string" && intakeModes.has(value)
    ? (value as AssistantSiteBuilderIntakeMode)
    : null;

const readStepId = (
  value: unknown,
  allowedStepIds: ReadonlySet<string> = stepIds
): AssistantSiteBuilderIntakeStepId | null =>
  typeof value === "string" && allowedStepIds.has(value)
    ? (value as AssistantSiteBuilderIntakeStepId)
    : null;

const readReviewState = (value: unknown): AssistantSiteBuilderReviewStateId | null => {
  if (value === null || value === undefined) return null;
  return typeof value === "string" && reviewStateIds.has(value)
    ? (value as AssistantSiteBuilderReviewStateId)
    : null;
};

const readBoolean = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);

const readAnsweredStepIds = (
  value: unknown,
  allowedStepIds: ReadonlySet<string>
): AssistantSiteBuilderIntakeStepId[] | null => {
  if (!Array.isArray(value)) return null;
  const normalized: AssistantSiteBuilderIntakeStepId[] = [];
  for (const item of value.slice(0, assistantSiteBuilderIntakeStepIds.length)) {
    const stepId = readStepId(item, allowedStepIds);
    if (!stepId) return null;
    if (!normalized.includes(stepId)) normalized.push(stepId);
  }
  return normalized;
};

const toSerializedChars = (value: unknown): number => {
  try {
    return typeof value === "string" ? value.length : JSON.stringify(value).length;
  } catch {
    return ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_MAX_CHARS + 1;
  }
};

const toSnapshot = (
  diagnostic: AssistantSiteBuilderIntakeDiagnostic
): AssistantSiteBuilderIntakeBrowserSnapshot => ({
  version: diagnostic.version,
  mode: diagnostic.mode,
  currentStepId: diagnostic.currentStepId,
  answeredStepIds: diagnostic.answeredStepIds,
  factsHash: diagnostic.factsHash,
  reviewState: diagnostic.reviewState,
  readyForReview: diagnostic.readyForReview,
  readyForExecution: diagnostic.readyForExecution,
  redactionApplied: diagnostic.redactionApplied,
});

export const buildAssistantSiteBuilderIntakeBrowserState = (
  session: AssistantSiteBuilderIntakeSession,
  options: { nowMs?: number; ttlMs?: number } = {}
): AssistantSiteBuilderIntakeBrowserState => {
  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  return {
    schemaVersion: ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_VERSION,
    savedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
    session: toSnapshot(redactAssistantSiteBuilderIntakeSession(session)),
  };
};

export const normalizeAssistantSiteBuilderIntakeBrowserState = (
  input: unknown,
  options: { nowMs?: number; maxChars?: number } = {}
): AssistantSiteBuilderIntakeBrowserState | null => {
  const maxChars = options.maxChars ?? ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_MAX_CHARS;
  if (toSerializedChars(input) > maxChars) return null;

  let parsed = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input) as unknown;
    } catch {
      return null;
    }
  }

  if (!isRecord(parsed) || !hasOnlyKeys(parsed, topLevelKeys)) return null;
  if (parsed.schemaVersion !== ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_VERSION) return null;

  const savedAt = readIsoDate(parsed.savedAt);
  const expiresAt = readIsoDate(parsed.expiresAt);
  if (!savedAt || !expiresAt) return null;
  if (Date.parse(expiresAt) <= (options.nowMs ?? Date.now())) return null;

  const session = parsed.session;
  if (!isRecord(session) || !hasOnlyKeys(session, sessionKeys)) return null;

  const mode = readMode(session.mode);
  const allowedStepIds = new Set(
    mode ? listSiteBuilderIntakeStepDefinitionsForMode(mode).map((definition) => definition.id) : []
  );
  const currentStepId = readStepId(session.currentStepId, allowedStepIds);
  const answeredStepIds = readAnsweredStepIds(session.answeredStepIds, allowedStepIds);
  const reviewState = readReviewState(session.reviewState);
  const readyForReview = readBoolean(session.readyForReview);
  const readyForExecution = readBoolean(session.readyForExecution);
  const redactionApplied = readBoolean(session.redactionApplied);
  const factsHash = typeof session.factsHash === "string" ? session.factsHash : null;
  const hasReviewStateInput = session.reviewState !== null && session.reviewState !== undefined;

  if (
    parsed.session === null ||
    session.version !== 1 ||
    (hasReviewStateInput && !reviewState) ||
    !mode ||
    !currentStepId ||
    !answeredStepIds ||
    !factsHash ||
    !hashPattern.test(factsHash) ||
    readyForReview === null ||
    readyForExecution === null ||
    redactionApplied === null
  ) {
    return null;
  }

  return {
    schemaVersion: ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_VERSION,
    savedAt,
    expiresAt,
    session: {
      version: 1,
      mode,
      currentStepId,
      answeredStepIds,
      factsHash,
      reviewState: null,
      readyForReview: false,
      readyForExecution: false,
      redactionApplied,
    },
  };
};

export const serializeAssistantSiteBuilderIntakeBrowserState = (
  state: AssistantSiteBuilderIntakeBrowserState
): string | null => {
  const normalized = normalizeAssistantSiteBuilderIntakeBrowserState(state, {
    nowMs: Date.parse(state.savedAt),
  });
  if (!normalized) return null;
  const serialized = JSON.stringify(normalized);
  return serialized.length <= ASSISTANT_SITE_BUILDER_INTAKE_BROWSER_STATE_MAX_CHARS
    ? serialized
    : null;
};

export const buildEmptyAssistantSiteBuilderIntakeBrowserFactsHash = () =>
  hashStableAssistantIntakeValue({});
