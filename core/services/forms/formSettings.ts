import { resolveClearableCssColorValue } from "../../widgets/core/clearableStyle";

export type FormLayoutMode = "single" | "multi_step";

export type FormPresetId = "custom" | "contact" | "lead_capture" | "service_intake";

export type FormAutomationRetrySettings = {
  enabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

// -----------------------------------------------------------------------------
// TASK-516-01: Form theme/style vocabulary — the SINGLE source of truth.
// These enum unions + `FORM_THEME_*` Sets are the persisted reject-unknown
// allowlist and are imported read-only by 516-02/04/06 (via `formTheme.ts`,
// which re-exports them). Do NOT redefine or drift these downstream.
// -----------------------------------------------------------------------------
export type FormThemeWidth = "sm" | "md" | "lg" | "xl" | "full";
export type FormThemeAlign = "left" | "center" | "right";
export type FormThemeButtonAlign = "left" | "center" | "right" | "full";
export type FormThemeGap = "sm" | "md" | "lg";
export type FormThemeColumns = 1 | 2;
export type FormThemeBorderWidth = "none" | "sm" | "md";
export type FormThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export type FormThemePadding = "sm" | "md" | "lg" | "xl";
export type FormThemeShadow = "none" | "soft" | "sm" | "md" | "lg";
export type FormThemeTitleSize = "sm" | "md" | "lg" | "xl";
export type FormThemeTitleWeight = "normal" | "medium" | "semibold" | "bold";
export type FormThemeFontFamily = "display" | "inherit" | "sans" | "serif" | "mono";
export type FormThemeInputSize = "sm" | "md" | "lg";

export const FORM_THEME_WIDTHS = new Set<FormThemeWidth>(["sm", "md", "lg", "xl", "full"]);
export const FORM_THEME_ALIGNS = new Set<FormThemeAlign>(["left", "center", "right"]);
export const FORM_THEME_BUTTON_ALIGNS = new Set<FormThemeButtonAlign>([
  "left",
  "center",
  "right",
  "full",
]);
export const FORM_THEME_GAPS = new Set<FormThemeGap>(["sm", "md", "lg"]);
export const FORM_THEME_COLUMNS = new Set<FormThemeColumns>([1, 2]);
export const FORM_THEME_BORDER_WIDTHS = new Set<FormThemeBorderWidth>(["none", "sm", "md"]);
export const FORM_THEME_RADII = new Set<FormThemeRadius>(["none", "sm", "md", "lg", "xl"]);
export const FORM_THEME_PADDINGS = new Set<FormThemePadding>(["sm", "md", "lg", "xl"]);
export const FORM_THEME_SHADOWS = new Set<FormThemeShadow>(["none", "soft", "sm", "md", "lg"]);
export const FORM_THEME_TITLE_SIZES = new Set<FormThemeTitleSize>(["sm", "md", "lg", "xl"]);
export const FORM_THEME_TITLE_WEIGHTS = new Set<FormThemeTitleWeight>([
  "normal",
  "medium",
  "semibold",
  "bold",
]);
export const FORM_THEME_FONT_FAMILIES = new Set<FormThemeFontFamily>([
  "display",
  "inherit",
  "sans",
  "serif",
  "mono",
]);
export const FORM_THEME_INPUT_SIZES = new Set<FormThemeInputSize>(["sm", "md", "lg"]);

export type FormFormTheme = {
  layout?: {
    width?: FormThemeWidth;
    align?: FormThemeAlign;
    fieldGap?: FormThemeGap;
    columns?: FormThemeColumns;
    buttonAlignment?: FormThemeButtonAlign;
  };
  surface?: {
    card?: boolean;
    background?: string;
    borderColor?: string;
    borderWidth?: FormThemeBorderWidth;
    radius?: FormThemeRadius;
    padding?: FormThemePadding;
    shadow?: FormThemeShadow;
  };
  typography?: {
    titleSize?: FormThemeTitleSize;
    titleWeight?: FormThemeTitleWeight;
    titleColor?: string;
    labelColor?: string;
    helperColor?: string;
    fontFamily?: FormThemeFontFamily;
  };
  input?: {
    size?: FormThemeInputSize;
    radius?: FormThemeRadius;
    borderColor?: string;
    background?: string;
    textColor?: string;
  };
  submit?: {
    background?: string;
    textColor?: string;
    radius?: FormThemeRadius;
    fullWidth?: boolean;
    label?: string;
  };
};

export type FormSettings = {
  layoutMode: FormLayoutMode;
  saveProgress: boolean;
  stepTitles: string[];
  preset: FormPresetId;
  automationRetry: FormAutomationRetrySettings;
  theme?: FormFormTheme;
};

const LAYOUT_MODES = new Set<FormLayoutMode>(["single", "multi_step"]);
const PRESET_IDS = new Set<FormPresetId>(["custom", "contact", "lead_capture", "service_intake"]);

const DEFAULT_SETTINGS: FormSettings = {
  layoutMode: "single",
  saveProgress: false,
  stepTitles: [],
  preset: "custom",
  automationRetry: {
    enabled: false,
    maxAttempts: 1,
    baseDelayMs: 300,
    maxDelayMs: 2000,
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const toString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.max(min, Math.min(max, rounded));
};

export const normalizeFormStep = (value: unknown, fallback = 1) => clampInt(value, fallback, 1, 10);

const normalizeStepTitles = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => toString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, 10);
};

export function getDefaultFormSettings(): FormSettings {
  return {
    ...DEFAULT_SETTINGS,
    stepTitles: [...DEFAULT_SETTINGS.stepTitles],
    automationRetry: { ...DEFAULT_SETTINGS.automationRetry },
  };
}

// -----------------------------------------------------------------------------
// TASK-516-01: theme normalizer (present-only, reject-unknown KEYS, fail-soft
// VALUES). Colors run through the widget's `resolveClearableCssColorValue`
// policy at the write boundary (unsafe/blank → key dropped). Enum values are
// validated against the `FORM_THEME_*` Sets; unknown enum values are dropped.
// -----------------------------------------------------------------------------
const normalizeThemeEnum = <T extends string>(value: unknown, allowed: Set<T>): T | undefined => {
  const parsed = toString(value);
  return parsed && allowed.has(parsed as T) ? (parsed as T) : undefined;
};

const normalizeThemeColumns = (value: unknown): FormThemeColumns | undefined =>
  value === 1 || value === 2 ? value : undefined;

const normalizeThemeBool = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const normalizeThemeColor = (value: unknown): string | undefined =>
  resolveClearableCssColorValue(value);

const normalizeOptionalText = (value: unknown): string | undefined => toString(value) ?? undefined;

const normalizeThemeGroup = <T extends Record<string, unknown>>(
  raw: unknown,
  spec: { [K in keyof T]-?: (value: unknown) => T[K] | undefined }
): Partial<T> | undefined => {
  if (!isRecord(raw)) return undefined;
  const out: Partial<T> = {};
  for (const key of Object.keys(spec) as (keyof T)[]) {
    const normalized = spec[key](raw[key as string]);
    if (normalized !== undefined) out[key] = normalized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

type ThemeLayout = NonNullable<FormFormTheme["layout"]>;
type ThemeSurface = NonNullable<FormFormTheme["surface"]>;
type ThemeTypography = NonNullable<FormFormTheme["typography"]>;
type ThemeInput = NonNullable<FormFormTheme["input"]>;
type ThemeSubmit = NonNullable<FormFormTheme["submit"]>;

export function normalizeFormTheme(value: unknown): FormFormTheme | undefined {
  if (!isRecord(value)) return undefined;

  const theme: FormFormTheme = {};

  const layout = normalizeThemeGroup<ThemeLayout>(value.layout, {
    width: (v) => normalizeThemeEnum(v, FORM_THEME_WIDTHS),
    align: (v) => normalizeThemeEnum(v, FORM_THEME_ALIGNS),
    fieldGap: (v) => normalizeThemeEnum(v, FORM_THEME_GAPS),
    columns: normalizeThemeColumns,
    buttonAlignment: (v) => normalizeThemeEnum(v, FORM_THEME_BUTTON_ALIGNS),
  });
  const surface = normalizeThemeGroup<ThemeSurface>(value.surface, {
    card: normalizeThemeBool,
    background: normalizeThemeColor,
    borderColor: normalizeThemeColor,
    borderWidth: (v) => normalizeThemeEnum(v, FORM_THEME_BORDER_WIDTHS),
    radius: (v) => normalizeThemeEnum(v, FORM_THEME_RADII),
    padding: (v) => normalizeThemeEnum(v, FORM_THEME_PADDINGS),
    shadow: (v) => normalizeThemeEnum(v, FORM_THEME_SHADOWS),
  });
  const typography = normalizeThemeGroup<ThemeTypography>(value.typography, {
    titleSize: (v) => normalizeThemeEnum(v, FORM_THEME_TITLE_SIZES),
    titleWeight: (v) => normalizeThemeEnum(v, FORM_THEME_TITLE_WEIGHTS),
    titleColor: normalizeThemeColor,
    labelColor: normalizeThemeColor,
    helperColor: normalizeThemeColor,
    fontFamily: (v) => normalizeThemeEnum(v, FORM_THEME_FONT_FAMILIES),
  });
  const input = normalizeThemeGroup<ThemeInput>(value.input, {
    size: (v) => normalizeThemeEnum(v, FORM_THEME_INPUT_SIZES),
    radius: (v) => normalizeThemeEnum(v, FORM_THEME_RADII),
    borderColor: normalizeThemeColor,
    background: normalizeThemeColor,
    textColor: normalizeThemeColor,
  });
  const submit = normalizeThemeGroup<ThemeSubmit>(value.submit, {
    background: normalizeThemeColor,
    textColor: normalizeThemeColor,
    radius: (v) => normalizeThemeEnum(v, FORM_THEME_RADII),
    fullWidth: normalizeThemeBool,
    label: normalizeOptionalText,
  });

  if (layout) theme.layout = layout;
  if (surface) theme.surface = surface;
  if (typography) theme.typography = typography;
  if (input) theme.input = input;
  if (submit) theme.submit = submit;

  return Object.keys(theme).length > 0 ? theme : undefined;
}

export function normalizeFormSettings(value: unknown): FormSettings {
  if (!isRecord(value)) return getDefaultFormSettings();

  const layoutModeRaw = toString(value.layoutMode);
  const presetRaw = toString(value.preset);

  const automationRetryValue = isRecord(value.automationRetry) ? value.automationRetry : {};

  const normalized: FormSettings = {
    layoutMode: LAYOUT_MODES.has(layoutModeRaw as FormLayoutMode)
      ? (layoutModeRaw as FormLayoutMode)
      : DEFAULT_SETTINGS.layoutMode,
    saveProgress: toBoolean(value.saveProgress, DEFAULT_SETTINGS.saveProgress),
    stepTitles: normalizeStepTitles(value.stepTitles),
    preset: PRESET_IDS.has(presetRaw as FormPresetId)
      ? (presetRaw as FormPresetId)
      : DEFAULT_SETTINGS.preset,
    automationRetry: {
      enabled: toBoolean(automationRetryValue.enabled, DEFAULT_SETTINGS.automationRetry.enabled),
      maxAttempts: clampInt(
        automationRetryValue.maxAttempts,
        DEFAULT_SETTINGS.automationRetry.maxAttempts,
        1,
        5
      ),
      baseDelayMs: clampInt(
        automationRetryValue.baseDelayMs,
        DEFAULT_SETTINGS.automationRetry.baseDelayMs,
        50,
        5000
      ),
      maxDelayMs: clampInt(
        automationRetryValue.maxDelayMs,
        DEFAULT_SETTINGS.automationRetry.maxDelayMs,
        100,
        20000
      ),
    },
  };

  if (normalized.automationRetry.maxDelayMs < normalized.automationRetry.baseDelayMs) {
    normalized.automationRetry.maxDelayMs = normalized.automationRetry.baseDelayMs;
  }

  const theme = normalizeFormTheme(value.theme);
  if (theme) normalized.theme = theme;

  return normalized;
}

export function resolveStepTitle(
  settings: FormSettings,
  stepNumber: number,
  fallbackPrefix = "Step"
) {
  const index = Math.max(0, stepNumber - 1);
  const configured = settings.stepTitles[index];
  if (configured && configured.trim().length > 0) {
    return configured;
  }
  return `${fallbackPrefix} ${stepNumber}`;
}
