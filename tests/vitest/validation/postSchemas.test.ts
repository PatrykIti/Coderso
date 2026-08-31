import { expect, test } from "vitest";

import {
  postAutosaveSchema,
  postMetadataSchema,
} from "../../../core/server/validation/postSchemas";
import { postMetadataSchema as ownedPostMetadataSchema } from "../../../core/services/posts/postMetadataContract";
import { validate } from "../../../core/server/validation/schemaValidator";
import { ApiError } from "../../../core/server/errorHandler";

test("postAutosaveSchema accepts nullable SEO fields", () => {
  expect(() =>
    validate(postAutosaveSchema, {
      title: "Draft",
      slug: "draft",
      data: {},
      seo: {
        title: null,
        description: null,
        canonicalUrl: null,
        robots: null,
      },
    })
  ).not.toThrow();
});

test("postMetadataSchema exposes nullable SEO field types", () => {
  const seo = postMetadataSchema.properties.seo as {
    properties: Record<string, { type: unknown }>;
  };

  expect(seo.properties.title.type).toEqual(["string", "null"]);
  expect(seo.properties.description.type).toEqual(["string", "null"]);
  expect(seo.properties.canonicalUrl.type).toEqual(["string", "null"]);
  expect(seo.properties.robots.type).toEqual(["string", "null"]);
});

test("postMetadataSchema re-exports the recursively strict metadata contract", () => {
  expect(postMetadataSchema).toBe(ownedPostMetadataSchema);
  expect(postMetadataSchema.minProperties).toBe(1);
  expect(postMetadataSchema.additionalProperties).toBe(false);

  const taxonomy = postMetadataSchema.properties.taxonomy;
  const seo = postMetadataSchema.properties.seo;
  expect(taxonomy.minProperties).toBe(1);
  expect(taxonomy.additionalProperties).toBe(false);
  expect(seo.minProperties).toBe(1);
  expect(seo.additionalProperties).toBe(false);

  for (const payload of [{}, { unknown: true }, { taxonomy: {} }, { seo: {} }]) {
    expect(() => validate(postMetadataSchema, payload)).toThrow("Invalid payload");
  }
});

test("postAutosaveSchema rejects invalid SEO field types", () => {
  expect(() =>
    validate(postAutosaveSchema, {
      seo: {
        title: 123,
      },
    })
  ).toThrow("Invalid payload");
});

test("post and content metadata schemas accept date-time values", () => {
  expect(() =>
    validate(postMetadataSchema, {
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
      seo: { robots: "index,follow" },
    })
  ).not.toThrow();
  expect(() =>
    validate(postAutosaveSchema, {
      title: "Draft title",
      tags: ["launch"],
      taxonomy: { categoryId: "cat-1" },
    })
  ).not.toThrow();
  expect(() =>
    validate(postMetadataSchema, { scheduledAt: "2026-04-24T08:00:00.000Z" })
  ).not.toThrow();
});

test("postMetadataSchema rejects invalid date-time values as ApiError", () => {
  try {
    validate(postMetadataSchema, { scheduledAt: "tomorrow" });
    throw new Error("expected_validation_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_error");
    expect((error as ApiError).status).toBe(400);
  }
});
