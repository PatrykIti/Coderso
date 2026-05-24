import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  normalizeFormEmbedData,
  type FormEmbedData,
  type FormEmbedLayout,
  type FormEmbedResolvedData,
  type FormEmbedSubmitBehavior,
  type FormEmbedStyle,
} from "../../../../widgets/core/formEmbed";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { hasClearableFieldValue, SharedColorFieldInputs } from "./ClearableFields";
import { getFormDetailCached, type FormDetail, type FormRecord } from "@/services/formsClient";
import { useForms } from "@/ui/forms/hooks/useForms";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const alignmentOptions = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
] as const;

const widthOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
] as const;

const spacingOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
] as const;

const borderWidthOptions = [
  { id: "0", label: "None" },
  { id: "1", label: "Thin" },
  { id: "2", label: "Thick" },
] as const;

const radiusOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

const inputSizeOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

const sectionPaddingXOptions = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Wide" },
] as const;

const sectionPaddingYOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
] as const;

const fieldGapOptions = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
] as const;

const headingLevelOptions = [
  { id: "2", label: "H2" },
  { id: "3", label: "H3" },
  { id: "4", label: "H4" },
] as const;

const titleSizeOptions = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

const titleWeightOptions = [
  { id: "medium", label: "Medium" },
  { id: "semibold", label: "Semibold" },
  { id: "bold", label: "Bold" },
] as const;

const successBehaviorOptions = [
  { id: "show-message-hide-form", label: "Hide form" },
  { id: "show-message-reset-form", label: "Reset form" },
  { id: "show-message-keep-form", label: "Keep form" },
] as const;

const NO_FORM_VALUE = "__no_form__";

type AlignmentValue = NonNullable<FormEmbedLayout["alignment"]>;
type WidthValue = NonNullable<FormEmbedLayout["width"]>;
type SpacingValue = NonNullable<FormEmbedLayout["spacing"]>;
type ButtonAlignmentValue = NonNullable<FormEmbedLayout["buttonAlignment"]>;
type SectionPaddingXValue = NonNullable<FormEmbedLayout["sectionPaddingX"]>;
type SectionPaddingYValue = NonNullable<FormEmbedLayout["sectionPaddingY"]>;
type FieldGapValue = NonNullable<FormEmbedLayout["fieldGap"]>;
type HeadingLevelValue = NonNullable<FormEmbedLayout["headingLevel"]>;
type BorderWidthValue = NonNullable<FormEmbedStyle["borderWidth"]>;
type RadiusValue = NonNullable<FormEmbedStyle["radius"]>;
type InputSizeValue = NonNullable<FormEmbedStyle["inputSize"]>;
type TitleSizeValue = NonNullable<FormEmbedStyle["titleSize"]>;
type TitleWeightValue = NonNullable<FormEmbedStyle["titleWeight"]>;
type SuccessBehaviorValue = NonNullable<FormEmbedSubmitBehavior["successBehavior"]>;

const isAlignmentValue = (value: string): value is AlignmentValue =>
  alignmentOptions.some((option) => option.id === value);

const isWidthValue = (value: string): value is WidthValue =>
  widthOptions.some((option) => option.id === value);

const isSpacingValue = (value: string): value is SpacingValue =>
  spacingOptions.some((option) => option.id === value);

const isButtonAlignmentValue = (value: string): value is ButtonAlignmentValue =>
  isAlignmentValue(value);

const isSectionPaddingXValue = (value: string): value is SectionPaddingXValue =>
  sectionPaddingXOptions.some((option) => option.id === value);

const isSectionPaddingYValue = (value: string): value is SectionPaddingYValue =>
  sectionPaddingYOptions.some((option) => option.id === value);

const isFieldGapValue = (value: string): value is FieldGapValue =>
  fieldGapOptions.some((option) => option.id === value);

const isHeadingLevelValue = (value: string): value is HeadingLevelValue =>
  headingLevelOptions.some((option) => option.id === value);

const isBorderWidthValue = (value: string): value is BorderWidthValue =>
  borderWidthOptions.some((option) => option.id === value);

const isRadiusValue = (value: string): value is RadiusValue =>
  radiusOptions.some((option) => option.id === value);

const isInputSizeValue = (value: string): value is InputSizeValue =>
  inputSizeOptions.some((option) => option.id === value);

const isTitleSizeValue = (value: string): value is TitleSizeValue =>
  titleSizeOptions.some((option) => option.id === value);

const isTitleWeightValue = (value: string): value is TitleWeightValue =>
  titleWeightOptions.some((option) => option.id === value);

const isSuccessBehaviorValue = (value: string): value is SuccessBehaviorValue =>
  successBehaviorOptions.some((option) => option.id === value);

function normalizeValue(value: FormEmbedData): FormEmbedData {
  return normalizeFormEmbedData(value);
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: EditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function updateValue(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  updater: (current: FormEmbedData) => FormEmbedData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateLayout(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["layout"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateStyle(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function clearStyleField(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  key: keyof NonNullable<FormEmbedData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function updateFields(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["fields"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fields: {
      ...current.fields,
      ...patch,
    },
  }));
}

function updateNavigation(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["navigation"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    navigation: {
      ...current.navigation,
      ...patch,
    },
  }));
}

function updateSubmitBehavior(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["submitBehavior"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    submitBehavior: {
      ...current.submitBehavior,
      ...patch,
    },
  }));
}

function normalizeFieldTypes(detail: FormDetail | null, resolved?: FormEmbedResolvedData) {
  const fields = detail?.fields ?? resolved?.fields ?? [];
  return Array.from(new Set(fields.map((field) => field.type).filter(Boolean))).sort();
}

function useSelectedFormDetail(formId: string | undefined) {
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const normalizedFormId = formId?.trim() ?? "";

  useEffect(() => {
    let active = true;
    if (!normalizedFormId) {
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (active) {
        setStatus("loading");
      }
    });
    getFormDetailCached(normalizedFormId, { force: true })
      .then((next) => {
        if (!active) return;
        setDetail(next ?? null);
        setStatus(next ? "loaded" : "error");
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [normalizedFormId]);

  return {
    detail: normalizedFormId ? detail : null,
    status: normalizedFormId ? status : "idle",
  };
}

function FormDiagnostics({
  value,
  forms,
  detail,
  detailStatus,
}: {
  value: FormEmbedData;
  forms: FormRecord[];
  detail: FormDetail | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
}) {
  const normalized = normalizeValue(value);
  const normalizedFormId = normalized.formId?.trim() ?? "";
  const selectedForm = forms.find((form) => form.id === normalizedFormId) ?? detail?.form ?? null;
  const resolved = normalized.resolved;
  const fieldTypes = normalizeFieldTypes(detail, resolved);
  const fieldCount = detail?.fields.length ?? resolved?.fields?.length ?? 0;
  const layoutMode =
    selectedForm?.settings.layoutMode ?? resolved?.settings?.layoutMode ?? "single";
  const saveProgress =
    selectedForm?.settings.saveProgress ?? resolved?.settings?.saveProgress ?? false;
  const isMissingSelected = normalizedFormId.length > 0 && !selectedForm;
  const status = selectedForm?.status ?? resolved?.status ?? null;
  const resolvedError = resolved?.error ?? null;
  const submissionAccess = selectedForm?.submissionAccess ?? resolved?.submissionAccess ?? null;

  if (!normalizedFormId) {
    return (
      <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
        Please select a form to preview field coverage, runtime status, and submit behavior.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">
          {selectedForm?.name ?? resolved?.formName ?? normalizedFormId}
        </p>
        {status ? (
          <Badge variant={status === "published" ? "default" : "outline"}>{status}</Badge>
        ) : null}
        {submissionAccess === "internal" ? <Badge variant="outline">Internal</Badge> : null}
        {layoutMode === "multi_step" ? <Badge variant="outline">Multi-step</Badge> : null}
        {saveProgress ? <Badge variant="outline">Save progress</Badge> : null}
      </div>

      {status && status !== "published" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This form is not published yet, so public runtime may show unavailable state.
        </div>
      ) : null}

      {submissionAccess === "internal" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Internal submissions require an authenticated admin session or an API key with the
          <span className="font-semibold"> forms.submit </span>scope. Avoid embedding this form on
          public pages.
        </div>
      ) : null}

      {resolvedError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          Runtime resolver reports: {resolvedError}
        </div>
      ) : null}

      {isMissingSelected ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Saved `formId` no longer resolves in the current admin list.
        </div>
      ) : null}

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Field count:{" "}
          {detailStatus === "loading"
            ? "Loading..."
            : fieldCount > 0
              ? String(fieldCount)
              : "No fields yet"}
        </p>
        <p>
          Field types:{" "}
          {fieldTypes.length > 0
            ? fieldTypes.join(", ")
            : detailStatus === "loading"
              ? "Loading..."
              : "None"}
        </p>
      </div>
    </div>
  );
}

function NormalizationHints({ value }: { value: FormEmbedData }) {
  const rawSubmitLabel = typeof value.submitLabel === "string" ? value.submitLabel : undefined;
  const rawSuccessMessage =
    typeof value.successMessage === "string" ? value.successMessage : undefined;
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {rawSubmitLabel !== undefined && rawSubmitLabel.trim().length === 0 ? (
        <p>Empty submit label falls back to: {normalized.submitLabel}</p>
      ) : null}
      {rawSuccessMessage !== undefined && rawSuccessMessage.trim().length === 0 ? (
        <p>
          Empty success message falls back to:{" "}
          {normalized.successMessage?.trim().length
            ? normalized.successMessage
            : "no inline success copy"}
        </p>
      ) : null}
    </div>
  );
}

function ColorField({
  id,
  label,
  path,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  id: string;
  label: string;
  path: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  const handleClear = () => {
    if (!onClear) return;
    const previousValue = typeof value === "string" && value.trim().length > 0 ? value : undefined;
    onClear();
    if (previousValue) {
      toast.info(`${label} cleared.`, {
        action: {
          label: "Undo",
          onClick: () => onChange(previousValue),
        },
      });
      return;
    }
    toast.info(`${label} cleared.`);
  };

  return (
    <WidgetControlRow
      id={id}
      label={label}
      path={path}
      actions={
        onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!hasClearableFieldValue(value)}
          >
            Clear
          </Button>
        ) : undefined
      }
    >
      {(fieldProps) => (
        <SharedColorFieldInputs
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          pickerFallback={pickerFallback}
          inputId={fieldProps.id}
          ariaLabelledby={fieldProps["aria-labelledby"]}
          ariaDescribedby={fieldProps["aria-describedby"]}
        />
      )}
    </WidgetControlRow>
  );
}

function FormSelection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const { items: forms, isLoading } = useForms();
  const normalized = normalizeValue(value);
  const normalizedFormId = normalized.formId?.trim() ?? "";
  const selectedForm = forms.find((form) => form.id === normalizedFormId) ?? null;
  const selectedValue = selectedForm ? selectedForm.id : NO_FORM_VALUE;
  const isInternal = selectedForm?.submissionAccess === "internal";

  return (
    <EditorSection
      id="form-embed.wizard.form-selection"
      mode="wizard"
      role="setup"
      title="Form selection"
      description="Pick the saved form to embed."
    >
      <WidgetControlRow id="form-embed.form-id" label="Saved form" path="formId">
        {(fieldProps) => (
          <Select
            value={selectedValue}
            onValueChange={(formId) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                formId: formId === NO_FORM_VALUE ? "" : formId,
              }))
            }
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder={isLoading ? "Loading forms..." : "Select form"} />
            </SelectTrigger>
            <SelectContent>
              {selectedValue === NO_FORM_VALUE ? (
                <SelectItem value={NO_FORM_VALUE} disabled>
                  {forms.length === 0
                    ? isLoading
                      ? "Loading forms..."
                      : "No forms found"
                    : "Select form"}
                </SelectItem>
              ) : null}
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  <div className="flex items-center gap-2">
                    <span>{form.name}</span>
                    <Badge variant={form.status === "published" ? "default" : "outline"}>
                      {form.status}
                    </Badge>
                    {form.submissionAccess === "internal" ? (
                      <Badge variant="outline">Internal</Badge>
                    ) : null}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      {isInternal ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Internal submissions require an authenticated admin session or an API key with the
          <span className="font-semibold"> forms.submit </span>scope. Avoid embedding this form on
          public pages.
        </div>
      ) : null}
    </EditorSection>
  );
}

function ContentSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.content"
      mode="visual"
      role="content"
      title="Content"
      description="Override the title and messaging."
    >
      <WidgetControlRow id="form-embed.title" label="Title" path="title">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.title ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Optional custom title"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.description" label="Description" path="description">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            rows={3}
            value={normalized.description ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Optional description text"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.submit-label" label="Submit label" path="submitLabel">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.submitLabel ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                submitLabel: event.target.value,
              }))
            }
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.success-message"
        label="Success message"
        path="successMessage"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            rows={2}
            value={normalized.successMessage ?? ""}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                successMessage: event.target.value,
              }))
            }
            placeholder="Leave blank to use form fallback"
          />
        )}
      </WidgetControlRow>
      <NormalizationHints value={value} />
    </EditorSection>
  );
}

function LayoutSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.layout"
      mode="visual"
      role="layout"
      title="Layout"
      description="Control spacing and alignment."
    >
      <WidgetControlRow id="form-embed.layout-alignment" label="Alignment" path="layout.alignment">
        {(fieldProps) => (
          <Select
            value={normalized.layout?.alignment ?? "start"}
            onValueChange={(alignment) => {
              if (!isAlignmentValue(alignment)) return;
              updateLayout(value, onChange, { alignment });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.layout-width" label="Width" path="layout.width">
        {(fieldProps) => (
          <Select
            value={normalized.layout?.width ?? "md"}
            onValueChange={(width) => {
              if (!isWidthValue(width)) return;
              updateLayout(value, onChange, { width });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Width" />
            </SelectTrigger>
            <SelectContent>
              {widthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.layout-spacing" label="Spacing" path="layout.spacing">
        {(fieldProps) => (
          <Select
            value={normalized.layout?.spacing ?? "md"}
            onValueChange={(spacing) => {
              if (!isSpacingValue(spacing)) return;
              updateLayout(value, onChange, { spacing });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.button-alignment"
        label="Button alignment"
        path="layout.buttonAlignment"
      >
        {(fieldProps) => (
          <Select
            value={normalized.layout?.buttonAlignment ?? "start"}
            onValueChange={(buttonAlignment) => {
              if (!isButtonAlignmentValue(buttonAlignment)) return;
              updateLayout(value, onChange, { buttonAlignment });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Button alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.section-padding-x"
        label="Side padding"
        path="layout.sectionPaddingX"
      >
        {(fieldProps) => (
          <Select
            value={normalized.layout?.sectionPaddingX ?? "sm"}
            onValueChange={(sectionPaddingX) => {
              if (!isSectionPaddingXValue(sectionPaddingX)) return;
              updateLayout(value, onChange, { sectionPaddingX });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Side padding" />
            </SelectTrigger>
            <SelectContent>
              {sectionPaddingXOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.section-padding-y"
        label="Vertical padding"
        path="layout.sectionPaddingY"
      >
        {(fieldProps) => (
          <Select
            value={normalized.layout?.sectionPaddingY ?? "md"}
            onValueChange={(sectionPaddingY) => {
              if (!isSectionPaddingYValue(sectionPaddingY)) return;
              updateLayout(value, onChange, { sectionPaddingY });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Vertical padding" />
            </SelectTrigger>
            <SelectContent>
              {sectionPaddingYOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.field-gap" label="Field gap" path="layout.fieldGap">
        {(fieldProps) => (
          <Select
            value={normalized.layout?.fieldGap ?? "md"}
            onValueChange={(fieldGap) => {
              if (!isFieldGapValue(fieldGap)) return;
              updateLayout(value, onChange, { fieldGap });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Field gap" />
            </SelectTrigger>
            <SelectContent>
              {fieldGapOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function FieldsSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.field-labels"
      mode="visual"
      role="content"
      title="Field labels"
      description="Control label visibility and required badges."
    >
      <WidgetControlRow
        id="form-embed.show-labels"
        label="Show labels"
        path="fields.showLabels"
        className="rounded-lg border bg-muted/20 p-3"
      >
        {(fieldProps) => (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Display field names above each input.</p>
            </div>
            <Switch
              {...fieldProps}
              checked={Boolean(normalized.fields?.showLabels)}
              onCheckedChange={(checked) =>
                updateFields(value, onChange, { showLabels: checked === true })
              }
            />
          </div>
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.required-indicator"
        label="Required indicator"
        path="fields.showRequiredIndicator"
        className="rounded-lg border bg-muted/20 p-3"
      >
        {(fieldProps) => (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Show a star for required fields.</p>
            </div>
            <Switch
              {...fieldProps}
              checked={Boolean(normalized.fields?.showRequiredIndicator)}
              onCheckedChange={(checked) =>
                updateFields(value, onChange, { showRequiredIndicator: checked === true })
              }
            />
          </div>
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function StyleSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.style"
      mode="visual"
      role="visual"
      title="Style"
      description="Adjust surfaces, borders, and inputs."
    >
      <ColorField
        id="form-embed.style-background"
        label="Background"
        path="style.background"
        value={normalized.style?.background}
        onChange={(background) => updateStyle(value, onChange, { background })}
        onClear={() => clearStyleField(value, onChange, "background")}
        placeholder="transparent"
        pickerFallback="#ffffff"
      />
      <ColorField
        id="form-embed.style-surface"
        label="Surface"
        path="style.surface"
        value={normalized.style?.surface}
        onChange={(surface) => updateStyle(value, onChange, { surface })}
        onClear={() => clearStyleField(value, onChange, "surface")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
      />
      <ColorField
        id="form-embed.style-border-color"
        label="Border color"
        path="style.borderColor"
        value={normalized.style?.borderColor}
        onChange={(borderColor) => updateStyle(value, onChange, { borderColor })}
        onClear={() => clearStyleField(value, onChange, "borderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#e2e8f0"
      />
      <WidgetControlRow
        id="form-embed.style-border-width"
        label="Border width"
        path="style.borderWidth"
      >
        {(fieldProps) => (
          <Select
            value={normalized.style?.borderWidth ?? "1"}
            onValueChange={(borderWidth) => {
              if (!isBorderWidthValue(borderWidth)) return;
              updateStyle(value, onChange, { borderWidth });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Border width" />
            </SelectTrigger>
            <SelectContent>
              {borderWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.style-radius" label="Radius" path="style.radius">
        {(fieldProps) => (
          <Select
            value={normalized.style?.radius ?? "md"}
            onValueChange={(radius) => {
              if (!isRadiusValue(radius)) return;
              updateStyle(value, onChange, { radius });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.style-input-size" label="Input size" path="style.inputSize">
        {(fieldProps) => (
          <Select
            value={normalized.style?.inputSize ?? "md"}
            onValueChange={(inputSize) => {
              if (!isInputSizeValue(inputSize)) return;
              updateStyle(value, onChange, { inputSize });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Input size" />
            </SelectTrigger>
            <SelectContent>
              {inputSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <ColorField
        id="form-embed.style-title-color"
        label="Title color"
        path="style.titleColor"
        value={normalized.style?.titleColor}
        onChange={(titleColor) => updateStyle(value, onChange, { titleColor })}
        onClear={() => clearStyleField(value, onChange, "titleColor")}
        placeholder="var(--color-text)"
        pickerFallback="#0f172a"
      />
      <WidgetControlRow id="form-embed.style-title-size" label="Title size" path="style.titleSize">
        {(fieldProps) => (
          <Select
            value={normalized.style?.titleSize ?? "md"}
            onValueChange={(titleSize) => {
              if (!isTitleSizeValue(titleSize)) return;
              updateStyle(value, onChange, { titleSize });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Title size" />
            </SelectTrigger>
            <SelectContent>
              {titleSizeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.style-title-weight"
        label="Title weight"
        path="style.titleWeight"
      >
        {(fieldProps) => (
          <Select
            value={normalized.style?.titleWeight ?? "semibold"}
            onValueChange={(titleWeight) => {
              if (!isTitleWeightValue(titleWeight)) return;
              updateStyle(value, onChange, { titleWeight });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Title weight" />
            </SelectTrigger>
            <SelectContent>
              {titleWeightOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <ColorField
        id="form-embed.style-label-color"
        label="Label color"
        path="style.labelColor"
        value={normalized.style?.labelColor}
        onChange={(labelColor) => updateStyle(value, onChange, { labelColor })}
        onClear={() => clearStyleField(value, onChange, "labelColor")}
        placeholder="var(--color-text)"
        pickerFallback="#0f172a"
      />
      <ColorField
        id="form-embed.style-helper-color"
        label="Helper color"
        path="style.helperColor"
        value={normalized.style?.helperColor}
        onChange={(helperColor) => updateStyle(value, onChange, { helperColor })}
        onClear={() => clearStyleField(value, onChange, "helperColor")}
        placeholder="var(--color-text)"
        pickerFallback="#64748b"
      />
      <ColorField
        id="form-embed.style-submit-background"
        label="Submit background"
        path="style.submitBackground"
        value={normalized.style?.submitBackground}
        onChange={(submitBackground) => updateStyle(value, onChange, { submitBackground })}
        onClear={() => clearStyleField(value, onChange, "submitBackground")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
      />
      <ColorField
        id="form-embed.style-submit-text-color"
        label="Submit text color"
        path="style.submitTextColor"
        value={normalized.style?.submitTextColor}
        onChange={(submitTextColor) => updateStyle(value, onChange, { submitTextColor })}
        onClear={() => clearStyleField(value, onChange, "submitTextColor")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
      />
      <WidgetControlRow
        id="form-embed.heading-level"
        label="Heading level"
        path="layout.headingLevel"
      >
        {(fieldProps) => (
          <Select
            value={normalized.layout?.headingLevel ?? "2"}
            onValueChange={(headingLevel) => {
              if (!isHeadingLevelValue(headingLevel)) return;
              updateLayout(value, onChange, { headingLevel });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Heading level" />
            </SelectTrigger>
            <SelectContent>
              {headingLevelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function NavigationSection({
  value,
  onChange,
  showProgressToggle = true,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
  showProgressToggle?: boolean;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.navigation"
      mode="visual"
      role="visual"
      title="Multi-step navigation"
      description="Controls shown only when the selected form resolves as multi-step."
    >
      <WidgetControlRow id="form-embed.back-label" label="Back label" path="navigation.backLabel">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.navigation?.backLabel ?? ""}
            onChange={(event) =>
              updateNavigation(value, onChange, { backLabel: event.target.value })
            }
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id="form-embed.next-label" label="Next label" path="navigation.nextLabel">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.navigation?.nextLabel ?? ""}
            onChange={(event) =>
              updateNavigation(value, onChange, { nextLabel: event.target.value })
            }
          />
        )}
      </WidgetControlRow>
      {showProgressToggle ? (
        <WidgetControlRow
          id="form-embed.show-progress"
          label="Show progress"
          path="navigation.showProgress"
          className="rounded-lg border bg-muted/20 p-3"
        >
          {(fieldProps) => (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Renders current step and progress bar when multi-step is active.
              </p>
              <Switch
                {...fieldProps}
                checked={Boolean(normalized.navigation?.showProgress)}
                onCheckedChange={(checked) =>
                  updateNavigation(value, onChange, { showProgress: checked === true })
                }
              />
            </div>
          )}
        </WidgetControlRow>
      ) : null}
      <WidgetControlRow
        id="form-embed.saved-progress-ttl"
        label="Saved progress TTL (days)"
        path="navigation.savedProgressTtlDays"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="number"
            min={1}
            max={30}
            value={String(normalized.navigation?.savedProgressTtlDays ?? 7)}
            onChange={(event) =>
              updateNavigation(value, onChange, {
                savedProgressTtlDays: Number.parseInt(event.target.value || "7", 10) || 7,
              })
            }
          />
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function SubmitBehaviorSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection
      id="form-embed.visual.submit-behavior"
      mode="visual"
      role="visual"
      title="Submit behavior"
      description="Loading copy and post-submit behavior for public runtime."
    >
      <WidgetControlRow
        id="form-embed.loading-label"
        label="Loading label"
        path="submitBehavior.loadingLabel"
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={normalized.submitBehavior?.loadingLabel ?? ""}
            onChange={(event) =>
              updateSubmitBehavior(value, onChange, { loadingLabel: event.target.value })
            }
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id="form-embed.success-behavior"
        label="Success behavior"
        path="submitBehavior.successBehavior"
      >
        {(fieldProps) => (
          <Select
            value={normalized.submitBehavior?.successBehavior ?? "show-message-hide-form"}
            onValueChange={(successBehavior) => {
              if (!isSuccessBehaviorValue(successBehavior)) return;
              updateSubmitBehavior(value, onChange, { successBehavior });
            }}
          >
            <SelectTrigger {...fieldProps}>
              <SelectValue placeholder="Success behavior" />
            </SelectTrigger>
            <SelectContent>
              {successBehaviorOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
    </EditorSection>
  );
}

function redactDiagnosticsPayload(value: FormEmbedData): FormEmbedData {
  const normalized = normalizeValue(value);
  const resolved = normalized.resolved
    ? {
        ...normalized.resolved,
        submissionNonce: normalized.resolved.submissionNonce ? "[redacted]" : undefined,
        botProtection: normalized.resolved.botProtection
          ? {
              ...normalized.resolved.botProtection,
              siteKey: normalized.resolved.botProtection.siteKey
                ? "[public site key configured]"
                : undefined,
            }
          : undefined,
      }
    : undefined;

  return {
    ...normalized,
    ...(resolved ? { resolved } : {}),
  };
}

function DiagnosticsSnapshot({ value }: { value: FormEmbedData }) {
  const redacted = redactDiagnosticsPayload(value);
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(redacted, null, 2)}
    </pre>
  );
}

function SetupDiagnosticsSection({
  value,
  forms,
  detail,
  detailStatus,
}: {
  value: FormEmbedData;
  forms: FormRecord[];
  detail: FormDetail | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
}) {
  return (
    <EditorSection
      id="form-embed.wizard.setup-diagnostics"
      mode="wizard"
      role="diagnostics"
      title="Setup diagnostics"
      description="Read-only setup status for the selected form."
    >
      <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={detailStatus} />
    </EditorSection>
  );
}

function VisualFormStatusSection({
  value,
  forms,
  detail,
  detailStatus,
}: {
  value: FormEmbedData;
  forms: FormRecord[];
  detail: FormDetail | null;
  detailStatus: "idle" | "loading" | "loaded" | "error";
}) {
  return (
    <EditorSection
      id="form-embed.visual.form-status"
      mode="visual"
      role="diagnostics"
      title="Selected form"
      description="Read-only runtime status for the form selected in Wizard."
    >
      <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={detailStatus} />
    </EditorSection>
  );
}

function FormEmbedWizardEditorBody({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);

  return (
    <div className="space-y-4">
      <FormSelection value={value} onChange={onChange} />
      <SetupDiagnosticsSection value={value} forms={forms} detail={detail} detailStatus={status} />
    </div>
  );
}

function FormEmbedVisualEditorBody({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);

  return (
    <div className="space-y-4">
      <VisualFormStatusSection value={value} forms={forms} detail={detail} detailStatus={status} />
      <ContentSection value={value} onChange={onChange} />
      <LayoutSection value={value} onChange={onChange} />
      <FieldsSection value={value} onChange={onChange} />
      <StyleSection value={value} onChange={onChange} />
      <NavigationSection value={value} onChange={onChange} />
      <SubmitBehaviorSection value={value} onChange={onChange} />
    </div>
  );
}

function FormEmbedAdvancedEditorBody({ value }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);
  const selectedForm = useMemo(
    () =>
      forms.find((form) => form.id === (normalized.formId?.trim() ?? "")) ?? detail?.form ?? null,
    [detail?.form, forms, normalized.formId]
  );
  const fieldTypes = normalizeFieldTypes(detail, normalized.resolved);
  const fieldCount = detail?.fields.length ?? normalized.resolved?.fields?.length ?? 0;
  const layoutMode =
    selectedForm?.settings.layoutMode ?? normalized.resolved?.settings?.layoutMode ?? "single";
  const saveProgress =
    selectedForm?.settings.saveProgress ?? normalized.resolved?.settings?.saveProgress ?? false;
  const submissionAccess =
    selectedForm?.submissionAccess ?? normalized.resolved?.submissionAccess ?? "unknown";

  return (
    <div className="space-y-4">
      <EditorSection
        id="form-embed.advanced.runtime-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Runtime diagnostics"
        description="Read-only runtime and selection state for QA and implementation checks."
      >
        <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={status} />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.form-id"
          label="Selected form id"
          path="formId"
          value={normalized.formId?.trim() || "none"}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.detail-cache-status"
          label="Detail cache status"
          value={status}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.field-count"
          label="Field count"
          path="resolved.fields"
          value={fieldCount > 0 ? String(fieldCount) : "No fields yet"}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.field-types"
          label="Field types"
          path="resolved.fields"
          value={fieldTypes.length > 0 ? fieldTypes.join(", ") : "None"}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.layout-mode"
          label="Layout mode"
          path="resolved.settings.layoutMode"
          value={layoutMode}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.save-progress"
          label="Save progress"
          path="resolved.settings.saveProgress"
          value={saveProgress ? "enabled" : "disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.resolver-error"
          label="Resolver error"
          path="resolved.error"
          value={normalized.resolved?.error ?? "none"}
        />
      </EditorSection>
      <EditorSection
        id="form-embed.advanced.submission-security"
        mode="advanced"
        role="diagnostics"
        title="Submission security"
        description="Read-only public write safeguards. Secret values and nonce strings stay hidden."
      >
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.submission-endpoint"
          label="Submission endpoint"
          value={
            normalized.formId?.trim()
              ? `/forms/${normalized.formId.trim()}/submissions`
              : "Not configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.submission-access"
          label="Submission access"
          path="resolved.submissionAccess"
          value={submissionAccess}
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.nonce-policy"
          label="Nonce policy"
          path="resolved.submissionNonce"
          value={
            normalized.resolved?.submissionNonce
              ? "public runtime nonce projected; raw value redacted"
              : "not projected"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.captcha-policy"
          label="Bot protection"
          path="resolved.botProtection"
          value={
            normalized.resolved?.botProtection
              ? `${normalized.resolved.botProtection.provider} configured; public key redacted`
              : "not configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.success-behavior"
          label="Success behavior"
          path="submitBehavior.successBehavior"
          value={normalized.submitBehavior?.successBehavior ?? "show-message-hide-form"}
        />
      </EditorSection>
      <EditorSection
        id="form-embed.advanced.payload-snapshot"
        mode="advanced"
        role="technical"
        title="Normalized payload snapshot"
        description="Read-only normalized payload with raw nonce and public key values redacted."
      >
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
      <EditorSection
        id="form-embed.advanced.contract-summary"
        mode="advanced"
        role="summary"
        title="Contract summary"
        description="Mode ownership for this widget."
      >
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.contract-wizard"
          label="Wizard owns"
          value="Form selection and first-time setup diagnostics."
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.contract-visual"
          label="Visual owns"
          value="Public copy, layout, field-label visibility, style, navigation, and submit behavior."
        />
        <ReadonlyWidgetSummaryRow
          id="form-embed.advanced.contract-advanced"
          label="Advanced owns"
          value="Read-only runtime, security, payload, and contract diagnostics."
        />
      </EditorSection>
    </div>
  );
}

export function FormEmbedWizardEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedWizardEditorBody {...props} />;
}

export function FormEmbedVisualEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedVisualEditorBody {...props} />;
}

export function FormEmbedAdvancedEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedAdvancedEditorBody {...props} />;
}
