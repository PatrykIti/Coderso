import { expect, test } from "bun:test";

import {
  injectAdminBaseHref,
  normalizeAdminAssetPath,
} from "../../../core/server/httpServer";

test("injectAdminBaseHref inserts base href for admin path", () => {
  const html = "<!doctype html><html><head><title>Admin</title></head><body></body></html>";
  const next = injectAdminBaseHref(html, "/admin");

  expect(next).toContain('<base href="/admin/" />');
});

test("injectAdminBaseHref does not duplicate existing base href", () => {
  const html =
    '<!doctype html><html><head><base href="/admin/" /><title>Admin</title></head><body></body></html>';
  const next = injectAdminBaseHref(html, "/admin");

  const baseMatches = next.match(/<base\s+href=/g) ?? [];
  expect(baseMatches.length).toBe(1);
});

test("normalizeAdminAssetPath accepts direct admin assets path", () => {
  const result = normalizeAdminAssetPath("/admin/assets/index.css", "/admin");
  expect(result).toBe("/admin/assets/index.css");
});

test("normalizeAdminAssetPath rewrites nested assets path under admin routes", () => {
  const result = normalizeAdminAssetPath(
    "/admin/widgets/templates/assets/index.css",
    "/admin"
  );
  expect(result).toBe("/admin/assets/index.css");
});

test("normalizeAdminAssetPath returns null for non-admin paths", () => {
  const result = normalizeAdminAssetPath("/site/assets/index.css", "/admin");
  expect(result).toBeNull();
});
