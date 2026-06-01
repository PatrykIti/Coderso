import { expect, test } from "vitest";

import { ApiError } from "../../../core/server/errorHandler";
import { accessLogQuerySchema } from "../../../core/server/validation/accessLogSchemas";
import {
  adminCursorQueryParamSchema,
  adminDateTimeQueryParamSchema,
  adminLimitQueryParamSchema,
  adminQueryTextParamSchema,
} from "../../../core/server/validation/adminQuerySchemas";
import { auditLogQuerySchema } from "../../../core/server/validation/auditSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

test("auditLogQuerySchema rejects unknown and malformed query params", () => {
  expect(() =>
    validate(auditLogQuerySchema, {
      limit: "50",
      q: "auth",
      category: "authentication",
      severity: "warning",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
      cursor: "cursor-1",
    })
  ).not.toThrow();
  expect(() => validate(auditLogQuerySchema, {})).not.toThrow();

  expect(() => validate(auditLogQuerySchema, { limit: "0" })).toThrow(ApiError);
  expect(() => validate(auditLogQuerySchema, { category: "billing" })).toThrow(ApiError);
  expect(() => validate(auditLogQuerySchema, { severity: "critical" })).toThrow(ApiError);
  expect(() => validate(auditLogQuerySchema, { from: "2026-06-01" })).toThrow(ApiError);
  expect(() => validate(auditLogQuerySchema, { page: "2" })).toThrow(ApiError);
});

test("accessLogQuerySchema validates raw URL query strings strictly", () => {
  expect(() =>
    validate(accessLogQuerySchema, {
      limit: "100",
      status: "failed",
      q: "login",
      userId: "user-1",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-02T00:00:00.000Z",
    })
  ).not.toThrow();

  expect(() => validate(accessLogQuerySchema, { limit: "abc" })).toThrow(ApiError);
  expect(() => validate(accessLogQuerySchema, { status: "pending" })).toThrow(ApiError);
  expect(() => validate(accessLogQuerySchema, { from: "2026-06-01" })).toThrow(ApiError);
  expect(() => validate(accessLogQuerySchema, { unknown: "1" })).toThrow(ApiError);
});

test("shared admin query schema fragments keep log routes consistent", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      limit: adminLimitQueryParamSchema,
      cursor: adminCursorQueryParamSchema,
      from: adminDateTimeQueryParamSchema,
      q: adminQueryTextParamSchema,
    },
  };

  expect(() =>
    validate(schema, {
      limit: "500",
      cursor: "cursor-1",
      from: "2026-06-01T00:00:00.000Z",
      q: "login",
    })
  ).not.toThrow();
  expect(() => validate(schema, { limit: "0" })).toThrow(ApiError);
  expect(() => validate(schema, { cursor: "" })).toThrow(ApiError);
});
