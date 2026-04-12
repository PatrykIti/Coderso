// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("AssistantSettingsPage renders assistant settings", () => {
  const html = renderAdminUi(<AssistantSettingsPage />);

  expect(html).toContain("Assistant Settings");
  expect(html).toContain("Assistant");
  expect(html).toContain("Launcher avatar");
  expect(html).toContain("Run reindex");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
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

test("Run reindex triggers assistant reindex without calling onSave first", async () => {
  const onSave = vi.fn();
  const reindexSpy = vi
    .spyOn(assistantClient, "reindexAssistantDocs")
    .mockResolvedValue({
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
      <AssistantSettingsPage
        values={{ assistantEnabled: true }}
        onSave={onSave}
      />
    </AdminRouterProvider>
  );

  const reindexButton = Array.from(view.container.querySelectorAll("button")).find(
    (button) => button.textContent?.includes("Run reindex")
  );

  if (!reindexButton) {
    throw new Error("Missing reindex button");
  }

  await act(async () => {
    reindexButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(onSave).not.toHaveBeenCalled();
  expect(reindexSpy).toHaveBeenCalledTimes(1);

  view.cleanup();
});
