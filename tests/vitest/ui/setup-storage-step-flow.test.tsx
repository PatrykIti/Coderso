// @vitest-environment happy-dom

// TASK-105-08-09 (L09, setup-advanced cluster): dedicated StorageStep flow suite.
// The shared adapter suite pins the secret-omission contract; this file walks the
// DRIVER flows end to end: driver selection swaps the visible field groups, every
// field edit reaches the PATCH /settings/storage payload (blanks become null),
// typed secrets are forwarded once and re-masked after a successful save, and
// load/save failures surface their banners without wiping operator input.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const storageState = vi.hoisted(() => ({
  config: {
    driver: "local",
    local: { dir: "uploads" },
    publicBaseUrl: "",
    s3: {
      bucket: null,
      region: null,
      endpoint: null,
      accessKey: { configured: false },
      secretKey: { configured: false },
    },
    azure: {
      container: null,
      account: null,
      key: { configured: false },
      connectionString: { configured: false },
    },
  } as unknown,
  loadError: null as unknown,
  updateStorageSettings: vi.fn(async () => ({ ok: true })),
  reset() {
    storageState.config = {
      driver: "local",
      local: { dir: "uploads" },
      publicBaseUrl: "",
      s3: {
        bucket: null,
        region: null,
        endpoint: null,
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
    storageState.loadError = null;
    storageState.updateStorageSettings.mockClear();
    storageState.updateStorageSettings.mockImplementation(async () => ({ ok: true }));
  },
}));

vi.mock("@/services/settingsClient", async () => {
  const actual = await import("../../../core/admin/services/settingsClient");
  return {
    ...actual,
    getStorageSettings: vi.fn(async () => {
      if (storageState.loadError) throw storageState.loadError;
      return storageState.config;
    }),
    updateStorageSettings: storageState.updateStorageSettings,
  };
});

import { ApiClientError } from "../../../core/admin/services/apiClient";
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

const wizardProps = (): WizardStepBodyProps => ({
  values: { ...BASE_VALUES },
  onPatch: () => undefined,
  disabled: false,
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
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`missing input #${id}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("value setter unavailable");
  setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

// Radix Select needs a real pointer sequence in happy-dom; options portal to
// document.body, so the option lookup deliberately leaves the mounted container.
const pointerClick = (element: Element | null | undefined) => {
  if (!element) throw new Error("pointer click target missing");
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const chooseDriver = async (optionLabel: string) => {
  const trigger = document.getElementById("setup-storage-driver");
  if (!trigger) throw new Error("missing driver trigger");
  pointerClick(trigger);
  await flushEffects();
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
    entry.textContent?.includes(optionLabel)
  );
  if (!option) throw new Error(`missing driver option ${optionLabel}`);
  pointerClick(option);
  await flushEffects();
};

afterEach(() => {
  storageState.reset();
  document.body.innerHTML = "";
});

describe("StorageStep driver flows", () => {
  it("offers the three drivers and swaps the visible field group on change", async () => {
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    expect(view.container.querySelector("#setup-storage-local-dir")).not.toBeNull();
    expect(view.container.querySelector("#setup-storage-s3-bucket")).toBeNull();
    expect(view.container.querySelector("#setup-storage-azure-container")).toBeNull();

    await chooseDriver("Amazon S3");
    expect(view.container.querySelector("#setup-storage-s3-bucket")).not.toBeNull();
    expect(view.container.querySelector("#setup-storage-local-dir")).toBeNull();

    await chooseDriver("Azure Blob Storage");
    expect(view.container.querySelector("#setup-storage-azure-container")).not.toBeNull();
    expect(view.container.querySelector("#setup-storage-s3-region")).toBeNull();

    await chooseDriver("Local filesystem");
    expect(view.container.querySelector("#setup-storage-local-dir")).not.toBeNull();
    expect(view.container.querySelector("#setup-storage-azure-account")).toBeNull();

    view.unmount();
  });

  it("sends only the active driver group while keeping edits to the shared base URL", async () => {
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-storage-public-url", "https://cdn.example.com");
    await chooseDriver("Amazon S3");
    clickButtonWithText(view.container, "Save");
    await flushEffects();

    // The local group is dropped after switching drivers; the edited shared
    // base URL survives; blank S3 fields serialize as null (never omitted keys).
    expect(storageState.updateStorageSettings).toHaveBeenCalledWith({
      driver: "s3",
      publicBaseUrl: "https://cdn.example.com",
      s3: { bucket: null, region: null, endpoint: null },
    });
    view.unmount();
  });

  it("coerces blank local values to null and forwards trimmed ones verbatim", async () => {
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-storage-public-url", "   ");
    setInputById(view.container, "setup-storage-local-dir", "   ");
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(storageState.updateStorageSettings).toHaveBeenLastCalledWith({
      driver: "local",
      publicBaseUrl: null,
      local: { dir: null },
    });

    setInputById(view.container, "setup-storage-public-url", "https://cdn.example.com");
    setInputById(view.container, "setup-storage-local-dir", " media/uploads ");
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(storageState.updateStorageSettings).toHaveBeenLastCalledWith({
      driver: "local",
      publicBaseUrl: "https://cdn.example.com",
      local: { dir: "media/uploads" },
    });
    view.unmount();
  });
});

describe("StorageStep S3 secrets", () => {
  it("forwards a newly typed access key, omits the untouched secret, and re-masks after save", async () => {
    storageState.config = {
      driver: "s3",
      local: {},
      publicBaseUrl: "",
      s3: {
        bucket: "bkt",
        region: "eu-central-1",
        endpoint: "",
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
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    // Masked display: both secret inputs render blank with the keep-current hint.
    const accessInput = view.container.querySelector<HTMLInputElement>(
      "#setup-storage-s3-access-key"
    )!;
    expect(accessInput.value).toBe("");
    expect(accessInput.type).toBe("password");
    expect(
      view.container.querySelector<HTMLInputElement>("#setup-storage-s3-secret-key")!.type
    ).toBe("password");
    const hintCount = (
      view.container.textContent!.match(/Leave blank to keep the current secret/g) ?? []
    ).length;
    expect(hintCount).toBe(2);

    setInputById(view.container, "setup-storage-public-url", "https://cdn.example.com");
    setInputById(view.container, "setup-storage-s3-bucket", "bkt-edited");
    setInputById(view.container, "setup-storage-s3-region", "eu-west-2");
    setInputById(view.container, "setup-storage-s3-endpoint", "https://s3.example.com");
    setInputById(view.container, "setup-storage-s3-access-key", "AKIA-NEW");
    // Typing a secret and clearing it again must still OMIT the key from the
    // PATCH — a blank field means "keep the stored secret", never "".
    setInputById(view.container, "setup-storage-s3-secret-key", "temp-secret");
    setInputById(view.container, "setup-storage-s3-secret-key", "");
    clickButtonWithText(view.container, "Save");
    await flushEffects();

    const calls = storageState.updateStorageSettings.mock.calls as unknown as Array<
      [{ s3: Record<string, unknown> }]
    >;
    const payload = calls.at(-1)![0];
    expect(payload.s3).toEqual({
      bucket: "bkt-edited",
      region: "eu-west-2",
      endpoint: "https://s3.example.com",
      accessKey: "AKIA-NEW",
    });
    expect("secretKey" in payload.s3).toBe(false);

    // A successful write clears the typed secret from the form (re-masked).
    expect(
      view.container.querySelector<HTMLInputElement>("#setup-storage-s3-access-key")!.value
    ).toBe("");
    expect(view.container.textContent).toContain("Storage settings saved.");
    view.unmount();
  });

  it("keeps typed secrets and surfaces the domain error when the save fails", async () => {
    storageState.config = {
      driver: "s3",
      local: {},
      publicBaseUrl: "",
      s3: {
        bucket: "bkt",
        region: null,
        endpoint: null,
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
    storageState.updateStorageSettings.mockRejectedValueOnce(
      new ApiClientError("settings_value_invalid", "storage rejected", 422)
    );
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    setInputById(view.container, "setup-storage-s3-access-key", "AKIA-RETRY");
    clickButtonWithText(view.container, "Save");
    await flushEffects();

    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(
      "storage rejected"
    );
    expect(view.container.textContent).not.toContain("Storage settings saved.");
    // Failed saves keep the operator's input so the retry does not need retyping.
    expect(
      view.container.querySelector<HTMLInputElement>("#setup-storage-s3-access-key")!.value
    ).toBe("AKIA-RETRY");

    // Non-client failures fall back to the step's generic copy.
    storageState.updateStorageSettings.mockRejectedValueOnce(new Error("offline"));
    clickButtonWithText(view.container, "Save");
    await flushEffects();
    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(
      "Failed to save storage settings."
    );
    view.unmount();
  });
});

describe("StorageStep Azure secrets", () => {
  it("forwards the typed key, omits the blank connection string, and shows per-secret hints", async () => {
    storageState.config = {
      driver: "azure",
      local: {},
      publicBaseUrl: "",
      s3: {
        bucket: null,
        region: null,
        endpoint: null,
        accessKey: { configured: false },
        secretKey: { configured: false },
      },
      azure: {
        container: null,
        account: null,
        key: { configured: true },
        connectionString: { configured: false },
      },
    };
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();

    // The configured key advertises keep-current; the unconfigured connection
    // string says it has never been set.
    expect(view.container.textContent).toContain(
      "Configured. Leave blank to keep the current secret."
    );
    expect((view.container.textContent!.match(/Not configured yet\./g) ?? []).length).toBe(1);

    setInputById(view.container, "setup-storage-azure-container", "media");
    setInputById(view.container, "setup-storage-azure-account", "acct");
    setInputById(view.container, "setup-storage-azure-key", "BASE64KEY==");
    // A connection string typed and then cleared is omitted, never sent as "".
    setInputById(view.container, "setup-storage-azure-conn", "DefaultEndpointsProtocol=https");
    setInputById(view.container, "setup-storage-azure-conn", "");
    clickButtonWithText(view.container, "Save");
    await flushEffects();

    const calls = storageState.updateStorageSettings.mock.calls as unknown as Array<
      [{ azure: Record<string, unknown> }]
    >;
    const payload = calls.at(-1)![0];
    expect(payload.azure).toEqual({ container: "media", account: "acct", key: "BASE64KEY==" });
    expect("connectionString" in payload.azure).toBe(false);
    expect(view.container.textContent).toContain("Storage settings saved.");

    // Re-masked after the successful write.
    expect(view.container.querySelector<HTMLInputElement>("#setup-storage-azure-key")!.value).toBe(
      ""
    );
    view.unmount();
  });
});

describe("StorageStep failure and disabled states", () => {
  it("surfaces client messages and the generic fallback when loading fails", async () => {
    storageState.loadError = new ApiClientError("forbidden", "denied", 403);
    const view = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();
    expect(view.container.textContent).toContain("denied");
    view.unmount();

    storageState.loadError = new Error("offline");
    const fallback = mount(<StorageStep {...wizardProps()} />);
    await flushEffects();
    expect(fallback.container.textContent).toContain("Failed to load storage settings.");
    expect(fallback.container.querySelector("#setup-storage-driver")).toBeNull();
    fallback.unmount();
  });

  it("disables every control while the wizard is busy and ignores Save clicks", async () => {
    const view = mount(
      <StorageStep values={{ ...BASE_VALUES }} onPatch={() => undefined} disabled />
    );
    await flushEffects();

    for (const input of Array.from(view.container.querySelectorAll("input"))) {
      expect(input.disabled).toBe(true);
    }
    const save = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Save"
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    React.act(() => {
      save.click();
    });
    expect(storageState.updateStorageSettings).not.toHaveBeenCalled();
    view.unmount();
  });
});
