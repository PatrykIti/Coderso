import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  normalizeAppointmentFormData,
  type AppointmentFormData,
} from "../../../../widgets/core/appointmentForm";
import type { WidgetEditorProps } from "../../../../widgets/types";

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

const updateResolved = (
  value: AppointmentFormData,
  onChange: (next: AppointmentFormData) => void,
  patch: Partial<NonNullable<AppointmentFormData["resolved"]>>
) => {
  const current = normalizeAppointmentFormData(value);
  onChange(
    normalizeAppointmentFormData({
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

export function AppointmentFormWizardEditor({
  value,
  onChange,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);

  return (
    <div className="space-y-4">
      <Section
        title="Flow"
        description="Use the same flow key as Booking Calendar to receive selected slot."
      >
        <TextField
          label="Flow key"
          value={normalized.flowId}
          onChange={(next) => update(normalized, onChange, { flowId: next })}
          placeholder="booking-flow"
        />
      </Section>

      <Section title="Copy" description="Main heading and confirmation copy.">
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
          label="Success message"
          value={normalized.successMessage}
          onChange={(next) => update(normalized, onChange, { successMessage: next })}
        />
      </Section>
    </div>
  );
}

export function AppointmentFormVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);

  return (
    <div className="space-y-4">
      <Section title="Slot summary" description="Copy shown before a user selects a slot.">
        <TextField
          label="Summary label"
          value={normalized.slotSummaryLabel}
          onChange={(next) => update(normalized, onChange, { slotSummaryLabel: next })}
        />
        <TextField
          label="No selection message"
          value={normalized.slotSummaryEmptyMessage}
          onChange={(next) => update(normalized, onChange, { slotSummaryEmptyMessage: next })}
        />
      </Section>

      <Section title="Fields" description="Labels/placeholders for customer details.">
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
        <ToggleField
          label="Show phone field"
          checked={normalized.showPhone !== false}
          onCheckedChange={(next) => update(normalized, onChange, { showPhone: next })}
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
        <ToggleField
          label="Show notes field"
          checked={normalized.showNotes !== false}
          onCheckedChange={(next) => update(normalized, onChange, { showNotes: next })}
        />
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
      </Section>
    </div>
  );
}

export function AppointmentFormAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(value);

  return (
    <div className="space-y-4">
      <Section title="Runtime endpoint" description="Override only for advanced proxy setups.">
        <TextField
          label="Submission endpoint"
          value={normalized.submissionEndpoint}
          onChange={(next) => update(normalized, onChange, { submissionEndpoint: next })}
          placeholder="/api/booking/reservations"
        />
      </Section>

      <Section title="Errors" description="Message shown if user tries to submit without selected slot.">
        <TextField
          label="No selection error"
          value={normalized.noSelectionMessage}
          onChange={(next) => update(normalized, onChange, { noSelectionMessage: next })}
        />
      </Section>

      <Section title="Resolved runtime payload" description="Injected by server runtime resolver.">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Submission nonce</span>
          <Input
            value={normalized.resolved?.submissionNonce ?? ""}
            onChange={(event) =>
              updateResolved(normalized, onChange, {
                submissionNonce: event.target.value,
              })
            }
            placeholder="runtime nonce"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Runtime error</span>
          <Input
            value={normalized.resolved?.error ?? ""}
            onChange={(event) =>
              updateResolved(normalized, onChange, {
                error: event.target.value,
              })
            }
            placeholder="e.g. booking_nonce_unavailable"
          />
        </label>
      </Section>
    </div>
  );
}
