import { expect, test } from "vitest";

import {
  postAutosaveSchema,
  postMetadataSchema,
} from "../../../core/server/validation/postSchemas";
import { postMetadataSchema as ownedPostMetadataSchema } from "../../../core/services/posts/postMetadataContract";
import { validate } from "../../../core/server/validation/schemaValidator";

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
