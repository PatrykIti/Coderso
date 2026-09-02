import { expect, test } from "vitest";

import { buildEntryChecklist } from "../../../core/admin/ui/entries/entryChecklist";

const baseFields = [
  {
    id: "field-headline",
    name: "headline",
    type: "text",
    label: "Headline",
    required: true,
  },
  {
    id: "field-featured",
    name: "featured",
    type: "boolean",
    label: "Featured",
    required: true,
  },
] as const;

test("buildEntryChecklist flags missing title, slug, and required fields", () => {
  const checklist = buildEntryChecklist({
    title: "",
    slug: "",
    status: "draft",
    scheduledAt: "",
    fields: [...baseFields],
    values: { headline: "", featured: false },
  });

  expect(checklist.blockingIssues).toContain("Add a title.");
  expect(checklist.blockingIssues).toContain("Add a slug.");
  expect(checklist.missingRequiredFields).toEqual([{ name: "headline", label: "Headline" }]);
});

test("buildEntryChecklist validates schedule dates", () => {
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "scheduled",
    scheduledAt: "not-a-date",
    fields: [],
    values: {},
  });

  expect(checklist.blockingIssues).toContain("Schedule date must be a valid ISO timestamp.");
  const scheduleItem = checklist.items.find((item) => item.id === "schedule");
  expect(scheduleItem?.status).toBe("warning");
});

test("isValueFilled accepts numbers, booleans, arrays, and objects", () => {
  const field = (name: string, type: string, required = true) =>
    ({ id: `field-${name}`, name, type, label: name, required }) as never;
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [
      field("count", "number"),
      field("featured", "boolean"),
      field("tags", "array"),
      field("authorRef", "relation"),
      field("payload", "json"),
    ] as never,
    values: {
      count: 3,
      featured: true,
      tags: ["one"],
      authorRef: { id: "author-7" },
      payload: { a: 1 },
    },
  });

  expect(checklist.missingRequiredFields).toEqual([]);
  expect(checklist.blockingIssues).toEqual([]);
  const requiredItem = checklist.items.find((item) => item.id === "required");
  expect(requiredItem?.status).toBe("complete");
  expect(requiredItem?.label).toBe("Required fields filled");
});

test("empty-ish values of every shape still count as missing", () => {
  const field = (name: string, type: string, required = true) =>
    ({ id: `field-${name}`, name, type, label: name, required }) as never;
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [
      field("whitespace", "text"),
      field("nan", "number"),
      field("emptyArray", "array"),
      field("emptyObject", "json"),
      field("blankRef", "relation"),
      field("zero", "number"),
      field("falseValue", "boolean"),
      field("missingValue", "text"),
      field("undefinedValue", "text"),
    ] as never,
    values: {
      whitespace: "   ",
      nan: Number.NaN,
      emptyArray: [],
      emptyObject: {},
      blankRef: { id: "  " },
      zero: 0,
      falseValue: false,
      missingValue: null,
      undefinedValue: undefined,
    },
  });

  expect(checklist.missingRequiredFields.map((item) => item.name)).toEqual([
    "whitespace",
    "nan",
    "emptyArray",
    "emptyObject",
    "blankRef",
    "missingValue",
    "undefinedValue",
  ]);
});

test("scheduled status without a date and with a valid date drives the schedule item", () => {
  const missing = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "scheduled",
    scheduledAt: "",
    fields: [],
    values: {},
  });
  expect(missing.blockingIssues).toContain("Schedule date is required for scheduled entries.");
  const missingItem = missing.items.find((item) => item.id === "schedule");
  expect(missingItem?.status).toBe("warning");
  expect(missingItem?.detail).toBe("Schedule date is required for scheduled entries.");

  const set = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "scheduled",
    scheduledAt: "2026-09-01T08:30:00.000Z",
    fields: [],
    values: {},
  });
  expect(set.blockingIssues).toEqual([]);
  const setItem = set.items.find((item) => item.id === "schedule");
  expect(setItem?.status).toBe("complete");
  expect(setItem?.label).toBe("Schedule date set");
});

test("non-scheduled status marks the schedule item informational", () => {
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [],
    values: {},
  });
  const item = checklist.items.find((entry) => entry.id === "schedule");
  expect(item?.status).toBe("info");
  expect(item?.label).toBe("Schedule date (optional)");
  expect(item?.detail).toBe("Only required when scheduling.");
});

test("more than three missing required fields compress into the suffix", () => {
  const fields = ["alpha", "beta", "gamma", "delta", "epsilon"].map((name) => ({
    id: `field-${name}`,
    name,
    type: "text",
    label: name,
    required: true,
  })) as never;
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields,
    values: { alpha: "", beta: "", gamma: "", delta: "", epsilon: "" },
  });

  const requiredItem = checklist.items.find((item) => item.id === "required");
  expect(requiredItem?.detail).toBe("Missing: alpha, beta, gamma +2 more");
  expect(checklist.blockingIssues).toContain("Fill required fields: alpha, beta, gamma +2 more.");
});

test("missing required fields without a label fall back to the field name", () => {
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [{ id: "field-raw", name: "raw_value", type: "text", required: true }] as never,
    values: { raw_value: "" },
  });
  expect(checklist.missingRequiredFields).toEqual([{ name: "raw_value", label: "raw_value" }]);
});

test("non-string primitive values count as filled for boolean fields", () => {
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [{ id: "field-featured", name: "featured", type: "boolean", required: true }] as never,
    values: { featured: 1n },
  });
  expect(checklist.missingRequiredFields).toEqual([]);
  const requiredItem = checklist.items.find((item) => item.id === "required");
  expect(requiredItem?.status).toBe("complete");
});

test("non-string primitive values fall through as missing for non-boolean fields", () => {
  const checklist = buildEntryChecklist({
    title: "Post",
    slug: "post",
    status: "draft",
    scheduledAt: "",
    fields: [
      { id: "field-tag", name: "tag", type: "text", required: true },
      { id: "field-count", name: "count", type: "number", required: true },
    ] as never,
    values: { tag: 1n, count: 2n },
  });
  expect(checklist.missingRequiredFields.map((item) => item.name)).toEqual(["tag", "count"]);
});
