import type { CSSProperties } from "react";
import { resolveFormFieldStyle } from "../../services/forms/fieldSettings";
import type { ResolvedFormField } from "./formEmbedContract";

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export type FieldDomIds = Readonly<{
  inputId: string;
  labelId: string;
  helperId?: string;
  uploadStatusId: string;
}>;

const resolveFieldIdPrefix = (field: ResolvedFormField) =>
  slugify(field.id || field.name || field.label || "field") || "field";

export const allocateFieldDomIds = (
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

export const groupFieldsByStep = (fields: ResolvedFormField[]) => {
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

export const resolveFieldGridSpanClass = (field: ResolvedFormField) => {
  const style = resolveFormFieldStyle(field.settings?.style);
  return style.width === "half" ? "md:col-span-1" : "md:col-span-2";
};

export type FormEmbedFieldControlOptions = {
  ids: FieldDomIds;
  showLabels: boolean;
  showRequiredIndicator: boolean;
  inputClassName: string;
  borderClassName: string;
  radiusClassName: string;
  borderColor: string;
  labelColor: string;
  helperColor: string;
  inputStyle?: CSSProperties;
};

export function renderFieldControl(
  field: ResolvedFormField,
  options: FormEmbedFieldControlOptions
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
        id={options.ids.labelId}
        htmlFor={options.ids.inputId}
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
    const optionsList = Array.isArray(field.settings?.options) ? field.settings.options : [];
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
          // Raw file input values are fake paths. The runtime submits the owned-media id.
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
