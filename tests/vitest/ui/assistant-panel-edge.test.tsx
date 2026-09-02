// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
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

const STORAGE_POSITION_KEY = "coderso.assistant.launcher.position";
const LEGACY_POSITION_KEY = "nextless.assistant.launcher.position";

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

const mountPanel = (
  config: {
    launcherAvatarEnabled?: boolean;
    launcherAvatarAsset?: string | null;
  } = {}
) =>
  mount(
    <AdminRouterProvider initialPath="/admin">
      <AdminAssistantConfigProvider
        value={{
          enabled: true,
          launcherAvatarEnabled: config.launcherAvatarEnabled ?? false,
          launcherAvatarAsset: config.launcherAvatarAsset ?? null,
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

const launcherStyle = (view: { container: HTMLElement }) => {
  const launcher = view.container.querySelector('[aria-label="Open assistant conversation"]');
  return launcher ? (launcher as HTMLElement).style : null;
};

afterEach(resetAssistantPanelTestState);

test("AssistantPanel restores legacy launcher positions and migrates them", () => {
  window.localStorage.setItem(LEGACY_POSITION_KEY, JSON.stringify({ x: 120, y: 90 }));

  const view = mountPanel();
  try {
    const style = launcherStyle(view);
    expect(style?.left).toBe("120px");
    expect(style?.top).toBe("90px");
    expect(window.localStorage.getItem(STORAGE_POSITION_KEY)).toBe(
      JSON.stringify({ x: 120, y: 90 })
    );
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel clamps stored launcher positions into the viewport", () => {
  window.localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify({ x: 50_000, y: -50 }));

  const view = mountPanel();
  try {
    const style = launcherStyle(view);
    expect(style?.left).toBe("944px");
    expect(style?.top).toBe("24px");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel falls back to the default position for corrupt stored data", () => {
  window.localStorage.setItem(STORAGE_POSITION_KEY, "{not-json");

  const view = mountPanel();
  try {
    const style = launcherStyle(view);
    expect(style?.left).toBe("944px");
    expect(style?.top).toBe("688px");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel falls back to the default position for invalid stored numbers", () => {
  window.localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify({ x: "wide", y: "tall" }));

  const view = mountPanel();
  try {
    const style = launcherStyle(view);
    expect(style?.left).toBe("944px");
    expect(style?.top).toBe("688px");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel renders video and external launcher assets", () => {
  const videoView = mountPanel({
    launcherAvatarEnabled: true,
    launcherAvatarAsset: "https://cdn.example.com/avatar.mp4",
  });
  try {
    expect(videoView.container.innerHTML).toContain("<video");
  } finally {
    videoView.cleanup();
  }

  const otherView = mountPanel({
    launcherAvatarEnabled: true,
    launcherAvatarAsset: "https://cdn.example.com/avatar.bin",
  });
  try {
    expect(otherView.container.innerHTML).not.toContain("<video");
    expect(otherView.container.querySelector("svg")).not.toBeNull();
  } finally {
    otherView.cleanup();
  }
});

test("AssistantPanel falls back to docs-only mode when the llm is unavailable", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    ...READY_STATUS,
    defaultMode: "llm-guide",
    llmAvailable: false,
    indexReady: true,
  });
  mockUserSettings();
  const chatSpy = vi.spyOn(assistantClient, "sendAssistantMessage").mockResolvedValue({
    mode: "docs-only",
    template: "location_answer",
    detailLevel: "instruction",
    guideMode: "default",
    answer: "Docs answer.",
    confidence: 0.8,
    sources: [],
    followUpOptions: [],
    fallbackUsed: false,
    requestedMode: "docs-only",
    effectiveMode: "docs-only",
    retrievalBackend: "db",
    llm: null,
  });

  const view = mountPanel();
  try {
    await openPanel(view);
    expect(view.container.textContent).toContain("Docs only");

    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Where are settings?");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    expect(chatSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Where are settings?", mode: "docs-only" })
    );
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel records a runtime status load failure", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockRejectedValue(
    new Error("status service down")
  );
  mockUserSettings();

  const view = mountPanel();
  try {
    await openPanel(view);
    expect(view.container.textContent).toContain("status service down");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel closes on outside pointerdown and Escape", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();

  const view = mountPanel();
  try {
    await openPanel(view);
    expect(view.container.querySelector('[role="dialog"]')).not.toBeNull();

    await React.act(async () => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await flush();
    });
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();

    await openPanel(view);
    await React.act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await flush();
    });
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel drags the launcher and suppresses the toggle after movement", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();

  const view = mountPanel();
  try {
    const launcher = view.container.querySelector('[aria-label="Open assistant conversation"]');
    if (!launcher) throw new Error("missing_launcher");
    const startLeft = (launcher as HTMLElement).style.left;

    await React.act(async () => {
      launcher.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 7,
          clientX: 300,
          clientY: 150,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 7,
          clientX: 200,
          clientY: 190,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 7, clientX: 200, clientY: 190 })
      );
      // The drag suppresses the toggle, so the click right after must not open the panel.
      (launcher as HTMLButtonElement).click();
      await flush();
    });

    const movedLeft = (launcher as HTMLElement).style.left;
    expect(movedLeft).not.toBe(startLeft);
    expect(movedLeft).toBe("844px");
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel resizes the conversation width from the drag handle", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();

  const view = mountPanel();
  try {
    await openPanel(view);
    const dialog = view.container.querySelector('[role="dialog"]');
    if (!dialog) throw new Error("missing_dialog");
    const startWidth = (dialog as HTMLElement).style.width;

    const handle = view.container.querySelector(".cursor-ew-resize");
    if (!handle) throw new Error("missing_resize_handle");

    await React.act(async () => {
      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 9,
          clientX: 400,
          clientY: 200,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 9, clientX: 300, clientY: 200 })
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 9, clientX: 300, clientY: 200 })
      );
      await flush();
    });

    expect((dialog as HTMLElement).style.width).not.toBe(startWidth);
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel sends follow-up prompts from message options", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue({
    ...READY_STATUS,
    defaultMode: "docs-only",
    llmAvailable: false,
    indexReady: true,
  });
  mockUserSettings();
  const chatSpy = vi
    .spyOn(assistantClient, "sendAssistantMessage")
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
    .mockResolvedValueOnce({
      mode: "docs-only",
      template: "location_answer",
      detailLevel: "instruction",
      guideMode: "default",
      answer: "Follow-up answer.",
      confidence: 0.8,
      sources: [],
      followUpOptions: [],
      fallbackUsed: false,
      requestedMode: "docs-only",
      effectiveMode: "docs-only",
      retrievalBackend: "db",
      llm: null,
    });

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "How do I find settings?");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const optionButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Show settings")
    );
    if (!optionButton) throw new Error("missing_follow_up");
    await React.act(async () => {
      optionButton.click();
      await flush();
    });

    expect(chatSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: "How do I find settings?\n\nShow the settings card",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel records request failures as assistant messages", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  const planSpy = vi
    .spyOn(assistantClient, "planAssistantActions")
    .mockRejectedValueOnce(new Error("plan service exploded"))
    .mockRejectedValueOnce(
      new ApiClientError("provider_unavailable", "Provider is unavailable.", 503)
    );

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");

    const send = async (message: string) => {
      await React.act(async () => {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        descriptor?.set?.call(textarea, message);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        await flush();
      });
      const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Send")
      );
      if (!sendButton) throw new Error("missing_send");
      await React.act(async () => {
        sendButton.click();
        await flush();
      });
    };

    await send("first failure");
    expect(view.container.textContent).toContain("plan service exploded");

    await send("second failure");
    expect(view.container.textContent).toContain("Provider is unavailable.");
    expect(planSpy).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }
});

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
  questions: [
    {
      id: "intake-step",
      label: "Guided setup",
      description: "Answer each step.",
      required: true,
    },
  ],
  actions: [],
  metadata: {
    planner: "provider",
    providerDraftUsed: false,
    providerId: "fake",
    siteBuilderIntake: intakeMetadata(),
  },
});

const planForReview: AssistantActionPlan = {
  id: "plan-review",
  status: "ready",
  intentId: "catalog",
  title: "Catalog plan",
  answer: "Plan ready.",
  summary: "Create catalog surfaces.",
  confidence: 0.9,
  assumptions: [],
  questions: [],
  actions: [
    {
      id: "ct-add",
      type: "content-type.upsert",
      title: "Create products content type",
      description: "Structured fields for products.",
      input: {
        slug: "products",
        name: "Products",
        schema: { type: "object" },
      },
    },
  ],
};

test("AssistantPanel submits site builder intake step answers", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  const planSpy = vi
    .spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(intakePlan())
    .mockResolvedValueOnce(intakePlan());

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Set up a site for my business");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const siteName = view.container.querySelector("#site-builder-intake-business-profile-siteName");
    if (!(siteName instanceof HTMLInputElement)) throw new Error("missing_site_name");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      descriptor?.set?.call(siteName, "Provider Finder");
      siteName.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });

    const saveButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save step")
    );
    if (!saveButton) throw new Error("missing_save");
    await React.act(async () => {
      saveButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    const secondCall = planSpy.mock.calls[1][0] as {
      context: { siteBuilderIntakeState?: unknown };
    };
    expect(secondCall.context.siteBuilderIntakeState).toBeDefined();
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports site builder intake step failures", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(intakePlan())
    .mockRejectedValueOnce(new Error("intake backend down"));

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Set up my business site");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const siteName = view.container.querySelector("#site-builder-intake-business-profile-siteName");
    if (!(siteName instanceof HTMLInputElement)) throw new Error("missing_site_name");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      descriptor?.set?.call(siteName, "Provider Finder");
      siteName.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });

    const saveButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save step")
    );
    if (!saveButton) throw new Error("missing_save");
    await React.act(async () => {
      saveButton.click();
      await flush();
    });

    expect(view.container.textContent).toContain("intake backend down");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel selects site builder intake steps from the stepper", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  const planSpy = vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue(intakePlan());

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Guide my site setup");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const stepButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Site goals")
    );
    if (!stepButton) throw new Error("missing_step");
    await React.act(async () => {
      stepButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    const secondCall = planSpy.mock.calls[1][0] as {
      context: { siteBuilderIntakeState?: unknown };
    };
    expect(secondCall.context.siteBuilderIntakeState).toBeDefined();
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel switches site builder intake mode and reports failures", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  const planSpy = vi
    .spyOn(assistantClient, "planAssistantActions")
    .mockResolvedValueOnce(intakePlan())
    .mockRejectedValueOnce(new Error("advanced mode rejected"));

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Help me plan the site");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const switchButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Switch to Advanced")
    );
    if (!switchButton) throw new Error("missing_switch");
    await React.act(async () => {
      switchButton.click();
      await flush();
    });
    const confirmButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Confirm Advanced")
    );
    if (!confirmButton) throw new Error("missing_confirm");
    await React.act(async () => {
      confirmButton.click();
      await flush();
    });

    expect(planSpy).toHaveBeenCalledTimes(2);
    const secondCall = planSpy.mock.calls[1][0] as {
      context: { siteBuilderIntakeState?: { requestedMode?: string } };
    };
    expect(secondCall.context.siteBuilderIntakeState?.requestedMode).toBe("advanced");
    expect(view.container.textContent).toContain("advanced mode rejected");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports dry-run failures", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue(planForReview);
  vi.spyOn(assistantClient, "dryRunAssistantActions").mockRejectedValue(
    new Error("preview crashed")
  );

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Create a product catalog");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const dryRunButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Dry-run changes")
    );
    if (!dryRunButton) throw new Error("missing_dry_run");
    await React.act(async () => {
      dryRunButton.click();
      await flush();
    });
    expect(view.container.textContent).toContain("preview crashed");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel reports execution failures", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();
  vi.spyOn(assistantClient, "planAssistantActions").mockResolvedValue(planForReview);
  vi.spyOn(assistantClient, "dryRunAssistantActions").mockResolvedValue({
    plan: planForReview,
    changes: [],
    warnings: [],
    readyToExecute: true,
  });
  vi.spyOn(assistantClient, "executeAssistantActions").mockRejectedValue(
    new ApiClientError("execution_failed", "Execution failed.", 500)
  );

  const view = mountPanel();
  try {
    await openPanel(view);
    const textarea = view.container.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("missing_textarea");
    await React.act(async () => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "Create a product catalog");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    });
    const sendButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Send")
    );
    if (!sendButton) throw new Error("missing_send");
    await React.act(async () => {
      sendButton.click();
      await flush();
    });

    const dryRunButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Dry-run changes")
    );
    if (!dryRunButton) throw new Error("missing_dry_run");
    await React.act(async () => {
      dryRunButton.click();
      await flush();
    });

    const executeButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Execute reviewed actions")
    );
    if (!executeButton) throw new Error("missing_execute");
    await React.act(async () => {
      executeButton.click();
      await flush();
    });
    expect(view.container.textContent).toContain("Execution failed.");
  } finally {
    view.cleanup();
  }
});

test("AssistantPanel sets the draft message from a starter prompt", async () => {
  vi.spyOn(assistantStatusClient, "getAssistantStatus").mockResolvedValue(READY_STATUS);
  mockUserSettings();

  const view = mountPanel();
  try {
    await openPanel(view);
    const starter = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Where can I configure Hero widget colors?")
    );
    if (!starter) throw new Error("missing_starter");
    await React.act(async () => {
      starter.click();
      await flush();
    });

    const textarea = view.container.querySelector("textarea");
    expect((textarea as HTMLTextAreaElement | null)?.value).toContain(
      "Where can I configure Hero widget colors?"
    );
  } finally {
    view.cleanup();
  }
});
