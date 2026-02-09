import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminApp, shouldShowSetupWizard } from "../../../core/admin/app/AdminApp";

test("AdminApp renders theme tokens during loading state", () => {
  const html = renderToString(<AdminApp path="/admin/pages" />);
  expect(html).toContain("nextless-theme-tokens");
  expect(html).toContain("Loading...");
});

test("shouldShowSetupWizard returns true only for authenticated protected ready state", () => {
  expect(
    shouldShowSetupWizard({
      isProtected: true,
      authState: "authenticated",
      settingsStatus: "ready",
      setupCompleted: false,
    })
  ).toBe(true);
  expect(
    shouldShowSetupWizard({
      isProtected: true,
      authState: "checking",
      settingsStatus: "ready",
      setupCompleted: false,
    })
  ).toBe(false);
  expect(
    shouldShowSetupWizard({
      isProtected: true,
      authState: "authenticated",
      settingsStatus: "loading",
      setupCompleted: false,
    })
  ).toBe(false);
  expect(
    shouldShowSetupWizard({
      isProtected: false,
      authState: "authenticated",
      settingsStatus: "ready",
      setupCompleted: false,
    })
  ).toBe(false);
  expect(
    shouldShowSetupWizard({
      isProtected: true,
      authState: "authenticated",
      settingsStatus: "ready",
      setupCompleted: true,
    })
  ).toBe(false);
});
