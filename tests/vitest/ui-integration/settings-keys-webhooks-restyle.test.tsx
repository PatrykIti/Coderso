// @vitest-environment happy-dom
//
// TASK-479-28-L07: API keys + Webhooks restyle (L05). Proves the keys table
// shows only the masked prefix (never a full secret), the "keep your keys
// secret" banner is present, the one-time secret reveal shows the plaintext only
// while its dialog is open, and the webhook endpoints render with status + event
// badges and keep their delete confirm. Secrets stay backend-only.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import * as apiKeysClient from "../../../core/admin/services/apiKeysClient";
import type { ApiKeyRecord } from "../../../core/admin/services/apiKeysClient";
import * as webhooksClient from "../../../core/admin/services/webhooksClient";
import type { WebhookRecord } from "../../../core/admin/services/webhooksClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ApiKeysPage } from "../../../core/admin/ui/settings/ApiKeysPage";
import { ApiKeySecretDialog } from "../../../core/admin/ui/settings/ApiKeySecretDialog";
import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
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

const apiKeyRecord = (overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord =>
  ({
    id: "key-1",
    name: "Production",
    scopes: ["content:read"],
    prefix: "ck_live",
    createdAt: "2026-06-01T10:00:00.000Z",
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  }) as ApiKeyRecord;

const webhookRecord = (overrides: Partial<WebhookRecord> = {}): WebhookRecord => ({
  id: "wh-1",
  name: "CMS hook",
  url: "https://hooks.acme.studio/cms",
  events: ["page.published", "post.created"],
  enabled: true,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
  lastDelivery: { status: "success", deliveredAt: "2026-06-02T10:00:00.000Z" },
  hasSecret: true,
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("API keys: warning banner + masked prefix chip; no full secret in the DOM", async () => {
  vi.spyOn(apiKeysClient, "listApiKeys").mockResolvedValue([apiKeyRecord()]);

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeysPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Keep your keys secret.");
    expect(view.container.textContent).toContain("Production");
    // masked prefix only — never a full secret
    expect(view.container.textContent).toContain("ck_live...");
    expect(view.container.innerHTML).not.toContain("ck_live_");
    expect(view.container.textContent).not.toContain("sk_live");
  } finally {
    view.cleanup();
  }
});

test("API keys: the one-time secret reveal shows plaintext only while open", () => {
  const secret = "ck_live_one_time_plaintext_value";
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/api-keys">
      <ApiKeySecretDialog open name="Production" secret={secret} onOpenChange={() => undefined} />
    </AdminRouterProvider>
  );

  const secretInputValue = () =>
    Array.from(document.body.querySelectorAll("input")).map((input) => input.value);

  try {
    // plaintext is shown once, in the read-only reveal input
    expect(secretInputValue()).toContain(secret);

    view.rerender(
      <AdminRouterProvider initialPath="/admin/settings/api-keys">
        <ApiKeySecretDialog
          open={false}
          name="Production"
          secret={secret}
          onOpenChange={() => undefined}
        />
      </AdminRouterProvider>
    );
    // once closed it is gone from the DOM — never re-fetched/persisted
    expect(secretInputValue()).not.toContain(secret);
    expect(document.body.textContent).not.toContain(secret);
  } finally {
    view.cleanup();
  }
});

test("Webhooks: endpoint rows render status + event badges and gate delete", async () => {
  vi.spyOn(webhooksClient, "listWebhooks").mockResolvedValue([webhookRecord()]);
  const deleteSpy = vi
    .spyOn(webhooksClient, "deleteWebhook")
    .mockResolvedValue({ ok: true } as never);

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("https://hooks.acme.studio/cms");
    expect(view.container.textContent).toContain("page.published");
    expect(view.container.textContent).toContain("active");

    const deleteButton = view.container.querySelector(
      'button[aria-label="Delete webhook"]'
    ) as HTMLButtonElement | null;
    if (!deleteButton) throw new Error("missing delete webhook button");

    await React.act(async () => {
      deleteButton.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Delete webhook?");
    expect(deleteSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
