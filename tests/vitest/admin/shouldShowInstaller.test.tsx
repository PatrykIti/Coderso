// @vitest-environment happy-dom

import { expect, test } from "vitest";

import { shouldShowInstaller } from "../../../core/admin/app/AdminApp";

const base = {
  isAdminPath: true as boolean,
  installState: "available" as "checking" | "available" | "disabled",
  authState: "unauthenticated" as "checking" | "authenticated" | "unauthenticated",
};

test("shows the installer only for an available install on an admin path when not authenticated", () => {
  expect(shouldShowInstaller({ ...base })).toBe(true);
  // Still pre-login while auth is checking.
  expect(shouldShowInstaller({ ...base, authState: "checking" })).toBe(true);
});

test("hides the installer for every non-available install state", () => {
  expect(shouldShowInstaller({ ...base, installState: "checking" })).toBe(false);
  expect(shouldShowInstaller({ ...base, installState: "disabled" })).toBe(false);
});

test("hides the installer for an authenticated visitor (edge)", () => {
  expect(shouldShowInstaller({ ...base, authState: "authenticated" })).toBe(false);
});

test("hides the installer off admin paths", () => {
  expect(shouldShowInstaller({ ...base, isAdminPath: false })).toBe(false);
});
