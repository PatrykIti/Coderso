import type {
  PopupCreateInput,
  PopupRecord,
  PopupStatus,
  PopupTrigger,
} from "@/services/popupsClient";

export type PopupEditorDraft = {
  name: string;
  slug: string;
  status: PopupStatus;
  triggerType: PopupTrigger["type"];
  triggerDelaySeconds: string;
  triggerPercent: string;
  triggerSelector: string;
  includePathsText: string;
  excludePathsText: string;
  audience: "all" | "logged_in" | "logged_out";
  frequencyStrategy: "always" | "session_once" | "daily_once";
  cooldownMinutesText: string;
  title: string;
  body: string;
  templateId: string;
  ctaLabel: string;
  ctaHref: string;
  placement: "center" | "bottom_right" | "top_banner";
  dismissible: boolean;
  showOverlay: boolean;
};

const toLineList = (value: string) =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTriggerInput = (draft: PopupEditorDraft): PopupTrigger => {
  if (draft.triggerType === "scroll_depth") {
    const percent = Number.parseInt(draft.triggerPercent, 10);
    return {
      type: "scroll_depth",
      percent: Number.isFinite(percent) ? percent : 50,
    };
  }
  if (draft.triggerType === "exit_intent") {
    return { type: "exit_intent" };
  }
  if (draft.triggerType === "cta_click") {
    return {
      type: "cta_click",
      selector: draft.triggerSelector.trim() || ".cta-trigger",
    };
  }
  const delaySeconds = Number.parseInt(draft.triggerDelaySeconds, 10);
  return {
    type: "time_delay",
    delaySeconds: Number.isFinite(delaySeconds) ? delaySeconds : 3,
  };
};

export const createEmptyPopupDraft = (): PopupEditorDraft => ({
  name: "",
  slug: "",
  status: "draft",
  triggerType: "time_delay",
  triggerDelaySeconds: "3",
  triggerPercent: "50",
  triggerSelector: ".cta-trigger",
  includePathsText: "",
  excludePathsText: "",
  audience: "all",
  frequencyStrategy: "session_once",
  cooldownMinutesText: "",
  title: "",
  body: "",
  templateId: "",
  ctaLabel: "",
  ctaHref: "",
  placement: "center",
  dismissible: true,
  showOverlay: true,
});

export const draftFromPopup = (popup: PopupRecord): PopupEditorDraft => {
  const draft = createEmptyPopupDraft();
  const trigger = popup.trigger;
  return {
    ...draft,
    name: popup.name,
    slug: popup.slug,
    status: popup.status,
    triggerType: trigger.type,
    triggerDelaySeconds:
      trigger.type === "time_delay" ? String(trigger.delaySeconds) : draft.triggerDelaySeconds,
    triggerPercent:
      trigger.type === "scroll_depth" ? String(trigger.percent) : draft.triggerPercent,
    triggerSelector:
      trigger.type === "cta_click" ? trigger.selector : draft.triggerSelector,
    includePathsText: popup.targeting.includePaths.join("\n"),
    excludePathsText: popup.targeting.excludePaths.join("\n"),
    audience: popup.targeting.audience,
    frequencyStrategy: popup.frequency.strategy,
    cooldownMinutesText:
      popup.frequency.cooldownMinutes == null ? "" : String(popup.frequency.cooldownMinutes),
    title: popup.content.title ?? "",
    body: popup.content.body ?? "",
    templateId: popup.content.templateId ?? "",
    ctaLabel: popup.content.ctaLabel ?? "",
    ctaHref: popup.content.ctaHref ?? "",
    placement: popup.settings.placement,
    dismissible: popup.settings.dismissible,
    showOverlay: popup.settings.showOverlay,
  };
};

export const toPopupInput = (draft: PopupEditorDraft): PopupCreateInput => {
  const cooldownRaw = draft.cooldownMinutesText.trim();
  const cooldownMinutes = cooldownRaw.length > 0 ? Number.parseInt(cooldownRaw, 10) : null;

  return {
    name: draft.name,
    slug: normalizeOptional(draft.slug),
    status: draft.status,
    trigger: toTriggerInput(draft),
    targeting: {
      includePaths: toLineList(draft.includePathsText),
      excludePaths: toLineList(draft.excludePathsText),
      audience: draft.audience,
    },
    frequency: {
      strategy: draft.frequencyStrategy,
      cooldownMinutes:
        cooldownMinutes != null && Number.isFinite(cooldownMinutes)
          ? cooldownMinutes
          : null,
    },
    content: {
      title: normalizeOptional(draft.title),
      body: normalizeOptional(draft.body),
      templateId: normalizeOptional(draft.templateId),
      ctaLabel: normalizeOptional(draft.ctaLabel),
      ctaHref: normalizeOptional(draft.ctaHref),
    },
    settings: {
      placement: draft.placement,
      dismissible: draft.dismissible,
      showOverlay: draft.showOverlay,
    },
  };
};

export const clonePopupDraft = (draft: PopupEditorDraft): PopupEditorDraft => ({
  ...draft,
});
