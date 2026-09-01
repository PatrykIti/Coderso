// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settingsState = vi.hoisted(() => ({
  security: {
    session: { ttlDays: 30, maxPerUser: 3, singleSession: false },
  } as unknown,
  securityError: null as unknown,
  email: {
    provider: "smtp",
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer",
      password: { configured: true },
    },
    resend: { status: "disconnected" },
    from: { name: "Coderso", email: "no-reply@example.com" },
  } as unknown,
  emailError: null as unknown,
  storage: {
    driver: "local",
    local: { dir: "uploads" },
    publicBaseUrl: "https://cdn.example.com",
    s3: { bucket: null, region: null, endpoint: null },
    azure: { container: null, account: null },
  } as unknown,
  storageError: null as unknown,
  assistantSettings: {
    "assistant.enabled": true,
    "assistant.defaultMode": "llm-guide",
    "assistant.docs.reindexOnBoot": true,
    "assistant.launcher.avatarEnabled": true,
    "assistant.launcher.avatarAsset": "  https://cdn.example.com/avatar.png  ",
    "assistant.llm.enabled": true,
    "assistant.llm.provider": "none",
    "assistant.llm.model": "claude-opus-4-8",
    "assistant.llm.maxInputTokens": 16000,
    "assistant.llm.maxOutputTokens": 4000,
    "assistant.llm.timeoutMs": 30000,
    "assistant.quotas.requestsPerMinute": 30,
    "assistant.quotas.requestsPerDay": 2000,
  } as unknown,
  assistantSettingsError: null as unknown,
  getSettingsCached: vi.fn(async () => {
    if (settingsState.assistantSettingsError) throw settingsState.assistantSettingsError;
    return settingsState.assistantSettings;
  }),
  updateSettings: vi.fn(async () => ({ ok: true })),
  updateSecuritySettings: vi.fn(async () => ({ ok: true })),
  updateEmailSettings: vi.fn(async () => ({ ok: true })),
  updateStorageSettings: vi.fn(async () => ({ ok: true })),
  reset() {
    settingsState.security = { session: { ttlDays: 30, maxPerUser: 3, singleSession: false } };
    settingsState.securityError = null;
    settingsState.email = {
      provider: "smtp",
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "mailer",
        password: { configured: true },
      },
      resend: { status: "disconnected" },
      from: { name: "Coderso", email: "no-reply@example.com" },
    };
    settingsState.emailError = null;
    settingsState.storage = {
      driver: "local",
      local: { dir: "uploads" },
      publicBaseUrl: "https://cdn.example.com",
      s3: { bucket: null, region: null, endpoint: null },
      azure: { container: null, account: null },
    };
    settingsState.storageError = null;
    settingsState.assistantSettings = {
      "assistant.enabled": true,
      "assistant.defaultMode": "llm-guide",
      "assistant.docs.reindexOnBoot": true,
      "assistant.launcher.avatarEnabled": true,
      "assistant.launcher.avatarAsset": "  https://cdn.example.com/avatar.png  ",
      "assistant.llm.enabled": true,
      "assistant.llm.provider": "none",
      "assistant.llm.model": "claude-opus-4-8",
      "assistant.llm.maxInputTokens": 16000,
      "assistant.llm.maxOutputTokens": 4000,
      "assistant.llm.timeoutMs": 30000,
      "assistant.quotas.requestsPerMinute": 30,
      "assistant.quotas.requestsPerDay": 2000,
    };
    settingsState.assistantSettingsError = null;
    settingsState.getSettingsCached.mockClear();
    for (const fn of [
      settingsState.updateSettings,
      settingsState.updateSecuritySettings,
      settingsState.updateEmailSettings,
      settingsState.updateStorageSettings,
    ]) {
      fn.mockClear();
    }
  },
}));

vi.mock("@/services/settingsClient", async () => {
  const actual = await import("../../../core/admin/services/settingsClient");
  return {
    ...actual,
    getSecuritySettings: vi.fn(async () => {
      if (settingsState.securityError) throw settingsState.securityError;
      return settingsState.security;
    }),
    updateSecuritySettings: settingsState.updateSecuritySettings,
    updateSettings: settingsState.updateSettings,
    getStorageSettings: vi.fn(async () => {
      if (settingsState.storageError) throw settingsState.storageError;
      return settingsState.storage;
    }),
    updateStorageSettings: settingsState.updateStorageSettings,
    getSettingsCached: settingsState.getSettingsCached,
  };
});

// The AssistantSettingsCard (composed by AssistantStep) renders two Radix
// Selects; a native <select> keeps the interactions deterministic in happy-dom
// while preserving the same value/onValueChange contract. Sibling suites
// (assistant-settings-page-details) follow the same pattern.
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      children?: React.ReactNode;
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
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock("@/services/emailClient", async () => {
  const actual = await import("../../../core/admin/services/emailClient");
  return {
    ...actual,
    getEmailSettings: vi.fn(async () => {
      if (settingsState.emailError) throw settingsState.emailError;
      return settingsState.email;
    }),
    updateEmailSettings: settingsState.updateEmailSettings,
  };
});

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { AdvancedStepShell } from "../../../core/admin/ui/setup/steps/advanced/AdvancedStepShell";
import { AssistantStep } from "../../../core/admin/ui/setup/steps/advanced/AssistantStep";
import { EmailStep } from "../../../core/admin/ui/setup/steps/advanced/EmailStep";
import { SecurityStep } from "../../../core/admin/ui/setup/steps/advanced/SecurityStep";
import { StorageStep } from "../../../core/admin/ui/setup/steps/advanced/StorageStep";

import type { WizardStepBodyProps } from "../../../core/admin/ui/setup/steps/stepTypes";

const BASE_VALUES = {
  siteName: "S",
  siteLocale: "en",
  publicBaseUrl: "",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  siteTimezone: "UTC",
  adminBaseUrl: "",
  logoId: null,
} as WizardStepBodyProps["values"];

const wizardProps = (overrides: Partial<WizardStepBodyProps> = {}): WizardStepBodyProps => ({
  values: { ...BASE_VALUES, ...(overrides.values ?? {}) },
  onPatch: overrides.onPatch ?? (() => undefined),
  disabled: false,
  ...overrides,
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
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

const setInputById = (container: HTMLElement, id: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("value setter unavailable");
  setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

// Drives a native <select data-testid="..."> (the select mock) through a real
// change event, mirroring how sibling suites drive Radix Select.
const setSelectByTestId = (container: HTMLElement, value: string) => {
  const select = container.querySelector<HTMLSelectElement>('select[data-testid="select"]');
  if (!select) throw new Error("missing select");
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (setter) setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

// Radix Collapsible trigger buttons carry long composed labels ("Advanced
// Token limits, quotas, timeout..."), so a containment match is required.
const clickButtonContaining = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button containing ${label}`);
  React.act(() => {
    button.click();
  });
};

// Locates a labeled input in the AssistantSettingsCard (labels sit in the same
// container as their input) and types through a native input event.
const setCardInput = (container: HTMLElement, labelText: string, value: string) => {
  const label = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent?.trim() === labelText
  );
  if (!label) throw new Error(`missing label ${labelText}`);
  const input = label.parentElement?.querySelector<HTMLInputElement>("input");
  if (!input) throw new Error(`missing input for ${labelText}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const cardInputValue = (container: HTMLElement, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent?.trim() === labelText
  );
  if (!label) throw new Error(`missing label ${labelText}`);
  const input = label.parentElement?.querySelector<HTMLInputElement>("input");
  if (!input) throw new Error(`missing input for ${labelText}`);
  return input.value;
};

// Radix Switch renders a <button role="switch">; a plain click toggles it.
const toggleSwitchAt = (container: HTMLElement, index: number) => {
  const switches = Array.from(container.querySelectorAll('[role="switch"]'));
  const target = switches[index];
  if (!target) throw new Error(`missing switch at ${index}`);
  React.act(() => {
    (target as HTMLElement).click();
  });
};

// Stateful wrapper for SecurityStep: onPatch merges into the wizard values the
// same way SetupWizard's reducer does, so edits to the TTL inputs are visible
// to the Save payload (and the effective-TTL summary).
function SecurityStepHarness({
  initial = {},
}: {
  initial?: Partial<WizardStepBodyProps["values"]>;
}) {
  const [values, setValues] = React.useState<WizardStepBodyProps["values"]>({
    ...BASE_VALUES,
    ...initial,
  });
  return (
    <SecurityStep
      values={values}
      onPatch={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
      disabled={false}
    />
  );
}

afterEach(() => {
  settingsState.reset();
  document.body.innerHTML = "";
});

describe("AdvancedStepShell", () => {
  it.each([
    ["loading", "Loading current settings…"],
    ["loadError", "Could not load settings"],
    ["saveError", "Could not save"],
    ["saved", "Saved."],
  ] as const)("renders the %s branch", (branch, expectedText) => {
    const props = {
      loading: false,
      loadError: null as string | null,
      saving: false,
      saveError: null as string | null,
      saved: false,
      onSave: () => undefined,
    };
    if (branch === "loading") Object.assign(props, { loading: true });
    if (branch === "loadError") Object.assign(props, { loadError: "settings unreachable" });
    if (branch === "saveError") Object.assign(props, { saveError: "rejected" });
    if (branch === "saved") Object.assign(props, { saved: true });

    const view = mount(<AdvancedStepShell {...props}>body</AdvancedStepShell>);
    expect(view.container.textContent).toContain(expectedText);
    view.unmount();
  });

  it("disables Save while saving or disabled and shows custom labels", () => {
    const onSave = vi.fn();
    const busy = mount(
      <AdvancedStepShell
        loading={false}
        loadError={null}
        saving
        saveError={null}
        saved={false}
        onSave={onSave}
      >
        body
      </AdvancedStepShell>
    );
    const savingButton = Array.from(busy.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Saving…"
    ) as HTMLButtonElement;
    expect(savingButton.disabled).toBe(true);
    busy.unmount();

    const disabledView = mount(
      <AdvancedStepShell
        loading={false}
        loadError={null}
        saving={false}
        saveError={null}
        saved={false}
        onSave={onSave}
        disabled
        saveLabel="Store"
        savedLabel="Stored!"
      >
        body
      </AdvancedStepShell>
    );
    const storeButton = Array.from(disabledView.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Store"
    ) as HTMLButtonElement;
    expect(storeButton.disabled).toBe(true);
    clickButtonWithText(disabledView.container, "Store");
    expect(onSave).not.toHaveBeenCalled();

    // enabled path invokes onSave and shows the custom saved label when set
    const enabled = mount(
      <AdvancedStepShell
        loading={false}
        loadError={null}
        saving={false}
        saveError={null}
        saved
        onSave={onSave}
        saveLabel="Store"
        savedLabel="Stored!"
      >
        body
      </AdvancedStepShell>
    );
    clickButtonWithText(enabled.container, "Store");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(enabled.container.textContent).toContain("Stored!");
    enabled.unmount();
    disabledView.unmount();
  });
});

describe("SecurityStep adapter", () => {
  it("loads masked policy, derives the effective TTL, and saves both writes", async () => {
    const onPatch = vi.fn();
    const view = mount(<SecurityStep {...wizardProps({ onPatch })} />);
    await flushEffects();

    expect(view.container.textContent).toContain("Effective session TTL: 14 days");
    expect(view.container.textContent).toContain("security.session.ttlDays) is 30 days");
    expect(
      (view.container.querySelector("#setup-security-max-sessions") as HTMLInputElement).value
    ).toBe("3");

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      "auth.sessionTtlDays": 14,
      "auth.resetTtlMinutes": 60,
    });
    expect(settingsState.updateSecuritySettings).toHaveBeenCalledWith({
      session: { maxPerUser: 3, singleSession: false },
    });
    expect(view.container.textContent).toContain("Security settings saved.");
    view.unmount();
  });

  it("blocks save while the wizard TTL validation fails and marks fields invalid", async () => {
    const view = mount(
      <SecurityStep {...wizardProps({ values: { ...BASE_VALUES, authSessionTtlDays: "9999" } })} />
    );
    await flushEffects();

    expect(view.container.textContent).toContain(
      "Auth session TTL must be between 1 and 365 days."
    );
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateSettings).not.toHaveBeenCalled();
    view.unmount();
  });

  it("surfaces the load-error banner when security settings cannot load", async () => {
    settingsState.securityError = new Error("offline");
    const view = mount(<SecurityStep {...wizardProps()} />);
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load security settings.");
    view.unmount();
  });

  it("patches the wizard TTL fields and saves the edited session policy", async () => {
    const view = mount(<SecurityStepHarness />);
    await flushEffects();

    // Editing the TTL inputs pushes patches into the wizard values, which the
    // effective-TTL summary and the Save payload both read back.
    setInputById(view.container, "setup-security-session-ttl", "30");
    setInputById(view.container, "setup-security-reset-ttl", "90");
    expect(view.container.textContent).toContain("Effective session TTL: 30 days");

    setInputById(view.container, "setup-security-max-sessions", "5");
    toggleSwitchAt(view.container, 0); // Single session

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateSettings).toHaveBeenLastCalledWith({
      "auth.sessionTtlDays": 30,
      "auth.resetTtlMinutes": 90,
    });
    expect(settingsState.updateSecuritySettings).toHaveBeenLastCalledWith({
      session: { maxPerUser: 5, singleSession: true },
    });
    view.unmount();
  });
});

describe("EmailStep adapter", () => {
  it("saves the form and omits an untouched password secret entirely", async () => {
    const view = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateEmailSettings).toHaveBeenCalledWith({
      provider: "smtp",
      smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "mailer",
        // no `password` key at all — untouched secrets are omitted
      },
      from: { name: "Coderso", email: "no-reply@example.com" },
    });
    expect(view.container.textContent).toContain("Email settings saved.");
    view.unmount();
  });

  it("forwards a newly typed password but keeps it out of a blank field", async () => {
    const view = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-email-password", "new-secret");
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateEmailSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        smtp: expect.objectContaining({ password: "new-secret" }),
      })
    );

    // clearing the field again omits the key instead of wiping the stored secret
    setInputById(view.container, "setup-email-password", "");
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    const calls = settingsState.updateEmailSettings.mock.calls as unknown as Array<
      [{ smtp: Record<string, unknown> }]
    >;
    const lastPayload = calls.at(-1)![0];
    expect(lastPayload.smtp).not.toHaveProperty("password");
    view.unmount();
  });

  it("shows the configured-secret hint and the load-error fallback", async () => {
    const view = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();
    expect(view.container.textContent).toContain(
      "Configured. Leave blank to keep the current password."
    );

    settingsState.emailError = new Error("offline");
    document.body.innerHTML = "";
    const failed = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();
    expect(failed.container.textContent).toContain("Failed to load email settings.");
    failed.unmount();
  });

  it("switches providers and reflects the Resend connection status", async () => {
    const view = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();

    // SMTP is the default provider; switching to Resend hides the SMTP grid and
    // shows the advisory copy driven by the loaded resend status.
    setSelectByTestId(view.container, "resend");
    expect(view.container.textContent).toContain("Resend is not connected.");
    expect(view.container.querySelector("#setup-email-host")).toBeNull();

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    const calls = settingsState.updateEmailSettings.mock.calls as unknown as Array<
      [{ provider: string }]
    >;
    expect(calls.at(-1)![0].provider).toBe("resend");

    // A connected Resend account flips the advisory line.
    document.body.innerHTML = "";
    settingsState.email = {
      ...(settingsState.email as Record<string, unknown>),
      resend: { status: "connected" },
    } as unknown;
    const connected = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();
    setSelectByTestId(connected.container, "resend");
    expect(connected.container.textContent).toContain("Resend is connected.");
    connected.unmount();
    view.unmount();
  });

  it("patches every SMTP field and the TLS toggle into the PUT payload", async () => {
    const view = mount(<EmailStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-email-host", "smtp.edited.example.com");
    setInputById(view.container, "setup-email-port", "2525");
    setInputById(view.container, "setup-email-user", "editor");
    setInputById(view.container, "setup-email-from-name", "Editor Bot");
    setInputById(view.container, "setup-email-from-email", "editor@example.com");
    toggleSwitchAt(view.container, 0); // Use TLS

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateEmailSettings).toHaveBeenLastCalledWith({
      provider: "smtp",
      smtp: { host: "smtp.edited.example.com", port: 2525, secure: true, user: "editor" },
      from: { name: "Editor Bot", email: "editor@example.com" },
    });
    view.unmount();
  });
});

describe("StorageStep adapter", () => {
  it("local driver payload carries only local keys and public base url", async () => {
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(settingsState.updateStorageSettings).toHaveBeenCalledWith({
      driver: "local",
      publicBaseUrl: "https://cdn.example.com",
      local: { dir: "uploads" },
    });
    expect(view.container.textContent).toContain("Storage settings saved.");
    view.unmount();
  });

  it("s3 driver forwards typed secrets only; blanks stay omitted", async () => {
    settingsState.storage = {
      driver: "s3",
      local: {},
      publicBaseUrl: "",
      s3: {
        bucket: "bkt",
        region: "eu-1",
        endpoint: "",
        accessKey: { configured: false },
        secretKey: { configured: false },
      },
      azure: {
        container: null,
        account: null,
        key: { configured: false },
        connectionString: { configured: false },
      },
    };
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-storage-s3-access-key", "AKIA123");
    setInputById(view.container, "setup-storage-s3-secret-key", "");
    clickButtonWithText(view.container, "Save");
    await flushEffects();

    const storeCalls = settingsState.updateStorageSettings.mock.calls as unknown as Array<
      [{ s3: Record<string, unknown> }]
    >;
    const payload = storeCalls.at(-1)![0];
    expect(payload.s3.bucket).toBe("bkt");
    expect(payload.s3.accessKey).toBe("AKIA123");
    expect(payload.s3.secretKey).toBeUndefined();
    view.unmount();
  });

  it("storage load failures surface their fallback banner", async () => {
    settingsState.storageError = new Error("offline");
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load storage settings.");
    view.unmount();
  });
});

describe("AssistantStep adapter", () => {
  it("loads assistant settings into the card and saves the assembled payload", async () => {
    const view = mount(<AssistantStep {...wizardProps()} />);
    await flushEffects();

    // Seeded from the loaded settings: global toggle on, model + avatar rendered.
    expect(view.container.textContent).toContain(
      "Configure Docs Assistant defaults and optional LLM Guide behavior."
    );
    const switches = Array.from(view.container.querySelectorAll('[role="switch"]'));
    expect(switches[0].getAttribute("data-state")).toBe("checked"); // Enable assistant
    expect(cardInputValue(view.container, "LLM model")).toBe("claude-opus-4-8");
    const avatar = view.container.querySelector<HTMLInputElement>(
      'input[placeholder="https://cdn.example.com/assistant-avatar.png"]'
    )!;
    expect(avatar.value).toBe("  https://cdn.example.com/avatar.png  ");

    // Toggle the global assistant off and change the model.
    toggleSwitchAt(view.container, 0);
    setCardInput(view.container, "LLM model", "claude-sonnet-4-6");

    // Open the Advanced collapsible, raise the input-token budget, and flip
    // the reindex-on-boot switch off.
    clickButtonContaining(view.container, "Advanced");
    setCardInput(view.container, "Max input tokens", "32000");
    const advancedSwitches = Array.from(view.container.querySelectorAll('[role="switch"]'));
    expect(advancedSwitches[3].getAttribute("data-state")).toBe("checked"); // Reindex on boot
    toggleSwitchAt(view.container, 3);

    clickButtonWithText(view.container, "Save");
    await flushEffects();

    expect(settingsState.updateSettings).toHaveBeenCalledWith({
      "assistant.enabled": false,
      "assistant.defaultMode": "llm-guide",
      "assistant.docs.reindexOnBoot": false,
      "assistant.launcher.avatarEnabled": true,
      "assistant.launcher.avatarAsset": "https://cdn.example.com/avatar.png",
      "assistant.llm.enabled": true,
      "assistant.llm.provider": "none",
      "assistant.llm.model": "claude-sonnet-4-6",
      "assistant.llm.maxInputTokens": 32000,
      "assistant.llm.maxOutputTokens": 4000,
      "assistant.llm.timeoutMs": 30000,
      "assistant.quotas.requestsPerMinute": 30,
      "assistant.quotas.requestsPerDay": 2000,
    });
    expect(view.container.textContent).toContain("Assistant settings saved.");
    view.unmount();
  });

  it("coerces malformed assistant settings to the safe defaults on load", async () => {
    settingsState.assistantSettings = {
      "assistant.enabled": "yes",
      "assistant.defaultMode": "bogus-mode",
      "assistant.docs.reindexOnBoot": "no",
      "assistant.launcher.avatarEnabled": 1,
      "assistant.launcher.avatarAsset": "",
      "assistant.llm.enabled": true,
      "assistant.llm.provider": "bogus-provider",
      "assistant.llm.model": "",
      "assistant.llm.maxInputTokens": -5,
      "assistant.llm.maxOutputTokens": 0,
      "assistant.llm.timeoutMs": 1.5,
      "assistant.quotas.requestsPerMinute": 12.8,
      "assistant.quotas.requestsPerDay": 2000,
    } as unknown;
    const view = mount(<AssistantStep {...wizardProps()} />);
    await flushEffects();

    // Non-boolean, empty, and non-positive values fall back to the safe
    // defaults: the global toggle renders unchecked and the model reverts.
    const switches = Array.from(view.container.querySelectorAll('[role="switch"]'));
    expect(switches[0].getAttribute("data-state")).toBe("unchecked");
    expect(cardInputValue(view.container, "LLM model")).toBe("google/gemma-3n-e2b-it:free");

    clickButtonContaining(view.container, "Advanced");
    expect(cardInputValue(view.container, "Max input tokens")).toBe("8192");
    expect(cardInputValue(view.container, "Max output tokens")).toBe("2048");
    expect(cardInputValue(view.container, "LLM timeout (ms)")).toBe("1");
    expect(cardInputValue(view.container, "Requests per minute")).toBe("12");

    // The blank avatar asset and the coerced provider/mode reach the PATCH as
    // null / none / docs-only rather than garbage strings.
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    const calls = settingsState.updateSettings.mock.calls as unknown as Array<
      [
        {
          "assistant.launcher.avatarAsset": unknown;
          "assistant.llm.provider": unknown;
          "assistant.defaultMode": unknown;
        },
      ]
    >;
    const payload = calls.at(-1)![0];
    expect(payload["assistant.launcher.avatarAsset"]).toBeNull();
    expect(payload["assistant.llm.provider"]).toBe("none");
    expect(payload["assistant.defaultMode"]).toBe("docs-only");
    view.unmount();
  });

  it("surfaces the load banner and the save-failure message distinctly", async () => {
    settingsState.assistantSettingsError = new Error("offline");
    const view = mount(<AssistantStep {...wizardProps()} />);
    await flushEffects();
    expect(view.container.textContent).toContain("Failed to load assistant settings.");
    view.unmount();

    document.body.innerHTML = "";
    settingsState.assistantSettingsError = null;
    settingsState.updateSettings.mockRejectedValueOnce(
      new ApiClientError("settings_value_invalid", "assistant rejected", 422)
    );
    const saving = mount(<AssistantStep {...wizardProps()} />);
    await flushEffects();
    clickButtonWithText(saving.container, "Save");
    await flushEffects();
    expect(saving.container.querySelector("[role='alert']")!.textContent).toContain(
      "assistant rejected"
    );
    expect(saving.container.textContent).not.toContain("Assistant settings saved.");
    saving.unmount();
  });

  it("passes the wizard disabled state through to Save and the card controls", async () => {
    const view = mount(<AssistantStep {...wizardProps({ disabled: true })} />);
    await flushEffects();

    const save = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Save"
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    React.act(() => {
      save.click();
    });
    expect(settingsState.updateSettings).not.toHaveBeenCalled();
    view.unmount();
  });
});
