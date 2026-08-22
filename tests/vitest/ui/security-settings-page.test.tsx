// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { SecuritySettingsResponse } from "../../../core/admin/services/settingsClient";
import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiError = (message: string) => Object.assign(new Error(message), { isApiError: true });

const settingsState = vi.hoisted(() => {
  const makeSecuritySettings = (): SecuritySettingsResponse => ({
    requestId: { enabled: true, headerName: "x-request-id" },
    csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
    cors: {
      allowedOrigins: ["https://admin.example.com"],
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
      recipients: ["security@example.com"],
      webhookUrl: null,
      webhookSecret: { configured: false },
      deliveryError: null,
    },
    botProtection: {
      enabled: false,
      provider: "recaptcha_v3",
      siteKey: null,
      secretKey: { configured: true },
      thresholds: { login: 0.5, reset: 0.6, publicWrite: 0.5 },
      enforceOnLocalhost: true,
    },
    passwordPepperConfigured: true,
  });
  const state = {
    securitySettings: makeSecuritySettings(),
    runtimeSettings: { "auth.sessionTtlDays": 14, "auth.resetTtlMinutes": 60 },
    getSecuritySettings: vi.fn(),
    getSettings: vi.fn(),
    updateSecuritySettings: vi.fn(),
    updateSettings: vi.fn(),
    listIpAllowlist: vi.fn(),
    addIpAllowlistEntry: vi.fn(),
    removeIpAllowlistEntry: vi.fn(),
    reset() {
      state.securitySettings = makeSecuritySettings();
      state.getSecuritySettings.mockReset();
      state.getSettings.mockReset();
      state.updateSecuritySettings.mockReset();
      state.updateSettings.mockReset();
      state.listIpAllowlist.mockReset();
      state.addIpAllowlistEntry.mockReset();
      state.removeIpAllowlistEntry.mockReset();
      state.getSecuritySettings.mockResolvedValue(state.securitySettings);
      state.getSettings.mockResolvedValue(state.runtimeSettings);
      state.updateSecuritySettings.mockResolvedValue(state.securitySettings);
      state.updateSettings.mockResolvedValue(state.runtimeSettings);
      state.listIpAllowlist.mockResolvedValue([
        {
          id: "allow-1",
          cidr: "198.51.100.0/24",
          label: "Office",
          description: "Office network",
          createdAt: "2026-06-01T10:00:00.000Z",
        },
      ]);
      state.addIpAllowlistEntry.mockResolvedValue({ ok: true });
      state.removeIpAllowlistEntry.mockResolvedValue({ ok: true });
    },
  };
  return state;
});

vi.mock("@/services/settingsClient", () => ({
  getSecuritySettings: settingsState.getSecuritySettings,
  getSettings: settingsState.getSettings,
  updateSecuritySettings: settingsState.updateSecuritySettings,
  updateSettings: settingsState.updateSettings,
}));

vi.mock("@/services/ipAllowlistClient", () => ({
  listIpAllowlist: settingsState.listIpAllowlist,
  addIpAllowlistEntry: settingsState.addIpAllowlistEntry,
  removeIpAllowlistEntry: settingsState.removeIpAllowlistEntry,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "isApiError" in error),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="select"
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("../../../core/admin/ui/settings/IpAllowlistDrawer", () => ({
  IpAllowlistDrawer: ({
    trigger,
    onSubmit,
    error,
  }: {
    trigger: React.ReactNode;
    onSubmit?: (payload: { cidr: string; label?: string; description?: string }) => void;
    error?: string | null;
  }) => (
    <section>
      {trigger}
      <button type="button" onClick={() => onSubmit?.({ cidr: "203.0.113.0/24", label: "VPN" })}>
        submit-allow-entry
      </button>
      {error ? <span>{`drawer-error:${error}`}</span> : null}
    </section>
  ),
}));

vi.mock("../../../core/admin/ui/settings/IpAllowlistTable", () => ({
  IpAllowlistTable: ({
    entries,
    isLoading,
    onRemove,
  }: {
    entries: Array<{ id: string; cidr: string; label?: string }>;
    isLoading: boolean;
    onRemove?: (id: string) => void;
  }) => (
    <section>
      <span>{isLoading ? "allowlist-loading" : `allowlist:${entries.length}`}</span>
      {entries.map((entry) => (
        <div key={entry.id}>
          <span>{entry.cidr}</span>
          <button type="button" onClick={() => onRemove?.(entry.id)}>
            {`remove-${entry.id}`}
          </button>
        </div>
      ))}
    </section>
  ),
}));

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
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForAutoSaveDelay = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
};

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const setSelectValue = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
};

const findByText = (text: string) =>
  Array.from(document.body.querySelectorAll("button, a, span, p, div, label")).find((item) =>
    item.textContent?.includes(text)
  );

const clickButton = async (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

const openSection = async (label: string) => {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (item) =>
      normalize(item.textContent).startsWith(label) &&
      normalize(item.textContent).length < label.length + 80
  );
  if (!button) throw new Error(`missing section button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

const inputById = (id: string) => {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error(`missing input: ${id}`);
  }
  return element;
};

const typeInto = async (id: string, value: string) => {
  React.act(() => {
    setInputValue(inputById(id), value);
  });
  await flushEffects();
};

const toggleByRole = async (role: string, index = 0) => {
  const controls = Array.from(document.body.querySelectorAll(`[role="${role}"]`));
  const control = controls[index];
  if (!control) throw new Error(`missing [role=${role}] at index ${index}`);
  await React.act(async () => {
    (control as HTMLElement).click();
    await Promise.resolve();
  });
};

const submitTypedReview = async (typedValue: string) => {
  await typeInto("confirm-action-typed-value", typedValue);
  await clickButton("Apply security changes");
  await flushEffects();
};

beforeEach(() => {
  window.localStorage.setItem("coderso.settings.autosave", "false");
  settingsState.reset();
});

afterEach(() => {
  window.localStorage.removeItem("coderso.settings.autosave");
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("SecuritySettingsPage renders sections and loads values", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("Auth protection");
    expect(view.container.textContent).toContain("Rate limits");
    expect(view.container.textContent).toContain("CSRF");
    expect(view.container.textContent).toContain("CORS");
    expect(view.container.textContent).toContain("Security headers");
    expect(view.container.textContent).toContain("Sessions");
    expect(view.container.textContent).toContain("IP allowlist");

    await flushEffects();
    expect(settingsState.getSecuritySettings).toHaveBeenCalled();
    expect(settingsState.getSettings).toHaveBeenCalled();
    expect(inputById("auth-window").value).toBe("60");
    expect(inputById("auth-max").value).toBe("10");
    expect(view.container.textContent).toContain("Enabled");
    expect(view.container.textContent).toContain("Pepper enabled");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage renders the load error state without crashing", async () => {
  settingsState.getSecuritySettings.mockRejectedValue(apiError("security load failed"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Settings error");
    expect(view.container.textContent).toContain("security load failed");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage renders the generic load error state", async () => {
  settingsState.getSecuritySettings.mockRejectedValue(new Error("boom"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load security settings.");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage disables controls while the initial load is pending", () => {
  let resolveLoad: (value: SecuritySettingsResponse) => void = () => undefined;
  settingsState.getSecuritySettings.mockImplementation(
    () =>
      new Promise<SecuritySettingsResponse>((resolve) => {
        resolveLoad = resolve;
      })
  );
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    const switchControls = Array.from(document.body.querySelectorAll('[role="switch"]'));
    expect(switchControls.length).toBeGreaterThan(0);
    for (const control of switchControls) {
      expect((control as HTMLButtonElement).disabled).toBe(true);
    }
    expect((inputById("auth-window") as HTMLInputElement).disabled).toBe(true);
    expect(inputById("auth-max").disabled).toBe(true);
  } finally {
    resolveLoad(settingsState.securitySettings);
    view.cleanup();
  }
});

test("SecuritySettingsPage auth section: bot protection toggles, scores, and secret clear", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Enable reCAPTCHA v3");

    await toggleByRole("switch", 0);
    await flushEffects();
    expect(inputById("bot-site-key").value).toBe("");

    await typeInto("bot-site-key", "6Lc-site-key");
    expect(inputById("bot-site-key").value).toBe("6Lc-site-key");

    await typeInto("bot-secret-key", "new-secret");
    await flushEffects();
    expect(document.body.textContent).toContain("Clear stored secret");

    await clickButton("Clear stored secret");
    await flushEffects();

    await typeInto("bot-login-score", "1.7");
    expect(document.body.textContent).toContain("Scores must stay between 0.0 and 1.0.");
    await typeInto("bot-login-score", "0.4");

    await toggleByRole("switch", 1);
    await flushEffects();

    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Review security policy changes");
    expect(document.body.textContent).toContain("Bot protection secrets and thresholds");

    await submitTypedReview("APPLY");
    expect(settingsState.updateSecuritySettings).toHaveBeenCalledTimes(1);
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    const botProtection = payload.botProtection as {
      enabled: boolean;
      siteKey: string | null;
      secretKey: string | null;
      thresholds: Record<string, number>;
    };
    expect(botProtection.enabled).toBe(true);
    expect(botProtection.siteKey).toBe("6Lc-site-key");
    expect(botProtection.secretKey).toBeNull();
    expect(botProtection.thresholds.login).toBe(0.4);
    expect(document.body.textContent).toContain("Security settings updated.");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage bot secret is sent when typed and not cleared", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await typeInto("bot-secret-key", "typed-secret");
    await typeInto("bot-site-key", "6Lc-new");
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Bot protection secrets and thresholds");
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      botProtection: { secretKey: string };
    };
    expect(payload.botProtection.secretKey).toBe("typed-secret");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage rate limit presets apply strict and ignore custom", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("Rate limits");
    expect(document.body.textContent).toContain("Smart presets");

    const select = document.querySelector('[data-testid="select"]') as HTMLSelectElement;
    React.act(() => {
      setSelectValue(select, "strict");
    });
    await flushEffects();
    expect(select.value).toBe("strict");
    expect(inputById("admin-read-max").value).toBe("180");
    expect(inputById("public-write-max").value).toBe("10");
    expect(inputById("assistant-max").value).toBe("10");

    await typeInto("admin-read-max", "999");
    expect(inputById("admin-read-max").value).toBe("999");

    React.act(() => {
      setSelectValue(select, "custom");
    });
    await flushEffects();
    expect(inputById("admin-read-max").value).toBe("999");

    await typeInto("admin-read-max", "600");
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Rate limit policy");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage rate limit validation blocks invalid numbers", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("Rate limits");
    await typeInto("admin-read-max", "abc");
    const invalidInput = inputById("admin-read-max");
    expect(invalidInput.getAttribute("aria-invalid")).toBe("true");
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save changes")
    );
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    await typeInto("admin-read-max", "600");
    await flushEffects();
    expect(inputById("admin-read-max").getAttribute("aria-invalid")).toBe("false");
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage csrf section toggles and validates", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("CSRF");
    await toggleByRole("switch", 0);
    await flushEffects();
    await typeInto("csrf-header", "");
    expect(document.body.textContent).toContain("Enter a header name and a positive TTL.");
    await typeInto("csrf-header", "x-csrf");
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("CSRF protection");
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      csrf: { enabled: boolean; headerName: string };
    };
    expect(payload.csrf.enabled).toBe(false);
    expect(payload.csrf.headerName).toBe("x-csrf");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage cors section edits and flags risk", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("CORS");
    expect(document.body.textContent).toContain("Trusted origins");
    await typeInto("cors-origins", "https://one.example.com, https://two.example.com");
    await typeInto("cors-methods", "GET, POST");
    await typeInto("cors-max-age", "1200");
    await toggleByRole("switch", 0);
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("CORS policy");
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      cors: { allowedOrigins: string[]; allowCredentials: boolean; maxAgeSeconds: number };
    };
    expect(payload.cors.allowedOrigins).toEqual([
      "https://one.example.com",
      "https://two.example.com",
    ]);
    expect(payload.cors.allowCredentials).toBe(false);
    expect(payload.cors.maxAgeSeconds).toBe(1200);
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage headers section edits frame options and policies", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("Security headers");
    await toggleByRole("switch", 0);
    await flushEffects();
    await toggleByRole("switch", 1);
    await flushEffects();
    const selects = Array.from(document.querySelectorAll('[data-testid="select"]'));
    const frameSelect = selects[0] as HTMLSelectElement;
    React.act(() => {
      setSelectValue(frameSelect, "SAMEORIGIN");
    });
    await flushEffects();
    await typeInto("referrer-policy", "strict-origin-when-cross-origin");
    await typeInto("csp", "default-src 'self'");
    await typeInto("hsts", "max-age=31536000");
    await typeInto("permissions-policy", "camera=()");
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Security headers");
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      headers: {
        enabled: boolean;
        frameOptions: string;
        referrerPolicy: string;
        csp: string;
        hsts: string;
        permissionsPolicy: string;
        contentTypeOptions: boolean;
      };
    };
    expect(payload.headers.enabled).toBe(false);
    expect(payload.headers.contentTypeOptions).toBe(false);
    expect(payload.headers.frameOptions).toBe("SAMEORIGIN");
    expect(payload.headers.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(payload.headers.csp).toBe("default-src 'self'");
    expect(payload.headers.hsts).toBe("max-age=31536000");
    expect(payload.headers.permissionsPolicy).toBe("camera=()");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage sessions section edits session and login alert settings", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("Sessions");
    await typeInto("session-ttl", "30");
    await typeInto("auth-session-ttl", "90");
    await typeInto("auth-reset-ttl", "120");
    await typeInto("session-max", "5");
    await toggleByRole("switch", 0);
    await flushEffects();
    await toggleByRole("switch", 1);
    await flushEffects();
    const checkboxes = Array.from(document.body.querySelectorAll('[role="checkbox"]'));
    await React.act(async () => {
      (checkboxes[0] as HTMLElement).click();
      await Promise.resolve();
    });
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Session and password reset policy");
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      session: { ttlDays: number; maxPerUser: number; singleSession: boolean };
      loginAlerts: { notifyOnNewDevice: boolean };
    };
    expect(payload.session.ttlDays).toBe(30);
    expect(payload.session.maxPerUser).toBe(5);
    expect(payload.session.singleSession).toBe(true);
    expect(payload.loginAlerts.notifyOnNewDevice).toBe(false);
    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      "auth.sessionTtlDays": 90,
      "auth.resetTtlMinutes": 120,
    });
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage saves without a risk review when nothing changed", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).not.toContain("Review security policy changes");
    expect(settingsState.updateSecuritySettings).toHaveBeenCalledTimes(1);
    expect(settingsState.updateSettings).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Security settings updated.");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage surfaces save errors for api and generic failures", async () => {
  settingsState.updateSecuritySettings.mockRejectedValueOnce(apiError("policy rejected"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Save failed");
    expect(document.body.textContent).toContain("policy rejected");

    settingsState.updateSecuritySettings.mockRejectedValueOnce(new Error("network down"));
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to save security settings.");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage autosave does not bypass the risky-change review", async () => {
  window.localStorage.setItem("coderso.settings.autosave", "true");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await typeInto("auth-max", "12");
    await waitForAutoSaveDelay();
    expect(settingsState.updateSecuritySettings).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Review security policy changes");
    expect(document.body.textContent).not.toContain("Security settings updated.");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage ip allowlist section wires add and remove", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await openSection("IP allowlist");
    expect(document.body.textContent).toContain("Access restrictions");
    await flushEffects();
    expect(document.body.textContent).toContain("allowlist:1");
    expect(document.body.textContent).toContain("198.51.100.0/24");

    await clickButton("submit-allow-entry");
    await flushEffects();
    expect(settingsState.addIpAllowlistEntry).toHaveBeenCalledWith({
      cidr: "203.0.113.0/24",
      label: "VPN",
    });

    await clickButton("remove-allow-1");
    await flushEffects();
    expect(settingsState.removeIpAllowlistEntry).toHaveBeenCalledWith("allow-1");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage quick links guard dirty navigation", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    const findLink = (label: string) => {
      const link = Array.from(document.body.querySelectorAll("a")).find((item) =>
        item.textContent?.includes(label)
      );
      if (!link) throw new Error(`missing quick link: ${label}`);
      return link;
    };

    // The vitest setup guards all anchor clicks by preventDefault, so the href
    // is removed here to let the quick-link guard observe real click modifiers.
    const ipAllowlistLink = findLink("IP allowlist");
    const sessionsLink = findLink("Active sessions");
    const originalHref = ipAllowlistLink.getAttribute("href");
    ipAllowlistLink.removeAttribute("href");
    sessionsLink.removeAttribute("href");
    try {
      // Clean state: the guard allows navigation without a dialog.
      const cleanEvent = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      await React.act(async () => {
        ipAllowlistLink.dispatchEvent(cleanEvent);
        await Promise.resolve();
      });
      expect(document.body.textContent).not.toContain("Discard unsaved settings?");

      // Dirty state: a plain click on a different sub-page is blocked by the
      // dirty-navigation dialog.
      await typeInto("auth-max", "12");
      await flushEffects();
      const dirtyEvent = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      await React.act(async () => {
        sessionsLink.dispatchEvent(dirtyEvent);
        await Promise.resolve();
      });
      expect(dirtyEvent.defaultPrevented).toBe(true);
      expect(document.body.textContent).toContain("Discard unsaved settings?");
      await clickButton("Keep editing");
      expect(document.body.textContent).not.toContain("Discard unsaved settings?");

      // Modified clicks return early before requesting navigation.
      const metaEvent = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
      await React.act(async () => {
        sessionsLink.dispatchEvent(metaEvent);
        await Promise.resolve();
      });
      expect(document.body.textContent).not.toContain("Discard unsaved settings?");

      const rightClick = new MouseEvent("click", { bubbles: true, cancelable: true, button: 2 });
      await React.act(async () => {
        sessionsLink.dispatchEvent(rightClick);
        await Promise.resolve();
      });
      expect(document.body.textContent).not.toContain("Discard unsaved settings?");

      // An already-prevented event is left untouched by the guard.
      const prePrevented = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      prePrevented.preventDefault();
      await React.act(async () => {
        sessionsLink.dispatchEvent(prePrevented);
        await Promise.resolve();
      });
      expect(document.body.textContent).not.toContain("Discard unsaved settings?");
    } finally {
      if (originalHref !== null) ipAllowlistLink.setAttribute("href", originalHref);
      sessionsLink.setAttribute("href", "/admin/settings/security/sessions");
    }
  } finally {
    view.cleanup();
  }
});

const mountSecurityPage = () =>
  mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SecuritySettingsPage />
    </AdminRouterProvider>
  );

test("SecuritySettingsPage auth section: reset and public thresholds flow to the payload", async () => {
  const view = mountSecurityPage();
  try {
    await flushEffects();
    await toggleByRole("switch", 0);
    await flushEffects();
    await typeInto("bot-reset-score", "0.65");
    await typeInto("bot-public-score", "0.45");
    await typeInto("auth-window", "120");
    await clickButton("Save changes");
    await flushEffects();
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      botProtection: { thresholds: Record<string, number> };
      rateLimit: { buckets: { auth: { windowSeconds: number } } };
    };
    expect(payload.botProtection.thresholds.reset).toBe(0.65);
    expect(payload.botProtection.thresholds.publicWrite).toBe(0.45);
    expect(payload.rateLimit.buckets.auth.windowSeconds).toBe(120);
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage rate limit custom fields flow to the payload", async () => {
  const view = mountSecurityPage();
  try {
    await flushEffects();
    await openSection("Rate limits");
    await toggleByRole("switch", 0);
    await flushEffects();
    await toggleByRole("switch", 0);
    await flushEffects();
    await typeInto("admin-read-window", "120");
    await typeInto("admin-write-max", "200");
    await typeInto("admin-write-window", "90");
    await typeInto("public-read-max", "500");
    await typeInto("public-read-window", "45");
    await typeInto("public-write-max", "60");
    await typeInto("public-write-window", "30");
    await typeInto("assistant-max", "40");
    await typeInto("assistant-window", "20");
    await clickButton("Save changes");
    await flushEffects();
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      rateLimit: { buckets: Record<string, { windowSeconds: number; maxRequests: number }> };
    };
    expect(payload.rateLimit.buckets.admin_read.windowSeconds).toBe(120);
    expect(payload.rateLimit.buckets.admin_write.maxRequests).toBe(200);
    expect(payload.rateLimit.buckets.public_write.maxRequests).toBe(60);
    expect(payload.rateLimit.buckets.assistant.windowSeconds).toBe(20);
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage csrf ttl and cors headers update the payload", async () => {
  const view = mountSecurityPage();
  try {
    await flushEffects();
    await openSection("CSRF");
    await typeInto("csrf-ttl", "45");
    await openSection("CORS");
    await typeInto("cors-headers", "content-type, x-csrf-token, accept");
    await clickButton("Save changes");
    await flushEffects();
    await submitTypedReview("APPLY");
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      csrf: { tokenTtlMinutes: number };
      cors: { allowedHeaders: string[] };
    };
    expect(payload.csrf.tokenTtlMinutes).toBe(45);
    expect(payload.cors.allowedHeaders).toContain("accept");
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage sessions section toggles the new-location alert", async () => {
  const view = mountSecurityPage();
  try {
    await flushEffects();
    await openSection("Sessions");
    const checkboxes = Array.from(document.body.querySelectorAll('[role="checkbox"]'));
    await React.act(async () => {
      (checkboxes[1] as HTMLElement).click();
      await Promise.resolve();
    });
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    const payload = settingsState.updateSecuritySettings.mock.calls[0][0] as {
      loginAlerts: { notifyOnNewLocation: boolean };
    };
    expect(payload.loginAlerts.notifyOnNewLocation).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("SecuritySettingsPage toggles the autosave checkbox", async () => {
  const view = mountSecurityPage();
  try {
    await flushEffects();
    const checkbox = document.body.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (!checkbox) throw new Error("missing autosave checkbox");
    await React.act(async () => {
      checkbox.click();
      await Promise.resolve();
    });
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});
