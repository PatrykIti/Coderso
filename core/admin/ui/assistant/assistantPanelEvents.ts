import type { AssistantMode } from "@/services/assistantClient";

export const ASSISTANT_PANEL_OPEN_EVENT = "coderso:assistant-panel:open";

export type AssistantPanelOpenDetail = {
  mode?: AssistantMode;
  message?: string;
  reset?: boolean;
};

export const openAssistantPanel = (detail: AssistantPanelOpenDetail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AssistantPanelOpenDetail>(ASSISTANT_PANEL_OPEN_EVENT, {
      detail,
    })
  );
};
