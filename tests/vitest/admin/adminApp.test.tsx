// @vitest-environment happy-dom

import React from "react";
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
  Toaster: ({
    containerAriaLabel,
    closeButton,
    duration,
    position,
    richColors,
  }: {
    containerAriaLabel?: string;
    closeButton?: boolean;
    duration?: number;
    position?: string;
    richColors?: boolean;
  }) => (
    <div
      data-admin-toaster="true"
      data-container-aria-label={containerAriaLabel}
      data-close-button={String(Boolean(closeButton))}
      data-duration={String(duration)}
      data-position={position}
      data-rich-colors={String(Boolean(richColors))}
    >
      Admin toaster
    </div>
  ),
}));

vi.mock("@/ui/menus/MenuListPage", () => ({
  MenuListPage: () => <div>Menus List Route</div>,
}));

vi.mock("@/ui/menus/MenuEditorPage", () => ({
  MenuEditorPage: () => <div>Menu Editor Route</div>,
}));

vi.mock("@/ui/content-types/CollectionWorkspacePage", () => ({
  CollectionWorkspacePage: () => <div>Collection workspace ct-1</div>,
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

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <AdminApp path={path} />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
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
  expect(html).toContain("coderso-theme-tokens");
  expect(html).toContain("Loading...");
});

test("AdminApp resolves /menus to the menus list route", async () => {
  const view = mount("/admin/menus");

  try {
    await flush();
    expect(view.container.textContent).toContain("Menus List Route");
    const toasters = view.container.querySelectorAll("[data-admin-toaster='true']");
    expect(toasters).toHaveLength(1);
    expect(toasters[0]?.getAttribute("data-container-aria-label")).toBe("Admin notifications");
    expect(toasters[0]?.getAttribute("data-close-button")).toBe("true");
    expect(toasters[0]?.getAttribute("data-duration")).toBe("4000");
    expect(toasters[0]?.getAttribute("data-position")).toBe("top-right");
    expect(toasters[0]?.getAttribute("data-rich-colors")).toBe("true");
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

test("AdminApp resolves collection workspace under the Engine route family", async () => {
  const view = mount("/admin/advanced/engine/ct-1/collection");

  try {
    await flush();
    expect(view.container.textContent).toContain("Collection workspace");
    expect(view.container.textContent).toContain("ct-1");
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
