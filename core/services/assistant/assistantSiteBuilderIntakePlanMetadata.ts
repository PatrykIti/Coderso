import type { AssistantSiteBuilderIntakeAnswerFieldMetadata } from "./actionPlanTypes";
import { listSiteBuilderIntakeOptions } from "./assistantSiteBuilderIntakeRegistry";
import type { AssistantSiteBuilderIntakeAnswerFieldDefinition } from "./assistantSiteBuilderIntakeTypes";

export const buildSiteBuilderIntakeAnswerFieldMetadata = (
  field: AssistantSiteBuilderIntakeAnswerFieldDefinition
): AssistantSiteBuilderIntakeAnswerFieldMetadata => {
  const optionRegistryId = field.optionRegistryId ?? null;

  return {
    key: field.key,
    label: field.label,
    description: field.description,
    control: field.control,
    required: field.required,
    requiredGroupId: field.requiredGroupId ?? null,
    maxLength: field.maxLength ?? null,
    maxItems: field.maxItems ?? null,
    optionRegistryId,
    options: optionRegistryId
      ? listSiteBuilderIntakeOptions(optionRegistryId).map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
        }))
      : [],
  };
};
