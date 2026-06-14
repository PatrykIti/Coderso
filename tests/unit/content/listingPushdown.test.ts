import { expect, test } from "bun:test";

import type {
  ListingPushdownPlan,
  ListingPushdownPredicate,
} from "../../../core/services/content/listingPushdown";
import {
  executeListingQuery,
  type ListingQuery,
  type ListingRowsResolver,
} from "../../../core/services/content/queryBuilderService";
import type { ListingSourceRow } from "../../../core/services/content/listingSources";

const rows: ListingSourceRow[] = [
  {
    id: "01",
    title: "Number match",
    status: "published",
    updatedAt: "2026-01-01",
    data: { price: 100, rooms: 3, active: true, missingish: null },
  },
  {
    id: "02",
    title: "Number miss",
    status: "published",
    updatedAt: "2026-01-02",
    data: { price: 250, rooms: 5, active: false },
  },
  {
    id: "03",
    title: "String value stays in superset",
    status: "published",
    updatedAt: "2026-01-03",
    data: { price: "100", rooms: "3", active: "true" },
  },
  {
    id: "04",
    title: "Array value stays in superset",
    status: "published",
    updatedAt: "2026-01-04",
    data: { price: [100, null], rooms: [3], active: [true] },
  },
  {
    id: "05",
    title: "Missing value stays in numeric superset",
    status: "published",
    updatedAt: "2026-01-05",
    data: {},
  },
];

const readDataValue = (row: ListingSourceRow, segments: string[]) => {
  let value: unknown = row.data;
  for (const segment of segments) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

const compareNumber = (value: number, op: "gt" | "gte" | "lt" | "lte", expected: number) => {
  if (op === "gt") return value > expected;
  if (op === "gte") return value >= expected;
  if (op === "lt") return value < expected;
  return value <= expected;
};

const matchesPushdownPredicate = (row: ListingSourceRow, predicate: ListingPushdownPredicate) => {
  const value = readDataValue(row, predicate.segments);

  if (predicate.kind === "exists") {
    return value !== undefined && value !== null;
  }

  if (predicate.kind === "null-eq") {
    if (predicate.negate) return value !== undefined && value !== null;
    return value === undefined || value === null || Array.isArray(value);
  }

  if (predicate.kind === "numeric-compare") {
    return typeof value === "number" ? compareNumber(value, predicate.op, predicate.value) : true;
  }

  if (predicate.kind === "numeric-between") {
    return typeof value === "number" ? value >= predicate.min && value <= predicate.max : true;
  }

  if (predicate.kind === "numeric-eq") {
    if (typeof value !== "number") return true;
    const matches = predicate.values.includes(value);
    return predicate.negate ? !matches : matches;
  }

  if (typeof value !== "boolean") return true;
  return predicate.negate ? value !== predicate.value : value === predicate.value;
};

const applyPushdownPlan = (plan: ListingPushdownPlan | null | undefined) => {
  if (!plan) return rows;
  return rows.filter((row) =>
    plan.predicates.every((predicate) => matchesPushdownPredicate(row, predicate))
  );
};

const oracleResolver: ListingRowsResolver = async () => rows;

const pushdownResolver: ListingRowsResolver = async (_source, _config, pushdown) =>
  applyPushdownPlan(pushdown);

const queryWithFilters = (filters: ListingQuery["filters"]): ListingQuery => ({
  source: "entries",
  sourceConfig: { contentTypeId: "type-1", includeDrafts: true },
  filters,
  sort: [{ field: "id", dir: "asc" }],
  pagination: { limit: 100, offset: 0 },
  fields: ["id"],
});

test("listing pushdown predicates keep a superset of the JS matcher oracle", async () => {
  const cases: Array<{ name: string; filters: ListingQuery["filters"] }> = [
    { name: "numeric eq", filters: [{ field: "data.price", op: "eq", value: 100 }] },
    { name: "numeric neq", filters: [{ field: "data.price", op: "neq", value: 100 }] },
    { name: "numeric in", filters: [{ field: "data.rooms", op: "in", value: [3, 4] }] },
    { name: "numeric nin", filters: [{ field: "data.rooms", op: "nin", value: [3, 4] }] },
    { name: "numeric gte", filters: [{ field: "data.rooms", op: "gte", value: 3 }] },
    {
      name: "numeric between",
      filters: [{ field: "data.price", op: "between", value: [90, 150] }],
    },
    { name: "boolean eq", filters: [{ field: "data.active", op: "eq", value: true }] },
    { name: "boolean neq", filters: [{ field: "data.active", op: "neq", value: true }] },
    { name: "exists", filters: [{ field: "data.price", op: "exists" }] },
    { name: "null eq", filters: [{ field: "data.missingish", op: "eq", value: null }] },
    { name: "null neq", filters: [{ field: "data.missingish", op: "neq", value: null }] },
    {
      name: "combined pushed predicates",
      filters: [
        { field: "data.rooms", op: "gte", value: 3 },
        { field: "data.active", op: "eq", value: true },
      ],
    },
    {
      name: "unsupported string filter stays oracle-correct",
      filters: [{ field: "data.price", op: "contains", value: "10" }],
    },
  ];

  for (const item of cases) {
    const query = queryWithFilters(item.filters);
    const oracle = await executeListingQuery(query, { rowsResolver: oracleResolver });
    const pushed = await executeListingQuery(query, { rowsResolver: pushdownResolver });
    expect(
      { name: item.name, total: pushed.total, ids: pushed.rows.map((row) => row.id) },
      item.name
    ).toEqual({
      name: item.name,
      total: oracle.total,
      ids: oracle.rows.map((row) => row.id),
    });
  }
});
