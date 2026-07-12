import { useId, type CSSProperties, type ComponentType } from "react";
import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../services/theme/cssColorContract";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableCssColorValue } from "./clearableStyle";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import {
  resolveFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "../../services/forms/fieldSettings";
import {
  formThemeGapClass,
  formThemeInputSizeClass,
  formThemePaddingClass,
  formThemeRadiusClass,
  formThemeShadowClass,
  formThemeTitleSizeClass,
  formThemeWidthClass,
  type FormFormTheme,
  type FormThemeFontFamily,
} from "../../services/forms/formTheme";

// 516-06 owns this LOCAL font-family token→class map (present-only path). The embed
// cannot call resolveFormTheme (it over-defaults fontFamily→"display"), so it maps the
// RAW theme token here. Full vocabulary, matching the preview + canvas maps; "display"
// (the resolved default) MUST be present, "inherit" emits no class.
const FORM_THEME_FONT_CLASS: Record<FormThemeFontFamily, string> = {
  display: "font-display",
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export type FormEmbedVariantId = "standard";

export type FormEmbedLayout = {
  alignment?: "start" | "center" | "end";
  width?: "none" | "sm" | "md" | "lg" | "xl";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  sectionPaddingX?: "sm" | "md" | "lg";
  sectionPaddingY?: "none" | "sm" | "md" | "lg" | "xl";
  fieldGap?: "sm" | "md" | "lg";
  headingLevel?: "2" | "3" | "4";
  buttonAlignment?: "start" | "center" | "end";
};

export type FormEmbedStyle = {
  background?: string;
  surface?: string;
  borderColor?: string;
  borderWidth?: "0" | "1" | "2";
  radius?: "none" | "sm" | "md" | "lg";
  inputSize?: "none" | "sm" | "md" | "lg";
  titleColor?: string;
  titleSize?: "sm" | "md" | "lg";
  titleWeight?: "medium" | "semibold" | "bold";
  labelColor?: string;
  helperColor?: string;
  submitBackground?: string;
  submitTextColor?: string;
};

export type FormEmbedFields = {
  showLabels?: boolean;
  showRequiredIndicator?: boolean;
};

export type FormEmbedNavigation = {
  backLabel?: string;
  nextLabel?: string;
  showProgress?: boolean;
  savedProgressTtlDays?: number;
};

export type FormEmbedSubmitBehavior = {
  loadingLabel?: string;
  successBehavior?: "show-message-hide-form" | "show-message-reset-form" | "show-message-keep-form";
};

export type ResolvedFormField = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  settings?: {
    placeholder?: string;
    helper?: string;
    options?: string[];
    defaultValue?: string | boolean;
    pattern?: string;
    min?: number;
    max?: number;
    formStep?: number;
    inputStep?: number;
    step?: number;
    accept?: string[];
    maxSizeMb?: number;
    multiple?: boolean;
    logic?: FormFieldLogic;
    style?: FormFieldStyle;
  };
};

export type FormEmbedResolvedData = {
  formId?: string;
  formName?: string;
  description?: string | null;
  status?: string;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  submissionNonce?: string | null;
  botProtection?: {
    provider?: "recaptcha_v3";
    siteKey?: string | null;
    action?: "public_write";
  };
  settings?: {
    layoutMode?: "single" | "multi_step";
    saveProgress?: boolean;
    stepTitles?: string[];
    // 516-06: the form-owned theme travels here via the pageRendererV2
    // present-only passthrough. RAW normalized theme (NOT resolveFormTheme output);
    // the widget layers it as base defaults under the per-instance style/layout.
    theme?: FormFormTheme;
  };
  fields?: ResolvedFormField[];
  error?: string;
};

export type FormEmbedData = {
  formId?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  layout?: FormEmbedLayout;
  style?: FormEmbedStyle;
  fields?: FormEmbedFields;
  navigation?: FormEmbedNavigation;
  submitBehavior?: FormEmbedSubmitBehavior;
  resolved?: FormEmbedResolvedData;
};

const spacingClassMap: Record<
  NonNullable<FormEmbedLayout["spacing"]>,
  { fieldGap: string; sectionPaddingY: NonNullable<FormEmbedLayout["sectionPaddingY"]> }
> = {
  none: { fieldGap: "gap-0", sectionPaddingY: "none" },
  sm: { fieldGap: "gap-4", sectionPaddingY: "sm" },
  md: { fieldGap: "gap-6", sectionPaddingY: "md" },
  lg: { fieldGap: "gap-8", sectionPaddingY: "lg" },
  xl: { fieldGap: "gap-10", sectionPaddingY: "xl" },
};

const formEmbedColorStyleKeys = [
  "background",
  "surface",
  "borderColor",
  "titleColor",
  "labelColor",
  "helperColor",
  "submitBackground",
  "submitTextColor",
] as const;

type FormEmbedColorStyleKey = (typeof formEmbedColorStyleKeys)[number];

export const formEmbedThemeDefaultColorValues: Record<FormEmbedColorStyleKey, string> = {
  background: "transparent",
  surface: "var(--color-bg)",
  borderColor: "var(--color-border)",
  titleColor: "var(--color-text)",
  labelColor: "var(--color-text)",
  helperColor: "var(--color-text)",
  submitBackground: "var(--color-primary)",
  submitTextColor: "var(--color-bg)",
};

const formEmbedColorStyleKeySet = new Set<string>(formEmbedColorStyleKeys);

export function isFormEmbedThemeDefaultStyleValue(
  key: keyof FormEmbedStyle,
  value: unknown
): key is FormEmbedColorStyleKey {
  if (!formEmbedColorStyleKeySet.has(key)) return false;
  const colorKey = key as FormEmbedColorStyleKey;
  return (
    resolveClearableCssColorValue(value, "inherited-render") ===
    formEmbedThemeDefaultColorValues[colorKey]
  );
}

const widthClassMap: Record<NonNullable<FormEmbedLayout["width"]>, string> = {
  none: "",
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

const alignClassMap: Record<NonNullable<FormEmbedLayout["alignment"]>, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const buttonAlignClassMap: Record<NonNullable<FormEmbedLayout["buttonAlignment"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const sectionPaddingXClassMap: Record<NonNullable<FormEmbedLayout["sectionPaddingX"]>, string> = {
  sm: "px-4",
  md: "px-6",
  lg: "px-8",
};

const sectionPaddingYClassMap: Record<NonNullable<FormEmbedLayout["sectionPaddingY"]>, string> = {
  none: "py-0",
  sm: "py-6",
  md: "py-8",
  lg: "py-10",
  xl: "py-12",
};

const fieldGapClassMap: Record<NonNullable<FormEmbedLayout["fieldGap"]>, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

const radiusClassMap: Record<NonNullable<FormEmbedStyle["radius"]>, string> = {
  none: "",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

const inputSizeClassMap: Record<NonNullable<FormEmbedStyle["inputSize"]>, string> = {
  none: "",
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
};

const titleSizeClassMap: Record<NonNullable<FormEmbedStyle["titleSize"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const titleWeightClassMap: Record<NonNullable<FormEmbedStyle["titleWeight"]>, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const borderWidthClassMap: Record<NonNullable<FormEmbedStyle["borderWidth"]>, string> = {
  "0": "border-0",
  "1": "border",
  "2": "border-2",
};

// 516-06: translate a RAW (present-only, NOT resolveFormTheme-defaulted) form theme
// into the widget's FormEmbedStyle/FormEmbedLayout vocabulary. The two enum
// vocabularies are NON-IDENTITY: several tokens are renamed (align left→start) or
// clamped (radius xl→lg, titleWeight normal→medium, buttonAlignment full→center).
// Each helper emits ONLY keys the theme actually set (present-only) — never a
// fabricated default — so an un-themed form yields `{}` and stays byte-identical.
//
// Deliberately EXCLUDED (widget class-maps DIVERGE from the theme maps, so these are
// direct-applied as container classes in FormEmbedBlock, mirroring the width seam):
//   style.titleSize + style.inputSize (widget titleSize/inputSize maps diverge);
//   layout.width + layout.fieldGap (widget width/gap maps diverge).
// Also with NO widget axis (handled entirely via direct-apply / CSS in FormEmbedBlock):
//   surface.padding/shadow/card, input.radius/background/borderColor/textColor,
//   submit.radius/fullWidth/label, typography.fontFamily, layout.columns.
function mapFormThemeToEmbedStyle(theme?: FormFormTheme): Partial<FormEmbedStyle> {
  if (!theme) return {};
  const out: Partial<FormEmbedStyle> = {};
  const { surface, typography, submit } = theme;
  // Render-boundary re-check (Security Contract §2, defence in depth): every
  // theme-derived color re-runs the STRICT CSS-color policy before it enters
  // `themeStyle` → `style` → the widget's existing weak/raw color seams (which
  // must NOT be widened to unchecked theme input). Idempotent for values already
  // policy-checked at write (normalizeFormTheme); drops anything that bypassed it.
  const safeColor = (value: string | undefined): string | undefined =>
    value === undefined ? undefined : resolveClearableCssColorValue(value, "inherited-render");
  if (surface) {
    const bg = safeColor(surface.background);
    if (bg !== undefined) out.surface = bg;
    const border = safeColor(surface.borderColor);
    if (border !== undefined) out.borderColor = border;
    if (surface.borderWidth !== undefined) {
      out.borderWidth =
        surface.borderWidth === "none" ? "0" : surface.borderWidth === "sm" ? "1" : "2";
    }
    if (surface.radius !== undefined) {
      // xl LOSSY → clamp to lg (widget radius enum lacks xl).
      out.radius = surface.radius === "xl" ? "lg" : surface.radius;
    }
  }
  if (typography) {
    const titleColor = safeColor(typography.titleColor);
    if (titleColor !== undefined) out.titleColor = titleColor;
    const labelColor = safeColor(typography.labelColor);
    if (labelColor !== undefined) out.labelColor = labelColor;
    const helperColor = safeColor(typography.helperColor);
    if (helperColor !== undefined) out.helperColor = helperColor;
    if (typography.titleWeight !== undefined) {
      // normal LOSSY → clamp to medium (widget titleWeight enum lacks normal).
      out.titleWeight = typography.titleWeight === "normal" ? "medium" : typography.titleWeight;
    }
  }
  if (submit) {
    const submitBg = safeColor(submit.background);
    if (submitBg !== undefined) out.submitBackground = submitBg;
    const submitText = safeColor(submit.textColor);
    if (submitText !== undefined) out.submitTextColor = submitText;
  }
  return out;
}

function mapFormThemeToEmbedLayout(theme?: FormFormTheme): Partial<FormEmbedLayout> {
  if (!theme) return {};
  const out: Partial<FormEmbedLayout> = {};
  const layout = theme.layout;
  if (layout) {
    if (layout.align !== undefined) {
      out.alignment =
        layout.align === "left" ? "start" : layout.align === "right" ? "end" : "center";
    }
    if (layout.buttonAlignment !== undefined) {
      // full LOSSY → clamp to center (widget buttonAlignment has no full-width axis;
      // the widget-native full-width submit is submit.fullWidth, applied separately).
      out.buttonAlignment =
        layout.buttonAlignment === "left"
          ? "start"
          : layout.buttonAlignment === "right"
            ? "end"
            : "center";
    }
  }
  return out;
}

const resolveNonEmptyString = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveLayout = (value?: FormEmbedLayout): Required<FormEmbedLayout> => {
  const resolvedSpacing = resolveFormEmbedSpacing(value);
  return {
    alignment: value?.alignment ?? "start",
    width: value?.width ?? "md",
    spacing: resolvedSpacing.spacing,
    sectionPaddingX: value?.sectionPaddingX ?? "sm",
    sectionPaddingY: resolvedSpacing.sectionPaddingY,
    fieldGap: value?.fieldGap ?? "md",
    headingLevel: value?.headingLevel ?? "2",
    buttonAlignment: value?.buttonAlignment ?? "start",
  };
};

export function resolveFormEmbedSpacing(value?: FormEmbedLayout): {
  spacing: NonNullable<FormEmbedLayout["spacing"]>;
  sectionPaddingY: NonNullable<FormEmbedLayout["sectionPaddingY"]>;
} {
  const rawSpacing = value?.spacing ?? "md";
  const spacing = isSpacing(rawSpacing) ? rawSpacing : "md";
  return {
    spacing,
    sectionPaddingY: value?.sectionPaddingY ?? spacingClassMap[spacing].sectionPaddingY,
  };
}

const resolveStyle = (value?: FormEmbedStyle): Required<FormEmbedStyle> => {
  return {
    background: value?.background ?? formEmbedThemeDefaultColorValues.background,
    surface: value?.surface ?? formEmbedThemeDefaultColorValues.surface,
    borderColor: value?.borderColor ?? formEmbedThemeDefaultColorValues.borderColor,
    borderWidth: value?.borderWidth ?? "1",
    radius: value?.radius ?? "md",
    inputSize: value?.inputSize ?? "md",
    titleColor: value?.titleColor ?? formEmbedThemeDefaultColorValues.titleColor,
    titleSize: value?.titleSize ?? "md",
    titleWeight: value?.titleWeight ?? "semibold",
    labelColor: value?.labelColor ?? formEmbedThemeDefaultColorValues.labelColor,
    helperColor: value?.helperColor ?? formEmbedThemeDefaultColorValues.helperColor,
    submitBackground: value?.submitBackground ?? formEmbedThemeDefaultColorValues.submitBackground,
    submitTextColor: value?.submitTextColor ?? formEmbedThemeDefaultColorValues.submitTextColor,
  };
};

const resolveFields = (value?: FormEmbedFields): Required<FormEmbedFields> => {
  return {
    showLabels: value?.showLabels ?? true,
    showRequiredIndicator: value?.showRequiredIndicator ?? true,
  };
};

export function clampSavedProgressTtl(raw: string | number | undefined): number {
  const parsed = typeof raw === "number" ? Math.round(raw) : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(1, Math.min(30, parsed));
}

const resolveNavigation = (value?: FormEmbedNavigation): Required<FormEmbedNavigation> => {
  return {
    backLabel: resolveNonEmptyString(value?.backLabel, "Back"),
    nextLabel: resolveNonEmptyString(value?.nextLabel, "Next"),
    showProgress: value?.showProgress ?? true,
    savedProgressTtlDays: clampSavedProgressTtl(value?.savedProgressTtlDays),
  };
};

const resolveSubmitBehavior = (
  value?: FormEmbedSubmitBehavior
): Required<FormEmbedSubmitBehavior> => {
  const successBehavior = value?.successBehavior;
  return {
    loadingLabel: resolveNonEmptyString(value?.loadingLabel, "Sending..."),
    successBehavior:
      successBehavior === "show-message-reset-form" || successBehavior === "show-message-keep-form"
        ? successBehavior
        : "show-message-hide-form",
  };
};

const isBorderWidthValue = (value: string): value is NonNullable<FormEmbedStyle["borderWidth"]> =>
  value === "0" || value === "1" || value === "2";

const isRadius = (value: string): value is NonNullable<FormEmbedStyle["radius"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg";

const isInputSize = (value: string): value is NonNullable<FormEmbedStyle["inputSize"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg";

const isAlignment = (value: string): value is NonNullable<FormEmbedLayout["alignment"]> =>
  value === "start" || value === "center" || value === "end";

const isWidth = (value: string): value is NonNullable<FormEmbedLayout["width"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl";

const isSpacing = (value: string): value is NonNullable<FormEmbedLayout["spacing"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl";

const isSectionPaddingX = (
  value: string
): value is NonNullable<FormEmbedLayout["sectionPaddingX"]> =>
  value === "sm" || value === "md" || value === "lg";

const isSectionPaddingY = (
  value: string
): value is NonNullable<FormEmbedLayout["sectionPaddingY"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl";

const isFieldGap = (value: string): value is NonNullable<FormEmbedLayout["fieldGap"]> =>
  value === "sm" || value === "md" || value === "lg";

const isHeadingLevel = (value: string): value is NonNullable<FormEmbedLayout["headingLevel"]> =>
  value === "2" || value === "3" || value === "4";

const isTitleSize = (value: string): value is NonNullable<FormEmbedStyle["titleSize"]> =>
  value === "sm" || value === "md" || value === "lg";

const isTitleWeight = (value: string): value is NonNullable<FormEmbedStyle["titleWeight"]> =>
  value === "medium" || value === "semibold" || value === "bold";

const formEmbedColorValueSchema = {
  anyOf: [
    { const: "" },
    {
      type: "string",
      maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
      pattern: CSS_COLOR_SCHEMA_PATTERNS["inherited-render"],
    },
  ],
} as const;

export const formEmbedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    formId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    submitLabel: { type: "string" },
    successMessage: { type: "string" },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        alignment: { enum: ["start", "center", "end"] },
        width: { enum: ["none", "sm", "md", "lg", "xl"] },
        spacing: { enum: ["none", "sm", "md", "lg", "xl"] },
        sectionPaddingX: { enum: ["sm", "md", "lg"] },
        sectionPaddingY: { enum: ["none", "sm", "md", "lg", "xl"] },
        fieldGap: { enum: ["sm", "md", "lg"] },
        headingLevel: { enum: ["2", "3", "4"] },
        buttonAlignment: { enum: ["start", "center", "end"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        background: formEmbedColorValueSchema,
        surface: formEmbedColorValueSchema,
        borderColor: formEmbedColorValueSchema,
        borderWidth: { enum: ["0", "1", "2"] },
        radius: { enum: ["none", "sm", "md", "lg"] },
        inputSize: { enum: ["none", "sm", "md", "lg"] },
        titleColor: formEmbedColorValueSchema,
        titleSize: { enum: ["sm", "md", "lg"] },
        titleWeight: { enum: ["medium", "semibold", "bold"] },
        labelColor: formEmbedColorValueSchema,
        helperColor: formEmbedColorValueSchema,
        submitBackground: formEmbedColorValueSchema,
        submitTextColor: formEmbedColorValueSchema,
      },
    },
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        showLabels: { type: "boolean" },
        showRequiredIndicator: { type: "boolean" },
      },
    },
    navigation: {
      type: "object",
      additionalProperties: false,
      properties: {
        backLabel: { type: "string" },
        nextLabel: { type: "string" },
        showProgress: { type: "boolean" },
        savedProgressTtlDays: { type: "number", minimum: 1, maximum: 30 },
      },
    },
    submitBehavior: {
      type: "object",
      additionalProperties: false,
      properties: {
        loadingLabel: { type: "string" },
        successBehavior: {
          enum: ["show-message-hide-form", "show-message-reset-form", "show-message-keep-form"],
        },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        formId: { type: "string" },
        formName: { type: "string" },
        description: { type: ["string", "null"] },
        status: { type: "string" },
        successMessage: { type: ["string", "null"] },
        successRedirectUrl: { type: ["string", "null"] },
        submissionAccess: { enum: ["public", "internal"] },
        submissionNonce: { type: ["string", "null"] },
        botProtection: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            provider: { enum: ["recaptcha_v3"] },
            siteKey: { type: ["string", "null"] },
            action: { enum: ["public_write"] },
          },
        },
        settings: {
          type: "object",
          additionalProperties: true,
          properties: {
            layoutMode: { enum: ["single", "multi_step"] },
            saveProgress: { type: "boolean" },
            stepTitles: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        error: { type: "string" },
      },
    },
  },
};

export const formEmbedDefaults: FormEmbedData = {
  submitLabel: "Send message",
  successMessage: "Thanks for your submission.",
  layout: {
    alignment: "start",
    width: "md",
    spacing: "md",
    sectionPaddingX: "sm",
    sectionPaddingY: "md",
    fieldGap: "md",
    headingLevel: "2",
    buttonAlignment: "start",
  },
  style: {
    background: "transparent",
    surface: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
    radius: "md",
    inputSize: "md",
    titleColor: "var(--color-text)",
    titleSize: "md",
    titleWeight: "semibold",
    labelColor: "var(--color-text)",
    helperColor: "var(--color-text)",
    submitBackground: "var(--color-primary)",
    submitTextColor: "var(--color-bg)",
  },
  fields: {
    showLabels: true,
    showRequiredIndicator: true,
  },
  navigation: {
    backLabel: "Back",
    nextLabel: "Next",
    showProgress: true,
    savedProgressTtlDays: 7,
  },
  submitBehavior: {
    loadingLabel: "Sending...",
    successBehavior: "show-message-hide-form",
  },
};

export function resolveFormEmbedRuntimeErrorMessage(error: string | undefined): string {
  const normalized = error?.trim();
  const knownMessages: Record<string, string> = {
    form_missing: "This form is not available right now.",
    form_not_found: "This form is not available right now.",
    form_unpublished: "This form is not published yet.",
    no_fields: "This form is not ready to accept submissions yet.",
    public_submission_disabled: "This form is not accepting public submissions right now.",
  };
  if (!normalized) return "This form is not available right now.";
  return knownMessages[normalized] ?? "This form is not available right now.";
}

export function normalizeFormEmbedData(data: FormEmbedData): FormEmbedData {
  const layout = resolveLayout(data.layout);
  const style = resolveStyle(data.style);
  const fields = resolveFields(data.fields);
  const navigation = resolveNavigation(data.navigation);
  const submitBehavior = resolveSubmitBehavior(data.submitBehavior);
  const hasStyleObject = data.style !== undefined;
  const normalizeColor = (value: unknown) =>
    resolveClearableCssColorValue(value, "inherited-render");

  const normalizedLayout: Required<FormEmbedLayout> = {
    alignment: isAlignment(layout.alignment) ? layout.alignment : "start",
    width: isWidth(layout.width) ? layout.width : "md",
    spacing: isSpacing(layout.spacing) ? layout.spacing : "md",
    sectionPaddingX: isSectionPaddingX(layout.sectionPaddingX) ? layout.sectionPaddingX : "sm",
    sectionPaddingY: isSectionPaddingY(layout.sectionPaddingY) ? layout.sectionPaddingY : "md",
    fieldGap: isFieldGap(layout.fieldGap) ? layout.fieldGap : "md",
    headingLevel: isHeadingLevel(layout.headingLevel) ? layout.headingLevel : "2",
    buttonAlignment: isAlignment(layout.buttonAlignment) ? layout.buttonAlignment : "start",
  };

  const normalizedStyle: FormEmbedStyle = {
    background: hasStyleObject
      ? normalizeColor(data.style?.background)
      : resolveNonEmptyString(style.background, formEmbedThemeDefaultColorValues.background),
    surface: hasStyleObject
      ? normalizeColor(data.style?.surface)
      : resolveNonEmptyString(style.surface, formEmbedThemeDefaultColorValues.surface),
    borderColor: hasStyleObject
      ? normalizeColor(data.style?.borderColor)
      : resolveNonEmptyString(style.borderColor, formEmbedThemeDefaultColorValues.borderColor),
    borderWidth: isBorderWidthValue(style.borderWidth) ? style.borderWidth : "1",
    radius: isRadius(style.radius) ? style.radius : "md",
    inputSize: isInputSize(style.inputSize) ? style.inputSize : "md",
    titleColor: hasStyleObject
      ? normalizeColor(data.style?.titleColor)
      : resolveOptionalString(style.titleColor),
    titleSize: isTitleSize(style.titleSize) ? style.titleSize : "md",
    titleWeight: isTitleWeight(style.titleWeight) ? style.titleWeight : "semibold",
    labelColor: hasStyleObject
      ? normalizeColor(data.style?.labelColor)
      : resolveOptionalString(style.labelColor),
    helperColor: hasStyleObject
      ? normalizeColor(data.style?.helperColor)
      : resolveOptionalString(style.helperColor),
    submitBackground: hasStyleObject
      ? normalizeColor(data.style?.submitBackground)
      : resolveOptionalString(style.submitBackground),
    submitTextColor: hasStyleObject
      ? normalizeColor(data.style?.submitTextColor)
      : resolveOptionalString(style.submitTextColor),
  };

  const resolvedSuccessMessage =
    data.successMessage !== undefined
      ? data.successMessage
      : (data.resolved?.successMessage ?? undefined);

  return {
    ...data,
    formId: resolveOptionalString(data.formId),
    title: resolveOptionalString(data.title),
    description: resolveOptionalString(data.description),
    submitLabel: resolveNonEmptyString(data.submitLabel, formEmbedDefaults.submitLabel!),
    successMessage: resolveString(resolvedSuccessMessage, formEmbedDefaults.successMessage ?? ""),
    layout: normalizedLayout,
    style: normalizedStyle,
    fields,
    navigation,
    submitBehavior,
  };
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const buildFormAction = (formId?: string) =>
  formId ? `/forms/${encodeURIComponent(formId)}/submissions` : undefined;

const resolveTitle = (data: FormEmbedData, resolved?: FormEmbedResolvedData) => {
  return data.title ?? resolved?.formName ?? "Form";
};

const resolveDescription = (data: FormEmbedData, resolved?: FormEmbedResolvedData) => {
  return data.description ?? resolved?.description ?? "";
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

type FieldDomIds = Readonly<{
  inputId: string;
  labelId: string;
  helperId?: string;
  uploadStatusId: string;
}>;

const resolveFieldIdPrefix = (field: ResolvedFormField) => {
  return slugify(field.id || field.name || field.label || "field") || "field";
};

const allocateFieldDomIds = (
  widgetId: string,
  fields: readonly ResolvedFormField[],
  outerIds: readonly string[]
) => {
  const reservedIds = new Set(outerIds);
  const allocatedIds = new Map<ResolvedFormField, FieldDomIds>();

  for (const field of fields) {
    const basePrefix = resolveFieldIdPrefix(field);
    let attempt = 1;

    while (true) {
      const prefix = attempt === 1 ? basePrefix : `${basePrefix}-${attempt}`;
      const inputId = `${widgetId}-${prefix}`;
      const family = [
        inputId,
        `${inputId}-label`,
        `${inputId}-helper`,
        `${inputId}-upload-status`,
      ] as const;

      if (family.every((id) => !reservedIds.has(id))) {
        family.forEach((id) => reservedIds.add(id));
        allocatedIds.set(field, {
          inputId,
          labelId: family[1],
          helperId: field.settings?.helper ? family[2] : undefined,
          uploadStatusId: family[3],
        });
        break;
      }

      attempt += 1;
    }
  }

  return allocatedIds;
};

const supportedFieldTypes = new Set([
  "text",
  "email",
  "phone",
  "date",
  "time",
  "number",
  "range",
  "rating",
  "hidden",
  "textarea",
  "checkbox",
  "select",
  "radio",
  "file",
]);

const resolveUnsupportedFieldLabel = (field: ResolvedFormField) => field.type.trim() || "unknown";

const normalizeRuntimeStep = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
};

const resolveRuntimeFormStep = (field: ResolvedFormField) =>
  normalizeRuntimeStep(field.settings?.formStep ?? field.settings?.step);

const resolveRuntimeInputStep = (field: ResolvedFormField) => {
  const step = field.settings?.inputStep;
  return typeof step === "number" && Number.isFinite(step) && step > 0 ? String(step) : undefined;
};

const groupFieldsByStep = (fields: ResolvedFormField[]) => {
  const groups = new Map<number, ResolvedFormField[]>();
  for (const field of fields) {
    const step = resolveRuntimeFormStep(field);
    const current = groups.get(step) ?? [];
    current.push(field);
    groups.set(step, current);
  }
  return Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([step, stepFields]) => ({ step, fields: stepFields }));
};

const resolveFieldGridSpanClass = (field: ResolvedFormField) => {
  const style = resolveFormFieldStyle(field.settings?.style);
  return style.width === "half" ? "md:col-span-1" : "md:col-span-2";
};

function renderFieldControl(
  field: ResolvedFormField,
  options: {
    ids: FieldDomIds;
    showLabels: boolean;
    showRequiredIndicator: boolean;
    inputClassName: string;
    borderClassName: string;
    radiusClassName: string;
    borderColor: string;
    labelColor: string;
    helperColor: string;
    // 516-06: present-only theme input colors (border/background/text). When the form
    // theme sets no input color this is undefined and controls keep their pre-516
    // `{ borderColor }` inline style (byte-identity). Colors already re-checked via
    // resolveClearableCssColorValue by the caller.
    inputStyle?: CSSProperties;
  }
) {
  const {
    ids,
    showLabels,
    showRequiredIndicator,
    inputClassName,
    borderClassName,
    radiusClassName,
    borderColor,
    labelColor,
    helperColor,
    inputStyle,
  } = options;
  const controlStyle: CSSProperties = inputStyle ?? { borderColor };
  const placeholder = field.settings?.placeholder ?? "";
  const helper = field.settings?.helper;
  const required = Boolean(field.required);
  const labelSuffix = showRequiredIndicator && required ? " *" : "";
  const resolvedFieldStyle = resolveFormFieldStyle(field.settings?.style);
  const labelHidden = !showLabels || resolvedFieldStyle.labelPosition === "hidden";
  const inlineLabel = resolvedFieldStyle.labelPosition === "inline" && !labelHidden;
  const wrapperClassName = inlineLabel
    ? "grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-3"
    : "space-y-2";

  const renderLabel = () =>
    !labelHidden ? (
      <label
        id={ids.labelId}
        htmlFor={ids.inputId}
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: labelColor }}
      >
        {field.label}
        {labelSuffix}
      </label>
    ) : null;

  if (!supportedFieldTypes.has(field.type)) {
    return (
      <div
        className="rounded-md border border-dashed px-3 py-2 text-sm text-[var(--color-text)]/70"
        data-form-field-unsupported={field.type}
      >
        Unsupported form field type: {resolveUnsupportedFieldLabel(field)}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <textarea
          id={ids.inputId}
          name={field.name}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-label={labelHidden ? field.label : undefined}
          aria-labelledby={labelHidden ? undefined : ids.labelId}
          aria-describedby={ids.helperId}
          data-required-original={required ? "1" : "0"}
          placeholder={placeholder}
          className={joinClasses(
            "w-full border bg-transparent",
            inputClassName,
            borderClassName,
            radiusClassName
          )}
          style={controlStyle}
          rows={4}
        />
        {helper ? (
          <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
            {helper}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "checkbox") {
    if (inlineLabel) {
      return (
        <div className={wrapperClassName}>
          {renderLabel()}
          <div className="space-y-2">
            <input
              id={ids.inputId}
              type="checkbox"
              name={field.name}
              required={required}
              aria-required={required ? "true" : undefined}
              aria-labelledby={labelHidden ? undefined : ids.labelId}
              aria-label={labelHidden ? field.label : undefined}
              aria-describedby={ids.helperId}
              data-required-original={required ? "1" : "0"}
              defaultChecked={Boolean(field.settings?.defaultValue)}
              value="true"
              className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
              style={controlStyle}
            />
            {helper ? (
              <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
                {helper}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {renderLabel()}
        <div className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            id={ids.inputId}
            type="checkbox"
            name={field.name}
            required={required}
            aria-required={required ? "true" : undefined}
            aria-labelledby={labelHidden ? undefined : ids.labelId}
            aria-label={labelHidden ? field.label : undefined}
            aria-describedby={ids.helperId}
            data-required-original={required ? "1" : "0"}
            defaultChecked={Boolean(field.settings?.defaultValue)}
            value="true"
            className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
            style={controlStyle}
          />
          {labelHidden ? (
            <span>
              {field.label}
              {labelSuffix}
            </span>
          ) : null}
        </div>
        {helper ? (
          <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
            {helper}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "select") {
    const optionsList = Array.isArray(field.settings?.options) ? field.settings?.options : [];
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <select
          id={ids.inputId}
          name={field.name}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-label={labelHidden ? field.label : undefined}
          aria-labelledby={labelHidden ? undefined : ids.labelId}
          aria-describedby={ids.helperId}
          data-required-original={required ? "1" : "0"}
          className={joinClasses(
            "w-full border bg-transparent",
            inputClassName,
            borderClassName,
            radiusClassName
          )}
          style={controlStyle}
          defaultValue={field.settings?.defaultValue as string | undefined}
          disabled={optionsList.length === 0}
        >
          <option value="">
            {optionsList.length === 0 ? "No options configured" : "Select an option"}
          </option>
          {optionsList.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {helper ? (
          <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
            {helper}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "radio") {
    const optionsList = Array.isArray(field.settings?.options) ? field.settings.options : [];
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <div className="space-y-2">
          {optionsList.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-[var(--color-text)]/70">
              No options configured
            </div>
          ) : (
            optionsList.map((option) => (
              <label
                key={`${field.id}-${option}`}
                className="flex items-center gap-2 text-sm text-[var(--color-text)]"
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  required={required}
                  aria-required={required ? "true" : undefined}
                  aria-labelledby={labelHidden ? undefined : ids.labelId}
                  aria-label={labelHidden ? field.label : undefined}
                  aria-describedby={ids.helperId}
                  data-required-original={required ? "1" : "0"}
                  defaultChecked={field.settings?.defaultValue === option}
                  className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
                  style={controlStyle}
                />
                <span>{option}</span>
              </label>
            ))
          )}
          {helper ? (
            <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === "rating") {
    const max = Math.max(1, Number(field.settings?.max ?? 5));
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <div className="space-y-2">
          {Array.from({ length: max }, (_, index) => String(index + 1)).map((option) => (
            <label
              key={`${field.id}-${option}`}
              className="flex items-center gap-2 text-sm text-[var(--color-text)]"
            >
              <input
                type="radio"
                name={field.name}
                value={option}
                required={required}
                aria-required={required ? "true" : undefined}
                aria-labelledby={labelHidden ? undefined : ids.labelId}
                aria-label={labelHidden ? field.label : undefined}
                aria-describedby={ids.helperId}
                data-required-original={required ? "1" : "0"}
                defaultChecked={field.settings?.defaultValue === option}
                className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
                style={controlStyle}
              />
              <span>{option}</span>
            </label>
          ))}
          {helper ? (
            <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === "hidden") {
    return (
      <input
        id={ids.inputId}
        type="hidden"
        name={field.name}
        value={typeof field.settings?.defaultValue === "string" ? field.settings.defaultValue : ""}
        data-required-original={required ? "1" : "0"}
      />
    );
  }

  if (field.type === "file") {
    const acceptTokens = Array.isArray(field.settings?.accept) ? field.settings.accept : [];
    const accept = acceptTokens.length > 0 ? acceptTokens.join(",") : undefined;
    const multiple = field.settings?.multiple === true;
    const describedBy = [ids.helperId, ids.uploadStatusId].filter(Boolean).join(" ");
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <input
          id={ids.inputId}
          type="file"
          // NOTE: intentionally NO `name` — a file input's raw value is a fake path and
          // must never be submitted. The upload runtime posts the file to the form's
          // /uploads endpoint and writes the returned owned-media id into the hidden
          // companion input below (which carries the field name that IS submitted).
          required={required}
          accept={accept}
          multiple={multiple}
          aria-required={required ? "true" : undefined}
          aria-label={labelHidden ? field.label : undefined}
          aria-labelledby={labelHidden ? undefined : ids.labelId}
          aria-describedby={describedBy}
          data-required-original={required ? "1" : "0"}
          data-form-file-input={field.name}
          data-form-file-multiple={multiple ? "1" : "0"}
          className={joinClasses(
            "w-full border bg-transparent",
            inputClassName,
            borderClassName,
            radiusClassName
          )}
          style={controlStyle}
        />
        <input
          type="hidden"
          name={field.name}
          defaultValue=""
          data-form-file-value={field.name}
          data-form-file-multiple={multiple ? "1" : "0"}
        />
        <p
          id={ids.uploadStatusId}
          className="text-xs empty:sr-only"
          style={{ color: helperColor }}
          data-form-file-status={field.name}
          role="status"
          aria-live="polite"
        />
        {helper ? (
          <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
            {helper}
          </p>
        ) : null}
      </div>
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "date"
          ? "date"
          : field.type === "time"
            ? "time"
            : field.type === "number" || field.type === "range"
              ? field.type
              : "text";

  return (
    <div className={wrapperClassName}>
      {renderLabel()}
      <input
        id={ids.inputId}
        type={inputType}
        name={field.name}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-label={labelHidden ? field.label : undefined}
        aria-labelledby={labelHidden ? undefined : ids.labelId}
        aria-describedby={ids.helperId}
        data-required-original={required ? "1" : "0"}
        placeholder={placeholder}
        defaultValue={field.settings?.defaultValue as string | undefined}
        pattern={field.settings?.pattern}
        min={typeof field.settings?.min === "number" ? String(field.settings.min) : undefined}
        max={typeof field.settings?.max === "number" ? String(field.settings.max) : undefined}
        step={resolveRuntimeInputStep(field)}
        className={joinClasses(
          "w-full border bg-transparent",
          inputClassName,
          borderClassName,
          radiusClassName
        )}
        style={controlStyle}
      />
      {helper ? (
        <p id={ids.helperId} className="text-xs" style={{ color: helperColor }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function FormEmbedBlock({ data, variant }: { data: FormEmbedData; variant: string }) {
  const widgetId = useId().replace(/:/g, "");
  const normalizedData = normalizeFormEmbedData(data);
  const resolvedVariant: FormEmbedVariantId = variant === "standard" ? "standard" : "standard";
  const resolved = normalizedData.resolved;

  // 516-06: form theme = BASE, per-embed instance = OVERRIDE. `formTheme` is the RAW
  // normalized theme (present-only), NOT resolveFormTheme output (which would
  // over-default tokens the form never set and break byte-identity). The instance
  // spread is gated on `data.style`/`data.layout` PRESENCE because
  // normalizeFormEmbedData is fully-defaulted (it always re-emits a complete
  // style/layout) — spreading it unconditionally would clobber the theme layer with
  // widget defaults. When neither theme nor instance is set, the spreads collapse to
  // the pre-516 `{ ...resolveStyle(undefined) }` / `resolveLayout(normalizedData.layout)`
  // (byte-identical markup, snapshot-tested).
  const formTheme = resolved?.settings?.theme;
  const themeStyle = mapFormThemeToEmbedStyle(formTheme);
  const themeLayout = mapFormThemeToEmbedLayout(formTheme);
  const hasInstanceStyle = data.style !== undefined;
  const hasInstanceLayout = data.layout !== undefined;
  const layout = resolveLayout({
    ...themeLayout,
    ...(hasInstanceLayout ? (normalizedData.layout ?? {}) : {}),
  });
  const style: Required<FormEmbedStyle> = {
    ...resolveStyle(undefined),
    ...themeStyle,
    ...(hasInstanceStyle ? (normalizedData.style ?? {}) : {}),
  };
  const fieldsConfig = resolveFields(normalizedData.fields);
  const navigation = resolveNavigation(normalizedData.navigation);
  const submitBehavior = resolveSubmitBehavior(normalizedData.submitBehavior);
  const fields = Array.isArray(resolved?.fields) ? resolved?.fields : [];
  const runtimeLayoutMode =
    resolved?.settings?.layoutMode === "multi_step" ? "multi_step" : "single";
  const stepGroups = groupFieldsByStep(fields);
  const runtimeStepTitles = Array.isArray(resolved?.settings?.stepTitles)
    ? resolved?.settings?.stepTitles
    : [];
  const saveProgressEnabled = resolved?.settings?.saveProgress === true;

  const resolvedBorderColor =
    resolveClearableCssColorValue(style.borderColor, "inherited-render") ?? "var(--color-border)";
  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.background, "inherited-render"),
    }) ?? {};
  const surfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.surface, "inherited-render"),
      borderColor: resolvedBorderColor,
    }) ?? {};

  const borderClassName = borderWidthClassMap[style.borderWidth];
  const radiusClassName = radiusClassMap[style.radius];

  // 516-06 direct-apply seam. These tokens BYPASS FormEmbedStyle/Layout because the
  // widget class-maps DIVERGE from the theme maps (routing them through the widget
  // enum would render a different size/gap/width than the canvas + preview show for
  // the SAME theme). Precedence: per-instance (raw data.*) > theme (present-only) >
  // widget default (byte-identity fallback). Each per-instance value is re-validated
  // (data.* is un-normalized) so an invalid instance token falls through cleanly.
  const instanceWidth =
    typeof data.layout?.width === "string" && isWidth(data.layout.width)
      ? data.layout.width
      : undefined;
  const containerWidthClass = instanceWidth
    ? widthClassMap[instanceWidth]
    : formTheme?.layout?.width
      ? formThemeWidthClass[formTheme.layout.width]
      : widthClassMap["md"];

  const instanceInputSize =
    typeof data.style?.inputSize === "string" && isInputSize(data.style.inputSize)
      ? data.style.inputSize
      : undefined;
  const inputClassName = instanceInputSize
    ? inputSizeClassMap[instanceInputSize]
    : formTheme?.input?.size
      ? formThemeInputSizeClass[formTheme.input.size]
      : inputSizeClassMap[style.inputSize];

  const instanceTitleSize =
    typeof data.style?.titleSize === "string" && isTitleSize(data.style.titleSize)
      ? data.style.titleSize
      : undefined;
  const titleSizeClass = instanceTitleSize
    ? titleSizeClassMap[instanceTitleSize]
    : formTheme?.typography?.titleSize
      ? formThemeTitleSizeClass[formTheme.typography.titleSize]
      : titleSizeClassMap[style.titleSize ?? "md"];

  const instanceFieldGap =
    typeof data.layout?.fieldGap === "string" && isFieldGap(data.layout.fieldGap)
      ? data.layout.fieldGap
      : undefined;
  const fieldGapClass = instanceFieldGap
    ? fieldGapClassMap[instanceFieldGap]
    : formTheme?.layout?.fieldGap
      ? formThemeGapClass[formTheme.layout.fieldGap]
      : fieldGapClassMap[layout.fieldGap];

  // columns: SWAP the hardcoded `md:grid-cols-2` for the theme's columns class
  // (present-only; un-themed keeps `md:grid-cols-2` for byte-identity). columns:1 ⇒
  // `grid-cols-1` collapses to one column (per-field half spans become inert).
  const gridColumnsClass =
    formTheme?.layout?.columns === 1
      ? "grid-cols-1"
      : formTheme?.layout?.columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2";
  const fieldsGridClassName = joinClasses("grid", gridColumnsClass, fieldGapClass);

  // input.radius / submit.radius: no widget axis (both share the container
  // radiusClassName today). Direct-apply the shared FormThemeRadius map (handles xl,
  // no clamp) present-only; fall back to the container radius when unset.
  const inputRadiusClassName = formTheme?.input?.radius
    ? formThemeRadiusClass[formTheme.input.radius]
    : radiusClassName;
  const submitRadiusClassName = formTheme?.submit?.radius
    ? formThemeRadiusClass[formTheme.submit.radius]
    : radiusClassName;

  // fontFamily: no widget axis — direct-apply on the outer wrapper (present-only).
  const fontFamilyClass = formTheme?.typography?.fontFamily
    ? FORM_THEME_FONT_CLASS[formTheme.typography.fontFamily]
    : "";

  // surface.padding / shadow / card: no widget axis. Present-only swaps on the card
  // wrapper (un-themed keeps `p-6` + no shadow). card===false drops the card chrome.
  const themeCardOff = formTheme?.surface?.card === false;
  const cardPaddingClass = formTheme?.surface?.padding
    ? formThemePaddingClass[formTheme.surface.padding]
    : "p-6";
  const cardShadowClass = formTheme?.surface?.shadow
    ? formThemeShadowClass[formTheme.surface.shadow]
    : "";
  const cardWrapperClassName = themeCardOff
    ? "w-full"
    : joinClasses(
        "w-full space-y-6",
        cardPaddingClass,
        cardShadowClass,
        borderClassName,
        radiusClassName
      );

  // input.background / borderColor / textColor: no widget axis. Present-only inline
  // style on the inputs (colors re-checked via resolveClearableCssColorValue — the
  // strict color policy, defence in depth). borderColor falls back to the surface
  // border so a background-only theme keeps a visible border. When the theme sets no
  // input color, `themeInputStyle` is undefined and renderFieldControl keeps its
  // pre-516 `{ borderColor }` inline style (byte-identity).
  const themeInputBorderColor = formTheme?.input?.borderColor
    ? resolveClearableCssColorValue(formTheme.input.borderColor, "inherited-render")
    : undefined;
  const themeInputBackground = formTheme?.input?.background
    ? resolveClearableCssColorValue(formTheme.input.background, "inherited-render")
    : undefined;
  const themeInputTextColor = formTheme?.input?.textColor
    ? resolveClearableCssColorValue(formTheme.input.textColor, "inherited-render")
    : undefined;
  const themeInputStyle: CSSProperties | undefined =
    themeInputBorderColor || themeInputBackground || themeInputTextColor
      ? (compactStyle({
          borderColor: themeInputBorderColor ?? resolvedBorderColor,
          backgroundColor: themeInputBackground,
          color: themeInputTextColor,
        }) ?? {})
      : undefined;

  // submit.fullWidth / label: no widget axis. Present-only.
  const submitFullWidthClass = formTheme?.submit?.fullWidth ? "w-full" : "";
  const submitLabel =
    data.submitLabel === undefined && formTheme?.submit?.label !== undefined
      ? formTheme.submit.label
      : normalizedData.submitLabel;

  const title = resolveTitle(normalizedData, resolved);
  const description = resolveDescription(normalizedData, resolved);
  const titleClassName = joinClasses(
    titleSizeClass,
    titleWeightClassMap[style.titleWeight ?? "semibold"]
  );
  const sectionLabelId = title.trim().length > 0 ? `${widgetId}-title` : undefined;
  const fieldDomIds = allocateFieldDomIds(widgetId, fields, sectionLabelId ? [sectionLabelId] : []);
  const resolvedHeadingLevel = layout.headingLevel ?? "2";
  const titleStyle =
    compactStyle({
      color: resolveClearableCssColorValue(style.titleColor, "inherited-render"),
    }) ?? {};
  const descriptionStyle =
    compactStyle({
      color:
        resolveClearableCssColorValue(style.helperColor, "inherited-render") ?? "var(--color-text)",
    }) ?? {};
  const labelColor =
    resolveClearableCssColorValue(style.labelColor, "inherited-render") ?? "var(--color-text)";
  const helperColor =
    resolveClearableCssColorValue(style.helperColor, "inherited-render") ?? "var(--color-text)";
  const submitButtonStyle =
    compactStyle({
      backgroundColor: resolveClearableCssColorValue(style.submitBackground, "inherited-render"),
      color: resolveClearableCssColorValue(style.submitTextColor, "inherited-render"),
    }) ?? {};

  const showDescription = description.trim().length > 0;
  const showSuccessMessage = (normalizedData.successMessage ?? "").trim().length > 0;
  const formAction = buildFormAction(normalizedData.formId);
  const hasMultipleSteps = runtimeLayoutMode === "multi_step" && stepGroups.length > 1;
  const hasRuntimeFormReference = Boolean(normalizedData.formId);
  const runtimeDataMissing = hasRuntimeFormReference && resolved === undefined;
  const isInternalOnlyForm = resolved?.submissionAccess === "internal";
  const canRenderInteractiveForm = fields.length > 0 && !isInternalOnlyForm;
  const showProgress = hasMultipleSteps && navigation.showProgress;
  const HeadingTag = `h${resolvedHeadingLevel}` as "h2" | "h3" | "h4";

  return (
    <section
      className={joinClasses(
        "mx-auto flex w-full flex-col",
        sectionPaddingXClassMap[layout.sectionPaddingX],
        sectionPaddingYClassMap[layout.sectionPaddingY]
      )}
      style={sectionStyle}
      aria-labelledby={sectionLabelId}
      aria-label={sectionLabelId ? undefined : "Form"}
      data-form-embed-variant={resolvedVariant}
      data-form-embed-spacing={layout.spacing}
    >
      <div
        className={joinClasses(
          "flex w-full flex-col",
          containerWidthClass,
          alignClassMap[layout.alignment],
          fontFamilyClass
        )}
        data-form-embed-width={layout.width}
      >
        <div
          className={cardWrapperClassName}
          style={surfaceStyle}
          data-form-embed-radius={style.radius}
          data-form-embed-input-size={style.inputSize}
        >
          <div className="space-y-2">
            <HeadingTag id={sectionLabelId} className={titleClassName} style={titleStyle}>
              {title}
            </HeadingTag>
            {showDescription ? (
              <p className="text-sm" style={descriptionStyle}>
                {description}
              </p>
            ) : null}
          </div>
          {isInternalOnlyForm ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary="internal"
            >
              This form is not accepting public submissions right now.
            </div>
          ) : resolved?.error ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary="error"
            >
              {resolveFormEmbedRuntimeErrorMessage(resolved.error)}
            </div>
          ) : fields.length === 0 ? (
            <div
              className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70"
              data-form-embed-runtime-boundary={runtimeDataMissing ? "missing" : "empty"}
            >
              {runtimeDataMissing
                ? "Form fields load in runtime preview."
                : "No fields configured yet."}
            </div>
          ) : canRenderInteractiveForm ? (
            <form
              className="space-y-4"
              method="post"
              action={formAction}
              data-form-id={normalizedData.formId}
              data-nextless-form-runtime="1"
              data-form-layout-mode={runtimeLayoutMode}
              data-form-save-progress={saveProgressEnabled ? "1" : "0"}
              data-form-success-message={normalizedData.successMessage ?? ""}
              data-form-success-behavior={submitBehavior.successBehavior}
              data-form-loading-label={submitBehavior.loadingLabel}
              data-form-submit-label={submitLabel}
              data-form-progress-ttl-days={String(navigation.savedProgressTtlDays)}
              data-form-captcha-site-key={resolved?.botProtection?.siteKey ?? ""}
              data-form-captcha-action={resolved?.botProtection?.action ?? ""}
              data-form-root="true"
            >
              {resolved?.submissionNonce ? (
                <input
                  type="hidden"
                  name="__nl_form_nonce"
                  value={resolved.submissionNonce}
                  data-form-security-nonce="1"
                />
              ) : null}
              {showProgress ? (
                <div className="space-y-2" data-form-progress-root="true">
                  <p
                    className="text-xs font-medium text-[var(--color-text)]/70"
                    data-form-progress-text="true"
                  >
                    Step 1 of {stepGroups.length}
                  </p>
                  <div className="h-1.5 rounded-full bg-[var(--color-border)]/40">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      data-form-progress-bar="true"
                      style={{ width: `${Math.round(100 / stepGroups.length)}%` }}
                    />
                  </div>
                </div>
              ) : null}
              <div data-form-embed-form-body="true" className="space-y-4">
                {runtimeLayoutMode === "multi_step" ? (
                  <div className="space-y-4">
                    {stepGroups.map((group, index) => (
                      <div
                        key={`step-${group.step}`}
                        data-nextless-form-step="1"
                        data-step-index={group.step}
                        className={joinClasses("space-y-4", index === 0 ? undefined : "hidden")}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/60">
                          {runtimeStepTitles[group.step - 1]?.trim() || `Step ${group.step}`}
                        </p>
                        <div className={fieldsGridClassName}>
                          {group.fields.map((field) => (
                            <div
                              key={field.id}
                              className={resolveFieldGridSpanClass(field)}
                              data-form-field={field.name}
                              data-logic-operator={field.settings?.logic?.operator}
                              data-logic-field={field.settings?.logic?.field}
                              data-logic-value={field.settings?.logic?.value}
                            >
                              {renderFieldControl(field, {
                                ids: fieldDomIds.get(field)!,
                                showLabels: fieldsConfig.showLabels,
                                showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                                inputClassName,
                                borderClassName,
                                radiusClassName: inputRadiusClassName,
                                borderColor: resolvedBorderColor,
                                labelColor,
                                helperColor,
                                inputStyle: themeInputStyle,
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={fieldsGridClassName}>
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className={resolveFieldGridSpanClass(field)}
                        data-form-field={field.name}
                        data-logic-operator={field.settings?.logic?.operator}
                        data-logic-field={field.settings?.logic?.field}
                        data-logic-value={field.settings?.logic?.value}
                      >
                        {renderFieldControl(field, {
                          ids: fieldDomIds.get(field)!,
                          showLabels: fieldsConfig.showLabels,
                          showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                          inputClassName,
                          borderClassName,
                          radiusClassName: inputRadiusClassName,
                          borderColor: resolvedBorderColor,
                          labelColor,
                          helperColor,
                          inputStyle: themeInputStyle,
                        })}
                      </div>
                    ))}
                  </div>
                )}
                <div className={joinClasses("flex", buttonAlignClassMap[layout.buttonAlignment])}>
                  {hasMultipleSteps ? (
                    <button
                      type="button"
                      data-form-nav="back"
                      hidden
                      className={joinClasses(
                        "border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)]",
                        submitRadiusClassName
                      )}
                    >
                      {navigation.backLabel}
                    </button>
                  ) : null}
                  {hasMultipleSteps ? (
                    <button
                      type="button"
                      data-form-nav="next"
                      className={joinClasses(
                        "px-5 py-2 text-sm font-semibold",
                        submitRadiusClassName,
                        submitFullWidthClass
                      )}
                      style={submitButtonStyle}
                    >
                      {navigation.nextLabel}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    data-form-submit="1"
                    hidden={hasMultipleSteps}
                    className={joinClasses(
                      "px-5 py-2 text-sm font-semibold",
                      submitRadiusClassName,
                      submitFullWidthClass
                    )}
                    style={submitButtonStyle}
                  >
                    {submitLabel}
                  </button>
                </div>
              </div>
              {resolved?.botProtection?.siteKey ? (
                <input type="hidden" name="captchaToken" value="" data-form-security-captcha="1" />
              ) : null}
              <p
                className="hidden text-xs text-[var(--color-text)]/65"
                data-form-embed-success="true"
                role="alert"
                aria-live="polite"
              >
                {showSuccessMessage ? normalizedData.successMessage : ""}
              </p>
              <p
                className="hidden text-xs text-rose-600"
                data-form-embed-error="true"
                role="alert"
                aria-live="assertive"
              >
                Unable to submit the form. Please try again.
              </p>
            </form>
          ) : null}
          {canRenderInteractiveForm ? (
            <script dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const formEmbedEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "form-embed.wizard.form-selection",
      title: "Form selection",
      role: "setup",
      writablePaths: ["formId"],
      readOnlyPaths: ["resolved.formName", "resolved.status", "resolved.submissionAccess"],
    },
    {
      mode: "wizard",
      id: "form-embed.wizard.setup-diagnostics",
      title: "Setup diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.form-status",
      title: "Form preview",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.formName",
        "resolved.status",
        "resolved.submissionAccess",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.content",
      title: "Content",
      role: "content",
      writablePaths: ["title", "description", "submitLabel", "successMessage"],
    },
    {
      mode: "visual",
      id: "form-embed.visual.layout",
      title: "Layout",
      role: "layout",
      writablePaths: [
        "layout.alignment",
        "layout.width",
        "layout.spacing",
        "layout.buttonAlignment",
        "layout.sectionPaddingX",
        "layout.sectionPaddingY",
        "layout.fieldGap",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.field-labels",
      title: "Field labels",
      role: "content",
      writablePaths: ["fields.showLabels", "fields.showRequiredIndicator"],
    },
    {
      mode: "visual",
      id: "form-embed.visual.style",
      title: "Style",
      role: "visual",
      writablePaths: [
        "style.background",
        "style.surface",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
        "style.inputSize",
        "style.titleColor",
        "style.titleSize",
        "style.titleWeight",
        "style.labelColor",
        "style.helperColor",
        "style.submitBackground",
        "style.submitTextColor",
        "layout.headingLevel",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.navigation",
      title: "Multi-step navigation",
      role: "visual",
      writablePaths: [
        "navigation.backLabel",
        "navigation.nextLabel",
        "navigation.showProgress",
        "navigation.savedProgressTtlDays",
      ],
    },
    {
      mode: "visual",
      id: "form-embed.visual.submit-behavior",
      title: "Submit behavior",
      role: "visual",
      writablePaths: ["submitBehavior.loadingLabel", "submitBehavior.successBehavior"],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.runtime-diagnostics",
      title: "Runtime diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "formId",
        "resolved.fields",
        "resolved.settings.layoutMode",
        "resolved.settings.saveProgress",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.submission-security",
      title: "Submission security",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.submissionAccess",
        "resolved.submissionNonce",
        "resolved.botProtection",
        "resolved.successRedirectUrl",
        "successMessage",
        "submitBehavior.successBehavior",
      ],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.authoring-summary",
      title: "Authoring summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["title", "layout", "fields", "style", "navigation", "submitBehavior"],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

export function createFormEmbedWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<FormEmbedData>>;
  visual: ComponentType<WidgetEditorProps<FormEmbedData>>;
  advanced: ComponentType<WidgetEditorProps<FormEmbedData>>;
}): WidgetDefinition<FormEmbedData> {
  return {
    type: "form-embed",
    title: "Form Embed",
    description: "Embed a saved form with layout controls.",
    category: "forms",
    variants: [
      {
        id: "standard",
        label: "Standard",
        description: "Default form layout with configurable styling.",
      },
    ],
    schema: formEmbedSchema,
    defaults: formEmbedDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorContract: formEmbedEditorContract,
    render: FormEmbedBlock,
  };
}
