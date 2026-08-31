// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { IntegrationDrawer } from "../../../core/admin/ui/settings/IntegrationDrawer";

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

const flushEffects = async () => {
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("IntegrationDrawer requires confirmation before saving edited secrets", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      integration={{
        id: "slack",
        name: "Slack",
        status: "connected",
        description: "Team notifications",
        scopes: ["notifications:send"],
        fields: [
          {
            key: "webhookUrl",
            label: "Webhook URL",
            type: "secret",
            required: true,
            configured: true,
            value: null,
          },
        ],
      }}
    />
  );

  try {
    await clickButton("Update secret");
    const secretInput = document.body.querySelector('input[type="password"]');
    if (!(secretInput instanceof HTMLInputElement)) {
      throw new Error("missing secret input");
    }
    React.act(() => {
      setInputValue(secretInput, "whsec_replacement");
    });

    await clickButton("Save Changes");
    expect(document.body.textContent).toContain("Review integration secrets");
    expect(document.body.textContent).toContain("Slack: Webhook URL");
    expect(document.body.textContent).not.toContain("whsec_replacement");
    expect(onSave).not.toHaveBeenCalled();

    await clickButton("Cancel");
    expect(onSave).not.toHaveBeenCalled();

    await clickButton("Save Changes");
    await clickButton("Save secrets");
    await flushEffects();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("slack", { webhookUrl: "whsec_replacement" });
  } finally {
    view.cleanup();
  }
});

test("IntegrationDrawer validates required text fields before saving", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      integration={{
        id: "zapier",
        name: "Zapier",
        status: "disconnected",
        description: "Automation triggers",
        scopes: [],
        fields: [
          {
            key: "webhookKey",
            label: "Webhook Key",
            type: "text",
            required: true,
            configured: false,
            value: "",
          },
        ],
      }}
    />
  );
  try {
    await clickButton("Save Changes");
    expect(document.body.textContent).toContain("Fill in webhook key.");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("IntegrationDrawer clears a secret draft when the edit toggle is turned off", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      integration={{
        id: "resend",
        name: "Resend",
        status: "connected",
        description: "Transactional email",
        scopes: ["email:send"],
        fields: [
          {
            key: "apiKey",
            label: "API Key",
            type: "secret",
            required: true,
            configured: true,
            value: "re_existing",
          },
        ],
      }}
    />
  );
  try {
    await clickButton("Update secret");
    const secretInput = document.body.querySelector('input[type="password"]');
    if (!(secretInput instanceof HTMLInputElement)) {
      throw new Error("missing secret input");
    }
    React.act(() => {
      setInputValue(secretInput, "re_draftValue");
    });
    await clickButton("Keep existing");
    const clearedInput = document.body.querySelector('input[type="password"]');
    expect((clearedInput as HTMLInputElement).value).toBe("");
    expect((clearedInput as HTMLInputElement).disabled).toBe(true);
    await clickButton("Save Changes");
    await flushEffects();
    expect(onSave).toHaveBeenCalledWith("resend", {});
  } finally {
    view.cleanup();
  }
});

test("IntegrationDrawer clears secret values without rendering existing secret payloads", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <IntegrationDrawer
      open
      onOpenChange={() => undefined}
      onSave={onSave}
      integration={{
        id: "resend",
        name: "Resend",
        status: "connected",
        description: "Transactional email",
        scopes: ["email:send"],
        fields: [
          {
            key: "apiKey",
            label: "API Key",
            type: "secret",
            required: true,
            configured: true,
            value: "re_shouldNeverRender123456",
          },
        ],
      }}
    />
  );

  try {
    const secretInput = document.body.querySelector('input[type="password"]');
    if (!(secretInput instanceof HTMLInputElement)) {
      throw new Error("missing secret input");
    }

    expect(secretInput.value).toBe("");
    expect(document.body.textContent).not.toContain("re_shouldNeverRender123456");
    expect(document.body.innerHTML).not.toContain("re_shouldNeverRender123456");

    await clickButton("Update secret");
    await clickButton("Save Changes");
    await clickButton("Save secrets");
    await flushEffects();

    expect(onSave).toHaveBeenCalledWith("resend", { apiKey: null });
  } finally {
    view.cleanup();
  }
});
