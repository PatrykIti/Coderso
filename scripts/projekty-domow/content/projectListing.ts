import { normalizeListingTemplateConfig } from "../../../core/services/content/listingTemplateConfig";
import { parseListingQueryCreateInput } from "../../../core/services/content/queryBuilderService";
import type { JsonObject, PackageRef } from "../../../core/services/kits/fullSitePackage/types";
import { HOUSE_PROJECT_RESOURCE_KEY } from "./constants";
import { cleanJsonObject } from "../json";

export const PROJECT_LISTING_TEMPLATE_KEY = "project-cards";
export const PROJECT_LISTING_QUERY_KEY = "published-projects";
export const PROJECT_FACET_FIELDS = ["data.style", "data.storeys", "data.energyClass"] as const;

export const normalizeProjectFacetFields = (value: unknown): string[] => {
  if (
    !Array.isArray(value) ||
    value.some(
      (field) =>
        typeof field !== "string" || !(PROJECT_FACET_FIELDS as readonly string[]).includes(field)
    )
  ) {
    throw new Error("house_project_facet_field_invalid");
  }
  return [...new Set(value)];
};

const PLACEHOLDER_CONTENT_TYPE_ID = "00000000-0000-4000-8000-000000000547";

const assertContentTypeRef: (value: unknown) => asserts value is PackageRef = (value) => {
  const record = value as Partial<PackageRef> | null;
  if (
    !record ||
    record.ref !== "content_type" ||
    record.key !== HOUSE_PROJECT_RESOURCE_KEY ||
    Object.keys(record).length !== 2
  ) {
    throw new Error("house_project_listing_content_ref_invalid");
  }
};

export const buildProjectCardsDesired = (): JsonObject => ({
  name: "Karty projektów domów",
  slug: PROJECT_LISTING_TEMPLATE_KEY,
  description: "Trzykolumnowa siatka projektów z parametrami domu.",
  layout: "grid",
  config: normalizeListingTemplateConfig({
    fields: [
      { key: "title", source: "title", label: null, fallback: null, format: "text" },
      { key: "area", source: "data.area", label: "Powierzchnia", fallback: null, format: "text" },
      { key: "style", source: "data.style", label: "Styl", fallback: null, format: "badge" },
      {
        key: "energy",
        source: "data.energyClass",
        label: "Energia",
        fallback: null,
        format: "badge",
      },
    ],
    itemActions: [
      {
        id: "view-project",
        label: "Zobacz projekt",
        kind: "view",
        href: null,
        opensInNewTab: false,
      },
    ],
    emptyState: {
      title: "Brak projektów",
      description: "Zmień wybrane filtry.",
      ctaLabel: null,
      ctaHref: null,
    },
    style: { columns: 3, gap: "lg", cardVariant: "default" },
  }),
});

export const buildPublishedProjectQueryDesired = (contentTypeId: unknown): JsonObject => {
  assertContentTypeRef(contentTypeId);
  const facetFields = normalizeProjectFacetFields(PROJECT_FACET_FIELDS);
  const normalized = parseListingQueryCreateInput({
    name: "Opublikowane projekty domów",
    description: "Publiczne projekty z polami wykorzystywanymi przez filtry.",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: PLACEHOLDER_CONTENT_TYPE_ID,
        includeDrafts: false,
      },
      filters: [{ field: "status", op: "eq", value: "published" }],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 24, offset: 0 },
      fields: ["id", "title", "slug", "data.area", ...facetFields],
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
