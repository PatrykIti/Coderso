import type {
  AssistantActionPlan,
  AssistantPlanningState,
  AssistantPlanningStateCandidate,
} from "./actionPlanTypes";
import type { CmsOperation, CmsOperationDraft } from "./cmsOperationDraftSchema";
import { normalizeCmsOperationDraft } from "./cmsOperationDraftSchema";

const MAX_CANDIDATES = 10;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || secretLikePattern.test(trimmed)) return null;
  return trimmed;
};

const readDateMs = (value: unknown) => {
  const text = readText(value, 80);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : null;
};

const normalizeCandidate = (value: unknown): AssistantPlanningStateCandidate | null => {
  if (!isRecord(value)) return null;
  const kind = readText(value.kind, 80);
  const id = readText(value.id, 160);
  const label = readText(value.label, 200);
  if (!kind || !id || !label) return null;
  return {
    kind,
    id,
    label,
    ...(value.slug !== undefined ? { slug: readText(value.slug, 240) } : {}),
    ...(value.status !== undefined ? { status: readText(value.status, 80) } : {}),
  };
};

export const normalizeAssistantPlanningState = (
  value: unknown,
  options: { nowMs?: number } = {}
): AssistantPlanningState | null => {
  if (!isRecord(value)) return null;
  const allowedKeys = new Set([
    "schemaVersion",
    "sourcePlanId",
    "route",
    "resourceKind",
    "operation",
    "query",
    "candidates",
    "createdAt",
    "expiresAt",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) return null;
  }
  if (value.schemaVersion !== 1) return null;
  const expiresAtMs = readDateMs(value.expiresAt);
  if (!expiresAtMs) return null;
  if (expiresAtMs <= (options.nowMs ?? Date.now())) return null;
  const createdAt = readText(value.createdAt, 80);
  const expiresAt = readText(value.expiresAt, 80);
  if (!createdAt || !expiresAt) return null;
  const candidates = Array.isArray(value.candidates)
    ? value.candidates
        .map(normalizeCandidate)
        .filter((candidate): candidate is AssistantPlanningStateCandidate => Boolean(candidate))
        .slice(0, MAX_CANDIDATES)
    : [];

  return {
    schemaVersion: 1,
    sourcePlanId: readText(value.sourcePlanId, 160),
    route: readText(value.route, 240),
    resourceKind: readText(value.resourceKind, 80),
    operation: readText(value.operation, 80),
    query: readText(value.query, 240),
    candidates,
    createdAt,
    expiresAt,
  };
};

export const buildAssistantPlanningStateFromPlan = (
  plan: AssistantActionPlan,
  input: {
    route?: string | null;
    nowMs?: number;
    ttlMs?: number;
  } = {}
): AssistantPlanningState | null => {
  if (!plan.inspection || plan.inspection.candidates.length === 0) return null;
  const nowMs = input.nowMs ?? Date.now();
  const expiresAtMs = nowMs + (input.ttlMs ?? DEFAULT_TTL_MS);
  return {
    schemaVersion: 1,
    sourcePlanId: plan.id,
    route: input.route ?? null,
    resourceKind: plan.inspection.resourceKind,
    operation: plan.inspection.operation,
    query: plan.inspection.query,
    candidates: plan.inspection.candidates.slice(0, MAX_CANDIDATES).map((candidate) => ({
      kind: candidate.kind,
      id: candidate.id,
      label: candidate.label,
      slug: candidate.slug ?? null,
      status: candidate.status ?? null,
    })),
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
};

const normalizePrompt = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(candidate));

const resolveOperation = (normalizedPrompt: string): CmsOperation | null => {
  if (includesAny(normalizedPrompt, ["usun", "usuń", "delete", "remove", "skasuj"])) {
    return "delete";
  }
  if (includesAny(normalizedPrompt, ["archive", "archiwizuj", "zarchiwizuj"])) {
    return "archive";
  }
  if (includesAny(normalizedPrompt, ["zmien", "zmień", "update", "rename", "ustaw"])) {
    return "update";
  }
  if (includesAny(normalizedPrompt, ["widzisz", "jakie", "które", "ktore", "sprawdz", "sprawdź"])) {
    return "inspect";
  }
  return null;
};

const countWords = new Map<string, number>([
  ["jeden", 1],
  ["jedna", 1],
  ["pierwszy", 1],
  ["pierwsza", 1],
  ["one", 1],
  ["dwa", 2],
  ["dwie", 2],
  ["oba", 2],
  ["obie", 2],
  ["two", 2],
  ["trzy", 3],
  ["three", 3],
]);

const resolveCandidateCount = (normalizedPrompt: string) => {
  const digitMatch = normalizedPrompt.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of countWords) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(normalizedPrompt)) return count;
  }
  if (includesAny(normalizedPrompt, ["te", "these", "wszystkie", "all"])) return null;
  return null;
};

const hasFollowUpSignal = (normalizedPrompt: string) =>
  includesAny(normalizedPrompt, [
    "te",
    "ten",
    "ta",
    "tych",
    "pierwszy",
    "pierwsza",
    "dwa pierwsze",
    "dwie pierwsze",
    "oba",
    "obie",
    "tamten",
    "tamta",
    "these",
    "first",
  ]);

export const buildCmsOperationDraftFromPlanningState = (
  prompt: string,
  state: AssistantPlanningState | null
): CmsOperationDraft | null => {
  if (!state?.resourceKind || state.candidates.length === 0) return null;
  const normalizedPrompt = normalizePrompt(prompt);
  if (!hasFollowUpSignal(normalizedPrompt)) return null;
  const operation = resolveOperation(normalizedPrompt);
  if (!operation) return null;
  const requestedCount = resolveCandidateCount(normalizedPrompt);
  const selected =
    requestedCount === null ? state.candidates : state.candidates.slice(0, requestedCount);
  if (selected.length === 0) return null;

  return normalizeCmsOperationDraft({
    operation,
    resourceKind: state.resourceKind,
    targetQuery:
      selected.length === 1
        ? { exactName: selected[0]!.label, text: selected[0]!.label }
        : { prefix: state.query ?? selected[0]!.label },
    constraints: {
      ...(selected.length > 1 ? { expectedCount: selected.length } : {}),
      destructive: operation === "delete" || operation === "archive",
      requiresConfirmation: operation === "delete" || operation === "archive",
    },
  });
};
