// @vitest-environment happy-dom
//
// TASK-479-28-L07: Assistant settings restyle (L03). Proves the model field
// offers the latest-Claude suggestions while staying free-form, the page never
// renders a provider-key input (the key is an Integrations secret reached via a
// delegation link), the LLM-Guide validation still gates Save, and the docs
// reindex stays behind its confirm dialog.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";

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

const clickButton = async (label: string, options: { last?: boolean } = {}) => {
  const matches = Array.from(document.body.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(label)
  );
  const button = options.last ? matches.at(-1) : matches[0];
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("offers latest-Claude model suggestions and keeps the field free-form", () => {
  const html = renderAdminUi(
    <AssistantSettingsPage
      values={{ assistantLlmEnabled: true, assistantLlmModel: "anthropic/claude-opus-4" }}
      onSave={vi.fn()}
    />,
    { path: "/admin/settings/assistant" }
  );

  // curated suggestions surfaced via a <datalist>
  expect(html).toContain("assistant-model-suggestions");
  expect(html).toContain("claude-opus-4-8");
  expect(html).toContain("claude-sonnet-4-6");
  expect(html).toContain("claude-haiku-4-5");
  // the field still carries the persisted, provider-specific value (free-form)
  expect(html).toContain("anthropic/claude-opus-4");
});

test("renders no provider-key input and delegates to Integrations", () => {
  const html = renderAdminUi(
    <AssistantSettingsPage
      values={{ assistantLlmEnabled: true, assistantLlmProvider: "openrouter" }}
      onSave={vi.fn()}
    />,
    { path: "/admin/settings/assistant" }
  );

  expect(html).toContain("/admin/settings/integrations");
  expect(html).toContain("Configure OpenRouter API key");
  // no key field on this page, and no stored secret rendered
  expect(html).not.toContain('type="password"');
  expect(html).not.toContain("sk-ant-");
});

test("blocks Save while LLM-Guide validation fails", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={{ assistantDefaultMode: "llm-guide", assistantLlmEnabled: false }}
        onSave={onSave}
      />
    </AdminRouterProvider>
  );

  try {
    expect(view.container.textContent).toContain(
      "LLM Guide requires enabled LLM and a provider different than 'none'."
    );
    await clickButton("Save changes");
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("docs reindex stays behind its confirm dialog", async () => {
  const reindexSpy = vi.spyOn(assistantClient, "reindexAssistantDocs");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={{ assistantEnabled: true }} onSave={vi.fn()} />
    </AdminRouterProvider>
  );

  try {
    await clickButton("Advanced");
    await clickButton("Run support reindex");
    expect(document.body.textContent).toContain("Run assistant reindex?");
    expect(reindexSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
