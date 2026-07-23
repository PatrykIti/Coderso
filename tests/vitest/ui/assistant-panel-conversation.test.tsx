// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import * as assistantStatusClient from "../../../core/admin/services/assistantStatusClient";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  findButton,
  flush,
  mockUserSettings,
  mount,
  resetAssistantPanelTestState,
  setTextareaValue,
} from "./support/assistantPanelInteractionHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(resetAssistantPanelTestState);

test("AssistantPanel starts LLM Guide when docs are not ready but LLM is available", async () => {
  window.localStorage.setItem(
    "coderso.assistant.conversation.state",
    JSON.stringify({
      schemaVersion: 1,
      messages: [],
      activePlan: null,
      activePreview: null,
      activeExecution: null,
      planningState: null,
      assistantMode: "docs-only",
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  );

  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "docs-only",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: false,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 0,
    chunkCount: 0,
  });
  mockUserSettings({ "assistant.mode": "docs-only" });
  const chatSpy = vi.spyOn(assistantClient, "sendAssistantMessage");
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-full-service",
    status: "ready",
    intentId: "full-service",
    title: "Full Service Website",
    answer: "I can prepare a complete service website structure.",
    summary: "Create a complete service website plan.",
    confidence: 0.88,
    assumptions: [],
    questions: [],
    actions: [],
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const launcher = findButton(view.container, "");
    if (!launcher) throw new Error("missing_launcher");

    await React.act(async () => {
      launcher.click();
      await flush();
    });

    expect(view.container.textContent).not.toContain("Assistant docs are not ready yet");

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }
    expect(textarea.disabled).toBe(false);
    expect(textarea.getAttribute("placeholder")).toContain("LLM Guide");

    await React.act(async () => {
      setTextareaValue(textarea, "utworz kompletny serwis dla pracowni architektury");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("complete service website structure");
    expect(
      JSON.parse(window.localStorage.getItem("coderso.assistant.conversation.state") ?? "{}")
        .assistantMode
    ).toBe("llm-guide");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel keeps docs-only mode on assistant chat route", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "docs-only",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 12,
    chunkCount: 44,
  });
  mockUserSettings({ "assistant.mode": "docs-only" });
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions");
  const chatSpy = vi.spyOn(assistantClient, "sendAssistantMessage").mockResolvedValue({
    mode: "docs-only",
    template: "how_to_answer",
    detailLevel: "medium",
    guideMode: "default",
    answer: "Open Custom Screens from Coderso.",
    confidence: 0.7,
    sources: [],
    followUpOptions: [],
    fallbackUsed: false,
    requestedMode: "docs-only",
    effectiveMode: "docs-only",
    retrievalBackend: "db",
    llm: null,
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/custom-screens">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const launcher = findButton(view.container, "");
    if (!launcher) throw new Error("missing_launcher");

    await React.act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await React.act(async () => {
      setTextareaValue(textarea, "gdzie znajde custom screens?");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(planSpy).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Open Custom Screens from Coderso.");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel renders LLM Guide docs response without action review", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "llm-guide",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 12,
    chunkCount: 44,
  });
  mockUserSettings();
  vi.spyOn(assistantClient, "sendAssistantMessage");
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-docs-guidance",
    status: "ready",
    intentId: "docs-guidance",
    responseKind: "docs",
    promptKind: "docs_question",
    intentFamily: "unknown",
    title: "Documentation guidance",
    answer: "This is a documentation-style answer from the planner.",
    summary: "Docs guidance.",
    confidence: 0.62,
    assumptions: ["Read-only."],
    questions: [],
    actions: [],
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/widgets">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const launcher = findButton(view.container, "");
    if (!launcher) throw new Error("missing_launcher");

    await React.act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await React.act(async () => {
      setTextareaValue(textarea, "gdzie zmienie kolory hero widgetu?");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(assistantClient.planAssistantActions).toHaveBeenCalledTimes(1);
    expect(assistantClient.sendAssistantMessage).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain(
      "This is a documentation-style answer from the planner."
    );
    expect(view.container.textContent).not.toContain("LLM Guide Plan");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel sends prior inspection candidates as planning state", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "llm-guide",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 12,
    chunkCount: 44,
  });
  mockUserSettings();
  const planSpy = vi
    .spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce({
      id: "plan-cms-custom-screen-inspect",
      status: "ready",
      intentId: "cms-resource-inspect",
      responseKind: "inspection",
      title: "CMS resource inspection",
      answer: "Found screens.",
      summary: "Found candidates.",
      confidence: 0.72,
      assumptions: ["Read-only."],
      questions: [],
      inspection: {
        kind: "resource-candidates",
        operation: "inspect",
        resourceKind: "custom-screen",
        matchStatus: "matched",
        query: "House Projects",
        candidates: [
          {
            kind: "custom-screen",
            id: "screen-house",
            label: "House Projects",
            status: "active",
          },
        ],
        truncated: false,
      },
      actions: [],
    })
    .mockResolvedValueOnce({
      id: "plan-custom-screen-delete",
      status: "ready",
      intentId: "custom-screen-delete",
      responseKind: "action_plan",
      title: "Delete House Projects",
      answer: "Plan ready.",
      summary: "Delete selected screen.",
      confidence: 0.78,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "custom-screen-delete-screen-house",
          type: "custom-screen.delete",
          title: "Delete House Projects",
          description: "Delete selected screen.",
          input: {
            id: "screen-house",
            name: "House Projects",
          },
        },
      ],
    });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/custom-screens">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const launcher = findButton(view.container, "");
    if (!launcher) throw new Error("missing_launcher");

    await React.act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await React.act(async () => {
      setTextareaValue(textarea, "jakie ekrany widzisz z prefixem House Projects?");
      await flush();
    });
    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    await React.act(async () => {
      setTextareaValue(textarea, "usun pierwszy");
      await flush();
    });
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    expect(planSpy.mock.calls[1]?.[0].context?.planningState).toMatchObject({
      resourceKind: "custom-screen",
      query: "House Projects",
      candidates: [
        {
          id: "screen-house",
          label: "House Projects",
        },
      ],
    });
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel starts a new empty conversation from footer action", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "llm-guide",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 12,
    chunkCount: 44,
  });
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-docs-response",
    status: "ready",
    intentId: "docs-response",
    responseKind: "docs",
    title: "Docs response",
    answer: "This is the current answer.",
    summary: "Docs answer.",
    confidence: 0.8,
    assumptions: [],
    questions: [],
    actions: [],
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/custom-screens">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const launcher = findButton(view.container, "");
    if (!launcher) throw new Error("missing_launcher");

    await React.act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await React.act(async () => {
      setTextareaValue(textarea, "gdzie sa ustawienia?");
      await flush();
    });
    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("This is the current answer.");

    const newButton = findButton(view.container, "New");
    if (!newButton) throw new Error("missing_new_button");
    await React.act(async () => {
      newButton.click();
      await flush();
    });

    expect(view.container.textContent).not.toContain("This is the current answer.");
    expect(view.container.textContent).toContain("Ask where something is in docs");
    expect(textarea.value).toBe("");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel restores conversation after close and SPA remount", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    enabled: true,
    defaultMode: "llm-guide",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: null,
    docCount: 12,
    chunkCount: 44,
  });
  mockUserSettings();
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-cms-custom-screen-inspect",
    status: "ready",
    intentId: "cms-resource-inspect",
    responseKind: "inspection",
    title: "CMS resource inspection",
    answer: "Found screens.",
    summary: "Found candidates.",
    confidence: 0.72,
    assumptions: ["Read-only."],
    questions: [],
    inspection: {
      kind: "resource-candidates",
      operation: "inspect",
      resourceKind: "custom-screen",
      matchStatus: "matched",
      query: "House Projects",
      candidates: [
        {
          kind: "custom-screen",
          id: "screen-house",
          label: "House Projects",
          status: "active",
        },
      ],
      truncated: false,
    },
    actions: [],
  });

  const firstView = mount(
    <AdminRouterProvider initialPath="/admin">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  const firstLauncher = findButton(firstView.container, "");
  if (!firstLauncher) throw new Error("missing_first_launcher");
  await React.act(async () => {
    firstLauncher.click();
    await flush();
  });
  const textarea = firstView.container.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
  await React.act(async () => {
    setTextareaValue(textarea, "jakie ekrany widzisz z prefixem House Projects?");
    await flush();
  });
  const sendButton = findButton(firstView.container, "Send");
  if (!sendButton) throw new Error("missing_send_button");
  await React.act(async () => {
    sendButton.click();
    await flush();
  });
  expect(firstView.container.textContent).toContain("House Projects");
  firstView.cleanup();

  const secondView = mount(
    <AdminRouterProvider initialPath="/admin/advanced/custom-screens">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: false,
          launcherAvatarAsset: null,
        }}
      >
        <AssistantPanel />
      </AdminAssistantConfigProvider>
    </AdminRouterProvider>
  );

  try {
    const secondLauncher = findButton(secondView.container, "");
    if (!secondLauncher) throw new Error("missing_second_launcher");
    await React.act(async () => {
      secondLauncher.click();
      await flush();
    });
    expect(secondView.container.textContent).toContain(
      "jakie ekrany widzisz z prefixem House Projects?"
    );
    expect(secondView.container.textContent).toContain("House Projects");
    expect(secondView.container.textContent).not.toContain("Loading assistant runtime");
    expect(planSpy).toHaveBeenCalledTimes(1);
  } finally {
    secondView.cleanup();
  }
});
