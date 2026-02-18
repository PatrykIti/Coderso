import { expect, test } from "bun:test";

import {
  listingQueryCreateSchema,
  listingQuerySchema,
  listingQueryUpdateSchema,
  listingTemplateCreateSchema,
  listingTemplateUpdateSchema,
} from "../../../core/server/validation/listingSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

const buildValidQuery = () => ({
  source: "entries",
  sourceConfig: {
    contentTypeId: "type-post",
    includeDrafts: false,
  },
  filters: [{ field: "status", op: "eq", value: "published" }],
  sort: [{ field: "publishedAt", dir: "desc" }],
  pagination: { limit: 12, offset: 0 },
  fields: ["id", "slug", "title"],
});

test("listingQuerySchema accepts valid payload", () => {
  expect(() => validate(listingQuerySchema, buildValidQuery())).not.toThrow();
});

test("listingQuerySchema rejects unsupported operators", () => {
  const query = buildValidQuery();
  query.filters = [{ field: "title", op: "invalid-op", value: "hello" }];
  expect(() => validate(listingQuerySchema, query)).toThrow("Invalid payload");
});

test("listingQuerySchema rejects pagination limit above hard cap", () => {
  const query = buildValidQuery();
  query.pagination.limit = 101;
  expect(() => validate(listingQuerySchema, query)).toThrow("Invalid payload");
});

test("listingQuerySchema rejects filter budget overflow", () => {
  const query = buildValidQuery();
  query.filters = Array.from({ length: 21 }, (_, index) => ({
    field: `field_${index}`,
    op: "eq",
    value: `${index}`,
  }));
  expect(() => validate(listingQuerySchema, query)).toThrow("Invalid payload");
});

test("listingQuerySchema rejects duplicate selected fields", () => {
  const query = buildValidQuery();
  query.fields = ["id", "id", "slug"];
  expect(() => validate(listingQuerySchema, query)).toThrow("Invalid payload");
});

test("listingQueryCreateSchema accepts payload with nested query", () => {
  const payload = {
    name: "Homepage cards",
    description: "List of promoted entries",
    query: buildValidQuery(),
  };
  expect(() => validate(listingQueryCreateSchema, payload)).not.toThrow();
});

test("listingQueryUpdateSchema requires at least one property", () => {
  expect(() => validate(listingQueryUpdateSchema, {})).toThrow("Invalid payload");
});

test("listingTemplateCreateSchema accepts minimal payload", () => {
  expect(() =>
    validate(listingTemplateCreateSchema, {
      name: "Cards",
      layout: "grid",
      config: {},
    })
  ).not.toThrow();
});

test("listingTemplateUpdateSchema requires at least one property", () => {
  expect(() => validate(listingTemplateUpdateSchema, {})).toThrow("Invalid payload");
});
