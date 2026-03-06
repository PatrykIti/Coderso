import { expect, test } from "vitest";

import { resolveContentTypeIdFromPath } from "../../../core/admin/ui/content-types/pathResolvers";

test("resolveContentTypeIdFromPath handles legacy route", () => {
  expect(resolveContentTypeIdFromPath("/admin/content-types/type-1")).toBe(
    "type-1"
  );
});

test("resolveContentTypeIdFromPath handles coderso canonical routes", () => {
  expect(resolveContentTypeIdFromPath("/admin/coderso/engine/type-1")).toBe(
    "type-1"
  );
  expect(
    resolveContentTypeIdFromPath("/admin/coderso/engine/type-1/schema")
  ).toBe("type-1");
});

test("resolveContentTypeIdFromPath returns null for unrelated paths", () => {
  expect(resolveContentTypeIdFromPath("/admin/coderso/forms/form-1")).toBeNull();
  expect(resolveContentTypeIdFromPath("/admin/pages/page-1")).toBeNull();
});
