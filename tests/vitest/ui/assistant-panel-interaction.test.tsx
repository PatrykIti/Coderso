// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import * as userSettingsClient from "../../../core/admin/services/userSettingsClient";
import { AssistantPanel, clearAssistantRuntimeStateCache } from "../../../core/admin/ui/assistant/AssistantPanel";
import { clearAssistantConversationState } from "../../../core/admin/ui/assistant/assistantConversationState";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

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

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const findButton = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) as HTMLButtonElement | null | undefined;

const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

afterEach(() => {
  clearAssistantRuntimeStateCache();
  clearAssistantConversationState();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("AssistantPanel supports llm-guide prompt -> dry-run -> execute flow", async () => {
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
  vi.spyOn(userSettingsClient, "setUserSetting").mockResolvedValue({
    key: "assistant.mode",
    value: "llm-guide",
  });
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-house-projects-catalog",
    status: "ready",
    intentId: "house-projects-catalog",
    title: "House Projects Catalog",
    answer: "I can set up a complete catalog flow for house projects in Coderso.",
    summary: "Create catalog surfaces.",
    confidence: 0.91,
    assumptions: ["Use existing Coderso surfaces."],
    questions: [],
    actions: [
      {
        id: "content-type-house-projects",
        type: "content-type.upsert",
        title: "Create the house projects content model",
        description: "Structured fields for project data.",
        input: {
          slug: "house-projects",
          name: "House Projects",
          schema: { type: "object" },
        },
      },
    ],
  });
  const dryRunSpy = vi.spyOn(assistantClient, "dryRunAssistantActions").mockResolvedValue({
    plan: {
      id: "plan-house-projects-catalog",
      status: "ready",
      intentId: "house-projects-catalog",
      title: "House Projects Catalog",
      answer: "I can set up a complete catalog flow for house projects in Coderso.",
      summary: "Create catalog surfaces.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "content-type-house-projects",
          type: "content-type.upsert",
          title: "Create the house projects content model",
          description: "Structured fields for project data.",
          input: {
            slug: "house-projects",
            name: "House Projects",
            schema: { type: "object" },
          },
        },
      ],
    },
    changes: [
      {
        actionId: "content-type-house-projects",
        type: "content-type.upsert",
        targetType: "content-type",
        targetKey: "house-projects",
        operation: "create",
        summary: "Create content type",
        conflicts: [],
        dependencies: [],
        warnings: [],
      },
    ],
    warnings: [],
    readyToExecute: true,
  });
  const executeSpy = vi.spyOn(assistantClient, "executeAssistantActions").mockResolvedValue({
    plan: {
      id: "plan-house-projects-catalog",
      status: "ready",
      intentId: "house-projects-catalog",
      title: "House Projects Catalog",
      answer: "I can set up a complete catalog flow for house projects in Coderso.",
      summary: "Create catalog surfaces.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "content-type-house-projects",
          type: "content-type.upsert",
          title: "Create the house projects content model",
          description: "Structured fields for project data.",
          input: {
            slug: "house-projects",
            name: "House Projects",
            schema: { type: "object" },
          },
        },
      ],
    },
    preview: {
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Summary",
        confidence: 0.91,
        assumptions: [],
        questions: [],
        actions: [],
      },
      changes: [],
      warnings: [],
      readyToExecute: true,
    },
    results: [
      {
        actionId: "page-house-projects-catalog",
        type: "page.upsert",
        targetType: "page",
        targetKey: "/projekty-domow",
        operation: "create",
        status: "success",
        resourceId: "page-1",
        adminHref: "/admin/pages/page-1",
        publicHref: "/projekty-domow",
        message: "Public catalog page is ready at /projekty-domow.",
      },
    ],
    summary: {
      create: 1,
      update: 0,
      noop: 0,
      failed: 0,
    },
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/coderso/widgets">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(
        textarea,
        "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog"
      );
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await act(async () => {
      sendButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("House Projects Catalog");
    expect(assistantClient.planAssistantActions).toHaveBeenCalledTimes(1);
    expect(assistantClient.planAssistantActions).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          includeResourceCatalog: true,
          runtimeSnapshot: expect.objectContaining({
            route: "/admin/coderso/widgets",
            codersoModule: "widgets",
          }),
        }),
      })
    );

    const dryRunButton = findButton(view.container, "Dry-run changes");
    if (!dryRunButton) throw new Error("missing_dry_run_button");
    await act(async () => {
      dryRunButton.click();
      await flush();
    });
    expect(dryRunSpy).toHaveBeenCalledTimes(1);

    const executeButton = findButton(view.container, "Execute reviewed actions");
    if (!executeButton) throw new Error("missing_execute_button");
    await act(async () => {
      executeButton.click();
      await flush();
    });

    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Action results");
    expect(view.container.textContent).toContain("Open public page");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel renders needs-input guide plan without enabling execution", async () => {
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-needs-input",
    status: "needs_input",
    intentId: "house-projects-catalog",
    title: "Need more guidance before planning",
    answer: "Please clarify the type of catalog you want me to create.",
    summary: "Prompt not precise enough.",
    confidence: 0.35,
    assumptions: ["Original prompt was too broad."],
    questions: [
      {
        id: "catalog-domain",
        label: "What structured catalog should I create?",
        description: "For example: house projects, real estate offers, or products.",
        required: true,
      },
    ],
    actions: [],
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/coderso/widgets">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(textarea, "potrzebuje katalogu");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await act(async () => {
      sendButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("More input needed");
    const dryRunButton = findButton(view.container, "Dry-run changes");
    const executeButton = findButton(view.container, "Execute reviewed actions");
    expect(dryRunButton?.disabled).toBe(true);
    expect(executeButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel routes CMS inspection prompts through LLM Guide actions", async () => {
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
  const chatSpy = vi.spyOn(assistantClient, "sendAssistantMessage").mockResolvedValue({
    mode: "llm-guide",
    template: "missing_answer",
    detailLevel: "medium",
    guideMode: "default",
    answer: "Docs fallback should not be used.",
    confidence: 0.2,
    sources: [],
    followUpOptions: [],
    fallbackUsed: true,
    requestedMode: "llm-guide",
    effectiveMode: "docs-only",
    retrievalBackend: "db",
    llm: null,
  });
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue({
    id: "plan-cms-custom-screen-inspect",
    status: "ready",
    intentId: "cms-resource-inspect",
    title: "CMS resource inspection",
    answer: "I searched custom-screen resources.",
    summary: "Found 2 custom-screen candidate(s).",
    confidence: 0.72,
    assumptions: ["Read-only response."],
    questions: [],
    inspection: {
      kind: "resource-candidates",
      operation: "inspect",
      resourceKind: "custom-screen",
      matchStatus: "matched",
      query: null,
      candidates: [
        {
          kind: "custom-screen",
          id: "screen-house",
          label: "House Projects",
          status: "active",
          adminHref: "/admin/coderso/custom-screens/screen-house",
        },
      ],
      truncated: false,
    },
    actions: [],
  });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/coderso/custom-screens">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(
        textarea,
        "sprawdz jakie ekrany w admin ui (customowe) sa widoczne - jak sie nazywaja dokladnie"
      );
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await act(async () => {
      sendButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy).not.toHaveBeenCalled();
    expect(planSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          includeResourceCatalog: true,
          runtimeSnapshot: expect.objectContaining({
            route: "/admin/coderso/custom-screens",
            codersoModule: "custom-screens",
          }),
        }),
      })
    );
    expect(view.container.textContent).toContain("CMS resource matches");
    expect(view.container.textContent).toContain("House Projects");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel keeps docs-only mode on assistant chat route", async () => {
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "docs-only",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
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
    <AdminRouterProvider initialPath="/admin/coderso/custom-screens">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(textarea, "gdzie znajde custom screens?");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await act(async () => {
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
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
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
    <AdminRouterProvider initialPath="/admin/coderso/widgets">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(textarea, "gdzie zmienie kolory hero widgetu?");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await act(async () => {
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
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions")
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
    <AdminRouterProvider initialPath="/admin/coderso/custom-screens">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(textarea, "jakie ekrany widzisz z prefixem House Projects?");
      await flush();
    });
    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");
    await act(async () => {
      sendButton.click();
      await flush();
    });

    await act(async () => {
      setTextareaValue(textarea, "usun pierwszy");
      await flush();
    });
    await act(async () => {
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
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
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
    <AdminRouterProvider initialPath="/admin/coderso/custom-screens">
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

    await act(async () => {
      launcher.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    await act(async () => {
      setTextareaValue(textarea, "gdzie sa ustawienia?");
      await flush();
    });
    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");
    await act(async () => {
      sendButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("This is the current answer.");

    const newButton = findButton(view.container, "New");
    if (!newButton) throw new Error("missing_new_button");
    await act(async () => {
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
  vi.spyOn(assistantClient, "getAssistantStatus").mockResolvedValue({
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
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue({
    "pages.openAfterCreate": true,
    "media.openAfterUpload": false,
    "widgets.favorites": [],
    "widgets.hero.presets": [],
    "posts.editor.preferences": {
      version: 2,
      focusModeOnOpen: false,
      compactSidePanels: false,
      showOutlineHints: true,
      editorDensity: "comfortable",
      showKeyboardHints: true,
      defaultInspectorTab: "post",
      restoreLastSidebarsState: true,
    },
    "assistant.mode": "llm-guide",
    "assistant.ui.enabled": true,
    "assistant.ui.avatarEnabled": false,
    "assistant.ui.avatarAsset": null,
  });
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
  await act(async () => {
    firstLauncher.click();
    await flush();
  });
  const textarea = firstView.container.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
  await act(async () => {
    setTextareaValue(textarea, "jakie ekrany widzisz z prefixem House Projects?");
    await flush();
  });
  const sendButton = findButton(firstView.container, "Send");
  if (!sendButton) throw new Error("missing_send_button");
  await act(async () => {
    sendButton.click();
    await flush();
  });
  expect(firstView.container.textContent).toContain("House Projects");
  firstView.cleanup();

  const secondView = mount(
    <AdminRouterProvider initialPath="/admin/coderso/custom-screens">
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
    await act(async () => {
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
