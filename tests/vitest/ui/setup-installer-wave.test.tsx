// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const installState = vi.hoisted(() => ({
  result: { user: { id: "user-1", email: "ada@example.com", name: "Ada" } } as unknown,
  createInstallAdmin: vi.fn(async () => {
    if (installState.result instanceof Error) throw installState.result;
    return installState.result;
  }),
  reset() {
    installState.result = { user: { id: "user-1", email: "ada@example.com", name: "Ada" } };
    installState.createInstallAdmin.mockClear();
  },
}));

vi.mock("@/services/installClient", () => ({
  createInstallAdmin: installState.createInstallAdmin,
}));

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { InstallerWizard } from "../../../core/admin/ui/setup/InstallerWizard";

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

const setValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const clickButtonWithLabel = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

function fill(container: HTMLElement, values: Record<string, string>) {
  for (const [id, value] of Object.entries(values)) {
    const input = container.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`missing #${id}`);
    setValue(input, value);
  }
}

function submit(container: HTMLElement) {
  React.act(() => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

afterEach(() => {
  installState.reset();
  document.body.innerHTML = "";
});

describe("InstallerWizard", () => {
  it("renders the admin account form with a weak default strength meter", () => {
    const view = mount(<InstallerWizard onInstalled={() => undefined} />);
    expect(view.container.textContent).toContain("Create your admin account");
    expect(view.container.querySelector<HTMLInputElement>("#installer-name")).not.toBeNull();
    expect(view.container.querySelector<HTMLInputElement>("#installer-password")!.type).toBe(
      "password"
    );
    // submit is disabled while validation fails (empty required fields)
    const submitButton = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Create admin account"
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(view.container.textContent).toContain("Weak");
    view.unmount();
  });

  it("toggles password visibility for both secret fields", () => {
    const view = mount(<InstallerWizard onInstalled={() => undefined} />);
    clickButtonWithLabel(view.container, "Show password");
    expect(view.container.querySelector<HTMLInputElement>("#installer-password")!.type).toBe(
      "text"
    );
    expect(
      (view.container.querySelector(
        "button[aria-label='Hide password']"
      ) as HTMLButtonElement | null)
        ? true
        : false
    ).toBe(true);

    clickButtonWithLabel(view.container, "Show confirm password");
    expect(view.container.querySelector<HTMLInputElement>("#installer-confirm")!.type).toBe("text");
    view.unmount();
  });

  it.each([
    [{ password: "12345678", confirm: "87654321" }, "Passwords do not match."],
    [{ password: "short", confirm: "short" }, "Password must be at least 8 characters."],
    [
      { email: "bad-email", password: "12345678", confirm: "12345678" },
      "Enter a valid email address.",
    ],
  ])("blocks submit and surfaces the validation error %#", async (fields, expectedError) => {
    const onInstalled = vi.fn();
    const view = mount(<InstallerWizard onInstalled={onInstalled} />);
    fill(view.container, {
      "installer-name": "Ada",
      "installer-email": "ada@example.com",
      ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [`installer-${k}`, v])),
    });
    submit(view.container);
    await flushEffects();

    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(expectedError);
    expect(installState.createInstallAdmin).not.toHaveBeenCalled();
    expect(onInstalled).not.toHaveBeenCalled();
    view.unmount();
  });

  it("creates the admin with trimmed fields and reports success", async () => {
    const onInstalled = vi.fn();
    const view = mount(<InstallerWizard onInstalled={onInstalled} />);
    fill(view.container, {
      "installer-name": "  Ada Lovelace ",
      "installer-email": " ada@example.com ",
      "installer-password": "Sup3r$ecret",
      "installer-confirm": "Sup3r$ecret",
    });

    expect(view.container.textContent).toContain("Strong");
    submit(view.container);

    // saving state is visible while the promise is in flight
    expect(
      Array.from(view.container.querySelectorAll("button")).some(
        (candidate) => candidate.textContent === "Creating account..."
      )
    ).toBe(true);
    await flushEffects();

    expect(installState.createInstallAdmin).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Sup3r$ecret",
    });
    expect(onInstalled).toHaveBeenCalledWith({
      id: "user-1",
      email: "ada@example.com",
      name: "Ada",
    });
    view.unmount();
  });

  it.each([
    [
      new ApiClientError("install_unavailable", "conflict", 409),
      "This site is already set up. Please log in instead.",
    ],
    [
      new ApiClientError("rate_limited", "slow down", 429),
      "Too many attempts. Please wait a moment and try again.",
    ],
    [
      new ApiClientError("install_admin_invalid", "bad request", 400),
      "Some details are invalid. Please review the form and try again.",
    ],
    [new ApiClientError("other_code", "weird failure", 500), "weird failure"],
    [new Error("network down"), "Unable to create your admin account. Please try again."],
  ])("maps client failures to human copy %#", async (failure, expectedMessage) => {
    installState.result = failure;
    const onInstalled = vi.fn();
    const view = mount(<InstallerWizard onInstalled={onInstalled} />);
    fill(view.container, {
      "installer-name": "Ada",
      "installer-email": "ada@example.com",
      "installer-password": "Sup3r$ecret",
      "installer-confirm": "Sup3r$ecret",
    });
    submit(view.container);
    await flushEffects();

    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(expectedMessage);
    expect(onInstalled).not.toHaveBeenCalled();
    // saving flag resets after the failure so the form can be retried
    expect(
      Array.from(view.container.querySelectorAll("button")).some(
        (candidate) => candidate.textContent === "Create admin account"
      )
    ).toBe(true);
    view.unmount();
  });
});
