// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { WebhookRecord } from "../../../core/admin/services/webhooksClient";
import { WebhooksPage } from "../../../core/admin/ui/settings/WebhooksPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiError = (message: string) => Object.assign(new Error(message), { isApiError: true });

const now = Date.now();

const webhookState = vi.hoisted(() => {
  const makeWebhook = (overrides: Partial<WebhookRecord> = {}): WebhookRecord => ({
    id: "webhook-1",
    name: "Deploy Hook",
    url: "https://example.com/webhook",
    events: ["entry.created"],
    enabled: true,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    lastDelivery: null,
    hasSecret: true,
    ...overrides,
  });
  const state = {
    items: [makeWebhook()],
    makeWebhook,
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    testWebhook: vi.fn(),
    reset() {
      state.items = [makeWebhook()];
      state.listWebhooks.mockReset();
      state.createWebhook.mockReset();
      state.updateWebhook.mockReset();
      state.deleteWebhook.mockReset();
      state.testWebhook.mockReset();
      state.listWebhooks.mockImplementation(async () => state.items);
      state.createWebhook.mockResolvedValue({
        item: makeWebhook({
          id: "webhook-2",
          name: "New Hook",
          url: "https://new.example.com/hook",
        }),
      });
      state.updateWebhook.mockResolvedValue({
        item: makeWebhook({ name: "Renamed Hook", url: "https://renamed.example.com/hook" }),
      });
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
  createWebhook: webhookState.createWebhook,
  deleteWebhook: webhookState.deleteWebhook,
  listWebhooks: webhookState.listWebhooks,
  testWebhook: webhookState.testWebhook,
  updateWebhook: webhookState.updateWebhook,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "isApiError" in error),
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
      document.body.innerHTML = "";
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButton = async (label: string, options: { last?: boolean } = {}) => {
  const matches = Array.from(document.body.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(label)
  );
  const button = options.last ? matches.at(-1) : matches[0];
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

const clickByAria = async (label: string) => {
  const element = document.body.querySelector(`[aria-label="${label}"]`);
  if (!element) throw new Error(`missing aria-label: ${label}`);
  await React.act(async () => {
    (element as HTMLElement).click();
    await Promise.resolve();
  });
};

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const inputByPlaceholder = (placeholder: string) => {
  const input = Array.from(document.body.querySelectorAll("input")).find(
    (item) => item.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) throw new Error(`missing input: ${placeholder}`);
  return input;
};

const typeInto = async (placeholder: string, value: string) => {
  await React.act(async () => {
    setInputValue(inputByPlaceholder(placeholder), value);
    await Promise.resolve();
  });
};

beforeEach(() => {
  webhookState.reset();
});

test("WebhooksPage renders relative delivery labels", async () => {
  webhookState.items = [
    webhookState.makeWebhook({
      id: "a",
      lastDelivery: { deliveredAt: new Date(now - 30_000).toISOString(), status: "success" },
    }),
    webhookState.makeWebhook({
      id: "b",
      lastDelivery: { deliveredAt: new Date(now - 5 * 60_000).toISOString(), status: "failed" },
    }),
    webhookState.makeWebhook({
      id: "c",
      lastDelivery: { deliveredAt: new Date(now - 3 * 3_600_000).toISOString(), status: "pending" },
    }),
    webhookState.makeWebhook({
      id: "d",
      lastDelivery: {
        deliveredAt: new Date(now - 2 * 86_400_000).toISOString(),
        status: "success",
      },
    }),
    webhookState.makeWebhook({
      id: "e",
      lastDelivery: {
        deliveredAt: new Date(now - 12 * 86_400_000).toISOString(),
        status: "success",
      },
    }),
    webhookState.makeWebhook({
      id: "f",
      lastDelivery: { deliveredAt: "not-a-date", status: "failed" },
    }),
    webhookState.makeWebhook({ id: "g", lastDelivery: null }),
  ];
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Just now");
    expect(body).toContain("5 mins ago");
    expect(body).toContain("3 hrs ago");
    expect(body).toContain("2 days ago");
    expect(body).toContain("Unknown");
    expect(body).toContain("Never");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage shows loading and empty states", async () => {
  let resolveList: (value: WebhookRecord[]) => void = () => undefined;
  webhookState.listWebhooks.mockReturnValueOnce(
    new Promise<WebhookRecord[]>((resolve) => {
      resolveList = resolve;
    })
  );
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Loading webhooks...");
    await React.act(async () => {
      resolveList([]);
      await Promise.resolve();
    });
    await flushEffects();
    expect(document.body.textContent).toContain("No webhooks configured yet.");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage surfaces load errors", async () => {
  webhookState.listWebhooks.mockRejectedValueOnce(apiError("webhooks down"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("webhooks down");
  } finally {
    view.cleanup();
  }
  webhookState.listWebhooks.mockRejectedValueOnce(new Error("boom"));
  const second = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to load webhooks.");
  } finally {
    second.cleanup();
  }
});

test("WebhooksPage creates a webhook through the drawer", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Create Webhook");
    expect(document.body.textContent).toContain("Create New Webhook");

    await clickButton("Create Webhook", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Provide a name for this webhook.");

    await typeInto("e.g. Marketing Sync", "New Hook");
    await clickButton("Create Webhook", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Provide a destination URL.");

    await typeInto("https://your-domain.com/webhook", "https://new.example.com/hook");
    const checkboxes = Array.from(document.body.querySelectorAll('[role="checkbox"]'));
    for (const checkbox of checkboxes) {
      await React.act(async () => {
        (checkbox as HTMLElement).click();
        await Promise.resolve();
      });
    }
    await flushEffects();
    await clickButton("Create Webhook", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Select at least one event trigger.");

    const firstCheckbox = Array.from(document.body.querySelectorAll('[role="checkbox"]'))[0];
    await React.act(async () => {
      (firstCheckbox as HTMLElement).click();
      await Promise.resolve();
    });
    await flushEffects();
    await typeInto("whsec_...", "whsec_testsecret");
    await clickButton("Create Webhook", { last: true });
    await flushEffects();

    expect(webhookState.createWebhook).toHaveBeenCalledTimes(1);
    expect(webhookState.createWebhook.mock.calls[0][0]).toMatchObject({
      name: "New Hook",
      url: "https://new.example.com/hook",
      enabled: true,
      secret: "whsec_testsecret",
    });
    expect(document.body.textContent).toContain("https://new.example.com/hook");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage edits a webhook through confirmation", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Edit webhook");
    expect(document.body.textContent).toContain("Edit Webhook");

    await typeInto("e.g. Marketing Sync", "Renamed Hook");
    await clickButton("Save Changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Review webhook changes");
    await clickButton("Save webhook changes");
    await flushEffects();

    expect(webhookState.updateWebhook).toHaveBeenCalledWith(
      "webhook-1",
      expect.objectContaining({ name: "Renamed Hook" })
    );
    expect(document.body.textContent).toContain("https://renamed.example.com/hook");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage surfaces drawer save errors", async () => {
  webhookState.createWebhook.mockRejectedValueOnce(apiError("endpoint rejected"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Create Webhook");
    await typeInto("e.g. Marketing Sync", "New Hook");
    await typeInto("https://your-domain.com/webhook", "https://new.example.com/hook");
    await clickButton("Create Webhook", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("endpoint rejected");

    webhookState.createWebhook.mockRejectedValueOnce(new Error("boom"));
    await clickButton("Create Webhook", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to save webhook.");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage surfaces delete errors", async () => {
  webhookState.deleteWebhook.mockRejectedValueOnce(apiError("not allowed"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Delete webhook");
    await clickButton("Delete webhook");
    await flushEffects();
    expect(document.body.textContent).toContain("not allowed");

    webhookState.deleteWebhook.mockRejectedValueOnce(new Error("boom"));
    await clickByAria("Delete webhook");
    await clickButton("Delete webhook");
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to delete webhook.");
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage tests a webhook and refreshes the list", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Edit webhook");
    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(webhookState.testWebhook).toHaveBeenCalledWith("webhook-1");
    expect(webhookState.listWebhooks).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage surfaces test errors in the drawer", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Edit webhook");
    webhookState.testWebhook.mockRejectedValueOnce(apiError("delivery failed"));
    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(document.body.textContent).toContain("delivery failed");

    webhookState.testWebhook.mockRejectedValueOnce(new Error("boom"));
    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(document.body.textContent).toContain("Webhook test failed.");
  } finally {
    view.cleanup();
  }
});

test("WebhookDrawer generates a signing secret through the crypto path", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    const originalCrypto = (globalThis as { crypto?: Crypto }).crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) },
      configurable: true,
    });
    try {
      await flushEffects();
      await clickButton("Create Webhook");
      await clickButton("Generate");
      await flushEffects();
      const secretInput = inputByPlaceholder("whsec_...");
      expect(secretInput.value.startsWith("whsec_")).toBe(true);
    } finally {
      if (originalCrypto) {
        Object.defineProperty(globalThis, "crypto", {
          value: originalCrypto,
          configurable: true,
        });
      } else {
        delete (globalThis as { crypto?: Crypto }).crypto;
      }
    }
  } finally {
    view.cleanup();
  }
});

test("WebhookDrawer falls back to Math.random when crypto is unavailable", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    const originalCrypto = (globalThis as { crypto?: Crypto }).crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
    });
    try {
      await flushEffects();
      await clickButton("Create Webhook");
      await clickButton("Generate");
      await flushEffects();
      const secretInput = inputByPlaceholder("whsec_...");
      expect(secretInput.value.startsWith("whsec_")).toBe(true);
    } finally {
      if (originalCrypto) {
        Object.defineProperty(globalThis, "crypto", {
          value: originalCrypto,
          configurable: true,
        });
      } else {
        delete (globalThis as { crypto?: Crypto }).crypto;
      }
    }
  } finally {
    view.cleanup();
  }
});

test("WebhookDrawer cancels the create flow and clears the form", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Create Webhook");
    await typeInto("e.g. Marketing Sync", "Draft name");
    await clickButton("Cancel");
    await flushEffects();
    expect(document.body.querySelector('input[placeholder="e.g. Marketing Sync"]')).toBeNull();
    expect(webhookState.createWebhook).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("WebhookDrawer disables test connection in create mode", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Create Webhook");
    const testButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Test Connection")
    );
    if (!testButton) throw new Error("missing test connection button");
    expect((testButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("WebhooksPage surfaces refresh errors after a test delivery", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Edit webhook");
    webhookState.listWebhooks.mockRejectedValueOnce(apiError("list broken"));
    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(document.body.textContent).toContain("list broken");

    webhookState.listWebhooks.mockRejectedValueOnce(new Error("boom"));
    await clickButton("Test Connection");
    await clickButton("Send test");
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to load webhooks.");
  } finally {
    view.cleanup();
  }
});

test("WebhooksTable disables row actions while a delete is pending", async () => {
  let resolveDelete: (value: { ok: boolean }) => void = () => undefined;
  webhookState.deleteWebhook.mockReturnValueOnce(
    new Promise<{ ok: boolean }>((resolve) => {
      resolveDelete = resolve;
    })
  );
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/webhooks">
      <WebhooksPage />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickByAria("Delete webhook");
    await clickButton("Delete webhook");
    await flushEffects();
    const editButton = document.body.querySelector('[aria-label="Edit webhook"]');
    expect((editButton as HTMLButtonElement).disabled).toBe(true);
    const deleteButton = document.body.querySelector('[aria-label="Delete webhook"]');
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
    await React.act(async () => {
      resolveDelete({ ok: true });
      await Promise.resolve();
    });
    await flushEffects();
  } finally {
    view.cleanup();
  }
});
