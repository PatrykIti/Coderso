// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const installClientMocks = vi.hoisted(() => ({
  createInstallAdmin: vi.fn(),
  getInstallStatus: vi.fn(async () => ({ available: true })),
}));

vi.mock("@/services/installClient", () => ({
  createInstallAdmin: installClientMocks.createInstallAdmin,
  getInstallStatus: installClientMocks.getInstallStatus,
}));

import { InstallerWizard } from "../../../core/admin/ui/setup/InstallerWizard";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MountResult = {
  container: HTMLElement;
  cleanup: () => void;
};

let active: MountResult | null = null;

const mount = (onInstalled = vi.fn()) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<InstallerWizard onInstalled={onInstalled} />);
  });
  active = {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
  return { container, onInstalled };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setInput = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const fillForm = (
  container: HTMLElement,
  values: { name: string; email: string; password: string; confirm: string }
) => {
  setInput(container.querySelector<HTMLInputElement>("#installer-name")!, values.name);
  setInput(container.querySelector<HTMLInputElement>("#installer-email")!, values.email);
  setInput(container.querySelector<HTMLInputElement>("#installer-password")!, values.password);
  setInput(container.querySelector<HTMLInputElement>("#installer-confirm")!, values.confirm);
};

const submitButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>("button[type='submit']")!;

const submitForm = async (container: HTMLElement) => {
  const form = container.querySelector<HTMLFormElement>("form")!;
  await React.act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  installClientMocks.getInstallStatus.mockResolvedValue({ available: true });
});

afterEach(() => {
  active?.cleanup();
  active = null;
});

test("blocks submit while the form is invalid (empty + short password + email shape)", () => {
  const { container } = mount();
  // Empty form → disabled.
  expect(submitButton(container).disabled).toBe(true);

  // Bad email + short password → still disabled.
  fillForm(container, {
    name: "Ada",
    email: "not-an-email",
    password: "short",
    confirm: "short",
  });
  expect(submitButton(container).disabled).toBe(true);
});

test("blocks submit when the confirmation does not match", async () => {
  const { container } = mount();
  fillForm(container, {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "sup3rSecret!",
    confirm: "different!",
  });
  expect(submitButton(container).disabled).toBe(true);

  await submitForm(container);
  expect(installClientMocks.createInstallAdmin).not.toHaveBeenCalled();
});

test("password strength feedback reflects the input", () => {
  const { container } = mount();
  // Weak: length only, no number/special.
  fillForm(container, {
    name: "Ada",
    email: "ada@example.com",
    password: "abcdefgh",
    confirm: "abcdefgh",
  });
  expect(container.textContent).toContain("Weak");

  // Strong: length + number + special.
  fillForm(container, {
    name: "Ada",
    email: "ada@example.com",
    password: "abcdefg1!",
    confirm: "abcdefg1!",
  });
  expect(container.textContent).toContain("Strong");
  expect(container.textContent).toContain("At least 1 number");
  expect(container.textContent).toContain("At least 1 special character");
});

test("successful submit calls the install client with exactly {name,email,password} and fires onInstalled", async () => {
  const installedUser = { id: "user-1", email: "ada@example.com", name: "Ada Lovelace" };
  installClientMocks.createInstallAdmin.mockResolvedValue({ user: installedUser });
  const { container, onInstalled } = mount();

  fillForm(container, {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "sup3rSecret!",
    confirm: "sup3rSecret!",
  });
  expect(submitButton(container).disabled).toBe(false);

  await submitForm(container);

  expect(installClientMocks.createInstallAdmin).toHaveBeenCalledTimes(1);
  expect(installClientMocks.createInstallAdmin).toHaveBeenCalledWith({
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "sup3rSecret!",
  });
  expect(onInstalled).toHaveBeenCalledTimes(1);
  expect(onInstalled).toHaveBeenCalledWith(installedUser);
});

test("maps install_unavailable to the already-installed message", async () => {
  installClientMocks.createInstallAdmin.mockRejectedValue(
    new ApiClientError("install_unavailable", "Installation is not available", 409)
  );
  const { container, onInstalled } = mount();

  fillForm(container, {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "sup3rSecret!",
    confirm: "sup3rSecret!",
  });
  await submitForm(container);
  await flush();

  expect(container.textContent).toContain("already set up");
  expect(onInstalled).not.toHaveBeenCalled();
});

test("maps a 429 to a friendly too-many-attempts message", async () => {
  installClientMocks.createInstallAdmin.mockRejectedValue(
    new ApiClientError("rate_limited", "Too many requests", 429)
  );
  const { container } = mount();

  fillForm(container, {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "sup3rSecret!",
    confirm: "sup3rSecret!",
  });
  await submitForm(container);
  await flush();

  expect(container.textContent).toContain("Too many attempts");
});
