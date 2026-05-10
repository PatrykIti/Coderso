import { createHash } from "node:crypto";

import type {
  AssistantActionPlan,
  AssistantBlueprintCompositionMetadata,
  AssistantPlannedAction,
} from "../actionPlanTypes";

const secretLikeTextPattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)[\w.-]*\b/gi;

const credentialValuePattern =
  /\b(?:sk-[a-z0-9_-]+|sk-or-v1-[a-z0-9_-]+|bearer\s+[a-z0-9._-]+)\b/gi;

const normalizeText = (value: string) =>
  value
    .trim()
    .replace(secretLikeTextPattern, "[redacted]")
    .replace(credentialValuePattern, "[redacted]");

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

const hashPrompt = (prompt: string) => hashValue(prompt.trim()).slice(0, 16);

const uniqueSorted = (items: string[]) =>
  [...new Set(items.map(normalizeText).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

const countByType = (actions: AssistantPlannedAction[]) => {
  const counts = new Map<AssistantPlannedAction["type"], number>();
  for (const action of actions) {
    counts.set(action.type, (counts.get(action.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => left.type.localeCompare(right.type));
};

const summarizeConflicts = (
  conflicts: AssistantBlueprintCompositionMetadata["resolvedConflicts"],
  status: "resolved" | "unresolved"
) =>
  conflicts.map((conflict) => ({
    status,
    code: conflict.code,
    severity: conflict.severity,
    message: normalizeText(conflict.message),
    capabilityId: conflict.capabilityId ? normalizeText(conflict.capabilityId) : null,
    resourceKey: conflict.resourceKey ? normalizeText(conflict.resourceKey) : null,
    actionType: conflict.actionType ?? null,
  }));

const summarizeProviderDraft = (draft: unknown) => {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return null;
  }
  const record = draft as Record<string, unknown>;
  const keys = Object.keys(record).map((key) =>
    secretLikeTextPattern.test(key) ? "[redacted-key]" : normalizeText(key)
  );
  secretLikeTextPattern.lastIndex = 0;
  const operation = typeof record.operation === "string" ? normalizeText(record.operation) : null;
  const resourceKind =
    typeof record.resourceKind === "string" ? normalizeText(record.resourceKind) : null;

  return {
    operation,
    resourceKind,
    hasActionsArray: Array.isArray(record.actions),
    keys: uniqueSorted(keys),
    payloadHash: hashValue(JSON.stringify(draft)).slice(0, 16),
  };
};

export type BlueprintCompositionDiagnosticsInput = {
  prompt: string;
  plan: AssistantActionPlan;
  providerDraft?: unknown;
  generatedAt?: string;
};

export const buildBlueprintCompositionDiagnostics = ({
  prompt,
  plan,
  providerDraft,
  generatedAt = new Date().toISOString(),
}: BlueprintCompositionDiagnosticsInput) => {
  const composition = plan.metadata?.blueprintComposition ?? null;
  const resolvedConflicts = composition
    ? summarizeConflicts(composition.resolvedConflicts, "resolved")
    : [];
  const unresolvedConflicts = composition
    ? summarizeConflicts(composition.unresolvedConflicts, "unresolved")
    : [];

  return {
    schemaVersion: 1 as const,
    kind: "blueprint-composition-diagnostics" as const,
    generatedAt,
    promptHash: hashPrompt(prompt),
    plan: {
      id: normalizeText(plan.id),
      intentId: normalizeText(plan.intentId),
      status: plan.status,
      responseKind: plan.responseKind,
    },
    selectedCapabilities: {
      primary: composition?.primaryCapabilityId ?? null,
      adjuncts: composition?.adjunctCapabilityIds ?? [],
      gated: composition?.gatedCapabilityIds ?? [],
    },
    actionAssembly: {
      totalActions: plan.actions.length,
      actionTypes: plan.actions.map((action) => action.type),
      actionTypeCounts: countByType(plan.actions),
      actionIds: plan.actions.map((action) => normalizeText(action.id)),
    },
    resources: {
      mergedKeys: composition?.mergedResources.map((resource) => normalizeText(resource.key)) ?? [],
      noDuplicateMatches:
        composition?.existingResourceMatches.map((match) => ({
          actionType: match.actionType,
          resourceKey: normalizeText(match.resourceKey),
          status: match.status,
          reason: match.reason ? normalizeText(match.reason) : null,
          candidateCount: match.candidateIds.length,
          hasExistingId: Boolean(match.existingId),
        })) ?? [],
    },
    conflicts: [...resolvedConflicts, ...unresolvedConflicts],
    candidateScores: composition?.diagnostics?.candidateScores ?? [],
    providerDraft: summarizeProviderDraft(providerDraft),
  };
};
