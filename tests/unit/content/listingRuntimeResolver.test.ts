import { expect, test } from "bun:test";

import {
  evaluateListingCondition,
  evaluateListingVisibility,
  findListingBindingState,
  resolveListingBindingIndex,
  type ListingVisibilityCondition,
} from "../../../core/services/content/listingRuntimeResolver";

const sampleRow: Record<string, unknown> = {
  id: "entry-1",
  status: "published",
  price: 129.5,
  tags: ["featured", "engine"],
  title: "Brake Service",
  score: 10,
  createdAt: "2026-02-18T12:00:00.000Z",
  flags: {
    visible: true,
  },
  data: {
    summary: "Includes diagnostics",
  },
};

const createCondition = (
  patch: Partial<ListingVisibilityCondition>
): ListingVisibilityCondition => ({
  id: "condition-1",
  field: "status",
  op: "eq",
  value: "published",
  ...patch,
});

test("evaluateListingCondition supports equality and set operators", () => {
  expect(evaluateListingCondition(createCondition(), sampleRow)).toBe(true);
  expect(
    evaluateListingCondition(
      createCondition({ op: "neq", value: "draft" }),
      sampleRow
    )
  ).toBe(true);
  expect(
    evaluateListingCondition(
      createCondition({ field: "status", op: "in", value: ["draft", "published"] }),
      sampleRow
    )
  ).toBe(true);
  expect(
    evaluateListingCondition(
      createCondition({ field: "tags", op: "contains", value: "engine" }),
      sampleRow
    )
  ).toBe(true);
});

test("evaluateListingCondition handles exists semantics for missing fields", () => {
  expect(
    evaluateListingCondition(
      createCondition({ field: "missing.field", op: "exists" }),
      sampleRow
    )
  ).toBe(false);
  expect(
    evaluateListingCondition(
      createCondition({ field: "missing.field", op: "exists", value: false }),
      sampleRow
    )
  ).toBe(true);
});

test("evaluateListingCondition supports numeric and date comparisons", () => {
  expect(
    evaluateListingCondition(
      createCondition({ field: "score", op: "gt", value: 5 }),
      sampleRow
    )
  ).toBe(true);
  expect(
    evaluateListingCondition(
      createCondition({ field: "score", op: "lte", value: 10 }),
      sampleRow
    )
  ).toBe(true);
  expect(
    evaluateListingCondition(
      createCondition({
        field: "createdAt",
        op: "gte",
        value: "2026-02-18T11:00:00.000Z",
      }),
      sampleRow
    )
  ).toBe(true);
});

test("evaluateListingVisibility requires all conditions to pass", () => {
  expect(
    evaluateListingVisibility(
      [
        createCondition({ field: "status", op: "eq", value: "published" }),
        createCondition({ field: "flags.visible", op: "eq", value: true, id: "condition-2" }),
      ],
      sampleRow
    )
  ).toBe(true);

  expect(
    evaluateListingVisibility(
      [
        createCondition({ field: "status", op: "eq", value: "published" }),
        createCondition({ field: "score", op: "lt", value: 1, id: "condition-3" }),
      ],
      sampleRow
    )
  ).toBe(false);
});

test("resolveListingBindingIndex applies conditions and safe fallbacks", () => {
  const index = resolveListingBindingIndex(sampleRow, [
    {
      key: "title",
      source: "title",
      label: null,
      fallback: null,
      format: "text",
      conditions: [],
    },
    {
      key: "excerpt",
      source: "data.summary",
      label: null,
      fallback: "No summary",
      format: "text",
      conditions: [
        {
          id: "condition-summary",
          field: "status",
          op: "eq",
          value: "published",
        },
      ],
    },
    {
      key: "image",
      source: "data.image",
      label: null,
      fallback: null,
      format: "text",
      conditions: [
        {
          id: "condition-hide-image",
          field: "status",
          op: "eq",
          value: "draft",
        },
      ],
    },
  ]);

  const title = findListingBindingState(index, ["title"]);
  const excerpt = findListingBindingState(index, ["excerpt"]);
  const image = findListingBindingState(index, ["image"]);

  expect(title?.visible).toBe(true);
  expect(title?.value).toBe("Brake Service");
  expect(excerpt?.visible).toBe(true);
  expect(excerpt?.value).toBe("Includes diagnostics");
  expect(image?.visible).toBe(false);
  expect(image?.value).toBeUndefined();
});

