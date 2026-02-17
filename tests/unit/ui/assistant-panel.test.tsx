import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantEmptyState } from "../../../core/admin/ui/assistant/AssistantEmptyState";
import { AssistantMessage } from "../../../core/admin/ui/assistant/AssistantMessage";
import { AssistantModeSwitch } from "../../../core/admin/ui/assistant/AssistantModeSwitch";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";

test("AssistantPanel renders loading trigger in SSR", () => {
  const html = renderAdminUi(<AssistantPanel />);

  expect(html).toContain("Assistant");
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
  expect(html).toContain("_docs/SETTINGS.md");
});
