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
