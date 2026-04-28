import type { CSSProperties, ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getFormRuntimeClientScript } from "./formRuntimeScript";
import {
  resolveFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "../../services/forms/fieldSettings";

export type FormEmbedVariantId = "standard";

export type FormEmbedLayout = {
  alignment?: "start" | "center" | "end";
  width?: "sm" | "md" | "lg" | "xl";
  spacing?: "sm" | "md" | "lg" | "xl";
  buttonAlignment?: "start" | "center" | "end";
};

export type FormEmbedStyle = {
  background?: string;
  surface?: string;
  borderColor?: string;
  borderWidth?: "0" | "1" | "2";
  radius?: "sm" | "md" | "lg";
  inputSize?: "sm" | "md" | "lg";
};

export type FormEmbedFields = {
  showLabels?: boolean;
  showRequiredIndicator?: boolean;
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
  resolved?: FormEmbedResolvedData;
};

const spacingClassMap: Record<NonNullable<FormEmbedLayout["spacing"]>, string> = {
  sm: "gap-4 py-6",
  md: "gap-6 py-8",
  lg: "gap-8 py-10",
  xl: "gap-10 py-12",
};

const widthClassMap: Record<NonNullable<FormEmbedLayout["width"]>, string> = {
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

const radiusClassMap: Record<NonNullable<FormEmbedStyle["radius"]>, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

const inputSizeClassMap: Record<NonNullable<FormEmbedStyle["inputSize"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
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
  return {
    alignment: value?.alignment ?? "start",
    width: value?.width ?? "md",
    spacing: value?.spacing ?? "md",
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
  };
};

const resolveFields = (value?: FormEmbedFields): Required<FormEmbedFields> => {
  return {
    showLabels: value?.showLabels ?? true,
    showRequiredIndicator: value?.showRequiredIndicator ?? true,
  };
};

const isBorderWidthValue = (
  value: string
): value is NonNullable<FormEmbedStyle["borderWidth"]> =>
  value === "0" || value === "1" || value === "2";

const isRadius = (
  value: string
): value is NonNullable<FormEmbedStyle["radius"]> =>
  value === "sm" || value === "md" || value === "lg";

const isInputSize = (
  value: string
): value is NonNullable<FormEmbedStyle["inputSize"]> =>
  value === "sm" || value === "md" || value === "lg";

const isAlignment = (
  value: string
): value is NonNullable<FormEmbedLayout["alignment"]> =>
  value === "start" || value === "center" || value === "end";

const isWidth = (
  value: string
): value is NonNullable<FormEmbedLayout["width"]> =>
  value === "sm" || value === "md" || value === "lg" || value === "xl";

const isSpacing = (
  value: string
): value is NonNullable<FormEmbedLayout["spacing"]> =>
  value === "sm" || value === "md" || value === "lg" || value === "xl";

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
        width: { enum: ["sm", "md", "lg", "xl"] },
        spacing: { enum: ["sm", "md", "lg", "xl"] },
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
        radius: { enum: ["sm", "md", "lg"] },
        inputSize: { enum: ["sm", "md", "lg"] },
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
    buttonAlignment: "start",
  },
  style: {
    background: "transparent",
    surface: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
    radius: "md",
    inputSize: "md",
  },
  fields: {
    showLabels: true,
    showRequiredIndicator: true,
  },
};

export function normalizeFormEmbedData(data: FormEmbedData): FormEmbedData {
  const layout = resolveLayout(data.layout);
  const style = resolveStyle(data.style);
  const fields = resolveFields(data.fields);

  const normalizedLayout: Required<FormEmbedLayout> = {
    alignment: isAlignment(layout.alignment) ? layout.alignment : "start",
    width: isWidth(layout.width) ? layout.width : "md",
    spacing: isSpacing(layout.spacing) ? layout.spacing : "md",
    buttonAlignment: isAlignment(layout.buttonAlignment) ? layout.buttonAlignment : "start",
  };

  const normalizedStyle: Required<FormEmbedStyle> = {
    background: resolveNonEmptyString(style.background, "transparent"),
    surface: resolveNonEmptyString(style.surface, "var(--color-bg)"),
    borderColor: resolveNonEmptyString(style.borderColor, "var(--color-border)"),
    borderWidth: isBorderWidthValue(style.borderWidth) ? style.borderWidth : "1",
    radius: isRadius(style.radius) ? style.radius : "md",
    inputSize: isInputSize(style.inputSize) ? style.inputSize : "md",
  };

  const resolvedSuccessMessage =
    data.successMessage !== undefined
      ? data.successMessage
      : data.resolved?.successMessage ?? undefined;

  return {
    ...data,
    formId: resolveOptionalString(data.formId),
    title: resolveOptionalString(data.title),
    description: resolveOptionalString(data.description),
    submitLabel: resolveNonEmptyString(data.submitLabel, formEmbedDefaults.submitLabel!),
    successMessage: resolveString(
      resolvedSuccessMessage,
      formEmbedDefaults.successMessage ?? ""
    ),
    layout: normalizedLayout,
    style: normalizedStyle,
    fields,
  };
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const buildFormAction = (formId?: string) =>
  formId ? `/forms/${encodeURIComponent(formId)}/submissions` : undefined;

const resolveTitle = (
  data: FormEmbedData,
  resolved?: FormEmbedResolvedData
) => {
  return data.title ?? resolved?.formName ?? "Form";
};

const resolveDescription = (
  data: FormEmbedData,
  resolved?: FormEmbedResolvedData
) => {
  return data.description ?? resolved?.description ?? "";
};

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

function renderFieldControl(field: ResolvedFormField, options: {
  showLabels: boolean;
  showRequiredIndicator: boolean;
  inputClassName: string;
  borderClassName: string;
  radiusClassName: string;
  borderColor: string;
}) {
  const {
    showLabels,
    showRequiredIndicator,
    inputClassName,
    borderClassName,
    radiusClassName,
    borderColor,
  } = options;
  const placeholder = field.settings?.placeholder ?? "";
  const helper = field.settings?.helper;
  const required = Boolean(field.required);
  const labelSuffix = showRequiredIndicator && required ? " *" : "";
  const resolvedFieldStyle = resolveFormFieldStyle(field.settings?.style);
  const labelHidden =
    !showLabels || resolvedFieldStyle.labelPosition === "hidden";
  const inlineLabel = resolvedFieldStyle.labelPosition === "inline" && !labelHidden;
  const wrapperClassName = inlineLabel
    ? "grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-3"
    : "space-y-2";

  const renderLabel = () =>
    !labelHidden ? (
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/70">
        {field.label}
        {labelSuffix}
      </label>
    ) : null;

  if (field.type === "textarea") {
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <textarea
          name={field.name}
          required={required}
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
          <p className="text-xs text-[var(--color-text)]/60">{helper}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          name={field.name}
          required={required}
          data-required-original={required ? "1" : "0"}
          defaultChecked={Boolean(field.settings?.defaultValue)}
          className={joinClasses("h-4 w-4", borderClassName, radiusClassName)}
          style={{ borderColor }}
        />
        <span>
          {!labelHidden ? field.label : "Checkbox"}
          {labelSuffix}
        </span>
      </label>
    );
  }

  if (field.type === "select") {
    const optionsList = Array.isArray(field.settings?.options)
      ? field.settings?.options
      : [];
    return (
      <div className={wrapperClassName}>
        {renderLabel()}
        <select
          name={field.name}
          required={required}
          data-required-original={required ? "1" : "0"}
          className={joinClasses(
            "w-full border bg-transparent",
            inputClassName,
            borderClassName,
            radiusClassName
          )}
          style={{ borderColor }}
          defaultValue={field.settings?.defaultValue as string | undefined}
        >
          <option value="">Select an option</option>
          {optionsList.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {helper ? (
          <p className="text-xs text-[var(--color-text)]/60">{helper}</p>
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
      : "text";

  return (
    <div className={wrapperClassName}>
      {renderLabel()}
      <input
        type={inputType}
        name={field.name}
        required={required}
        data-required-original={required ? "1" : "0"}
        placeholder={placeholder}
        defaultValue={field.settings?.defaultValue as string | undefined}
        pattern={field.settings?.pattern}
        className={joinClasses(
          "w-full border bg-transparent",
          inputClassName,
          borderClassName,
          radiusClassName
        )}
        style={{ borderColor }}
      />
      {helper ? (
        <p className="text-xs text-[var(--color-text)]/60">{helper}</p>
      ) : null}
    </div>
  );
}

export function FormEmbedBlock({ data, variant }: { data: FormEmbedData; variant: string }) {
  const normalizedData = normalizeFormEmbedData(data);
  const resolvedVariant: FormEmbedVariantId = variant === "standard" ? "standard" : "standard";
  const resolved = normalizedData.resolved;
  const layout = resolveLayout(normalizedData.layout);
  const style = resolveStyle(normalizedData.style);
  const fieldsConfig = resolveFields(normalizedData.fields);
  const fields = Array.isArray(resolved?.fields) ? resolved?.fields : [];
  const runtimeLayoutMode = resolved?.settings?.layoutMode === "multi_step" ? "multi_step" : "single";
  const stepGroups = groupFieldsByStep(fields);
  const runtimeStepTitles = Array.isArray(resolved?.settings?.stepTitles)
    ? resolved?.settings?.stepTitles
    : [];
  const saveProgressEnabled = resolved?.settings?.saveProgress === true;

  const sectionStyle: CSSProperties = {
    backgroundColor: style.background,
  };
  const surfaceStyle: CSSProperties = {
    backgroundColor: style.surface,
    borderColor: style.borderColor,
  };

  const borderClassName = borderWidthClassMap[style.borderWidth];
  const radiusClassName = radiusClassMap[style.radius];
  const inputClassName = inputSizeClassMap[style.inputSize];

  const title = resolveTitle(normalizedData, resolved);
  const description = resolveDescription(normalizedData, resolved);
  const showDescription = description.trim().length > 0;
  const showSuccessMessage = (normalizedData.successMessage ?? "").trim().length > 0;
  const formAction = buildFormAction(normalizedData.formId);
  const hasMultipleSteps = runtimeLayoutMode === "multi_step" && stepGroups.length > 1;
  const hasRuntimeFormReference = Boolean(normalizedData.formId);
  const runtimeDataMissing = hasRuntimeFormReference && resolved === undefined;

  return (
    <section
      className={joinClasses("mx-auto flex w-full flex-col px-4", spacingClassMap[layout.spacing])}
      style={sectionStyle}
      data-form-embed-variant={resolvedVariant}
    >
      <div
        className={joinClasses(
          "flex w-full flex-col",
          widthClassMap[layout.width],
          alignClassMap[layout.alignment]
        )}
      >
        <div
          className={joinClasses(
            "w-full space-y-6 rounded-2xl border p-6",
            borderClassName,
            radiusClassName
          )}
          style={surfaceStyle}
        >
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[var(--color-text)]">{title}</h3>
            {showDescription ? (
              <p className="text-sm text-[var(--color-text)]/70">{description}</p>
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
            >
              {resolved?.submissionNonce ? (
                <input
                  type="hidden"
                  name="__nl_form_nonce"
                  value={resolved.submissionNonce}
                />
              ) : null}
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
                      <div className="grid gap-4 md:grid-cols-2">
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
                              showLabels: fieldsConfig.showLabels,
                              showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                              inputClassName,
                              borderClassName,
                              radiusClassName,
                              borderColor: style.borderColor,
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
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
                        showLabels: fieldsConfig.showLabels,
                        showRequiredIndicator: fieldsConfig.showRequiredIndicator,
                        inputClassName,
                        borderClassName,
                        radiusClassName,
                        borderColor: style.borderColor,
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
                      "rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)]",
                      radiusClassName
                    )}
                  >
                    Back
                  </button>
                ) : null}
                {hasMultipleSteps ? (
                  <button
                    type="button"
                    data-form-nav="next"
                    className={joinClasses(
                      "rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-bg)]",
                      radiusClassName
                    )}
                  >
                    Next
                  </button>
                ) : null}
                <button
                  type="submit"
                  data-form-submit="1"
                  hidden={hasMultipleSteps}
                  className={joinClasses(
                    "rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-bg)]",
                    radiusClassName
                  )}
                >
                  {normalizedData.submitLabel}
                </button>
              </div>
              <p
                className="hidden text-xs text-[var(--color-text)]/65"
                data-form-embed-success="true"
              >
                {showSuccessMessage ? normalizedData.successMessage : ""}
              </p>
              <p
                className="hidden text-xs text-rose-600"
                data-form-embed-error="true"
              >
                Unable to submit the form. Please try again.
              </p>
            </form>
          )}
          {fields.length > 0 ? (
            <script
              dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
    render: FormEmbedBlock,
  };
}
