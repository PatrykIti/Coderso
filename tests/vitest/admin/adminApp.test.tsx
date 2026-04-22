// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/services/authClient", () => ({
  resolveAuthBootstrap: vi.fn().mockResolvedValue({ state: "authenticated" }),
}));

vi.mock("@/services/settingsClient", () => ({
  getSettings: vi.fn().mockResolvedValue({
    "setup.completed": true,
  }),
  updateSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/adminThemeClient", () => ({
  listAdminThemeProfilesCached: vi.fn().mockResolvedValue([]),
  listAdminThemeTemplatesCached: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div>Admin toaster</div>,
}));

vi.mock("@/ui/menus/MenuListPage", () => ({
  MenuListPage: () => <div>Menus List Route</div>,
}));

vi.mock("@/ui/menus/MenuEditorPage", () => ({
  MenuEditorPage: () => <div>Menu Editor Route</div>,
}));

import {
  AdminApp,
  resolveThemeUpdatedRefreshScope,
  shouldShowSetupWizard,
} from "../../../core/admin/app/AdminApp";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <AdminApp path={path} />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("AdminApp renders theme tokens during loading state", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/pages">
      <AdminApp path="/admin/pages" />
    </AdminRouterProvider>
  );
  expect(html).toContain("nextless-theme-tokens");
  expect(html).toContain("Loading...");
});

test("AdminApp resolves /menus to the menus list route", async () => {
  const view = mount("/admin/menus");

  try {
    await flush();
    expect(view.container.textContent).toContain("Menus List Route");
  } finally {
    view.cleanup();
  }
});

test("AdminApp resolves /menus/:id to the menu editor route", async () => {
  const view = mount("/admin/menus/menu-1");

  try {
    await flush();
    expect(view.container.textContent).toContain("Menu Editor Route");
  } finally {
    view.cleanup();
  }
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
