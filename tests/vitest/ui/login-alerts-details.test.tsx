// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { SecuritySettingsResponse } from "../../../core/admin/services/settingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const securitySettings = (
  loginAlerts: Partial<SecuritySettingsResponse["loginAlerts"]> = {}
): SecuritySettingsResponse => ({
  requestId: { enabled: true, headerName: "X-Request-Id" },
  csrf: { enabled: true, headerName: "X-CSRF-Token", tokenTtlMinutes: 60 },
  cors: {
    allowedOrigins: ["http://localhost:3000"],
    allowCredentials: true,
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 900, maxRequests: 10 },
      admin_read: { windowSeconds: 60, maxRequests: 300 },
      admin_write: { windowSeconds: 60, maxRequests: 120 },
      public_read: { windowSeconds: 60, maxRequests: 300 },
      public_write: { windowSeconds: 60, maxRequests: 30 },
      assistant: { windowSeconds: 60, maxRequests: 60 },
    },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: { rejectUnknownFields: true },
  plugins: { safeMode: false },
  session: { ttlDays: 7, maxPerUser: 5, singleSession: false },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: { configured: false },
    thresholds: { login: 0.5, reset: 0.5, publicWrite: 0.5 },
    enforceOnLocalhost: false,
  },
  passwordPepperConfigured: false,
  loginAlerts: {
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
    recipients: [],
    webhookUrl: null,
    webhookSecret: { configured: false },
    deliveryError: null,
    ...loginAlerts,
  },
});

const loginAlertState = vi.hoisted(() => ({
  getSecuritySettings: vi.fn(),
  updateSecuritySettings: vi.fn(),
  reset() {
    this.getSecuritySettings.mockReset();
    this.updateSecuritySettings.mockReset();
    this.getSecuritySettings.mockResolvedValue(securitySettings());
    this.updateSecuritySettings.mockResolvedValue(securitySettings());
  },
}));

vi.mock("@/services/settingsClient", () => ({
  getSecuritySettings: loginAlertState.getSecuritySettings,
  updateSecuritySettings: loginAlertState.updateSecuritySettings,
}));

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => React.act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  React.act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

async function clickButton(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function toggleSwitch(index: number) {
  const switches = Array.from(document.body.querySelectorAll('[role="switch"]'));
  const target = switches[index];
  if (!(target instanceof HTMLElement)) throw new Error(`missing switch: ${index}`);
  await React.act(async () => {
    target.click();
    await Promise.resolve();
  });
}

beforeEach(() => {
  loginAlertState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const renderPage = () =>
  mount(
    <AdminRouterProvider initialPath="/admin/settings/security/login-alerts">
      <LoginAlertsPage />
    </AdminRouterProvider>
  );

test("LoginAlertsPage shows the API error message on load failure", async () => {
  loginAlertState.getSecuritySettings.mockRejectedValue(
    new ApiClientError("down", "login_alerts_down", 503)
  );
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("login_alerts_down");
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage falls back to a generic load error", async () => {
  loginAlertState.getSecuritySettings.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("Failed to load login alert settings.");
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage surfaces API and generic save failures", async () => {
  loginAlertState.updateSecuritySettings.mockRejectedValue(
    new ApiClientError("bad", "save_down", 400)
  );
  const view = renderPage();
  try {
    await flush();
    await toggleSwitch(1);
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("save_down");
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage falls back to a generic save failure", async () => {
  loginAlertState.updateSecuritySettings.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await toggleSwitch(1);
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("Failed to update login alert settings.");
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage discards unsaved changes through the Discard button", async () => {
  const view = renderPage();
  try {
    await flush();
    const deviceSwitch = Array.from(document.body.querySelectorAll('[role="switch"]'))[1];
    const initial = deviceSwitch?.getAttribute("data-state");
    await toggleSwitch(1);
    const changed = Array.from(document.body.querySelectorAll('[role="switch"]'))[1]?.getAttribute(
      "data-state"
    );
    expect(changed).not.toBe(initial);
    await clickButton("Discard");
    await flush();
    const restored = Array.from(document.body.querySelectorAll('[role="switch"]'))[1]?.getAttribute(
      "data-state"
    );
    expect(restored).toBe(initial);
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage updates every wired toggle and saves the combination", async () => {
  const view = renderPage();
  try {
    await flush();
    await toggleSwitch(2);
    const emailSwitch = document.body.querySelector<HTMLElement>(
      '[role="switch"][aria-label="Email login alerts channel"]'
    );
    if (!emailSwitch) throw new Error("missing email channel switch");
    await React.act(async () => {
      emailSwitch.click();
      await Promise.resolve();
    });
    await toggleSwitch(0);
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("Login alert settings updated.");
    expect(loginAlertState.updateSecuritySettings).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("LoginAlertsPage confirms a successful save", async () => {
  const view = renderPage();
  try {
    await flush();
    await toggleSwitch(1);
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("Login alert settings updated.");
  } finally {
    view.cleanup();
  }
});
