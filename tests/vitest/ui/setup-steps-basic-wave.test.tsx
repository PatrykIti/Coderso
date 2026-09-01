// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09, setup-core cluster): behavioral coverage for the four
// Basic-track step bodies that sat at 0%. Each step is a controlled component:
// it reads the shared `WizardValues` and pushes changes back through `onPatch`
// (mapped to the wizard reducer's `patch` action by SetupWizard). The assertions
// below exercise the visible effect (rendered label/hint, aria state, disabled)
// and the exact patch payload the shell would receive.
//
// The Radix-based `@/components/ui/select` is swapped for a native <select>
// (the house pattern used by setup-advanced-steps.test.tsx) so locale/timezone
// selection is driven through a real DOM change event.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="setup-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// Steps outside the four covered here are stubbed so the real SetupWizard can be
// rendered in the integration case below without pulling in the advanced track.
vi.mock("../../../core/admin/ui/setup/steps/BrandingStep", () => ({
  BrandingStep: () => <div data-testid="stub-branding" />,
}));
vi.mock("../../../core/admin/ui/setup/steps/StarterContentStep", () => ({
  StarterContentStep: () => <div data-testid="stub-starter-content" />,
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/EmailStep", () => ({
  EmailStep: () => <div data-testid="stub-email" />,
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/StorageStep", () => ({
  StorageStep: () => <div data-testid="stub-storage" />,
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/SecurityStep", () => ({
  SecurityStep: () => <div data-testid="stub-security" />,
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/AssistantStep", () => ({
  AssistantStep: () => <div data-testid="stub-assistant" />,
}));
vi.mock("@/ui/shared/AdminColorModeToggle", () => ({
  AdminColorModeToggle: () => <div data-testid="stub-color-toggle" />,
}));
vi.mock("@/services/settingsClient", () => ({
  updateSettings: vi.fn(async () => ({ ok: true })),
}));

import { IdentityStep } from "../../../core/admin/ui/setup/steps/IdentityStep";
import { LocaleStep } from "../../../core/admin/ui/setup/steps/LocaleStep";
import { TimezoneStep } from "../../../core/admin/ui/setup/steps/TimezoneStep";
import { UrlsStep } from "../../../core/admin/ui/setup/steps/UrlsStep";
import { SetupWizard } from "../../../core/admin/ui/setup/SetupWizard";
import { WIZARD_DEFAULT_VALUES, type WizardValues } from "../../../core/admin/ui/setup/wizardSteps";

const baseValues = (overrides: Partial<WizardValues> = {}): WizardValues => ({
  ...WIZARD_DEFAULT_VALUES,
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

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const chooseOption = (select: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) setter.call(select, value);
  React.act(() => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("IdentityStep", () => {
  it("renders the site-name control and patches on change", () => {
    const onPatch = vi.fn();
    const view = mount(
      <IdentityStep values={baseValues({ siteName: "My Site" })} onPatch={onPatch} />
    );

    const label = Array.from(view.container.querySelectorAll("label")).find(
      (candidate) => candidate.textContent === "Site name"
    );
    expect(label).toBeDefined();
    expect(label!.getAttribute("for")).toBe("setup-site-name");
    expect(view.container.textContent).toContain("Shown across the admin");

    const input = view.container.querySelector<HTMLInputElement>("#setup-site-name");
    expect(input).not.toBeNull();
    expect(input!.value).toBe("My Site");
    expect(input!.getAttribute("autoComplete")).toBe("off");

    setInputValue(input!, "Renamed Site");
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ siteName: "Renamed Site" });
    view.unmount();
  });

  it("disables the input while the wizard is busy", () => {
    const view = mount(<IdentityStep values={baseValues()} onPatch={() => undefined} disabled />);
    expect(view.container.querySelector<HTMLInputElement>("#setup-site-name")!.disabled).toBe(true);
    view.unmount();
  });
});

describe("LocaleStep", () => {
  it("renders every curated locale and patches the selected value", () => {
    const onPatch = vi.fn();
    const view = mount(<LocaleStep values={baseValues({ siteLocale: "en" })} onPatch={onPatch} />);

    expect(view.container.textContent).toContain("Primary locale");
    const select = view.container.querySelector<HTMLSelectElement>(
      "select[data-testid='setup-select']"
    );
    expect(select).not.toBeNull();
    expect(select!.value).toBe("en");

    const options = Array.from(select!.options).map((option) => option.value);
    expect(options).toEqual(["en", "en-US", "en-GB", "pl-PL", "fr-FR", "de-DE"]);

    chooseOption(select!, "pl-PL");
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ siteLocale: "pl-PL" });
    view.unmount();
  });

  it("disables the locale select while the wizard is busy", () => {
    const view = mount(<LocaleStep values={baseValues()} onPatch={() => undefined} disabled />);
    expect(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='setup-select']")!
        .disabled
    ).toBe(true);
    view.unmount();
  });
});

describe("TimezoneStep", () => {
  it("renders the curated IANA zones and patches the selected value", () => {
    const onPatch = vi.fn();
    const view = mount(
      <TimezoneStep values={baseValues({ siteTimezone: "UTC" })} onPatch={onPatch} />
    );

    expect(view.container.textContent).toContain("Timezone");
    const select = view.container.querySelector<HTMLSelectElement>(
      "select[data-testid='setup-select']"
    );
    expect(select).not.toBeNull();
    expect(select!.value).toBe("UTC");

    const options = Array.from(select!.options).map((option) => option.value);
    expect(options).toContain("Europe/Warsaw");
    expect(options).toContain("America/New_York");
    expect(options).toContain("Asia/Tokyo");
    expect(options).toContain("Australia/Sydney");

    chooseOption(select!, "Asia/Tokyo");
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ siteTimezone: "Asia/Tokyo" });
    view.unmount();
  });

  it("disables the timezone select while the wizard is busy", () => {
    const view = mount(<TimezoneStep values={baseValues()} onPatch={() => undefined} disabled />);
    expect(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='setup-select']")!
        .disabled
    ).toBe(true);
    view.unmount();
  });
});

describe("UrlsStep", () => {
  it("renders both URL fields and patches each independently", () => {
    const onPatch = vi.fn();
    const view = mount(
      <UrlsStep
        values={baseValues({
          publicBaseUrl: "https://example.com",
          adminBaseUrl: "https://admin.example.com",
        })}
        onPatch={onPatch}
      />
    );

    const publicInput = view.container.querySelector<HTMLInputElement>("#setup-public-url");
    const adminInput = view.container.querySelector<HTMLInputElement>("#setup-admin-url");
    expect(publicInput).not.toBeNull();
    expect(adminInput).not.toBeNull();
    expect(publicInput!.value).toBe("https://example.com");
    expect(adminInput!.value).toBe("https://admin.example.com");
    expect(publicInput!.getAttribute("inputMode")).toBe("url");
    expect(adminInput!.getAttribute("inputMode")).toBe("url");

    setInputValue(publicInput!, "https://public.example.com");
    expect(onPatch).toHaveBeenCalledWith({ publicBaseUrl: "https://public.example.com" });

    setInputValue(adminInput!, "https://admin2.example.com");
    expect(onPatch).toHaveBeenCalledWith({ adminBaseUrl: "https://admin2.example.com" });
    expect(onPatch).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("shows helper hints and no invalid state for well-formed values", () => {
    const view = mount(
      <UrlsStep
        values={baseValues({ publicBaseUrl: "", adminBaseUrl: "" })}
        onPatch={() => undefined}
      />
    );

    expect(view.container.textContent).toContain(
      "Where visitors reach your site (optional). Example: https://example.com"
    );
    expect(view.container.textContent).toContain(
      "The origin used to reach the admin panel (optional). Example: https://admin.example.com"
    );
    expect(
      view.container
        .querySelector<HTMLInputElement>("#setup-public-url")!
        .getAttribute("aria-invalid")
    ).toBeNull();
    expect(
      view.container
        .querySelector<HTMLInputElement>("#setup-admin-url")!
        .getAttribute("aria-invalid")
    ).toBeNull();
    view.unmount();
  });

  it("marks a malformed public URL invalid and surfaces the validation hint", () => {
    const view = mount(
      <UrlsStep
        values={baseValues({ publicBaseUrl: "::bad", adminBaseUrl: "" })}
        onPatch={() => undefined}
      />
    );

    const publicInput = view.container.querySelector<HTMLInputElement>("#setup-public-url");
    const adminInput = view.container.querySelector<HTMLInputElement>("#setup-admin-url");
    expect(publicInput!.getAttribute("aria-invalid")).toBe("true");
    expect(view.container.textContent).toContain(
      "Enter a valid URL (for example: https://example.com)"
    );
    // the admin field stays clean
    expect(adminInput!.getAttribute("aria-invalid")).toBeNull();
    expect(view.container.textContent).toContain(
      "The origin used to reach the admin panel (optional). Example: https://admin.example.com"
    );
    view.unmount();
  });

  it("marks a non-http(s) admin URL invalid and surfaces the scheme hint", () => {
    const view = mount(
      <UrlsStep
        values={baseValues({ publicBaseUrl: "", adminBaseUrl: "javascript:alert(1)" })}
        onPatch={() => undefined}
      />
    );

    const adminInput = view.container.querySelector<HTMLInputElement>("#setup-admin-url");
    expect(adminInput!.getAttribute("aria-invalid")).toBe("true");
    expect(view.container.textContent).toContain("Admin URL must use http or https.");
    expect(
      view.container
        .querySelector<HTMLInputElement>("#setup-public-url")!
        .getAttribute("aria-invalid")
    ).toBeNull();
    view.unmount();
  });

  it("disables both URL inputs while the wizard is busy", () => {
    const view = mount(<UrlsStep values={baseValues()} onPatch={() => undefined} disabled />);
    expect(view.container.querySelector<HTMLInputElement>("#setup-public-url")!.disabled).toBe(
      true
    );
    expect(view.container.querySelector<HTMLInputElement>("#setup-admin-url")!.disabled).toBe(true);
    view.unmount();
  });
});

describe("SetupWizard with real basic steps", () => {
  it("patches a real step field through the wizard reducer", () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);

    // the wizard boots into the real identity step, not a stub
    const input = view.container.querySelector<HTMLInputElement>("#setup-site-name");
    expect(input).not.toBeNull();
    expect(input!.value).toBe("Coderso");

    setInputValue(input!, "Renamed through wizard");
    // the controlled value round-trips through the reducer's patch action
    expect(view.container.querySelector<HTMLInputElement>("#setup-site-name")!.value).toBe(
      "Renamed through wizard"
    );

    // Back is disabled on the first step; the real select is used once we move on
    const back = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Back")
    ) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    view.unmount();
  });

  it("reaches the real locale and timezone steps and patches their selects", () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);

    const goToRail = (title: string) => {
      const button = Array.from(
        view.container.querySelectorAll("nav[aria-label='Setup steps'] button")
      ).find((candidate) => candidate.textContent?.includes(title));
      if (!button) throw new Error(`missing rail step ${title}`);
      React.act(() => {
        (button as HTMLElement).click();
      });
    };

    goToRail("Locale");
    const localeSelect = view.container.querySelector<HTMLSelectElement>(
      "select[data-testid='setup-select']"
    );
    expect(localeSelect).not.toBeNull();
    expect(localeSelect!.value).toBe("en");
    chooseOption(localeSelect!, "pl-PL");
    expect(localeSelect!.value).toBe("pl-PL");

    goToRail("Timezone");
    const timezoneSelect = view.container.querySelector<HTMLSelectElement>(
      "select[data-testid='setup-select']"
    );
    expect(timezoneSelect).not.toBeNull();
    expect(timezoneSelect!.value).toBe("UTC");
    chooseOption(timezoneSelect!, "Europe/Warsaw");
    expect(timezoneSelect!.value).toBe("Europe/Warsaw");
    view.unmount();
  });
});
