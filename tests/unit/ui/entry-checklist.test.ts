import { expect, test } from "bun:test";

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
  expect(checklist.missingRequiredFields).toEqual([
    { name: "headline", label: "Headline" },
  ]);
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

  expect(checklist.blockingIssues).toContain(
    "Schedule date must be a valid ISO timestamp."
  );
  const scheduleItem = checklist.items.find((item) => item.id === "schedule");
  expect(scheduleItem?.status).toBe("warning");
});
