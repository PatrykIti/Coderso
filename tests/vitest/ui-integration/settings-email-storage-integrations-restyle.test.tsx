// @vitest-environment happy-dom
//
// TASK-479-28-L07: Email + Storage + Integrations restyle (L06). Proves the
// email provider selector (smtp/resend) + masked SMTP password, the resend
// branch delegating its key to Integrations (no key input), the storage provider
// card grid with a masked secret on select, and the integration card grid +
// search filter. Credentials stay backend-only (no plaintext in the DOM).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import * as emailClient from "../../../core/admin/services/emailClient";
import * as settingsClient from "../../../core/admin/services/settingsClient";
import * as integrationsClient from "../../../core/admin/services/integrationsClient";
import type { IntegrationRecord } from "../../../core/admin/services/integrationsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { EmailSettingsPage } from "../../../core/admin/ui/settings/EmailSettingsPage";
import { StorageSettingsPage } from "../../../core/admin/ui/settings/StorageSettingsPage";
import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const integrationRecord = (overrides: Partial<IntegrationRecord> = {}): IntegrationRecord => ({
  id: "slack",
  name: "Slack",
  description: "Send activity notifications to channels.",
  category: "Messaging",
  scopes: ["notifications:send"],
  status: "disconnected",
  health: { status: "unknown", lastCheckedAt: null, lastError: null },
  updatedAt: null,
  fields: [],
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Email: provider selector + masked SMTP password, no plaintext / palette leak", () => {
  const html = renderAdminUi(<EmailSettingsPage />, { path: "/admin/settings/email" });

  expect(html).toContain("Manual SMTP");
  expect(html).toContain("Resend");
  expect(html).toContain("Send Test Email");
  // SMTP secret is masked (write-only) and no plaintext credential is rendered
  expect(html).toContain('type="password"');
  expect(html).not.toContain("re_");
  // token-driven restyle — no raw emerald/amber palette
  expect(html).not.toContain("emerald-");
  expect(html).not.toContain("amber-");
});

test("Email: the Resend branch delegates the key to Integrations (no key input)", async () => {
  vi.spyOn(emailClient, "getEmailSettings").mockRejectedValue(new Error("offline"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/email">
      <EmailSettingsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    const resendOption = Array.from(view.container.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Resend")
    );
    if (!resendOption) throw new Error("missing Resend provider option");
    await React.act(async () => {
      resendOption.click();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Configure Resend");
    expect(view.container.innerHTML).toContain("/admin/settings/integrations");
    // no SMTP password field in the resend branch, and no key field/secret
    expect(view.container.querySelector('input[type="password"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("Storage: 3 provider cards render; selecting one updates the form + masks the secret", async () => {
  vi.spyOn(settingsClient, "getStorageSettings").mockRejectedValue(new Error("offline"));
  const html = renderAdminUi(<StorageSettingsPage />, { path: "/admin/settings/storage" });
  expect(html).toContain("Local Storage");
  expect(html).toContain("Amazon S3");
  expect(html).toContain("Azure Blob");

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/storage">
      <StorageSettingsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    const s3Card = Array.from(view.container.querySelectorAll('[role="radio"]')).find((item) =>
      item.textContent?.includes("Amazon S3")
    );
    if (!s3Card) throw new Error("missing Amazon S3 provider card");
    await React.act(async () => {
      (s3Card as HTMLElement).click();
      await Promise.resolve();
    });

    expect(s3Card.getAttribute("aria-checked")).toBe("true");
    // the S3 secret key field is write-only/masked
    expect(view.container.querySelector('input[type="password"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("Integrations: a card per real integration; search filters; no credential leak", async () => {
  vi.spyOn(integrationsClient, "listIntegrations").mockResolvedValue([
    integrationRecord({ id: "slack", name: "Slack" }),
    integrationRecord({
      id: "openai",
      name: "OpenAI",
      description: "Writing assistant provider.",
      status: "connected",
    }),
  ]);

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/integrations">
      <IntegrationsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Slack");
    expect(view.container.textContent).toContain("OpenAI");

    const search = view.container.querySelector(
      'input[placeholder="Search integrations..."]'
    ) as HTMLInputElement | null;
    if (!search) throw new Error("missing integrations search input");
    React.act(() => {
      setInputValue(search, "slack");
    });
    await flush();

    expect(view.container.textContent).toContain("Slack");
    expect(view.container.textContent).not.toContain("OpenAI");
    // no credential/secret payloads leaked into the grid
    expect(view.container.innerHTML).not.toContain("password");
  } finally {
    view.cleanup();
  }
});
