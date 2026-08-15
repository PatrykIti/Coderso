// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import type { SecuritySettingsResponse } from "../../../core/admin/services/settingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const securitySettingsResponse = (): SecuritySettingsResponse => ({
  requestId: { enabled: true, headerName: "x-request-id" },
  csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
  cors: {
    allowedOrigins: [],
    allowCredentials: true,
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-csrf-token"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 60, maxRequests: 10 },
      admin_read: { windowSeconds: 60, maxRequests: 600 },
      admin_write: { windowSeconds: 60, maxRequests: 120 },
      public_read: { windowSeconds: 60, maxRequests: 300 },
      public_write: { windowSeconds: 60, maxRequests: 30 },
      assistant: { windowSeconds: 60, maxRequests: 30 },
    },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: "no-referrer",
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: { rejectUnknownFields: true },
  plugins: { safeMode: false },
  session: { ttlDays: 7, maxPerUser: 3, singleSession: false },
  loginAlerts: {
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
    recipients: [],
    webhookUrl: null,
    webhookSecret: { configured: false },
    deliveryError: null,
  },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: { configured: false },
    thresholds: {
      login: 0.5,
      reset: 0.6,
      publicWrite: 0.5,
    },
    enforceOnLocalhost: true,
  },
  passwordPepperConfigured: false,
});

const runtimeSettingsResponse = () => ({
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
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
      document.body.innerHTML = "";
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForAutoSaveDelay = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const clickButton = async (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const installSecurityFetch = () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return new Response(JSON.stringify({ token: "csrf-token" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/settings/security")) {
      return new Response(JSON.stringify(securitySettingsResponse()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/settings")) {
      return new Response(JSON.stringify(runtimeSettingsResponse()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
      resetCsrfToken();
    },
  };
};

test("SecuritySettingsPage renders sections and cards", () => {
  const html = renderAdminUi(<SecuritySettingsPage />);

  expect(html).toContain("Auth protection");
  expect(html).toContain("Rate limits");
  expect(html).toContain("CSRF");
  expect(html).toContain("CORS");
  expect(html).toContain("Security headers");
  expect(html).toContain("Sessions");
  expect(html).toContain("IP allowlist");
  expect(html).toContain("Sign-in protection");
  expect(html).toContain("Auto-save settings across all screens");
});

test("SecuritySettingsPage requires typed review before risky policy saves", async () => {
  resetCsrfToken();
  const fetchMock = installSecurityFetch();
  window.localStorage.setItem("coderso.settings.autosave", "true");

  try {
    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/security">
        <SecuritySettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();

    const authMaxInput = view.container.querySelector("#auth-max") as HTMLInputElement | null;
    if (!authMaxInput) throw new Error("missing auth max input");
    React.act(() => {
      setInputValue(authMaxInput, "11");
    });
    await flushEffects();

    await clickButton("Save changes");
    expect(document.body.textContent).toContain("Review security policy changes");
    expect(document.body.textContent).toContain("Rate limit policy");
    expect(fetchMock.calls.filter((call) => call.init?.method === "PATCH")).toHaveLength(0);

    const typedInput = document.body.querySelector("#confirm-action-typed-value");
    if (!(typedInput instanceof HTMLInputElement)) {
      throw new Error("missing typed confirmation input");
    }
    React.act(() => {
      setInputValue(typedInput, "APPLY");
    });
    await clickButton("Apply security changes");
    await flushEffects();

    const securityPatch = fetchMock.calls.find(
      (call) => String(call.input).endsWith("/settings/security") && call.init?.method === "PATCH"
    );
    expect(securityPatch).toBeDefined();
    expect(JSON.parse(String(securityPatch?.init?.body))).toMatchObject({
      rateLimit: {
        buckets: {
          auth: { maxRequests: 11 },
        },
      },
    });
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
      )
    ).toHaveLength(1);
    await waitForAutoSaveDelay();
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings/security") && call.init?.method === "PATCH"
      )
    ).toHaveLength(1);
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
      )
    ).toHaveLength(1);
    view.cleanup();
  } finally {
    window.localStorage.removeItem("coderso.settings.autosave");
    fetchMock.restore();
  }
});
