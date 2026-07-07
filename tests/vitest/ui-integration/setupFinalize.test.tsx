// @vitest-environment happy-dom
//
// TASK-482-08-L01: finishing the multi-track wizard finalizes setup. The
// "Finish setup" control on the last step invokes AdminApp's `completeSetup`,
// which issues ONE bulk `PATCH /settings` carrying the Basic-track values (via
// the 05-L02 `toBasicSettingsPayload` map) plus the `setup.completed: true`
// install-lock flag. Once the settings state reflects `setupCompleted: true`,
// `shouldShowSetupWizard` returns false and the wizard unmounts permanently. A
// failed finalize keeps the wizard open with the error banner. The settings
// client is mocked so this does not depend on a live endpoint.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCachedSettings: vi.fn<() => Record<string, unknown> | null>(),
  getSettingsCached: vi.fn<() => Promise<Record<string, unknown>>>(),
  updateSettings: vi.fn<(payload: Record<string, unknown>) => Promise<Record<string, unknown>>>(),
  resolveAuthBootstrap: vi.fn(),
  getInstallStatus: vi.fn(),
}));

vi.mock("@/services/authClient", () => ({
  canAdmin: (permission: string, snapshot: { permissions?: string[] } | null | undefined) =>
    Boolean(snapshot?.permissions?.includes("*") || snapshot?.permissions?.includes(permission)),
  resolveAuthBootstrap: mocks.resolveAuthBootstrap,
}));

vi.mock("@/services/installClient", () => ({
  getInstallStatus: mocks.getInstallStatus,
  createInstallAdmin: vi.fn(),
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: mocks.getCachedSettings,
  getSettings: mocks.getSettingsCached,
  getSettingsCached: mocks.getSettingsCached,
  getSecuritySettings: vi.fn(async () => ({})),
  getStorageSettings: vi.fn(async () => ({})),
  updateSettings: mocks.updateSettings,
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

// Deterministic track toggle in happy-dom (mirrors setup-wizard.test.tsx).
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={ariaLabel}
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

import { AdminApp } from "../../../core/admin/app/AdminApp";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

// `completeSetup` re-throws on failure (repo convention, matching the other
// AdminApp save handlers); the wizard invokes it via `void onSubmit(...)`, so
// the expected finalize rejection surfaces as an unhandled rejection even though
// it is already rendered in the error banner. Swallow ONLY that specific
// expected reason so it does not fail the run — anything else still propagates.
const isExpectedFinalizeRejection = (reason: unknown) =>
  Boolean(reason) &&
  typeof reason === "object" &&
  (reason as { code?: unknown }).code === "settings_value_invalid";

const onWindowRejection = (event: PromiseRejectionEvent) => {
  if (isExpectedFinalizeRejection(event.reason)) event.preventDefault();
};
// Vitest surfaces unhandled rejections via the Node process too; consume the
// expected finalize reason there and re-surface anything unexpected so real
// rejections in this file still fail loudly.
const onProcessRejection = (reason: unknown) => {
  if (isExpectedFinalizeRejection(reason)) return;
  throw reason;
};

beforeAll(() => {
  window.addEventListener("unhandledrejection", onWindowRejection);
  process.on("unhandledRejection", onProcessRejection);
});
afterAll(() => {
  window.removeEventListener("unhandledrejection", onWindowRejection);
  process.off("unhandledRejection", onProcessRejection);
});

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

const findButton = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.body.querySelectorAll("button")).find((button) => {
    const text = button.textContent?.replace(/\s+/g, " ").trim();
    return text === label || button.getAttribute("aria-label") === label;
  }) as HTMLButtonElement | undefined;

const clickButton = (label: string) => {
  const button = findButton(label);
  if (!button) throw new Error(`missing button: ${label}`);
  React.act(() => {
    button.click();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: vi.fn(), pathname: "/admin/pages" },
  });
  mocks.resolveAuthBootstrap.mockResolvedValue(AUTHENTICATED);
  mocks.getInstallStatus.mockResolvedValue({ available: false });
  mocks.getCachedSettings.mockReturnValue(null);
  // Setup not yet completed → the post-login wizard renders.
  mocks.getSettingsCached.mockResolvedValue({
    "site.name": "Coderso",
    "site.locale": "en",
    "setup.completed": false,
  });
  mocks.updateSettings.mockResolvedValue({});
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Finish issues one bulk PATCH with the Basic keys + setup.completed:true, then the wizard unmounts", async () => {
  // The finalize response flips setup.completed → true so the wizard closes.
  mocks.updateSettings.mockResolvedValue({
    "site.name": "Coderso",
    "site.locale": "en",
    "setup.completed": true,
  });
  const container = mount();
  await flush();

  // The post-login wizard is showing.
  expect(container.textContent).toContain("Set up Coderso");

  // Jump to the last Basic step via the rail, then finalize.
  clickButton("Starter content");
  clickButton("Finish setup");
  await flush();

  expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
  expect(mocks.updateSettings).toHaveBeenCalledWith({
    "site.name": "Coderso",
    "site.locale": "en",
    "site.timezone": "UTC",
    "site.publicBaseUrl": null,
    "site.adminBaseUrl": null,
    "setup.completed": true,
  });

  // Wizard has unmounted permanently (setupCompleted is now true).
  expect(container.textContent).not.toContain("Set up Coderso");
});

test("a failed finalize keeps the wizard open with the error banner", async () => {
  mocks.updateSettings.mockRejectedValueOnce(
    new ApiClientError("settings_value_invalid", "Invalid setting value", 400)
  );
  const container = mount();
  await flush();

  expect(container.textContent).toContain("Set up Coderso");

  clickButton("Starter content");
  clickButton("Finish setup");
  await flush();

  expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
  // Setup was NOT marked complete → the wizard stays open with the error banner.
  expect(container.textContent).toContain("Set up Coderso");
  expect(container.textContent).toContain("Setup error");
  expect(container.textContent).toContain("Invalid setting value");
});
