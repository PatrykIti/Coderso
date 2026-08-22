// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { BaseUrlCard } from "../../../core/admin/ui/settings/BaseUrlCard";
import { BrandingCard } from "../../../core/admin/ui/settings/BrandingCard";
import { SettingsPage } from "../../../core/admin/ui/settings/SettingsPage";
import { SettingsSidebar } from "../../../core/admin/ui/settings/SettingsSidebar";
import { SettingsDirtyNavigationProvider } from "../../../core/admin/ui/settings/SettingsDirtyNavigation";
import { useRegisterSettingsDirty } from "../../../core/admin/ui/settings/SettingsDirtyNavigation";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

type TokenOverrides = Record<string, unknown>;

type EditorMockProps = {
  value: TokenOverrides;
  onChange: (next: TokenOverrides | ((previous: TokenOverrides) => TokenOverrides)) => void;
  onReset: () => void;
};

vi.mock("../../../core/admin/ui/settings/DesignTokensEditor", () => ({
  DesignTokensEditor: ({ value, onChange, onReset }: EditorMockProps) => (
    <section>
      <span>{`tokens:${JSON.stringify(value)}`}</span>
      <button type="button" onClick={() => onChange((previous) => ({ ...previous, unit: "8px" }))}>
        edit-token
      </button>
      <button type="button" onClick={() => onChange({ spacing: { unit: "4px" } })}>
        replace-token
      </button>
      <button type="button" onClick={() => onReset()}>
        reset-from-editor
      </button>
    </section>
  ),
}));

vi.mock("../../../core/admin/ui/settings/DesignTokensPreview", () => ({
  DesignTokensPreview: () => <div data-testid="token-preview">preview</div>,
}));

const collectItemValues = (node: React.ReactNode): Array<{ value: string; label: string }> => {
  const items: Array<{ value: string; label: string }> = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: string; children?: React.ReactNode; id?: string };
    if (typeof props.value === "string" && typeof props.children === "string") {
      items.push({ value: props.value, label: props.children });
    }
    items.push(...collectItemValues(props.children));
  });
  return items;
};

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "message" in error),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    defaultValue,
    disabled,
    onValueChange,
    children,
  }: {
    value?: string;
    defaultValue?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }) => {
    const trigger = React.Children.toArray(children).find(
      (child) =>
        React.isValidElement(child) && typeof (child.props as { id?: string }).id === "string"
    );
    const triggerId = React.isValidElement(trigger)
      ? (trigger.props as { id?: string }).id
      : undefined;
    return (
      <select
        data-testid={triggerId ? `select-${triggerId}` : "select"}
        value={value ?? defaultValue}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectItemValues(children).map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  },
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <span data-item={value}>{children}</span>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  SelectValue: () => null,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

function clickByText(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${text}`);
  }
  act(() => {
    button.click();
  });
}

const pageText = () => document.body.textContent ?? "";

const apiError = (message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  return error;
};

const baseValues = { siteName: "Coderso", siteLocale: "en" };
const baseTokens: Record<string, unknown> = { color: { primary: "#000000" } };

function mountSettingsPage(props: Partial<React.ComponentProps<typeof SettingsPage>> = {}) {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings">
      <SettingsPage
        values={baseValues}
        tokens={baseTokens}
        onSave={async () => undefined}
        onResetTokens={async () => undefined}
        {...props}
      />
    </AdminRouterProvider>
  );
  return view;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/admin/settings");
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("SettingsPage renders the token editor, preview, and save actions", () => {
  const view = mountSettingsPage();
  try {
    expect(pageText()).toContain("Theme Configuration");
    expect(pageText()).toContain("Save changes");
    expect(pageText()).toContain("Reset defaults");
    expect(pageText()).toContain("Export JSON");
    expect(view.container.querySelector('[data-testid="token-preview"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("SettingsPage saves values and tokens and reports success", async () => {
  const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const onSaveWithArgs = vi.fn<(input: { values: unknown; tokens: unknown }) => Promise<void>>(() =>
    Promise.resolve()
  );
  const view = mountSettingsPage({ onSave: onSaveWithArgs });
  try {
    clickByText("edit-token");
    await flush();
    clickByText("Save changes");
    await flush();
    await flush();

    expect(onSaveWithArgs).toHaveBeenCalledTimes(1);
    const payload = onSaveWithArgs.mock.calls[0][0];
    expect(payload.values).toEqual(baseValues);
    expect(payload.tokens).toMatchObject({ unit: "8px", color: { primary: "#000000" } });
    expect(pageText()).toContain("Settings updated.");
  } finally {
    view.cleanup();
  }
});

test("SettingsPage surfaces save errors from the endpoint and generic fallback", async () => {
  const onSave = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(apiError("endpoint rejected"))
    .mockRejectedValueOnce({ code: "boom" });
  const view = mountSettingsPage({ onSave });
  try {
    clickByText("Save changes");
    await flush();
    await flush();
    expect(pageText()).toContain("Save failed");
    expect(pageText()).toContain("endpoint rejected");

    clickByText("Save changes");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to save settings.");
  } finally {
    view.cleanup();
  }
});

test("SettingsPage resets tokens and reports success", async () => {
  const onResetTokens = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const view = mountSettingsPage({ onResetTokens });
  try {
    clickByText("edit-token");
    await flush();
    clickByText("Reset defaults");
    await flush();
    await flush();

    expect(onResetTokens).toHaveBeenCalledTimes(1);
    expect(pageText()).toContain("Tokens reset to defaults.");
  } finally {
    view.cleanup();
  }
});

test("SettingsPage surfaces reset errors from the endpoint and generic fallback", async () => {
  const onResetTokens = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(apiError("reset denied"))
    .mockRejectedValueOnce({ code: "boom" });
  const view = mountSettingsPage({ onResetTokens });
  try {
    clickByText("Reset defaults");
    await flush();
    await flush();
    expect(pageText()).toContain("reset denied");

    clickByText("Reset defaults");
    await flush();
    await flush();
    expect(pageText()).toContain("Failed to reset tokens.");
  } finally {
    view.cleanup();
  }
});

test("SettingsPage renders the prop-level error alert and disables while busy", () => {
  const view = mountSettingsPage({ error: "Tokens failed to load.", isLoading: true });
  try {
    expect(pageText()).toContain("Settings error");
    expect(pageText()).toContain("Tokens failed to load.");

    const saveButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Saving..."
    );
    expect(saveButton).toBeDefined();
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    const resetButton = Array.from(document.body.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Reset defaults"
    );
    expect((resetButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("SettingsPage swaps to the parent token source when the tokens prop changes", async () => {
  const view = mount(<TokenSwapHarness />);
  try {
    clickByText("replace-token");
    await flush();
    expect(pageText()).toContain('"unit":"4px"');

    clickByText("swap-tokens");
    await flush();
    expect(pageText()).toContain('"primary":"#111111"');

    const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const onSaveWithArgs = vi.fn<(input: { values: unknown; tokens: unknown }) => Promise<void>>(
      () => Promise.resolve()
    );
    void onSave;
  } finally {
    view.cleanup();
  }
});

test("SettingsPage shows the saving label while a save is pending", async () => {
  let resolveSave: (() => void) | undefined;
  const onSave = vi.fn<() => Promise<void>>(
    () =>
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      })
  );
  const view = mountSettingsPage({ onSave });
  try {
    clickByText("Save changes");
    await flush();
    expect(pageText()).toContain("Saving...");

    await act(async () => {
      resolveSave?.();
      await Promise.resolve();
    });
    await flush();
    expect(pageText()).toContain("Settings updated.");
  } finally {
    view.cleanup();
  }
});

test("SettingsSidebar renders the nested security group for security pages", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security">
      <SettingsDirtyNavigationProvider>
        <SettingsSidebar activeId="security" />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("Sessions");
    expect(view.container.textContent).toContain("Login Alerts");
    expect(view.container.textContent).toContain("IP Allowlist");
    const current = view.container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Security");
  } finally {
    view.cleanup();
  }
});

test("SettingsSidebar expands the security group when a child page is active", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/sessions">
      <SettingsDirtyNavigationProvider>
        <SettingsSidebar activeId="sessions" />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );
  try {
    const current = view.container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Sessions");
    expect(view.container.textContent).toContain("Login Alerts");
  } finally {
    view.cleanup();
  }
});

test("SettingsSidebar guards navigation through the dirty store", async () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <SettingsDirtyNavigationProvider>
        <GuardHarness />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );
  try {
    const makeDirty = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Make dirty"
    );
    act(() => {
      makeDirty?.click();
    });
    await flush();

    const emailLink = Array.from(view.container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Email"
    );
    expect(emailLink).toBeDefined();
    emailLink?.removeAttribute("href");
    act(() => {
      emailLink?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0, cancelable: true })
      );
    });
    await flush();
    expect(window.location.pathname).toBe("/admin/settings/general");
  } finally {
    view.cleanup();
  }
});

test("SettingsSidebar covers every guard short-circuit branch", async () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <SettingsDirtyNavigationProvider>
        <SettingsSidebar activeId="general" />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );
  try {
    const emailLink = Array.from(view.container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Email"
    ) as HTMLAnchorElement;

    act(() => {
      emailLink.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0, cancelable: true })
      );
    });
    await flush();
    expect(window.location.pathname).toBe("/admin/settings/general");

    emailLink.removeAttribute("href");
    act(() => {
      emailLink.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 2, cancelable: true })
      );
    });
    await flush();
    expect(window.location.pathname).toBe("/admin/settings/general");

    act(() => {
      emailLink.dispatchEvent(
        new window.MouseEvent("click", {
          bubbles: true,
          button: 0,
          ctrlKey: true,
          cancelable: true,
        })
      );
    });
    await flush();
    expect(window.location.pathname).toBe("/admin/settings/general");
  } finally {
    view.cleanup();
  }
});

test("SettingsSidebar allows clean navigation through AdminLink", async () => {
  window.history.replaceState({}, "", "/admin/settings/general");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <SettingsDirtyNavigationProvider>
        <SettingsSidebar activeId="general" />
      </SettingsDirtyNavigationProvider>
    </AdminRouterProvider>
  );
  try {
    const emailLink = Array.from(view.container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Email"
    );
    expect(emailLink).toBeDefined();
    emailLink?.removeAttribute("href");
    act(() => {
      emailLink?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0, cancelable: true })
      );
    });
    await flush();
    expect(window.location.pathname).toBe("/admin/settings/email");
  } finally {
    view.cleanup();
  }
});

test("BaseUrlCard wires both URL inputs to onChange", () => {
  const onChange = vi.fn();
  const view = mount(
    <BaseUrlCard
      adminBaseUrl="https://cms.example.com"
      publicBaseUrl="https://www.example.com"
      onChange={onChange}
    />
  );
  try {
    const adminInput = view.container.querySelector<HTMLInputElement>("#admin-base-url");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(adminInput, "https://admin.example.com");
      adminInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith({
      adminBaseUrl: "https://admin.example.com",
      publicBaseUrl: "https://www.example.com",
    });

    const publicInput = view.container.querySelector<HTMLInputElement>("#public-base-url");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(publicInput, "https://www.new-site.com");
      publicInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith({
      adminBaseUrl: "https://cms.example.com",
      publicBaseUrl: "https://www.new-site.com",
    });
  } finally {
    view.cleanup();
  }
});

test("BaseUrlCard renders field errors and disables inputs", () => {
  const view = mount(
    <BaseUrlCard
      adminBaseUrl=""
      publicBaseUrl=""
      errors={{
        adminBaseUrl: "Admin base URL must be absolute.",
        publicBaseUrl: "Public base URL must be absolute.",
      }}
      disabled
    />
  );
  try {
    expect(view.container.textContent).toContain("Admin base URL must be absolute.");
    expect(view.container.textContent).toContain("Public base URL must be absolute.");
    const adminInput = view.container.querySelector<HTMLInputElement>("#admin-base-url");
    const publicInput = view.container.querySelector<HTMLInputElement>("#public-base-url");
    expect(adminInput?.getAttribute("aria-invalid")).toBe("true");
    expect(publicInput?.getAttribute("aria-invalid")).toBe("true");
    expect(adminInput?.disabled).toBe(true);
    expect(publicInput?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("BrandingCard wires site name and locale changes to onChange", () => {
  const onChange = vi.fn();
  const view = mount(<BrandingCard siteName="Coderso" siteLocale="en" onChange={onChange} />);
  try {
    const nameInput = view.container.querySelector<HTMLInputElement>("#site-name");
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(nameInput, "My Site");
      nameInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith({
      siteName: "My Site",
      siteLocale: "en",
    });

    const localeSelect = view.container.querySelector<HTMLSelectElement>(
      '[data-testid="select-site-locale"]'
    );
    expect(localeSelect).not.toBeNull();
    act(() => {
      localeSelect!.value = "pl-PL";
      localeSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith({
      siteName: "Coderso",
      siteLocale: "pl-PL",
    });
  } finally {
    view.cleanup();
  }
});

test("BrandingCard renders the disabled timezone no-op control", () => {
  const view = mount(<BrandingCard siteName="Coderso" siteLocale="en" />);
  try {
    const timezoneSelect = view.container.querySelector<HTMLSelectElement>(
      '[data-testid="select-site-timezone"]'
    );
    expect(timezoneSelect).not.toBeNull();
    expect(timezoneSelect?.disabled).toBe(true);
    expect(timezoneSelect?.value).toBe("utc-08");
  } finally {
    view.cleanup();
  }
});

function TokenSwapHarness() {
  const [tokens, setTokens] = React.useState<TokenOverrides>(baseTokens);
  return (
    <AdminRouterProvider initialPath="/admin/settings">
      <SettingsPage
        values={baseValues}
        tokens={tokens}
        onSave={async () => undefined}
        onResetTokens={async () => undefined}
      />
      <button type="button" onClick={() => setTokens({ color: { primary: "#111111" } })}>
        swap-tokens
      </button>
    </AdminRouterProvider>
  );
}

function GuardHarness() {
  const [dirty, setDirty] = React.useState(false);
  useRegisterSettingsDirty(dirty);
  return (
    <div>
      <button type="button" onClick={() => setDirty(true)}>
        Make dirty
      </button>
      <SettingsSidebar activeId="general" />
    </div>
  );
}
