// @vitest-environment happy-dom
//
// TASK-492-01-L31: Login alert recipients + webhook delivery settings UI.
// Proves the wired controls persist: recipients list, webhook channel toggle,
// webhook URL + write-only secret, read-only deliveryError status, and that
// the brute-force/admin-only placeholders remain no-ops.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SecuritySettingsResponse } from "../../../core/admin/services/settingsClient";
import * as settingsClient from "../../../core/admin/services/settingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: { configured: false },
    thresholds: { login: 0.5, reset: 0.5, publicWrite: 0.5 },
    enforceOnLocalhost: false,
  },
  passwordPepperConfigured: true,
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (element instanceof HTMLInputElement) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return;
  }
  if (element instanceof HTMLTextAreaElement) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
};

const findByLabel = <T extends HTMLElement>(label: string) =>
  document.body.querySelector<T>(`[aria-label="${label}"]`);

const clickByLabel = async (label: string) => {
  const element = findByLabel<HTMLElement>(label);
  if (!element) throw new Error(`missing control: ${label}`);
  await React.act(async () => {
    element.click();
    await Promise.resolve();
  });
};

const clickSave = async () => {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) => {
    const text = item.textContent?.replace(/\s+/g, " ").trim();
    return text === "Save changes";
  }) as HTMLButtonElement | undefined;
  if (!button) throw new Error("missing save button");
  await React.act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("save sends parsed recipients, webhook URL and secret, then rehydrates", async () => {
  vi.spyOn(settingsClient, "getSecuritySettings").mockResolvedValue(
    securitySettings({ recipients: ["security@example.com"] })
  );
  const updateSpy = vi.spyOn(settingsClient, "updateSecuritySettings").mockResolvedValue(
    securitySettings({
      recipients: ["security@example.com", "ops@example.com", "other@example.com"],
      webhookUrl: "https://hooks.example.com/login",
      webhookSecret: { configured: true },
    })
  );

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/login-alerts">
      <LoginAlertsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    const recipients = findByLabel<HTMLTextAreaElement>("Custom email list recipients");
    if (!recipients) throw new Error("missing recipients textarea");
    setInputValue(recipients, "security@example.com\nops@example.com, other@example.com");

    await clickByLabel("Webhook login alerts channel");
    const urlInput = findByLabel<HTMLInputElement>("Webhook URL");
    if (!urlInput) throw new Error("missing webhook URL input");
    setInputValue(urlInput, "https://hooks.example.com/login");

    const secretInput = findByLabel<HTMLInputElement>("Webhook secret");
    if (!secretInput) throw new Error("missing webhook secret input");
    setInputValue(secretInput, "whsec_test_secret");

    await clickSave();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.mock.calls[0][0].loginAlerts;
    expect(payload?.recipients).toEqual([
      "security@example.com",
      "ops@example.com",
      "other@example.com",
    ]);
    expect(payload?.webhookUrl).toBe("https://hooks.example.com/login");
    expect(payload?.webhookSecret).toBe("whsec_test_secret");

    // Rehydrated from the server response: recipients back in the textarea, the
    // write-only secret input reset to empty.
    expect((recipients as HTMLTextAreaElement).value).toBe(
      "security@example.com\nops@example.com\nother@example.com"
    );
    const resetSecret = findByLabel<HTMLInputElement>("Webhook secret");
    expect(resetSecret?.value).toBe("");
  } finally {
    view.cleanup();
  }
});

test("webhook secret is write-only: Configured badge, raw secret never in DOM", async () => {
  vi.spyOn(settingsClient, "getSecuritySettings").mockResolvedValue(
    securitySettings({
      webhookUrl: "https://hooks.example.com/login",
      webhookSecret: { configured: true },
    })
  );

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/login-alerts">
      <LoginAlertsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    expect(document.body.textContent).toContain("Configured");
    const secretInput = findByLabel<HTMLInputElement>("Webhook secret");
    if (!secretInput) throw new Error("missing webhook secret input");
    expect(secretInput.type).toBe("password");
    expect(secretInput.value).toBe("");
    expect(document.body.textContent).not.toContain("whsec_raw");
  } finally {
    view.cleanup();
  }
});

test("deliveryError renders as read-only status text when present", async () => {
  vi.spyOn(settingsClient, "getSecuritySettings").mockResolvedValue(
    securitySettings({
      webhookUrl: "https://hooks.example.com/login",
      webhookSecret: { configured: true },
      deliveryError: "webhook_http_502",
    })
  );

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/login-alerts">
      <LoginAlertsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    expect(document.body.textContent).toContain("Last delivery error: webhook_http_502");
    // Read-only: the error is never an editable value or a payload field.
    const editable = document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    );
    for (const element of editable) {
      expect(element.value).not.toContain("webhook_http_502");
    }
  } finally {
    view.cleanup();
  }
});

test("webhook toggle off clears the URL from the save payload", async () => {
  vi.spyOn(settingsClient, "getSecuritySettings").mockResolvedValue(
    securitySettings({
      webhookUrl: "https://hooks.example.com/login",
      webhookSecret: { configured: true },
    })
  );
  const updateSpy = vi
    .spyOn(settingsClient, "updateSecuritySettings")
    .mockResolvedValue(securitySettings({ webhookUrl: null, webhookSecret: { configured: true } }));

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/login-alerts">
      <LoginAlertsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    await clickByLabel("Webhook login alerts channel");
    await clickSave();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.mock.calls[0][0].loginAlerts;
    expect(payload?.webhookUrl).toBeNull();
    expect(payload).not.toHaveProperty("webhookSecret");
  } finally {
    view.cleanup();
  }
});

test("wired controls are enabled; placeholders stay no-ops", () => {
  const html = renderAdminUi(<LoginAlertsPage />, {
    path: "/admin/settings/security/login-alerts",
  });

  // Wired controls lost their no-op attributes.
  expect(html).not.toContain('data-no-op-control="settings-login-alerts-email-channel"');
  expect(html).not.toContain('data-no-op-control="settings-login-alerts-webhook-channel"');
  expect(html).not.toContain('data-no-op-control="settings-login-alerts-custom-recipients"');
  expect(html).toContain('aria-label="Custom email list recipients"');
  expect(html).toContain('aria-label="Email login alerts channel"');
  expect(html).toContain('aria-label="Webhook login alerts channel"');

  // Out-of-scope placeholders remain untouched.
  expect(html).toContain('data-no-op-control="settings-login-alerts-brute-force-threshold"');
  expect(html).toContain('data-no-op-control="settings-login-alerts-admin-only"');
  expect(html).toContain('data-no-op-control="settings-login-alerts-sticky-save"');
});
