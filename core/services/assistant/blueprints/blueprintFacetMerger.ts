import { isDeepStrictEqual } from "node:util";

import {
  normalizeListingFacetConfigs,
  type ListingFacetConfig,
  type ListingFacetSortOption,
  type ListingFacetOption,
} from "../../search/filterContract";
import type { ContentSchema } from "../../content/validation";

type JsonRecord = Record<string, unknown>;

export type BlueprintListingConfigMergeErrorCode =
  | "facet_field_missing"
  | "listing_config_conflict";

export class BlueprintListingConfigMergeError extends Error {
  public readonly code: BlueprintListingConfigMergeErrorCode;
  public readonly fieldPath?: string;
  public readonly itemId?: string;

  constructor(
    code: BlueprintListingConfigMergeErrorCode,
    message: string,
    options?: {
      fieldPath?: string;
      itemId?: string;
    }
  ) {
    super(message);
    this.name = "BlueprintListingConfigMergeError";
    this.code = code;
    this.fieldPath = options?.fieldPath;
    this.itemId = options?.itemId;
  }
}

const builtInListingFields = new Set([
  "id",
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;

const toRecordArray = (items: ListingFacetConfig[]): Array<Record<string, unknown>> =>
  items.map((item) => structuredClone(item) as Record<string, unknown>);

const readSchemaProperties = (schema: ContentSchema): JsonRecord =>
  schema && typeof schema === "object" && !Array.isArray(schema)
    ? (((schema as JsonRecord).properties as JsonRecord | undefined) ?? {})
    : {};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const schemaHasNestedProperty = (properties: JsonRecord, segments: string[]): boolean => {
  if (segments.length === 0) return false;

  let currentProperties: JsonRecord = properties;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const definition = currentProperties[segment];
    if (!isRecord(definition)) return false;
    if (index === segments.length - 1) return true;
    const nestedProperties = definition.properties;
    if (!isRecord(nestedProperties)) return false;
    currentProperties = nestedProperties;
  }

  return false;
};

export const schemaHasListingField = (schema: ContentSchema, fieldPath: string): boolean => {
  const normalized = fieldPath.trim();
  if (!normalized || normalized.split(".").some((segment) => secretLikePattern.test(segment))) {
    return false;
  }
  if (builtInListingFields.has(normalized)) return true;
  if (!normalized.startsWith("data.")) return false;

  const dataSegments = normalized.slice("data.".length).split(".").filter(Boolean);
  if (dataSegments.length === 0) return false;
  return schemaHasNestedProperty(readSchemaProperties(schema), dataSegments);
};

const mergeFacetOptions = (
  left: ListingFacetOption[] | undefined,
  right: ListingFacetOption[] | undefined
) => {
  const merged = new Map<string, ListingFacetOption>();
  for (const option of [...(left ?? []), ...(right ?? [])]) {
    const previous = merged.get(option.value);
    if (!previous) {
      merged.set(option.value, option);
      continue;
    }
    if (!isDeepStrictEqual(previous, option)) {
      throw new BlueprintListingConfigMergeError(
        "listing_config_conflict",
        `Facet option "${option.value}" has incompatible labels across composed fragments.`,
        { itemId: option.value }
      );
    }
  }
  return [...merged.values()];
};

const mergeSortOptions = (
  left: ListingFacetSortOption[] | undefined,
  right: ListingFacetSortOption[] | undefined
) => {
  const merged = new Map<string, ListingFacetSortOption>();
  for (const option of [...(left ?? []), ...(right ?? [])]) {
    const previous = merged.get(option.value);
    if (!previous) {
      merged.set(option.value, option);
      continue;
    }
    if (!isDeepStrictEqual(previous, option)) {
      throw new BlueprintListingConfigMergeError(
        "listing_config_conflict",
        `Sort option "${option.value}" has incompatible field or direction across composed fragments.`,
        { itemId: option.value }
      );
    }
  }
  return [...merged.values()];
};

const mergeFacet = (left: ListingFacetConfig, right: ListingFacetConfig): ListingFacetConfig => {
  if (left.kind !== right.kind || left.field !== right.field || left.op !== right.op) {
    throw new BlueprintListingConfigMergeError(
      "listing_config_conflict",
      `Facet "${left.id}" targets incompatible fields or operators across composed fragments.`,
      { itemId: left.id }
    );
  }

  if (!isDeepStrictEqual(left.presentation ?? null, right.presentation ?? null)) {
    throw new BlueprintListingConfigMergeError(
      "listing_config_conflict",
      `Facet "${left.id}" has incompatible presentation settings across composed fragments.`,
      { itemId: left.id }
    );
  }

  return {
    ...left,
    ...(left.field ? { field: left.field } : {}),
    ...(left.op ? { op: left.op } : {}),
    ...(left.options || right.options
      ? { options: mergeFacetOptions(left.options, right.options) }
      : {}),
    ...(left.sortOptions || right.sortOptions
      ? { sortOptions: mergeSortOptions(left.sortOptions, right.sortOptions) }
      : {}),
    ...(left.presentation || right.presentation
      ? { presentation: left.presentation ?? right.presentation }
      : {}),
  };
};

export const mergeListingFacets = (
  leftInput: unknown,
  rightInput: unknown
): Array<Record<string, unknown>> => {
  const merged = new Map<string, ListingFacetConfig>();
  const orderedIds: string[] = [];

  for (const facet of [
    ...normalizeListingFacetConfigs(leftInput),
    ...normalizeListingFacetConfigs(rightInput),
  ]) {
    const previous = merged.get(facet.id);
    if (!previous) {
      merged.set(facet.id, facet);
      orderedIds.push(facet.id);
      continue;
    }
    merged.set(facet.id, mergeFacet(previous, facet));
  }

  return toRecordArray(
    orderedIds
      .map((id) => merged.get(id))
      .filter((facet): facet is ListingFacetConfig => Boolean(facet))
  );
};

export const validateListingFacetsAgainstSchema = (
  schema: ContentSchema,
  input: unknown
): ListingFacetConfig[] => {
  const facets = normalizeListingFacetConfigs(input);
  for (const facet of facets) {
    if (facet.kind !== "sort") {
      const field = facet.field?.trim() ?? "";
      if (!field || !schemaHasListingField(schema, field)) {
        throw new BlueprintListingConfigMergeError(
          "facet_field_missing",
          `Listing facet "${facet.label}" references missing field "${field || "unknown"}".`,
          {
            fieldPath: field || undefined,
            itemId: facet.id,
          }
        );
      }
      continue;
    }

    for (const option of facet.sortOptions ?? []) {
      if (!schemaHasListingField(schema, option.field)) {
        throw new BlueprintListingConfigMergeError(
          "facet_field_missing",
          `Listing sort facet "${facet.label}" references missing field "${option.field}".`,
          {
            fieldPath: option.field,
            itemId: facet.id,
          }
        );
      }
    }
  }
  return facets;
};

export const collectListingFacetQueryFields = (facets: ListingFacetConfig[]): string[] => [
  ...new Set(facets.map((facet) => facet.field?.trim() ?? "").filter((field) => field.length > 0)),
];
