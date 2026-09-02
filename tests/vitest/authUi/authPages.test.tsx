// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";
import { ResetPasswordPage } from "../../../core/admin/ui/auth/ResetPasswordPage";
import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";
import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";
import { OtpInput } from "../../../core/admin/ui/auth/OtpInput";
import { InfoBanner } from "../../../core/admin/ui/auth/InfoBanner";

vi.mock("@/services/authClient", () => ({
  getAuthBotProtection: vi.fn(),
  login: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  verifyOtp: vi.fn(),
  toFieldErrors: (error: ApiClientError | null) => {
    const fields: Record<string, string> = {};
    if (!error?.details) return fields;
    if (Array.isArray(error.details)) {
      for (const item of error.details) {
        if (item && typeof item === "object") {
          const record = item as { path?: string; message?: string };
          if (record.path && record.message) fields[record.path] = record.message;
        }
      }
    }
    return fields;
  },
}));

vi.mock("@/ui/auth/recaptcha", () => ({
  executeRecaptcha: vi.fn(),
  preloadRecaptcha: vi.fn(),
}));

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/admin",
  withAdminBasePath: (base: string, path: string) => `${base}${path}`,
}));

vi.mock("@/ui/layouts/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/ui/auth/SsoButtons", () => ({
  SsoButtons: () => <div data-testid="sso-buttons" />,
}));

vi.mock("@/ui/auth/RecoveryCodesPanel", () => ({
  RecoveryCodesPanel: () => <div>Recovery codes panel</div>,
}));

vi.mock("@/ui/auth/PasswordStrengthList", () => ({
  PasswordStrengthList: ({ rules }: { rules: Array<{ label: string; met: boolean }> }) => (
    <ul>
      {rules.map((rule) => (
        <li key={rule.label} data-met={rule.met ? "true" : "false"}>
          {rule.label}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-variant={variant ?? "default"}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
    [key: string]: unknown;
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(checked)}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      onInput={(event) => onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-slot="progress-indicator" data-value={value} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.clearAllMocks();
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
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  React.act(() => {
    button.click();
  });
};

const typeInto = (container: HTMLElement, id: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input ${id}`);
  React.act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const submitForm = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Missing form");
  React.act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
};

import {
  getAuthBotProtection,
  login,
  requestPasswordReset,
  confirmPasswordReset,
  verifyOtp,
  type BotProtectionConfig,
} from "../../../core/admin/services/authClient";
import { executeRecaptcha, preloadRecaptcha } from "../../../core/admin/ui/auth/recaptcha";

// apiRequest resolves `undefined` for 204/empty bodies (parseJson returns
// `undefined as T`), so the real auth endpoints may legitimately resolve
// without a value. These mock handles keep each endpoint's real parameter
// contract while allowing that optional resolution. They alias the very same
// vi.fn() instances created in the vi.mock factory above, so runtime behavior
// is unchanged.
type ResolveOrUndefined<F extends (...args: never[]) => unknown> = F extends (
  ...args: infer Args
) => Promise<infer Value>
  ? (...args: Args) => Promise<Value | undefined>
  : never;

const loginMock: ResolveOrUndefined<typeof login> = login;
const requestPasswordResetMock: ResolveOrUndefined<typeof requestPasswordReset> =
  requestPasswordReset;
const confirmPasswordResetMock: ResolveOrUndefined<typeof confirmPasswordReset> =
  confirmPasswordReset;
const verifyOtpMock: ResolveOrUndefined<typeof verifyOtp> = verifyOtp;

const apiError = (code: string, message: string, details?: unknown) =>
  new ApiClientError(code, message, 400, details);

const botConfig = (
  overrides: Partial<{ enabled: boolean; siteKey: string | null }> = {}
): BotProtectionConfig => ({
  enabled: true,
  provider: "recaptcha_v3",
  siteKey: "site-key-1",
  enforceOnLocalhost: true,
  ...overrides,
});

test("LoginPage submits credentials, remembers session, and redirects", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ enabled: false }));
  vi.mocked(loginMock).mockResolvedValue(undefined);
  const assign = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const view = mount(<LoginPage />);
  try {
    typeInto(view.container, "email", "admin@coderso.com");
    typeInto(view.container, "password", "hunter2");
    React.act(() => {
      view.container.querySelector<HTMLButtonElement>("[role='checkbox']")?.click();
    });
    submitForm(view.container);
    await flush();

    expect(login).toHaveBeenCalledWith({
      email: "admin@coderso.com",
      password: "hunter2",
      captchaToken: undefined,
    });
    expect(assign).toHaveBeenCalledWith("/admin/");
    expect(view.container.textContent).not.toContain("Signing in...");
  } finally {
    view.cleanup();
    assign.mockRestore();
  }
});

test("LoginPage executes reCAPTCHA when enabled and surfaces field errors", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig());
  vi.mocked(executeRecaptcha).mockResolvedValue("captcha-token");
  vi.mocked(preloadRecaptcha).mockResolvedValue(undefined);
  vi.mocked(login).mockRejectedValue(
    apiError("credentials_invalid", "Invalid credentials", [
      { path: "email", message: "No account for this email." },
    ])
  );

  const view = mount(<LoginPage />);
  try {
    await flush();
    await flush();
    typeInto(view.container, "email", "admin@coderso.com");
    typeInto(view.container, "password", "wrong");
    submitForm(view.container);
    await flush();

    expect(executeRecaptcha).toHaveBeenCalledWith("site-key-1", "login");
    expect(login).toHaveBeenCalledWith({
      email: "admin@coderso.com",
      password: "wrong",
      captchaToken: "captcha-token",
    });
    expect(view.container.textContent).toContain("Invalid credentials");
    expect(view.container.textContent).toContain("No account for this email.");
  } finally {
    view.cleanup();
  }
});

test("LoginPage shows missing-site-key and generic failure branches", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ siteKey: null }));
  const view = mount(<LoginPage />);
  try {
    await flush();
    typeInto(view.container, "email", "admin@coderso.com");
    typeInto(view.container, "password", "hunter2");
    submitForm(view.container);
    await flush();
    expect(view.container.textContent).toContain("reCAPTCHA is enabled but missing the site key.");
    expect(login).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }

  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ enabled: false }));
  vi.mocked(login).mockRejectedValue(new Error("network down"));
  const genericView = mount(<LoginPage />);
  try {
    typeInto(genericView.container, "email", "admin@coderso.com");
    typeInto(genericView.container, "password", "hunter2");
    submitForm(genericView.container);
    await flush();
    expect(genericView.container.textContent).toContain("Unable to sign in. Please try again.");
  } finally {
    genericView.cleanup();
  }
});

test("LoginPage falls back to a disabled bot config when the probe fails", async () => {
  vi.mocked(getAuthBotProtection).mockRejectedValue(new Error("probe failed"));
  vi.mocked(loginMock).mockResolvedValue(undefined);

  const view = mount(<LoginPage />);
  try {
    await flush();
    typeInto(view.container, "email", "admin@coderso.com");
    typeInto(view.container, "password", "hunter2");
    submitForm(view.container);
    await flush();
    expect(login).toHaveBeenCalledWith({
      email: "admin@coderso.com",
      password: "hunter2",
      captchaToken: undefined,
    });
  } finally {
    view.cleanup();
  }
});

test("LoginPage preloads recaptcha when enabled with a site key", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig());
  vi.mocked(preloadRecaptcha).mockResolvedValue(undefined);

  const view = mount(<LoginPage />);
  try {
    await flush();
    expect(preloadRecaptcha).toHaveBeenCalledWith("site-key-1");
  } finally {
    view.cleanup();
  }
});

test("ResetPasswordPage sends a reset link, preloads, and shows success", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig());
  vi.mocked(executeRecaptcha).mockResolvedValue("captcha-token");
  vi.mocked(preloadRecaptcha).mockResolvedValue(undefined);
  vi.mocked(requestPasswordResetMock).mockResolvedValue(undefined);

  const view = mount(<ResetPasswordPage />);
  try {
    await flush();
    expect(preloadRecaptcha).toHaveBeenCalledWith("site-key-1");

    typeInto(view.container, "email", "admin@coderso.com");
    submitForm(view.container);
    await flush();

    expect(executeRecaptcha).toHaveBeenCalledWith("site-key-1", "reset");
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "admin@coderso.com",
      captchaToken: "captcha-token",
    });
    expect(view.container.textContent).toContain("Reset link sent");
    expect(view.container.textContent).toContain("Check your inbox for a secure reset link.");
  } finally {
    view.cleanup();
  }
});

test("ResetPasswordPage handles missing site key and generic failures", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ siteKey: null }));
  const view = mount(<ResetPasswordPage />);
  try {
    await flush();
    typeInto(view.container, "email", "admin@coderso.com");
    submitForm(view.container);
    await flush();
    expect(view.container.textContent).toContain("reCAPTCHA is enabled but missing the site key.");
  } finally {
    view.cleanup();
  }

  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ enabled: false }));
  vi.mocked(requestPasswordReset).mockRejectedValue(new Error("smtp down"));
  const genericView = mount(<ResetPasswordPage />);
  try {
    typeInto(genericView.container, "email", "admin@coderso.com");
    submitForm(genericView.container);
    await flush();
    expect(genericView.container.textContent).toContain(
      "Unable to send reset link. Please try again."
    );
  } finally {
    genericView.cleanup();
  }
});

test("ResetPasswordPage falls back to disabled bot config when probe fails", async () => {
  vi.mocked(getAuthBotProtection).mockRejectedValue(new Error("probe failed"));
  vi.mocked(requestPasswordResetMock).mockResolvedValue(undefined);

  const view = mount(<ResetPasswordPage />);
  try {
    await flush();
    await flush();
    typeInto(view.container, "email", "admin@coderso.com");
    submitForm(view.container);
    await flush();
    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: "admin@coderso.com",
      captchaToken: undefined,
    });
  } finally {
    view.cleanup();
  }
});

test("ResetPasswordPage surfaces API errors", async () => {
  vi.mocked(getAuthBotProtection).mockResolvedValue(botConfig({ enabled: false }));
  vi.mocked(requestPasswordReset).mockRejectedValue(
    apiError("email_not_found", "No account matches this email.")
  );

  const view = mount(<ResetPasswordPage />);
  try {
    typeInto(view.container, "email", "ghost@coderso.com");
    submitForm(view.container);
    await flush();
    expect(view.container.textContent).toContain("No account matches this email.");
  } finally {
    view.cleanup();
  }
});

test("SetPasswordPage blocks missing tokens and mismatched confirmations", async () => {
  vi.mocked(confirmPasswordResetMock).mockResolvedValue(undefined);

  const missingTokenView = mount(<SetPasswordPage />);
  try {
    typeInto(missingTokenView.container, "new-password", "hunter2");
    typeInto(missingTokenView.container, "confirm-password", "hunter2");
    submitForm(missingTokenView.container);
    await flush();
    expect(missingTokenView.container.textContent).toContain("Reset token is missing or expired.");
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  } finally {
    missingTokenView.cleanup();
  }

  const mismatchView = mount(<SetPasswordPage token="abc123" />);
  try {
    typeInto(mismatchView.container, "new-password", "hunter2");
    typeInto(mismatchView.container, "confirm-password", "hunter3");
    submitForm(mismatchView.container);
    await flush();
    expect(mismatchView.container.textContent).toContain("Passwords do not match.");
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  } finally {
    mismatchView.cleanup();
  }
});

test("SetPasswordPage updates password, shows success, and redirects", async () => {
  vi.mocked(confirmPasswordResetMock).mockResolvedValue(undefined);
  vi.useFakeTimers();
  const assign = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const view = mount(<SetPasswordPage token="abc123" />);
  try {
    typeInto(view.container, "new-password", "hunter2!");
    typeInto(view.container, "confirm-password", "hunter2!");
    submitForm(view.container);
    await flush();

    expect(confirmPasswordReset).toHaveBeenCalledWith({ token: "abc123", password: "hunter2!" });
    expect(view.container.textContent).toContain("Password updated successfully.");
    expect(view.container.textContent).toContain("Strong");

    vi.advanceTimersByTime(1200);
    expect(assign).toHaveBeenCalledWith("/admin/login");
  } finally {
    view.cleanup();
    assign.mockRestore();
    vi.useRealTimers();
  }
});

test("SetPasswordPage toggles password visibility and strength labels", async () => {
  vi.mocked(confirmPasswordResetMock).mockResolvedValue(undefined);

  const view = mount(<SetPasswordPage token="abc123" />);
  try {
    typeInto(view.container, "new-password", "hunter22");
    expect(view.container.textContent).toContain("Medium");

    typeInto(view.container, "new-password", "hunter2!");
    expect(view.container.textContent).toContain("Strong");

    React.act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Show password"]')?.click();
    });
    const passwordInput = view.container.querySelector<HTMLInputElement>("#new-password");
    expect(passwordInput?.type).toBe("text");
    React.act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Hide password"]')?.click();
    });
    expect(passwordInput?.type).toBe("password");

    // Confirm field has its own show/hide toggle.
    React.act(() => {
      view.container
        .querySelectorAll<HTMLButtonElement>('[aria-label="Show password"]')
        .forEach((button) => button.click());
    });
    const confirmInput = view.container.querySelector<HTMLInputElement>("#confirm-password");
    expect(confirmInput?.type).toBe("text");
  } finally {
    view.cleanup();
  }
});

test("SetPasswordPage surfaces API and generic errors", async () => {
  vi.mocked(confirmPasswordReset).mockRejectedValue(
    apiError("token_expired", "This reset link has expired.")
  );
  const apiView = mount(<SetPasswordPage token="abc123" />);
  try {
    typeInto(apiView.container, "new-password", "hunter2");
    typeInto(apiView.container, "confirm-password", "hunter2");
    submitForm(apiView.container);
    await flush();
    expect(apiView.container.textContent).toContain("This reset link has expired.");
  } finally {
    apiView.cleanup();
  }

  vi.mocked(confirmPasswordReset).mockRejectedValue(new Error("boom"));
  const genericView = mount(<SetPasswordPage token="abc123" />);
  try {
    typeInto(genericView.container, "new-password", "hunter2");
    typeInto(genericView.container, "confirm-password", "hunter2");
    submitForm(genericView.container);
    await flush();
    expect(genericView.container.textContent).toContain(
      "Unable to update password. Please try again."
    );
  } finally {
    genericView.cleanup();
  }
});

test("TwoFactorPage verifies an authenticator code and redirects", async () => {
  vi.mocked(verifyOtpMock).mockResolvedValue(undefined);
  const assign = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const view = mount(<TwoFactorPage />);
  try {
    const digits = Array.from(view.container.querySelectorAll<HTMLInputElement>("input"));
    React.act(() => {
      digits[0]!.value = "1";
      digits[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    React.act(() => {
      digits[1]!.value = "2";
      digits[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clickByText(view.container, "Verify & Enable");
    await flush();

    expect(verifyOtp).toHaveBeenCalledWith({ code: "12" });
    expect(assign).toHaveBeenCalledWith("/admin/");
  } finally {
    view.cleanup();
    assign.mockRestore();
  }
});

test("TwoFactorPage verifies a recovery code and handles failures", async () => {
  vi.mocked(verifyOtpMock).mockResolvedValue(undefined);
  const view = mount(<TwoFactorPage />);
  try {
    clickByText(view.container, "Use a recovery code");
    const recoveryInput = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input")
    ).find((input) => input.placeholder === "Enter recovery code");
    if (!(recoveryInput instanceof HTMLInputElement)) throw new Error("Missing recovery input");
    React.act(() => {
      recoveryInput.value = "RC-12345";
      recoveryInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clickByText(view.container, "Verify recovery code");
    await flush();
    expect(verifyOtp).toHaveBeenCalledWith({ recoveryCode: "RC-12345" });

    // Back to authenticator mode.
    clickByText(view.container, "Use authenticator code instead");
    expect(view.container.textContent).toContain("Verify & Enable");
  } finally {
    view.cleanup();
  }

  vi.mocked(verifyOtp).mockRejectedValue(apiError("otp_invalid", "Invalid code."));
  const errorView = mount(<TwoFactorPage />);
  try {
    clickByText(errorView.container, "Verify & Enable");
    await flush();
    expect(errorView.container.textContent).toContain("Invalid code.");
  } finally {
    errorView.cleanup();
  }

  vi.mocked(verifyOtp).mockRejectedValue(new Error("boom"));
  const genericView = mount(<TwoFactorPage />);
  try {
    clickByText(genericView.container, "Verify & Enable");
    await flush();
    expect(genericView.container.textContent).toContain("Verification failed. Please try again.");
  } finally {
    genericView.cleanup();
  }
});

test("OtpInput groups digits, ignores non-numeric input, and reports the combined value", () => {
  const onChange = vi.fn();
  const view = mount(<OtpInput value="12" onChange={onChange} />);
  try {
    const digits = Array.from(view.container.querySelectorAll<HTMLInputElement>("input"));
    expect(digits).toHaveLength(6);
    expect(view.container.textContent).toContain("-");

    React.act(() => {
      digits[2]!.value = "x";
      digits[2]!.dispatchEvent(new Event("input", { bubbles: true }));
      expect(onChange).not.toHaveBeenCalled();
    });
    React.act(() => {
      digits[2]!.value = "3";
      digits[2]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("123");
  } finally {
    view.cleanup();
  }

  const emptyView = mount(<OtpInput />);
  try {
    const digits = Array.from(emptyView.container.querySelectorAll<HTMLInputElement>("input"));
    expect(digits).toHaveLength(6);
    React.act(() => {
      digits[0]!.value = "9";
      digits[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
  } finally {
    emptyView.cleanup();
  }
});

test("InfoBanner renders title and description", () => {
  const view = mount(
    <InfoBanner title="Reset link sent" description="Check your inbox for a secure reset link." />
  );
  try {
    expect(view.container.textContent).toContain("Reset link sent");
    expect(view.container.textContent).toContain("Check your inbox for a secure reset link.");
  } finally {
    view.cleanup();
  }
});
