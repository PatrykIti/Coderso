import type {
  AssistantPlanningState,
  AssistantPlanningStateCandidate,
} from "../actionPlanTypes";
import type { CmsOperation, CmsOperationDraft } from "../cmsOperationDraftSchema";
import { assistantOperationPolicy } from "./assistantOperationPolicy";
import type { AssistantFollowUpPolicy, AssistantOperationPolicy } from "./policyTypes";
import { inferOperationWithPolicy, normalizeResolverText } from "./resolverPolicy";

export type FollowUpIntent = {
  operation: CmsOperation;
  selected: AssistantPlanningStateCandidate[];
};

const wordMatch = (value: string, word: string) =>
  new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "u").test(value);

const hasPolicyPronoun = (normalizedPrompt: string, followUp: AssistantFollowUpPolicy) =>
  followUp.pronouns.some((signal) => {
    const normalizedSignal = normalizeResolverText(signal);
    return normalizedSignal.includes(" ")
      ? normalizedPrompt.includes(normalizedSignal)
      : wordMatch(normalizedPrompt, normalizedSignal);
  });

const resolveCandidateCount = (
  normalizedPrompt: string,
  followUp: AssistantFollowUpPolicy
) => {
  const digitMatch = normalizedPrompt.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of Object.entries(followUp.countWords)) {
    if (wordMatch(normalizedPrompt, normalizeResolverText(word))) return count;
  }
  if (hasPolicyPronoun(normalizedPrompt, followUp)) return null;
  return null;
};

export const resolveFollowUpIntent = (
  prompt: string,
  state: AssistantPlanningState | null,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): FollowUpIntent | null => {
  if (!state?.resourceKind || state.candidates.length === 0) return null;
  const normalizedPrompt = normalizeResolverText(prompt);
  if (!hasPolicyPronoun(normalizedPrompt, policy.followUp)) return null;
  const operation = inferOperationWithPolicy(normalizedPrompt, policy);
  if (!operation) return null;
  const requestedCount = resolveCandidateCount(normalizedPrompt, policy.followUp);
  const selected =
    requestedCount === null ? state.candidates : state.candidates.slice(0, requestedCount);
  if (selected.length === 0) return null;
  return { operation, selected };
};

export const buildDraftFromFollowUpPolicy = (
  prompt: string,
  state: AssistantPlanningState | null,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): CmsOperationDraft | null => {
  const followUp = resolveFollowUpIntent(prompt, state, policy);
  if (!followUp || !state?.resourceKind) return null;
  return {
    operation: followUp.operation,
    resourceKind: state.resourceKind as CmsOperationDraft["resourceKind"],
    targetQuery:
      followUp.selected.length === 1
        ? {
            exactName: followUp.selected[0]!.label,
            text: followUp.selected[0]!.label,
          }
        : {
            text: followUp.selected.map((candidate) => candidate.label).join(" OR "),
          },
    constraints: {
      ...(followUp.selected.length > 1 ? { expectedCount: followUp.selected.length } : {}),
      destructive: followUp.operation === "delete" || followUp.operation === "archive",
      requiresConfirmation: followUp.operation === "delete" || followUp.operation === "archive",
    },
  };
};
