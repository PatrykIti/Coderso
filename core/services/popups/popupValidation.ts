import type {
  PopupContent,
  PopupFrequency,
  PopupSettings,
  PopupStatus,
  PopupTargeting,
  PopupTrigger,
} from "./popupTypes";

import { popupStatuses } from "./popupTypes";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("popup_text_invalid");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("popup_text_invalid");
  return normalized;
};

const normalizePathList = (value: unknown) => {
  if (value === undefined || value === null) return [] as string[];
  if (!Array.isArray(value)) throw new Error("popup_targeting_invalid");
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizePopupStatus = (
  value: unknown,
  fallback: PopupStatus = "draft"
): PopupStatus => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error("popup_status_invalid");
  const normalized = value.trim().toLowerCase();
  if ((popupStatuses as readonly string[]).includes(normalized)) {
    return normalized as PopupStatus;
  }
  throw new Error("popup_status_invalid");
};

export const normalizePopupSlug = (value: unknown, fallbackSource?: string) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!slugPattern.test(normalized)) throw new Error("popup_slug_invalid");
    return normalized;
  }
  if (typeof fallbackSource === "string" && fallbackSource.trim().length > 0) {
    const generated = slugify(fallbackSource);
    if (slugPattern.test(generated)) return generated;
  }
  throw new Error("popup_slug_invalid");
};

export const normalizePopupName = (value: unknown) => {
  if (typeof value !== "string") throw new Error("popup_name_invalid");
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) throw new Error("popup_name_invalid");
  return normalized;
};

export const normalizePopupTrigger = (value: unknown): PopupTrigger => {
  if (!isRecord(value)) throw new Error("popup_trigger_invalid");
  const type = typeof value.type === "string" ? value.type.trim().toLowerCase() : "";
  switch (type) {
    case "time_delay": {
      const delaySeconds = Number(value.delaySeconds);
      if (!Number.isFinite(delaySeconds) || delaySeconds < 0 || delaySeconds > 3600) {
        throw new Error("popup_trigger_invalid");
      }
      return { type: "time_delay", delaySeconds: Math.floor(delaySeconds) };
    }
    case "scroll_depth": {
      const percent = Number(value.percent);
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        throw new Error("popup_trigger_invalid");
      }
      return { type: "scroll_depth", percent: Math.floor(percent) };
    }
    case "exit_intent":
      return { type: "exit_intent" };
    case "cta_click": {
      const selector = normalizeOptionalText(value.selector, 240);
      if (!selector) throw new Error("popup_trigger_invalid");
      return { type: "cta_click", selector };
    }
    default:
      throw new Error("popup_trigger_invalid");
  }
};

export const normalizePopupTargeting = (value: unknown): PopupTargeting => {
  if (!isRecord(value)) throw new Error("popup_targeting_invalid");
  const includePaths = normalizePathList(value.includePaths);
  const excludePaths = normalizePathList(value.excludePaths);
  const audience =
    value.audience === "logged_in" || value.audience === "logged_out"
      ? value.audience
      : "all";

  return {
    includePaths,
    excludePaths,
    audience,
  };
};

export const normalizePopupFrequency = (value: unknown): PopupFrequency => {
  if (!isRecord(value)) throw new Error("popup_frequency_invalid");
  const strategy =
    value.strategy === "session_once" || value.strategy === "daily_once"
      ? value.strategy
      : "always";
  const cooldownRaw = value.cooldownMinutes;
  let cooldownMinutes: number | null = null;
  if (cooldownRaw !== undefined && cooldownRaw !== null) {
    const parsed = Number(cooldownRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 43200) {
      throw new Error("popup_frequency_invalid");
    }
    cooldownMinutes = Math.floor(parsed);
  }

  return {
    strategy,
    cooldownMinutes,
  };
};

export const normalizePopupContent = (value: unknown): PopupContent => {
  if (!isRecord(value)) throw new Error("popup_content_invalid");
  return {
    title: normalizeOptionalText(value.title, 200),
    body: normalizeOptionalText(value.body, 10000),
    templateId: normalizeOptionalText(value.templateId, 128),
    ctaLabel: normalizeOptionalText(value.ctaLabel, 120),
    ctaHref: normalizeOptionalText(value.ctaHref, 500),
  };
};

export const normalizePopupSettings = (value: unknown): PopupSettings => {
  if (!isRecord(value)) throw new Error("popup_settings_invalid");
  const placement =
    value.placement === "bottom_right" || value.placement === "top_banner"
      ? value.placement
      : "center";
  return {
    placement,
    dismissible: typeof value.dismissible === "boolean" ? value.dismissible : true,
    showOverlay: typeof value.showOverlay === "boolean" ? value.showOverlay : true,
  };
};
