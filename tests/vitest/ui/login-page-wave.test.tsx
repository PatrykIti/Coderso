// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import type { BotProtectionConfig } from "../../../core/admin/services/authClient";
import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";

const authState = vi.hoisted(() => ({
  botConfig: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    enforceOnLocalhost: true,
  } as BotProtectionConfig | null,
  botError: null as unknown,
  loginResult: "ok" as "ok" | "api-error" | "generic-error" | "pending",
  apiError: {
    kind: "api",
    message: "Invalid credentials.",
    fieldErrors: { email: "Unknown email", password: "Wrong password" },
  },
  getAuthBotProtection: vi.fn(async () => authState.botConfig),
  login: vi.fn(async () => {
    if (authState.loginResult === "pending") {
      return new Promise(() => undefined);
    }
    if (authState.loginResult === "api-error") throw authState.apiError;
    if (authState.loginResult === "generic-error") throw new Error("boom");
    return { ok: true };
  }),
  toFieldErrors: vi.fn((error: unknown) => {
    const fields = (error as { fieldErrors?: Record<string, string> }).fieldErrors;
    return typeof fields === "object" && fields !== null ? fields : {};
  }),
  executeRecaptcha: vi.fn(async () => "captcha-token"),
  preloadRecaptcha: vi.fn(async () => undefined),
  reset() {
    authState.botConfig = {
      enabled: false,
      provider: "recaptcha_v3",
      siteKey: null,
      enforceOnLocalhost: true,
    };
    authState.botError = null;
    authState.loginResult = "ok";
    authState.getAuthBotProtection.mockClear();
    authState.login.mockClear();
    authState.toFieldErrors.mockClear();
    authState.executeRecaptcha.mockClear();
    authState.preloadRecaptcha.mockClear();
  },
}));

vi.mock("@/services/authClient", () => ({
  getAuthBotProtection: () => {
    if (authState.botError) return Promise.reject(authState.botError);
    return authState.getAuthBotProtection().then(
      (config) =>
        config ?? {
          enabled: false,
          provider: "recaptcha_v3",
          siteKey: null,
          enforceOnLocalhost: true,
        }
    );
  },
  login: authState.login,
  toFieldErrors: authState.toFieldErrors,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/ui/auth/recaptcha", () => ({
  executeRecaptcha: authState.executeRecaptcha,
  preloadRecaptcha: authState.preloadRecaptcha,
}));

vi.mock("@/ui/auth/SsoButtons", () => ({ SsoButtons: () => <div data-testid="sso" /> }));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="submit" disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) => (
    <input
      {...props}
      value={value}
      onChange={(event) => onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)}
    />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id: string;
  }) => (
    <button
      id={id}
      type="button"
      role="checkbox"
      data-testid="remember-checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked ? "on" : "off"}
    </button>
  ),
}));

function renderLoginPage(props?: { initialEmail?: string; initialError?: string }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<LoginPage {...props} />);
  });
  return { container, unmount: () => React.act(() => root.unmount()) };
}

async function flushEffects() {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function fillAndSubmit(
  container: HTMLElement,
  values: { email?: string; password?: string } = {}
) {
  const setValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, value);
    React.act(() => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const email = container.querySelector<HTMLInputElement>("#email");
  const password = container.querySelector<HTMLInputElement>("#password");
  if (values.email !== undefined && email) setValue(email, values.email);
  if (values.password !== undefined && password) setValue(password, values.password);
  React.act(() => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flushEffects();
}

const originalAssign = window.location.assign;

afterEach(() => {
  authState.reset();
  document.body.innerHTML = "";
  window.location.assign = originalAssign;
});

test("renders initial props and canonical reset link without submitting", async () => {
  let redirected = false;
  window.location.assign = (() => {
    redirected = true;
  }) as unknown as typeof window.location.assign;

  const { container, unmount } = renderLoginPage({
    initialEmail: "a@b.c",
    initialError: "Locked out",
  });
  await flushEffects();

  expect(container.querySelector("[data-testid='sso']")).not.toBeNull();
  expect(container.textContent).toContain("Welcome back");
  expect(container.querySelector<HTMLInputElement>("#email")!.value).toBe("a@b.c");
  expect(container.textContent).toContain("Locked out");
  expect(container.querySelector("a[href='/admin/reset']")).not.toBeNull();
  expect(authState.login).not.toHaveBeenCalled();
  expect(redirected).toBe(false);
  unmount();
});

test("successful login posts credentials and redirects to admin base", async () => {
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  const { container, unmount } = renderLoginPage();
  await fillAndSubmit(container, { email: "user@example.com", password: "secret" });

  expect(authState.login).toHaveBeenCalledWith({
    email: "user@example.com",
    password: "secret",
    captchaToken: undefined,
  });
  expect(assigned).toEqual(["/admin/"]);
  unmount();
});

test("bot protection enabled executes recaptcha and sends the token", async () => {
  authState.botConfig = {
    enabled: true,
    provider: "recaptcha_v3",
    siteKey: "site-key-1",
    enforceOnLocalhost: false,
  };
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  const { container, unmount } = renderLoginPage();
  // preload fires for enabled configs with a site key
  await flushEffects();
  expect(authState.preloadRecaptcha).toHaveBeenCalledWith("site-key-1");

  await fillAndSubmit(container, { email: "u@e.com", password: "p" });

  expect(authState.executeRecaptcha).toHaveBeenCalledWith("site-key-1", "login");
  expect(authState.login).toHaveBeenCalledWith({
    email: "u@e.com",
    password: "p",
    captchaToken: "captcha-token",
  });
  expect(assigned).toEqual(["/admin/"]);
  unmount();
});

test("enabled bot protection without a site key blocks submit with an error", async () => {
  authState.botConfig = {
    enabled: true,
    provider: "recaptcha_v3",
    siteKey: null,
    enforceOnLocalhost: false,
  };

  const { container, unmount } = renderLoginPage();
  await flushEffects();
  await fillAndSubmit(container, { email: "u@e.com", password: "p" });

  expect(authState.executeRecaptcha).not.toHaveBeenCalled();
  expect(authState.login).not.toHaveBeenCalled();
  expect(container.textContent).toContain("reCAPTCHA is enabled but missing the site key.");
  unmount();
});

test("api client error surfaces message plus per-field errors and aria-invalid", async () => {
  authState.loginResult = "api-error";

  const { container, unmount } = renderLoginPage();
  await fillAndSubmit(container, { email: "u@e.com", password: "p" });

  expect(authState.toFieldErrors).toHaveBeenCalledWith(authState.apiError);
  expect(container.textContent).toContain("Invalid credentials.");
  expect(container.textContent).toContain("Unknown email");
  expect(container.textContent).toContain("Wrong password");
  expect(container.querySelector<HTMLInputElement>("#email")!.getAttribute("aria-invalid")).toBe(
    "true"
  );
  expect(container.querySelector<HTMLInputElement>("#password")!.getAttribute("aria-invalid")).toBe(
    "true"
  );
  expect((container.querySelector("button[type='submit']") as HTMLButtonElement).disabled).toBe(
    false
  );
  unmount();
});

test("non-api failure falls back to the generic sign-in error", async () => {
  authState.loginResult = "generic-error";

  const { container, unmount } = renderLoginPage();
  await fillAndSubmit(container, { email: "u@e.com", password: "p" });

  expect(container.textContent).toContain("Unable to sign in. Please try again.");
  expect(container.textContent).not.toContain("Invalid credentials.");
  unmount();
});

test("submit enters a loading state until the promise resolves", async () => {
  authState.loginResult = "pending";

  const { container, unmount } = renderLoginPage();
  React.act(() => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flushEffects();

  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Signing in..."
  );
  expect(button).toBeDefined();
  expect((button as HTMLButtonElement).disabled).toBe(true);
  unmount();
});

test("bot protection fetch failure degrades to disabled mode and still logs in", async () => {
  authState.botError = new Error("config unreachable");
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  const { container, unmount } = renderLoginPage();
  await fillAndSubmit(container, { email: "u@e.com", password: "p" });

  expect(authState.executeRecaptcha).not.toHaveBeenCalled();
  expect(authState.login).toHaveBeenCalledTimes(1);
  expect(assigned).toEqual(["/admin/"]);
  unmount();
});

test("remember-me checkbox reflects user interaction", async () => {
  const { container, unmount } = renderLoginPage();

  const checkbox = container.querySelector<HTMLButtonElement>("#remember")!;
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  expect(checkbox.textContent).toBe("off");
  React.act(() => {
    checkbox.click();
  });

  const after = container.querySelector<HTMLButtonElement>("#remember")!;
  expect(after.getAttribute("aria-checked")).toBe("true");
  expect(after.textContent).toBe("on");
  unmount();
});
