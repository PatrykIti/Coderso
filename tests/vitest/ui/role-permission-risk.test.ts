import { expect, test } from "vitest";

import {
  classifyRolePermissionChange,
  hasFullAccessPermissionSet,
  hasHighRiskPermissions,
  isHighRiskPermission,
} from "../../../core/admin/ui/roles/rolePermissionRisk";

const allPermissions = ["content:read", "content:write", "roles:read", "roles:write"];

test("role permission risk helper flags privileged scopes", () => {
  expect(isHighRiskPermission("*")).toBe(true);
  expect(isHighRiskPermission("users:write")).toBe(true);
  expect(isHighRiskPermission("roles:*")).toBe(true);
  expect(isHighRiskPermission("sessions:write")).toBe(true);
  expect(isHighRiskPermission("api-keys:write")).toBe(true);
  expect(isHighRiskPermission("plugins:manage")).toBe(true);
  expect(isHighRiskPermission("content:read")).toBe(false);
  expect(isHighRiskPermission("dashboard:write")).toBe(false);
});

test("role permission risk helper detects high-risk permission sets", () => {
  expect(hasHighRiskPermissions(["content:read", "roles:write"])).toBe(true);
  expect(hasHighRiskPermissions(["content:read", "media:read"])).toBe(false);
});

test("role permission risk helper detects full-access sets", () => {
  expect(hasFullAccessPermissionSet(["*"], allPermissions)).toBe(true);
  expect(hasFullAccessPermissionSet([...allPermissions], allPermissions)).toBe(true);
  expect(hasFullAccessPermissionSet(["content:read", "roles:read"], allPermissions)).toBe(false);
  expect(hasFullAccessPermissionSet([], [])).toBe(false);
});

test("role permission risk helper classifies only new high-risk grants", () => {
  expect(
    classifyRolePermissionChange({
      beforePermissions: ["content:read"],
      nextPermissions: ["content:read", "roles:write"],
      allPermissionIds: allPermissions,
    })
  ).toEqual({
    requiresConfirmation: true,
    fullAccess: false,
    fullAccessPromotion: false,
    addedHighRiskPermissions: ["roles:write"],
  });

  expect(
    classifyRolePermissionChange({
      beforePermissions: ["*"],
      nextPermissions: [...allPermissions],
      allPermissionIds: allPermissions,
    })
  ).toEqual({
    requiresConfirmation: false,
    fullAccess: true,
    fullAccessPromotion: false,
    addedHighRiskPermissions: [],
  });

  expect(
    classifyRolePermissionChange({
      beforePermissions: ["content:read"],
      nextPermissions: ["roles:read"],
      allPermissionIds: allPermissions,
    }).requiresConfirmation
  ).toBe(false);
});
