import type { ListingSource, ListingSort } from "./listingQueryContract";

export type ListingSourceRow = Record<string, unknown>;

export type ListingSourceDefinition = {
  id: ListingSource;
  fieldAllowlist: readonly string[];
  fieldPrefixAllowlist: readonly string[];
  defaultFields: readonly string[];
  defaultSort: readonly ListingSort[];
};

const entryFieldAllowlist = [
  "id",
  "typeId",
  "title",
  "slug",
  "status",
  "tags",
  "publishedAt",
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "author.id",
  "author.name",
  "author.email",
] as const;

export const LISTING_SOURCE_DEFINITIONS: Record<ListingSource, ListingSourceDefinition> = {
  entries: {
    id: "entries",
    fieldAllowlist: entryFieldAllowlist,
    fieldPrefixAllowlist: ["data."],
    defaultFields: ["id", "title", "slug", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
  },
  posts: {
    id: "posts",
    fieldAllowlist: entryFieldAllowlist,
    fieldPrefixAllowlist: ["data."],
    defaultFields: ["id", "title", "slug", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
  },
  users: {
    id: "users",
    fieldAllowlist: [
      "id",
      "name",
      "email",
      "status",
      "roleIds",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ],
    fieldPrefixAllowlist: [],
    defaultFields: ["id", "name", "email", "status", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
  },
  taxonomies: {
    id: "taxonomies",
    fieldAllowlist: [
      "id",
      "typeId",
      "name",
      "slug",
      "kind",
      "createdAt",
      "updatedAt",
      "termsCount",
    ],
    fieldPrefixAllowlist: [],
    defaultFields: ["id", "name", "slug", "kind", "updatedAt"],
    defaultSort: [
      { field: "updatedAt", dir: "desc" },
      { field: "id", dir: "asc" },
    ],
  },
};

export function getListingSourceDefinition(source: ListingSource): ListingSourceDefinition {
  return LISTING_SOURCE_DEFINITIONS[source];
}

export function isListingFieldAllowed(sourceDefinition: ListingSourceDefinition, field: string) {
  if (sourceDefinition.fieldAllowlist.includes(field)) {
    return true;
  }
  return sourceDefinition.fieldPrefixAllowlist.some((prefix) => field.startsWith(prefix));
}
