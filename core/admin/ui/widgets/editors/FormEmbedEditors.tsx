import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

import {
  normalizeFormEmbedData,
  type FormEmbedData,
  type FormEmbedLayout,
  type FormEmbedResolvedData,
  type FormEmbedSubmitBehavior,
  type FormEmbedStyle,
} from "../../../../widgets/core/formEmbed";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader, SharedColorFieldInputs } from "./ClearableFields";
import { getFormDetailCached, type FormDetail, type FormRecord } from "@/services/formsClient";
import { useForms } from "@/ui/forms/hooks/useForms";
import { WidgetEditorSection } from "./WidgetEditorControls";

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
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
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
        {(selectedForm?.submissionAccess ?? resolved?.submissionAccess) === "internal" ? (
          <Badge variant="outline">Internal</Badge>
        ) : null}
        {layoutMode === "multi_step" ? <Badge variant="outline">Multi-step</Badge> : null}
        {saveProgress ? <Badge variant="outline">Save progress</Badge> : null}
      </div>

      {status && status !== "published" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This form is not published yet, so public runtime may show unavailable state.
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
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
      <SharedColorFieldInputs
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        pickerFallback={pickerFallback}
      />
    </div>
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
    <EditorSection title="Form selection" description="Pick the saved form to embed.">
      <Select
        value={selectedValue}
        onValueChange={(formId) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            formId: formId === NO_FORM_VALUE ? "" : formId,
          }))
        }
      >
        <SelectTrigger>
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
    <EditorSection title="Content" description="Override the title and messaging.">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
        <Input
          value={normalized.title ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Optional custom title"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
        <Textarea
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Submit label
        </label>
        <Input
          value={normalized.submitLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              submitLabel: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Success message
        </label>
        <Textarea
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
      </div>
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
    <EditorSection title="Layout" description="Control spacing and alignment.">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Alignment</label>
        <Select
          value={normalized.layout?.alignment ?? "start"}
          onValueChange={(alignment) => {
            if (!isAlignmentValue(alignment)) return;
            updateLayout(value, onChange, { alignment });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Width</label>
        <Select
          value={normalized.layout?.width ?? "md"}
          onValueChange={(width) => {
            if (!isWidthValue(width)) return;
            updateLayout(value, onChange, { width });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Spacing</label>
        <Select
          value={normalized.layout?.spacing ?? "md"}
          onValueChange={(spacing) => {
            if (!isSpacingValue(spacing)) return;
            updateLayout(value, onChange, { spacing });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Button alignment
        </label>
        <Select
          value={normalized.layout?.buttonAlignment ?? "start"}
          onValueChange={(buttonAlignment) => {
            if (!isButtonAlignmentValue(buttonAlignment)) return;
            updateLayout(value, onChange, { buttonAlignment });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Side padding
        </label>
        <Select
          value={normalized.layout?.sectionPaddingX ?? "sm"}
          onValueChange={(sectionPaddingX) => {
            if (!isSectionPaddingXValue(sectionPaddingX)) return;
            updateLayout(value, onChange, { sectionPaddingX });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Vertical padding
        </label>
        <Select
          value={normalized.layout?.sectionPaddingY ?? "md"}
          onValueChange={(sectionPaddingY) => {
            if (!isSectionPaddingYValue(sectionPaddingY)) return;
            updateLayout(value, onChange, { sectionPaddingY });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Field gap</label>
        <Select
          value={normalized.layout?.fieldGap ?? "md"}
          onValueChange={(fieldGap) => {
            if (!isFieldGapValue(fieldGap)) return;
            updateLayout(value, onChange, { fieldGap });
          }}
        >
          <SelectTrigger>
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
      </div>
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
    <EditorSection title="Field labels" description="Control label visibility and required badges.">
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Show labels</p>
          <p className="text-xs text-muted-foreground">Display field names above each input.</p>
        </div>
        <Switch
          checked={Boolean(normalized.fields?.showLabels)}
          onCheckedChange={(checked) =>
            updateFields(value, onChange, { showLabels: checked === true })
          }
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Required indicator</p>
          <p className="text-xs text-muted-foreground">Show a star for required fields.</p>
        </div>
        <Switch
          checked={Boolean(normalized.fields?.showRequiredIndicator)}
          onCheckedChange={(checked) =>
            updateFields(value, onChange, { showRequiredIndicator: checked === true })
          }
        />
      </div>
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
    <EditorSection title="Style" description="Adjust surfaces, borders, and inputs.">
      <ColorField
        label="Background"
        value={normalized.style?.background}
        onChange={(background) => updateStyle(value, onChange, { background })}
        onClear={() => clearStyleField(value, onChange, "background")}
        placeholder="transparent"
        pickerFallback="#ffffff"
      />
      <ColorField
        label="Surface"
        value={normalized.style?.surface}
        onChange={(surface) => updateStyle(value, onChange, { surface })}
        onClear={() => clearStyleField(value, onChange, "surface")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
      />
      <ColorField
        label="Border color"
        value={normalized.style?.borderColor}
        onChange={(borderColor) => updateStyle(value, onChange, { borderColor })}
        onClear={() => clearStyleField(value, onChange, "borderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#e2e8f0"
      />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Border width
        </label>
        <Select
          value={normalized.style?.borderWidth ?? "1"}
          onValueChange={(borderWidth) => {
            if (!isBorderWidthValue(borderWidth)) return;
            updateStyle(value, onChange, { borderWidth });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Radius</label>
        <Select
          value={normalized.style?.radius ?? "md"}
          onValueChange={(radius) => {
            if (!isRadiusValue(radius)) return;
            updateStyle(value, onChange, { radius });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Input size</label>
        <Select
          value={normalized.style?.inputSize ?? "md"}
          onValueChange={(inputSize) => {
            if (!isInputSizeValue(inputSize)) return;
            updateStyle(value, onChange, { inputSize });
          }}
        >
          <SelectTrigger>
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
      </div>
      <ColorField
        label="Title color"
        value={normalized.style?.titleColor}
        onChange={(titleColor) => updateStyle(value, onChange, { titleColor })}
        onClear={() => clearStyleField(value, onChange, "titleColor")}
        placeholder="var(--color-text)"
        pickerFallback="#0f172a"
      />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Title size</label>
        <Select
          value={normalized.style?.titleSize ?? "md"}
          onValueChange={(titleSize) => {
            if (!isTitleSizeValue(titleSize)) return;
            updateStyle(value, onChange, { titleSize });
          }}
        >
          <SelectTrigger>
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
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Title weight
        </label>
        <Select
          value={normalized.style?.titleWeight ?? "semibold"}
          onValueChange={(titleWeight) => {
            if (!isTitleWeightValue(titleWeight)) return;
            updateStyle(value, onChange, { titleWeight });
          }}
        >
          <SelectTrigger>
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
      </div>
      <ColorField
        label="Label color"
        value={normalized.style?.labelColor}
        onChange={(labelColor) => updateStyle(value, onChange, { labelColor })}
        onClear={() => clearStyleField(value, onChange, "labelColor")}
        placeholder="var(--color-text)"
        pickerFallback="#0f172a"
      />
      <ColorField
        label="Helper color"
        value={normalized.style?.helperColor}
        onChange={(helperColor) => updateStyle(value, onChange, { helperColor })}
        onClear={() => clearStyleField(value, onChange, "helperColor")}
        placeholder="var(--color-text)"
        pickerFallback="#64748b"
      />
      <ColorField
        label="Submit background"
        value={normalized.style?.submitBackground}
        onChange={(submitBackground) => updateStyle(value, onChange, { submitBackground })}
        onClear={() => clearStyleField(value, onChange, "submitBackground")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
      />
      <ColorField
        label="Submit text color"
        value={normalized.style?.submitTextColor}
        onChange={(submitTextColor) => updateStyle(value, onChange, { submitTextColor })}
        onClear={() => clearStyleField(value, onChange, "submitTextColor")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
      />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Heading level
        </label>
        <Select
          value={normalized.layout?.headingLevel ?? "2"}
          onValueChange={(headingLevel) => {
            if (!isHeadingLevelValue(headingLevel)) return;
            updateLayout(value, onChange, { headingLevel });
          }}
        >
          <SelectTrigger>
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
      </div>
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
      title="Multi-step navigation"
      description="Controls shown only when the selected form resolves as multi-step."
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Back label</label>
        <Input
          value={normalized.navigation?.backLabel ?? ""}
          onChange={(event) => updateNavigation(value, onChange, { backLabel: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Next label</label>
        <Input
          value={normalized.navigation?.nextLabel ?? ""}
          onChange={(event) => updateNavigation(value, onChange, { nextLabel: event.target.value })}
        />
      </div>
      {showProgressToggle ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Show progress</p>
            <p className="text-xs text-muted-foreground">
              Renders current step and progress bar when multi-step is active.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.navigation?.showProgress)}
            onCheckedChange={(checked) =>
              updateNavigation(value, onChange, { showProgress: checked === true })
            }
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Saved progress TTL (days)
        </label>
        <Input
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
      </div>
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
      title="Submit behavior"
      description="Loading copy and post-submit behavior for public runtime."
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Loading label
        </label>
        <Input
          value={normalized.submitBehavior?.loadingLabel ?? ""}
          onChange={(event) =>
            updateSubmitBehavior(value, onChange, { loadingLabel: event.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Success behavior
        </label>
        <Select
          value={normalized.submitBehavior?.successBehavior ?? "show-message-hide-form"}
          onValueChange={(successBehavior) => {
            if (!isSuccessBehaviorValue(successBehavior)) return;
            updateSubmitBehavior(value, onChange, { successBehavior });
          }}
        >
          <SelectTrigger>
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
      </div>
    </EditorSection>
  );
}

function DiagnosticsSnapshot({ value }: { value: FormEmbedData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function FormEmbedWizardEditorBody({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);

  return (
    <div className="space-y-4">
      <FormSelection value={value} onChange={onChange} />
      <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={status} />
      <ContentSection value={value} onChange={onChange} />
      <LayoutSection value={value} onChange={onChange} />
      <FieldsSection value={value} onChange={onChange} />
    </div>
  );
}

function FormEmbedVisualEditorBody({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);

  return (
    <div className="space-y-4">
      <FormSelection value={value} onChange={onChange} />
      <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={status} />
      <LayoutSection value={value} onChange={onChange} />
      <FieldsSection value={value} onChange={onChange} />
      <StyleSection value={value} onChange={onChange} />
      <NavigationSection value={value} onChange={onChange} />
      <SubmitBehaviorSection value={value} onChange={onChange} />
    </div>
  );
}

function FormEmbedAdvancedEditorBody({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  const { items: forms } = useForms();
  const normalized = normalizeValue(value);
  const { detail, status } = useSelectedFormDetail(normalized.formId);
  const selectedForm = useMemo(
    () =>
      forms.find((form) => form.id === (normalized.formId?.trim() ?? "")) ?? detail?.form ?? null,
    [detail?.form, forms, normalized.formId]
  );

  return (
    <div className="space-y-4">
      <FormSelection value={value} onChange={onChange} />
      <EditorSection
        title="Diagnostics"
        description="Technical runtime and selection state for QA and implementation checks."
      >
        <FormDiagnostics value={value} forms={forms} detail={detail} detailStatus={status} />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Selected form id: {normalized.formId?.trim() || "none"}</p>
          <p>Detail cache status: {status}</p>
          <p>
            Submission access:{" "}
            {selectedForm?.submissionAccess ?? normalized.resolved?.submissionAccess ?? "unknown"}
          </p>
          <p>Resolver error: {normalized.resolved?.error ?? "none"}</p>
          <p>Nonce projected: {normalized.resolved?.submissionNonce ? "yes" : "no"}</p>
          <p>
            Captcha site key projected: {normalized.resolved?.botProtection?.siteKey ? "yes" : "no"}
          </p>
        </div>
      </EditorSection>
      <EditorSection
        title="Normalized payload snapshot"
        description="Read-only current normalized payload for runtime/debug verification."
      >
        <DiagnosticsSnapshot value={normalized} />
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
