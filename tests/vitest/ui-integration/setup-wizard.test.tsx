// @vitest-environment happy-dom
//
// TASK-482-04-L02: the fixed 3-step SetupWizard body was replaced by the
// registry-driven multi-track shell (wizardMachine + wizardSteps). This rewrites
// the old file in place: the stale "First-run setup" / "Runtime URL" /
// "Security TTL" / fixed-"Next" assertions are gone. We re-assert the two
// behaviours the old file covered (the shell renders; the error banner renders
// with `error`) against the new markup, plus the shell's new navigation,
// validation gating, track toggle and finish behaviour.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SetupWizard } from "../../../core/admin/ui/setup/SetupWizard";
import type { WizardValues } from "../../../core/admin/ui/setup/wizardSteps";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock the Radix Switch to a controlled checkbox so the track toggle is
// deterministic in happy-dom (mirrors tests/vitest/ui/page-table-wave.test.tsx).
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("SetupWizard renders the multi-track shell on the first Basic step", () => {
  const html = renderAdminUi(<SetupWizard onSubmit={noopSubmit} />);

  expect(html).toContain("Set up Coderso");
  expect(html).toContain("Site identity");
  // step rail exposes the Basic steps
  expect(html).toContain("Locale");
  expect(html).toContain("URLs");
  // active step body shows the first step's description + a Next control
  expect(html).toContain("Name your site.");
  expect(html).toContain("Next");
  // legacy fixed-3-step chrome is gone
  expect(html).not.toContain("First-run setup");
  expect(html).not.toContain("Runtime URL");
  // Advanced steps hidden until the toggle is on
  expect(html).not.toContain("Session and reset token policy.");
});

test("SetupWizard renders the error banner with the server error", () => {
  const html = renderAdminUi(
    <SetupWizard onSubmit={noopSubmit} error="Failed to complete setup." />
  );

  expect(html).toContain("Setup error");
  expect(html).toContain("Failed to complete setup.");
});

test("Next advances forward and Back retreats through Basic steps", () => {
  const { container, cleanup } = mount(<SetupWizard onSubmit={noopSubmit} />);
  try {
    expect(container.textContent).toContain("Name your site.");

    clickButton("Next");
    expect(container.textContent).toContain("Upload a logo (optional).");
    expect(container.textContent).not.toContain("Name your site.");

    clickButton("Back");
    expect(container.textContent).toContain("Name your site.");
  } finally {
    cleanup();
  }
});

test("Next is disabled while the current step is invalid", () => {
  const { cleanup } = mount(<SetupWizard onSubmit={noopSubmit} initialValues={{ siteName: "" }} />);
  try {
    const next = findButton("Next");
    expect(next?.disabled).toBe(true);
  } finally {
    cleanup();
  }
});

test("the Advanced toggle reveals the advanced steps", () => {
  const { container, cleanup } = mount(<SetupWizard onSubmit={noopSubmit} />);
  try {
    expect(container.textContent).not.toContain("Security");
    expect(container.textContent).not.toContain("Assistant");

    const toggle = document.body.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!toggle) throw new Error("missing advanced toggle");
    React.act(() => {
      toggle.click();
    });

    expect(container.textContent).toContain("Security");
    expect(container.textContent).toContain("Assistant");
  } finally {
    cleanup();
  }
});

test("the last step's primary control submits the full WizardValues", () => {
  const onSubmit = vi.fn<(values: WizardValues) => void>();
  const { cleanup } = mount(<SetupWizard onSubmit={onSubmit} />);
  try {
    // jump to the last Basic step via the rail, then finish
    clickButton("Starter content");
    clickButton("Finish setup");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.siteName).toBe("Coderso");
    expect(values.siteTimezone).toBe("UTC");
    expect(values.adminBaseUrl).toBe("");
    expect(values.logoId).toBeNull();
  } finally {
    cleanup();
  }
});
