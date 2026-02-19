import type {
  PopupCreateInput,
  PopupStatus,
  PopupTrigger,
  PopupTargeting,
  PopupFrequency,
  PopupContent,
  PopupSettings,
} from "@/services/popupsClient";

export const popupStatusOptions: Array<{ value: PopupStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const defaultPopupTrigger = (): PopupTrigger => ({
  type: "time_delay",
  delaySeconds: 3,
});

export const defaultPopupTargeting = (): PopupTargeting => ({
  includePaths: [],
  excludePaths: [],
  audience: "all",
});

export const defaultPopupFrequency = (): PopupFrequency => ({
  strategy: "session_once",
  cooldownMinutes: null,
});

export const defaultPopupContent = (): PopupContent => ({
  title: "",
  body: "",
  templateId: null,
  ctaLabel: "",
  ctaHref: "",
});

export const defaultPopupSettings = (): PopupSettings => ({
  placement: "center",
  dismissible: true,
  showOverlay: true,
});

export const createDefaultPopupInput = (): PopupCreateInput => ({
  name: "",
  slug: "",
  status: "draft",
  trigger: defaultPopupTrigger(),
  targeting: defaultPopupTargeting(),
  frequency: defaultPopupFrequency(),
  content: defaultPopupContent(),
  settings: defaultPopupSettings(),
});
