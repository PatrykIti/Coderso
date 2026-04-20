import type { AssistantPlannedAction } from "../actionPlanTypes";
import type { CmsOperationDraft } from "../cmsOperationDraftSchema";
import { assistantOperationPolicy } from "./assistantOperationPolicy";
import type {
  AssistantOperationPolicy,
  AssistantPolicyAction,
  AssistantPolicyField,
  AssistantResourcePolicy,
} from "./policyTypes";
import { getResolverResourcePolicyForDraft, normalizeResolverText } from "./resolverPolicy";

export const getActionMappingResourcePolicy = (
  draft: CmsOperationDraft,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantResourcePolicy | null => getResolverResourcePolicyForDraft(draft, policy);

export const findPolicyActionForDraft = (
  draft: CmsOperationDraft,
  actionType?: AssistantPlannedAction["type"],
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantPolicyAction | null => {
  const resourcePolicy = getActionMappingResourcePolicy(draft, policy);
  if (!resourcePolicy) return null;
  return (
    Object.values(resourcePolicy.actions).find(
      (action) =>
        action.operation === draft.operation &&
        (!actionType || action.type === actionType)
    ) ?? null
  );
};

export const isPolicyActionExecutable = (
  draft: CmsOperationDraft,
  actionType: AssistantPlannedAction["type"],
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const action = findPolicyActionForDraft(draft, actionType, policy);
  return Boolean(action && action.mode === "executable" && action.type !== "none");
};

export const findPolicyFieldForDraft = (
  draft: CmsOperationDraft,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantPolicyField | null => {
  const rawIntent = draft.mutation?.fieldIntent;
  if (!rawIntent) return null;
  const intent = normalizeResolverText(rawIntent);
  const resourcePolicy = getActionMappingResourcePolicy(draft, policy);
  if (!resourcePolicy) return null;
  return (
    Object.values(resourcePolicy.fields).find(
      (field) =>
        normalizeResolverText(field.field) === intent ||
        field.aliases.some((alias) => normalizeResolverText(alias) === intent)
    ) ?? null
  );
};

export const resolvePolicyFieldIntent = (
  draft: CmsOperationDraft,
  fallback = ""
) => {
  const field = findPolicyFieldForDraft(draft);
  return normalizeResolverText(field?.field ?? draft.mutation?.fieldIntent ?? fallback);
};

export const policyPatchPathStartsWith = (
  field: AssistantPolicyField | null,
  key: string
) => field?.action?.patchPath?.[0] === key;
