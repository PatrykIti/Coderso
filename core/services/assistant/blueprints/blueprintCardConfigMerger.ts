import { isDeepStrictEqual } from "node:util";

import {
  normalizeListingTemplateConfig,
  type ListingTemplateConfig,
  type ListingTemplateCondition,
  type ListingTemplateFieldBinding,
  type ListingTemplateItemAction,
} from "../../content/listingTemplateConfig";
import type { ContentSchema } from "../../content/validation";
import { BlueprintListingConfigMergeError, schemaHasListingField } from "./blueprintFacetMerger";

const mergeConditions = (
  left: ListingTemplateCondition[],
  right: ListingTemplateCondition[],
  fieldKey: string
) => {
  if (!isDeepStrictEqual(left, right)) {
    throw new BlueprintListingConfigMergeError(
      "listing_config_conflict",
      `Listing card field "${fieldKey}" uses incompatible visibility conditions across composed fragments.`,
      { itemId: fieldKey }
    );
  }
  return left;
};

const mergeFieldBinding = (
  left: ListingTemplateFieldBinding,
  right: ListingTemplateFieldBinding
): ListingTemplateFieldBinding => {
  if (left.source !== right.source || left.format !== right.format) {
    throw new BlueprintListingConfigMergeError(
      "listing_config_conflict",
      `Listing card field "${left.key}" points at incompatible sources across composed fragments.`,
      { itemId: left.key }
    );
  }

  return {
    ...left,
    label: left.label ?? right.label,
    fallback: left.fallback ?? right.fallback,
    conditions: mergeConditions(left.conditions, right.conditions, left.key),
  };
};

const mergeItemAction = (
  left: ListingTemplateItemAction,
  right: ListingTemplateItemAction
): ListingTemplateItemAction => {
  if (
    left.kind !== right.kind ||
    left.href !== right.href ||
    left.opensInNewTab !== right.opensInNewTab
  ) {
    throw new BlueprintListingConfigMergeError(
      "listing_config_conflict",
      `Listing card action "${left.id}" conflicts across composed fragments.`,
      { itemId: left.id }
    );
  }

  return {
    ...left,
    label: left.label || right.label,
  };
};

export const mergeListingCardConfig = (
  leftInput: unknown,
  rightInput: unknown
): Record<string, unknown> => {
  const left = normalizeListingTemplateConfig(leftInput);
  const right = normalizeListingTemplateConfig(rightInput);

  const mergedFields = new Map<string, ListingTemplateFieldBinding>();
  const fieldOrder: string[] = [];
  for (const field of [...left.fields, ...right.fields]) {
    const previous = mergedFields.get(field.key);
    if (!previous) {
      mergedFields.set(field.key, field);
      fieldOrder.push(field.key);
      continue;
    }
    mergedFields.set(field.key, mergeFieldBinding(previous, field));
  }

  const mergedActions = new Map<string, ListingTemplateItemAction>();
  const actionOrder: string[] = [];
  for (const action of [...left.itemActions, ...right.itemActions]) {
    const previous = mergedActions.get(action.id);
    if (!previous) {
      mergedActions.set(action.id, action);
      actionOrder.push(action.id);
      continue;
    }
    mergedActions.set(action.id, mergeItemAction(previous, action));
  }

  const merged: ListingTemplateConfig = {
    fields: fieldOrder.map((key) => mergedFields.get(key)!).filter(Boolean),
    itemActions: actionOrder.map((id) => mergedActions.get(id)!).filter(Boolean),
    emptyState: {
      title: left.emptyState.title || right.emptyState.title,
      description: left.emptyState.description ?? right.emptyState.description,
      ctaLabel: left.emptyState.ctaLabel ?? right.emptyState.ctaLabel,
      ctaHref: left.emptyState.ctaHref ?? right.emptyState.ctaHref,
    },
    style: {
      columns: left.style.columns ?? right.style.columns,
      gap: left.style.gap ?? right.style.gap,
      cardVariant: left.style.cardVariant ?? right.style.cardVariant,
    },
  };

  return structuredClone(merged) as Record<string, unknown>;
};

export const validateListingCardConfigAgainstSchema = (
  schema: ContentSchema,
  input: unknown
): ListingTemplateConfig => {
  const config = normalizeListingTemplateConfig(input);
  for (const field of config.fields) {
    if (!schemaHasListingField(schema, field.source)) {
      throw new BlueprintListingConfigMergeError(
        "facet_field_missing",
        `Listing card field "${field.key}" references missing source "${field.source}".`,
        {
          fieldPath: field.source,
          itemId: field.key,
        }
      );
    }
    for (const condition of field.conditions) {
      if (!schemaHasListingField(schema, condition.field)) {
        throw new BlueprintListingConfigMergeError(
          "facet_field_missing",
          `Listing card field "${field.key}" uses missing condition source "${condition.field}".`,
          {
            fieldPath: condition.field,
            itemId: field.key,
          }
        );
      }
    }
  }
  return config;
};

export const collectListingCardQueryFields = (config: ListingTemplateConfig): string[] => [
  ...new Set(
    config.fields.flatMap((field) => [
      field.source,
      ...field.conditions.map((condition) => condition.field),
    ])
  ),
];
