// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getInstallStatus: vi.fn(),
  createInstallAdmin: vi.fn(),
  resolveAuthBootstrap: vi.fn(),
}));

vi.mock("@/services/authClient", () => ({
  canAdmin: (permission: string, snapshot: { permissions?: string[] } | null | undefined) =>
    Boolean(snapshot?.permissions?.includes("*") || snapshot?.permissions?.includes(permission)),
  resolveAuthBootstrap: mocks.resolveAuthBootstrap,
}));

vi.mock("@/services/installClient", () => ({
  getInstallStatus: mocks.getInstallStatus,
  createInstallAdmin: mocks.createInstallAdmin,
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: vi.fn(() => null),
  getSettings: vi.fn(async () => ({ "setup.completed": true })),
  getSettingsCached: vi.fn(async () => ({ "setup.completed": true })),
  getSecuritySettings: vi.fn(async () => ({})),
  getStorageSettings: vi.fn(async () => ({})),
  updateSettings: vi.fn(async () => ({})),
  updateSecuritySettings: vi.fn(async () => ({})),
  updateStorageSettings: vi.fn(async () => ({})),
}));

vi.mock("@/services/adminThemeClient", () => ({
  listAdminThemeProfilesCached: vi.fn(async () => []),
  listAdminThemeTemplatesCached: vi.fn(async () => []),
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-admin-toaster="true">Admin toaster</div>,
}));

import { AdminApp } from "../../../core/admin/app/AdminApp";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const UNAUTHENTICATED = { state: "unauthenticated" as const, user: null };
const AUTHENTICATED = {
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
};

let assignSpy: ReturnType<typeof vi.fn>;
let cleanup: (() => void) | null = null;

const mount = (path = "/admin/pages") => {
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
  cleanup = () => {
    React.act(() => root.unmount());
    container.remove();
  };
  return container;
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  assignSpy = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: assignSpy, pathname: "/admin/pages" },
  });
  mocks.resolveAuthBootstrap.mockResolvedValue(UNAUTHENTICATED);
  mocks.getInstallStatus.mockResolvedValue({ available: false });
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

test("fresh install renders the installer and does not bounce to /login", async () => {
  mocks.getInstallStatus.mockResolvedValue({ available: true });
  mocks.resolveAuthBootstrap.mockResolvedValue(UNAUTHENTICATED);
  const container = mount();

  await flush();

  expect(container.textContent).toContain("Create your admin account");
  expect(assignSpy).not.toHaveBeenCalled();
});

test("auth resolving unauthenticated while status is still checking does not bounce (race guard)", async () => {
  let resolveStatus!: (value: { available: boolean }) => void;
  mocks.getInstallStatus.mockImplementation(
    () => new Promise<{ available: boolean }>((resolve) => (resolveStatus = resolve))
  );
  mocks.resolveAuthBootstrap.mockResolvedValue(UNAUTHENTICATED);
  const container = mount();

  // Auth has resolved unauthenticated but status is still pending → no redirect.
  await flush();
  expect(assignSpy).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Loading");

  // Status finally resolves available → installer renders, still no redirect.
  await React.act(async () => {
    resolveStatus({ available: true });
    await Promise.resolve();
  });
  await flush();
  expect(assignSpy).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Create your admin account");
});

test("disabled install redirects unauthenticated visitors to /login", async () => {
  mocks.getInstallStatus.mockResolvedValue({ available: false });
  mocks.resolveAuthBootstrap.mockResolvedValue(UNAUTHENTICATED);
  const container = mount();

  await flush();

  expect(container.textContent).not.toContain("Create your admin account");
  expect(assignSpy).toHaveBeenCalled();
  expect(String(assignSpy.mock.calls[0]?.[0])).toContain("/login");
});

test("a failed status fetch falls closed to the /login redirect", async () => {
  mocks.getInstallStatus.mockRejectedValue(new Error("network"));
  mocks.resolveAuthBootstrap.mockResolvedValue(UNAUTHENTICATED);
  const container = mount();

  await flush();

  expect(container.textContent).not.toContain("Create your admin account");
  expect(assignSpy).toHaveBeenCalled();
  expect(String(assignSpy.mock.calls[0]?.[0])).toContain("/login");
});

test("an authenticated visitor never sees the installer even when available (edge)", async () => {
  mocks.getInstallStatus.mockResolvedValue({ available: true });
  mocks.resolveAuthBootstrap.mockResolvedValue(AUTHENTICATED);
  const container = mount();

  await flush();

  expect(container.textContent).not.toContain("Create your admin account");
});
