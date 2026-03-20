import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantEmptyState } from "../../../core/admin/ui/assistant/AssistantEmptyState";
import { AssistantMessage } from "../../../core/admin/ui/assistant/AssistantMessage";
import { AssistantModeSwitch } from "../../../core/admin/ui/assistant/AssistantModeSwitch";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";

test("AssistantPanel renders floating launcher when assistant is globally enabled", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: true,
        launcherAvatarEnabled: false,
        launcherAvatarAsset: null,
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toContain('aria-label="Open assistant conversation"');
});

test("AssistantPanel stays hidden when assistant is globally disabled", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: false,
        launcherAvatarEnabled: false,
        launcherAvatarAsset: null,
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toBe("");
});

test("AssistantPanel launcher uses avatar asset when configured", () => {
  const html = renderAdminUi(
    <AdminAssistantConfigProvider
      value={{
        enabled: true,
        launcherAvatarEnabled: true,
        launcherAvatarAsset: "https://cdn.example.com/avatar.png",
      }}
    >
      <AssistantPanel />
    </AdminAssistantConfigProvider>
  );

  expect(html).toContain("avatar.png");
});

test("AssistantModeSwitch renders mode selector", () => {
  const html = renderAdminUi(
    <AssistantModeSwitch
      value="docs-only"
      llmAvailable={false}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Assistant mode");
  expect(html).toContain("Docs only");
});

test("AssistantEmptyState renders starter prompts", () => {
  const html = renderAdminUi(
    <AssistantEmptyState onPromptSelect={() => undefined} />
  );

  expect(html).toContain("Ask where something is in docs");
  expect(html).toContain("Hero widget colors");
});

test("AssistantMessage renders assistant metadata and sources", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text="Use General Settings > Assistant card."
      response={{
        mode: "llm-rag",
        template: "location_answer",
        answer: "Use General Settings > Assistant card.",
        confidence: 0.81,
        sources: [
          {
            path: "_docs/SETTINGS.md",
            heading: "Assistant settings",
            lineStart: 20,
            lineEnd: 45,
            snippet: "assistant.enabled",
            score: 2.1,
          },
        ],
        fallbackUsed: true,
        requestedMode: "llm-rag",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }}
    />
  );

  expect(html).toContain("Fallback applied");
  expect(html).toContain("Internal Docs");
  expect(html).not.toContain("Sources");
  expect(html).not.toContain("_docs/SETTINGS.md");
  expect(html).toContain("break-words");
  expect(html).toContain("overflow-wrap:anywhere");
});
