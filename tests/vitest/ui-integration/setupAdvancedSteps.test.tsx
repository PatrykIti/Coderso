// @vitest-environment happy-dom
//
// TASK-482-07-L01: the optional Advanced-track adapter steps (email / storage /
// security / assistant). Each is a thin adapter over an EXISTING dedicated
// settings surface; the underlying clients are mocked so these cases do not need
// a live endpoint. They assert the four contract behaviours: masked-secret
// display (never plaintext), empty-secret = no-op (the secret key is OMITTED, so
// a configured value is never cleared), the correct endpoint per step, and
// domain validation-error surfacing.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";

const getEmailSettings = vi.fn();
const updateEmailSettings = vi.fn();
const getStorageSettings = vi.fn();
const updateStorageSettings = vi.fn();
const getSecuritySettings = vi.fn();
const updateSecuritySettings = vi.fn();
const updateSettings = vi.fn();
const getSettingsCached = vi.fn();

vi.mock("@/services/emailClient", () => ({
  getEmailSettings: () => getEmailSettings(),
  updateEmailSettings: (payload: unknown) => updateEmailSettings(payload),
}));

vi.mock("@/services/settingsClient", () => ({
  getStorageSettings: () => getStorageSettings(),
  updateStorageSettings: (payload: unknown) => updateStorageSettings(payload),
  getSecuritySettings: () => getSecuritySettings(),
  updateSecuritySettings: (payload: unknown) => updateSecuritySettings(payload),
  updateSettings: (payload: unknown) => updateSettings(payload),
  getSettingsCached: () => getSettingsCached(),
}));

// Stub the heavy AssistantSettingsCard: expose the real default values shape and
// a minimal control that flips `assistantEnabled` via the same `onChange` seam.
vi.mock("@/ui/settings/AssistantSettingsCard", () => ({
  ASSISTANT_SETTINGS_DEFAULT_VALUES: {
    assistantEnabled: false,
    assistantLauncherAvatarEnabled: false,
    assistantLauncherAvatarAsset: "",
    assistantDefaultMode: "docs-only",
    assistantDocsReindexOnBoot: false,
    assistantLlmEnabled: false,
    assistantLlmProvider: "none",
    assistantLlmModel: "google/gemma",
    assistantLlmMaxInputTokens: 8192,
    assistantLlmMaxOutputTokens: 2048,
    assistantLlmTimeoutMs: 20000,
    assistantQuotaRequestsPerMinute: 20,
    assistantQuotaRequestsPerDay: 1000,
  },
  AssistantSettingsCard: ({
    values,
    onChange,
  }: {
    values: { assistantEnabled: boolean };
    onChange?: (patch: { assistantEnabled: boolean }) => void;
  }) => (
    <button
      type="button"
      aria-label="toggle-assistant"
      onClick={() => onChange?.({ assistantEnabled: !values.assistantEnabled })}
    >
      assistant-enabled:{String(values.assistantEnabled)}
    </button>
  ),
}));

// Deterministic Switch in happy-dom.
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
    disabled,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
    disabled?: boolean;
    id?: string;
  }) => (
    <input
      type="checkbox"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

const { EmailStep } = await import("../../../core/admin/ui/setup/steps/advanced/EmailStep");
const { StorageStep } = await import("../../../core/admin/ui/setup/steps/advanced/StorageStep");
const { SecurityStep } = await import("../../../core/admin/ui/setup/steps/advanced/SecurityStep");
const { AssistantStep } = await import("../../../core/admin/ui/setup/steps/advanced/AssistantStep");

type WizardValues = import("../../../core/admin/ui/setup/wizardSteps").WizardValues;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseValues = {
  siteName: "Coderso",
  siteLocale: "en",
  publicBaseUrl: "",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  siteTimezone: "UTC",
  adminBaseUrl: "",
  logoId: null,
} as WizardValues;

const emailResponse = {
  provider: "smtp",
  smtp: {
    host: "smtp.example.com",
    port: 587,
    secure: true,
    user: "postmaster@example.com",
    password: { configured: true },
  },
  resend: { integrationId: "resend", apiKey: { configured: false }, status: "disconnected" },
  from: { name: "Coderso", email: "hello@example.com" },
  status: { provider: "smtp", configured: true },
};

const storageResponse = {
  driver: "s3",
  local: { dir: null },
  publicBaseUrl: "https://cdn.example.com",
  maxSizeBytes: null,
  allowedMime: null,
  delivery: { accessMode: "public" },
  s3: {
    bucket: "media",
    region: "us-east-1",
    endpoint: "https://s3.amazonaws.com",
    accessKey: { configured: true },
    secretKey: { configured: true },
  },
  azure: {
    container: null,
    account: null,
    key: { configured: false },
    connectionString: { configured: false },
  },
};

const securityResponse = {
  session: { ttlDays: 7, maxPerUser: 5, singleSession: false },
};

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

const setInput = (id: string, value: string) => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) throw new Error(`missing input: ${id}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const noop = () => undefined;

beforeEach(() => {
  getEmailSettings.mockResolvedValue(emailResponse);
  updateEmailSettings.mockResolvedValue(emailResponse);
  getStorageSettings.mockResolvedValue(storageResponse);
  updateStorageSettings.mockResolvedValue(storageResponse);
  getSecuritySettings.mockResolvedValue(securityResponse);
  updateSecuritySettings.mockResolvedValue(securityResponse);
  updateSettings.mockResolvedValue({});
  getSettingsCached.mockResolvedValue({ "assistant.enabled": false });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("EmailStep masks a configured password and omits it when left blank on save", async () => {
  const { container, cleanup } = mount(<EmailStep values={baseValues} onPatch={noop} />);
  try {
    await flush();
    const password = document.getElementById("setup-email-password") as HTMLInputElement;
    // Masked: the input is empty, the stored secret is never rendered.
    expect(password.value).toBe("");
    expect(password.type).toBe("password");
    expect(container.textContent).toContain("Leave blank to keep the current password");

    clickButton("Save");
    await flush();

    expect(updateEmailSettings).toHaveBeenCalledTimes(1);
    const payload = updateEmailSettings.mock.calls[0][0] as { smtp: Record<string, unknown> };
    // Empty-secret = no-op: the password key is dropped, never sent as "".
    expect("password" in payload.smtp).toBe(false);
  } finally {
    cleanup();
  }
});

test("EmailStep forwards a replacement password only when the operator typed one", async () => {
  const { cleanup } = mount(<EmailStep values={baseValues} onPatch={noop} />);
  try {
    await flush();
    setInput("setup-email-password", "new-secret");
    clickButton("Save");
    await flush();

    const payload = updateEmailSettings.mock.calls[0][0] as { smtp: { password?: string } };
    expect(payload.smtp.password).toBe("new-secret");
  } finally {
    cleanup();
  }
});

test("EmailStep surfaces the domain validation error from the endpoint", async () => {
  updateEmailSettings.mockRejectedValueOnce(
    new ApiClientError("settings_value_invalid", "Invalid email settings", 400)
  );
  const { container, cleanup } = mount(<EmailStep values={baseValues} onPatch={noop} />);
  try {
    await flush();
    clickButton("Save");
    await flush();
    expect(container.textContent).toContain("Invalid email settings");
  } finally {
    cleanup();
  }
});

test("StorageStep hits PATCH /settings/storage and omits untouched S3 secrets", async () => {
  const { container, cleanup } = mount(<StorageStep values={baseValues} onPatch={noop} />);
  try {
    await flush();
    // Masked secrets: the access/secret key inputs are blank with a keep-current hint.
    expect((document.getElementById("setup-storage-s3-access-key") as HTMLInputElement).value).toBe(
      ""
    );
    expect(container.textContent).toContain("Leave blank to keep the current secret");

    clickButton("Save");
    await flush();

    expect(updateStorageSettings).toHaveBeenCalledTimes(1);
    expect(updateEmailSettings).not.toHaveBeenCalled();
    const payload = updateStorageSettings.mock.calls[0][0] as { s3: Record<string, unknown> };
    expect("accessKey" in payload.s3).toBe(false);
    expect("secretKey" in payload.s3).toBe(false);
  } finally {
    cleanup();
  }
});

test("SecurityStep writes the canonical auth TTLs and session policy, never security.session.ttlDays", async () => {
  const { container, cleanup } = mount(<SecurityStep values={baseValues} onPatch={noop} />);
  try {
    await flush();

    // Effective TTL uses the shared resolver: auth.sessionTtlDays (14) wins over
    // the legacy security.session.ttlDays (7).
    expect(container.textContent).toContain("Effective session TTL: 14 days");

    clickButton("Save");
    await flush();

    expect(updateSettings).toHaveBeenCalledTimes(1);
    const bulk = updateSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(bulk["auth.sessionTtlDays"]).toBe(14);
    expect(bulk["auth.resetTtlMinutes"]).toBe(60);
    // The single-canonical rule: the wizard NEVER writes the legacy key.
    expect("security.session.ttlDays" in bulk).toBe(false);

    expect(updateSecuritySettings).toHaveBeenCalledTimes(1);
    const security = updateSecuritySettings.mock.calls[0][0] as {
      session: Record<string, unknown>;
    };
    expect("ttlDays" in security.session).toBe(false);
    expect(security.session.singleSession).toBe(false);
  } finally {
    cleanup();
  }
});

test("SecurityStep blocks save while the TTL input is out of range", async () => {
  const invalidValues = { ...baseValues, authSessionTtlDays: "9999" } as WizardValues;
  const { cleanup } = mount(<SecurityStep values={invalidValues} onPatch={noop} />);
  try {
    await flush();
    const save = findButton("Save");
    expect(save?.disabled).toBe(true);
    expect(updateSettings).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("AssistantStep loads assistant settings and saves assistant.* via bulk PATCH /settings", async () => {
  const { cleanup } = mount(<AssistantStep values={baseValues} onPatch={noop} />);
  try {
    await flush();
    expect(getSettingsCached).toHaveBeenCalledTimes(1);

    clickButton("Save");
    await flush();

    expect(updateSettings).toHaveBeenCalledTimes(1);
    const payload = updateSettings.mock.calls[0][0] as Record<string, unknown>;
    expect("assistant.enabled" in payload).toBe(true);
    // No secret keys among assistant.* — provider API keys live in Integrations.
    expect(Object.keys(payload).every((key) => key.startsWith("assistant."))).toBe(true);
  } finally {
    cleanup();
  }
});
