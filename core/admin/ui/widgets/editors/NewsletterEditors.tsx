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
import { cn } from "@/lib/utils";
import { getFormDetailCached, type FormDetail } from "@/services/formsClient";
import { useForms } from "@/ui/forms/hooks/useForms";

import {
  getExpectedNewsletterRuntimeFields,
  getNewsletterFormsRuntimeCompatibility,
  newsletterDefaults,
  normalizeNewsletterActionUrl,
  normalizeNewsletterData,
  resolveNewsletterTransport,
  resolveNewsletterVariant,
  type NewsletterData,
  type NewsletterFirstNameField,
  type NewsletterIntegrationMode,
  type NewsletterMethod,
  type NewsletterOptInMode,
  type NewsletterSpacing,
  type NewsletterSubmissionMode,
  type NewsletterVariantId,
  type NewsletterWidth,
} from "../../../../widgets/core/newsletter";
import type { WidgetEditorProps, WidgetPreviewState } from "../../../../widgets/types";
import { resolveColorContrastAdvisory, resolveColorPickerValue } from "./ClearableFields";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: NewsletterVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "inline",
    label: "Inline",
    description: "Input and button share a row when possible. Mobile layout still stacks.",
  },
  {
    id: "stacked",
    label: "Stacked",
    description: "Input sits above the CTA on every viewport.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Compact signup with hidden description. Mobile layout still stacks.",
  },
];

const spacingOptions: Array<{ id: NewsletterSpacing; label: string }> = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const alignmentOptions = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
] as const;

const widthOptions: Array<{ id: NewsletterWidth; label: string }> = [
  { id: "narrow", label: "Narrow" },
  { id: "default", label: "Default" },
  { id: "wide", label: "Wide" },
  { id: "full", label: "Full width" },
];

const integrationModeOptions: Array<{ id: NewsletterIntegrationMode; label: string }> = [
  { id: "action-url", label: "Action URL" },
  { id: "webhook", label: "Webhook" },
];

const methodOptions: Array<{ id: NewsletterMethod; label: string }> = [
  { id: "post", label: "POST" },
  { id: "get", label: "GET" },
];

const submissionModeOptions: Array<{ id: NewsletterSubmissionMode; label: string }> = [
  { id: "static", label: "Static/native" },
  { id: "forms-runtime", label: "Forms runtime" },
];

const optInModeOptions: Array<{ id: NewsletterOptInMode; label: string }> = [
  { id: "single", label: "Single opt-in" },
  { id: "double", label: "Double opt-in" },
];

const NO_FORM_VALUE = "__newsletter-no-form__";

type NormalizedNewsletterData = ReturnType<typeof normalizeNewsletterData>;
type FormSettings = NonNullable<NewsletterData["form"]>;
type StateCopy = NonNullable<NewsletterData["stateCopy"]>;
type IntegrationData = NonNullable<NewsletterData["integration"]>;
type SubmissionData = NonNullable<NewsletterData["submission"]>;
type OptInData = NonNullable<NewsletterData["optIn"]>;
type StyleData = NonNullable<NewsletterData["style"]>;

function useNewsletterFormDetail(formId: string | undefined) {
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

function useNewsletterAdminPreview({
  value,
  detail,
  detailError,
  detailLoading,
  active,
  setPreviewState,
}: {
  value: NewsletterData;
  detail: FormDetail | null;
  detailError: string | null;
  detailLoading: boolean;
  active: boolean;
  setPreviewState?: (state: WidgetPreviewState | null) => void;
}) {
  const previewKey = useMemo(() => {
    const normalized = normalizeNewsletterData(value);
    return JSON.stringify({
      submissionMode: normalized.submission.mode,
      formId: normalized.submission.formId,
      emailFieldName: normalized.form.emailFieldName,
      firstNameEnabled: normalized.form.firstName.enabled,
      firstNameFieldName: normalized.form.firstName.fieldName,
      firstNameRequired: normalized.form.firstName.required,
      consentEnabled: normalized.consent.enabled,
      consentRequired: normalized.consent.required,
      consentFieldName: normalized.form.consentFieldName,
      analyticsEvent: normalized.submission.analyticsEvent,
    });
  }, [value]);

  useEffect(() => {
    if (!active || !setPreviewState) return;

    const normalized = normalizeNewsletterData(value);
    if (normalized.submission.mode !== "forms-runtime") {
      setPreviewState(null);
      return;
    }
    if (!normalized.submission.formId.trim()) {
      setPreviewState({
        status: "error",
        message: "Select a published Form to preview the Forms runtime contract.",
      });
      return;
    }
    if (detailLoading) {
      setPreviewState({ status: "loading" });
      return;
    }
    if (detailError) {
      setPreviewState({ status: "error", message: detailError });
      return;
    }
    if (!detail) {
      setPreviewState({
        status: "error",
        message: "Bound Form preview is unavailable.",
      });
      return;
    }

    setPreviewState({
      status: "ready",
      dataPatch: {
        resolved: {
          formId: detail.form.id,
          formName: detail.form.name,
          description: detail.form.description,
          status: detail.form.status,
          successMessage: detail.form.successMessage,
          successRedirectUrl: detail.form.successRedirectUrl,
          submissionAccess: detail.form.submissionAccess,
          fields: detail.fields,
        },
      },
    });
  }, [active, detail, detailError, detailLoading, previewKey, setPreviewState, value]);
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
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  updater: (current: NormalizedNewsletterData) => NewsletterData
) {
  const normalized = normalizeNewsletterData(value);
  onChange(normalizeNewsletterData(updater(normalized)));
}

function updateRoot(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<NewsletterData>
) {
  updateValue(value, onChange, (current) => ({ ...current, ...patch }));
}

function updateForm(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<FormSettings>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      ...patch,
    },
  }));
}

function updateFirstNameField(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<NewsletterFirstNameField>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      firstName: {
        ...current.form.firstName,
        ...patch,
      },
    },
  }));
}

function updateConsent(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<NonNullable<NewsletterData["consent"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    consent: {
      ...current.consent,
      ...patch,
    },
  }));
}

function updateSubmit(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<NonNullable<NewsletterData["submit"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    submit: {
      ...current.submit,
      ...patch,
    },
  }));
}

function updateStateCopy(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<StateCopy>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    stateCopy: {
      ...current.stateCopy,
      ...patch,
    },
  }));
}

function updateIntegration(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<IntegrationData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    integration: {
      ...current.integration,
      ...patch,
    },
  }));
}

function updateSubmission(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<SubmissionData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    submission: {
      ...current.submission,
      ...patch,
    },
  }));
}

function updateOptIn(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<OptInData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    optIn: {
      ...current.optIn,
      ...patch,
    },
  }));
}

function updateStyle(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
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

function clearStyleField(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style;
    return {
      ...current,
      style,
    };
  });
}

function VariantCards({
  value,
  onChange,
}: {
  value: NewsletterVariantId;
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{option.label}</p>
            <Badge variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function MinimalDescriptionNotice({ variant }: { variant: NewsletterVariantId }) {
  if (variant !== "minimal") return null;
  return (
    <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
      Description stays saved, but the Minimal variant does not render it.
    </p>
  );
}

function RuntimeBindingSummary({ value }: { value: NormalizedNewsletterData }) {
  const requiredFields = getExpectedNewsletterRuntimeFields({
    form: value.form,
    consent: value.consent,
  });
  const requiredFieldText = requiredFields.map((field) => field.name).join(", ");

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
      <p>Required Newsletter field names for a bound Form: {requiredFieldText || "none"}.</p>
      <p>Bound public Forms can reuse nonce, captcha, and `/forms/:id/submissions`.</p>
    </div>
  );
}

function SuccessPreviewCard({
  state,
  successMessage,
}: {
  state: "form" | "success";
  successMessage: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 text-xs">
      <div className="mb-2 flex gap-2">
        <Badge variant={state === "form" ? "default" : "outline"}>Form</Badge>
        <Badge variant={state === "success" ? "default" : "outline"}>Success</Badge>
      </div>
      {state === "form" ? (
        <p className="text-muted-foreground">
          Preview keeps the live form visible by default. Success copy stays hidden until runtime
          confirms a submission.
        </p>
      ) : (
        <p className="text-muted-foreground">{successMessage}</p>
      )}
    </div>
  );
}

function resolveFieldBindingStatus(
  normalized: NormalizedNewsletterData,
  detail: FormDetail | null
) {
  const compatibility = getNewsletterFormsRuntimeCompatibility(
    {
      form: normalized.form,
      consent: normalized.consent,
    },
    detail?.fields
  );

  return {
    missingExpectedFields: compatibility.missingExpectedFields,
    requiredMismatchFields: compatibility.requiredMismatchFields,
    unmappedRequiredFields: compatibility.unmappedRequiredRuntimeFields,
    ready:
      compatibility.ready &&
      (detail?.form.status ?? "") === "published" &&
      (detail?.form.submissionAccess ?? "public") === "public",
  };
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

export function NewsletterWizardEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeNewsletterData(value);
  const consent = normalized.consent ?? newsletterDefaults.consent!;
  const submit = normalized.submit ?? newsletterDefaults.submit!;
  const resolvedVariant = resolveNewsletterVariant(variant);
  const variantCopy = variantOptions.find((option) => option.id === resolvedVariant);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium">Newsletter layout</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {variantCopy?.description ?? "Layout is configured in Visual."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Change the variant in Visual. Wizard only shows the current selection.
        </p>
      </div>

      <MinimalDescriptionNotice variant={resolvedVariant} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Title</p>
        <Input
          value={normalized.title}
          onChange={(event) => updateRoot(value, onChange, { title: event.target.value })}
          placeholder="Join our newsletter"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <Textarea
          value={normalized.description}
          onChange={(event) => updateRoot(value, onChange, { description: event.target.value })}
          placeholder="Short supporting line"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Button label</p>
        <Input
          value={submit.label}
          onChange={(event) => updateSubmit(value, onChange, { label: event.target.value })}
          placeholder="Subscribe"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Consent checkbox</p>
          <p className="text-xs text-muted-foreground">
            Ask visitors to confirm marketing consent before submitting.
          </p>
        </div>
        <Switch
          checked={consent.enabled}
          onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
        />
      </div>

      {consent.enabled ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Consent label</p>
          <Input
            value={consent.label}
            onChange={(event) => updateConsent(value, onChange, { label: event.target.value })}
            placeholder="I agree to receive updates."
          />
        </div>
      ) : null}
    </div>
  );
}

export function NewsletterVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  context,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeNewsletterData(value);
  const submit = normalized.submit ?? newsletterDefaults.submit!;
  const consent = normalized.consent ?? newsletterDefaults.consent!;
  const stateCopy = normalized.stateCopy;
  const transport = resolveNewsletterTransport(normalized.integration);
  const resolvedVariant = resolveNewsletterVariant(variant);
  const [previewState, setPreviewState] = useState<"form" | "success">("form");
  const { items: forms, isLoading: formsLoading } = useForms({
    skip: normalized.submission.mode !== "forms-runtime",
  });
  const {
    detail,
    isLoading: detailLoading,
    error: detailError,
  } = useNewsletterFormDetail(
    normalized.submission.mode === "forms-runtime" ? normalized.submission.formId : undefined
  );
  useNewsletterAdminPreview({
    value,
    detail,
    detailError,
    detailLoading,
    active: context?.surface === "page-builder",
    setPreviewState: context?.setPreviewState,
  });
  const bindingStatus = resolveFieldBindingStatus(normalized, detail);
  const selectedForm =
    forms.find((form) => form.id === normalized.submission.formId) ?? detail?.form ?? null;
  const formOptions =
    selectedForm && !forms.some((form) => form.id === selectedForm.id)
      ? [selectedForm, ...forms]
      : forms;
  const actionTargetsSharedFormsRoute =
    transport.actionStatus === "valid" && transport.actionUrl.startsWith("/forms/");
  const textContrast = resolveColorContrastAdvisory({
    foreground: normalized.style.textColor,
    background: normalized.style.background,
    fallbackBackground: "#ffffff",
  });
  const buttonContrast = resolveColorContrastAdvisory({
    foreground: normalized.style.buttonTextColor,
    background: normalized.style.buttonBackground,
    fallbackBackground: "#1f2937",
  });

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and form structure"
        description="Pick the layout here. Mobile behavior is documented directly on each card."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        <MinimalDescriptionNotice variant={resolvedVariant} />
      </EditorSection>

      <EditorSection
        title="Content and copy"
        description="Edit visible copy for the heading, description, and email placeholder."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.title}
            onChange={(event) => updateRoot(value, onChange, { title: event.target.value })}
            placeholder="Join our newsletter"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Description</p>
          <Textarea
            value={normalized.description}
            onChange={(event) => updateRoot(value, onChange, { description: event.target.value })}
            placeholder="Short supporting line"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Email placeholder</p>
          <Input
            value={normalized.placeholder}
            onChange={(event) => updateRoot(value, onChange, { placeholder: event.target.value })}
            placeholder="you@example.com"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Form semantics and consent"
        description="Keep field names, labels, and consent semantics explicit and accessible."
      >
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Email, first name, and consent field names must stay unique. Duplicate values normalize
          back to safe bounded names before runtime rendering.
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Email label</p>
          <Input
            value={normalized.form.emailLabel}
            onChange={(event) => updateForm(value, onChange, { emailLabel: event.target.value })}
            placeholder="Email address"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-2">
          <div>
            <p className="text-sm font-medium">Show visible email label</p>
            <p className="text-xs text-muted-foreground">
              Leave this off to keep the label accessible but visually hidden.
            </p>
          </div>
          <Switch
            checked={normalized.form.showEmailLabel}
            onCheckedChange={(checked) => updateForm(value, onChange, { showEmailLabel: checked })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Email field name</p>
          <Input
            value={normalized.form.emailFieldName}
            onChange={(event) =>
              updateForm(value, onChange, { emailFieldName: event.target.value })
            }
            placeholder="email"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">First name field</p>
            <p className="text-xs text-muted-foreground">
              Keep Newsletter bounded: email stays required, first name stays optional unless you
              explicitly require it.
            </p>
          </div>
          <Switch
            checked={normalized.form.firstName.enabled}
            onCheckedChange={(checked) =>
              updateFirstNameField(value, onChange, { enabled: checked })
            }
          />
        </div>

        {normalized.form.firstName.enabled ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">First name label</p>
              <Input
                value={normalized.form.firstName.label}
                onChange={(event) =>
                  updateFirstNameField(value, onChange, { label: event.target.value })
                }
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">First name placeholder</p>
              <Input
                value={normalized.form.firstName.placeholder}
                onChange={(event) =>
                  updateFirstNameField(value, onChange, { placeholder: event.target.value })
                }
                placeholder="Your first name"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">First name field name</p>
              <Input
                value={normalized.form.firstName.fieldName}
                onChange={(event) =>
                  updateFirstNameField(value, onChange, { fieldName: event.target.value })
                }
                placeholder="first_name"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">First name required</p>
                <p className="text-xs text-muted-foreground">
                  Enable this only when the target flow truly requires first name.
                </p>
              </div>
              <Switch
                checked={normalized.form.firstName.required}
                onCheckedChange={(checked) =>
                  updateFirstNameField(value, onChange, { required: checked })
                }
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Consent checkbox</p>
            <p className="text-xs text-muted-foreground">
              Render consent inside the form so browser validation and submitted values stay real.
            </p>
          </div>
          <Switch
            checked={consent.enabled}
            onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
          />
        </div>

        {consent.enabled ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Consent label</p>
              <Input
                value={consent.label}
                onChange={(event) => updateConsent(value, onChange, { label: event.target.value })}
                placeholder="I agree to receive updates."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Consent field name</p>
              <Input
                value={normalized.form.consentFieldName}
                onChange={(event) =>
                  updateForm(value, onChange, { consentFieldName: event.target.value })
                }
                placeholder="consent"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">Consent required</p>
                <p className="text-xs text-muted-foreground">
                  Unchecked consent blocks submit when this switch is on.
                </p>
              </div>
              <Switch
                checked={consent.required}
                onCheckedChange={(checked) => updateConsent(value, onChange, { required: checked })}
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Opt-in mode</p>
          <Select
            value={normalized.optIn.mode}
            onValueChange={(next) =>
              updateOptIn(value, onChange, { mode: next as NewsletterOptInMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select opt-in mode" />
            </SelectTrigger>
            <SelectContent>
              {optInModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {normalized.optIn.mode === "double" ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Confirmation copy</p>
              <Textarea
                value={normalized.optIn.confirmationCopy}
                onChange={(event) =>
                  updateOptIn(value, onChange, { confirmationCopy: event.target.value })
                }
                placeholder="Please check your inbox to confirm your subscription."
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Newsletter exposes confirmation copy only in this leaf. Double opt-in enforcement
              remains provider-owned until a dedicated backend owner lands.
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Submission runtime"
        description="Choose native external submit or bind to the existing shared Forms runtime."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Submission mode</p>
          <Select
            value={normalized.submission.mode}
            onValueChange={(next) =>
              updateSubmission(value, onChange, { mode: next as NewsletterSubmissionMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select submission mode" />
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

        {normalized.submission.mode === "forms-runtime" ? (
          <>
            <RuntimeBindingSummary value={normalized} />

            <div className="space-y-2">
              <p className="text-sm font-medium">Bound form</p>
              <Select
                value={selectedForm ? selectedForm.id : NO_FORM_VALUE}
                onValueChange={(next) =>
                  updateSubmission(value, onChange, {
                    formId: next === NO_FORM_VALUE ? "" : next,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={formsLoading ? "Loading forms..." : "Select form"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedForm === null ? (
                    <SelectItem value={NO_FORM_VALUE} disabled>
                      {forms.length === 0
                        ? formsLoading
                          ? "Loading forms..."
                          : "No forms found"
                        : "Select form"}
                    </SelectItem>
                  ) : null}
                  {formOptions.map((form) => (
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
                <span className="font-semibold"> forms.submit </span>scope. Newsletter should stay
                static on public pages for this binding.
              </div>
            ) : null}

            {detailLoading ? (
              <p className="text-xs text-muted-foreground">Loading form fields...</p>
            ) : null}
            {detailError ? <p className="text-xs text-destructive">{detailError}</p> : null}

            {detail && !bindingStatus.ready ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {bindingStatus.missingExpectedFields.length > 0 ? (
                  <p>
                    Missing matching Form fields:{" "}
                    {bindingStatus.missingExpectedFields.map((field) => field.name).join(", ")}.
                  </p>
                ) : null}
                {bindingStatus.requiredMismatchFields.length > 0 ? (
                  <p>
                    These bound Form fields are required, so Newsletter must require them too:{" "}
                    {bindingStatus.requiredMismatchFields.map((field) => field.name).join(", ")}.
                  </p>
                ) : null}
                {bindingStatus.unmappedRequiredFields.length > 0 ? (
                  <p>
                    Required Form fields are not rendered by Newsletter:{" "}
                    {bindingStatus.unmappedRequiredFields.map((field) => field.name).join(", ")}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {selectedForm?.successRedirectUrl ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                After a successful submit, the bound Form redirects to{" "}
                <span className="font-medium">{selectedForm.successRedirectUrl}</span>.
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Success redirects come from the bound Form settings or automation. This Form does
                not have a redirect configured.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Native submit uses the configured action URL or provider-owned webhook target. Loading,
            success, error, captcha, and redirect automation are only active when the shared Forms
            runtime owns the submit flow.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Loading message</p>
            <Input
              value={stateCopy.loadingMessage}
              onChange={(event) =>
                updateStateCopy(value, onChange, { loadingMessage: event.target.value })
              }
              placeholder="Sending..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Error message</p>
            <Input
              value={stateCopy.errorMessage}
              onChange={(event) =>
                updateStateCopy(value, onChange, { errorMessage: event.target.value })
              }
              placeholder="Unable to submit the form. Please try again."
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Button label</p>
          <Input
            value={submit.label}
            onChange={(event) => updateSubmit(value, onChange, { label: event.target.value })}
            placeholder="Subscribe"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Success message</p>
          <Input
            value={stateCopy.successMessage}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                stateCopy: {
                  ...current.stateCopy,
                  successMessage: event.target.value,
                },
                submit: {
                  ...current.submit,
                  successMessage: event.target.value,
                },
              }))
            }
            placeholder="Thanks for joining!"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Analytics event</p>
          <Input
            value={normalized.submission.analyticsEvent}
            onChange={(event) =>
              updateSubmission(value, onChange, { analyticsEvent: event.target.value })
            }
            placeholder="newsletter_submit"
          />
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={previewState === "form" ? "default" : "outline"}
              onClick={() => setPreviewState("form")}
            >
              Form state
            </Button>
            <Button
              type="button"
              variant={previewState === "success" ? "default" : "outline"}
              onClick={() => setPreviewState("success")}
            >
              Success state
            </Button>
          </div>
          <SuccessPreviewCard state={previewState} successMessage={stateCopy.successMessage} />
        </div>
      </EditorSection>

      <EditorSection
        title="Integration target"
        description="Keep action URLs safe and make the active transport explicit."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Integration mode</p>
          <Select
            value={transport.mode}
            onValueChange={(next) =>
              updateIntegration(value, onChange, { mode: next as NewsletterIntegrationMode })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select integration mode" />
            </SelectTrigger>
            <SelectContent>
              {integrationModeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {transport.mode === "action-url" ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Form action URL</p>
              <Input
                value={normalized.integration.actionUrl}
                onChange={(event) =>
                  updateIntegration(value, onChange, { actionUrl: event.target.value })
                }
                placeholder="https://example.com/subscribe"
              />
            </div>

            {normalized.submission.mode === "static" ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Native method</p>
                <Select
                  value={normalized.integration.method}
                  onValueChange={(next) =>
                    updateIntegration(value, onChange, { method: next as NewsletterMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {methodOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              {(() => {
                const action = normalizeNewsletterActionUrl(normalized.integration.actionUrl);
                if (action.status === "valid" && actionTargetsSharedFormsRoute) {
                  return normalized.submission.mode === "forms-runtime"
                    ? "This Coderso Forms route is valid because Submission mode is handled by the shared Forms runtime."
                    : "Coderso Forms routes require Submission mode = Forms runtime so nonce, captcha, and JSON submit stay aligned.";
                }
                if (action.status === "valid") {
                  return "Safe action URL detected.";
                }
                if (action.status === "empty") {
                  return "No action URL is configured yet. Native submit stays disabled until you add a safe target.";
                }
                return "Action URL must be https:// or an approved `/forms/:id/submissions` path. Bare domains, localhost, and admin/internal paths are rejected.";
              })()}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Webhook ID</p>
              <Input
                value={normalized.integration.webhookId}
                onChange={(event) =>
                  updateIntegration(value, onChange, { webhookId: event.target.value })
                }
                placeholder="webhook_newsletter_signup"
              />
            </div>
            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              Webhook mode keeps only a safe identifier in widget data. It becomes actionable only
              when a shared backend owner or runtime binding handles it.
            </div>
          </>
        )}
      </EditorSection>

      <EditorSection
        title="Colors and emphasis"
        description="Keep the section readable with bounded widget-local colors and advisory contrast checks."
      >
        <ColorField
          label="Background color"
          value={normalized.style.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          onClear={() => clearStyleField(value, onChange, "background")}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
        <p className="text-xs text-muted-foreground">
          Transparent stays the saved default. The color picker fallback only controls the swatch UI
          when no hex color is stored.
        </p>

        <ColorField
          label="Text color"
          value={normalized.style.textColor}
          onChange={(next) => updateStyle(value, onChange, { textColor: next })}
          onClear={() => clearStyleField(value, onChange, "textColor")}
          placeholder="var(--color-text)"
          pickerFallback={resolveColorPickerValue(normalized.style.textColor, "#111827")}
        />
        <p className="text-xs text-muted-foreground">{textContrast.message}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <ColorField
            label="Button background"
            value={normalized.style.buttonBackground}
            onChange={(next) => updateStyle(value, onChange, { buttonBackground: next })}
            onClear={() => clearStyleField(value, onChange, "buttonBackground")}
            placeholder="var(--color-primary)"
            pickerFallback={resolveColorPickerValue(normalized.style.buttonBackground, "#111827")}
          />
          <ColorField
            label="Button text"
            value={normalized.style.buttonTextColor}
            onChange={(next) => updateStyle(value, onChange, { buttonTextColor: next })}
            onClear={() => clearStyleField(value, onChange, "buttonTextColor")}
            placeholder="var(--color-bg)"
            pickerFallback={resolveColorPickerValue(normalized.style.buttonTextColor, "#ffffff")}
          />
        </div>
        <p className="text-xs text-muted-foreground">{buttonContrast.message}</p>
      </EditorSection>

      <EditorSection
        title="Spacing and alignment"
        description="Keep width and spacing bounded to the Newsletter-local contract."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing</p>
            <Select
              value={normalized.style.spacing}
              onValueChange={(next) =>
                updateStyle(value, onChange, { spacing: next as NewsletterSpacing })
              }
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
            <p className="text-sm font-medium">Alignment</p>
            <Select
              value={normalized.style.alignment}
              onValueChange={(next) =>
                updateStyle(value, onChange, {
                  alignment: next as StyleData["alignment"],
                })
              }
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
            <p className="text-sm font-medium">Width</p>
            <Select
              value={normalized.style.width}
              onValueChange={(next) =>
                updateStyle(value, onChange, { width: next as NewsletterWidth })
              }
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
        </div>
      </EditorSection>
    </div>
  );
}

export function NewsletterAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeNewsletterData(value);
  const transport = resolveNewsletterTransport(normalized.integration);
  const action = normalizeNewsletterActionUrl(normalized.integration.actionUrl);
  const formsRuntimeActive = normalized.submission.mode === "forms-runtime";
  const actionTargetsSharedFormsRoute =
    action.status === "valid" && normalized.integration.actionUrl.trim().startsWith("/forms/");
  const [normalizationArmed, setNormalizationArmed] = useState(false);
  const [normalizationMessage, setNormalizationMessage] = useState("");

  return (
    <div className="space-y-4">
      <EditorSection
        title="Transport diagnostics"
        description="Technical summary for the active submit path and ignored metadata."
      >
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>Resolved variant: {resolveNewsletterVariant(variant)}.</p>
          <p>Submission mode: {normalized.submission.mode}.</p>
          <p>
            Active integration field:{" "}
            {formsRuntimeActive
              ? "bound Forms record"
              : transport.activeField === "actionUrl"
                ? "action URL"
                : "webhook ID"}
            .
          </p>
          <p>Action status: {formsRuntimeActive ? "runtime-owned" : action.status}.</p>
          <p>Method: {formsRuntimeActive ? "post via shared runtime" : transport.method}.</p>
          <p>
            Submit readiness:{" "}
            {formsRuntimeActive
              ? normalized.submission.formId.trim().length > 0
                ? "waiting for runtime hydration"
                : "missing bound form"
              : action.status === "valid" && !actionTargetsSharedFormsRoute
                ? "ready"
                : actionTargetsSharedFormsRoute
                  ? "switch submission mode to forms-runtime"
                  : "not ready"}
            .
          </p>
          <p>
            Ignored field:{" "}
            {formsRuntimeActive
              ? "the action URL and webhook ID stay inactive while the bound Form owns submit."
              : transport.activeField === "actionUrl"
                ? "webhook ID"
                : "action URL"}
            .
          </p>
        </div>
      </EditorSection>

      <EditorSection
        title="Integration metadata summary"
        description="Read-only transport metadata. Visual owns integration setup."
      >
        <ReadonlyWidgetSummaryRow
          id="newsletter-advanced-integration-mode"
          label="Integration mode"
          path="integration.mode"
          value={normalized.integration.mode}
        />
        <ReadonlyWidgetSummaryRow
          id="newsletter-advanced-action-status"
          label="Action status"
          path="integration.actionUrl"
          value={formsRuntimeActive ? "Runtime-owned" : action.status}
        />
        <ReadonlyWidgetSummaryRow
          id="newsletter-advanced-webhook"
          label="Webhook"
          path="integration.webhookId"
          value={normalized.integration.webhookId ? "Configured" : "Not configured"}
        />
        <ReadonlyWidgetSummaryRow
          id="newsletter-advanced-method"
          label="HTTP method"
          path="integration.method"
          value={formsRuntimeActive ? "POST via shared runtime" : transport.method}
        />
      </EditorSection>

      <EditorSection
        title="Normalization and fallback"
        description="Confirmed support action for deterministic payload cleanup."
      >
        <WidgetControlRow
          id="newsletter-advanced-normalize-action"
          label="Normalize payload"
          ownership="action"
          help="This support action rewrites fallback values after explicit confirmation."
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
                const after = JSON.stringify(normalized);
                onChange(normalized);
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
        {normalizationMessage ? (
          <p className="text-xs text-muted-foreground" role="status">
            {normalizationMessage}
          </p>
        ) : null}
      </EditorSection>
    </div>
  );
}
