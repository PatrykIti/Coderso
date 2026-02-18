import type {
  ListingQueryPayload,
  ListingSource,
  ListingTemplateLayout,
} from "@/services/listingsClient";

export const listingSourceOptions: Array<{ value: ListingSource; label: string }> = [
  { value: "entries", label: "Content entries" },
  { value: "posts", label: "Posts" },
  { value: "users", label: "Users" },
  { value: "taxonomies", label: "Taxonomies" },
];

export const listingLayoutOptions: Array<{ value: ListingTemplateLayout; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "table", label: "Table" },
  { value: "calendar", label: "Calendar" },
  { value: "map", label: "Map" },
];

export const listingFilterOperatorOptions: Array<{
  value: ListingQueryPayload["filters"][number]["op"];
  label: string;
}> = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts with" },
  { value: "in", label: "In list" },
  { value: "nin", label: "Not in list" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "between", label: "Between" },
  { value: "exists", label: "Exists" },
];

export const createDefaultListingQuery = (): ListingQueryPayload => ({
  source: "entries",
  sourceConfig: {
    contentTypeId: "",
    includeDrafts: false,
  },
  filters: [],
  sort: [{ field: "updatedAt", dir: "desc" }],
  pagination: {
    limit: 12,
    offset: 0,
  },
  fields: ["id", "title", "slug", "status", "updatedAt"],
});
