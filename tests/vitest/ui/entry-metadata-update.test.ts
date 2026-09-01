// TASK-487-03-L02: the metadata panel PATCHes status, visibility, schedule,
// taxonomy and the FULL SEO object in one request. This suite pins the SEO
// half of the payload: title/canonicalUrl/robots are new, description keeps
// its existing semantics (empty string is an authored value, blanks for the
// new fields are omitted keys).

import { expect, test } from "vitest";

import { buildEntryMetadataUpdate } from "../../../core/admin/ui/entries/entryMetadataUpdate";
import type { EntryMetadataFormValues } from "../../../core/admin/ui/entries/entryMetadataUpdate";

const form = (overrides: Partial<EntryMetadataFormValues> = {}): EntryMetadataFormValues => ({
  status: "draft",
  visibility: "public",
  accessPassword: "",
  scheduledAt: "",
  seoDescription: "Search summary",
  seoTitle: "Launch day",
  seoCanonicalUrl: "https://site.test/launch-day",
  seoRobots: "index,follow",
  taxonomyOverview: null,
  selectedCategoryId: null,
  selectedTagIds: [],
  ...overrides,
});

test("saving metadata sends the full seo object with all four fields", () => {
  const result = buildEntryMetadataUpdate(form());
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.seo).toEqual({
    title: "Launch day",
    description: "Search summary",
    canonicalUrl: "https://site.test/launch-day",
    robots: "index,follow",
  });
});

test("blank title/canonicalUrl/robots are omitted while description stays authored", () => {
  const result = buildEntryMetadataUpdate(
    form({ seoTitle: "", seoCanonicalUrl: "  ", seoRobots: "", seoDescription: "" })
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  // undefined-valued keys are ignored by toEqual: the new fields must not ship
  // as empty strings (the server would store them as authored), and the
  // existing description key keeps its empty-string semantics.
  expect(result.payload.seo!).toEqual({ description: "" });
  expect("title" in result.payload.seo!).toBe(true);
  expect("robots" in result.payload.seo!).toBe(true);
});

test("scheduled status with a valid ISO date ships the normalized timestamp", () => {
  const result = buildEntryMetadataUpdate(
    form({ status: "scheduled", scheduledAt: "2026-09-01T08:30:00.000Z" })
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.scheduledAt).toBe("2026-09-01T08:30:00.000Z");
});

test("a non-empty invalid schedule date is rejected even for draft status", () => {
  const result = buildEntryMetadataUpdate(form({ scheduledAt: "not-a-date" }));
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.message).toBe("Schedule date must be a valid ISO timestamp.");
});

test("scheduled status without a schedule date is rejected", () => {
  const result = buildEntryMetadataUpdate(form({ status: "scheduled" }));
  expect(result).toEqual({
    ok: false,
    message: "Schedule date is required for scheduled entries.",
  });
});

test("non-scheduled status clears a leftover schedule date", () => {
  const result = buildEntryMetadataUpdate(form({ scheduledAt: "2026-09-01T08:30:00.000Z" }));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.scheduledAt).toBeNull();
});

test("enabled taxonomies contribute category and tag selections", () => {
  const result = buildEntryMetadataUpdate(
    form({
      taxonomyOverview: {
        taxonomies: {
          category: {
            id: "tax-category",
            typeId: "type-category",
            name: "Category",
            slug: "category",
            kind: "category",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          tag: {
            id: "tax-tag",
            typeId: "type-tag",
            name: "Tag",
            slug: "tag",
            kind: "tag",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        terms: { categories: [], tags: [] },
      },
      selectedCategoryId: "cat-1",
      selectedTagIds: ["tag-1", "tag-2"],
    })
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.taxonomy).toEqual({
    categoryId: "cat-1",
    tagIds: ["tag-1", "tag-2"],
  });
});

test("disabled taxonomies omit the taxonomy payload entirely", () => {
  const result = buildEntryMetadataUpdate(
    form({
      taxonomyOverview: {
        taxonomies: {
          category: undefined,
          tag: {
            id: "tax-tag",
            typeId: "type-tag",
            name: "Tag",
            slug: "tag",
            kind: "tag",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        terms: { categories: [], tags: [] },
      },
      selectedCategoryId: "cat-1",
      selectedTagIds: [],
    })
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.taxonomy).toEqual({ categoryId: null, tagIds: [] });
});

test("an absent taxonomy overview omits the taxonomy payload", () => {
  const result = buildEntryMetadataUpdate(form());
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.payload.taxonomy).toBeUndefined();
});

test("password visibility keeps the hash when blank and sends it when authored", () => {
  const blank = buildEntryMetadataUpdate(form({ visibility: "password", accessPassword: "" }));
  expect(blank.ok).toBe(true);
  if (!blank.ok) return;
  expect("accessPassword" in blank.payload).toBe(true);
  expect(blank.payload.accessPassword).toBeUndefined();

  const authored = buildEntryMetadataUpdate(
    form({ visibility: "password", accessPassword: "s3cret" })
  );
  expect(authored.ok).toBe(true);
  if (!authored.ok) return;
  expect(authored.payload.accessPassword).toBe("s3cret");

  const publicResult = buildEntryMetadataUpdate(
    form({ visibility: "public", accessPassword: "s3cret" })
  );
  expect(publicResult.ok).toBe(true);
  if (!publicResult.ok) return;
  expect(publicResult.payload.accessPassword).toBeNull();
});
