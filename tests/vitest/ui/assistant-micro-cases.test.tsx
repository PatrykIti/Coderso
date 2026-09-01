// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantAvatar } from "../../../core/admin/ui/assistant/AssistantAvatar";
import { AssistantEmptyState } from "../../../core/admin/ui/assistant/AssistantEmptyState";
import { AssistantMessage } from "../../../core/admin/ui/assistant/AssistantMessage";

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

const followUpResponse = {
  mode: "docs-only" as const,
  template: "how_to_answer" as const,
  detailLevel: "basic" as const,
  guideMode: "default" as const,
  answer: "Basic answer.",
  confidence: 0.61,
  sources: [],
  followUpOptions: [
    {
      id: "f1",
      label: "Show me the settings card",
      detailLevel: "medium" as const,
      guideMode: "default" as const,
      promptHint: "Show me the settings card",
    },
    {
      id: "f2",
      label: "Skip",
      detailLevel: "basic" as const,
      guideMode: "default" as const,
      promptHint: "Skip",
    },
  ],
  fallbackUsed: false,
  requestedMode: "docs-only" as const,
  effectiveMode: "docs-only" as const,
  retrievalBackend: "db" as const,
  llm: null,
};

test("AssistantAvatar renders video mode for video assets", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled assetUrl="https://cdn.example.com/avatar.mp4" state="idle" />
  );

  expect(html).toContain("Video");
  expect(html).toContain("avatar.mp4");
  expect(html).toContain("<video");
});

test("AssistantAvatar renders external copy for unknown asset extensions", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled assetUrl="https://cdn.example.com/avatar.bin" state="idle" />
  );

  expect(html).toContain("External");
  expect(html).toContain("Optional avatar can use image, video, or glb asset URL");
});

test("AssistantEmptyState invokes the prompt callback when a starter is clicked", () => {
  const onPromptSelect = vi.fn();
  const view = mount(<AssistantEmptyState onPromptSelect={onPromptSelect} />);

  const button = Array.from(view.container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Hero widget colors")
  );
  expect(button).toBeDefined();
  React.act(() => {
    button?.click();
  });

  expect(onPromptSelect).toHaveBeenCalledTimes(1);
  expect(onPromptSelect).toHaveBeenCalledWith("Where can I configure Hero widget colors?");

  view.cleanup();
});

test("AssistantEmptyState disables starter prompts when disabled", () => {
  const view = mount(<AssistantEmptyState disabled onPromptSelect={() => undefined} />);

  const buttons = Array.from(view.container.querySelectorAll("button"));
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons) {
    expect(button.hasAttribute("disabled")).toBe(true);
  }

  view.cleanup();
});

test("AssistantMessage invokes the follow-up callback when an option is clicked", () => {
  const onFollowUpSelect = vi.fn();
  const view = mount(
    <AssistantMessage
      role="assistant"
      text="Basic answer."
      response={followUpResponse}
      onFollowUpSelect={onFollowUpSelect}
    />
  );

  const button = Array.from(view.container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Show me the settings card")
  );
  expect(button).toBeDefined();
  React.act(() => {
    button?.click();
  });

  expect(onFollowUpSelect).toHaveBeenCalledTimes(1);
  expect(onFollowUpSelect).toHaveBeenCalledWith(
    expect.objectContaining({ id: "f1", label: "Show me the settings card" })
  );

  view.cleanup();
});

test("AssistantMessage does not render follow-up options when error is present", () => {
  const html = renderAdminUi(
    <AssistantMessage
      role="assistant"
      text="Basic answer."
      response={followUpResponse}
      error="provider_unavailable"
    />
  );

  expect(html).not.toContain("Need more?");
  expect(html).toContain("text-destructive");
});
