// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";
import { WebhookDrawer } from "../../../core/admin/ui/settings/WebhookDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const webhooksServices = vi.hoisted(() => {
  const activeWebhook = {
    id: "webhook-1",
    name: "Deploy Hook",
    url: "https://example.com/webhook",
    events: ["entry.created"],
    enabled: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    lastDelivery: null,
    hasSecret: true,
  };
  const state = {
    items: [activeWebhook],
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    testWebhook: vi.fn(),
    reset() {
      state.items = [activeWebhook];
      state.listWebhooks.mockReset();
      state.createWebhook.mockReset();
      state.updateWebhook.mockReset();
      state.deleteWebhook.mockReset();
      state.testWebhook.mockReset();
      state.listWebhooks.mockImplementation(async () => state.items);
      state.createWebhook.mockResolvedValue({ item: activeWebhook });
      state.updateWebhook.mockResolvedValue({ item: activeWebhook });
      state.deleteWebhook.mockResolvedValue({ ok: true });
      state.testWebhook.mockResolvedValue({
        ok: true,
        result: { status: "success", attempts: 1, responseCode: 200 },
      });
    },
  };
  return state;
});

vi.mock("@/services/webhooksClient", () => ({
  createWebhook: webhooksServices.createWebhook,
  deleteWebhook: webhooksServices.deleteWebhook,
  listWebhooks: webhooksServices.listWebhooks,
  testWebhook: webhooksServices.testWebhook,
  updateWebhook: webhooksServices.updateWebhook,
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
  webhooksServices.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("WebhooksPage renders table shell", () => {
  const html = renderAdminUi(<WebhooksPage />);

  expect(html).toContain("Webhooks");
  expect(html).toContain("Create Webhook");
  expect(html).toContain("URL");
  expect(html).toContain("Events");
});

test("WebhooksPage requires confirmation before deleting a webhook", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );

  try {
    await flushEffects();
    const deleteButton = view.container.querySelector('button[aria-label="Delete webhook"]');
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error("missing delete webhook button");
    }

    await React.act(async () => {
      deleteButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Delete webhook?");
    expect(webhooksServices.deleteWebhook).not.toHaveBeenCalled();

    await clickButton("Cancel");
    expect(webhooksServices.deleteWebhook).not.toHaveBeenCalled();

    await React.act(async () => {
      deleteButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await clickButton("Delete webhook");
    await flushEffects();

    expect(webhooksServices.deleteWebhook).toHaveBeenCalledTimes(1);
    expect(webhooksServices.deleteWebhook).toHaveBeenCalledWith("webhook-1");
  } finally {
    view.cleanup();
  }
});

test("WebhookDrawer gates test delivery and edit saves through confirmation", async () => {
  const onSave = vi.fn(async () => undefined);
  const onTest = vi.fn(async () => undefined);
  const view = mount(
    <WebhookDrawer
      open
      onOpenChange={() => undefined}
      mode="edit"
      webhook={{
        id: "webhook-1",
        name: "Deploy Hook",
        url: "https://example.com/webhook",
        events: ["entry.created"],
        enabled: true,
      }}
      onSave={onSave}
      onTest={onTest}
    />
  );

  try {
    await clickButton("Test Connection");
    expect(document.body.textContent).toContain("Send webhook test?");
    expect(onTest).not.toHaveBeenCalled();

    await clickButton("Cancel");
    expect(onTest).not.toHaveBeenCalled();

    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(onTest).toHaveBeenCalledTimes(1);

    await clickButton("Save Changes");
    expect(document.body.textContent).toContain("Review webhook changes");
    expect(onSave).not.toHaveBeenCalled();

    await clickButton("Cancel");
    expect(onSave).not.toHaveBeenCalled();

    await clickButton("Save Changes");
    await clickButton("Save webhook changes");
    await flushEffects();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: "Deploy Hook",
      url: "https://example.com/webhook",
      events: ["entry.created"],
      enabled: true,
      secret: undefined,
    });
  } finally {
    view.cleanup();
  }
});
