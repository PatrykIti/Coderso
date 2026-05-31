// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const integrationsState = vi.hoisted(() => ({
  listIntegrations: vi.fn(),
  requestIntegration: vi.fn(),
  updateIntegration: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant: _variant,
    size: _size,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    [key: string]: unknown;
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DialogDescription: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <p {...props}>{children}</p>,
  DialogHeader: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DialogTitle: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
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
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({
    children,
    side: _side,
    showCloseButton: _showCloseButton,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/services/integrationsClient", () => ({
  listIntegrations: integrationsState.listIntegrations,
  requestIntegration: integrationsState.requestIntegration,
  updateIntegration: integrationsState.updateIntegration,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/ui/layouts/SettingsShell", () => ({
  SettingsShell: ({
    breadcrumbs,
    search,
    sidebar,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    search?: React.ReactNode;
    sidebar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {breadcrumbs}
      {search}
      {sidebar}
      {children}
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

import { IntegrationsPage } from "../../../core/admin/ui/settings/IntegrationsPage";

const slackRecord = {
  id: "slack",
  name: "Slack",
  description: "Team notifications",
  category: "Communication",
  scopes: ["notifications:send", "events:read"],
  status: "disconnected" as const,
  health: { status: "unknown", lastCheckedAt: null, lastError: null },
  updatedAt: null,
  fields: [
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "secret" as const,
      required: true,
      secret: true,
      configured: false,
      value: null,
    },
    {
      key: "defaultChannel",
      label: "Default channel",
      type: "text" as const,
      required: false,
      secret: false,
      configured: false,
      value: null,
    },
  ],
};

const openAiRecord = {
  id: "openai",
  name: "OpenAI",
  description: "Assistant LLM provider",
  category: "Developer Tools",
  scopes: ["assistant:generate", "assistant:retrieve"],
  status: "connected" as const,
  health: { status: "healthy", lastCheckedAt: null, lastError: null },
  updatedAt: null,
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret" as const,
      required: true,
      secret: true,
      configured: true,
      value: null,
    },
  ],
};

const mountPage = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/settings/integrations">
        <IntegrationsPage />
      </AdminRouterProvider>
    );
  });

  return {
    host,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setControlValue = async (element: Element | null | undefined, value: string) => {
  await React.act(async () => {
    if (element instanceof HTMLInputElement) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      descriptor?.set?.call(element, value);
    } else if (element instanceof HTMLTextAreaElement) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(element, value);
    } else {
      return;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};

const findButton = (host: HTMLElement, text: string) =>
  Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.replace(/\s+/g, " ").includes(text)
  );

afterEach(() => {
  integrationsState.listIntegrations.mockReset();
  integrationsState.requestIntegration.mockReset();
  integrationsState.updateIntegration.mockReset();
  document.body.innerHTML = "";
});

test("IntegrationsPage applies search and category filters before opening the drawer", async () => {
  integrationsState.listIntegrations.mockResolvedValue([slackRecord, openAiRecord]);

  const view = mountPage();

  try {
    await flush();

    expect(view.host.textContent).toContain("Slack");
    expect(view.host.textContent).toContain("OpenAI");

    const searchInput = view.host.querySelector('input[placeholder="Search integrations..."]');
    await setControlValue(searchInput, "assistant");
    await flush();

    expect(view.host.textContent).not.toContain("Slack");
    expect(view.host.textContent).toContain("OpenAI");

    await setControlValue(searchInput, "");
    await flush();

    await React.act(async () => {
      findButton(view.host, "Communication")?.click();
    });

    expect(view.host.textContent).toContain("Slack");
    expect(view.host.textContent).not.toContain("OpenAI");

    await React.act(async () => {
      findButton(view.host, "Connect")?.click();
    });

    expect(view.host.textContent).toContain("Connection status");
    expect(view.host.textContent).toContain("notifications:send, events:read");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage trims request payload and clears stale request state after reopen", async () => {
  integrationsState.listIntegrations.mockResolvedValue([slackRecord]);
  integrationsState.requestIntegration.mockRejectedValueOnce({
    name: "ApiClientError",
    message: "Request failed.",
  });

  const view = mountPage();

  try {
    await flush();

    await React.act(async () => {
      findButton(view.host, "Request new")?.click();
    });

    await setControlValue(
      view.host.querySelector('input[placeholder="e.g. HubSpot"]'),
      "  Acme CRM  "
    );
    await setControlValue(
      view.host.querySelector('input[placeholder="https://..."]'),
      "  https://acme.example.com  "
    );
    await setControlValue(
      view.host.querySelector('textarea[placeholder*="Describe what you need"]'),
      "  Need webhook support  "
    );

    await React.act(async () => {
      findButton(view.host, "Submit Request")?.click();
      await Promise.resolve();
    });

    expect(integrationsState.requestIntegration).toHaveBeenCalledWith({
      name: "Acme CRM",
      website: "https://acme.example.com",
      notes: "Need webhook support",
    });
    expect(view.host.textContent).toContain("Request failed.");

    await React.act(async () => {
      findButton(view.host, "Cancel")?.click();
    });

    expect(view.host.textContent).not.toContain("Request New Integration");

    await React.act(async () => {
      findButton(view.host, "Request new")?.click();
    });

    expect(view.host.textContent).toContain("Request New Integration");
    expect(view.host.textContent).not.toContain("Request failed.");
    expect(
      (view.host.querySelector('input[placeholder="e.g. HubSpot"]') as HTMLInputElement)?.value
    ).toBe("");
    expect(
      (view.host.querySelector('input[placeholder="https://..."]') as HTMLInputElement)?.value
    ).toBe("");
    expect(
      (
        view.host.querySelector(
          'textarea[placeholder*="Describe what you need"]'
        ) as HTMLTextAreaElement
      )?.value
    ).toBe("");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage clears unsaved secret edits when reopening the same drawer", async () => {
  integrationsState.listIntegrations.mockResolvedValue([slackRecord]);

  const view = mountPage();

  try {
    await flush();

    await React.act(async () => {
      findButton(view.host, "Connect")?.click();
    });

    await React.act(async () => {
      findButton(view.host, "Update secret")?.click();
    });

    const secretInput = view.host.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;
    await setControlValue(secretInput, "temporary-secret");
    expect(secretInput?.value).toBe("temporary-secret");

    await React.act(async () => {
      findButton(view.host, "Cancel")?.click();
    });

    await React.act(async () => {
      findButton(view.host, "Connect")?.click();
    });

    const reopenedSecretInput = view.host.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;
    expect(reopenedSecretInput?.disabled).toBe(true);
    expect(reopenedSecretInput?.value).toBe("");
    expect(view.host.textContent).toContain("Update secret");
    expect(view.host.textContent).not.toContain("Keep existing");
  } finally {
    view.cleanup();
  }
});

test("IntegrationsPage trims drawer payload before saving integration updates", async () => {
  integrationsState.listIntegrations.mockResolvedValue([slackRecord]);
  integrationsState.updateIntegration.mockResolvedValue({
    item: {
      ...slackRecord,
      status: "connected",
      fields: [
        {
          ...slackRecord.fields[0],
          configured: true,
        },
        {
          ...slackRecord.fields[1],
          configured: true,
          value: "#ops",
        },
      ],
    },
  });

  const view = mountPage();

  try {
    await flush();

    await React.act(async () => {
      findButton(view.host, "Connect")?.click();
    });

    await React.act(async () => {
      findButton(view.host, "Update secret")?.click();
    });

    const inputs = Array.from(view.host.querySelectorAll("input")) as HTMLInputElement[];
    const secretInput = inputs.find((input) => input.type === "password");
    const channelInput = inputs.at(-1);

    await setControlValue(secretInput, "  https://hooks.slack.com/services/test  ");
    await setControlValue(channelInput, "  #ops  ");

    await React.act(async () => {
      findButton(view.host, "Save Changes")?.click();
      await Promise.resolve();
    });

    expect(integrationsState.updateIntegration).toHaveBeenCalledWith("slack", {
      config: {
        webhookUrl: "https://hooks.slack.com/services/test",
        defaultChannel: "#ops",
      },
    });
  } finally {
    view.cleanup();
  }
});
