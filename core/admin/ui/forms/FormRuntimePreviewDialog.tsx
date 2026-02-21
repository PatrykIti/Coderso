import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  submitForm,
  type FormSettings,
  type FormSubmissionResponse,
} from "@/services/formsClient";
import {
  evaluateFormFieldLogic,
  resolveFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "../../../services/forms/fieldSettings";
import { normalizeFormStep } from "../../../services/forms/formSettings";

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
    step?: number;
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
    const step = normalizeFormStep(field.settings.step);
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
  const [values, setValues] = useState<RuntimeValues>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FormSubmissionResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(buildInitialValues(fields));
    setCurrentStep(1);
    setError(null);
    setResult(null);
  }, [fields, open]);

  const visibleFields = useMemo(() => {
    return fields.filter((field) =>
      evaluateFormFieldLogic(field.settings.logic, values)
    );
  }, [fields, values]);

  const stepGroups = useMemo(() => toStepGroups(visibleFields), [visibleFields]);
  const activeStep = settings.layoutMode === "multi_step" ? currentStep : 1;

  const activeStepFields = useMemo(() => {
    if (settings.layoutMode !== "multi_step") return visibleFields;
    const group = stepGroups.find((entry) => entry.step === activeStep);
    return group?.fields ?? [];
  }, [activeStep, settings.layoutMode, stepGroups, visibleFields]);

  const maxStep = settings.layoutMode === "multi_step" ? Math.max(stepGroups.length, 1) : 1;
  const isLastStep = activeStep >= maxStep;

  useEffect(() => {
    if (activeStep <= maxStep) return;
    setCurrentStep(maxStep);
  }, [activeStep, maxStep]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl" showCloseButton={false}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Form Runtime Preview</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Interactive preview for test submissions and automation verification.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-64px)]">
          <div className="space-y-4 px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">{formName}</h3>
                <p className="text-xs text-muted-foreground">
                  {formDescription.trim().length > 0
                    ? formDescription
                    : "Use this preview to test action automation and runtime behavior."}
                </p>
              </div>
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

            {activeStepFields.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                No visible fields for this step. Update logic conditions or field configuration.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeStepFields.map((field) => {
                  const style = resolveFormFieldStyle(field.settings.style);
                  const widthClass = style.width === "half" ? "md:col-span-1" : "md:col-span-2";
                  const labelPositionClass =
                    style.labelPosition === "inline"
                      ? "md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-3"
                      : "space-y-2";
                  const value = values[field.name];

                  const labelNode =
                    style.labelPosition === "hidden" ? null : (
                      <label
                        htmlFor={`runtime-field-${field.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                              value={typeof value === "string" ? value : ""}
                              placeholder={field.settings.placeholder ?? ""}
                              onChange={(event) => updateValue(field.name, event.target.value)}
                            />
                            {field.settings.helper ? (
                              <p className="text-xs text-muted-foreground">{field.settings.helper}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : field.type === "select" ? (
                        <div className={labelPositionClass}>
                          {labelNode}
                          <div className="space-y-1">
                            <select
                              id={`runtime-field-${field.id}`}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                              <p className="text-xs text-muted-foreground">{field.settings.helper}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className={labelPositionClass}>
                          {labelNode}
                          <div className="space-y-1">
                            <Input
                              id={`runtime-field-${field.id}`}
                              type={
                                field.type === "email"
                                  ? "email"
                                  : field.type === "date"
                                    ? "date"
                                    : field.type === "phone"
                                      ? "tel"
                                      : "text"
                              }
                              value={typeof value === "string" ? value : ""}
                              placeholder={field.settings.placeholder ?? ""}
                              onChange={(event) => updateValue(field.name, event.target.value)}
                            />
                            {field.settings.helper ? (
                              <p className="text-xs text-muted-foreground">{field.settings.helper}</p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
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
                onClick={submit}
                disabled={
                  !formId ||
                  hasUnsavedChanges ||
                  isSubmitting ||
                  (settings.layoutMode === "multi_step" && !isLastStep)
                }
              >
                {isSubmitting ? "Submitting..." : "Submit preview"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
