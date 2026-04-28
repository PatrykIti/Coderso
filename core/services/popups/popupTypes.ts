export const popupStatuses = ["draft", "published", "archived"] as const;

export type PopupStatus = (typeof popupStatuses)[number];

export const popupTriggerTypes = [
  "time_delay",
  "scroll_depth",
  "exit_intent",
  "cta_click",
] as const;

export type PopupTriggerType = (typeof popupTriggerTypes)[number];

export type PopupTrigger =
  | { type: "time_delay"; delaySeconds: number }
  | { type: "scroll_depth"; percent: number }
  | { type: "exit_intent" }
  | { type: "cta_click"; selector: string };

export type PopupTargeting = {
  includePaths: string[];
  excludePaths: string[];
  audience: "all" | "logged_in" | "logged_out";
};

export type PopupFrequency = {
  strategy: "always" | "session_once" | "daily_once";
  cooldownMinutes: number | null;
};

export type PopupContent = {
  title: string | null;
  body: string | null;
  templateId: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PopupSettings = {
  placement: "center" | "bottom_right" | "top_banner";
  dismissible: boolean;
  showOverlay: boolean;
};

export type Popup = {
  id: string;
  name: string;
  slug: string;
  status: PopupStatus;
  trigger: PopupTrigger;
  targeting: PopupTargeting;
  frequency: PopupFrequency;
  content: PopupContent;
  settings: PopupSettings;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
