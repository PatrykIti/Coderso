import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  normalizeBookingCalendarData,
  type BookingCalendarData,
} from "../../../../widgets/core/bookingCalendar";
import type { WidgetEditorProps } from "../../../../widgets/types";

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

const updateResolved = (
  value: BookingCalendarData,
  onChange: (next: BookingCalendarData) => void,
  patch: Partial<NonNullable<BookingCalendarData["resolved"]>>
) => {
  const current = normalizeBookingCalendarData(value);
  onChange(
    normalizeBookingCalendarData({
      ...current,
      resolved: {
        ...current.resolved,
        ...patch,
      },
    })
  );
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
  type?: "text" | "number";
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

function CopyFields({
  value,
  onChange,
}: {
  value: BookingCalendarData;
  onChange: (next: BookingCalendarData) => void;
}) {
  return (
    <Section title="Copy" description="Headings and helper messages shown to end users.">
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

export function BookingCalendarWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);

  return (
    <div className="space-y-4">
      <Section
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

      <CopyFields value={normalized} onChange={onChange} />

      <Section title="Availability behavior" description="Slot loading behavior for runtime.">
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
      </Section>
    </div>
  );
}

export function BookingCalendarVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);

  return (
    <div className="space-y-4">
      <CopyFields value={normalized} onChange={onChange} />

      <Section
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
      </Section>
    </div>
  );
}

export function BookingCalendarAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<BookingCalendarData>) {
  const normalized = normalizeBookingCalendarData(value);
  const services = normalized.resolved?.services ?? [];
  const resources = normalized.resolved?.resources ?? [];

  return (
    <div className="space-y-4">
      <Section title="Runtime endpoints" description="Override only for advanced proxy setups.">
        <TextField
          label="Slots endpoint"
          value={normalized.slotsEndpoint}
          onChange={(next) => update(normalized, onChange, { slotsEndpoint: next })}
          placeholder="/api/booking/slots"
        />
      </Section>

      <Section title="Defaults" description="Optional fallback IDs if you need deterministic selection.">
        <TextField
          label="Default service ID"
          value={normalized.defaultServiceId}
          onChange={(next) => update(normalized, onChange, { defaultServiceId: next })}
        />
        <TextField
          label="Default resource ID"
          value={normalized.defaultResourceId}
          onChange={(next) => update(normalized, onChange, { defaultResourceId: next })}
        />
      </Section>

      <Section title="Resolved runtime payload" description="Injected on runtime/preview by server resolver.">
        <div className="rounded-md border border-border/70 bg-background p-2 text-xs text-muted-foreground">
          Services: {services.length} · Resources: {resources.length}
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Runtime error flag</span>
          <Input
            value={normalized.resolved?.error ?? ""}
            placeholder="e.g. booking_nonce_unavailable"
            onChange={(event) =>
              updateResolved(normalized, onChange, { error: event.target.value })
            }
          />
        </label>
      </Section>
    </div>
  );
}
