import { expect, test } from "vitest";

import { resolveContentTypeIdFromPath } from "../../../core/admin/ui/content-types/pathResolvers";

test("resolveContentTypeIdFromPath handles legacy route", () => {
  expect(resolveContentTypeIdFromPath("/admin/content-types/type-1")).toBe("type-1");
});

test("resolveContentTypeIdFromPath handles advanced canonical routes", () => {
  expect(resolveContentTypeIdFromPath("/admin/advanced/engine/type-1")).toBe("type-1");
  expect(resolveContentTypeIdFromPath("/admin/advanced/engine/type-1/schema")).toBe("type-1");
});

test("resolveContentTypeIdFromPath handles legacy coderso aliases", () => {
  expect(resolveContentTypeIdFromPath("/admin/coderso/engine/type-1")).toBe("type-1");
});

test("resolveContentTypeIdFromPath returns null for unrelated paths", () => {
  expect(resolveContentTypeIdFromPath("/admin/advanced/forms/form-1")).toBeNull();
  expect(resolveContentTypeIdFromPath("/admin/pages/page-1")).toBeNull();
});

test("resolveContentTypeIdFromPath survives malformed percent-encoding", () => {
  // decodeURIComponent throws on invalid sequences; the resolver must fall back to the raw segment.
  expect(resolveContentTypeIdFromPath("/admin/advanced/engine/%zz-1")).toBe("%zz-1");
  expect(resolveContentTypeIdFromPath("/admin/content-types/%zz")).toBe("%zz");
});
