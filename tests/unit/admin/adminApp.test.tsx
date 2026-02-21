import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  AdminApp,
  resolveThemeUpdatedRefreshScope,
  shouldShowSetupWizard,
} from "../../../core/admin/app/AdminApp";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("AdminApp renders theme tokens during loading state", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/pages">
      <AdminApp path="/admin/pages" />
    </AdminRouterProvider>
  );
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

test("resolveThemeUpdatedRefreshScope refreshes only admin theme", () => {
  expect(resolveThemeUpdatedRefreshScope()).toEqual({
    refreshSettings: false,
    refreshTheme: true,
  });
});
