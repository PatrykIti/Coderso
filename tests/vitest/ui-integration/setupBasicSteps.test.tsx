// @vitest-environment happy-dom
//
// TASK-482-05-L02: the Basic-track step bodies (identity/branding/locale/
// timezone/URLs/starter-content) and their persistence through the bulk
// `PATCH /settings` client. The settings client is mocked so these cases do not
// depend on a live endpoint (per the leaf's testing contract). Radix Selects are
// not driven directly (portal/pointer semantics are unreliable in happy-dom);
// field values are seeded via `initialValues` and navigation uses the plain
// Next/Back buttons.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ApiClientError } from "../../../core/admin/services/apiClient";

const updateSettings = vi.fn(async (_payload: unknown) => ({}) as Record<string, unknown>);

vi.mock("@/services/settingsClient", () => ({
  updateSettings: (payload: unknown) => updateSettings(payload),
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

// Import after the mocks are registered.
const { SetupWizard } = await import("../../../core/admin/ui/setup/SetupWizard");
type WizardValues = import("../../../core/admin/ui/setup/wizardSteps").WizardValues;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noopSubmit = async () => undefined;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath="/admin">{node}</AdminRouterProvider>);
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

// identity -> branding -> locale -> timezone -> urls
const advanceToUrls = () => {
  clickButton("Next");
  clickButton("Next");
  clickButton("Next");
  clickButton("Next");
};

const validUrlValues: Partial<WizardValues> = {
  publicBaseUrl: "https://example.com",
  adminBaseUrl: "https://admin.example.com",
};

afterEach(() => {
  document.body.innerHTML = "";
  updateSettings.mockReset();
  updateSettings.mockResolvedValue({});
  vi.restoreAllMocks();
});

test("the timezone step renders and its default is carried into the settings payload", () => {
  const { container, cleanup } = mount(<SetupWizard onSubmit={noopSubmit} />);
  try {
    clickButton("Next"); // branding
    clickButton("Next"); // locale
    clickButton("Next"); // timezone
    expect(container.textContent).toContain("Default display timezone.");
    expect(container.textContent).toContain("Timezone");
    // The timezone select is present (Radix trigger has the seeded id/value).
    expect(container.querySelector("#setup-site-timezone")).not.toBeNull();
  } finally {
    cleanup();
  }
});

test("advancing past the URLs step issues one bulk PATCH with site.timezone and the URL keys", async () => {
  const { cleanup } = mount(<SetupWizard onSubmit={noopSubmit} initialValues={validUrlValues} />);
  try {
    advanceToUrls();
    // Leaving the URLs step flushes the Basic settings.
    clickButton("Next");
    await flush();

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith({
      "site.name": "Coderso",
      "site.locale": "en",
      "site.timezone": "UTC",
      "site.publicBaseUrl": "https://example.com",
      "site.adminBaseUrl": "https://admin.example.com",
    });
  } finally {
    cleanup();
  }
});

test("an invalid URL blocks Next and never issues a PATCH", () => {
  const { cleanup } = mount(
    <SetupWizard onSubmit={noopSubmit} initialValues={{ publicBaseUrl: "not a url" }} />
  );
  try {
    advanceToUrls();
    const next = findButton("Next");
    expect(next?.disabled).toBe(true);
    expect(updateSettings).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

test("a server settings_value_invalid surfaces inline and does not advance", async () => {
  updateSettings.mockRejectedValueOnce(
    new ApiClientError("settings_value_invalid", "Invalid setting value", 400)
  );
  const { container, cleanup } = mount(
    <SetupWizard onSubmit={noopSubmit} initialValues={validUrlValues} />
  );
  try {
    advanceToUrls();
    clickButton("Next");
    await flush();

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Invalid setting value");
    // Still on the URLs step (did not advance to starter content).
    expect(container.textContent).toContain("Public and admin base URLs.");
    expect(container.textContent).not.toContain("Optionally seed pages and menus from a kit.");
  } finally {
    cleanup();
  }
});
