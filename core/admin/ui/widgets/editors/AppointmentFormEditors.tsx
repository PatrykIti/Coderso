import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  appointmentFormDefaults,
  normalizeAppointmentFormData,
  type AppointmentCustomField,
  type AppointmentFormData,
} from "../../../../widgets/core/appointmentForm";
import type {
  EditorMode,
  WidgetEditorBookingFlowSummary,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const update = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  patch: Partial<AppointmentFormData>
) => {
  onChange(
    normalizeAppointmentFormData({
      ...normalizeAppointmentFormData(value),
      ...patch,
    })
  );
};

const updateStyle = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  patch: Partial<NonNullable<AppointmentFormData["style"]>>
) => {
  const current = normalizeAppointmentFormData(value);
  onChange(
    normalizeAppointmentFormData({
      ...current,
      style: {
        ...current.style,
        ...patch,
      },
    })
  );
};

const clearStyle = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  key: keyof NonNullable<AppointmentFormData["style"]>
) => {
  const current = normalizeAppointmentFormData(value);
  const { [key]: _removed, ...nextStyle } = current.style ?? {};
  onChange(
    normalizeAppointmentFormData({
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    })
  );
};

const createCustomFieldDraft = (index: number): AppointmentCustomField => ({
  id: `custom-field-${index + 1}`,
  label: `Custom field ${index + 1}`,
  type: "text",
  required: false,
  placeholder: "",
});

const updateCustomField = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  index: number,
  patch: Partial<AppointmentCustomField>
) => {
  const current = normalizeAppointmentFormData(value);
  const nextFields = [...(current.customFields ?? [])];
  const existing = nextFields[index];
  if (!existing) return;
  nextFields[index] = {
    ...existing,
    ...patch,
  };
  onChange(
    normalizeAppointmentFormData({
      ...current,
      customFields: nextFields,
    })
  );
};

const addCustomField = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void
) => {
  const current = normalizeAppointmentFormData(value);
  const nextFields = [...(current.customFields ?? [])];
  if (nextFields.length >= 12) return;
  nextFields.push(createCustomFieldDraft(nextFields.length));
  onChange(
    normalizeAppointmentFormData({
      ...current,
      customFields: nextFields,
    })
  );
};

const removeCustomField = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  index: number
) => {
  const current = normalizeAppointmentFormData(value);
  const nextFields = (current.customFields ?? []).filter((_, itemIndex) => itemIndex !== index);
  onChange(
    normalizeAppointmentFormData({
      ...current,
      customFields: nextFields,
    })
  );
};

const serializeOptionsDraft = (options: string[] | undefined) => (options ?? []).join("\n");

const parseOptionsDraft = (value: string) =>
  value
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);

const phoneValidationPresets = [
  {
    value: "default",
    label: "Default international",
    pattern: appointmentFormDefaults.phonePattern ?? "^\\+?[0-9()\\-.\\s]{7,20}$",
    message:
      appointmentFormDefaults.phonePatternMessage ??
      "Use digits, spaces, parentheses, or an optional leading +.",
  },
  {
    value: "digits-spaces",
    label: "Digits and spaces",
    pattern: "^[0-9\\s]{7,20}$",
    message: "Use 7-20 digits and spaces.",
  },
  {
    value: "not-required",
    label: "No extra validation",
    pattern: "",
    message: "",
  },
] as const;

const resolvePhoneValidationPreset = (pattern: string | undefined) =>
  phoneValidationPresets.find((preset) => preset.pattern === (pattern ?? ""))?.value ?? "custom";

function Section({
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || value))}
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function SurfaceFields({
  value,
  onChange,
}: {
  value: AppointmentFormData;
  onChange: (next: AppointmentFormData) => void;
}) {
  return (
    <Section
      id="appointment-form.visual.surface"
      mode="visual"
      role="visual"
      title="Surface"
      description="Decorative form shell and summary colors."
    >
      <SharedColorControl
        label="Frame background"
        value={value.style?.frameBackground}
        onChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { frameBackground: next })}
        onClear={() => clearStyle(value, onChange, "frameBackground")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
        showValueInput={false}
      />
      <SharedColorControl
        label="Frame border"
        value={value.style?.frameBorderColor}
        onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "frameBorderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#d4d4d8"
        showValueInput={false}
      />
      <SharedColorControl
        label="Summary background"
        value={value.style?.summaryBackground}
        onChange={(next) => updateStyle(value, onChange, { summaryBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { summaryBackground: next })}
        onClear={() => clearStyle(value, onChange, "summaryBackground")}
        placeholder="var(--color-bg)"
        pickerFallback="#f8fafc"
        showValueInput={false}
      />
      <SharedColorControl
        label="Summary border"
        value={value.style?.summaryBorderColor}
        onChange={(next) => updateStyle(value, onChange, { summaryBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { summaryBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "summaryBorderColor")}
        placeholder="var(--color-border)"
        pickerFallback="#d4d4d8"
        showValueInput={false}
      />
      <SharedColorControl
        label="Submit background"
        value={value.style?.submitBackground}
        onChange={(next) => updateStyle(value, onChange, { submitBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { submitBackground: next })}
        onClear={() => clearStyle(value, onChange, "submitBackground")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
        showValueInput={false}
      />
      <SharedColorControl
        label="Submit text color"
        value={value.style?.submitTextColor}
        onChange={(next) => updateStyle(value, onChange, { submitTextColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { submitTextColor: next })}
        onClear={() => clearStyle(value, onChange, "submitTextColor")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
        showValueInput={false}
      />
    </Section>
  );
}

function FlowPairingNotice({
  flowId,
  calendars,
}: {
  flowId: string;
  calendars: WidgetEditorBookingFlowSummary[];
}) {
  if (calendars.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        data-appointment-flow-feedback="missing"
      >
        No Booking Calendar on this surface uses a shared flow yet. Add one here or reuse this form
        on a surface that already contains a matching calendar.
      </div>
    );
  }

  const matches = calendars.filter((calendar) => calendar.flowId === flowId);
  if (matches.length > 0) {
    const labels = matches.map((calendar) => calendar.label).join(", ");
    return (
      <div
        className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700"
        data-appointment-flow-feedback="matched"
      >
        {matches.length === 1
          ? `Matched Booking Calendar on this surface: ${labels}.`
          : `Matched ${matches.length} Booking Calendars on this surface: ${labels}.`}
      </div>
    );
  }

  const availableFlowIds = Array.from(new Set(calendars.map((calendar) => calendar.flowId))).join(
    ", "
  );
  return (
    <div
      className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700"
      data-appointment-flow-feedback="mismatch"
    >
      This flow key does not match a Booking Calendar on this surface. Available flow keys:{" "}
      {availableFlowIds}.
    </div>
  );
}

export function AppointmentFormWizardEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);
  const calendars = context?.bookingFlows?.calendars ?? [];

  return (
    <div className="space-y-4">
      <Section
        id="appointment-form.wizard.flow-setup"
        mode="wizard"
        role="setup"
        title="Flow"
        description="Use the same flow key as Booking Calendar to receive selected slot."
      >
        <TextField
          label="Flow key"
          value={normalized.flowId}
          onChange={(next) => update(normalized, onChange, { flowId: next })}
          placeholder="booking-flow"
        />
        <FlowPairingNotice flowId={normalized.flowId ?? "booking-flow"} calendars={calendars} />
      </Section>
    </div>
  );
}

export function AppointmentFormVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);
  const showEmail = normalized.showEmail !== false;
  const showPhone = normalized.showPhone !== false;
  const showNotes = normalized.showNotes !== false;
  const splitName = normalized.nameMode === "split";

  return (
    <div className="space-y-4">
      <Section
        id="appointment-form.visual.variant-flow"
        mode="visual"
        role="layout"
        title="Variant and flow behavior"
        description="Daily presentation and post-submit routing for this form."
      >
        <SelectField
          label="Variant"
          value={variant || "default"}
          onChange={(next) => onVariantChange?.(next)}
          options={[
            { value: "default", label: "Default" },
            { value: "compact", label: "Compact" },
            { value: "inline", label: "Inline" },
            { value: "sidebar", label: "Sidebar" },
            { value: "card-summary", label: "Card summary" },
          ]}
        />
        <ReadonlyWidgetSummaryRow
          id="appointment-form-visual-flow-id"
          label="Flow key"
          path="flowId"
          value={normalized.flowId ?? "booking-flow"}
        />
        <TextField
          label="Locale override"
          value={normalized.locale}
          onChange={(next) => update(normalized, onChange, { locale: next })}
          placeholder="e.g. en-GB"
        />
        <TextField
          label="Success redirect URL"
          value={normalized.successRedirectUrl}
          onChange={(next) => update(normalized, onChange, { successRedirectUrl: next })}
          placeholder="/booking/confirmed"
        />
      </Section>

      <Section
        id="appointment-form.visual.copy"
        mode="visual"
        role="content"
        title="Copy"
        description="Main heading and confirmation copy."
      >
        <TextField
          label="Title"
          value={normalized.title}
          onChange={(next) => update(normalized, onChange, { title: next })}
        />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Description</span>
          <Textarea
            rows={3}
            value={normalized.description ?? ""}
            onChange={(event) => update(normalized, onChange, { description: event.target.value })}
          />
        </label>
        <TextField
          label="Submit button"
          value={normalized.submitLabel}
          onChange={(next) => update(normalized, onChange, { submitLabel: next })}
        />
        <TextField
          label="Loading message"
          value={normalized.loadingMessage}
          onChange={(next) => update(normalized, onChange, { loadingMessage: next })}
        />
        <TextField
          label="Success message"
          value={normalized.successMessage}
          onChange={(next) => update(normalized, onChange, { successMessage: next })}
        />
      </Section>

      <Section
        id="appointment-form.visual.slot-summary"
        mode="visual"
        role="content"
        title="Slot summary"
        description="Copy shown before a user selects a slot or submits without one."
      >
        <TextField
          label="Summary label"
          value={normalized.slotSummaryLabel}
          onChange={(next) => update(normalized, onChange, { slotSummaryLabel: next })}
        />
        <TextField
          label="Empty summary message"
          value={normalized.slotSummaryEmptyMessage}
          onChange={(next) => update(normalized, onChange, { slotSummaryEmptyMessage: next })}
        />
        <TextField
          label="No selection error"
          value={normalized.noSelectionMessage}
          onChange={(next) => update(normalized, onChange, { noSelectionMessage: next })}
        />
        <ToggleField
          label="Include service in summary"
          checked={normalized.showServiceInSummary !== false}
          onCheckedChange={(next) => update(normalized, onChange, { showServiceInSummary: next })}
        />
        <ToggleField
          label="Include resource in summary"
          checked={normalized.showResourceInSummary !== false}
          onCheckedChange={(next) => update(normalized, onChange, { showResourceInSummary: next })}
        />
      </Section>

      <Section
        id="appointment-form.visual.fields"
        mode="visual"
        role="content"
        title="Fields"
        description="Labels/placeholders for customer details."
      >
        <SelectField
          label="Name mode"
          value={normalized.nameMode ?? "full"}
          onChange={(next) =>
            update(normalized, onChange, {
              nameMode: next === "split" ? "split" : "full",
            })
          }
          options={[
            { value: "full", label: "Full name" },
            { value: "split", label: "First and last name" },
          ]}
        />
        {splitName ? (
          <>
            <TextField
              label="First name label"
              value={normalized.customerFirstNameLabel}
              onChange={(next) => update(normalized, onChange, { customerFirstNameLabel: next })}
            />
            <TextField
              label="First name placeholder"
              value={normalized.customerFirstNamePlaceholder}
              onChange={(next) =>
                update(normalized, onChange, { customerFirstNamePlaceholder: next })
              }
            />
            <TextField
              label="Last name label"
              value={normalized.customerLastNameLabel}
              onChange={(next) => update(normalized, onChange, { customerLastNameLabel: next })}
            />
            <TextField
              label="Last name placeholder"
              value={normalized.customerLastNamePlaceholder}
              onChange={(next) =>
                update(normalized, onChange, { customerLastNamePlaceholder: next })
              }
            />
          </>
        ) : (
          <>
            <TextField
              label="Name label"
              value={normalized.customerNameLabel}
              onChange={(next) => update(normalized, onChange, { customerNameLabel: next })}
            />
            <TextField
              label="Name placeholder"
              value={normalized.customerNamePlaceholder}
              onChange={(next) => update(normalized, onChange, { customerNamePlaceholder: next })}
            />
          </>
        )}
        <ToggleField
          label="Show email field"
          checked={showEmail}
          onCheckedChange={(next) => update(normalized, onChange, { showEmail: next })}
        />
        {showEmail ? (
          <>
            <ToggleField
              label="Require email field"
              checked={normalized.requiredEmail === true}
              onCheckedChange={(next) => update(normalized, onChange, { requiredEmail: next })}
            />
            <TextField
              label="Email label"
              value={normalized.customerEmailLabel}
              onChange={(next) => update(normalized, onChange, { customerEmailLabel: next })}
            />
            <TextField
              label="Email placeholder"
              value={normalized.customerEmailPlaceholder}
              onChange={(next) => update(normalized, onChange, { customerEmailPlaceholder: next })}
            />
          </>
        ) : null}
        <ToggleField
          label="Show phone field"
          checked={showPhone}
          onCheckedChange={(next) => update(normalized, onChange, { showPhone: next })}
        />
        {showPhone ? (
          <>
            <ToggleField
              label="Require phone field"
              checked={normalized.requiredPhone === true}
              onCheckedChange={(next) => update(normalized, onChange, { requiredPhone: next })}
            />
            <TextField
              label="Phone label"
              value={normalized.customerPhoneLabel}
              onChange={(next) => update(normalized, onChange, { customerPhoneLabel: next })}
            />
            <TextField
              label="Phone placeholder"
              value={normalized.customerPhonePlaceholder}
              onChange={(next) => update(normalized, onChange, { customerPhonePlaceholder: next })}
            />
            <SelectField
              label="Phone validation"
              value={resolvePhoneValidationPreset(normalized.phonePattern)}
              onChange={(next) => {
                const preset = phoneValidationPresets.find((item) => item.value === next);
                if (!preset) return;
                update(normalized, onChange, {
                  phonePattern: preset.pattern,
                  phonePatternMessage: preset.message,
                });
              }}
              options={[
                ...(resolvePhoneValidationPreset(normalized.phonePattern) === "custom"
                  ? [{ value: "custom", label: "Saved custom validation" }]
                  : []),
                ...phoneValidationPresets.map((preset) => ({
                  value: preset.value,
                  label: preset.label,
                })),
              ]}
            />
            <TextField
              label="Phone help text"
              value={normalized.phonePatternMessage}
              onChange={(next) => update(normalized, onChange, { phonePatternMessage: next })}
            />
          </>
        ) : null}
        <ToggleField
          label="Show notes field"
          checked={showNotes}
          onCheckedChange={(next) => update(normalized, onChange, { showNotes: next })}
        />
        {showNotes ? (
          <>
            <TextField
              label="Notes label"
              value={normalized.notesLabel}
              onChange={(next) => update(normalized, onChange, { notesLabel: next })}
            />
            <TextField
              label="Notes placeholder"
              value={normalized.notesPlaceholder}
              onChange={(next) => update(normalized, onChange, { notesPlaceholder: next })}
            />
            <NumberField
              label="Notes max length"
              value={normalized.notesMaxLength ?? 500}
              min={50}
              max={2000}
              onChange={(next) => update(normalized, onChange, { notesMaxLength: next })}
            />
          </>
        ) : null}
      </Section>

      <Section
        id="appointment-form.visual.custom-fields"
        mode="visual"
        role="content"
        title="Custom fields"
        description="Add bounded intake fields that serialize into metadata.customFields."
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Up to 12 widget-owned custom fields. Checkbox stores checked state; other fields store a
            text value.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCustomField(normalized, onChange)}
          >
            Add custom field
          </Button>
        </div>

        {(normalized.customFields ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom fields configured yet.</p>
        ) : null}

        {(normalized.customFields ?? []).map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Custom field {index + 1}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeCustomField(normalized, onChange, index)}
              >
                Remove
              </Button>
            </div>
            <TextField
              label="Field label"
              value={field.label}
              onChange={(next) => updateCustomField(normalized, onChange, index, { label: next })}
            />
            <SelectField
              label="Field type"
              value={field.type}
              onChange={(next) =>
                updateCustomField(normalized, onChange, index, {
                  type: next as AppointmentCustomField["type"],
                  ...(next === "select" ? {} : { options: undefined }),
                  ...(next === "checkbox" ? { placeholder: undefined } : {}),
                })
              }
              options={[
                { value: "text", label: "Text" },
                { value: "email", label: "Email" },
                { value: "phone", label: "Phone" },
                { value: "select", label: "Select" },
                { value: "checkbox", label: "Checkbox" },
                { value: "textarea", label: "Textarea" },
              ]}
            />
            <ToggleField
              label="Required field"
              checked={field.required === true}
              onCheckedChange={(next) =>
                updateCustomField(normalized, onChange, index, { required: next })
              }
            />
            {field.type !== "checkbox" ? (
              <TextField
                label="Placeholder"
                value={field.placeholder}
                onChange={(next) =>
                  updateCustomField(normalized, onChange, index, { placeholder: next })
                }
              />
            ) : null}
            {field.type === "select" ? (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">Options</span>
                <Textarea
                  rows={4}
                  value={serializeOptionsDraft(field.options)}
                  onChange={(event) =>
                    updateCustomField(normalized, onChange, index, {
                      options: parseOptionsDraft(event.target.value),
                    })
                  }
                  placeholder={"First option\nSecond option"}
                />
              </label>
            ) : null}
          </div>
        ))}
      </Section>

      <Section
        id="appointment-form.visual.consent"
        mode="visual"
        role="content"
        title="Consent and protection"
        description="Control visible consent copy and runtime verification behavior."
      >
        <ToggleField
          label="Show consent checkbox"
          checked={normalized.consent?.enabled === true}
          onCheckedChange={(next) =>
            update(normalized, onChange, {
              consent: {
                ...normalized.consent,
                enabled: next,
              },
            })
          }
        />
        {normalized.consent?.enabled ? (
          <>
            <TextField
              label="Consent label"
              value={normalized.consent?.label}
              onChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    label: next,
                  },
                })
              }
            />
            <ToggleField
              label="Require consent"
              checked={normalized.consent?.required === true}
              onCheckedChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    required: next,
                  },
                })
              }
            />
            <TextField
              label="Privacy URL"
              value={normalized.consent?.privacyUrl}
              onChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    privacyUrl: next,
                  },
                })
              }
              placeholder="/privacy"
            />
            <TextField
              label="Terms URL"
              value={normalized.consent?.termsUrl}
              onChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    termsUrl: next,
                  },
                })
              }
              placeholder="/terms"
            />
          </>
        ) : null}
      </Section>
      <SurfaceFields value={normalized} onChange={onChange} />
    </div>
  );
}

export function AppointmentFormAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);
  const nonceStatus = normalized.resolved?.submissionNonce
    ? "Injected by server"
    : "Not injected in editor";
  const captcha = normalized.resolved?.captcha;

  return (
    <div className="space-y-4">
      <Section
        id="appointment-form.advanced.runtime-endpoint"
        mode="advanced"
        role="technical"
        title="Runtime endpoint"
        description="Override only for advanced proxy setups."
      >
        <TextField
          label="Submission endpoint"
          value={normalized.submissionEndpoint}
          onChange={(next) => update(normalized, onChange, { submissionEndpoint: next })}
          placeholder="/api/booking/reservations"
        />
      </Section>

      <Section
        id="appointment-form.advanced.submission-security"
        mode="advanced"
        role="diagnostics"
        title="Submission security"
        description="Read-only server-injected public-write diagnostics. Secrets are redacted."
      >
        <ReadonlyWidgetSummaryRow
          id="appointment-form-advanced-submission-nonce"
          label="Submission nonce"
          path="resolved.submissionNonce"
          value={nonceStatus}
          help="Server-injected booking nonce. The editor shows presence only and never the raw nonce."
        />
        <ReadonlyWidgetSummaryRow
          id="appointment-form-advanced-captcha"
          label="Captcha"
          path="resolved.captcha"
          value={
            captcha
              ? `${captcha.provider ?? "provider"} · ${captcha.action ?? "action"} · site key ${
                  captcha.siteKey ? "configured" : "missing"
                }`
              : "Not configured"
          }
          help="Captcha diagnostics expose provider/action and site-key presence only."
        />
        <ReadonlyWidgetSummaryRow
          id="appointment-form-advanced-runtime-error"
          label="Runtime error"
          path="resolved.error"
          value={normalized.resolved?.error || "No runtime warning"}
          help="Diagnostic value from the runtime resolver when booking data cannot be hydrated safely."
        />
      </Section>
    </div>
  );
}
