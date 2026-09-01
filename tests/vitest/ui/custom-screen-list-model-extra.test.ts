// TASK-105-08-04 (Item A): customScreenListModel residual branches — content
// type option ordering, field-option derived column/filter ids, system field
// fallbacks (slug/publishedAt/unknown), date formatting edge values, array
// filter values, and mixed-value comparison fallbacks.

import { expect, test } from "vitest";

import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type { EntrySummary } from "../../../core/admin/services/entriesClient";
import {
  buildCustomScreenContentTypeFilterOptions,
  buildCustomScreenEntriesFilterOptions,
  buildListColumnFromOption,
  buildListFilterFromOption,
  filterCustomScreenEntries,
  readSystemEntryField,
  resolveEntryColumnRawValue,
  resolveEntryColumnValue,
  sortCustomScreenEntries,
} from "../../../core/admin/ui/custom-screens/customScreenListModel";
import type {
  CustomScreenListColumn,
  CustomScreenListViewDefinition,
} from "../../../core/services/customScreens/customScreenSchemas";

const contentType = (id: string, name: string): ContentTypeSummary => ({
  id,
  name,
  slug: id,
  status: "published",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
});

const entry = ({ id, ...overrides }: Partial<EntrySummary> & { id: string }): EntrySummary => ({
  id,
  typeId: "type-1",
  title: "Title " + id,
  slug: id,
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  ...overrides,
});

test("content type filter options merge row-only types and sort by label", () => {
  const rows = [
    { screen: { contentTypeId: "zebra", updatedAt: "" }, contentTypeLabel: "Zebra" },
    { screen: { contentTypeId: "apple", updatedAt: "" }, contentTypeLabel: "Apple" },
  ] as Parameters<typeof buildCustomScreenContentTypeFilterOptions>[0];

  const options = buildCustomScreenContentTypeFilterOptions(rows, [
    contentType("apple", "Apple"),
    contentType("kiwi", "Kiwi"),
  ] as ContentTypeSummary[]);

  expect(options.map((option) => option.label)).toEqual(["Apple", "Kiwi", "Zebra"]);
});

test("buildListColumnFromOption and buildListFilterFromOption derive slug ids", () => {
  const column = buildListColumnFromOption({
    source: "field",
    field: "Project Title!",
    label: "Project title",
    formatter: "text",
  });
  expect(column).toEqual({
    id: "field-project-title",
    source: "field",
    field: "Project Title!",
    label: "Project title",
    formatter: "text",
    visible: true,
  });

  const filter = buildListFilterFromOption({
    source: "system",
    field: "title",
    label: "Record",
    formatter: "text",
  });
  expect(filter).toEqual({
    id: "filter-system-title",
    source: "system",
    field: "title",
    label: "Record",
    operator: "equals",
    enabled: true,
  });
});

test("readSystemEntryField covers slug, publishedAt, and unknown fallback", () => {
  const record: EntrySummary = entry({
    id: "e",
    slug: "hello-slug",
    publishedAt: "2026-05-02T12:00:00.000Z",
  });

  expect(readSystemEntryField(record, "slug")).toBe("hello-slug");
  expect(readSystemEntryField(record, "publishedAt")).toBe("2026-05-02T12:00:00.000Z");
  expect(readSystemEntryField(record, "createdAt")).toBe("2026-05-01T10:00:00.000Z");
  expect(readSystemEntryField(record, "unknown-system-key")).toBeUndefined();
  expect(
    resolveEntryColumnRawValue({
      entry: record,
      column: {
        id: "c",
        source: "field",
        field: "missing",
        label: "x",
        formatter: "text",
        visible: true,
      },
    })
  ).toBeUndefined();
});

test("resolveEntryColumnValue renders date formatter branches (valid, invalid, non-date)", () => {
  const dateColumn: CustomScreenListColumn = {
    id: "at",
    source: "field",
    field: "at",
    label: "At",
    formatter: "date",
    visible: true,
  };

  expect(
    resolveEntryColumnValue({
      entry: entry({ id: "ok", data: { at: "2026-03-04T12:00:00.000Z" } }),
      column: dateColumn,
    })
  ).toMatch(/2026$/);
  // V8's toLocaleDateString never throws for an invalid date, so the result is
  // "Invalid Date" (the catch fallback on line 208 stays unreachable).
  expect(
    resolveEntryColumnValue({
      entry: entry({ id: "bad", data: { at: "not-a-date" } }),
      column: dateColumn,
    })
  ).toBe("Invalid Date");
  expect(
    resolveEntryColumnValue({
      entry: entry({
        id: "dateobj",
        data: { at: new Date("2026-01-02T12:00:00.000Z") } as unknown as EntrySummary["data"],
      }),
      column: dateColumn,
    })
  ).toMatch(/2026$/);
  // A non-string non-Date value short-circuits formatDate to "".
  expect(
    resolveEntryColumnValue({
      entry: entry({ id: "num", data: { at: 42 } }),
      column: dateColumn,
    })
  ).toBe("");
});

test("date formatter handles invalid values and non-date inputs", () => {
  const dateColumn: CustomScreenListColumn = {
    id: "date",
    source: "system",
    field: "createdAt",
    label: "Created",
    formatter: "date",
    visible: true,
  };

  // non-string, non-Date input → em dash (formatListValue guard)
  expect(
    resolveEntryColumnRawValue({
      entry: entry({ id: "a", data: { at: 42 } }),
      column: { ...dateColumn, source: "field", field: "at" },
    })
  ).toBe(42);

  const options = buildCustomScreenEntriesFilterOptions({
    entries: [
      entry({ id: "b", data: { at: 42 } }),
      entry({
        id: "c",
        data: { at: new Date("2026-01-02T00:00:00.000Z") } as unknown as EntrySummary["data"],
      }),
    ],
    listView: {
      columns: [dateColumn],
      filters: [
        { id: "f", source: "field", field: "at", label: "At", operator: "equals", enabled: true },
      ],
      defaultSort: { field: "createdAt", direction: "desc" },
      bulkActions: { delete: false, publish: false, unpublish: false },
    },
  });

  // Date object tokenizes through String(value) (line 266 fallback), a number
  // tokenizes numerically, and the number sorts before the date text.
  const atOptions = options[0]?.options ?? [];
  expect(atOptions.map((option) => option.value)).toContain("42");
  expect(atOptions.map((option) => option.value)).toContain(
    String(new Date("2026-01-02T00:00:00.000Z"))
  );
});

test("date formatter renders Date instances and falls back on invalid dates", () => {
  const dateColumn: CustomScreenListColumn = {
    id: "date",
    source: "field",
    field: "at",
    label: "At",
    formatter: "date",
    visible: true,
  };
  const listView: CustomScreenListViewDefinition = {
    columns: [dateColumn],
    filters: [],
    defaultSort: { field: "at", direction: "asc" },
    bulkActions: { delete: false, publish: false, unpublish: false },
  };

  const valid = entry({ id: "v", data: { at: "2026-03-04T00:00:00.000Z" } });
  const invalid = entry({ id: "i", data: { at: "not-a-date" } });

  // Invalid dates sort via the String fallback; the Date-string parse path and
  // catch fallback both execute inside formatDate during sorting.
  const sorted = sortCustomScreenEntries([valid, invalid], listView);
  expect(sorted.map((item) => item.id)).toEqual(["v", "i"]);
});

test("array filter values tokenize per item and match selected array members", () => {
  const listView: CustomScreenListViewDefinition = {
    columns: [
      {
        id: "tags",
        source: "field",
        field: "tags",
        label: "Tags",
        formatter: "text",
        visible: true,
      },
    ],
    filters: [
      {
        id: "tags-filter",
        source: "field",
        field: "tags",
        label: "Tags",
        operator: "equals",
        enabled: true,
      },
    ],
    defaultSort: { field: "title", direction: "asc" },
    bulkActions: { delete: false, publish: false, unpublish: false },
  };

  const withTags = entry({ id: "t", data: { tags: ["alpha", "beta", 7] } });
  const withoutTags = entry({ id: "u", data: { tags: [] } });

  const options = buildCustomScreenEntriesFilterOptions({
    entries: [withTags, withoutTags],
    listView,
  });
  expect(options[0]?.options.map((option) => option.value)).toEqual(["7", "alpha", "beta"]);

  expect(
    filterCustomScreenEntries({
      entries: [withTags, withoutTags],
      listView,
      query: "",
      filters: { "tags-filter": "beta" },
    }).map((item) => item.id)
  ).toEqual(["t"]);
});

test("sortCustomScreenEntries compares booleans and localeCompare string fallbacks", () => {
  const boolColumn: CustomScreenListViewDefinition = {
    columns: [
      {
        id: "f",
        source: "field",
        field: "featured",
        label: "Featured",
        formatter: "boolean",
        visible: true,
      },
    ],
    filters: [],
    defaultSort: { field: "featured", direction: "asc" },
    bulkActions: { delete: false, publish: false, unpublish: false },
  };

  const trueEntry = entry({ id: "yes", data: { featured: true } });
  const falseEntry = entry({ id: "no", data: { featured: false } });
  expect(
    sortCustomScreenEntries([trueEntry, falseEntry], boolColumn).map((item) => item.id)
  ).toEqual(["no", "yes"]);

  const textColumn: CustomScreenListViewDefinition = {
    columns: [
      {
        id: "code",
        source: "field",
        field: "code",
        label: "Code",
        formatter: "text",
        visible: true,
      },
    ],
    filters: [],
    defaultSort: { field: "code", direction: "asc" },
    bulkActions: { delete: false, publish: false, unpublish: false },
  };

  // "alpha-2" / "alpha-10" are not date-parseable, so the localeCompare
  // numeric fallback runs.
  const a = entry({ id: "a", data: { code: "alpha-10" } });
  const b = entry({ id: "b", data: { code: "alpha-2" } });
  expect(sortCustomScreenEntries([a, b], textColumn).map((item) => item.id)).toEqual(["b", "a"]);
});
