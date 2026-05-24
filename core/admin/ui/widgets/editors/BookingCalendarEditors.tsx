import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../../widgets/core/bookingCalendar";
import type {
  EditorMode,
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
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="space-y-1 text-sm">
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
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
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

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-2 text-sm">
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
      />
      <label className="space-y-1 text-sm">
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
        />
        <TextField
          label="Resource label"
          value={value.resourceLabel}
          onChange={(next) => update(value, onChange, { resourceLabel: next })}
        />
        <TextField
          label="Date label"
          value={value.dateLabel}
          onChange={(next) => update(value, onChange, { dateLabel: next })}
        />
        <TextField
          label="Refresh button"
          value={value.refreshLabel}
          onChange={(next) => update(value, onChange, { refreshLabel: next })}
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
      </div>
      <SharedColorControl
        label="Selected slot background"
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
        description="Use the same flow key in calendar and appointment form to connect them."
      >
        <TextField
          label="Flow key"
          value={normalized.flowId}
          onChange={(next) => update(normalized, onChange, { flowId: next })}
          placeholder="booking-flow"
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
          onChange={(next) => {
            const parsed = Number(next);
            update(normalized, onChange, {
              intervalMinutes: Number.isFinite(parsed) ? parsed : 15,
            });
          }}
        />
        {services.length > 0 ? (
          <SelectField
            label="Default service ID"
            value={staleServiceId ?? normalized.defaultServiceId ?? "__auto__"}
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
            label="Default resource ID"
            value={selectedResourceId || "__auto__"}
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
          onChange={(next) => update(normalized, onChange, { defaultDate: next })}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <TextField
            label="Minimum date"
            type="date"
            value={normalized.minDate}
            onChange={(next) => update(normalized, onChange, { minDate: next })}
          />
          <TextField
            label="Maximum date"
            type="date"
            value={normalized.maxDate}
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
          onChange={(next) => update(normalized, onChange, { loadingMessage: next })}
        />
        <TextField
          label="No slots"
          value={normalized.emptySlotsMessage}
          onChange={(next) => update(normalized, onChange, { emptySlotsMessage: next })}
        />
        <TextField
          label="Missing selection"
          value={normalized.missingSelectionMessage}
          onChange={(next) => update(normalized, onChange, { missingSelectionMessage: next })}
        />
        <TextField
          label="Error"
          value={normalized.errorMessage}
          onChange={(next) => update(normalized, onChange, { errorMessage: next })}
        />
        <TextField
          label="Selected slot placeholder"
          value={normalized.selectedSlotEmptyMessage}
          onChange={(next) => update(normalized, onChange, { selectedSlotEmptyMessage: next })}
        />
        <TextField
          label="Empty state"
          value={normalized.emptyStateMessage}
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
          onChange={(next) => update(normalized, onChange, { showServicePrice: next })}
        />
        <ToggleField
          label="Show duration and buffers"
          checked={normalized.showServiceDuration ?? true}
          onChange={(next) => update(normalized, onChange, { showServiceDuration: next })}
        />
        <ToggleField
          label="Show service description"
          checked={normalized.showServiceDescription ?? false}
          onChange={(next) => update(normalized, onChange, { showServiceDescription: next })}
        />
        <ToggleField
          label="Show timezone"
          checked={normalized.showTimezone ?? true}
          onChange={(next) => update(normalized, onChange, { showTimezone: next })}
        />
        <TextField
          label="Summary locale"
          value={normalized.summaryLocale}
          onChange={(next) => update(normalized, onChange, { summaryLocale: next })}
          placeholder="Leave blank to use browser locale"
        />
        <SelectField
          label="Summary date style"
          value={normalized.summaryDateStyle ?? "short"}
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
  onChange,
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
        role="technical"
        title="Runtime endpoint"
        description="Override only for advanced proxy setups."
      >
        <TextField
          label="Slots endpoint"
          value={normalized.slotsEndpoint}
          onChange={(next) => update(normalized, onChange, { slotsEndpoint: next })}
          placeholder="/api/booking/slots"
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
          id="booking-calendar-advanced-catalog-counts"
          label="Resolved catalog"
          path="resolved.services"
          value={`Services: ${services.length} · Resources: ${resources.length}`}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-default-service"
          label="Default service ID"
          path="defaultServiceId"
          value={normalized.defaultServiceId ?? "Auto-select first available service"}
        />
        <ReadonlyWidgetSummaryRow
          id="booking-calendar-advanced-default-resource"
          label="Default resource ID"
          path="defaultResourceId"
          value={normalized.defaultResourceId ?? "Auto-select first available resource"}
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
