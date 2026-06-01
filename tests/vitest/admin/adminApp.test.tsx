// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

const adminAuthState = vi.hoisted(() => ({
  bootstrap: {
    state: "authenticated" as const,
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      permissionSnapshot: {
        permissions: ["*"],
        roles: [{ id: "role-1", slug: "admin", name: "Admin" }],
      },
    },
  },
}));
const adminAppServiceMocks = vi.hoisted(() => ({
  getSettings: vi.fn(async () => ({
    "setup.completed": true,
  })),
  updateSettings: vi.fn(async () => ({})),
  listAdminThemeProfilesCached: vi.fn(async () => []),
  listAdminThemeTemplatesCached: vi.fn(async () => []),
}));

vi.mock("@/services/authClient", () => ({
  canAdmin: (permission: string, snapshot: { permissions?: string[] } | null | undefined) =>
    Boolean(snapshot?.permissions?.includes("*") || snapshot?.permissions?.includes(permission)),
  resolveAuthBootstrap: vi.fn(() => Promise.resolve(adminAuthState.bootstrap)),
}));

vi.mock("@/services/settingsClient", () => ({
  getSettings: adminAppServiceMocks.getSettings,
  updateSettings: adminAppServiceMocks.updateSettings,
}));

vi.mock("@/services/adminThemeClient", () => ({
  listAdminThemeProfilesCached: adminAppServiceMocks.listAdminThemeProfilesCached,
  listAdminThemeTemplatesCached: adminAppServiceMocks.listAdminThemeTemplatesCached,
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

vi.mock("@/ui/content-types/DetailTemplateEditorPage", () => ({
  DetailTemplateEditorPage: () => <div>Detail template editor route</div>,
}));

vi.mock("@/ui/users/UsersRolesPage", () => ({
  UsersRolesPage: ({ permissions = [] }: { permissions?: string[] }) => (
    <div>Users route {permissions.join("|")}</div>
  ),
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

beforeEach(() => {
  vi.clearAllMocks();
  adminAuthState.bootstrap = {
    state: "authenticated",
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      permissionSnapshot: {
        permissions: ["*"],
        roles: [{ id: "role-1", slug: "admin", name: "Admin" }],
      },
    },
  };
});

test("AdminApp renders theme tokens during loading state", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/pages">
      <AdminApp path="/admin/pages" />
    </AdminRouterProvider>
  );
  expect(html).toContain("coderso-theme-tokens");
  expect(html).toContain("Loading...");
});

test("AdminApp denies guarded routes when the permission snapshot is missing the route permission", async () => {
  adminAuthState.bootstrap = {
    state: "authenticated",
    user: {
      id: "restricted-1",
      email: "restricted@example.com",
      name: "Restricted",
      permissionSnapshot: {
        permissions: ["settings:read"],
        roles: [{ id: "role-2", slug: "settings-reader", name: "Settings Reader" }],
      },
    },
  };
  const view = mount("/admin/users");

  try {
    await flush();
    expect(view.container.textContent).toContain("Access denied");
    expect(view.container.textContent).toContain(
      "Your account does not have permission to open this admin area."
    );
  } finally {
    view.cleanup();
  }
});

test("AdminApp allows the Users route when the user only has roles:read", async () => {
  adminAuthState.bootstrap = {
    state: "authenticated",
    user: {
      id: "roles-reader-1",
      email: "roles-reader@example.com",
      name: "Roles Reader",
      permissionSnapshot: {
        permissions: ["roles:read"],
        roles: [{ id: "role-3", slug: "roles-reader", name: "Roles Reader" }],
      },
    },
  };
  const view = mount("/admin/users");

  try {
    await flush();
    expect(view.container.textContent).toContain("Users route roles:read");
    expect(view.container.textContent).not.toContain("Access denied");
    expect(adminAppServiceMocks.getSettings).not.toHaveBeenCalled();
    expect(adminAppServiceMocks.listAdminThemeProfilesCached).not.toHaveBeenCalled();
    expect(adminAppServiceMocks.listAdminThemeTemplatesCached).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
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

test("AdminApp resolves detail template editor under the collection workspace route family", async () => {
  const view = mount("/admin/advanced/engine/ct-1/collection/detail-template/detail-1");

  try {
    await flush();
    expect(view.container.textContent).toContain("Detail template editor route");
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
