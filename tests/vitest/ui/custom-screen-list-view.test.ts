import { expect, test } from "vitest";

import type { EntrySummary } from "../../../core/admin/services/entriesClient";
import {
  buildCustomScreenEntriesFilterOptions,
  filterCustomScreenEntries,
  sortCustomScreenEntries,
} from "../../../core/admin/ui/custom-screens/customScreenListModel";
import type { CustomScreenListViewDefinition } from "../../../core/services/customScreens/customScreenSchemas";

const entries: EntrySummary[] = [
  {
    id: "entry-1",
    typeId: "type-1",
    title: "Aurora",
    slug: "aurora",
    status: "draft",
    visibility: "public",
    hasPassword: false,
    data: {
      projectStatus: "planned",
      featured: false,
    },
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-03T10:00:00.000Z",
  },
  {
    id: "entry-2",
    typeId: "type-1",
    title: "Borealis",
    slug: "borealis",
    status: "published",
    visibility: "public",
    hasPassword: false,
    data: {
      projectStatus: "active",
      featured: true,
    },
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
    publishedAt: "2026-05-02T12:00:00.000Z",
  },
];

const listView: CustomScreenListViewDefinition = {
  columns: [
    {
      id: "title",
      source: "system",
      field: "title",
      label: "Record",
      formatter: "text",
      visible: true,
    },
    {
      id: "project-status",
      source: "field",
      field: "projectStatus",
      label: "Project status",
      formatter: "select",
      visible: true,
    },
  ],
  filters: [
    {
      id: "status-filter",
      source: "system",
      field: "status",
      label: "Status",
      operator: "equals",
      enabled: true,
    },
    {
      id: "project-status-filter",
      source: "field",
      field: "projectStatus",
      label: "Project status",
      operator: "equals",
      enabled: true,
    },
  ],
  defaultSort: {
    field: "updatedAt",
    direction: "desc",
  },
  bulkActions: {
    delete: true,
    publish: true,
    unpublish: true,
  },
};

test("buildCustomScreenEntriesFilterOptions derives enabled filter values from runtime entries", () => {
  expect(
    buildCustomScreenEntriesFilterOptions({
      entries,
      listView,
    })
  ).toEqual([
    {
      id: "status-filter",
      label: "Status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
      ],
    },
    {
      id: "project-status-filter",
      label: "Project status",
      options: [
        { value: "active", label: "active" },
        { value: "planned", label: "planned" },
      ],
    },
  ]);
});

test("filterCustomScreenEntries and sortCustomScreenEntries honor list-view query, filters, and default sort", () => {
  const filtered = filterCustomScreenEntries({
    entries,
    listView,
    query: "o",
    filters: {
      "status-filter": "published",
      "project-status-filter": "active",
    },
  });

  expect(filtered.map((entry) => entry.id)).toEqual(["entry-2"]);
  expect(sortCustomScreenEntries(entries, listView).map((entry) => entry.id)).toEqual([
    "entry-1",
    "entry-2",
  ]);
});
