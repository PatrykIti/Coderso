// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AssistantSettingsCard } from "../../../core/admin/ui/settings/AssistantSettingsCard";
import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
  if (!button) {
    throw new Error(`Missing button: ${label}`);
  }
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

test("AssistantSettingsPage renders assistant settings", () => {
  const html = renderAdminUi(<AssistantSettingsPage />);

  expect(html).toContain("Assistant");
  expect(html).toContain("Launcher avatar");
  expect(html).toContain("Advanced");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});

test("AssistantSettingsCard keeps token and support controls in Advanced", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsCard
        values={{
          assistantEnabled: true,
          assistantLauncherAvatarEnabled: false,
          assistantLauncherAvatarAsset: "",
          assistantDefaultMode: "llm-guide",
          assistantDocsReindexOnBoot: false,
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxInputTokens: 128000,
          assistantLlmMaxOutputTokens: 8192,
          assistantLlmTimeoutMs: 20000,
          assistantQuotaRequestsPerMinute: 20,
          assistantQuotaRequestsPerDay: 1000,
        }}
        modelMetadata={{
          model: "openai/gpt-5.4-nano",
          maxInputTokens: 128000,
          maxOutputTokens: 8192,
          supportedParameters: ["max_tokens"],
          source: "provider",
        }}
        onRunReindex={() => undefined}
      />
    </AdminRouterProvider>
  );

  expect(document.body.textContent).toContain("OpenRouter limits loaded");
  expect(document.body.textContent).toContain("Advanced");
  expect(document.body.textContent).not.toContain("Max input tokens");

  await clickButton("Advanced");

  const html = view.container.innerHTML;
  expect(html).toContain("OpenRouter limits loaded");
  expect(html).toContain("Advanced");
  expect(html).toContain("Max input tokens");
  expect(html).toContain("Run support reindex");

  view.cleanup();
});

test("AssistantSettingsPage links OpenRouter provider to integrations secrets", () => {
  const html = renderAdminUi(
    <AssistantSettingsPage
      values={{
        assistantLlmEnabled: true,
        assistantLlmProvider: "openrouter",
      }}
    />,
    { path: "/admin/settings/assistant" }
  );

  expect(html).toContain("OpenRouter API key is stored as an encrypted integration secret");
  expect(html).toContain("Configure OpenRouter API key");
  expect(html).toContain("/admin/settings/integrations");
});

test("AssistantSettingsPage links OpenAI provider to integrations secrets", () => {
  const html = renderAdminUi(
    <AssistantSettingsPage
      values={{
        assistantLlmEnabled: true,
        assistantLlmProvider: "openai",
      }}
    />,
    { path: "/admin/settings/assistant" }
  );

  expect(html).toContain("OpenAI API key is stored as an encrypted integration secret");
  expect(html).toContain("Configure OpenAI API key");
  expect(html).toContain("/admin/settings/integrations");
});

test("Run reindex requires confirmation before calling assistant reindex", async () => {
  const onSave = vi.fn();
  const reindexSpy = vi.spyOn(assistantClient, "reindexAssistantDocs").mockResolvedValue({
    retrievalBackend: "db",
    builtAt: "2026-03-20T15:40:00.000Z",
    buildDurationMs: 120,
    docCount: 40,
    chunkCount: 220,
    totalTokens: 4400,
    actorId: "user-1",
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={{ assistantEnabled: true }} onSave={onSave} />
    </AdminRouterProvider>
  );

  await clickButton("Advanced");
  await clickButton("Run support reindex");
  expect(document.body.textContent).toContain("Run assistant reindex?");
  expect(onSave).not.toHaveBeenCalled();
  expect(reindexSpy).not.toHaveBeenCalled();

  await clickButton("Cancel");
  expect(reindexSpy).not.toHaveBeenCalled();

  await clickButton("Run support reindex");
  await clickButton("Run reindex", { last: true });

  expect(onSave).not.toHaveBeenCalled();
  expect(reindexSpy).toHaveBeenCalledTimes(1);

  view.cleanup();
});
