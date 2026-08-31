// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ApiClientError } from "../../../core/admin/services/apiClient";
import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";
import { EmailLogsDrawer } from "../../../core/admin/ui/settings/EmailLogsDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const emailServices = vi.hoisted(() => {
  const smtpSettings = {
    provider: "smtp" as const,
    smtp: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer",
      password: { configured: true },
    },
    resend: {
      integrationId: "resend" as const,
      apiKey: { configured: false },
      status: "disconnected" as const,
    },
    from: { name: "Coderso", email: "hello@example.com" },
    status: { provider: "smtp" as const, configured: true },
  };
  const state = {
    smtpSettings,
    getEmailSettings: vi.fn(),
    updateEmailSettings: vi.fn(),
    sendTestEmail: vi.fn(),
    listEmailLogs: vi.fn(),
    reset() {
      state.getEmailSettings.mockReset();
      state.updateEmailSettings.mockReset();
      state.sendTestEmail.mockReset();
      state.listEmailLogs.mockReset();
      state.getEmailSettings.mockResolvedValue(smtpSettings);
      state.updateEmailSettings.mockResolvedValue(smtpSettings);
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

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => React.act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  React.act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

async function clickButton(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function clickProvider(label: string) {
  const option = Array.from(document.body.querySelectorAll("button[aria-pressed]")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!(option instanceof HTMLButtonElement)) throw new Error(`Missing provider ${label}`);
  await React.act(async () => {
    option.click();
    await Promise.resolve();
  });
}

function inputById(id: string) {
  const input = document.body.querySelector<HTMLInputElement>(`input#${id}`);
  if (!input) throw new Error(`missing input #${id}`);
  return input;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  emailServices.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const renderPage = () =>
  mount(
    <AdminRouterProvider initialPath="/admin/settings/email">
      <EmailSettingsPage />
    </AdminRouterProvider>
  );

test("EmailSettingsPage shows an API error message on load failure", async () => {
  emailServices.getEmailSettings.mockRejectedValue(
    new ApiClientError("email_down", "email_api_down", 503)
  );
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("email_api_down");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage falls back to a generic message when the load error has no message", async () => {
  emailServices.getEmailSettings.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("Failed to load email settings.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage shows the invalid recipient error without opening the review dialog", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Send Test Email");
    expect(pageText()).toContain("Provide a recipient address.");
    expect(pageText()).not.toContain("Confirm the recipient address");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage surfaces API and generic failures from test delivery", async () => {
  emailServices.sendTestEmail.mockRejectedValue(new ApiClientError("quota", "resend_quota", 429));
  const view = renderPage();
  try {
    await flush();
    setInputValue(inputById("test-recipient"), "dev@example.com");
    await clickButton("Send Test Email");
    await clickButton("Send test email");
    await flush();
    expect(pageText()).toContain("resend_quota");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage falls back to a generic test delivery error", async () => {
  emailServices.sendTestEmail.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    setInputValue(inputById("test-recipient"), "dev@example.com");
    await clickButton("Send Test Email");
    await clickButton("Send test email");
    await flush();
    expect(pageText()).toContain("Failed to send test email.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage shows a successful test delivery message", async () => {
  const view = renderPage();
  try {
    await flush();
    setInputValue(inputById("test-recipient"), "dev@example.com");
    await clickButton("Send Test Email");
    await clickButton("Send test email");
    await flush();
    expect(pageText()).toContain("Test email sent.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage re-validates the recipient after the review dialog opens", async () => {
  const view = renderPage();
  try {
    await flush();
    setInputValue(inputById("test-recipient"), "dev@example.com");
    await clickButton("Send Test Email");
    expect(pageText()).toContain("Confirm the recipient address");
    setInputValue(inputById("test-recipient"), "");
    await clickButton("Send test email");
    await flush();
    expect(pageText()).toContain("Provide a recipient address.");
    expect(emailServices.sendTestEmail).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage surfaces API and generic failures when saving", async () => {
  emailServices.updateEmailSettings.mockRejectedValue(
    new ApiClientError("timeout", "smtp_timeout", 504)
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("smtp_timeout");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage falls back to a generic save error", async () => {
  emailServices.updateEmailSettings.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("Save changes");
    await flush();
    expect(pageText()).toContain("Failed to save email settings.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage opens the delivery log drawer with an empty state", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    expect(emailServices.listEmailLogs).toHaveBeenCalledTimes(1);
    expect(pageText()).toContain("No delivery logs recorded yet.");
    expect(pageText()).toContain("Export Logs");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage shows the loading state while delivery logs load", async () => {
  let resolveLogs!: (value: unknown) => void;
  emailServices.listEmailLogs.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveLogs = resolve;
      })
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    expect(pageText()).toContain("Loading delivery logs...");
    await React.act(async () => {
      resolveLogs([]);
      await Promise.resolve();
    });
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage renders delivery logs with statuses and formatted timestamps", async () => {
  emailServices.listEmailLogs.mockResolvedValue([
    {
      id: "log-1",
      recipient: "alice@example.com",
      subject: "Welcome",
      status: "delivered",
      provider: "resend",
      createdAt: "2025-06-01T10:00:00.000Z",
    },
    {
      id: "log-2",
      recipient: "bob@example.com",
      subject: "Invoice",
      status: "failed",
      provider: "smtp",
      createdAt: "not-a-date",
    },
    {
      id: "log-3",
      recipient: "carol@example.com",
      subject: "Queued digest",
      status: "queued",
      provider: "",
      createdAt: "2025-06-02T11:00:00.000Z",
    },
  ]);
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    expect(pageText()).toContain("alice@example.com");
    expect(pageText()).toContain("delivered");
    expect(pageText()).toContain("resend");
    expect(pageText()).toContain("bob@example.com");
    expect(pageText()).toContain("failed");
    expect(pageText()).toContain("Unknown");
    expect(pageText()).toContain("carol@example.com");
    expect(pageText()).toContain("queued");
    expect(pageText()).toContain("smtp");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage surfaces API and generic delivery log errors in the drawer", async () => {
  emailServices.listEmailLogs.mockRejectedValue(new ApiClientError("down", "logs_down", 503));
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    expect(pageText()).toContain("logs_down");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage falls back to a generic delivery log error", async () => {
  emailServices.listEmailLogs.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    expect(pageText()).toContain("Failed to load delivery logs.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage closes the delivery log drawer through the Close button", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    expect(pageText()).toContain("Delivery Logs");
    await clickButton("Close");
    await flush();
    expect(pageText()).not.toContain("Delivery Logs");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage exports delivery logs button is intentionally disabled", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("View delivery logs");
    await flush();
    const exportButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Export Logs")
    );
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
    expect((exportButton as HTMLButtonElement).title).toContain("TASK-359-06");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage switches to the Resend provider and shows its status items", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickProvider("Resend");
    expect(pageText()).toContain("API Key");
    expect(pageText()).toContain("Needs key");
    expect(pageText()).toContain("Configure Resend");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage confirms a successful save", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Save changes");
    await flush();
    expect(emailServices.updateEmailSettings).toHaveBeenCalledTimes(1);
    expect(pageText()).toContain("Email settings saved.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage keeps Save disabled while the SMTP port is invalid", async () => {
  const view = renderPage();
  try {
    await flush();
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save changes")
    );
    if (!(saveButton instanceof HTMLButtonElement)) throw new Error("missing save button");
    expect(saveButton.disabled).toBe(false);
    setInputValue(inputById("smtp-port"), "abc");
    await flush();
    expect(saveButton.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage keeps Save disabled while password update needs a password", async () => {
  const view = renderPage();
  try {
    await flush();
    const toggle = document.body.querySelector<HTMLElement>('[role="switch"]');
    if (!toggle) throw new Error("missing update password switch");
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save changes")
    );
    if (!(saveButton instanceof HTMLButtonElement)) throw new Error("missing save button");
    await React.act(async () => {
      toggle.click();
      await Promise.resolve();
    });
    expect(saveButton.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("EmailLogsDrawer shows the empty state when no logs are provided", async () => {
  const view = mount(<EmailLogsDrawer open onOpenChange={() => undefined} logs={[]} />);
  try {
    await flush();
    expect(pageText()).toContain("No delivery logs recorded yet.");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage updates sender fields and the autosave toggle", async () => {
  const view = renderPage();
  try {
    await flush();
    setInputValue(inputById("from-name"), "Coderso Team");
    setInputValue(inputById("from-email"), "team@example.com");
    const checkbox = document.body.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (!checkbox) throw new Error("missing autosave checkbox");
    await React.act(async () => {
      checkbox.click();
      await Promise.resolve();
    });
    expect(inputById("from-name").value).toBe("Coderso Team");
    expect(inputById("from-email").value).toBe("team@example.com");
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage switches back to Manual SMTP after Resend", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickProvider("Resend");
    expect(pageText()).toContain("Configure Resend");
    await clickProvider("Manual SMTP");
    expect(pageText()).toContain("SMTP Server Configuration");
    expect(pageText()).not.toContain("Configure Resend");
  } finally {
    view.cleanup();
  }
});

test("EmailSettingsPage shows connected Resend provider state", async () => {
  emailServices.getEmailSettings.mockResolvedValue(emailServices.smtpSettings);
  const view = renderPage();
  try {
    await flush();
    await clickProvider("Resend");
    expect(pageText()).toContain("Needs key");
  } finally {
    view.cleanup();
  }
});
