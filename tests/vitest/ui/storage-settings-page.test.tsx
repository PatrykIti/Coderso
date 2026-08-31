// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { StorageSettingsResponse } from "../../../core/admin/services/settingsClient";
import { StorageSettingsPage } from "../../../core/admin/ui/settings/StorageSettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiError = (message: string) => Object.assign(new Error(message), { isApiError: true });

const GIGABYTE = 1024 ** 3;

const storageState = vi.hoisted(() => {
  const GIGABYTE = 1024 ** 3;
  const makeStorage = (
    overrides: Partial<StorageSettingsResponse> = {}
  ): StorageSettingsResponse => ({
    driver: "local",
    local: { dir: "./storage/media" },
    publicBaseUrl: null,
    maxSizeBytes: 5 * GIGABYTE,
    allowedMime: null,
    delivery: { accessMode: "public" },
    quota: { totalBytes: null, planLabel: null },
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
    ...overrides,
  });
  const state = {
    storage: makeStorage(),
    getStorageSettings: vi.fn(),
    updateStorageSettings: vi.fn(),
    reset() {
      state.storage = makeStorage();
      state.getStorageSettings.mockReset();
      state.updateStorageSettings.mockReset();
      state.getStorageSettings.mockResolvedValue(state.storage);
      state.updateStorageSettings.mockResolvedValue(state.storage);
    },
  };
  return state;
});

vi.mock("@/services/settingsClient", () => ({
  getStorageSettings: storageState.getStorageSettings,
  updateStorageSettings: storageState.updateStorageSettings,
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

const fieldContainer = (labelText: string) => {
  const label = Array.from(document.body.querySelectorAll("label")).find(
    (item) => item.textContent?.trim() === labelText
  );
  if (!label) throw new Error(`missing label: ${labelText}`);
  const container = label.parentElement;
  if (!container) throw new Error(`missing field container: ${labelText}`);
  return container;
};

const inputInField = (labelText: string) => {
  const input = fieldContainer(labelText).querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error(`missing input: ${labelText}`);
  return input;
};

const selectInField = (labelText: string) => {
  const select = fieldContainer(labelText).querySelector('[data-testid="select"]');
  if (!(select instanceof HTMLSelectElement)) throw new Error(`missing select: ${labelText}`);
  return select;
};

const typeInto = async (labelText: string, value: string) => {
  await React.act(async () => {
    setInputValue(inputInField(labelText), value);
    await Promise.resolve();
  });
};

const clickText = async (label: string) => {
  const element = Array.from(document.body.querySelectorAll("[role='radio'], button")).find(
    (item) => item.textContent?.includes(label)
  );
  if (!element) throw new Error(`missing clickable: ${label}`);
  await React.act(async () => {
    (element as HTMLElement).click();
    await Promise.resolve();
  });
};

beforeEach(() => {
  storageState.reset();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

test("StorageSettingsPage loads local config and renders security summary", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(storageState.getStorageSettings).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Local Storage Configuration");
    expect(inputInField("Storage Root").value).toBe("./storage/media");
    expect(inputInField("Max Upload Size").value).toBe("5");
    expect(document.body.textContent).not.toContain("Storage settings error");
    expect(document.body.textContent).toContain("S3 Access Key");
    expect(document.body.textContent).toContain("Missing");
    const testButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Test Connection")
    );
    expect((testButton as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain("Storage connection testing is not wired yet.");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage surfaces api and generic load errors", async () => {
  storageState.getStorageSettings.mockRejectedValueOnce(apiError("storage unavailable"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Storage settings error");
    expect(document.body.textContent).toContain("storage unavailable");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage surfaces generic load errors", async () => {
  storageState.getStorageSettings.mockRejectedValueOnce(new Error("boom"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Storage settings error");
    expect(document.body.textContent).toContain("Failed to load storage settings.");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage switches to S3 and Azure providers", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();

    await clickText("Amazon S3");
    await flushEffects();
    expect(document.body.textContent).toContain("Amazon S3 Configuration");
    expect(document.body.textContent).toContain("Access Key");
    expect(document.body.textContent).toContain("Secret Key");
    expect(document.body.textContent).toContain("Bucket Name");
    expect(document.body.textContent).toContain("Region");
    expect(document.body.textContent).toContain("Custom Endpoint");
    const s3Cards = Array.from(document.body.querySelectorAll("[role='radio']"));
    expect(s3Cards[1].getAttribute("aria-checked")).toBe("true");

    await clickText("Azure Blob");
    await flushEffects();
    expect(document.body.textContent).toContain("Azure Blob Configuration");
    expect(document.body.textContent).toContain("Account Name");
    expect(document.body.textContent).toContain("Account Key");
    expect(document.body.textContent).toContain("Container Name");
    expect(document.body.textContent).toContain("Connection String");
    expect(document.body.textContent).toContain("Access policy");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage saves s3 payload and reflects updated secrets", async () => {
  storageState.updateStorageSettings.mockResolvedValueOnce({
    ...storageState.storage,
    driver: "s3",
    s3: {
      bucket: "coderso-assets",
      region: "eu-central-1",
      endpoint: "https://s3.amazonaws.com",
      accessKey: { configured: true },
      secretKey: { configured: true },
    },
  });
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickText("Amazon S3");
    await flushEffects();

    await typeInto("Access Key", "AKIAIOSFODNN7EXAMPLE");
    await typeInto("Secret Key", "super-secret");
    await typeInto("Bucket Name", "coderso-assets");
    const regionSelect = selectInField("Region");
    React.act(() => {
      setSelectValue(regionSelect, "eu-central-1");
    });
    await flushEffects();
    await typeInto("Custom Endpoint", "https://s3.amazonaws.com");

    await clickText("Save changes");
    await flushEffects();

    expect(storageState.updateStorageSettings).toHaveBeenCalledTimes(1);
    const payload = storageState.updateStorageSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.driver).toBe("s3");
    expect(payload.s3).toEqual({
      bucket: "coderso-assets",
      region: "eu-central-1",
      endpoint: "https://s3.amazonaws.com",
      accessKey: "AKIAIOSFODNN7EXAMPLE",
      secretKey: "super-secret",
    });
    expect(payload.maxSizeBytes).toBe(5 * GIGABYTE);
    expect(document.body.textContent).toContain("Storage settings updated.");
    const badges = Array.from(document.body.querySelectorAll("span")).map((item) =>
      item.textContent?.trim()
    );
    expect(badges.filter((item) => item === "Configured").length).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage changes size unit and blocks invalid sizes", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();

    const unitSelect = selectInField("Max Upload Size");
    React.act(() => {
      setSelectValue(unitSelect, "GB");
    });
    await flushEffects();
    expect(unitSelect.value).toBe("GB");

    await typeInto("Max Upload Size", "-5");
    await flushEffects();
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save changes")
    );
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await typeInto("Max Upload Size", "2");
    await flushEffects();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await clickText("Save changes");
    await flushEffects();
    const payload = storageState.updateStorageSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.maxSizeBytes).toBe(2 * GIGABYTE);
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage surfaces api and generic save errors", async () => {
  storageState.updateStorageSettings.mockRejectedValueOnce(apiError("bucket invalid"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickText("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("bucket invalid");

    storageState.updateStorageSettings.mockRejectedValueOnce(new Error("network down"));
    await clickText("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to update storage settings.");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage autosaves non-error changes", async () => {
  window.localStorage.setItem("coderso.settings.autosave", "true");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await typeInto("Storage File URL (Override)", "https://cdn.example.com");
    await waitForAutoSaveDelay();
    expect(storageState.updateStorageSettings).toHaveBeenCalledTimes(1);
    const payload = storageState.updateStorageSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.publicBaseUrl).toBe("https://cdn.example.com");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage renders empty and fallback size resolutions", async () => {
  storageState.getStorageSettings.mockResolvedValueOnce({
    ...storageState.storage,
    maxSizeBytes: null,
  });
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(inputInField("Max Upload Size").value).toBe("");
    expect(selectInField("Max Upload Size").value).toBe("MB");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage uses kb fallback for odd byte sizes", async () => {
  storageState.getStorageSettings.mockResolvedValueOnce({
    ...storageState.storage,
    maxSizeBytes: 3000,
  });
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(inputInField("Max Upload Size").value).toBe("2.93");
    expect(selectInField("Max Upload Size").value).toBe("KB");
  } finally {
    view.cleanup();
  }
});

test("StorageSettingsPage toggles the autosave checkbox", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
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

test("StorageSettingsPage saves normalized empty optionals as null", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await typeInto("Storage Root", "");
    await typeInto("Max Upload Size", "");
    await clickText("Save changes");
    await flushEffects();
    const payload = storageState.updateStorageSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.local).toEqual({ dir: null });
    expect(payload.publicBaseUrl).toBeNull();
    expect(payload.allowedMime).toBeNull();
    expect(payload.maxSizeBytes).toBeNull();
    expect(payload.s3).toEqual({
      bucket: null,
      region: null,
      endpoint: null,
      accessKey: undefined,
      secretKey: undefined,
    });
  } finally {
    view.cleanup();
  }
});
