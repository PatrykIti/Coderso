export const menuVisibilityOptions = [
  "all",
  "logged_in",
  "logged_out",
] as const;

export const menuBadgeToneOptions = [
  "default",
  "accent",
  "success",
  "warning",
  "danger",
] as const;

export type MenuItemVisibility = (typeof menuVisibilityOptions)[number];
export type MenuItemBadgeTone = (typeof menuBadgeToneOptions)[number];

export type MenuItemBadge = {
  label: string;
  tone: MenuItemBadgeTone;
};

export type MenuItemSettings = {
  visibility?: MenuItemVisibility;
  badge?: MenuItemBadge;
  description?: string;
  icon?: string;
};

export type ResolvedMenuItemSettings = {
  visibility: MenuItemVisibility;
  badge: MenuItemBadge | null;
  description: string | null;
  icon: string | null;
};

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizeMenuItemSettings(value: unknown): MenuItemSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const settings: MenuItemSettings = {};

  const visibility =
    typeof source.visibility === "string" &&
    menuVisibilityOptions.includes(source.visibility as MenuItemVisibility)
      ? (source.visibility as MenuItemVisibility)
      : null;
  if (visibility) {
    settings.visibility = visibility;
  }

  if (source.badge && typeof source.badge === "object" && !Array.isArray(source.badge)) {
    const badgeSource = source.badge as Record<string, unknown>;
    const label = toTrimmedString(badgeSource.label);
    if (label) {
      const tone =
        typeof badgeSource.tone === "string" &&
        menuBadgeToneOptions.includes(badgeSource.tone as MenuItemBadgeTone)
          ? (badgeSource.tone as MenuItemBadgeTone)
          : "default";
      settings.badge = { label, tone };
    }
  }

  const description = toTrimmedString(source.description);
  if (description) {
    settings.description = description;
  }

  const icon = toTrimmedString(source.icon);
  if (icon) {
    settings.icon = icon;
  }

  return settings;
}

export function resolveMenuItemSettings(value: unknown): ResolvedMenuItemSettings {
  const normalized = normalizeMenuItemSettings(value);
  return {
    visibility: normalized.visibility ?? "all",
    badge: normalized.badge ?? null,
    description: normalized.description ?? null,
    icon: normalized.icon ?? null,
  };
}

export function hasMenuItemSettings(value: MenuItemSettings) {
  if (value.visibility && value.visibility !== "all") return true;
  if (value.badge) return true;
  if (value.description) return true;
  if (value.icon) return true;
  return false;
}

export function isResolvedMenuItemSettings(value: unknown): value is ResolvedMenuItemSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.visibility !== "string" ||
    !menuVisibilityOptions.includes(record.visibility as MenuItemVisibility)
  ) {
    return false;
  }
  if (record.badge !== null) {
    if (!record.badge || typeof record.badge !== "object" || Array.isArray(record.badge)) {
      return false;
    }
    const badge = record.badge as Record<string, unknown>;
    if (!toTrimmedString(badge.label)) return false;
    if (
      typeof badge.tone !== "string" ||
      !menuBadgeToneOptions.includes(badge.tone as MenuItemBadgeTone)
    ) {
      return false;
    }
  }
  if (record.description !== null && typeof record.description !== "string") {
    return false;
  }
  if (record.icon !== null && typeof record.icon !== "string") {
    return false;
  }
  return hasOwn(record, "visibility") && hasOwn(record, "badge");
}
