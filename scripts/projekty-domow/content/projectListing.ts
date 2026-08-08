import { normalizeListingTemplateConfig } from "../../../core/services/content/listingTemplateConfig";
import { parseListingQueryCreateInput } from "../../../core/services/content/queryBuilderService";
import type { JsonObject, PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_CATEGORIES, HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import { cleanJsonObject } from "../json";

export const PROJECT_LISTING_TEMPLATE_KEY = "project-cards";
export const PROJECT_LISTING_QUERY_KEY = "published-projects";
export const PROJECT_FACET_FIELDS = ["data.categories"] as const;

const PROJECT_CATEGORY_LABELS = [
  "Nowoczesna stodoła",
  "Wille",
  "Parterowe",
  "Energooszczędne",
] as const;

export const PROJECT_CATEGORY_FILTERS = [
  { value: "all", label: "Wszystkie" },
  { value: HOUSE_PROJECT_CATEGORIES[0], label: PROJECT_CATEGORY_LABELS[0] },
  { value: HOUSE_PROJECT_CATEGORIES[1], label: PROJECT_CATEGORY_LABELS[1] },
  { value: HOUSE_PROJECT_CATEGORIES[2], label: PROJECT_CATEGORY_LABELS[2] },
  { value: HOUSE_PROJECT_CATEGORIES[3], label: PROJECT_CATEGORY_LABELS[3] },
] as const;

export const normalizeProjectFacetFields = (value: unknown): string[] => {
  if (
    !Array.isArray(value) ||
    value.length !== PROJECT_FACET_FIELDS.length ||
    value.some((field, index) => field !== PROJECT_FACET_FIELDS[index])
  ) {
    throw new Error("house_project_facet_field_invalid");
  }
  return [...PROJECT_FACET_FIELDS];
};

const PLACEHOLDER_CONTENT_TYPE_ID = "00000000-0000-4000-8000-000000000547";

const assertContentTypeRef: (value: unknown) => asserts value is PackageRef = (value) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    (value as { ref?: unknown }).ref !== "content_type" ||
    (value as { key?: unknown }).key !== HOUSE_PROJECT_RESOURCE_KEY ||
    Object.keys(value).length !== 2
  ) {
    throw new Error("house_project_listing_content_ref_invalid");
  }
};

export const buildProjectCardsDesired = (): JsonObject =>
  cleanJsonObject({
    name: "Karty projektów domów",
    slug: PROJECT_LISTING_TEMPLATE_KEY,
    description: "Publiczna siatka projektów FormaDom.",
    layout: "grid",
    config: normalizeListingTemplateConfig({
      fields: [
        {
          key: "title",
          source: "title",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
        {
          key: "description",
          source: "data.cardDescription",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
        {
          key: "href",
          source: "data.cardHref",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
      ],
      itemActions: [],
      emptyState: {
        title: "Brak wyników",
        description: "Zmień filtry, aby zobaczyć inne projekty.",
        ctaLabel: null,
        ctaHref: null,
      },
      style: { columns: 3, gap: "lg", cardVariant: "default" },
    }),
  });

export const buildPublishedProjectQueryDesired = (contentTypeId: unknown): JsonObject => {
  assertContentTypeRef(contentTypeId);
  normalizeProjectFacetFields(PROJECT_FACET_FIELDS);
  const normalized = parseListingQueryCreateInput({
    name: "Opublikowane projekty domów",
    description: "Publiczne projekty w kolejności materiału referencyjnego.",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: PLACEHOLDER_CONTENT_TYPE_ID,
        includeDrafts: false,
      },
      filters: [{ field: "status", op: "eq", value: "published" }],
      sort: [
        { field: "data.referenceOrder", dir: "asc" },
        { field: "id", dir: "asc" },
      ],
      pagination: { limit: 24, offset: 0 },
      fields: [
        "id",
        "title",
        "slug",
        "data.cardDescription",
        "data.area",
        "data.categories",
        "data.referenceOrder",
        "data.cardHref",
      ],
    },
  });
  return cleanJsonObject({
    ...normalized,
    query: {
      ...normalized.query,
      sourceConfig: { ...normalized.query.sourceConfig, contentTypeId },
    },
  });
};
