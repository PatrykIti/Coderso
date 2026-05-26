import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../../widgets/core/bookingCalendar";
import type {
  EditorMode,
  WidgetEditorBookingFlowSummary,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { SharedColorControl } from "./SharedColorControl";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const update = (
  value: BookingCalendarData,
  onChange: (next: BookingCalendarData) => void,
  patch: Partial<BookingCalendarData>
) => {
  onChange(
    normalizeBookingCalendarData({
      ...normalizeBookingCalendarData(value),
      ...patch,
    })
  );
};

const updateStyle = (
  value: BookingCalendarData,
  onChange: (next: BookingCalendarData) => void,
  patch: Partial<NonNullable<BookingCalendarData["style"]>>
) => {
  const current = normalizeBookingCalendarData(value);
  onChange(
    normalizeBookingCalendarData({
      ...current,
      style: {
        ...current.style,
        ...patch,
      },
    })
  );
};

const clearStyle = (
  value: BookingCalendarData,
  onChange: (next: BookingCalendarData) => void,
  key: keyof NonNullable<BookingCalendarData["style"]>
) => {
  const current = normalizeBookingCalendarData(value);
  const { [key]: _removed, ...nextStyle } = current.style ?? {};
  onChange(
    normalizeBookingCalendarData({
      ...current,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : {},
    })
  );
};

const readPreviewResolved = (context: WidgetEditorProps<BookingCalendarData>["context"]) => {
  const preview = context?.widgetPreviewData?.bookingCalendarResolved;
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
    return null;
  }

  return normalizeBookingCalendarData({
    resolved: preview as BookingCalendarData["resolved"],
  }).resolved;
};

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

const describeEndpointStatus = (value: string | undefined, fallback: string) =>
  value === fallback ? "Default runtime route" : "Custom route configured";

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
  if (matchedCalendar) return `Matches ${matchedCalendar.label}`;
  if (normalizedFlowId === DEFAULT_BOOKING_FLOW_ID) return "Default booking flow";
  return "Saved custom booking flow";
};

const resolveServiceSummary = (
  serviceId: string | undefined,
  services: Array<{ id: string; name: string }>
) => {
  if (!serviceId) return "Auto-select first available service";
  return services.find((service) => service.id === serviceId)?.name ?? "Saved default service";
};

const resolveResourceSummary = (
  resourceId: string | undefined,
  resources: Array<{ id: string; name: string }>
) => {
  if (!resourceId) return "Auto-select first available resource";
  return resources.find((resource) => resource.id === resourceId)?.name ?? "Saved default resource";
};

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
  type = "text",
  path,
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  path?: string;
}) {
  return (
    <label className="space-y-1 text-sm" {...controlAttrs(label, path)}>
      <span className="font-medium text-foreground">{label}</span>
      <Input
        type={type}
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
  options,
  onChange,
  path,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
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

function ToggleField({
  label,
  description,
  checked,
  onChange,
  path,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  path?: string;
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-2 text-sm"
      {...controlAttrs(label, path)}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="space-y-1">
        <span className="block font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function CopyFields({
  value,
  onChange,
}: {
  value: BookingCalendarData;
  onChange: (next: BookingCalendarData) => void;
}) {
  return (
    <Section
      id="booking-calendar.visual.copy"
      mode="visual"
      role="content"
      title="Copy"
      description="Headings and helper messages shown to end users."
    >
      <TextField
        label="Title"
        value={value.title}
        onChange={(next) => update(value, onChange, { title: next })}
        path="title"
      />
      <label className="space-y-1 text-sm" {...controlAttrs("Description", "description")}>
        <span className="font-medium text-foreground">Description</span>
        <Textarea
          rows={3}
          value={value.description ?? ""}
          onChange={(event) => update(value, onChange, { description: event.target.value })}
        />
      </label>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <TextField
          label="Service label"
          value={value.serviceLabel}
          onChange={(next) => update(value, onChange, { serviceLabel: next })}
          path="serviceLabel"
        />
        <TextField
          label="Resource label"
          value={value.resourceLabel}
          onChange={(next) => update(value, onChange, { resourceLabel: next })}
          path="resourceLabel"
        />
        <TextField
          label="Date label"
          value={value.dateLabel}
          onChange={(next) => update(value, onChange, { dateLabel: next })}
          path="dateLabel"
        />
        <TextField
          label="Refresh button"
          value={value.refreshLabel}
          onChange={(next) => update(value, onChange, { refreshLabel: next })}
          path="refreshLabel"
        />
      </div>
    </Section>
  );
}

function SurfaceFields({
  value,
  onChange,
}: {
  value: BookingCalendarData;
  onChange: (next: BookingCalendarData) => void;
}) {
  return (
    <Section
      id="booking-calendar.visual.surface"
      mode="visual"
      role="visual"
      title="Surface"
      description="Clear removes decorative frame styles."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SharedColorControl
          label="Frame background"
          controlId="booking-calendar-frame-background"
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
          controlId="booking-calendar-frame-border"
          controlPath="style.frameBorderColor"
          value={value.style?.frameBorderColor}
          onChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
          onSwatchChange={(next) => updateStyle(value, onChange, { frameBorderColor: next })}
          onClear={() => clearStyle(value, onChange, "frameBorderColor")}
          placeholder="var(--color-border)"
          pickerFallback="#d4d4d8"
          showValueInput={false}
        />
      </div>
      <SharedColorControl
        label="Selected slot background"
        controlId="booking-calendar-selected-slot-background"
        controlPath="style.selectedSlotBackground"
        value={value.style?.selectedSlotBackground}
        onChange={(next) => updateStyle(value, onChange, { selectedSlotBackground: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { selectedSlotBackground: next })}
        onClear={() => clearStyle(value, onChange, "selectedSlotBackground")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
        showValueInput={false}
      />
      <SharedColorControl
        label="Selected slot border"
        controlId="booking-calendar-selected-slot-border"
        controlPath="style.selectedSlotBorderColor"
        value={value.style?.selectedSlotBorderColor}
        onChange={(next) => updateStyle(value, onChange, { selectedSlotBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { selectedSlotBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "selectedSlotBorderColor")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
        showValueInput={false}
      />
      <SharedColorControl
        label="Slot hover border"
        controlId="booking-calendar-slot-hover-border"
        controlPath="style.slotHoverBorderColor"
        value={value.style?.slotHoverBorderColor}
        onChange={(next) => updateStyle(value, onChange, { slotHoverBorderColor: next })}
        onSwatchChange={(next) => updateStyle(value, onChange, { slotHoverBorderColor: next })}
        onClear={() => clearStyle(value, onChange, "slotHoverBorderColor")}
        placeholder="var(--color-primary)"
        pickerFallback="#2563eb"
        showValueInput={false}
      />
    </Section>
  );
}

export function BookingCalendarWizardEditor({
  value,
  onChange,
  context,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);
  const calendars = (context?.bookingFlows?.calendars ?? []).filter(
    (calendar) => calendar.blockId !== context?.blockId
  );
  const flowId = normalized.flowId ?? DEFAULT_BOOKING_FLOW_ID;
  const matchedCalendar = findCalendarForFlow(calendars, flowId);
  const flowSelectValue =
    matchedCalendar?.blockId ??
    (flowId === DEFAULT_BOOKING_FLOW_ID ? DEFAULT_FLOW_SELECT_VALUE : SAVED_FLOW_SELECT_VALUE);
  const previewResolved = readPreviewResolved(context);
  const services = previewResolved?.services ?? normalized.resolved?.services ?? [];
  const resources = previewResolved?.resources ?? normalized.resolved?.resources ?? [];
  const selectedService =
    services.find((service) => service.id === normalized.defaultServiceId) ?? services[0] ?? null;
  const staleServiceId =
    normalized.defaultServiceId &&
    !services.some((service) => service.id === normalized.defaultServiceId)
      ? normalized.defaultServiceId
      : null;
  const resourceOptions = selectedService
    ? resources.filter(
        (resource) =>
          selectedService.resourceIds.length === 0 ||
          selectedService.resourceIds.includes(resource.id)
      )
    : resources;
  const staleResourceId =
    normalized.defaultResourceId &&
    !resourceOptions.some((resource) => resource.id === normalized.defaultResourceId)
      ? normalized.defaultResourceId
      : null;
  const selectedResourceId = staleResourceId ?? normalized.defaultResourceId ?? "";

  return (
    <div className="space-y-4">
      <Section
        id="booking-calendar.wizard.flow-setup"
        mode="wizard"
        role="setup"
        title="Flow"
        description="Choose how this calendar pairs with an appointment form. The technical key is managed for you."
      >
        <SelectField
          label="Booking flow"
          path="flowId"
          value={flowSelectValue}
          options={[
            { value: DEFAULT_FLOW_SELECT_VALUE, label: "Default booking flow" },
            ...calendars.map((calendar) => ({
              value: calendar.blockId,
              label: `Match ${calendar.label}`,
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
      </Section>

      <Section
        id="booking-calendar.wizard.availability-setup"
        mode="wizard"
        role="setup"
        title="Availability setup"
        description="Slot loading behavior and optional first service/resource defaults."
      >
        <TextField
          label="Slot interval (minutes)"
          type="number"
          value={String(normalized.intervalMinutes ?? 15)}
          path="intervalMinutes"
          onChange={(next) => {
            const parsed = Number(next);
            update(normalized, onChange, {
              intervalMinutes: Number.isFinite(parsed) ? parsed : 15,
            });
          }}
        />
        {services.length > 0 ? (
          <SelectField
            label="Default service"
            value={staleServiceId ?? normalized.defaultServiceId ?? "__auto__"}
            path="defaultServiceId"
            options={[
              { value: "__auto__", label: "Auto-select first available service" },
              ...(staleServiceId
                ? [{ value: staleServiceId, label: "Saved unavailable service" }]
                : []),
              ...services.map((service) => ({ value: service.id, label: service.name })),
            ]}
            onChange={(next) =>
              update(normalized, onChange, {
                defaultServiceId: next === "__auto__" ? undefined : next,
              })
            }
          />
        ) : (
          <ReadonlyWidgetSummaryRow
            id="booking-calendar-wizard-default-service"
            label="Default service"
            path="defaultServiceId"
            value={
              normalized.defaultServiceId
                ? "Saved default will apply when services load"
                : "Auto-select first available service"
            }
            help="Service defaults are selected from the booking catalog; the editor does not ask for raw IDs."
          />
        )}
        {resourceOptions.length > 0 ? (
          <SelectField
            label="Default resource"
            value={selectedResourceId || "__auto__"}
            path="defaultResourceId"
            options={[
              { value: "__auto__", label: "Auto-select first available resource" },
              ...(staleResourceId
                ? [{ value: staleResourceId, label: "Saved unavailable resource" }]
                : []),
              ...resourceOptions.map((resource) => ({ value: resource.id, label: resource.name })),
            ]}
            onChange={(next) =>
              update(normalized, onChange, {
                defaultResourceId: next === "__auto__" ? undefined : next,
              })
            }
          />
        ) : (
          <ReadonlyWidgetSummaryRow
            id="booking-calendar-wizard-default-resource"
            label="Default resource"
            path="defaultResourceId"
            value={
              normalized.defaultResourceId
                ? "Saved default will apply when resources load"
                : "Auto-select first available resource"
            }
            help="Resource defaults are selected from the booking catalog; the editor does not ask for raw IDs."
          />
        )}
      </Section>

      <Section
        id="booking-calendar.wizard.date-policy"
        mode="wizard"
        role="setup"
        title="Date policy"
        description="Choose the initial date and optional allowed range for this calendar."
      >
        <TextField
          label="Default date"
          type="date"
          value={normalized.defaultDate}
          path="defaultDate"
          onChange={(next) => update(normalized, onChange, { defaultDate: next })}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <TextField
            label="Minimum date"
            type="date"
            value={normalized.minDate}
            path="minDate"
            onChange={(next) => update(normalized, onChange, { minDate: next })}
          />
          <TextField
            label="Maximum date"
            type="date"
            value={normalized.maxDate}
            path="maxDate"
            onChange={(next) => update(normalized, onChange, { maxDate: next })}
          />
        </div>
      </Section>
    </div>
  );
}

export function BookingCalendarVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);

  return (
    <div className="space-y-4">
      {onVariantChange ? (
        <Section
          id="booking-calendar.visual.variant-layout"
          mode="visual"
          role="layout"
          title="Variant"
          description="Choose a layout that fits the available space."
        >
          <SelectField
            label="Layout variant"
            value={variant || "default"}
            path="variant"
            options={[
              { value: "default", label: "Default" },
              { value: "compact", label: "Compact" },
              { value: "inline", label: "Inline" },
              { value: "horizontal", label: "Horizontal" },
            ]}
            onChange={onVariantChange}
          />
        </Section>
      ) : null}
      <CopyFields value={normalized} onChange={onChange} />
      <SurfaceFields value={normalized} onChange={onChange} />

      <Section
        id="booking-calendar.visual.status-messages"
        mode="visual"
        role="content"
        title="Status messages"
        description="Messages shown while loading and when no slots are available."
      >
        <TextField
          label="Loading"
          value={normalized.loadingMessage}
          path="loadingMessage"
          onChange={(next) => update(normalized, onChange, { loadingMessage: next })}
        />
        <TextField
          label="No slots"
          value={normalized.emptySlotsMessage}
          path="emptySlotsMessage"
          onChange={(next) => update(normalized, onChange, { emptySlotsMessage: next })}
        />
        <TextField
          label="Missing selection"
          value={normalized.missingSelectionMessage}
          path="missingSelectionMessage"
          onChange={(next) => update(normalized, onChange, { missingSelectionMessage: next })}
        />
        <TextField
          label="Error"
          value={normalized.errorMessage}
          path="errorMessage"
          onChange={(next) => update(normalized, onChange, { errorMessage: next })}
        />
        <TextField
          label="Selected slot placeholder"
          value={normalized.selectedSlotEmptyMessage}
          path="selectedSlotEmptyMessage"
          onChange={(next) => update(normalized, onChange, { selectedSlotEmptyMessage: next })}
        />
        <TextField
          label="Empty state"
          value={normalized.emptyStateMessage}
          path="emptyStateMessage"
          onChange={(next) => update(normalized, onChange, { emptyStateMessage: next })}
        />
      </Section>

      <Section
        id="booking-calendar.visual.service-context"
        mode="visual"
        role="content"
        title="Service context"
        description="Control how much pricing and timezone context is visible before selection."
      >
        <ToggleField
          label="Show service price"
          checked={normalized.showServicePrice ?? true}
          path="showServicePrice"
          onChange={(next) => update(normalized, onChange, { showServicePrice: next })}
        />
        <ToggleField
          label="Show duration and buffers"
          checked={normalized.showServiceDuration ?? true}
          path="showServiceDuration"
          onChange={(next) => update(normalized, onChange, { showServiceDuration: next })}
        />
        <ToggleField
          label="Show service description"
          checked={normalized.showServiceDescription ?? false}
          path="showServiceDescription"
          onChange={(next) => update(normalized, onChange, { showServiceDescription: next })}
        />
        <ToggleField
          label="Show timezone"
          checked={normalized.showTimezone ?? true}
          path="showTimezone"
          onChange={(next) => update(normalized, onChange, { showTimezone: next })}
        />
        <SelectField
          label="Date language"
          value={resolveLocaleSelectValue(normalized.summaryLocale)}
          path="summaryLocale"
          options={buildLocaleOptions(normalized.summaryLocale)}
          onChange={(next) =>
            update(normalized, onChange, { summaryLocale: localeValueFromSelect(next) })
          }
        />
        <SelectField
          label="Summary date style"
          value={normalized.summaryDateStyle ?? "short"}
          path="summaryDateStyle"
          options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "long", label: "Long" },
          ]}
          onChange={(next) =>
            update(normalized, onChange, {
              summaryDateStyle: next as BookingCalendarData["summaryDateStyle"],
            })
          }
        />
      </Section>

      <Section
        id="booking-calendar.visual.date-picker"
        mode="visual"
        role="content"
        title="Date picker"
        description="Choose how dates and slot density are presented."
      >
        <SelectField
          label="Date picker mode"
          value={normalized.datePickerMode ?? "native"}
          path="datePickerMode"
          options={[
            { value: "native", label: "Native date input" },
            { value: "week", label: "Week picker" },
          ]}
          onChange={(next) =>
            update(normalized, onChange, {
              datePickerMode: next as BookingCalendarData["datePickerMode"],
            })
          }
        />
        <SelectField
          label="Slot interval mode"
          value={normalized.slotIntervalMode ?? "fixed"}
          path="slotIntervalMode"
          options={[
            { value: "fixed", label: "Fixed interval" },
            { value: "service-duration", label: "Service duration" },
            { value: "non-overlapping", label: "Non-overlapping" },
          ]}
          onChange={(next) =>
            update(normalized, onChange, {
              slotIntervalMode: next as BookingCalendarData["slotIntervalMode"],
            })
          }
        />
      </Section>
    </div>
  );
}

export function BookingCalendarAdvancedEditor({
  value,
  context,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);
  const previewResolved = readPreviewResolved(context);
  const services = previewResolved?.services ?? normalized.resolved?.services ?? [];
  const resources = previewResolved?.resources ?? normalized.resolved?.resources ?? [];
  const previewError = previewResolved?.error;

  return (
    <div className="space-y-4">
      <Section
        id="booking-calendar.advanced.runtime-endpoint"
        mode="advanced"
        role="diagnostics"
        title="Runtime route"
        description="Read-only support status for the server-owned slot loader."
      >
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-slots-endpoint"
          label="Slot loading route"
          path="slotsEndpoint"
          value={describeEndpointStatus(normalized.slotsEndpoint, "/api/booking/slots")}
          help="Custom routes remain backward-compatible but are not edited in normal widget authoring."
        />
      </Section>

      <Section
        id="booking-calendar.advanced.runtime-diagnostics"
        mode="advanced"
        role="diagnostics"
        title="Resolved runtime payload"
        description="Injected on runtime/preview by server resolver."
      >
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-flow"
          label="Booking flow"
          path="flowId"
          value={describeBookingFlow(normalized.flowId, context?.bookingFlows?.calendars ?? [])}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-catalog-counts"
          label="Resolved catalog"
          path="resolved.services"
          value={`Services: ${services.length} · Resources: ${resources.length}`}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-default-service"
          label="Default service"
          path="defaultServiceId"
          value={resolveServiceSummary(normalized.defaultServiceId, services)}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-default-resource"
          label="Default resource"
          path="defaultResourceId"
          value={resolveResourceSummary(normalized.defaultResourceId, resources)}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-slots-token"
          label="Slots token"
          path="resolved.slotsToken"
          value={normalized.resolved?.slotsToken ? "Injected by server" : "Not injected in editor"}
        />
        {previewError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            Preview catalog error: {previewError}
          </div>
        ) : null}
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-runtime-error"
          label="Runtime error"
          path="resolved.error"
          value={normalized.resolved?.error ?? "No runtime warning"}
        />
      </Section>
    </div>
  );
}
