import type {
  AssistantOperationPolicy,
  AssistantPolicyField,
  AssistantPolicyFilter,
  AssistantResourcePolicy,
} from "./policyTypes";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export const getResourcePolicy = (
  policy: AssistantOperationPolicy,
  kind: string
): AssistantResourcePolicy | null => policy.resources[kind] ?? null;

export const resolveResourcePolicyFromPrompt = (
  policy: AssistantOperationPolicy,
  prompt: string
): AssistantResourcePolicy | null => {
  const normalizedPrompt = normalize(prompt);
  const matches = Object.values(policy.resources)
    .map((resource) => ({
      resource,
      score: resource.aliases.reduce(
        (score, alias) => score + (normalizedPrompt.includes(normalize(alias)) ? alias.length : 0),
        0
      ),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);
  return matches[0]?.resource ?? null;
};

export const getFilterPolicy = (
  resource: AssistantResourcePolicy,
  field: string
): AssistantPolicyFilter | null => resource.filters[field] ?? null;

export const getFieldPolicy = (
  resource: AssistantResourcePolicy,
  fieldIntent: string
): AssistantPolicyField | null => {
  const normalizedIntent = normalize(fieldIntent);
  return (
    Object.values(resource.fields).find(
      (field) =>
        normalize(field.field) === normalizedIntent ||
        field.aliases.some((alias) => normalize(alias) === normalizedIntent)
    ) ?? null
  );
};
