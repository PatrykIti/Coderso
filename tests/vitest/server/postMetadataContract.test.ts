import { describe, expect, test } from "vitest";

import {
  POST_METADATA_REQUEST_MAX_BYTES,
  parseExactRfc3339DateTime,
  projectPostMetadataMutation,
  requestsPostPublicationMutation,
} from "../../../core/services/posts/postMetadataContract";

test("post metadata contract keeps the metadata request cap explicit", () => {
  expect(POST_METADATA_REQUEST_MAX_BYTES).toBe(64 * 1024);
});

test("metadata projection keeps only allowed own properties recursively", () => {
  const payload = Object.create({ status: "published" }) as Record<string, unknown>;
  const taxonomy = Object.create({ categoryId: "inherited-category" }) as Record<string, unknown>;
  taxonomy.tagIds = ["tag-a"];
  const seo = Object.create({ title: "inherited-title" }) as Record<string, unknown>;
  seo.description = "Own description";
  payload.tags = ["one"];
  payload.taxonomy = taxonomy;
  payload.seo = seo;

  const projected = projectPostMetadataMutation(payload);

  expect(projected).toEqual({
    tags: ["one"],
    taxonomy: { tagIds: ["tag-a"] },
    seo: { description: "Own description" },
  });
  expect(requestsPostPublicationMutation(projected)).toBe(false);
  expect(requestsPostPublicationMutation({ scheduledAt: null })).toBe(true);
  expect(requestsPostPublicationMutation({ status: "draft" })).toBe(true);
});

describe("parseExactRfc3339DateTime", () => {
  test("accepts a real leap day and normalizes valid offsets through Date", () => {
    const parsed = parseExactRfc3339DateTime("2024-02-29T23:30:00+02:00");

    expect(parsed?.toISOString()).toBe("2024-02-29T21:30:00.000Z");
  });

  test.each([
    "2023-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z",
    "2024-04-31T00:00:00Z",
    "2024-01-01T24:00:00Z",
    "2024-01-01T23:60:00Z",
    "2024-01-01T23:59:60Z",
    "2024-01-01T00:00:00+24:00",
    "2024-01-01T00:00:00+00:60",
    "2024-01-01T00:00:00z",
  ])("rejects invalid or non-canonical RFC3339 date %s", (value) => {
    expect(parseExactRfc3339DateTime(value)).toBeUndefined();
  });
});
