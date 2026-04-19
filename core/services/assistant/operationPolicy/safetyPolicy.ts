import type { AssistantActionPlan, AssistantPlannedAction } from "../actionPlanTypes";
import type { CmsOperationDraft } from "../cmsOperationDraftSchema";
import type { CmsTargetResolution } from "../cmsTargetResolver";
import { assistantOperationPolicy } from "./assistantOperationPolicy";
import { findPolicyFieldForDraft, getActionMappingResourcePolicy } from "./actionMappingPolicy";
import type { AssistantOperationPolicy, AssistantResourcePolicy } from "./policyTypes";
import { normalizeResolverText } from "./resolverPolicy";

const allAliases = ["all", "wszystkie", "wszyscy", "wszystkich", "kazdy", "każdy", "cale", "całe"];

const archiveAliases = ["archive", "archiwizuj", "zarchiwizuj"];

const deleteAliases = ["delete", "remove", "usun", "usuń", "usuw", "skasuj", "kasuj"];

const wordMatch = (value: string, word: string) =>
  new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "u").test(value);

const promptContainsAny = (prompt: string, aliases: string[]) =>
  aliases.some((alias) => wordMatch(prompt, normalizeResolverText(alias)));

export const isAllPromptWithPolicy = (prompt: string) =>
  promptContainsAny(normalizeResolverText(prompt), allAliases);

export const isBroadDestructivePromptWithPolicy = (prompt: string) => {
  const normalized = normalizeResolverText(prompt);
  return (
    isAllPromptWithPolicy(normalized) &&
    (promptContainsAny(normalized, deleteAliases) || promptContainsAny(normalized, archiveAliases))
  );
};

export const extractExpectedCountWithPolicy = (
  prompt: string,
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const normalized = normalizeResolverText(prompt);
  const digitMatch = normalized.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of Object.entries(policy.followUp.countWords)) {
    if (wordMatch(normalized, normalizeResolverText(word))) return count;
  }
  return null;
};

export const isDestructiveAction = (action: AssistantPlannedAction) =>
  action.type.includes(".delete") || action.type.endsWith(".archive");

export const hasDestructiveActions = (plan: AssistantActionPlan) =>
  plan.actions.some(isDestructiveAction);

export const destructiveActionCount = (plan: AssistantActionPlan) =>
  plan.actions.filter(isDestructiveAction).length;

export const hasPromptDestructiveIntentMismatchWithPolicy = (
  prompt: string,
  plan: AssistantActionPlan
) => {
  if (plan.actions.length === 0) return false;
  const normalized = normalizeResolverText(prompt);
  const destructivePrompt =
    promptContainsAny(normalized, deleteAliases) || promptContainsAny(normalized, archiveAliases);
  return destructivePrompt && !hasDestructiveActions(plan);
};

export const hasDestructiveCountMismatchWithPolicy = (
  prompt: string,
  plan: AssistantActionPlan,
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const expectedCount = extractExpectedCountWithPolicy(prompt, policy);
  if (expectedCount === null) return false;
  const actualCount = destructiveActionCount(plan);
  return actualCount > 0 && actualCount !== expectedCount;
};

export const hasActionCountMismatchWithPolicy = (
  prompt: string,
  plan: AssistantActionPlan,
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const normalized = normalizeResolverText(prompt);
  const hasCountIntent =
    promptContainsAny(normalized, ["dokladnie", "dokładnie", "exactly", "expected count"]) ||
    Object.keys(policy.followUp.countWords).some((word) => wordMatch(normalized, normalizeResolverText(word)));
  if (!hasCountIntent) return false;
  const expectedCount = extractExpectedCountWithPolicy(prompt, policy);
  return expectedCount !== null && plan.actions.length > 0 && plan.actions.length !== expectedCount;
};

const actionPatch = (action: AssistantPlannedAction): Record<string, unknown> | null => {
  const input = action.input as Record<string, unknown>;
  const patch = input.patch;
  return patch && typeof patch === "object" && !Array.isArray(patch)
    ? (patch as Record<string, unknown>)
    : null;
};

export const hasPromptImpliedFieldMismatchWithPolicy = (
  prompt: string,
  plan: AssistantActionPlan,
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const normalizedPrompt = normalizeResolverText(prompt);
  for (const resource of Object.values(policy.resources)) {
    for (const field of Object.values(resource.fields)) {
      const actionType = field.action?.type;
      const patchKey = field.action?.patchPath?.[0];
      if (!actionType || !patchKey) continue;
      const mentioned = [field.field, ...field.aliases].some((alias) =>
        normalizedPrompt.includes(normalizeResolverText(alias))
      );
      if (!mentioned) continue;
      const relevantActions = plan.actions.filter((action) => action.type === actionType);
      if (relevantActions.length === 0) {
        const family = actionType.split(".")[0];
        if (family && plan.actions.some((action) => action.type.startsWith(`${family}.`))) {
          return true;
        }
        continue;
      }
      if (relevantActions.some((action) => actionPatch(action)?.[patchKey] === undefined)) {
        return true;
      }
    }
  }
  return false;
};

export const canMapExpectedCountMultiWithPolicy = (
  draft: CmsOperationDraft,
  resolution: CmsTargetResolution,
  resourcePolicy: AssistantResourcePolicy | null = getActionMappingResourcePolicy(draft)
) => {
  if (resolution.status !== "ambiguous") return false;
  if (draft.constraints?.expectedCount !== resolution.candidates.length) return false;
  if (resolution.candidates.length <= 1) return false;
  if (draft.operation === "delete" || draft.operation === "archive") {
    const destructive = resourcePolicy?.destructive ?? assistantOperationPolicy.safetyDefaults.destructive;
    return destructive.requireExpectedCountForPartialMatch;
  }
  return draft.operation === "update";
};

export const canMapFilteredAllWithPolicy = (
  prompt: string,
  draft: CmsOperationDraft,
  resolution: CmsTargetResolution,
  resourcePolicy: AssistantResourcePolicy | null = getActionMappingResourcePolicy(draft)
) => {
  if (resolution.status !== "ambiguous") return false;
  if (draft.operation !== "delete" && draft.operation !== "archive") return false;
  if (draft.constraints?.expectedCount !== undefined) return false;
  if (!draft.filters || draft.filters.length === 0) return false;
  if (!isAllPromptWithPolicy(prompt)) return false;
  if (resolution.candidates.length <= 1) return false;
  const destructive = resourcePolicy?.destructive ?? assistantOperationPolicy.safetyDefaults.destructive;
  return destructive.allowAllWhenFiltered;
};

export const getPolicyFieldForDraft = findPolicyFieldForDraft;
