import {
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "../pages/pageAuthoringSanitizers";
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../pages/pageDocumentV2";
import {
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  SCREEN_TAB_ID,
  SCREEN_TAB_LABEL_MAX,
  compatibilityScreenBlockTypes,
  screenBlockAligns,
  screenBlockBoxSides,
  screenBlockDataAllowedKeys,
  screenBlockStyleAllowedKeys,
  screenBlockWidths,
  screenSectionColumnPresets,
  screenSectionStyleAllowedKeys,
} from "./customScreenContracts";
import type {
  FixedScreenBlockType,
  ScreenBlockBoxSpacingV1,
  ScreenBlockStyleV1,
  ScreenBlockV1,
  ScreenSectionStyleV1,
  ScreenTabItem,
} from "./customScreenContracts";
import {
  SCREEN_PATH_MAX,
  generatedFieldPath,
  invalid,
  isRecord,
  normalizeJsonValue,
  normalizeScreenPath,
  rejectUnknownKeys,
} from "./customScreenNormalizationPrimitives";
import type {
  GeneratedScreenFieldPath,
  ScreenFieldPathSegment,
  ScreenNormalizeMode,
} from "./customScreenNormalizationPrimitives";

export const normalizeScreenData = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) return {};
  const normalized = normalizeJsonValue(value);
  if (!isRecord(normalized)) throw new Error("custom_screen_definition_invalid");
  return normalized;
};

export const screenCodePoints = (value: string) => Array.from(value);

export const screenCodePointLength = (value: string) => screenCodePoints(value).length;

export const truncateScreenCodePoints = (value: string, maximum: number) =>
  screenCodePoints(value).slice(0, maximum).join("");

export const coerceScreenEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => (typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback);

export const clampScreenInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
};

// Per-side box spacing: junk container drops (never throws); an unknown SIDE key throws;
// each present side clamps via the exported page clamp (non-number → min). Prunes empty.
export const normalizeScreenBlockBoxSpacing = (
  value: unknown
): ScreenBlockBoxSpacingV1 | undefined => {
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenBlockBoxSides);
  const out: ScreenBlockBoxSpacingV1 = {};
  for (const side of screenBlockBoxSides) {
    if (value[side] === undefined) continue;
    out[side] = clampScreenInt(
      value[side],
      PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.min,
      PAGE_BLOCK_BOX_SPACING_CLAMP.max
    );
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// absent/null/non-record → undefined (no throw, byte-stable); unknown style key throws;
// values coerce/clamp; empty (all-junk / {}) prunes to undefined so it never persists.
export const normalizeScreenBlockStyle = (value: unknown): ScreenBlockStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenBlockStyleAllowedKeys);
  const margin = normalizeScreenBlockBoxSpacing(value.margin);
  const padding = normalizeScreenBlockBoxSpacing(value.padding);
  const style: ScreenBlockStyleV1 = {
    ...(value.width !== undefined
      ? { width: coerceScreenEnum(value.width, screenBlockWidths, "auto") }
      : {}),
    ...(value.minHeight !== undefined
      ? {
          minHeight: clampScreenInt(
            value.minHeight,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
            SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max
          ),
        }
      : {}),
    ...(margin ? { margin } : {}),
    ...(padding ? { padding } : {}),
    ...(value.align !== undefined
      ? { align: coerceScreenEnum(value.align, screenBlockAligns, "start") }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

// absent/null/non-record → undefined (no throw, byte-stable); unknown style KEY throws;
// values coerce/clamp; empty ({} / all-junk) prunes to undefined so it NEVER persists.
export const normalizeScreenSectionStyle = (value: unknown): ScreenSectionStyleV1 | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;
  rejectUnknownKeys(value, screenSectionStyleAllowedKeys); // unknown KEY → invalid
  const style: ScreenSectionStyleV1 = {
    ...(value.columns !== undefined
      ? { columns: coerceScreenEnum(value.columns, screenSectionColumnPresets, "1") }
      : {}),
    ...(value.columnGap !== undefined
      ? {
          columnGap: clampScreenInt(
            value.columnGap,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min, // fallback = min (junk → 0)
            SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
            SCREEN_SECTION_COLUMN_GAP_CLAMP.max
          ),
        }
      : {}),
  };
  return Object.keys(style).length > 0 ? style : undefined;
};

export const isFixedScreenBlockType = (type: string): type is FixedScreenBlockType =>
  Object.prototype.hasOwnProperty.call(screenBlockDataAllowedKeys, type);

export const compatibilityScreenBlockTypeSet = new Set<string>(compatibilityScreenBlockTypes);

export const isCompatibilityScreenBlockType = (type: string) =>
  compatibilityScreenBlockTypeSet.has(type);

export const hasScreenAuthoringUrlAsciiControl = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
};

export function sanitizeScreenAuthoringUrl(value: unknown, kind: "link" | "media"): string | null {
  if (typeof value !== "string") return null;
  if (hasScreenAuthoringUrlAsciiControl(value) || value.includes("\\")) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return kind === "link" ? sanitizeAuthoringLinkHref(trimmed) : sanitizeAuthoringMediaUrl(trimmed);
}

// Retained delegating compatibility export after the Inspector and renderer migrated to
// sanitizeScreenAuthoringUrl directly.
export const normalizeScreenImageSrc = (value: unknown): string =>
  sanitizeScreenAuthoringUrl(value, "media") ?? "";

export const normalizeScreenUrl = (
  value: unknown,
  kind: "link" | "media",
  mode: ScreenNormalizeMode,
  path: GeneratedScreenFieldPath
): string | undefined => {
  if (value === undefined || value === "") return undefined;
  if (value === null || typeof value !== "string") {
    if (mode === "write") invalid(path);
    return undefined;
  }
  const safe = sanitizeScreenAuthoringUrl(value, kind);
  if (safe !== null) return safe;
  if (mode === "write") invalid(path);
  return undefined;
};

export const normalizeOptionalStringProperty = (
  data: Record<string, unknown>,
  key: string,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  if (typeof data[key] === "string") return;
  if (mode === "write") invalid();
  delete data[key];
};

export const normalizeOptionalPathProperty = (
  data: Record<string, unknown>,
  key: string,
  mode: ScreenNormalizeMode,
  allowEmpty: boolean
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (allowEmpty && value === "") return;
  try {
    const normalized = normalizeScreenPath(value, mode, false);
    if (normalized.length > SCREEN_PATH_MAX) throw new Error("path_too_long");
    data[key] = normalized;
  } catch {
    if (mode === "write") invalid();
    delete data[key];
  }
};

export const normalizeOptionalEnumProperty = <T extends string>(
  data: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (typeof value === "string" && values.includes(value as T)) return;
  if (mode === "write") invalid();
  data[key] = fallback;
};

export const normalizeOptionalIntegerProperty = (
  data: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  mode: ScreenNormalizeMode
) => {
  if (!(key in data)) return;
  const value = data[key];
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  ) {
    return;
  }
  if (mode === "write") invalid();
  data[key] = clampScreenInt(value, fallback, min, max);
};

export const normalizeTabsForWrite = (
  raw: unknown,
  blockPath: readonly ScreenFieldPathSegment[]
): ScreenTabItem[] => {
  if (!Array.isArray(raw) || raw.length < SCREEN_TABS_MIN || raw.length > SCREEN_TABS_MAX) {
    invalid(generatedFieldPath(...blockPath, "data", "tabs"));
  }
  const tabs = raw as unknown[];
  const seen = new Set<string>();
  let changed = false;
  const normalized = tabs.map((item, index) => {
    if (!isRecord(item)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    const tab = item as Record<string, unknown>;
    try {
      rejectUnknownKeys(tab, ["id", "label"]);
    } catch {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    const id = typeof tab.id === "string" ? tab.id.trim() : "";
    const label = typeof tab.label === "string" ? tab.label.trim() : "";
    if (!SCREEN_TAB_ID.test(id) || seen.has(id)) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index, "id"));
    }
    if (!label || screenCodePointLength(label) > SCREEN_TAB_LABEL_MAX) {
      invalid(generatedFieldPath(...blockPath, "data", "tabs", index));
    }
    seen.add(id);
    if (id === tab.id && label === tab.label) return tab as ScreenTabItem;
    changed = true;
    return { id, label };
  });
  return changed ? normalized : (tabs as ScreenTabItem[]);
};

export const normalizeScreenBlockData = (
  type: string,
  value: unknown,
  mode: ScreenNormalizeMode,
  blockPath: readonly ScreenFieldPathSegment[]
): Record<string, unknown> => {
  const fixedType = isFixedScreenBlockType(type);
  if (mode === "write") {
    if (!fixedType && !isCompatibilityScreenBlockType(type)) invalid();
    if (!isRecord(value)) invalid();
  }
  const data = normalizeScreenData(value);
  if (!fixedType) return data;
  try {
    rejectUnknownKeys(data, screenBlockDataAllowedKeys[type]);
  } catch {
    invalid();
  }

  switch (type) {
    case "heading":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalStringProperty(data, "text", mode);
      normalizeOptionalIntegerProperty(data, "level", 2, 1, 3, mode);
      normalizeOptionalEnumProperty(data, "align", ["left", "center", "right"], "left", mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "text":
      normalizeOptionalStringProperty(data, "content", mode);
      normalizeOptionalEnumProperty(data, "tone", ["default", "muted"], "default", mode);
      normalizeOptionalStringProperty(data, "label", mode);
      break;
    case "stat":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalEnumProperty(data, "format", ["number", "percent", "money"], "number", mode);
      normalizeOptionalEnumProperty(data, "trend", ["auto", "up", "down", "flat"], "auto", mode);
      normalizeOptionalPathProperty(data, "deltaField", mode, true);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "divider":
      normalizeOptionalEnumProperty(data, "variant", ["line", "space", "label"], "line", mode);
      normalizeOptionalStringProperty(data, "label", mode);
      break;
    case "image": {
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalEnumProperty(data, "fit", ["cover", "contain"], "cover", mode);
      normalizeOptionalStringProperty(data, "ratio", mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      if ("src" in data) {
        const src = normalizeScreenUrl(
          data.src,
          "media",
          mode,
          generatedFieldPath(...blockPath, "data", "src")
        );
        if (src === undefined) delete data.src;
        else data.src = src;
      }
      break;
    }
    case "related-list":
      normalizeOptionalStringProperty(data, "label", mode);
      normalizeOptionalPathProperty(data, "target", mode, true);
      normalizeOptionalPathProperty(data, "displayField", mode, true);
      normalizeOptionalEnumProperty(
        data,
        "variant",
        ["checklist", "activity", "cards"],
        "checklist",
        mode
      );
      normalizeOptionalIntegerProperty(data, "limit", 5, 1, 50, mode);
      normalizeOptionalPathProperty(data, "field", mode, false);
      break;
    case "tabs":
      normalizeOptionalStringProperty(data, "label", mode);
      data.tabs = normalizeTabsForWrite(data.tabs, blockPath);
      break;
    case "button": {
      normalizeOptionalStringProperty(data, "label", mode);
      if ("action" in data && data.action !== "link") {
        if (mode === "write") {
          invalid(generatedFieldPath(...blockPath, "data", "action"));
        }
        data.action = "link";
        delete data.href;
      }
      normalizeOptionalEnumProperty(
        data,
        "variant",
        ["primary", "secondary", "ghost"],
        "primary",
        mode
      );
      normalizeOptionalPathProperty(data, "field", mode, false);
      if ("href" in data) {
        const href = normalizeScreenUrl(
          data.href,
          "link",
          mode,
          generatedFieldPath(...blockPath, "data", "href")
        );
        if (href === undefined) delete data.href;
        else data.href = href;
      }
      break;
    }
  }
  return data;
};

export const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

export const assertTabSlots = (
  block: ScreenBlockV1,
  blockPath: readonly ScreenFieldPathSegment[]
) => {
  if (block.type !== "tabs") return;
  const tabs = block.data.tabs as ScreenTabItem[];
  const tabIds = tabs.map((tab) => tab.id);
  const slotIds = Object.keys(block.slots ?? {});
  if (!sameSet(tabIds, slotIds)) {
    invalid(
      generatedFieldPath(...blockPath, "data", "tabs"),
      generatedFieldPath(...blockPath, "slots")
    );
  }
};
