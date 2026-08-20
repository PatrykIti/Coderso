import type { FormFieldLogic, FormFieldStyle } from "../forms/fieldSettings";
import type { FormFormTheme } from "../forms/formTheme";
import { CSS_COLOR_SCHEMA_PATTERNS, CSS_COLOR_VALUE_MAX_LENGTH } from "../theme/cssColorContract";
import { resolveClearableCssColorValue } from "./clearableStyle";

export type FormEmbedVariantId = "standard";

export const FORM_EMBED_TEXTAREA_ROWS_LIMITS = {
  min: 2,
  max: 20,
  legacyDefault: 4,
} as const;
export const FORM_EMBED_LOADING_LABEL_MAX_LENGTH = 1_000;
export const FORM_EMBED_SUCCESS_BEHAVIORS = [
  "show-message-hide-form",
  "show-message-reset-form",
  "show-message-keep-form",
] as const;

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
  textareaRows?: number;
  showSelectPrompt?: boolean;
};

export type FormEmbedNavigation = {
  backLabel?: string;
  nextLabel?: string;
  showProgress?: boolean;
  savedProgressTtlDays?: number;
};

export type FormEmbedSubmitBehavior = {
  loadingLabel?: string;
  successBehavior?: (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number];
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
    // The raw present-only theme is layered below per-widget overrides at render time.
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

export const resolveLayout = (value?: FormEmbedLayout): Required<FormEmbedLayout> => {
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

export const resolveStyle = (value?: FormEmbedStyle): Required<FormEmbedStyle> => ({
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
});

export type NormalizedFormEmbedFields = FormEmbedFields &
  Required<Pick<FormEmbedFields, "showLabels" | "showRequiredIndicator">>;

const isTextareaRows = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= FORM_EMBED_TEXTAREA_ROWS_LIMITS.min &&
  value <= FORM_EMBED_TEXTAREA_ROWS_LIMITS.max;

export const normalizeFormEmbedFields = (value?: FormEmbedFields): NormalizedFormEmbedFields => ({
  showLabels: value?.showLabels ?? true,
  showRequiredIndicator: value?.showRequiredIndicator ?? true,
  ...(isTextareaRows(value?.textareaRows) ? { textareaRows: value.textareaRows } : {}),
  ...(typeof value?.showSelectPrompt === "boolean"
    ? { showSelectPrompt: value.showSelectPrompt }
    : {}),
});

export const resolveFields = normalizeFormEmbedFields;

export const resolveFormEmbedFieldPresentation = (value?: FormEmbedFields) => ({
  textareaRows: value?.textareaRows ?? FORM_EMBED_TEXTAREA_ROWS_LIMITS.legacyDefault,
  showSelectPrompt: value?.showSelectPrompt ?? true,
});

export function clampSavedProgressTtl(raw: string | number | undefined): number {
  const parsed = typeof raw === "number" ? Math.round(raw) : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(1, Math.min(30, parsed));
}

export const resolveNavigation = (value?: FormEmbedNavigation): Required<FormEmbedNavigation> => ({
  backLabel: resolveNonEmptyString(value?.backLabel, "Back"),
  nextLabel: resolveNonEmptyString(value?.nextLabel, "Next"),
  showProgress: value?.showProgress ?? true,
  savedProgressTtlDays: clampSavedProgressTtl(value?.savedProgressTtlDays),
});

export const resolveSubmitBehavior = (
  value?: FormEmbedSubmitBehavior
): Required<FormEmbedSubmitBehavior> => {
  const successBehavior = value?.successBehavior;
  const loadingLabel = resolveNonEmptyString(value?.loadingLabel, "Sending...");
  return {
    loadingLabel:
      loadingLabel.length <= FORM_EMBED_LOADING_LABEL_MAX_LENGTH ? loadingLabel : "Sending...",
    successBehavior: FORM_EMBED_SUCCESS_BEHAVIORS.includes(
      successBehavior as (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number]
    )
      ? (successBehavior as (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number])
      : FORM_EMBED_SUCCESS_BEHAVIORS[0],
  };
};

const isBorderWidthValue = (value: string): value is NonNullable<FormEmbedStyle["borderWidth"]> =>
  value === "0" || value === "1" || value === "2";

const isRadius = (value: string): value is NonNullable<FormEmbedStyle["radius"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg";

export const isInputSize = (value: string): value is NonNullable<FormEmbedStyle["inputSize"]> =>
  value === "none" || value === "sm" || value === "md" || value === "lg";

const isAlignment = (value: string): value is NonNullable<FormEmbedLayout["alignment"]> =>
  value === "start" || value === "center" || value === "end";

export const isWidth = (value: string): value is NonNullable<FormEmbedLayout["width"]> =>
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

export const isFieldGap = (value: string): value is NonNullable<FormEmbedLayout["fieldGap"]> =>
  value === "sm" || value === "md" || value === "lg";

const isHeadingLevel = (value: string): value is NonNullable<FormEmbedLayout["headingLevel"]> =>
  value === "2" || value === "3" || value === "4";

export const isTitleSize = (value: string): value is NonNullable<FormEmbedStyle["titleSize"]> =>
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
        textareaRows: {
          type: "integer",
          minimum: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
          maximum: FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
        },
        showSelectPrompt: { type: "boolean" },
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
        loadingLabel: {
          type: "string",
          minLength: 1,
          maxLength: FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
          pattern: "\\S",
        },
        successBehavior: {
          enum: [...FORM_EMBED_SUCCESS_BEHAVIORS],
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
