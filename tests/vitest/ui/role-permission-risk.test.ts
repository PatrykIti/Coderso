import { expect, test } from "vitest";

import {
  hasHighRiskPermissions,
  isHighRiskPermission,
} from "../../../core/admin/ui/roles/rolePermissionRisk";

test("role permission risk helper flags privileged scopes", () => {
  expect(isHighRiskPermission("*")).toBe(true);
  expect(isHighRiskPermission("users:write")).toBe(true);
  expect(isHighRiskPermission("roles:*")).toBe(true);
  expect(isHighRiskPermission("sessions:write")).toBe(true);
  expect(isHighRiskPermission("api-keys:write")).toBe(true);
  expect(isHighRiskPermission("plugins:manage")).toBe(true);
  expect(isHighRiskPermission("content:read")).toBe(false);
});

test("role permission risk helper detects high-risk permission sets", () => {
  expect(hasHighRiskPermissions(["content:read", "roles:write"])).toBe(true);
  expect(hasHighRiskPermissions(["content:read", "media:read"])).toBe(false);
});
