// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const wizardState = vi.hoisted(() => ({
  updateSettingsError: null as unknown,
  updateSettings: vi.fn(async () => {
    if (wizardState.updateSettingsError) throw wizardState.updateSettingsError;
    return { ok: true };
  }),
  reset() {
    wizardState.updateSettingsError = null;
    wizardState.updateSettings.mockClear();
  },
}));

vi.mock("@/services/settingsClient", () => ({
  updateSettings: wizardState.updateSettings,
}));

const { hoistedStepStub } = vi.hoisted(() => ({
  hoistedStepStub: (testId: string) =>
    function StepStub() {
      return <div data-testid={testId} />;
    },
}));

// Stub every concrete step body: the shell contract under test is navigation,
// gating, the bulk commit on the urls step, and finalize. Each stub records the
// values slice it received so patching is observable.
vi.mock("../../../core/admin/ui/setup/steps/IdentityStep", () => ({
  IdentityStep: ({ values }: { values: { siteName: string } }) => (
    <input
      data-testid="stub-identity"
      id="stub-identity"
      defaultValue={values.siteName}
      aria-label="site name"
    />
  ),
}));

vi.mock("../../../core/admin/ui/setup/steps/BrandingStep", () => ({
  BrandingStep: hoistedStepStub("stub-branding"),
}));
vi.mock("../../../core/admin/ui/setup/steps/LocaleStep", () => ({
  LocaleStep: hoistedStepStub("stub-locale"),
}));
vi.mock("../../../core/admin/ui/setup/steps/TimezoneStep", () => ({
  TimezoneStep: hoistedStepStub("stub-timezone"),
}));
vi.mock("../../../core/admin/ui/setup/steps/UrlsStep", () => ({
  UrlsStep: ({ values }: { values: { publicBaseUrl: string } }) => (
    <div data-testid="stub-urls" data-url={values.publicBaseUrl} />
  ),
}));
vi.mock("../../../core/admin/ui/setup/steps/StarterContentStep", () => ({
  StarterContentStep: hoistedStepStub("stub-starter-content"),
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/EmailStep", () => ({
  EmailStep: hoistedStepStub("stub-email"),
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/StorageStep", () => ({
  StorageStep: hoistedStepStub("stub-storage"),
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/SecurityStep", () => ({
  SecurityStep: hoistedStepStub("stub-security"),
}));
vi.mock("../../../core/admin/ui/setup/steps/advanced/AssistantStep", () => ({
  AssistantStep: hoistedStepStub("stub-assistant"),
}));
vi.mock("@/ui/shared/AdminColorModeToggle", () => ({
  AdminColorModeToggle: () => <div data-testid="color-toggle" />,
}));

import { SetupWizard } from "../../../core/admin/ui/setup/SetupWizard";

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
    (candidate) => candidate.textContent?.trim() === label || candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

const clickRailStep = (container: HTMLElement, title: string) => {
  const button = Array.from(
    container.querySelectorAll("nav[aria-label='Setup steps'] button")
  ).find((candidate) => candidate.textContent?.includes(title));
  if (!button) throw new Error(`missing rail step ${title}`);
  React.act(() => {
    (button as HTMLElement).click();
  });
};

const activeTitle = (container: HTMLElement): string => {
  const current = container.querySelector("nav[aria-label='Setup steps'] [aria-current='step']");
  return current?.textContent ?? "";
};

afterEach(() => {
  wizardState.reset();
  document.body.innerHTML = "";
});

describe("SetupWizard shell", () => {
  it("starts on site identity and shows only basic-track rail steps", () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    expect(view.container.textContent).toContain("Set up Coderso");
    expect(view.container.querySelector("[data-testid='stub-identity']")).not.toBeNull();
    const rail = view.container.querySelector("nav[aria-label='Setup steps']")!.textContent!;
    expect(rail).toContain("Site identity");
    expect(rail).not.toContain("Email");
    expect(view.container.querySelector("[data-testid='color-toggle']")).not.toBeNull();
    view.unmount();
  });

  it("navigates forward through the basic track with Back enabled after moving", async () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    clickButtonWithText(view.container, "Next");
    expect(activeTitle(view.container)).toContain("Branding");
    clickButtonWithText(view.container, "Back");
    expect(activeTitle(view.container)).toContain("Site identity");
    // Back is disabled at the very start again
    const back = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Back")
    ) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    view.unmount();
  });

  it("renders the locale and timezone step bodies via the rail", () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    clickRailStep(view.container, "Locale");
    expect(activeTitle(view.container)).toContain("Locale");
    expect(view.container.querySelector("[data-testid='stub-locale']")).not.toBeNull();

    clickRailStep(view.container, "Timezone");
    expect(activeTitle(view.container)).toContain("Timezone");
    expect(view.container.querySelector("[data-testid='stub-timezone']")).not.toBeNull();
    view.unmount();
  });

  it("shows Saving... and disables navigation while the settings commit is in flight", async () => {
    let releaseCommit: (() => void) | undefined;
    wizardState.updateSettings.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseCommit = () => resolve({ ok: true } as never);
        })
    );

    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    clickRailStep(view.container, "URLs");
    await flushEffects();

    clickButtonWithText(view.container, "Next");
    await flushEffects();

    expect(view.container.textContent).toContain("Saving...");
    // the whole chrome is busy: Back, Next, and the advanced switch are disabled
    const back = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Back")
    ) as HTMLButtonElement;
    const primary = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Saving...")
    ) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    expect(primary.disabled).toBe(true);
    const toggle = view.container.querySelector<HTMLElement>(
      "[role='switch'][aria-label='Advanced setup']"
    ) as HTMLButtonElement | null;
    expect(toggle?.disabled).toBe(true);

    releaseCommit?.();
    await flushEffects();
    expect(wizardState.updateSettings).toHaveBeenCalledTimes(1);
    // the commit resolved, so Next is live again and we advanced to starter content
    expect(view.container.querySelector("[data-testid='stub-starter-content']")).not.toBeNull();
    view.unmount();
  });

  it("reveals advanced steps via the Advanced switch and jumps by rail", () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    const toggle = view.container.querySelector<HTMLElement>(
      "[role='switch'][aria-label='Advanced setup']"
    ) as HTMLElement | null;
    if (!toggle) throw new Error("missing advanced switch");
    React.act(() => {
      (toggle as HTMLElement).click();
    });
    const rail = view.container.querySelector("nav[aria-label='Setup steps']")!.textContent!;
    expect(rail).toContain("Email");
    expect(rail).toContain("Assistant");

    clickRailStep(view.container, "Storage");
    expect(view.container.querySelector("[data-testid='stub-storage']")).not.toBeNull();

    // every advanced registry entry resolves its concrete stub body
    clickRailStep(view.container, "Email");
    expect(view.container.querySelector("[data-testid='stub-email']")).not.toBeNull();
    clickRailStep(view.container, "Security");
    expect(view.container.querySelector("[data-testid='stub-security']")).not.toBeNull();
    clickRailStep(view.container, "Assistant");
    expect(view.container.querySelector("[data-testid='stub-assistant']")).not.toBeNull();
    view.unmount();
  });

  it("commits bulk basic settings once when leaving the URLs step", async () => {
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    clickRailStep(view.container, "URLs");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='stub-urls']")).not.toBeNull();

    clickButtonWithText(view.container, "Next");
    await flushEffects();

    expect(wizardState.updateSettings).toHaveBeenCalledTimes(1);
    expect(wizardState.updateSettings).toHaveBeenCalledWith({
      "site.name": "Coderso",
      "site.locale": "en",
      "site.timezone": "UTC",
      "site.publicBaseUrl": null,
      "site.adminBaseUrl": null,
    });
    // advanced past urls into starter content
    expect(view.container.querySelector("[data-testid='stub-starter-content']")).not.toBeNull();
    view.unmount();
  });

  it("surfaces a server commit failure inline without advancing", async () => {
    wizardState.updateSettingsError = Object.assign(new Error("settings"), {
      name: "ApiClientError",
    });
    const view = mount(<SetupWizard onSubmit={() => undefined} />);
    clickRailStep(view.container, "URLs");
    await flushEffects();

    clickButtonWithText(view.container, "Next");
    await flushEffects();

    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(
      "Failed to save your settings. Please try again."
    );
    // still on the urls step; Next stays available for a retry
    expect(view.container.querySelector("[data-testid='stub-urls']")).not.toBeNull();
    view.unmount();
  });

  it("Finish setup submits the final values to the caller", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const view = mount(<SetupWizard initialValues={{ siteName: "My Site" }} onSubmit={onSubmit} />);
    clickRailStep(view.container, "Starter content");
    await flushEffects();

    clickButtonWithText(view.container, "Finish setup");
    await flushEffects();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0] as unknown as [Record<string, unknown>])[0]).toMatchObject({
      siteName: "My Site",
      siteLocale: "en",
      siteTimezone: "UTC",
    });
    view.unmount();
  });

  it("shows the destructive setup-error banner for caller errors", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const view = mount(<SetupWizard onSubmit={onSubmit} error="Server offline" />);
    await flushEffects();
    expect(view.container.textContent).toContain("Server offline");
    // while saving on the final step the primary button reads Finishing...
    clickRailStep(view.container, "Starter content");
    const finishing = mount(<SetupWizard onSubmit={onSubmit} isSaving />);
    clickRailStep(finishing.container, "Starter content");
    expect(finishing.container.textContent).toContain("Finishing...");
    view.unmount();
    finishing.unmount();
  });
});
