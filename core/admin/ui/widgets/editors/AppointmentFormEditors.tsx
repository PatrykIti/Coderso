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
import { LinkDestinationField } from "./LinkDestinationField";
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

const DEFAULT_BOOKING_FLOW_ID = "booking-flow";
const DEFAULT_FLOW_SELECT_VALUE = "__coderso_booking_flow_default__";
const SAVED_FLOW_SELECT_VALUE = "__coderso_booking_flow_saved__";
const DEFAULT_LOCALE_SELECT_VALUE = "__coderso_locale_default__";

const localePresetOptions = [
  { value: DEFAULT_LOCALE_SELECT_VALUE, label: "Site or visitor default", locale: "" },
  { value: "en-US", label: "English (US)", locale: "en-US" },
  { value: "en-GB", label: "English (UK)", locale: "en-GB" },
  { value: "pl-PL", label: "Polish", locale: "pl-PL" },
  { value: "de-DE", label: "German", locale: "de-DE" },
  { value: "fr-FR", label: "French", locale: "fr-FR" },
  { value: "es-ES", label: "Spanish", locale: "es-ES" },
] as const;

const normalizeControlId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const controlAttrs = (id: string, path?: string) =>
  path
    ? {
        "data-widget-control": normalizeControlId(id),
        "data-widget-control-path": path,
        "data-widget-control-ownership": "writable",
      }
    : {};

const findCalendarForFlow = (
  calendars: WidgetEditorBookingFlowSummary[],
  flowId: string | undefined
) => calendars.find((calendar) => calendar.flowId === (flowId ?? DEFAULT_BOOKING_FLOW_ID));

const describeBookingFlow = (
  flowId: string | undefined,
  calendars: WidgetEditorBookingFlowSummary[]
) => {
  const normalizedFlowId = flowId ?? DEFAULT_BOOKING_FLOW_ID;
  const matchedCalendar = findCalendarForFlow(calendars, normalizedFlowId);
  if (matchedCalendar) return `Paired with ${matchedCalendar.label}`;
  if (normalizedFlowId === DEFAULT_BOOKING_FLOW_ID) return "Default booking flow";
  return "Saved custom booking flow";
};

const describeEndpointStatus = (value: string | undefined, fallback: string) =>
  value === fallback ? "Default reservation route" : "Custom route configured";

const resolveLocaleSelectValue = (value: string | undefined) => {
  if (!value) return DEFAULT_LOCALE_SELECT_VALUE;
  return localePresetOptions.some((option) => option.locale === value) ? value : value;
};

const buildLocaleOptions = (value: string | undefined) => [
  ...localePresetOptions.map((option) => ({ value: option.value, label: option.label })),
  ...(value && !localePresetOptions.some((option) => option.locale === value)
    ? [{ value, label: "Saved custom locale" }]
    : []),
];

const localeValueFromSelect = (value: string) =>
  localePresetOptions.find((option) => option.value === value)?.locale ?? value;

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
  path,
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  path?: string;
}) {
  return (
    <label className="space-y-1 text-sm" {...controlAttrs(label, path)}>
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
  path,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  path?: string;
}) {
  return (
    <label className="space-y-1 text-sm" {...controlAttrs(label, path)}>
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
  path,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  path?: string;
}) {
  return (
    <label className="space-y-1 text-sm" {...controlAttrs(label, path)}>
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
  path,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  path?: string;
}) {
  return (
    <label
      className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
      {...controlAttrs(label, path)}
    >
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
        controlId="appointment-form-frame-background"
        controlPath="style.frameBackground"
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
        controlId="appointment-form-frame-border"
        controlPath="style.frameBorderColor"
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
        controlId="appointment-form-summary-background"
        controlPath="style.summaryBackground"
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
        controlId="appointment-form-summary-border"
        controlPath="style.summaryBorderColor"
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
        controlId="appointment-form-submit-background"
        controlPath="style.submitBackground"
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
        controlId="appointment-form-submit-text-color"
        controlPath="style.submitTextColor"
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
        No Booking Calendar is available on this surface yet. Add a calendar here, then choose it
        from the setup picker.
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

  return (
    <div
      className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700"
      data-appointment-flow-feedback="mismatch"
    >
      {flowId === DEFAULT_BOOKING_FLOW_ID
        ? "Choose a visible Booking Calendar above to pair this form."
        : "This form keeps a saved custom pairing. Choose a visible Booking Calendar above to reconnect it without editing technical keys."}
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
  const flowId = normalized.flowId ?? DEFAULT_BOOKING_FLOW_ID;
  const matchedCalendar = findCalendarForFlow(calendars, flowId);
  const flowSelectValue =
    matchedCalendar?.blockId ??
    (flowId === DEFAULT_BOOKING_FLOW_ID ? DEFAULT_FLOW_SELECT_VALUE : SAVED_FLOW_SELECT_VALUE);

  return (
    <div className="space-y-4">
      <Section
        id="appointment-form.wizard.flow-setup"
        mode="wizard"
        role="setup"
        title="Flow"
        description="Choose the Booking Calendar this form should use. Pairing keys stay managed by the builder."
      >
        <SelectField
          label="Booking calendar"
          path="flowId"
          value={flowSelectValue}
          options={[
            { value: DEFAULT_FLOW_SELECT_VALUE, label: "Default booking flow" },
            ...calendars.map((calendar) => ({
              value: calendar.blockId,
              label: calendar.label,
            })),
            ...(flowSelectValue === SAVED_FLOW_SELECT_VALUE
              ? [{ value: SAVED_FLOW_SELECT_VALUE, label: "Saved custom booking flow" }]
              : []),
          ]}
          onChange={(next) => {
            if (next === DEFAULT_FLOW_SELECT_VALUE) {
              update(normalized, onChange, { flowId: DEFAULT_BOOKING_FLOW_ID });
              return;
            }
            const calendar = calendars.find((candidate) => candidate.blockId === next);
            if (calendar) update(normalized, onChange, { flowId: calendar.flowId });
          }}
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
  context,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);
  const calendars = context?.bookingFlows?.calendars ?? [];
  const showEmail = normalized.showEmail !== false;
  const showPhone = normalized.showPhone !== false;
  const showNotes = normalized.showNotes !== false;
  const splitName = normalized.nameMode === "split";
  const phoneValidationPreset = resolvePhoneValidationPreset(normalized.phonePattern);

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
          path="variant"
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
          label="Booking flow"
          path="flowId"
          value={describeBookingFlow(normalized.flowId, calendars)}
        />
        <SelectField
          label="Form language"
          value={resolveLocaleSelectValue(normalized.locale)}
          path="locale"
          options={buildLocaleOptions(normalized.locale)}
          onChange={(next) => update(normalized, onChange, { locale: localeValueFromSelect(next) })}
        />
        <LinkDestinationField
          fieldId="appointment-form-success-destination"
          label="After submit destination"
          value={normalized.successRedirectUrl}
          onChange={(next) => update(normalized, onChange, { successRedirectUrl: next })}
          controlPath="successRedirectUrl"
          emptyLabel="Stay on this page"
          helpText="Choose a published site page for successful bookings. Custom destinations stay replace-or-clear only."
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
          path="title"
        />
        <label className="space-y-1 text-sm" {...controlAttrs("Description", "description")}>
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
          path="submitLabel"
        />
        <TextField
          label="Loading message"
          value={normalized.loadingMessage}
          onChange={(next) => update(normalized, onChange, { loadingMessage: next })}
          path="loadingMessage"
        />
        <TextField
          label="Success message"
          value={normalized.successMessage}
          onChange={(next) => update(normalized, onChange, { successMessage: next })}
          path="successMessage"
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
          path="slotSummaryLabel"
        />
        <TextField
          label="Empty summary message"
          value={normalized.slotSummaryEmptyMessage}
          onChange={(next) => update(normalized, onChange, { slotSummaryEmptyMessage: next })}
          path="slotSummaryEmptyMessage"
        />
        <TextField
          label="No selection error"
          value={normalized.noSelectionMessage}
          onChange={(next) => update(normalized, onChange, { noSelectionMessage: next })}
          path="noSelectionMessage"
        />
        <ToggleField
          label="Include service in summary"
          checked={normalized.showServiceInSummary !== false}
          path="showServiceInSummary"
          onCheckedChange={(next) => update(normalized, onChange, { showServiceInSummary: next })}
        />
        <ToggleField
          label="Include resource in summary"
          checked={normalized.showResourceInSummary !== false}
          path="showResourceInSummary"
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
          path="nameMode"
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
              path="customerFirstNameLabel"
            />
            <TextField
              label="First name placeholder"
              value={normalized.customerFirstNamePlaceholder}
              path="customerFirstNamePlaceholder"
              onChange={(next) =>
                update(normalized, onChange, { customerFirstNamePlaceholder: next })
              }
            />
            <TextField
              label="Last name label"
              value={normalized.customerLastNameLabel}
              onChange={(next) => update(normalized, onChange, { customerLastNameLabel: next })}
              path="customerLastNameLabel"
            />
            <TextField
              label="Last name placeholder"
              value={normalized.customerLastNamePlaceholder}
              path="customerLastNamePlaceholder"
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
              path="customerNameLabel"
            />
            <TextField
              label="Name placeholder"
              value={normalized.customerNamePlaceholder}
              onChange={(next) => update(normalized, onChange, { customerNamePlaceholder: next })}
              path="customerNamePlaceholder"
            />
          </>
        )}
        <ToggleField
          label="Show email field"
          checked={showEmail}
          path="showEmail"
          onCheckedChange={(next) => update(normalized, onChange, { showEmail: next })}
        />
        {showEmail ? (
          <>
            <ToggleField
              label="Require email field"
              checked={normalized.requiredEmail === true}
              path="requiredEmail"
              onCheckedChange={(next) => update(normalized, onChange, { requiredEmail: next })}
            />
            <TextField
              label="Email label"
              value={normalized.customerEmailLabel}
              onChange={(next) => update(normalized, onChange, { customerEmailLabel: next })}
              path="customerEmailLabel"
            />
            <TextField
              label="Email placeholder"
              value={normalized.customerEmailPlaceholder}
              onChange={(next) => update(normalized, onChange, { customerEmailPlaceholder: next })}
              path="customerEmailPlaceholder"
            />
          </>
        ) : null}
        <ToggleField
          label="Show phone field"
          checked={showPhone}
          path="showPhone"
          onCheckedChange={(next) => update(normalized, onChange, { showPhone: next })}
        />
        {showPhone ? (
          <>
            <ToggleField
              label="Require phone field"
              checked={normalized.requiredPhone === true}
              path="requiredPhone"
              onCheckedChange={(next) => update(normalized, onChange, { requiredPhone: next })}
            />
            <TextField
              label="Phone label"
              value={normalized.customerPhoneLabel}
              onChange={(next) => update(normalized, onChange, { customerPhoneLabel: next })}
              path="customerPhoneLabel"
            />
            <TextField
              label="Phone placeholder"
              value={normalized.customerPhonePlaceholder}
              onChange={(next) => update(normalized, onChange, { customerPhonePlaceholder: next })}
              path="customerPhonePlaceholder"
            />
            <SelectField
              label="Phone validation"
              value={phoneValidationPreset}
              path="phonePattern"
              onChange={(next) => {
                const preset = phoneValidationPresets.find((item) => item.value === next);
                if (!preset) return;
                update(normalized, onChange, {
                  phonePattern: preset.pattern,
                  phonePatternMessage: preset.message,
                });
              }}
              options={[
                ...(phoneValidationPreset === "custom"
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
              path="phonePatternMessage"
            />
          </>
        ) : null}
        <ToggleField
          label="Show notes field"
          checked={showNotes}
          path="showNotes"
          onCheckedChange={(next) => update(normalized, onChange, { showNotes: next })}
        />
        {showNotes ? (
          <>
            <TextField
              label="Notes label"
              value={normalized.notesLabel}
              onChange={(next) => update(normalized, onChange, { notesLabel: next })}
              path="notesLabel"
            />
            <TextField
              label="Notes placeholder"
              value={normalized.notesPlaceholder}
              onChange={(next) => update(normalized, onChange, { notesPlaceholder: next })}
              path="notesPlaceholder"
            />
            <NumberField
              label="Notes max length"
              value={normalized.notesMaxLength ?? 500}
              min={50}
              max={2000}
              path="notesMaxLength"
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
            data-widget-control="appointment-form-custom-fields-add"
            data-widget-control-ownership="action"
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
                data-widget-control={`appointment-form-custom-fields-${index + 1}-remove`}
                data-widget-control-ownership="action"
                onClick={() => removeCustomField(normalized, onChange, index)}
              >
                Remove
              </Button>
            </div>
            <TextField
              label="Field label"
              value={field.label}
              onChange={(next) => updateCustomField(normalized, onChange, index, { label: next })}
              path="customFields.label"
            />
            <SelectField
              label="Field type"
              value={field.type}
              path="customFields.type"
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
              path="customFields.required"
              onCheckedChange={(next) =>
                updateCustomField(normalized, onChange, index, { required: next })
              }
            />
            {field.type !== "checkbox" ? (
              <TextField
                label="Placeholder"
                value={field.placeholder}
                path="customFields.placeholder"
                onChange={(next) =>
                  updateCustomField(normalized, onChange, index, { placeholder: next })
                }
              />
            ) : null}
            {field.type === "select" ? (
              <label
                className="space-y-1 text-sm"
                {...controlAttrs("Options", "customFields.options")}
              >
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
          path="consent.enabled"
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
              path="consent.label"
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
              path="consent.required"
              onCheckedChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    required: next,
                  },
                })
              }
            />
            <LinkDestinationField
              fieldId="appointment-form-privacy-destination"
              label="Privacy page"
              value={normalized.consent?.privacyUrl}
              onChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    privacyUrl: next,
                  },
                })
              }
              controlPath="consent.privacyUrl"
              emptyLabel="No privacy page"
              helpText="Choose a published site page for the privacy link. Custom destinations stay replace-or-clear only."
            />
            <LinkDestinationField
              fieldId="appointment-form-terms-destination"
              label="Terms page"
              value={normalized.consent?.termsUrl}
              onChange={(next) =>
                update(normalized, onChange, {
                  consent: {
                    ...normalized.consent,
                    termsUrl: next,
                  },
                })
              }
              controlPath="consent.termsUrl"
              emptyLabel="No terms page"
              helpText="Choose a published site page for the terms link. Custom destinations stay replace-or-clear only."
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
  context,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);
  const nonceStatus = normalized.resolved?.submissionNonce
    ? "Injected by server"
    : "Not injected in editor";
  const captcha = normalized.resolved?.captcha;
  const calendars = context?.bookingFlows?.calendars ?? [];

  return (
    <div className="space-y-4">
      <Section
        id="appointment-form.advanced.runtime-endpoint"
        mode="advanced"
        role="diagnostics"
        title="Runtime route"
        description="Read-only support status for the server-owned reservation submit route."
      >
        <ReadonlyWidgetSummaryRow
          id="appointment-form-advanced-submission-endpoint"
          label="Reservation submit route"
          path="submissionEndpoint"
          value={describeEndpointStatus(normalized.submissionEndpoint, "/api/booking/reservations")}
          help="Custom routes remain backward-compatible but are not edited in normal widget authoring."
        />
        <ReadonlyWidgetSummaryRow
          id="appointment-form-advanced-booking-flow"
          label="Booking flow"
          path="flowId"
          value={describeBookingFlow(normalized.flowId, calendars)}
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
          value={captcha ? "Configured" : "Not configured"}
          help="Provider/action details stay backend-owned; the editor only shows whether visitor protection is available."
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
