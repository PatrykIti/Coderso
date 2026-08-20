import React from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import * as userSettingsClient from "../../../../core/admin/services/userSettingsClient";
import type { UserSettings } from "../../../../core/admin/services/userSettingsClient";
import { clearAssistantRuntimeStateCache } from "../../../../core/admin/ui/assistant/AssistantPanel";
import { clearAssistantConversationState } from "../../../../core/admin/ui/assistant/assistantConversationState";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

export const mount = (node: React.ReactNode) => {
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

export const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

export const findButton = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  ) as HTMLButtonElement | null | undefined;

export const setTextareaValue = (element: HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

export const setInputValue = (element: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

export const basicIntakeSession = (
  answers: AssistantSiteBuilderIntakeSession["answers"],
  currentStepId: AssistantSiteBuilderIntakeSession["currentStepId"]
): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "basic",
  currentStepId,
  answers,
});

export const makeUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => {
  const settings: UserSettings = {
    "pages.openAfterCreate": true,
    "customScreens.openAfterCreate": true,
    "forms.openAfterCreate": true,
    "media.openAfterUpload": false,
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
    "customScreens.entry.preferences": {
      version: 1,
      showFieldMetadata: false,
    },
  };

  Object.assign(settings, overrides);
  return settings;
};

export const mockUserSettings = (overrides?: Partial<UserSettings>) =>
  vi.spyOn(userSettingsClient, "getUserSettings").mockResolvedValue(makeUserSettings(overrides));

export const resetAssistantPanelTestState = () => {
  clearAssistantRuntimeStateCache();
  clearAssistantConversationState();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
};
