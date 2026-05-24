import { useId, type CSSProperties, type ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import {
  resolveFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "../../services/forms/fieldSettings";

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
    step?: number;
    logic?: FormFieldLogic;
    style?: FormFieldStyle;
  };
};

export type FormEmbedResolvedData = {
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
  const rawSpacing = value?.spacing ?? "md";
  const spacing = isSpacing(rawSpacing) ? rawSpacing : "md";
  return {
    alignment: value?.alignment ?? "start",
    width: value?.width ?? "md",
    spacing,
    sectionPaddingX: value?.sectionPaddingX ?? "sm",
    sectionPaddingY: value?.sectionPaddingY ?? spacingClassMap[spacing].sectionPaddingY,
    fieldGap: value?.fieldGap ?? "md",
    headingLevel: value?.headingLevel ?? "2",
    buttonAlignment: value?.buttonAlignment ?? "start",
  };
};

const resolveStyle = (value?: FormEmbedStyle): Required<FormEmbedStyle> => {
  return {
    background: value?.background ?? "transparent",
    surface: value?.surface ?? "var(--color-bg)",
    borderColor: value?.borderColor ?? "var(--color-border)",
    borderWidth: value?.borderWidth ?? "1",
    radius: value?.radius ?? "md",
    inputSize: value?.inputSize ?? "md",
    titleColor: value?.titleColor ?? "var(--color-text)",
    titleSize: value?.titleSize ?? "md",
    titleWeight: value?.titleWeight ?? "semibold",
    labelColor: value?.labelColor ?? "var(--color-text)",
    helperColor: value?.helperColor ?? "var(--color-text)",
    submitBackground: value?.submitBackground ?? "var(--color-primary)",
    submitTextColor: value?.submitTextColor ?? "var(--color-bg)",
  };
};

const resolveFields = (value?: FormEmbedFields): Required<FormEmbedFields> => {
  return {
    showLabels: value?.showLabels ?? true,
    showRequiredIndicator: value?.showRequiredIndicator ?? true,
  };
};

const resolveNavigation = (value?: FormEmbedNavigation): Required<FormEmbedNavigation> => {
  const ttl =
    typeof value?.savedProgressTtlDays === "number" ? Math.round(value.savedProgressTtlDays) : 7;
  return {
    backLabel: resolveNonEmptyString(value?.backLabel, "Back"),
    nextLabel: resolveNonEmptyString(value?.nextLabel, "Next"),
    showProgress: value?.showProgress ?? true,
    savedProgressTtlDays: Math.min(30, Math.max(1, Number.isFinite(ttl) ? ttl : 7)),
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
        background: { type: "string" },
        surface: { type: "string" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2"] },
        radius: { enum: ["none", "sm", "md", "lg"] },
        inputSize: { enum: ["none", "sm", "md", "lg"] },
        titleColor: { type: "string" },
        titleSize: { enum: ["sm", "md", "lg"] },
        titleWeight: { enum: ["medium", "semibold", "bold"] },
        labelColor: { type: "string" },
        helperColor: { type: "string" },
        submitBackground: { type: "string" },
        submitTextColor: { type: "string" },
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
      additionalProperties: true,
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

export function normalizeFormEmbedData(data: FormEmbedData): FormEmbedData {
  const layout = resolveLayout(data.layout);
  const style = resolveStyle(data.style);
  const fields = resolveFields(data.fields);
  const navigation = resolveNavigation(data.navigation);
  const submitBehavior = resolveSubmitBehavior(data.submitBehavior);
  const hasStyleObject = data.style !== undefined;

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
      ? resolveClearableStyleValue(data.style?.background)
      : resolveNonEmptyString(style.background, "transparent"),
    surface: hasStyleObject
      ? resolveClearableStyleValue(data.style?.surface)
      : resolveNonEmptyString(style.surface, "var(--color-bg)"),
    borderColor: resolveNonEmptyString(style.borderColor, "var(--color-border)"),
    borderWidth: isBorderWidthValue(style.borderWidth) ? style.borderWidth : "1",
    radius: isRadius(style.radius) ? style.radius : "md",
    inputSize: isInputSize(style.inputSize) ? style.inputSize : "md",
    titleColor: resolveOptionalString(style.titleColor),
    titleSize: isTitleSize(style.titleSize) ? style.titleSize : "md",
    titleWeight: isTitleWeight(style.titleWeight) ? style.titleWeight : "semibold",
    labelColor: resolveOptionalString(style.labelColor),
    helperColor: resolveOptionalString(style.helperColor),
    submitBackground: resolveOptionalString(style.submitBackground),
    submitTextColor: resolveOptionalString(style.submitTextColor),
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

const resolveFieldIdPrefix = (widgetId: string, field: ResolvedFormField) => {
  return slugify(field.id || field.name || field.label || "field") || "field";
};

const resolveFieldDomIds = (widgetId: string, field: ResolvedFormField) => {
  const prefix = resolveFieldIdPrefix(widgetId, field);
  return {
    inputId: `${widgetId}-${prefix}`,
    labelId: `${widgetId}-${prefix}-label`,
    helperId: field.settings?.helper ? `${widgetId}-${prefix}-helper` : undefined,
  };
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
]);

const resolveUnsupportedFieldLabel = (field: ResolvedFormField) => field.type.trim() || "unknown";

const normalizeRuntimeStep = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
};

const groupFieldsByStep = (fields: ResolvedFormField[]) => {
  const groups = new Map<number, ResolvedFormField[]>();
  for (const field of fields) {
    const step = normalizeRuntimeStep(field.settings?.step);
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
    widgetId: string;
    showLabels: boolean;
    showRequiredIndicator: boolean;
    inputClassName: string;
    borderClassName: string;
    radiusClassName: string;
    borderColor: string;
    labelColor: string;
    helperColor: string;
  }
) {
  const {
    widgetId,
    showLabels,
    showRequiredIndicator,
    inputClassName,
    borderClassName,
    radiusClassName,
    borderColor,
    labelColor,
    helperColor,
  } = options;
  const ids = resolveFieldDomIds(widgetId, field);
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
          style={{ borderColor }}
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
              className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
              style={{ borderColor }}
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
            className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
            style={{ borderColor }}
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
          style={{ borderColor }}
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
                  style={{ borderColor }}
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
                style={{ borderColor }}
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
        step={typeof field.settings?.step === "number" ? String(field.settings.step) : undefined}
        className={joinClasses(
          "w-full border bg-transparent",
          inputClassName,
          borderClassName,
          radiusClassName
        )}
        style={{ borderColor }}
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
  const layout = resolveLayout(normalizedData.layout);
  const style = {
    ...resolveStyle(undefined),
    ...(normalizedData.style ?? {}),
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

  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.background),
    }) ?? {};
  const surfaceStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.surface),
      borderColor: style.borderColor,
    }) ?? {};

  const borderClassName = borderWidthClassMap[style.borderWidth];
  const radiusClassName = radiusClassMap[style.radius];
  const inputClassName = inputSizeClassMap[style.inputSize];
  const title = resolveTitle(normalizedData, resolved);
  const description = resolveDescription(normalizedData, resolved);
  const titleClassName = joinClasses(
    titleSizeClassMap[style.titleSize ?? "md"],
    titleWeightClassMap[style.titleWeight ?? "semibold"]
  );
  const sectionLabelId = title.trim().length > 0 ? `${widgetId}-title` : undefined;
  const resolvedHeadingLevel = layout.headingLevel ?? "2";
  const titleStyle = compactStyle({ color: style.titleColor }) ?? {};
  const descriptionStyle = compactStyle({ color: style.helperColor ?? "var(--color-text)" }) ?? {};
  const labelColor = style.labelColor ?? "var(--color-text)";
  const helperColor = style.helperColor ?? "var(--color-text)";
  const submitButtonStyle =
    compactStyle({
      backgroundColor: style.submitBackground,
      color: style.submitTextColor,
    }) ?? {};

  const showDescription = description.trim().length > 0;
  const showSuccessMessage = (normalizedData.successMessage ?? "").trim().length > 0;
  const formAction = buildFormAction(normalizedData.formId);
  const hasMultipleSteps = runtimeLayoutMode === "multi_step" && stepGroups.length > 1;
  const hasRuntimeFormReference = Boolean(normalizedData.formId);
  const runtimeDataMissing = hasRuntimeFormReference && resolved === undefined;
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
          widthClassMap[layout.width],
          alignClassMap[layout.alignment]
        )}
        data-form-embed-width={layout.width}
      >
        <div
          className={joinClasses("w-full space-y-6 border p-6", borderClassName, radiusClassName)}
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
          {resolved?.error ? (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70">
              Form unavailable ({resolved.error}).
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-[var(--color-text)]/70">
              {runtimeDataMissing
                ? "Form fields load in runtime preview."
                : "No fields configured yet."}
            </div>
          ) : (
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
              data-form-submit-label={normalizedData.submitLabel}
              data-form-progress-ttl-days={String(navigation.savedProgressTtlDays)}
              data-form-captcha-site-key={resolved?.botProtection?.siteKey ?? ""}
              data-form-captcha-action={resolved?.botProtection?.action ?? ""}
              data-form-root="true"
            >
              {resolved?.submissionNonce ? (
                <input type="hidden" name="__nl_form_nonce" value={resolved.submissionNonce} />
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
                        <div
                          className={joinClasses(
                            "grid md:grid-cols-2",
                            fieldGapClassMap[layout.fieldGap]
                          )}
                        >
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
                                widgetId,
                                showLabels: fieldsConfig.showLabels,
                                showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                                inputClassName,
                                borderClassName,
                                radiusClassName,
                                borderColor: style.borderColor,
                                labelColor,
                                helperColor,
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={joinClasses(
                      "grid md:grid-cols-2",
                      fieldGapClassMap[layout.fieldGap]
                    )}
                  >
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
                          widgetId,
                          showLabels: fieldsConfig.showLabels,
                          showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                          inputClassName,
                          borderClassName,
                          radiusClassName,
                          borderColor: style.borderColor,
                          labelColor,
                          helperColor,
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
                        radiusClassName
                      )}
                    >
                      {navigation.backLabel}
                    </button>
                  ) : null}
                  {hasMultipleSteps ? (
                    <button
                      type="button"
                      data-form-nav="next"
                      className={joinClasses("px-5 py-2 text-sm font-semibold", radiusClassName)}
                      style={submitButtonStyle}
                    >
                      {navigation.nextLabel}
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    data-form-submit="1"
                    hidden={hasMultipleSteps}
                    className={joinClasses("px-5 py-2 text-sm font-semibold", radiusClassName)}
                    style={submitButtonStyle}
                  >
                    {normalizedData.submitLabel}
                  </button>
                </div>
              </div>
              {resolved?.botProtection?.siteKey ? (
                <input type="hidden" name="captchaToken" value="" />
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
          )}
          {fields.length > 0 ? (
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
      title: "Selected form",
      role: "diagnostics",
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
        "submitBehavior.successBehavior",
      ],
    },
    {
      mode: "advanced",
      id: "form-embed.advanced.payload-snapshot",
      title: "Normalized payload snapshot",
      role: "technical",
      writablePaths: [],
      readOnlyPaths: ["resolved"],
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
