export type FormLayoutMode = "single" | "multi_step";

export type FormPresetId =
  | "custom"
  | "contact"
  | "lead_capture"
  | "service_intake";

export type FormAutomationRetrySettings = {
  enabled: boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type FormSettings = {
  layoutMode: FormLayoutMode;
  saveProgress: boolean;
  stepTitles: string[];
  preset: FormPresetId;
  automationRetry: FormAutomationRetrySettings;
};

const LAYOUT_MODES = new Set<FormLayoutMode>(["single", "multi_step"]);
const PRESET_IDS = new Set<FormPresetId>([
  "custom",
  "contact",
  "lead_capture",
  "service_intake",
]);

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

export const normalizeFormStep = (value: unknown, fallback = 1) =>
  clampInt(value, fallback, 1, 10);

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

export function normalizeFormSettings(value: unknown): FormSettings {
  if (!isRecord(value)) return getDefaultFormSettings();

  const layoutModeRaw = toString(value.layoutMode);
  const presetRaw = toString(value.preset);

  const automationRetryValue = isRecord(value.automationRetry)
    ? value.automationRetry
    : {};

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
      enabled: toBoolean(
        automationRetryValue.enabled,
        DEFAULT_SETTINGS.automationRetry.enabled
      ),
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
