import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cn } from "@/lib/utils";
import { submitForm, type FormSettings, type FormSubmissionResponse } from "@/services/formsClient";
import {
  evaluateFormFieldLogic,
  resolveFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "../../../services/forms/fieldSettings";
import { normalizeFormStep } from "../../../services/forms/formSettings";
import {
  buildFormThemeStyleVars,
  formThemeAlignClass,
  formThemeBorderWidthClass,
  formThemeButtonAlignClass,
  formThemeColumnsClass,
  formThemeGapClass,
  formThemeInputSizeClass,
  formThemePaddingClass,
  formThemeRadiusClass,
  formThemeShadowClass,
  formThemeTitleSizeClass,
  formThemeTitleWeightClass,
  formThemeWidthClass,
  resolveFormTheme,
  type FormThemeFontFamily,
} from "../../../services/forms/formTheme";

// 516-06 owns this tiny LOCAL font-family token→class map (516-01 exports NO
// `fontFamilyClass` symbol via its resolved-token pattern; formTheme.ts DOES export
// `formThemeFontFamilyClass`, but the preview keeps its own map per the contract so
// the embed + preview share the SAME literal shape). "display" is the resolved
// DEFAULT (FORM_THEME_DEFAULTS.typography.fontFamily) and MUST be present.
const FORM_THEME_FONT_CLASS: Record<FormThemeFontFamily, string> = {
  display: "font-display",
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

type RuntimePreviewField = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  settings: {
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

type FormRuntimePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  formName: string;
  formDescription: string;
  settings: FormSettings;
  fields: RuntimePreviewField[];
  hasUnsavedChanges: boolean;
  onOpenLogs: () => void;
};

type RuntimeValues = Record<string, string | boolean>;

const toFieldDefault = (field: RuntimePreviewField): string | boolean => {
  if (field.type === "checkbox") {
    return field.settings.defaultValue === true;
  }
  if (typeof field.settings.defaultValue === "string") {
    return field.settings.defaultValue;
  }
  return "";
};

const buildInitialValues = (fields: RuntimePreviewField[]): RuntimeValues => {
  const result: RuntimeValues = {};
  for (const field of fields) {
    result[field.name] = toFieldDefault(field);
  }
  return result;
};

const toStepGroups = (fields: RuntimePreviewField[]) => {
  const groups = new Map<number, RuntimePreviewField[]>();
  for (const field of fields) {
    const step = normalizeFormStep(field.settings.formStep ?? field.settings.step);
    const list = groups.get(step) ?? [];
    list.push(field);
    groups.set(step, list);
  }

  return Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([step, groupFields]) => ({ step, fields: groupFields }));
};

export function FormRuntimePreviewDialog({
  open,
  onOpenChange,
  formId,
  formName,
  formDescription,
  settings,
  fields,
  hasUnsavedChanges,
  onOpenLogs,
}: FormRuntimePreviewDialogProps) {
  const [valuesState, setValuesState] = useState(() => ({
    source: fields,
    values: buildInitialValues(fields),
  }));
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FormSubmissionResponse | null>(null);

  const values = valuesState.source === fields ? valuesState.values : buildInitialValues(fields);
  const setValues = (next: RuntimeValues | ((previous: RuntimeValues) => RuntimeValues)) => {
    setValuesState((previous) => {
      const current = previous.source === fields ? previous.values : buildInitialValues(fields);
      return {
        source: fields,
        values: typeof next === "function" ? next(current) : next,
      };
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValuesState({ source: fields, values: buildInitialValues(fields) });
      setCurrentStep(1);
      setError(null);
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  const visibleFields = useMemo(() => {
    return fields.filter((field) => evaluateFormFieldLogic(field.settings.logic, values));
  }, [fields, values]);

  const stepGroups = useMemo(() => toStepGroups(visibleFields), [visibleFields]);
  const maxStep = settings.layoutMode === "multi_step" ? Math.max(stepGroups.length, 1) : 1;
  const activeStep = settings.layoutMode === "multi_step" ? Math.min(currentStep, maxStep) : 1;

  const activeStepFields = useMemo(() => {
    if (settings.layoutMode !== "multi_step") return visibleFields;
    const group = stepGroups.find((entry) => entry.step === activeStep);
    return group?.fields ?? [];
  }, [activeStep, settings.layoutMode, stepGroups, visibleFields]);

  const isLastStep = activeStep >= maxStep;

  // 516-06: apply the FULL resolved form theme to the preview via the SAME
  // formTheme.ts maps 516-04 uses on the canvas (one path ⇒ preview + canvas +
  // front cannot drift). An un-themed preview renders FORM_THEME_DEFAULTS.
  const t = resolveFormTheme(settings.theme);
  const styleVars = buildFormThemeStyleVars(t);
  const containerClass = cn(
    "flex w-full flex-col",
    formThemeWidthClass[t.layout.width],
    formThemeAlignClass[t.layout.align],
    FORM_THEME_FONT_CLASS[t.typography.fontFamily]
  );
  const cardClass = cn(
    "w-full space-y-6",
    t.surface.card
      ? cn(
          formThemeRadiusClass[t.surface.radius],
          formThemeBorderWidthClass[t.surface.borderWidth],
          formThemeShadowClass[t.surface.shadow],
          t.surface.borderColor ? "border-[color:var(--form-border)]" : undefined,
          t.surface.background ? "bg-[var(--form-surface-bg)]" : "bg-card"
        )
      : "border-0 shadow-none bg-transparent",
    formThemePaddingClass[t.surface.padding]
  );
  const titleClass = cn(
    formThemeTitleSizeClass[t.typography.titleSize],
    formThemeTitleWeightClass[t.typography.titleWeight],
    t.typography.titleColor ? "text-[color:var(--form-title)]" : "text-foreground"
  );
  const descriptionClass = cn(
    "text-sm",
    t.typography.helperColor ? "text-[color:var(--form-helper)]" : "text-muted-foreground"
  );
  const gridClass = cn(
    "grid",
    formThemeColumnsClass[t.layout.columns],
    formThemeGapClass[t.layout.fieldGap]
  );
  const themedInputClass = cn(
    formThemeInputSizeClass[t.input.size],
    formThemeRadiusClass[t.input.radius],
    t.input.background ? "bg-[var(--form-input-bg)]" : undefined,
    t.input.borderColor ? "border-[color:var(--form-input-border)]" : undefined,
    t.input.textColor ? "text-[color:var(--form-input-text)]" : undefined
  );
  const labelColorClass = t.typography.labelColor
    ? "text-[color:var(--form-label)]"
    : "text-muted-foreground";
  const helperColorClass = t.typography.helperColor
    ? "text-[color:var(--form-helper)]"
    : "text-muted-foreground";
  const submitFullWidth = t.submit.fullWidth || t.layout.buttonAlignment === "full";
  const submitClass = cn(
    formThemeRadiusClass[t.submit.radius],
    submitFullWidth ? "w-full" : cn("w-auto", formThemeButtonAlignClass[t.layout.buttonAlignment]),
    t.submit.background ? "bg-[var(--form-submit-bg)]" : undefined,
    t.submit.textColor ? "text-[color:var(--form-submit-text)]" : undefined
  );
  const submitLabel = t.submit.label ?? "Submit preview";

  const updateValue = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setResult(null);
    setError(null);
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {};
    for (const field of visibleFields) {
      const value = values[field.name];
      if (field.type === "checkbox") {
        payload[field.name] = value === true;
        continue;
      }
      payload[field.name] = typeof value === "string" ? value : "";
    }
    return payload;
  };

  const goNext = () => {
    if (currentStep < maxStep) {
      setCurrentStep((value) => Math.min(value + 1, maxStep));
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((value) => Math.max(value - 1, 1));
    }
  };

  const submit = async () => {
    if (!formId || hasUnsavedChanges || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await submitForm(formId, buildPayload());
      setResult(response);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to submit preview payload.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Form Runtime Preview</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Interactive preview for test submissions and automation verification.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-64px)]">
          <div className="space-y-4 px-6 py-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onOpenLogs}>
                Open action logs
              </Button>
            </div>

            {hasUnsavedChanges ? (
              <Alert>
                <AlertTitle>Save required before runtime test</AlertTitle>
                <AlertDescription>
                  Save the form first. Runtime preview uses persisted fields and settings.
                </AlertDescription>
              </Alert>
            ) : null}

            {settings.layoutMode === "multi_step" ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                Step {activeStep} of {maxStep}
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Preview submit failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {result?.runtime?.successMessage ? (
              <Alert>
                <AlertTitle>Submission completed</AlertTitle>
                <AlertDescription>{result.runtime.successMessage}</AlertDescription>
              </Alert>
            ) : null}

            {result?.runtime?.redirectUrl ? (
              <Alert>
                <AlertTitle>Runtime redirect configured</AlertTitle>
                <AlertDescription>
                  Redirect URL: <span className="font-mono">{result.runtime.redirectUrl}</span>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className={containerClass} style={styleVars}>
              <div className={cardClass}>
                <div className="space-y-1 border-b border-border/60 pb-4">
                  <h3 className={titleClass}>
                    {formName.trim().length > 0 ? formName : "Form title"}
                  </h3>
                  <p className={descriptionClass}>
                    {formDescription.trim().length > 0
                      ? formDescription
                      : "Use this preview to test action automation and runtime behavior."}
                  </p>
                </div>

                {activeStepFields.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                    No visible fields for this step. Update logic conditions or field configuration.
                  </div>
                ) : (
                  <div className={gridClass}>
                    {activeStepFields.map((field) => {
                      const style = resolveFormFieldStyle(field.settings.style);
                      const widthClass =
                        t.layout.columns === 1
                          ? "col-span-1"
                          : style.width === "half"
                            ? "md:col-span-1"
                            : "md:col-span-2";
                      const labelPositionClass =
                        style.labelPosition === "inline"
                          ? "md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-3"
                          : "space-y-2";
                      const value = values[field.name];

                      const labelNode =
                        style.labelPosition === "hidden" ? null : (
                          <label
                            htmlFor={`runtime-field-${field.id}`}
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wide",
                              labelColorClass
                            )}
                          >
                            {field.label}
                            {field.required ? " *" : ""}
                          </label>
                        );

                      return (
                        <div key={field.id} className={widthClass}>
                          {field.type === "checkbox" ? (
                            <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                              <input
                                id={`runtime-field-${field.id}`}
                                type="checkbox"
                                checked={value === true}
                                onChange={(event) => updateValue(field.name, event.target.checked)}
                              />
                              <span>
                                {style.labelPosition === "hidden" ? "Checkbox" : field.label}
                              </span>
                            </label>
                          ) : field.type === "textarea" ? (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-1">
                                <Textarea
                                  id={`runtime-field-${field.id}`}
                                  className={cn(
                                    formThemeRadiusClass[t.input.radius],
                                    t.input.background ? "bg-[var(--form-input-bg)]" : undefined,
                                    t.input.borderColor
                                      ? "border-[color:var(--form-input-border)]"
                                      : undefined,
                                    t.input.textColor
                                      ? "text-[color:var(--form-input-text)]"
                                      : undefined
                                  )}
                                  value={typeof value === "string" ? value : ""}
                                  placeholder={field.settings.placeholder ?? ""}
                                  onChange={(event) => updateValue(field.name, event.target.value)}
                                />
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : field.type === "select" ? (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-1">
                                <select
                                  id={`runtime-field-${field.id}`}
                                  className={cn(
                                    "w-full border bg-background px-3",
                                    themedInputClass
                                  )}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => updateValue(field.name, event.target.value)}
                                >
                                  <option value="">Select</option>
                                  {(field.settings.options ?? []).map((option) => (
                                    <option key={`${field.id}-${option}`} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : field.type === "radio" ? (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-2">
                                {(field.settings.options ?? []).map((option) => (
                                  <label
                                    key={`${field.id}-${option}`}
                                    className="flex items-center gap-2 text-sm text-foreground"
                                  >
                                    <input
                                      type="radio"
                                      name={field.name}
                                      value={option}
                                      checked={value === option}
                                      onChange={() => updateValue(field.name, option)}
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : field.type === "rating" ? (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-2">
                                {Array.from(
                                  { length: Math.max(1, Number(field.settings.max ?? 5)) },
                                  (_, index) => String(index + 1)
                                ).map((option) => (
                                  <label
                                    key={`${field.id}-${option}`}
                                    className="flex items-center gap-2 text-sm text-foreground"
                                  >
                                    <input
                                      type="radio"
                                      name={field.name}
                                      value={option}
                                      checked={value === option}
                                      onChange={() => updateValue(field.name, option)}
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : field.type === "file" ? (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-1">
                                <Input
                                  id={`runtime-field-${field.id}`}
                                  className={themedInputClass}
                                  type="file"
                                  accept={
                                    Array.isArray(field.settings.accept) &&
                                    field.settings.accept.length > 0
                                      ? field.settings.accept.join(",")
                                      : undefined
                                  }
                                  multiple={field.settings.multiple === true}
                                />
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : field.type === "hidden" ? (
                            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                              Hidden field submits trusted value:{" "}
                              <span className="font-mono">{String(value ?? "")}</span>
                            </div>
                          ) : (
                            <div className={labelPositionClass}>
                              {labelNode}
                              <div className="space-y-1">
                                <Input
                                  id={`runtime-field-${field.id}`}
                                  className={themedInputClass}
                                  type={
                                    field.type === "email"
                                      ? "email"
                                      : field.type === "date"
                                        ? "date"
                                        : field.type === "time"
                                          ? "time"
                                          : field.type === "number" || field.type === "range"
                                            ? field.type
                                            : field.type === "phone"
                                              ? "tel"
                                              : "text"
                                  }
                                  value={typeof value === "string" ? value : ""}
                                  placeholder={field.settings.placeholder ?? ""}
                                  onChange={(event) => updateValue(field.name, event.target.value)}
                                  min={
                                    typeof field.settings.min === "number"
                                      ? String(field.settings.min)
                                      : undefined
                                  }
                                  max={
                                    typeof field.settings.max === "number"
                                      ? String(field.settings.max)
                                      : undefined
                                  }
                                  step={
                                    typeof field.settings.inputStep === "number"
                                      ? String(field.settings.inputStep)
                                      : undefined
                                  }
                                />
                                {field.settings.helper ? (
                                  <p className={cn("text-xs", helperColorClass)}>
                                    {field.settings.helper}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
                  <div className="flex gap-2">
                    {settings.layoutMode === "multi_step" ? (
                      <Button variant="outline" onClick={goBack} disabled={currentStep <= 1}>
                        Back
                      </Button>
                    ) : null}
                    {settings.layoutMode === "multi_step" && !isLastStep ? (
                      <Button variant="outline" onClick={goNext}>
                        Next
                      </Button>
                    ) : null}
                  </div>
                  <Button
                    className={submitClass}
                    onClick={submit}
                    disabled={
                      !formId ||
                      hasUnsavedChanges ||
                      isSubmitting ||
                      (settings.layoutMode === "multi_step" && !isLastStep)
                    }
                  >
                    {isSubmitting ? "Submitting..." : submitLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
