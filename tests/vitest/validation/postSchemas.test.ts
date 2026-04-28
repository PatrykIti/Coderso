import { expect, test } from "vitest";

import {
  postAutosaveSchema,
  postMetadataSchema,
} from "../../../core/server/validation/postSchemas";
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

test("postAutosaveSchema rejects invalid SEO field types", () => {
  expect(() =>
    validate(postAutosaveSchema, {
      seo: {
        title: 123,
      },
    })
  ).toThrow("Invalid payload");
});
