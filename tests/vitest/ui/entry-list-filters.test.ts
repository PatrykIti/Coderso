import { expect, test } from "vitest";

import type { EntryListItem } from "../../../core/admin/services/entriesClient";
import { filterEntries } from "../../../core/admin/ui/entries/EntryList";

const baseEntry: EntryListItem = {
  id: "entry-1",
  typeId: "type-1",
  title: "Test Entry",
  slug: "test-entry",
  status: "published",
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  contentType: {
    id: "type-1",
    slug: "articles",
    name: "Articles",
    status: "published",
  },
};

test("filterEntries matches query and status", () => {
  const entries: EntryListItem[] = [
    baseEntry,
    {
      ...baseEntry,
      id: "entry-2",
      title: "Draft Entry",
      slug: "draft-entry",
      status: "draft",
      updatedAt: "2026-02-01T00:00:00.000Z",
      author: { id: "author-2", name: "Editor", email: "editor@example.com" },
      contentType: {
        id: "type-2",
        slug: "products",
        name: "Products",
        status: "published",
      },
    },
  ];

  const baseFilters = {
    query: "",
    status: "all",
    typeSlug: "all",
    author: "any",
    updatedFrom: "",
    updatedTo: "",
  };

  expect(filterEntries(entries, { ...baseFilters, query: "test" })).toHaveLength(1);
  expect(filterEntries(entries, { ...baseFilters, status: "draft" })).toHaveLength(1);
  expect(filterEntries(entries, { ...baseFilters, author: "author-2" })).toHaveLength(1);
  expect(filterEntries(entries, { ...baseFilters, typeSlug: "products" })).toHaveLength(1);
  expect(filterEntries(entries, { ...baseFilters, updatedFrom: "2026-01-15" })).toHaveLength(1);
  expect(filterEntries(entries, { ...baseFilters, query: "missing" })).toHaveLength(0);
});
