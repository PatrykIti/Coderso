import { type ReactNode, useEffect, useState } from "react";

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
import { cn } from "@/lib/utils";
import { getFormDetailCached, type FormDetail } from "@/services/formsClient";
import { useForms } from "@/ui/forms/hooks/useForms";

import {
  buildContactMapEmbedUrl,
  buildContactSocialHref,
  contactDefaults,
  contactDetailOptions,
  contactFieldOptions,
  contactRuntimeFieldTypeMap,
  getContactMapUrlState,
  normalizeContactData,
  readContactMapLocation,
  readContactSocialProfile,
  resolveContactVariant,
  type ContactBorderWidth,
  type ContactColumns,
  type ContactData,
  type ContactDetailKey,
  type ContactFieldAutocomplete,
  type ContactFieldId,
  type ContactFieldLayout,
  type ContactFieldSpan,
  type ContactIconKey,
  type ContactMapHeight,
  type ContactMaxWidth,
  type ContactPaddingX,
  type ContactSocialPlatform,
  type ContactSpacing,
  type ContactVariantId,
} from "../../../../widgets/core/contact";
import type {
  WidgetEditorProps,
  WidgetEditorSectionRole,
  WidgetEditorMode,
} from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const fieldLabels: Record<ContactFieldId, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  message: "Message",
};

const detailLabels: Record<ContactDetailKey, string> = {
  phone: "Phone",
  email: "Email",
  address: "Address",
  hours: "Hours",
};

const iconOptions: Array<{ id: ContactIconKey; label: string }> = [
  { id: "none", label: "No icon" },
  { id: "phone", label: "Phone" },
  { id: "mail", label: "Mail" },
  { id: "map-pin", label: "Map pin" },
  { id: "clock", label: "Clock" },
];

const spacingOptions: Array<{ id: ContactSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const columnOptions: Array<{ id: ContactColumns; label: string }> = [
  { id: "one", label: "One column" },
  { id: "two", label: "Two columns" },
];

const borderWidthOptions: Array<{ id: ContactBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const fieldLayoutOptions: Array<{ id: ContactFieldLayout; label: string }> = [
  { id: "one", label: "Single column" },
  { id: "two", label: "Two columns" },
];

const fieldAutocompleteOptions: Array<{
  id: ContactFieldAutocomplete;
  label: string;
}> = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "tel", label: "Phone" },
  { id: "off", label: "Off" },
];

const fieldSpanOptions: Array<{ id: ContactFieldSpan; label: string }> = [
  { id: "full", label: "Full width" },
  { id: "half", label: "Half width" },
];

const mapHeightOptions: Array<{ id: ContactMapHeight; label: string }> = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

const maxWidthOptions: Array<{ id: ContactMaxWidth; label: string }> = [
  { id: "none", label: "Full width" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Default" },
  { id: "2xl", label: "Extra large" },
];

const paddingXOptions: Array<{ id: ContactPaddingX; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Roomy" },
];

const socialPlatformOptions: Array<{
  id: Exclude<ContactSocialPlatform, "custom">;
  label: string;
}> = [
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

const socialProfilePlaceholders: Record<ContactSocialPlatform, string> = {
  x: "coderso",
  linkedin: "coderso",
  facebook: "coderso",
  instagram: "coderso",
  youtube: "coderso",
  custom: "",
};

const submissionModeOptions = [
  { id: "static", label: "Static" },
  { id: "forms-runtime", label: "Forms runtime" },
] as const;

const NO_FORM_VALUE = "__contact-no-form__";
const supportedRuntimeFieldTypes = new Set<string>(Object.values(contactRuntimeFieldTypeMap));

const variantOptions: Array<{
  id: ContactVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "form-left",
    label: "Form left",
    description: "Form on the left, contact details on the right.",
  },
  {
    id: "form-right",
    label: "Form right",
    description: "Contact details on the left, form on the right.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Contact details only, optional map below.",
  },
];

type FormData = NonNullable<ContactData["form"]>;
type ContactDetails = NonNullable<ContactData["contact"]>;
type MapData = NonNullable<ContactData["map"]>;
type StyleData = NonNullable<ContactData["style"]>;

function useContactFormDetail(formId: string | undefined) {
  const trimmedFormId = formId?.trim() ?? "";
  const [resolved, setResolved] = useState<{
    formId: string;
    detail: FormDetail | null;
    error: string | null;
  }>({
    formId: "",
    detail: null,
    error: null,
  });

  useEffect(() => {
    if (!trimmedFormId) return undefined;

    let active = true;

    getFormDetailCached(trimmedFormId, { force: true })
      .then((nextDetail) => {
        if (!active) return;
        setResolved({
          formId: trimmedFormId,
          detail: nextDetail,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setResolved({
          formId: trimmedFormId,
          detail: null,
          error: err instanceof Error && err.message ? err.message : "Failed to load form fields.",
        });
      });

    return () => {
      active = false;
    };
  }, [trimmedFormId]);

  if (!trimmedFormId) {
    return { detail: null, isLoading: false, error: null };
  }

  return {
    detail: resolved.formId === trimmedFormId ? resolved.detail : null,
    isLoading: resolved.formId !== trimmedFormId,
    error: resolved.formId === trimmedFormId ? resolved.error : null,
  };
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: WidgetEditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: ContactVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function updateValue(
  value: ContactData,
  onChange: (next: ContactData) => void,
  updater: (current: ContactData) => ContactData
) {
  const current = normalizeContactData(value);
  const next = updater(current);
  onChange(normalizeContactData(next));
}

function updateRoot(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Pick<ContactData, "title" | "description">
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function updateForm(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<FormData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      ...patch,
    },
  }));
}

function updateContactDetails(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<ContactDetails>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    contact: {
      ...current.contact,
      ...patch,
    },
  }));
}

function updateMap(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<MapData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    map: {
      ...current.map,
      ...patch,
    },
  }));
}

function updateStyle(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function updateFieldSettings(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  patch: Partial<NonNullable<FormData["fieldSettings"]>[ContactFieldId]>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      fieldSettings: {
        ...current.form?.fieldSettings,
        [field]: {
          ...current.form?.fieldSettings?.[field],
          ...patch,
        },
      },
    },
  }));
}

function updateContactDetailDisplay(
  value: ContactData,
  onChange: (next: ContactData) => void,
  key: ContactDetailKey,
  patch: Partial<NonNullable<ContactDetails["details"]>[ContactDetailKey]>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    contact: {
      ...current.contact,
      details: {
        ...current.contact?.details,
        [key]: {
          ...current.contact?.details?.[key],
          ...patch,
        },
      },
    },
  }));
}

function updateSubmission(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<NonNullable<FormData["submission"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      submission: {
        ...current.form?.submission,
        ...patch,
      },
    },
  }));
}

function updateSubmissionFieldMap(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  nextName: string
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      submission: {
        ...current.form?.submission,
        fieldMap: {
          ...current.form?.submission?.fieldMap,
          [field]: nextName,
        },
      },
    },
  }));
}

function updateSocialLink(
  value: ContactData,
  onChange: (next: ContactData) => void,
  index: number,
  patch: Partial<NonNullable<ContactDetails["social"]>[number]>
) {
  updateValue(value, onChange, (current) => {
    const social = [...(current.contact?.social ?? [])];
    const currentRow = social[index];
    if (!currentRow) return current;
    social[index] = {
      ...currentRow,
      ...patch,
    };
    return {
      ...current,
      contact: {
        ...current.contact,
        social,
      },
    };
  });
}

function addSocialLink(value: ContactData, onChange: (next: ContactData) => void) {
  updateValue(value, onChange, (current) => {
    const social = [...(current.contact?.social ?? [])];
    social.push({
      id: `contact-social-${social.length + 1}`,
      platform: "linkedin",
      label: "LinkedIn",
      href: "",
    });

    return {
      ...current,
      contact: {
        ...current.contact,
        social,
      },
    };
  });
}

function removeSocialLink(
  value: ContactData,
  onChange: (next: ContactData) => void,
  index: number
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    contact: {
      ...current.contact,
      social: (current.contact?.social ?? []).filter((_, itemIndex) => itemIndex !== index),
    },
  }));
}

function clearStyleField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function toggleField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  enabled: boolean
) {
  updateValue(value, onChange, (current) => {
    const fields = current.form?.fields ?? contactDefaults.form?.fields ?? [];
    const required = current.form?.required ?? [];
    const hasField = fields.includes(field);
    if (enabled && hasField) return current;
    if (!enabled && !hasField) return current;

    if (!enabled && fields.length <= 1) return current;

    const nextFields = enabled ? [...fields, field] : fields.filter((item) => item !== field);
    const nextRequired = required.filter((item) => nextFields.includes(item));

    return {
      ...current,
      form: {
        ...current.form,
        fields: nextFields,
        required: nextRequired,
      },
    };
  });
}

function toggleRequiredField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  required: boolean
) {
  updateValue(value, onChange, (current) => {
    const selectedFields = current.form?.fields ?? contactDefaults.form?.fields ?? [];
    if (!selectedFields.includes(field)) return current;

    const currentRequired = current.form?.required ?? [];
    const hasRequired = currentRequired.includes(field);
    if (required && hasRequired) return current;
    if (!required && !hasRequired) return current;

    const nextRequired = required
      ? [...currentRequired, field]
      : currentRequired.filter((item) => item !== field);

    return {
      ...current,
      form: {
        ...current.form,
        required: nextRequired,
      },
    };
  });
}

function moveField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const fields = [...(current.form?.fields ?? contactDefaults.form?.fields ?? [])];
    if (toIndex < 0 || toIndex >= fields.length) return current;
    const [item] = fields.splice(fromIndex, 1);
    if (!item) return current;
    fields.splice(toIndex, 0, item);

    return {
      ...current,
      form: {
        ...current.form,
        fields,
      },
    };
  });
}

function FieldToggleList({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const selectedFields = normalized.form?.fields ?? [];

  return (
    <div className="space-y-2">
      {contactFieldOptions.map((field) => (
        <div key={field} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{fieldLabels[field]}</p>
            <p className="text-xs text-muted-foreground">
              {selectedFields.includes(field) ? "Visible in the form." : "Hidden from the form."}
            </p>
          </div>
          <Switch
            checked={selectedFields.includes(field)}
            onCheckedChange={(checked) => toggleField(value, onChange, field, checked)}
          />
        </div>
      ))}
    </div>
  );
}

function RequiredFieldList({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const selectedFields = normalized.form?.fields ?? [];
  const requiredFields = new Set<ContactFieldId>(normalized.form?.required ?? []);

  return (
    <div className="space-y-2">
      {selectedFields.map((field) => (
        <div key={field} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{fieldLabels[field]}</p>
            <p className="text-xs text-muted-foreground">
              Decide if this field is required in the published form.
            </p>
          </div>
          <Switch
            checked={requiredFields.has(field)}
            onCheckedChange={(checked) => toggleRequiredField(value, onChange, field, checked)}
          />
        </div>
      ))}
    </div>
  );
}

function FieldOrderList({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const selectedFields = normalized.form?.fields ?? [];

  return (
    <div className="space-y-2">
      {selectedFields.map((field, index) => (
        <div key={field} className="space-y-2 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{fieldLabels[field]}</p>
            <p className="text-xs text-muted-foreground">
              Move this field earlier or later in the Contact form.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveField(value, onChange, index, index - 1)}
              disabled={index === 0}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveField(value, onChange, index, index + 1)}
              disabled={index === selectedFields.length - 1}
            >
              Move down
            </Button>
          </div>
        </div>
      ))}
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
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onClear={onClear}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
    />
  );
}

function SectionHeaderControls({
  value,
  onChange,
  titlePlaceholder,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
  titlePlaceholder: string;
}) {
  const normalized = normalizeContactData(value);
  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">Section title</p>
        <Input
          value={normalized.title ?? ""}
          onChange={(event) => updateRoot(value, onChange, { title: event.target.value })}
          placeholder={titlePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Section description</p>
        <Textarea
          rows={3}
          value={normalized.description ?? ""}
          onChange={(event) => updateRoot(value, onChange, { description: event.target.value })}
          placeholder="Optional supporting copy for the contact section."
        />
      </div>
    </>
  );
}

function SubmissionRuntimeSection({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const submission = normalized.form?.submission;
  const selectedFields = normalized.form?.fields ?? [];
  const { items: forms, isLoading } = useForms();
  const normalizedFormId = submission?.formId?.trim() ?? "";
  const selectedForm = forms.find((form) => form.id === normalizedFormId) ?? null;
  const {
    detail,
    isLoading: detailLoading,
    error,
  } = useContactFormDetail(selectedForm?.id ?? undefined);
  const resolvedFields = detail?.fields ?? [];
  const compatibleFieldsByContactField = Object.fromEntries(
    contactFieldOptions.map((field) => [
      field,
      resolvedFields
        .filter((runtimeField) => runtimeField.type === contactRuntimeFieldTypeMap[field])
        .sort((left, right) => left.orderIndex - right.orderIndex),
    ])
  ) as Record<ContactFieldId, NonNullable<FormDetail["fields"]>>;
  const hasUnsupportedRuntimeFields = resolvedFields.some(
    (field) => !supportedRuntimeFieldTypes.has(field.type)
  );
  const hasConditionalRuntimeFields = resolvedFields.some((field) => {
    const logic = field.settings?.logic;
    const operator =
      logic && typeof logic === "object" && "operator" in logic ? logic.operator : undefined;
    return typeof operator === "string" && operator !== "always";
  });
  const hasMultiStepRuntimeFields = resolvedFields.some(
    (field) =>
      typeof field.settings?.step === "number" &&
      Number.isFinite(field.settings.step) &&
      field.settings.step > 1
  );
  const hasExactFieldCoverage =
    resolvedFields.length > 0 &&
    !hasUnsupportedRuntimeFields &&
    !hasConditionalRuntimeFields &&
    !hasMultiStepRuntimeFields &&
    resolvedFields.length === selectedFields.length;

  return (
    <EditorSection
      id="contact.visual.submission-runtime"
      mode="visual"
      role="source"
      title="Submission runtime binding"
      description="Keep Contact static by default or bind it to an existing public-compatible Form."
    >
      <div className="space-y-2">
        <p className="text-sm font-medium">Runtime mode</p>
        <Select
          value={submission?.mode ?? "static"}
          onValueChange={(next) =>
            updateSubmission(value, onChange, {
              mode: next as NonNullable<FormData["submission"]>["mode"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select runtime mode" />
          </SelectTrigger>
          <SelectContent>
            {submissionModeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Static status note</p>
        <Textarea
          rows={2}
          value={submission?.staticMessage ?? ""}
          onChange={(event) =>
            updateSubmission(value, onChange, { staticMessage: event.target.value })
          }
          placeholder="This contact form is not connected yet."
        />
      </div>

      {submission?.mode === "forms-runtime" ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Bound form</p>
            <Select
              value={selectedForm ? selectedForm.id : NO_FORM_VALUE}
              onValueChange={(formId) =>
                updateSubmission(value, onChange, {
                  formId: formId === NO_FORM_VALUE ? "" : formId,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading forms..." : "Select form"} />
              </SelectTrigger>
              <SelectContent>
                {selectedForm === null ? (
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
          </div>

          {selectedForm?.submissionAccess === "internal" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Internal submissions require an authenticated admin session or an API key with the
              <span className="font-semibold"> forms.submit </span>scope. Contact should stay static
              on public pages for this binding.
            </div>
          ) : null}

          {detailLoading ? (
            <p className="text-xs text-muted-foreground">Loading form fields...</p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {selectedForm && !detailLoading && resolvedFields.length > 0 && !hasExactFieldCoverage ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Contact can submit only when the bound Form uses the same field count as the visible
              Contact form, every field keeps its matching Contact type, and the Form does not
              depend on conditional logic or extra steps. This binding will stay static on public
              pages until the field set matches.
            </div>
          ) : null}

          {selectedForm ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Success message override</p>
                <Input
                  value={submission?.successMessage ?? ""}
                  onChange={(event) =>
                    updateSubmission(value, onChange, { successMessage: event.target.value })
                  }
                  placeholder="Thanks for your message."
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Error message</p>
                <Input
                  value={submission?.errorMessage ?? ""}
                  onChange={(event) =>
                    updateSubmission(value, onChange, { errorMessage: event.target.value })
                  }
                  placeholder="Unable to send your message. Please try again."
                />
              </div>
            </div>
          ) : null}

          {resolvedFields.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Field mapping</p>
              <p className="text-xs text-muted-foreground">
                Map each visible Contact field to a compatible Form field. Contact keeps its own
                labels, placeholders, and layout while runtime submission uses the mapped Form field
                names.
              </p>
              {selectedFields.map((field) => {
                const compatibleFields = compatibleFieldsByContactField[field];
                const preferredValue =
                  submission?.fieldMap?.[field]?.trim() ||
                  (compatibleFields.some((candidate) => candidate.name === field) ? field : "");
                const selectValue = preferredValue.length > 0 ? preferredValue : NO_FORM_VALUE;

                return (
                  <div key={field} className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-medium">{fieldLabels[field]}</p>
                    <Select
                      value={selectValue}
                      onValueChange={(next) =>
                        updateSubmissionFieldMap(
                          value,
                          onChange,
                          field,
                          next === NO_FORM_VALUE ? "" : next
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select form field" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectValue === NO_FORM_VALUE ? (
                          <SelectItem value={NO_FORM_VALUE} disabled>
                            Select form field
                          </SelectItem>
                        ) : null}
                        {compatibleFields.map((runtimeField) => (
                          <SelectItem key={runtimeField.id} value={runtimeField.name}>
                            {runtimeField.label} ({runtimeField.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          ) : selectedForm ? (
            <p className="text-xs text-muted-foreground">
              No compatible text, email, phone, or textarea fields are available for Contact mapping
              yet.
            </p>
          ) : null}
        </>
      ) : null}
    </EditorSection>
  );
}

function ContactMapLocationField({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const mapLocation = readContactMapLocation(normalized.map?.embedUrl);
  const hasLegacyMapSource = Boolean((normalized.map?.embedUrl ?? "").trim()) && !mapLocation;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Map location</p>
      <Input
        value={mapLocation}
        onChange={(event) =>
          updateMap(value, onChange, {
            embedUrl: buildContactMapEmbedUrl(event.target.value),
          })
        }
        placeholder="Warsaw, Poland or 123 Market Street"
      />
      <p className="text-xs text-muted-foreground">
        Enter a public place name or address. The editor builds a safe embedded map source.
      </p>
      {hasLegacyMapSource ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            A saved custom map source is still stored. Replace it with a location above or clear it
            before publishing changes.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateMap(value, onChange, { embedUrl: "" })}
          >
            Clear saved map source
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SocialProfileField({
  value,
  onChange,
  link,
  index,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
  link: NonNullable<ContactDetails["social"]>[number];
  index: number;
}) {
  const platform = link.platform ?? "custom";
  const profile = readContactSocialProfile(platform, link.href);
  const hasLegacyDestination = Boolean((link.href ?? "").trim()) && profile.length === 0;

  if (platform === "custom") {
    return (
      <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Profile destination</p>
        <p className="text-xs text-muted-foreground">
          Custom social destinations stay support-only so editors do not need to paste technical
          links. Choose a known platform above to publish a link from a simple profile name.
        </p>
        {hasLegacyDestination ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateSocialLink(value, onChange, index, { href: "" })}
          >
            Clear saved custom destination
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Profile name</p>
      <Input
        value={profile}
        onChange={(event) =>
          updateSocialLink(value, onChange, index, {
            href: buildContactSocialHref(platform, event.target.value),
          })
        }
        placeholder={socialProfilePlaceholders[platform]}
      />
      <p className="text-xs text-muted-foreground">
        Enter only the public profile name or handle. The editor builds the safe destination.
      </p>
      {hasLegacyDestination ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p>
            A saved custom profile destination is still stored. Replace it with a profile name or
            clear it before publishing changes.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateSocialLink(value, onChange, index, { href: "" })}
          >
            Clear saved destination
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SocialLinksEditor({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const social = normalized.contact?.social ?? [];

  return (
    <div className="space-y-3">
      {social.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add public profile links like LinkedIn or Instagram when the section needs them.
        </p>
      ) : null}
      {social.map((link, index) => (
        <div key={link.id ?? `social-${index + 1}`} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Social link {index + 1}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => removeSocialLink(value, onChange, index)}
            >
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Platform</p>
            <Select
              value={link.platform ?? "custom"}
              onValueChange={(next) =>
                updateSocialLink(value, onChange, index, {
                  platform: next as ContactSocialPlatform,
                  href: buildContactSocialHref(
                    next as ContactSocialPlatform,
                    readContactSocialProfile(link.platform, link.href)
                  ),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {(link.platform ?? "custom") === "custom" ? (
                  <SelectItem value="custom" disabled>
                    Custom legacy
                  </SelectItem>
                ) : null}
                {socialPlatformOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Label</p>
            <Input
              value={link.label ?? ""}
              onChange={(event) =>
                updateSocialLink(value, onChange, index, { label: event.target.value })
              }
              placeholder="LinkedIn"
            />
          </div>
          <SocialProfileField value={value} onChange={onChange} link={link} index={index} />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => addSocialLink(value, onChange)}>
        Add social link
      </Button>
    </div>
  );
}

export function ContactWizardEditor({ value, variant }: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);
  const resolvedVariant = resolveContactVariant(variant);
  const visibleFieldLabels = (normalized.form?.fields ?? []).map((field) => fieldLabels[field]);

  return (
    <div className="space-y-4">
      <EditorSection
        id="contact.wizard.layout"
        mode="wizard"
        role="setup"
        title="Contact layout"
        description="Review the current layout before daily editing in Visual."
      >
        <ReadonlyWidgetSummaryRow
          id="contact.wizard.layout.variant"
          label="Current layout"
          path="variant"
          value={
            variantOptions.find((option) => option.id === resolvedVariant)?.label ?? "Form left"
          }
        />
      </EditorSection>

      <EditorSection
        id="contact.wizard.form"
        mode="wizard"
        role="setup"
        title="Contact form"
        description="Review the current field setup before daily editing in Visual."
      >
        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
          Use Visual to edit the section title, description, field copy, and all daily contact
          presentation details.
        </div>
        <ReadonlyWidgetSummaryRow
          id="contact.wizard.form.fields"
          label="Visible fields"
          path="form.fields"
          value={
            visibleFieldLabels.length > 0 ? visibleFieldLabels.join(", ") : "No fields configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="contact.wizard.form.submitLabel"
          label="Submit label"
          path="form.submitLabel"
          value={normalized.form?.submitLabel ?? "Send message"}
        />
        {resolvedVariant === "minimal" ? (
          <p className="text-xs text-muted-foreground">
            Minimal layout shows contact details only in runtime; form setup remains stored for
            other variants and stays editable in Visual.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Runtime submission setup stays in Visual so Wizard remains a read-only starter summary.
          </p>
        )}
      </EditorSection>
    </div>
  );
}

export function ContactVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);
  const resolvedVariant = resolveContactVariant(variant);
  const mapEnabled = normalized.map?.enabled ?? false;
  const showFormControls = resolvedVariant !== "minimal";

  return (
    <div className="space-y-4">
      <EditorSection
        id="contact.visual.variant-header"
        mode="visual"
        role="setup"
        title="Variant and section header"
        description="Choose the Contact layout and give the full section a clear entry point."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        <SectionHeaderControls value={value} onChange={onChange} titlePlaceholder="Get in touch" />
      </EditorSection>

      <EditorSection
        id="contact.visual.form-fields-required"
        mode="visual"
        role="content"
        title="Form fields and required rules"
        description="Control which Contact form fields appear and what visitors must complete."
      >
        {showFormControls ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Visible fields</p>
              <FieldToggleList value={value} onChange={onChange} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Required fields</p>
              <RequiredFieldList value={value} onChange={onChange} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Field order</p>
              <FieldOrderList value={value} onChange={onChange} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Form panel title</p>
              <Input
                value={normalized.form?.title ?? ""}
                onChange={(event) => updateForm(value, onChange, { title: event.target.value })}
                placeholder="Send a message"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Submit label</p>
              <Input
                value={normalized.form?.submitLabel ?? ""}
                onChange={(event) =>
                  updateForm(value, onChange, { submitLabel: event.target.value })
                }
                placeholder="Send message"
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
            Minimal layout shows contact details only. Form-field controls are hidden because they
            do not affect the published output in this variant.
          </div>
        )}
      </EditorSection>

      {showFormControls ? (
        <EditorSection
          id="contact.visual.field-copy-layout"
          mode="visual"
          role="content"
          title="Field labels, placeholders, and layout"
          description="Tune labels, placeholders, autocomplete, and grid width for each visible field."
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">Field layout</p>
            <Select
              value={normalized.form?.fieldLayout ?? "one"}
              onValueChange={(next) =>
                updateForm(value, onChange, { fieldLayout: next as ContactFieldLayout })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field layout" />
              </SelectTrigger>
              <SelectContent>
                {fieldLayoutOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Use two columns when short fields should sit side by side. Message fields usually work
            best at full width.
          </p>
          {(normalized.form?.fields ?? []).map((field) => {
            const settings =
              normalized.form?.fieldSettings?.[field] ??
              contactDefaults.form?.fieldSettings?.[field];

            return (
              <div key={field} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{fieldLabels[field]}</p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Label</p>
                  <Input
                    value={settings?.label ?? ""}
                    onChange={(event) =>
                      updateFieldSettings(value, onChange, field, { label: event.target.value })
                    }
                    placeholder={fieldLabels[field]}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Placeholder
                  </p>
                  {field === "message" ? (
                    <Textarea
                      rows={2}
                      value={settings?.placeholder ?? ""}
                      onChange={(event) =>
                        updateFieldSettings(value, onChange, field, {
                          placeholder: event.target.value,
                        })
                      }
                      placeholder="Tell us how we can help..."
                    />
                  ) : (
                    <Input
                      value={settings?.placeholder ?? ""}
                      onChange={(event) =>
                        updateFieldSettings(value, onChange, field, {
                          placeholder: event.target.value,
                        })
                      }
                      placeholder={
                        field === "name"
                          ? "Your name"
                          : field === "email"
                            ? "you@example.com"
                            : "+1 555 123 456"
                      }
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Autocomplete
                  </p>
                  <Select
                    value={settings?.autocomplete ?? "off"}
                    onValueChange={(next) =>
                      updateFieldSettings(value, onChange, field, {
                        autocomplete: next as ContactFieldAutocomplete,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select autocomplete" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldAutocompleteOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {normalized.form?.fieldLayout === "two" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Width</p>
                    <Select
                      value={settings?.span ?? "full"}
                      onValueChange={(next) =>
                        updateFieldSettings(value, onChange, field, {
                          span: next as ContactFieldSpan,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field width" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldSpanOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            );
          })}
        </EditorSection>
      ) : null}

      {showFormControls ? <SubmissionRuntimeSection value={value} onChange={onChange} /> : null}

      <EditorSection
        id="contact.visual.details-business"
        mode="visual"
        role="content"
        title="Contact details and business info"
        description="Shape the business panel, semantic labels, icon choices, and social links."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Details panel title</p>
          <Input
            value={normalized.contact?.title ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { title: event.target.value })
            }
            placeholder="Contact details"
          />
        </div>
        {contactDetailOptions.map((detail) => (
          <div key={detail} className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{detailLabels[detail]}</p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Value</p>
              {detail === "address" ? (
                <Textarea
                  rows={3}
                  value={normalized.contact?.[detail] ?? ""}
                  onChange={(event) =>
                    updateContactDetails(value, onChange, {
                      [detail]: event.target.value,
                    } as Partial<ContactDetails>)
                  }
                  placeholder={detail === "address" ? "123 Market Street" : ""}
                />
              ) : (
                <Input
                  value={normalized.contact?.[detail] ?? ""}
                  onChange={(event) =>
                    updateContactDetails(value, onChange, {
                      [detail]: event.target.value,
                    } as Partial<ContactDetails>)
                  }
                  placeholder={
                    detail === "phone"
                      ? "+1 555 123 456"
                      : detail === "email"
                        ? "hello@example.com"
                        : "Mon-Fri 9-5"
                  }
                />
              )}
              {detail === "address" ? (
                <p className="text-xs text-muted-foreground">
                  Multi-line addresses render with preserved line breaks.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Label</p>
              <Input
                value={normalized.contact?.details?.[detail]?.label ?? ""}
                onChange={(event) =>
                  updateContactDetailDisplay(value, onChange, detail, {
                    label: event.target.value,
                  })
                }
                placeholder={detailLabels[detail]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Icon</p>
              <Select
                value={normalized.contact?.details?.[detail]?.icon ?? "none"}
                onValueChange={(next) =>
                  updateContactDetailDisplay(value, onChange, detail, {
                    icon: next as ContactIconKey,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <p className="text-sm font-medium">Social links</p>
          <SocialLinksEditor value={value} onChange={onChange} />
        </div>
      </EditorSection>

      <EditorSection
        id="contact.visual.map-display"
        mode="visual"
        role="content"
        title="Map source and display behavior"
        description="Control if the map appears, how tall it is, and how validation feedback is explained."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show map</p>
            <p className="text-xs text-muted-foreground">
              Add a public place name or address below. Technical embed details stay out of normal
              editing.
            </p>
          </div>
          <Switch
            checked={mapEnabled}
            onCheckedChange={(checked) => updateMap(value, onChange, { enabled: checked })}
          />
        </div>
        {mapEnabled ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Map title</p>
              <Input
                value={normalized.map?.title ?? ""}
                onChange={(event) => updateMap(value, onChange, { title: event.target.value })}
                placeholder="Find us"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Map description</p>
              <Textarea
                rows={2}
                value={normalized.map?.description ?? ""}
                onChange={(event) =>
                  updateMap(value, onChange, { description: event.target.value })
                }
                placeholder="Optional context for the map panel."
              />
            </div>
            <ContactMapLocationField value={value} onChange={onChange} />
            <div className="space-y-2">
              <p className="text-sm font-medium">Map height</p>
              <Select
                value={normalized.map?.height ?? "md"}
                onValueChange={(next) =>
                  updateMap(value, onChange, { height: next as ContactMapHeight })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select map height" />
                </SelectTrigger>
                <SelectContent>
                  {mapHeightOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Map fallback copy</p>
              <Textarea
                rows={2}
                value={normalized.map?.fallbackCopy ?? ""}
                onChange={(event) =>
                  updateMap(value, onChange, { fallbackCopy: event.target.value })
                }
                placeholder="Map is unavailable."
              />
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        id="contact.visual.surface-styling"
        mode="visual"
        role="visual"
        title="Colors, borders, and surface styling"
        description="Configure section background and card surfaces shown in runtime output."
      >
        <ColorField
          label="Section background"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          onClear={() => clearStyleField(value, onChange, "background")}
          placeholder="transparent or #f8fafc"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Card surface color"
          value={normalized.style?.surfaceColor}
          onChange={(next) => updateStyle(value, onChange, { surfaceColor: next })}
          onClear={() => clearStyleField(value, onChange, "surfaceColor")}
          placeholder="var(--color-bg) or #ffffff"
          pickerFallback="#ffffff"
        />
        <ColorField
          label="Card border color"
          value={normalized.style?.borderColor}
          onChange={(next) => updateStyle(value, onChange, { borderColor: next })}
          placeholder="var(--color-border) or #e2e8f0"
          pickerFallback="#e2e8f0"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">Card border width</p>
          <Select
            value={normalized.style?.borderWidth ?? "1"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { borderWidth: next as ContactBorderWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select border width" />
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
      </EditorSection>

      <EditorSection
        id="contact.visual.layout-spacing"
        mode="visual"
        role="layout"
        title="Section layout and spacing"
        description="Tune overall width, horizontal padding, gap density, and panel column layout."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Max width</p>
          <Select
            value={normalized.style?.maxWidth ?? "xl"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { maxWidth: next as ContactMaxWidth })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select max width" />
            </SelectTrigger>
            <SelectContent>
              {maxWidthOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Horizontal padding</p>
          <Select
            value={normalized.style?.paddingX ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { paddingX: next as ContactPaddingX })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select horizontal padding" />
            </SelectTrigger>
            <SelectContent>
              {paddingXOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as ContactSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Compact closes the gap quickly, Default mirrors current spacing, and Extra spacious
            gives the section more breathing room.
          </p>
        </div>
        {showFormControls ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Section columns</p>
            <Select
              value={normalized.style?.columns ?? "two"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columns: next as ContactColumns })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select columns" />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Columns do not apply in the minimal layout because the section renders contact details
            only.
          </p>
        )}
      </EditorSection>
    </div>
  );
}

export function ContactAdvancedEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);
  const mapLocation = readContactMapLocation(normalized.map?.embedUrl);
  const mapUrlState = getContactMapUrlState(normalized.map?.embedUrl);
  const hasMapSource = Boolean((normalized.map?.embedUrl ?? "").trim());
  const visibleContactDetails = contactDetailOptions.filter(
    (key) => typeof normalized.contact?.[key] === "string" && normalized.contact[key].trim()
  ).length;
  const visibleSocialLinks = (normalized.contact?.social ?? []).filter(
    (item) => (item.href ?? "").trim().length > 0 || (item.label ?? "").trim().length > 0
  ).length;
  const [normalizationMessage, setNormalizationMessage] = useState("");
  const [normalizationArmed, setNormalizationArmed] = useState(false);

  return (
    <div className="space-y-4">
      <EditorSection
        id="contact.advanced.map-runtime"
        mode="advanced"
        role="diagnostics"
        title="Map source and runtime metadata"
        description="Read-only map metadata and current Contact payload diagnostics."
      >
        <ReadonlyWidgetSummaryRow
          id="contact-advanced-map-enabled"
          label="Map visibility"
          path="map.enabled"
          value={normalized.map?.enabled ? "Enabled" : "Disabled"}
        />
        <ReadonlyWidgetSummaryRow
          id="contact-advanced-map-source"
          label="Map source"
          path="map.embedUrl"
          help="Visual owns map setup. Advanced only reports the resolved runtime state."
          value={
            mapLocation
              ? `Google Maps location: ${mapLocation}`
              : hasMapSource
                ? "Saved custom map source"
                : "Not configured"
          }
        />
        <ReadonlyWidgetSummaryRow
          id="contact-advanced-map-runtime"
          label="Runtime status"
          path="map.embedUrl"
          value={hasMapSource ? mapUrlState.message : "Map fallback copy renders until configured."}
        />
      </EditorSection>

      <EditorSection
        id="contact.advanced.normalization"
        mode="advanced"
        role="technical"
        title="Normalization and fallback controls"
        description="Confirmed support action for deterministic payload cleanup."
      >
        <WidgetControlRow
          id="contact-advanced-normalize-action"
          label="Normalize payload"
          ownership="action"
          help="This support action rewrites the payload to deterministic defaults after explicit confirmation."
        >
          {() => (
            <Button
              type="button"
              variant={normalizationArmed ? "default" : "outline"}
              onClick={() => {
                if (!normalizationArmed) {
                  setNormalizationArmed(true);
                  setNormalizationMessage("Review diagnostics, then confirm normalization.");
                  return;
                }

                const before = JSON.stringify(value);
                const next = normalizeContactData(value);
                const after = JSON.stringify(next);
                onChange(next);
                setNormalizationArmed(false);
                setNormalizationMessage(
                  before === after ? "Already normalized." : "Payload normalized."
                );
              }}
            >
              {normalizationArmed ? "Confirm normalization" : "Review normalization"}
            </Button>
          )}
        </WidgetControlRow>
        <p className="text-xs text-muted-foreground">
          Normalization enforces allowed field IDs, explicit defaults, and safe style tokens.
        </p>
        {normalizationMessage ? (
          <p className="text-xs text-muted-foreground" role="status">
            {normalizationMessage}
          </p>
        ) : null}
      </EditorSection>

      <EditorSection
        id="contact.advanced.runtime-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime diagnostics summary"
        description="Read-only human summary for debugging and QA checks. Runtime nonces stay redacted."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyWidgetSummaryRow
            id="contact-advanced-runtime-fields"
            label="Form fields"
            path="form.fields"
            value={`${normalized.form?.fields?.length ?? 0} configured`}
          />
          <ReadonlyWidgetSummaryRow
            id="contact-advanced-runtime-details"
            label="Contact details"
            path="contact.details"
            value={`${visibleContactDetails} visible`}
          />
          <ReadonlyWidgetSummaryRow
            id="contact-advanced-runtime-social"
            label="Social links"
            path="contact.social"
            value={`${visibleSocialLinks} visible`}
          />
          <ReadonlyWidgetSummaryRow
            id="contact-advanced-runtime-security"
            label="Runtime security"
            value="Submission nonce redacted; public payload not shown in editor."
          />
        </div>
      </EditorSection>
    </div>
  );
}
