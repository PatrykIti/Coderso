// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const integrationsState = vi.hoisted(() => {
  const baseItem = {
    id: "slack",
    name: "Slack",
    description: "Team notifications",
    status: "connected" as const,
    category: "Messaging",
    scopes: ["notifications:send"],
    fields: [
      {
        key: "channel",
        label: "Channel",
        type: "text" as const,
        required: true,
        configured: false,
        value: "general",
      },
      {
        key: "token",
        label: "Token",
        type: "secret" as const,
        required: true,
        configured: true,
        value: null,
      },
    ],
    health: {
      status: "healthy" as const,
      lastCheckedAt: "2025-06-01T10:00:00.000Z",
      lastError: null,
    },
  };
  const resendItem = {
    id: "resend",
    name: "Resend",
    description: "Transactional email",
    status: "connected" as const,
    category: "Email",
    scopes: ["email:send"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "secret" as const,
        required: true,
        configured: true,
        value: null,
      },
    ],
    health: {
      status: "healthy" as const,
      lastCheckedAt: "2025-06-01T10:00:00.000Z",
      lastError: null,
    },
  };
  const state = {
    item: baseItem,
    resendItem,
    listIntegrations: vi.fn(),
    updateIntegration: vi.fn(),
    checkIntegration: vi.fn(),
    requestIntegration: vi.fn(),
    reset() {
      state.listIntegrations.mockReset();
      state.updateIntegration.mockReset();
      state.checkIntegration.mockReset();
      state.requestIntegration.mockReset();
      state.listIntegrations.mockResolvedValue([state.item, state.resendItem]);
      state.updateIntegration.mockResolvedValue({ item: state.item });
      state.checkIntegration.mockResolvedValue({ item: state.item });
      state.requestIntegration.mockResolvedValue({ ok: true });
    },
  };
  return state;
});

vi.mock("@/services/integrationsClient", () => ({
  listIntegrations: integrationsState.listIntegrations,
  updateIntegration: integrationsState.updateIntegration,
  checkIntegration: integrationsState.checkIntegration,
  requestIntegration: integrationsState.requestIntegration,
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

async function toggleRequestDialog() {
  const dialog = document.body.querySelector<HTMLElement>('[data-testid="request-dialog"]');
  if (!dialog) throw new Error("missing request dialog");
  const toggle = dialog.querySelector<HTMLButtonElement>('[data-testid="dialog-toggle"]');
  if (!toggle) throw new Error("missing dialog toggle");
  await React.act(async () => {
    toggle.click();
    await Promise.resolve();
  });
}

function inputByPlaceholder(placeholder: string) {
  const input = Array.from(document.body.querySelectorAll("input")).find(
    (item) => item.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) throw new Error(`missing input: ${placeholder}`);
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
  integrationsState.reset();
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
    <AdminRouterProvider initialPath="/admin/settings/integrations">
      <IntegrationsPage />
    </AdminRouterProvider>
  );

test("IntegrationsPage shows the API error message on load failure", async () => {
  integrationsState.listIntegrations.mockRejectedValue(
    new ApiClientError("down", "list_down", 503)
  );
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("list_down");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage falls back to a generic load error", async () => {
  integrationsState.listIntegrations.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("Failed to load integrations.");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage surfaces API and generic save failures inside the drawer", async () => {
  integrationsState.updateIntegration.mockRejectedValue(
    new ApiClientError("bad", "save_down", 400)
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Save Changes");
    await flush();
    expect(pageText()).toContain("save_down");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage falls back to a generic save failure", async () => {
  integrationsState.updateIntegration.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Save Changes");
    await flush();
    expect(pageText()).toContain("Failed to update integration.");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage closes the drawer after a successful save", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Save Changes");
    await flush();
    expect(integrationsState.updateIntegration).toHaveBeenCalledWith("slack", {
      config: { channel: "general" },
    });
    expect(pageText()).not.toContain("Connection status");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage surfaces API and generic test-connection failures", async () => {
  integrationsState.checkIntegration.mockRejectedValue(
    new ApiClientError("down", "check_down", 503)
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Test connection");
    await flush();
    expect(pageText()).toContain("check_down");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage falls back to a generic test-connection failure", async () => {
  integrationsState.checkIntegration.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Test connection");
    await flush();
    expect(pageText()).toContain("Failed to test connection.");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage keeps the drawer open while a connection test succeeds", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Configure");
    await clickButton("Test connection");
    await flush();
    expect(integrationsState.checkIntegration).toHaveBeenCalledWith("slack");
    expect(pageText()).toContain("Connection status");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage validates the service name before submitting a request", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Request new");
    await clickButton("Submit Request");
    expect(pageText()).toContain("Please provide a service name.");
    expect(integrationsState.requestIntegration).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage submits an integration request with trimmed fields", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Request new");
    setInputValue(inputByPlaceholder("e.g. HubSpot"), "HubSpot");
    setInputValue(inputByPlaceholder("https://..."), "https://hubspot.com");
    await clickButton("Submit Request");
    await flush();
    expect(integrationsState.requestIntegration).toHaveBeenCalledWith({
      name: "HubSpot",
      website: "https://hubspot.com",
      notes: null,
    });
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage surfaces API and generic request failures", async () => {
  integrationsState.requestIntegration.mockRejectedValue(
    new ApiClientError("down", "req_down", 503)
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("Request new");
    setInputValue(inputByPlaceholder("e.g. HubSpot"), "HubSpot");
    await clickButton("Submit Request");
    await flush();
    expect(pageText()).toContain("req_down");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage falls back to a generic request failure", async () => {
  integrationsState.requestIntegration.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("Request new");
    setInputValue(inputByPlaceholder("e.g. HubSpot"), "HubSpot");
    await clickButton("Submit Request");
    await flush();
    expect(pageText()).toContain("Failed to submit request.");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage filters and searches integrations", async () => {
  const view = renderPage();
  try {
    await flush();
    const search = inputByPlaceholder("Search integrations...");
    setInputValue(search, "slack");
    await flush();
    expect(pageText()).toContain("Slack");

    setInputValue(search, "resend");
    await flush();
    expect(pageText()).not.toContain("Slack");

    setInputValue(search, "");
    await flush();
    await clickButton("Messaging");
    expect(pageText()).toContain("Slack");
    expect(pageText()).not.toContain("Resend");
    await clickButton("Email");
    expect(pageText()).not.toContain("Slack");
    expect(pageText()).toContain("Resend");
    await clickButton("All Services");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage closes the request dialog through the header close button", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Request new");
    expect(pageText()).toContain("Request New Integration");
    const closeButton = Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.getAttribute("aria-label") === "Close integration request dialog"
    );
    if (!(closeButton instanceof HTMLButtonElement)) throw new Error("missing close button");
    await React.act(async () => {
      closeButton.click();
      await Promise.resolve();
    });
    await flush();
    expect(pageText()).not.toContain("Request New Integration");
  } finally {
    view.cleanup();
  }
});
