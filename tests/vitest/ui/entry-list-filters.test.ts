import { expect, test } from "vitest";

import type { EntrySummary } from "../../../core/admin/services/entriesClient";
import { filterEntries } from "../../../core/admin/ui/entries/EntryList";

const baseEntry: EntrySummary = {
  id: "entry-1",
  typeId: "type-1",
  title: "Test Entry",
  slug: "test-entry",
  status: "published",
  data: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  author: { id: "author-1", name: "Admin", email: "admin@example.com" },
};

test("filterEntries matches query and status", () => {
  const entries: EntrySummary[] = [
    baseEntry,
    {
      ...baseEntry,
      id: "entry-2",
      title: "Draft Entry",
      slug: "draft-entry",
      status: "draft",
      author: { id: "author-2", name: "Editor", email: "editor@example.com" },
    },
  ];

  expect(filterEntries(entries, "test", "all", "any")).toHaveLength(1);
  expect(filterEntries(entries, "", "draft", "any")).toHaveLength(1);
  expect(filterEntries(entries, "", "all", "author-2")).toHaveLength(1);
  expect(filterEntries(entries, "missing", "all", "any")).toHaveLength(0);
});
