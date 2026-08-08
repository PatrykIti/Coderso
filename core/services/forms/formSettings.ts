import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  normalizeCssColorValue,
} from "../theme/cssColorContract";

export const FORM_LAYOUT_MODE_VALUES = ["single", "multi_step"] as const;
export type FormLayoutMode = (typeof FORM_LAYOUT_MODE_VALUES)[number];

export const FORM_PRESET_VALUES = ["custom", "contact", "lead_capture", "service_intake"] as const;
export type FormPresetId = (typeof FORM_PRESET_VALUES)[number];

export const FORM_SCHEMA_LIMITS = {
  name: 200,
  slug: 200,
  description: 10_000,
  successMessage: 2_000,
  successRedirectUrl: 2_048,
  stepTitles: 10,
  stepTitle: 240,
  themeColor: CSS_COLOR_VALUE_MAX_LENGTH,
  submitLabel: 240,
  submitSupportingText: 2_000,
} as const;

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
export const FORM_THEME_WIDTH_VALUES = ["sm", "md", "lg", "xl", "full"] as const;
export type FormThemeWidth = (typeof FORM_THEME_WIDTH_VALUES)[number];
export const FORM_THEME_ALIGN_VALUES = ["left", "center", "right"] as const;
export type FormThemeAlign = (typeof FORM_THEME_ALIGN_VALUES)[number];
export const FORM_THEME_BUTTON_ALIGN_VALUES = ["left", "center", "right", "full"] as const;
export type FormThemeButtonAlign = (typeof FORM_THEME_BUTTON_ALIGN_VALUES)[number];
export const FORM_THEME_GAP_VALUES = ["sm", "md", "lg"] as const;
export type FormThemeGap = (typeof FORM_THEME_GAP_VALUES)[number];
export const FORM_THEME_COLUMN_VALUES = [1, 2] as const;
export type FormThemeColumns = (typeof FORM_THEME_COLUMN_VALUES)[number];
export const FORM_THEME_BORDER_WIDTH_VALUES = ["none", "sm", "md"] as const;
export type FormThemeBorderWidth = (typeof FORM_THEME_BORDER_WIDTH_VALUES)[number];
export const FORM_THEME_RADIUS_VALUES = ["none", "sm", "md", "lg", "xl"] as const;
export type FormThemeRadius = (typeof FORM_THEME_RADIUS_VALUES)[number];
export const FORM_THEME_PADDING_VALUES = ["sm", "md", "lg", "xl"] as const;
export type FormThemePadding = (typeof FORM_THEME_PADDING_VALUES)[number];
export const FORM_THEME_SHADOW_VALUES = ["none", "soft", "sm", "md", "lg"] as const;
export type FormThemeShadow = (typeof FORM_THEME_SHADOW_VALUES)[number];
export const FORM_THEME_TITLE_SIZE_VALUES = ["sm", "md", "lg", "xl"] as const;
export type FormThemeTitleSize = (typeof FORM_THEME_TITLE_SIZE_VALUES)[number];
export const FORM_THEME_TITLE_WEIGHT_VALUES = ["normal", "medium", "semibold", "bold"] as const;
export type FormThemeTitleWeight = (typeof FORM_THEME_TITLE_WEIGHT_VALUES)[number];
export const FORM_THEME_FONT_FAMILY_VALUES = [
  "display",
  "inherit",
  "sans",
  "serif",
  "mono",
] as const;
export type FormThemeFontFamily = (typeof FORM_THEME_FONT_FAMILY_VALUES)[number];
export const FORM_THEME_INPUT_SIZE_VALUES = ["sm", "md", "lg"] as const;
export type FormThemeInputSize = (typeof FORM_THEME_INPUT_SIZE_VALUES)[number];

export const FORM_THEME_WIDTHS = new Set<FormThemeWidth>(FORM_THEME_WIDTH_VALUES);
export const FORM_THEME_ALIGNS = new Set<FormThemeAlign>(FORM_THEME_ALIGN_VALUES);
export const FORM_THEME_BUTTON_ALIGNS = new Set<FormThemeButtonAlign>(
  FORM_THEME_BUTTON_ALIGN_VALUES
);
export const FORM_THEME_GAPS = new Set<FormThemeGap>(FORM_THEME_GAP_VALUES);
export const FORM_THEME_COLUMNS = new Set<FormThemeColumns>(FORM_THEME_COLUMN_VALUES);
export const FORM_THEME_BORDER_WIDTHS = new Set<FormThemeBorderWidth>(
  FORM_THEME_BORDER_WIDTH_VALUES
);
export const FORM_THEME_RADII = new Set<FormThemeRadius>(FORM_THEME_RADIUS_VALUES);
export const FORM_THEME_PADDINGS = new Set<FormThemePadding>(FORM_THEME_PADDING_VALUES);
export const FORM_THEME_SHADOWS = new Set<FormThemeShadow>(FORM_THEME_SHADOW_VALUES);
export const FORM_THEME_TITLE_SIZES = new Set<FormThemeTitleSize>(FORM_THEME_TITLE_SIZE_VALUES);
export const FORM_THEME_TITLE_WEIGHTS = new Set<FormThemeTitleWeight>(
  FORM_THEME_TITLE_WEIGHT_VALUES
);
export const FORM_THEME_FONT_FAMILIES = new Set<FormThemeFontFamily>(FORM_THEME_FONT_FAMILY_VALUES);
export const FORM_THEME_INPUT_SIZES = new Set<FormThemeInputSize>(FORM_THEME_INPUT_SIZE_VALUES);

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
    supportingText?: string;
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

const themeColorSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;

export const formAutomationRetrySchema = {
  type: "object",
  properties: {
    enabled: { type: "boolean" },
    maxAttempts: { type: "integer", minimum: 1, maximum: 5 },
    baseDelayMs: { type: "integer", minimum: 50, maximum: 5_000 },
    maxDelayMs: { type: "integer", minimum: 100, maximum: 20_000 },
  },
  additionalProperties: false,
} as const;

export const formThemeSchema = {
  type: "object",
  properties: {
    layout: {
      type: "object",
      properties: {
        width: { enum: FORM_THEME_WIDTH_VALUES },
        align: { enum: FORM_THEME_ALIGN_VALUES },
        fieldGap: { enum: FORM_THEME_GAP_VALUES },
        columns: { enum: FORM_THEME_COLUMN_VALUES },
        buttonAlignment: { enum: FORM_THEME_BUTTON_ALIGN_VALUES },
      },
      additionalProperties: false,
    },
    surface: {
      type: "object",
      properties: {
        card: { type: "boolean" },
        background: themeColorSchema,
        borderColor: themeColorSchema,
        borderWidth: { enum: FORM_THEME_BORDER_WIDTH_VALUES },
        radius: { enum: FORM_THEME_RADIUS_VALUES },
        padding: { enum: FORM_THEME_PADDING_VALUES },
        shadow: { enum: FORM_THEME_SHADOW_VALUES },
      },
      additionalProperties: false,
    },
    typography: {
      type: "object",
      properties: {
        titleSize: { enum: FORM_THEME_TITLE_SIZE_VALUES },
        titleWeight: { enum: FORM_THEME_TITLE_WEIGHT_VALUES },
        titleColor: themeColorSchema,
        labelColor: themeColorSchema,
        helperColor: themeColorSchema,
        fontFamily: { enum: FORM_THEME_FONT_FAMILY_VALUES },
      },
      additionalProperties: false,
    },
    input: {
      type: "object",
      properties: {
        size: { enum: FORM_THEME_INPUT_SIZE_VALUES },
        radius: { enum: FORM_THEME_RADIUS_VALUES },
        borderColor: themeColorSchema,
        background: themeColorSchema,
        textColor: themeColorSchema,
      },
      additionalProperties: false,
    },
    submit: {
      type: "object",
      properties: {
        background: themeColorSchema,
        textColor: themeColorSchema,
        radius: { enum: FORM_THEME_RADIUS_VALUES },
        fullWidth: { type: "boolean" },
        label: {
          type: "string",
          minLength: 1,
          maxLength: FORM_SCHEMA_LIMITS.submitLabel,
        },
        supportingText: {
          type: "string",
          minLength: 1,
          maxLength: FORM_SCHEMA_LIMITS.submitSupportingText,
          pattern: "\\S",
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const formSettingsSchema = {
  type: "object",
  properties: {
    layoutMode: { enum: FORM_LAYOUT_MODE_VALUES },
    saveProgress: { type: "boolean" },
    stepTitles: {
      type: "array",
      maxItems: FORM_SCHEMA_LIMITS.stepTitles,
      items: {
        type: "string",
        minLength: 1,
        maxLength: FORM_SCHEMA_LIMITS.stepTitle,
      },
    },
    preset: { enum: FORM_PRESET_VALUES },
    automationRetry: formAutomationRetrySchema,
    theme: formThemeSchema,
  },
  additionalProperties: false,
} as const;

const LAYOUT_MODES = new Set<FormLayoutMode>(FORM_LAYOUT_MODE_VALUES);
const PRESET_IDS = new Set<FormPresetId>(FORM_PRESET_VALUES);

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
// VALUES). Colors run through the canonical inherited-render policy at the
// write boundary (unsafe/blank → key dropped). Enum values are
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
  normalizeCssColorValue(value, "inherited-render");

const normalizeOptionalText = (value: unknown, maxLength?: number): string | undefined => {
  const normalized = toString(value) ?? undefined;
  if (normalized === undefined) return undefined;
  if (maxLength !== undefined && normalized.length > maxLength) return undefined;
  return normalized;
};

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
    label: (v) => normalizeOptionalText(v, FORM_SCHEMA_LIMITS.submitLabel),
    supportingText: (v) =>
      normalizeOptionalText(v, FORM_SCHEMA_LIMITS.submitSupportingText),
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
