// TASK-498-03 B3.1 — related-entry resolver unit suite.
//
// Pins the resolver contract: it FILTERS the whole target-type list (returned by the
// injected `readEntries`) down to the requested ids, PRESERVES the relation's stored id
// order (not the list's read order), coerces a single/bare-string relation to `[id]`,
// clamps by `limit`, returns `[]` on empty/missing target or empty ids, resolves
// `displayValue` against a SCHEMA field under `row.data`, and surfaces `updatedAt`.

import { describe, expect, test, vi } from "vitest";

import {
  relatedEntriesMapEqual,
  resolveRelatedEntries,
  type RelatedEntrySummary,
} from "../../../core/services/customScreens/relatedEntryResolver";

// The WHOLE target-type list, in updatedAt-desc read order (NOT the stored relation order).
const targetList = [
  {
    id: "task-3",
    title: "Ship docs",
    status: "published",
    updatedAt: "2026-06-03T00:00:00.000Z",
    data: { priority: "low" },
  },
  {
    id: "task-1",
    title: "Draft spec",
    status: "draft",
    updatedAt: "2026-06-01T00:00:00.000Z",
    data: { priority: "high" },
  },
  {
    id: "task-2",
    title: "Review PR",
    status: "scheduled",
    updatedAt: "2026-06-02T00:00:00.000Z",
    data: { priority: "medium" },
  },
];

const readEntries = vi.fn(async (_target: string) => targetList);

test("filters the whole target list to the requested ids in STORED order (not read order)", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["task-1", "task-2"],
    target: "tasks",
    readEntries,
  });
  expect(rows.map((r) => r.id)).toEqual(["task-1", "task-2"]);
  expect(rows.map((r) => r.title)).toEqual(["Draft spec", "Review PR"]);
});

test("skips an unknown id and clamps by limit", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["task-2", "missing-id", "task-3", "task-1"],
    target: "tasks",
    limit: 2,
    readEntries,
  });
  // limit=2 keeps only the first two ids; missing-id would have been dropped anyway.
  expect(rows.map((r) => r.id)).toEqual(["task-2"]);
});

test("an unknown id in-range is skipped without collapsing to empty", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["missing-id", "task-3"],
    target: "tasks",
    readEntries,
  });
  expect(rows.map((r) => r.id)).toEqual(["task-3"]);
});

test("a single (bare string) relation coerces to [id] and resolves its one row", async () => {
  const rows = await resolveRelatedEntries({
    ids: "task-2",
    target: "tasks",
    readEntries,
  });
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe("task-2");
});

test("empty / null ids and missing target return []", async () => {
  expect(await resolveRelatedEntries({ ids: [], target: "tasks", readEntries })).toEqual([]);
  expect(await resolveRelatedEntries({ ids: null, target: "tasks", readEntries })).toEqual([]);
  expect(await resolveRelatedEntries({ ids: "", target: "tasks", readEntries })).toEqual([]);
  expect(await resolveRelatedEntries({ ids: ["task-1"], target: "", readEntries })).toEqual([]);
});

test("displayValue resolves a SCHEMA field under row.data (not just top-level)", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["task-1"],
    target: "tasks",
    displayField: "priority",
    readEntries,
  });
  expect(rows[0].displayValue).toBe("high");
});

test("displayValue falls back to a top-level system field when absent from row.data", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["task-1"],
    target: "tasks",
    displayField: "status",
    readEntries,
  });
  expect(rows[0].displayValue).toBe("draft");
});

test("updatedAt is surfaced from row.updatedAt (activity time source) and undefined when absent", async () => {
  const rows = await resolveRelatedEntries({
    ids: ["task-1"],
    target: "tasks",
    readEntries,
  });
  expect(rows[0].updatedAt).toBe("2026-06-01T00:00:00.000Z");

  const noTime = await resolveRelatedEntries({
    ids: ["x"],
    target: "tasks",
    readEntries: async () => [{ id: "x", title: "No time" }],
  });
  expect(noTime[0].updatedAt).toBeUndefined();
});

describe("relatedEntriesMapEqual (setState diff-guard)", () => {
  const map = (): Record<string, RelatedEntrySummary[]> => ({
    "block-1": [{ id: "task-1", title: "Draft spec", status: "draft" }],
  });

  test("equal maps are equal", () => {
    expect(relatedEntriesMapEqual(map(), map())).toBe(true);
  });

  test("differing rows / keys are not equal", () => {
    expect(
      relatedEntriesMapEqual(map(), {
        "block-1": [{ id: "task-2", title: "Other", status: "draft" }],
      })
    ).toBe(false);
    expect(relatedEntriesMapEqual(map(), {})).toBe(false);
  });
});

test("resolveRelatedEntries stringifies an array display field joined in stored order", async () => {
  const readEntries = vi.fn(async () => [
    {
      id: "task-1",
      title: "Draft spec",
      data: { tags: ["alpha", "beta"], nested: { value: "v" } },
    },
    {
      id: "task-2",
      title: "Ship docs",
      data: { tags: [] },
    },
  ]);

  const result = await resolveRelatedEntries({
    ids: ["task-2", "task-1"],
    target: "tasks",
    displayField: "tags",
    readEntries,
  });

  expect(result.map((row) => row.displayValue)).toEqual(["", "alpha, beta"]);
});
