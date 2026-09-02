// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import * as assistantClient from "../../../core/admin/services/assistantClient";
import * as assistantStatusClient from "../../../core/admin/services/assistantStatusClient";
import { AssistantPanel } from "../../../core/admin/ui/assistant/AssistantPanel";
import { AdminAssistantConfigProvider } from "../../../core/admin/ui/contexts/AdminAssistantConfigContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import {
  flush,
  mockUserSettings,
  mount,
  resetAssistantPanelTestState,
} from "./support/assistantPanelInteractionHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const READY_STATUS = {
  enabled: true,
  defaultMode: "llm-guide" as const,
  retrievalBackend: "db" as const,
  llmAvailable: true,
  indexReady: true,
  indexBuilding: false,
  indexError: null,
  lastReindexAt: null,
  docCount: 12,
  chunkCount: 44,
};

const DOCS_ONLY_STATUS = {
  ...READY_STATUS,
  defaultMode: "docs-only" as const,
  llmAvailable: false,
  indexReady: true,
};

const mountPanel = () =>
  mount(
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

const openPanel = async (view: { container: HTMLElement }) => {
  const launcher = view.container.querySelector('[aria-label="Open assistant conversation"]');
  if (!launcher) throw new Error("missing_launcher");
  await React.act(async () => {
    (launcher as HTMLButtonElement).click();
    await flush();
  });
};

const setTextarea = async (view: { container: HTMLElement }, message: string) => {
  const textarea = view.container.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
  await React.act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    descriptor?.set?.call(textarea, message);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
  });
  return textarea;
};

const clickButton = async (view: { container: HTMLElement }, label: string) => {
  const button = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing_button:${label}`);
  await React.act(async () => {
    button.click();
    await flush();
  });
  return button;
};

const intakeMetadata = () => {
  const metadata = buildBasicSiteBuilderNeedsInputPlan({}).metadata?.siteBuilderIntake;
  if (!metadata) throw new Error("missing_intake_metadata");
  return metadata;
};

const intakePlan = (): AssistantActionPlan => ({
  id: "plan-intake",
  status: "needs_input",
  intentId: "site-builder-intake",
  title: "Site builder intake",
  answer: "Answer the guided questions.",
  summary: "Collect guided setup answers.",
  confidence: 0.9,
  assumptions: [],
  questions: [],
  actions: [],
  metadata: {
    planner: "provider",
    providerDraftUsed: false,
    providerId: "fake",
    siteBuilderIntake: intakeMetadata(),
  },
});

const sendMessage = async (view: { container: HTMLElement }, message: string) => {
  await setTextarea(view, message);
  await clickButton(view, "Send");
};

const fillSiteName = async (view: { container: HTMLElement }, value: string) => {
  const siteName = view.container.querySelector("#site-builder-intake-business-profile-siteName");
  if (!(siteName instanceof HTMLInputElement)) throw new Error("missing_site_name");
  await React.act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(siteName, value);
    siteName.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
  });
};

afterEach(resetAssistantPanelTestState);

test("AssistantPanel reports plain-string request failures with the fallback message", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(DOCS_ONLY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "sendAssistantMessage").mockRejectedValue("kaboom");

  const view = mountPanel();
  try {
    await openPanel(view);
    await sendMessage(view, "Where are settings?");

    expect(view.container.textContent).toContain("Assistant request failed.");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports plain-string intake rejections with the fallback message", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(intakePlan())
    .mockRejectedValueOnce("nope");

  const view = mountPanel();
  try {
    await openPanel(view);
    await sendMessage(view, "Set up a site for my business");
    await fillSiteName(view, "Provider Finder");
    await clickButton(view, "Save step");

    expect(view.container.textContent).toContain("Site-builder intake step was rejected.");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel re-submitting a step replaces the previous answer", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue(intakePlan());

  const view = mountPanel();
  try {
    await openPanel(view);
    await sendMessage(view, "Set up a site for my business");

    await fillSiteName(view, "First Name");
    await clickButton(view, "Save step");
    await fillSiteName(view, "Second Name");
    await clickButton(view, "Save step");

    expect(planSpy).toHaveBeenCalledTimes(3);
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel clamps the launcher on window resize", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();

  const view = mountPanel();
  try {
    const launcher = view.container.querySelector('[aria-label="Open assistant conversation"]');
    if (!launcher) throw new Error("missing_launcher");
    await React.act(async () => {
      window.dispatchEvent(new Event("resize"));
      await flush();
    });
    const style = (launcher as HTMLElement).style;
    expect(style.left).toBe("944px");
    expect(style.top).toBe("688px");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports follow-up send failures without crashing", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(DOCS_ONLY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "sendAssistantMessage")
    .mockResolvedValueOnce({
      mode: "docs-only",
      template: "how_to_answer",
      detailLevel: "basic",
      guideMode: "default",
      answer: "Basic answer.",
      confidence: 0.6,
      sources: [],
      followUpOptions: [
        {
          id: "f1",
          label: "Show settings",
          promptHint: "Show the settings card",
          detailLevel: "basic",
          guideMode: "default",
        },
      ],
      fallbackUsed: false,
      requestedMode: "docs-only",
      effectiveMode: "docs-only",
      retrievalBackend: "db",
      llm: null,
    })
    .mockRejectedValueOnce(new Error("follow-up exploded"));

  const view = mountPanel();
  try {
    await openPanel(view);
    await sendMessage(view, "How do I find settings?");
    await clickButton(view, "Show settings");

    expect(view.container.textContent).toContain("follow-up exploded");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports site builder intake step selection failures", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(intakePlan())
    .mockRejectedValueOnce(new Error("step select exploded"));

  const view = mountPanel();
  try {
    await openPanel(view);
    await sendMessage(view, "Guide my site setup");
    await clickButton(view, "Site goals");

    expect(view.container.textContent).toContain("step select exploded");
  } finally {
    view.cleanup();
  }
});
