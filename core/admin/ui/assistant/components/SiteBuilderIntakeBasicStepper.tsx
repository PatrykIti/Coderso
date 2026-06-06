import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AssistantActionPlanResponse } from "@/services/assistantClient";
import type {
  AssistantSiteBuilderIntakeSession,
  AssistantSiteBuilderIntakeStepId,
} from "../../../../services/assistant/assistantSiteBuilderIntakeTypes";

type SiteBuilderIntakeMetadata = NonNullable<
  NonNullable<AssistantActionPlanResponse["metadata"]>["siteBuilderIntake"]
>;
type SiteBuilderIntakeStepMetadata = SiteBuilderIntakeMetadata["steps"][number];
type SiteBuilderIntakeAnswerFieldMetadata = SiteBuilderIntakeStepMetadata["answerFields"][number];
type FieldDraftValue = string | boolean | string[] | Record<string, string>;
type FieldDraft = Record<string, FieldDraftValue>;

type SiteBuilderIntakeBasicStepperProps = {
  metadata: SiteBuilderIntakeMetadata;
  session: AssistantSiteBuilderIntakeSession | null;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmitStep: (stepId: AssistantSiteBuilderIntakeStepId, values: Record<string, unknown>) => void;
};

const textFromValue = (value: unknown) => (typeof value === "string" ? value : "");

const textListFromValue = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const labelMapFromValue = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
};

const getStepAnswerValues = (
  session: AssistantSiteBuilderIntakeSession | null,
  stepId: AssistantSiteBuilderIntakeStepId
) => session?.answers.find((answer) => answer.stepId === stepId)?.values ?? {};

const resolveVisibleStep = (metadata: SiteBuilderIntakeMetadata) => {
  const stepId = metadata.nextStepId ?? metadata.currentStepId;
  return metadata.steps.find((step) => step.id === stepId) ?? metadata.steps[0] ?? null;
};

const createInitialDraft = (
  step: SiteBuilderIntakeStepMetadata,
  values: Record<string, unknown>
): FieldDraft => {
  const draft: FieldDraft = {};
  for (const field of step.answerFields) {
    const value = values[field.key];
    if (field.control === "checkbox") {
      draft[field.key] = value === true;
      continue;
    }
    if (field.control === "multi_select" || field.control === "text_list") {
      draft[field.key] = textListFromValue(value);
      continue;
    }
    if (field.control === "label_map") {
      draft[field.key] = labelMapFromValue(value);
      continue;
    }
    draft[field.key] = textFromValue(value);
  }
  return draft;
};

const normalizeTextListDraft = (value: FieldDraftValue, maxItems: number | null) =>
  (Array.isArray(value) ? value : textFromValue(value).split(/\n+/u))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems ?? 12);

const normalizeLabelMapDraft = (
  value: FieldDraftValue,
  field: SiteBuilderIntakeAnswerFieldMetadata
) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const allowedIds = new Set(field.options.map((option) => option.id));
  const entries = Object.entries(value)
    .filter(([key, nested]) => allowedIds.has(key) && typeof nested === "string" && nested.trim())
    .map(([key, nested]) => [key, nested.trim()]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const buildAnswerValues = (
  step: SiteBuilderIntakeStepMetadata,
  draft: FieldDraft
): Record<string, unknown> => {
  const values: Record<string, unknown> = {};
  for (const field of step.answerFields) {
    const value = draft[field.key];
    if (field.control === "checkbox") {
      values[field.key] = value === true;
      continue;
    }
    if (field.control === "text_list") {
      const items = normalizeTextListDraft(value ?? [], field.maxItems);
      if (items.length > 0 || field.required) values[field.key] = items;
      continue;
    }
    if (field.control === "multi_select") {
      const allowedIds = new Set(field.options.map((option) => option.id));
      const selected = (Array.isArray(value) ? value : [])
        .filter((item) => allowedIds.has(item))
        .slice(0, field.maxItems ?? 12);
      if (selected.length > 0 || field.required) values[field.key] = selected;
      continue;
    }
    if (field.control === "label_map") {
      const labels = normalizeLabelMapDraft(value ?? {}, field);
      if (labels) values[field.key] = labels;
      continue;
    }
    const text = textFromValue(value).trim();
    if (text || field.required) values[field.key] = text;
  }
  return values;
};

const updateDraftValue = (
  previous: FieldDraft,
  key: string,
  updater: (value: FieldDraftValue | undefined) => FieldDraftValue
): FieldDraft => ({
  ...previous,
  [key]: updater(previous[key]),
});

const toggleStringSelection = (
  current: FieldDraftValue | undefined,
  value: string,
  checked: boolean | string
) => {
  const selected = Array.isArray(current) ? current : [];
  if (checked && !selected.includes(value)) return [...selected, value];
  if (!checked) return selected.filter((item) => item !== value);
  return selected;
};

const selectedOptionsForLabelMap = (
  step: SiteBuilderIntakeStepMetadata,
  field: SiteBuilderIntakeAnswerFieldMetadata,
  draft: FieldDraft
) => {
  const relatedMultiSelect = step.answerFields.find(
    (candidate) =>
      candidate.control === "multi_select" &&
      candidate.optionRegistryId === field.optionRegistryId &&
      Array.isArray(draft[candidate.key]) &&
      (draft[candidate.key] as string[]).length > 0
  );
  if (!relatedMultiSelect) return field.options;
  const selectedIds = new Set(draft[relatedMultiSelect.key] as string[]);
  return field.options.filter((option) => selectedIds.has(option.id));
};

function SiteBuilderIntakeFieldControl({
  step,
  field,
  draft,
  setDraft,
}: {
  step: SiteBuilderIntakeStepMetadata;
  field: SiteBuilderIntakeAnswerFieldMetadata;
  draft: FieldDraft;
  setDraft: (updater: (previous: FieldDraft) => FieldDraft) => void;
}) {
  const value = draft[field.key];
  const inputId = `site-builder-intake-${step.id}-${field.key}`;

  if (field.control === "textarea") {
    return (
      <Textarea
        id={inputId}
        value={textFromValue(value)}
        maxLength={field.maxLength ?? undefined}
        onChange={(event) =>
          setDraft((previous) => updateDraftValue(previous, field.key, () => event.target.value))
        }
      />
    );
  }

  if (field.control === "text_list") {
    return (
      <Textarea
        id={inputId}
        value={(Array.isArray(value) ? value : []).join("\n")}
        maxLength={field.maxLength ? field.maxLength * (field.maxItems ?? 8) : undefined}
        onChange={(event) =>
          setDraft((previous) =>
            updateDraftValue(previous, field.key, () =>
              event.target.value
                .split(/\n+/u)
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, field.maxItems ?? 12)
            )
          )
        }
      />
    );
  }

  if (field.control === "select") {
    return (
      <select
        id={inputId}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={textFromValue(value)}
        onChange={(event) =>
          setDraft((previous) => updateDraftValue(previous, field.key, () => event.target.value))
        }
      >
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.control === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {field.options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors",
                checked ? "border-emerald-500/60 bg-emerald-50" : "hover:bg-muted/30"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  setDraft((previous) =>
                    updateDraftValue(previous, field.key, (current) =>
                      toggleStringSelection(current, option.id, nextChecked)
                    )
                  )
                }
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (field.control === "label_map") {
    const labels = labelMapFromValue(value);
    const options = selectedOptionsForLabelMap(step, field, draft);
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <div key={option.id} className="space-y-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor={`${inputId}-${option.id}`}
            >
              {option.label}
            </label>
            <Input
              id={`${inputId}-${option.id}`}
              value={labels[option.id] ?? ""}
              maxLength={field.maxLength ?? undefined}
              onChange={(event) =>
                setDraft((previous) =>
                  updateDraftValue(previous, field.key, (current) => ({
                    ...labelMapFromValue(current),
                    [option.id]: event.target.value,
                  }))
                )
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (field.control === "checkbox") {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5">
        <Checkbox
          checked={value === true}
          onCheckedChange={(checked) =>
            setDraft((previous) => updateDraftValue(previous, field.key, () => checked === true))
          }
          className="mt-0.5"
        />
        <span className="min-w-0 text-sm text-foreground">{field.description}</span>
      </label>
    );
  }

  return (
    <Input
      id={inputId}
      value={textFromValue(value)}
      maxLength={field.maxLength ?? undefined}
      onChange={(event) =>
        setDraft((previous) => updateDraftValue(previous, field.key, () => event.target.value))
      }
    />
  );
}

function SiteBuilderIntakeBasicStepForm({
  metadata,
  step,
  session,
  isSubmitting,
  error,
  onSubmitStep,
}: SiteBuilderIntakeBasicStepperProps & {
  step: SiteBuilderIntakeStepMetadata;
}) {
  const answerValues = useMemo(() => getStepAnswerValues(session, step.id), [session, step.id]);
  const [draft, setDraft] = useState(() => createInitialDraft(step, answerValues));

  return (
    <form
      className="space-y-4 rounded-lg border bg-background px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitStep(step.id, buildAnswerValues(step, draft));
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Basic</Badge>
        <Badge variant="outline">
          Step {step.position} of {step.total}
        </Badge>
        {metadata.answeredStepIds.includes(step.id) ? (
          <Badge variant="outline">Answered</Badge>
        ) : null}
        {metadata.missingRequiredStepIds.includes(step.id) ? (
          <Badge variant="outline">Required</Badge>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">{step.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
      </div>

      <div className="space-y-3">
        {step.answerFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            {field.control !== "checkbox" ? (
              <label
                className="text-sm font-medium text-foreground"
                htmlFor={`site-builder-intake-${step.id}-${field.key}`}
              >
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </label>
            ) : null}
            <SiteBuilderIntakeFieldControl
              step={step}
              field={field}
              draft={draft}
              setDraft={setDraft}
            />
            {field.control !== "checkbox" ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Step was not accepted</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save step
      </Button>
    </form>
  );
}

export function SiteBuilderIntakeBasicStepper({
  metadata,
  session,
  isSubmitting = false,
  error = null,
  onSubmitStep,
}: SiteBuilderIntakeBasicStepperProps) {
  if (metadata.mode !== "basic") return null;
  const step = resolveVisibleStep(metadata);
  if (!step) return null;
  const stepLabels = new Map(metadata.steps.map((entry) => [entry.id, entry.label]));
  const restoredWithoutAnswers = !session && metadata.answeredStepIds.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {metadata.visibleStepIds.map((stepId) => {
          const isCurrent = step.id === stepId;
          const isAnswered = metadata.answeredStepIds.includes(stepId);
          return (
            <span
              key={stepId}
              className={cn(
                "rounded-full border px-2 py-1",
                isCurrent && "border-emerald-500 bg-emerald-50 text-emerald-900",
                isAnswered && !isCurrent && "border-primary/30 bg-primary/5 text-foreground"
              )}
            >
              {stepLabels.get(stepId) ?? stepId}
            </span>
          );
        })}
      </div>
      {restoredWithoutAnswers ? (
        <Alert>
          <AlertTitle>Guided answers were not restored</AlertTitle>
          <AlertDescription>
            Start a new guided setup before saving more steps. Previous answers are not stored in
            browser cache for security.
          </AlertDescription>
        </Alert>
      ) : (
        <SiteBuilderIntakeBasicStepForm
          key={`${step.id}:${metadata.answeredStepIds.join(",")}`}
          metadata={metadata}
          step={step}
          session={session}
          isSubmitting={isSubmitting}
          error={error}
          onSubmitStep={onSubmitStep}
        />
      )}
    </div>
  );
}
