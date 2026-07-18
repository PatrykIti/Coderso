// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import * as assistantStatusClient from "../../../core/admin/services/assistantStatusClient";
import * as userSettingsClient from "../../../core/admin/services/userSettingsClient";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";
import { openAssistantPanel } from "../../../core/admin/ui/assistant/assistantPanelEvents";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { buildAdvancedSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeAdvancedFlow";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import {
  basicIntakeSession,
  findButton,
  flush,
  mockUserSettings,
  mount,
  resetAssistantPanelTestState,
  setInputValue,
  setTextareaValue,
} from "./support/assistantPanelInteractionHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(resetAssistantPanelTestState);

test("AssistantPanel opens from reviewed site builder CTA event", async () => {
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

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/solution-kits">
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
    await React.act(async () => {
      openAssistantPanel({
        mode: "llm-guide",
        message: "Create a complete website for my business.",
        reset: true,
      });
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("missing_textarea");
    }

    expect(view.container.textContent).toContain("LLM Guide");
    expect(textarea.value).toBe("Create a complete website for my business.");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel supports llm-guide prompt -> dry-run -> execute flow", async () => {
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
      setTextareaValue(
        textarea,
        "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog"
      );
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
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
            route: "/admin/advanced/widgets",
            advancedModule: "widgets",
          }),
        }),
      })
    );

    const dryRunButton = findButton(view.container, "Dry-run changes");
    if (!dryRunButton) throw new Error("missing_dry_run_button");
    await React.act(async () => {
      dryRunButton.click();
      await flush();
    });
    expect(dryRunSpy).toHaveBeenCalledTimes(1);

    const executeButton = findButton(view.container, "Execute reviewed actions");
    if (!executeButton) throw new Error("missing_execute_button");
    await React.act(async () => {
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
      setTextareaValue(textarea, "potrzebuje katalogu");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
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
          adminHref: "/admin/advanced/custom-screens/screen-house",
        },
      ],
      truncated: false,
    },
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
      setTextareaValue(
        textarea,
        "sprawdz jakie ekrany w admin ui (customowe) sa widoczne - jak sie nazywaja dokladnie"
      );
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
    expect(planSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          includeResourceCatalog: true,
          runtimeSnapshot: expect.objectContaining({
            route: "/admin/advanced/custom-screens",
            advancedModule: "custom-screens",
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

test("AssistantPanel submits Basic site-builder intake answers through existing plan route", async () => {
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
  const firstPlan = buildBasicSiteBuilderNeedsInputPlan({});
  const submittedAnswer: AssistantSiteBuilderIntakeSession["answers"][number] = {
    stepId: "business-profile",
    values: {
      siteName: "Provider Finder",
      locale: "en",
      summary: "A directory for trusted local professionals.",
    },
  };
  const secondPlan = buildBasicSiteBuilderNeedsInputPlan({
    session: basicIntakeSession([submittedAnswer], "site-goals"),
  });
  const planSpy = vi
    .spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(firstPlan)
    .mockResolvedValueOnce(secondPlan);

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/solution-kits">
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
      setTextareaValue(textarea, "zrob mi pelny serwis dla lokalnych uslugodawcow");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("Site profile");
    expect(view.container.textContent).toContain("Save step");

    const siteName = view.container.querySelector("#site-builder-intake-business-profile-siteName");
    const locale = view.container.querySelector("#site-builder-intake-business-profile-locale");
    const summary = view.container.querySelector("#site-builder-intake-business-profile-summary");
    if (!(siteName instanceof HTMLInputElement)) throw new Error("missing_site_name");
    if (!(locale instanceof HTMLInputElement)) throw new Error("missing_locale");
    if (!(summary instanceof HTMLTextAreaElement)) throw new Error("missing_summary");

    await React.act(async () => {
      setInputValue(siteName, "Provider Finder");
      setInputValue(locale, "en");
      setTextareaValue(summary, "A directory for trusted local professionals.");
      await flush();
    });

    const saveButton = findButton(view.container, "Save step");
    if (!saveButton) throw new Error("missing_save_button");

    await React.act(async () => {
      saveButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    const secondRequest = planSpy.mock.calls[1]?.[0];
    expect(secondRequest).toMatchObject({
      context: {
        siteBuilderIntakeState: {
          activeSession: {
            version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
            mode: "basic",
            currentStepId: "business-profile",
            answers: [submittedAnswer],
          },
        },
      },
    });
    expect(secondRequest?.context?.siteBuilderIntakeState?.activeSession).not.toHaveProperty(
      "facts"
    );
    expect(view.container.textContent).toContain("Site goals");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel switches Basic site-builder intake to Advanced through existing plan route", async () => {
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
    .mockResolvedValueOnce(buildBasicSiteBuilderNeedsInputPlan({}))
    .mockResolvedValueOnce(
      buildAdvancedSiteBuilderNeedsInputPlan({
        session: {
          version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
          mode: "advanced",
          currentStepId: "business-profile",
          answers: [],
        },
      })
    );

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/solution-kits">
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
      setTextareaValue(textarea, "zrob mi pelny serwis dla lokalnych uslugodawcow");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const switchButton = findButton(view.container, "Switch to Advanced");
    if (!switchButton) throw new Error("missing_switch_button");

    await React.act(async () => {
      switchButton.click();
      await flush();
    });

    const confirmButton = findButton(view.container, "Confirm Advanced");
    if (!confirmButton) throw new Error("missing_confirm_button");

    await React.act(async () => {
      confirmButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    const secondRequest = planSpy.mock.calls[1]?.[0];
    expect(secondRequest).toMatchObject({
      context: {
        siteBuilderIntakeState: {
          requestedMode: "advanced",
          activeSession: {
            version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
            mode: "advanced",
            currentStepId: "business-profile",
            answers: [],
          },
        },
      },
    });
    expect(secondRequest?.context?.siteBuilderIntakeState?.activeSession).not.toHaveProperty(
      "facts"
    );
    expect(view.container.textContent).toContain("Advanced");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel renders friendly Basic intake validation errors", async () => {
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
    .mockResolvedValue(buildBasicSiteBuilderNeedsInputPlan({}));

  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/solution-kits">
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
      setTextareaValue(textarea, "zrob mi pelny serwis dla lokalnych uslugodawcow");
      await flush();
    });

    const sendButton = findButton(view.container, "Send");
    if (!sendButton) throw new Error("missing_send_button");

    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const saveButton = findButton(view.container, "Save step");
    if (!saveButton) throw new Error("missing_save_button");

    await React.act(async () => {
      saveButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Step was not accepted");
    expect(view.container.textContent).toContain(
      "Fill the required fields before saving this step."
    );
  } finally {
    view.cleanup();
  }
});
