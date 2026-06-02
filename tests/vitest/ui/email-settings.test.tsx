// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const emailServices = vi.hoisted(() => {
  const settings = {
    provider: "smtp" as const,
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer",
      password: { configured: true },
    },
    from: { name: "Coderso", email: "hello@example.com" },
    status: { configured: true },
  };
  const state = {
    getEmailSettings: vi.fn(),
    updateEmailSettings: vi.fn(),
    sendTestEmail: vi.fn(),
    listEmailLogs: vi.fn(),
    reset() {
      state.getEmailSettings.mockReset();
      state.updateEmailSettings.mockReset();
      state.sendTestEmail.mockReset();
      state.listEmailLogs.mockReset();
      state.getEmailSettings.mockResolvedValue(settings);
      state.updateEmailSettings.mockResolvedValue(settings);
      state.sendTestEmail.mockResolvedValue({ ok: true });
      state.listEmailLogs.mockResolvedValue([]);
    },
  };
  return state;
});

vi.mock("@/services/emailClient", () => ({
  getEmailSettings: emailServices.getEmailSettings,
  listEmailLogs: emailServices.listEmailLogs,
  sendTestEmail: emailServices.sendTestEmail,
  updateEmailSettings: emailServices.updateEmailSettings,
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
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const clickButton = async (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  emailServices.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("EmailSettingsPage renders email settings cards", () => {
  const html = renderAdminUi(<EmailSettingsPage />);

  expect(html).toContain("SMTP Server Configuration");
  expect(html).toContain("Default Sender Info");
  expect(html).toContain("Test Email");
  expect(html).toContain("Connection Status");
  expect(html).toContain("Auto-save settings across all screens");
});

test("EmailSettingsPage renders test email CTA", () => {
  const html = renderAdminUi(<EmailSettingsPage />);

  expect(html).toContain("Send Test Email");
});

test("EmailSettingsPage requires confirmation before sending a test email", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/email">
      <EmailSettingsPage />
    </AdminRouterProvider>
  );

  try {
    await flushEffects();
    const recipientInput = view.container.querySelector("#test-recipient");
    if (!(recipientInput instanceof HTMLInputElement)) {
      throw new Error("missing recipient input");
    }
    React.act(() => {
      setInputValue(recipientInput, "qa@example.com");
    });

    await clickButton("Send Test Email");
    expect(document.body.textContent).toContain("Send test email?");
    expect(emailServices.sendTestEmail).not.toHaveBeenCalled();

    await clickButton("Cancel");
    expect(emailServices.sendTestEmail).not.toHaveBeenCalled();

    await clickButton("Send Test Email");
    await clickButton("Send test email");
    await flushEffects();

    expect(emailServices.sendTestEmail).toHaveBeenCalledTimes(1);
    expect(emailServices.sendTestEmail).toHaveBeenCalledWith({ to: "qa@example.com" });
  } finally {
    view.cleanup();
  }
});
