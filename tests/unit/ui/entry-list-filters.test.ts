import { expect, test } from "bun:test";

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
    },
  ];

  expect(filterEntries(entries, "test", "all")).toHaveLength(1);
  expect(filterEntries(entries, "", "draft")).toHaveLength(1);
  expect(filterEntries(entries, "missing", "all")).toHaveLength(0);
});
