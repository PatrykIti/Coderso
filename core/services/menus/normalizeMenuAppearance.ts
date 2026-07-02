/**
 * Menu appearance contract (TASK-458-02).
 *
 * `menus.settings` is a nullable jsonb envelope. Top-level `appearance`
 * and `extras` are the editable draft; `published` stores the public
 * snapshot copied by `publishMenu`. `null` (or a missing appearance in the
 * resolved branch) means "legacy appearance" — the shell renders today's
 * hardcoded look. The `MenuAppearance` model borrows the legacy navigation
 * widget's `NavigationStyle` VOCABULARY (token-backed colors, enum
 * typography, layout numbers) without any widget coupling.
 *
 * Write path: `normalizeMenuAppearance` is strict — unknown keys and
 * malformed values throw a machine-readable `menu_appearance_invalid`
 * error (with the offending `field`) and nothing is persisted.
 *
 * Read/render path: `sanitizeMenuAppearance`, `resolveStoredMenuAppearance`,
 * and `resolvePublishedMenuAppearance` are fail closed — every missing,
 * legacy, or unparsable stored value is dropped so the renderer degrades to
 * the default look and NEVER throws. The public stylesheet is built
 * exclusively from values that passed these validators (validated color
 * shapes, clamped numbers, enum strings); raw stored input is never
 * interpolated into CSS.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import type { PageBlockV2 } from "../pages/pageDocumentV2";
// Type-only import (erased at compile time ⇒ NO runtime cycle): menuDocumentV2
// imports the appearance runtime validators FROM this module, so the reverse
// edge MUST stay type-only (TASK-499-02 §5).
import type { MenuDocumentV2 } from "./menuDocumentV2";

export const MENU_APPEARANCE_INVALID = "menu_appearance_invalid" as const;

export class MenuAppearanceError extends Error {
  readonly code = MENU_APPEARANCE_INVALID;
  readonly field: string;

  constructor(field: string) {
    super(MENU_APPEARANCE_INVALID);
    this.name = "MenuAppearanceError";
    this.field = field;
  }
}

export const isMenuAppearanceError = (error: unknown): error is MenuAppearanceError =>
  error instanceof MenuAppearanceError;

export const menuAppearanceAlignments = ["start", "center", "end", "space-between"] as const;
export const menuAppearanceFontWeights = [400, 500, 600, 700] as const;
export const menuAppearanceTextTransforms = ["none", "uppercase", "capitalize"] as const;
export const menuAppearanceShadows = ["none", "sm", "md"] as const;
export const menuAppearanceDropdownDirections = ["bottom", "top"] as const;
export const menuAppearanceMobileModes = ["disclosure", "inline"] as const;

export type MenuAppearanceAlignment = (typeof menuAppearanceAlignments)[number];
export type MenuAppearanceFontWeight = (typeof menuAppearanceFontWeights)[number];
export type MenuAppearanceTextTransform = (typeof menuAppearanceTextTransforms)[number];
export type MenuAppearanceShadow = (typeof menuAppearanceShadows)[number];
export type MenuAppearanceDropdownDirection = (typeof menuAppearanceDropdownDirections)[number];
export type MenuAppearanceMobileMode = (typeof menuAppearanceMobileModes)[number];

/**
 * Every field is optional; an absent field falls back to the current
 * hardcoded shell look at CSS-build time (`SHELL_APPEARANCE_DEFAULTS` in
 * `core/site/siteShellCss.ts`). `transparent` is a first-class color value.
 */
export type MenuAppearance = {
  surfaceColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  linkActiveColor?: string;
  /** Gap between top-level nav items, px. */
  itemGap?: number;
  /** Header bar vertical padding, px. */
  paddingY?: number;
  /** Header bar horizontal padding, px. */
  paddingX?: number;
  alignment?: MenuAppearanceAlignment;
  /** Nav link font size, px. */
  fontSize?: number;
  fontWeight?: MenuAppearanceFontWeight;
  textTransform?: MenuAppearanceTextTransform;
  borderColor?: string;
  /** Header bottom border width, px. */
  borderWidth?: number;
  shadow?: MenuAppearanceShadow;
  sticky?: boolean;
  dropdownDirection?: MenuAppearanceDropdownDirection;
  mobileMode?: MenuAppearanceMobileMode;
};

/**
 * Stored shape of `menus.settings`; appearance and the nav extras blocks
 * (TASK-458-03, validated by `menuNavExtras.ts`) ride this envelope.
 */
export type MenuSettings = {
  appearance?: MenuAppearance;
  extras?: PageBlockV2[];
  /** menuDocumentV2 draft (TASK-499-02); validated by `normalizeMenuDocumentV2ForWrite`. */
  document?: MenuDocumentV2;
  published?: {
    appearance?: MenuAppearance;
    extras?: PageBlockV2[];
    document?: MenuDocumentV2;
  };
};

export const menuAppearanceNumberRanges = {
  itemGap: { min: 0, max: 64 },
  paddingY: { min: 0, max: 64 },
  paddingX: { min: 0, max: 64 },
  fontSize: { min: 10, max: 32 },
  borderWidth: { min: 0, max: 8 },
} as const;

type MenuAppearanceNumberField = keyof typeof menuAppearanceNumberRanges;

export function clampMenuAppearanceNumber(field: MenuAppearanceNumberField, value: number): number {
  const range = menuAppearanceNumberRanges[field];
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/**
 * Token-backed color value shapes shared with the legacy navigation widget:
 * hex, `var(--color-*)` design tokens, rgb()/rgba(), hsl()/hsla(), and the
 * first-class `transparent` keyword. Anything else is invalid.
 */
const MENU_APPEARANCE_COLOR_PATTERN = new RegExp(
  [
    "^(?:",
    "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})",
    "|var\\(\\s*--color-[a-zA-Z0-9_-]+\\s*\\)",
    // Alpha additionally accepts the leading-dot form (`.06`) because the
    // shell's own legacy default colors use it.
    "|rgba?\\(\\s*\\d{1,3}(?:\\.\\d+)?%?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%?(?:\\s*,\\s*(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+|\\d{1,3}(?:\\.\\d+)?%))?\\s*\\)",
    "|hsla?\\(\\s*\\d{1,3}(?:\\.\\d+)?(?:deg)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%(?:\\s*,\\s*(?:0(?:\\.\\d+)?|1(?:\\.0+)?|\\.\\d+|\\d{1,3}(?:\\.\\d+)?%))?\\s*\\)",
    "|transparent",
    ")$",
  ].join(""),
  "i"
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeColor = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return MENU_APPEARANCE_COLOR_PATTERN.test(trimmed) ? trimmed : null;
};

/**
 * Public, additive re-export of the token-backed color validator so
 * `menuDocumentV2` shares the SAME color contract without duplicating the
 * regex (TASK-499-02 §2). Returns the trimmed value on a valid token-backed
 * color shape, else `null`.
 */
export const normalizeMenuColorValue = (value: unknown): string | null => normalizeColor(value);

const normalizeNumber = (field: MenuAppearanceNumberField, value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return clampMenuAppearanceNumber(field, value);
};

const normalizeEnum = <T>(options: readonly T[], value: unknown): T | null =>
  options.includes(value as T) ? (value as T) : null;

const normalizeBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

type FieldNormalizers = {
  [K in keyof Required<MenuAppearance>]: (value: unknown) => MenuAppearance[K] | null;
};

const fieldNormalizers: FieldNormalizers = {
  surfaceColor: normalizeColor,
  linkColor: normalizeColor,
  linkHoverColor: normalizeColor,
  linkActiveColor: normalizeColor,
  itemGap: (value) => normalizeNumber("itemGap", value),
  paddingY: (value) => normalizeNumber("paddingY", value),
  paddingX: (value) => normalizeNumber("paddingX", value),
  alignment: (value) => normalizeEnum(menuAppearanceAlignments, value),
  fontSize: (value) => normalizeNumber("fontSize", value),
  fontWeight: (value) => normalizeEnum(menuAppearanceFontWeights, value),
  textTransform: (value) => normalizeEnum(menuAppearanceTextTransforms, value),
  borderColor: normalizeColor,
  borderWidth: (value) => normalizeNumber("borderWidth", value),
  shadow: (value) => normalizeEnum(menuAppearanceShadows, value),
  sticky: normalizeBoolean,
  dropdownDirection: (value) => normalizeEnum(menuAppearanceDropdownDirections, value),
  mobileMode: (value) => normalizeEnum(menuAppearanceMobileModes, value),
};

const isKnownField = (key: string): key is keyof MenuAppearance =>
  Object.prototype.hasOwnProperty.call(fieldNormalizers, key);

const assignField = <K extends keyof MenuAppearance>(
  target: MenuAppearance,
  field: K,
  value: MenuAppearance[K]
) => {
  target[field] = value;
};

/**
 * Strict write-path validation. Unknown keys and malformed values throw
 * `MenuAppearanceError` (`menu_appearance_invalid` + offending `field`).
 * `null`/`undefined` field values mean "unset" and are dropped; defaults
 * are applied at CSS-build time, never persisted.
 */
export function normalizeMenuAppearance(value: unknown): MenuAppearance {
  if (!isPlainObject(value)) {
    throw new MenuAppearanceError("appearance");
  }

  const appearance: MenuAppearance = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isKnownField(key)) {
      throw new MenuAppearanceError(key);
    }
    if (raw === undefined || raw === null) continue;
    const normalized = fieldNormalizers[key](raw);
    if (normalized === null) {
      throw new MenuAppearanceError(key);
    }
    assignField(appearance, key, normalized);
  }
  return appearance;
}

/**
 * Fail-closed render-path sanitizer: keeps only fields that pass the same
 * validators as the write path, silently dropping everything else. Never
 * throws — bad input degrades to the default look field by field.
 */
export function sanitizeMenuAppearance(value: unknown): MenuAppearance {
  if (!isPlainObject(value)) return {};

  const appearance: MenuAppearance = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isKnownField(key)) continue;
    if (raw === undefined || raw === null) continue;
    const normalized = fieldNormalizers[key](raw);
    if (normalized === null) continue;
    assignField(appearance, key, normalized);
  }
  return appearance;
}

/**
 * Reads the appearance out of a stored `menus.settings` value. Fail closed:
 * `null`, non-object envelopes, and non-object `appearance` values resolve
 * to `null` (legacy look); individual bad fields are dropped by
 * `sanitizeMenuAppearance`.
 */
export function resolveStoredMenuAppearance(settings: unknown): MenuAppearance | null {
  if (!isPlainObject(settings)) return null;
  const appearance = settings.appearance;
  if (!isPlainObject(appearance)) return null;
  return sanitizeMenuAppearance(appearance);
}

/**
 * Public render resolver for the published menu-design snapshot. New
 * settings envelopes store draft values at the top level and the public
 * snapshot under `published`; legacy envelopes without `published` fall
 * back to the historical top-level shape for backward compatibility.
 */
export function resolvePublishedMenuAppearance(settings: unknown): MenuAppearance | null {
  if (!isPlainObject(settings)) return null;
  const published = settings.published;
  if (isPlainObject(published)) {
    const appearance = published.appearance;
    if (!isPlainObject(appearance)) return null;
    return sanitizeMenuAppearance(appearance);
  }
  return resolveStoredMenuAppearance(settings);
}
