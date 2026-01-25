import { expect, test } from "bun:test";
import { hasPermission, mergePermissions } from "../../../core/services/auth/roleService";

test("mergePermissions merges unique values", () => {
  const merged = mergePermissions([
    ["content:read", "content:write"],
    ["content:write", "users:read"],
  ]);

  expect(merged).toEqual(
    expect.arrayContaining(["content:read", "content:write", "users:read"])
  );
});

test("hasPermission respects wildcard", () => {
  expect(hasPermission(["*"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:write")).toBe(false);
});
