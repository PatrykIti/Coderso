import type { ComponentType, CSSProperties, ReactNode } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getBookingRuntimeClientScript } from "./bookingRuntimeScript";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type AppointmentFormVariantId = "default";

export type AppointmentFormData = {
  flowId?: string;
  title?: string;
  description?: string;
  slotSummaryLabel?: string;
  slotSummaryEmptyMessage?: string;
  customerNameLabel?: string;
  customerEmailLabel?: string;
  customerPhoneLabel?: string;
  notesLabel?: string;
  customerNamePlaceholder?: string;
  customerEmailPlaceholder?: string;
  customerPhonePlaceholder?: string;
  notesPlaceholder?: string;
  submitLabel?: string;
  successMessage?: string;
  noSelectionMessage?: string;
  showPhone?: boolean;
  showNotes?: boolean;
  submissionEndpoint?: string;
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
    summaryBackground?: string;
    summaryBorderColor?: string;
    submitBackground?: string;
  };
  resolved?: {
    submissionNonce?: string | null;
    error?: string;
  };
};

export const appointmentFormDefaults: AppointmentFormData = {
  flowId: "booking-flow",
  title: "Appointment details",
  description: "Provide contact details and confirm the selected slot.",
  slotSummaryLabel: "Selected slot",
  slotSummaryEmptyMessage: "Select a slot in Booking Calendar first.",
  customerNameLabel: "Full name",
  customerEmailLabel: "Email",
  customerPhoneLabel: "Phone",
  notesLabel: "Notes",
  customerNamePlaceholder: "Your name",
  customerEmailPlaceholder: "you@example.com",
  customerPhonePlaceholder: "+1 000 000 000",
  notesPlaceholder: "Optional notes",
  submitLabel: "Book appointment",
  successMessage: "Appointment booked successfully.",
  noSelectionMessage: "Select a slot first.",
  showPhone: true,
  showNotes: true,
  submissionEndpoint: "/api/booking/reservations",
  style: {
    frameBackground: "color-mix(in srgb, var(--color-bg) 95%, transparent)",
    frameBorderColor: "var(--color-border)",
    summaryBackground: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    summaryBorderColor: "color-mix(in srgb, var(--color-border) 70%, transparent)",
    submitBackground: "var(--color-primary)",
  },
};

const text = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const optionalText = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const appointmentFormSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    flowId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    slotSummaryLabel: { type: "string" },
    slotSummaryEmptyMessage: { type: "string" },
    customerNameLabel: { type: "string" },
    customerEmailLabel: { type: "string" },
    customerPhoneLabel: { type: "string" },
    notesLabel: { type: "string" },
    customerNamePlaceholder: { type: "string" },
    customerEmailPlaceholder: { type: "string" },
    customerPhonePlaceholder: { type: "string" },
    notesPlaceholder: { type: "string" },
    submitLabel: { type: "string" },
    successMessage: { type: "string" },
    noSelectionMessage: { type: "string" },
    showPhone: { type: "boolean" },
    showNotes: { type: "boolean" },
    submissionEndpoint: { type: "string" },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameBorderColor: { type: "string" },
        summaryBackground: { type: "string" },
        summaryBorderColor: { type: "string" },
        submitBackground: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        submissionNonce: { type: ["string", "null"] },
        error: { type: "string" },
      },
    },
  },
} as const;

export function normalizeAppointmentFormData(data: AppointmentFormData): AppointmentFormData {
  const hasStyleObject = data.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(data.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
        summaryBackground: resolveClearableStyleValue(data.style?.summaryBackground),
        summaryBorderColor: resolveClearableStyleValue(data.style?.summaryBorderColor),
        submitBackground: resolveClearableStyleValue(data.style?.submitBackground),
      }) ?? {})
    : undefined;

  return {
    flowId: text(data.flowId, appointmentFormDefaults.flowId ?? "booking-flow"),
    title: text(data.title, appointmentFormDefaults.title ?? "Appointment details"),
    description: text(
      data.description,
      appointmentFormDefaults.description ??
        "Provide contact details and confirm the selected slot."
    ),
    slotSummaryLabel: text(
      data.slotSummaryLabel,
      appointmentFormDefaults.slotSummaryLabel ?? "Selected slot"
    ),
    slotSummaryEmptyMessage: text(
      data.slotSummaryEmptyMessage,
      appointmentFormDefaults.slotSummaryEmptyMessage ?? "Select a slot in Booking Calendar first."
    ),
    customerNameLabel: text(
      data.customerNameLabel,
      appointmentFormDefaults.customerNameLabel ?? "Full name"
    ),
    customerEmailLabel: text(
      data.customerEmailLabel,
      appointmentFormDefaults.customerEmailLabel ?? "Email"
    ),
    customerPhoneLabel: text(
      data.customerPhoneLabel,
      appointmentFormDefaults.customerPhoneLabel ?? "Phone"
    ),
    notesLabel: text(data.notesLabel, appointmentFormDefaults.notesLabel ?? "Notes"),
    customerNamePlaceholder: text(
      data.customerNamePlaceholder,
      appointmentFormDefaults.customerNamePlaceholder ?? "Your name"
    ),
    customerEmailPlaceholder: text(
      data.customerEmailPlaceholder,
      appointmentFormDefaults.customerEmailPlaceholder ?? "you@example.com"
    ),
    customerPhonePlaceholder: text(
      data.customerPhonePlaceholder,
      appointmentFormDefaults.customerPhonePlaceholder ?? "+1 000 000 000"
    ),
    notesPlaceholder: text(
      data.notesPlaceholder,
      appointmentFormDefaults.notesPlaceholder ?? "Optional notes"
    ),
    submitLabel: text(data.submitLabel, appointmentFormDefaults.submitLabel ?? "Book appointment"),
    successMessage: text(
      data.successMessage,
      appointmentFormDefaults.successMessage ?? "Appointment booked successfully."
    ),
    noSelectionMessage: text(
      data.noSelectionMessage,
      appointmentFormDefaults.noSelectionMessage ?? "Select a slot first."
    ),
    showPhone:
      typeof data.showPhone === "boolean"
        ? data.showPhone
        : appointmentFormDefaults.showPhone !== false,
    showNotes:
      typeof data.showNotes === "boolean"
        ? data.showNotes
        : appointmentFormDefaults.showNotes !== false,
    submissionEndpoint: text(
      data.submissionEndpoint,
      appointmentFormDefaults.submissionEndpoint ?? "/api/booking/reservations"
    ),
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      submissionNonce: optionalText(data.resolved?.submissionNonce ?? undefined) ?? null,
      ...(optionalText(data.resolved?.error) ? { error: text(data.resolved?.error, "") } : {}),
    },
  };
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-1 text-xs font-medium text-[var(--color-text)]/80">
    <span>{label}</span>
    {children}
  </label>
);

export function AppointmentFormBlock({ data }: { data: AppointmentFormData; variant: string }) {
  const normalized = normalizeAppointmentFormData(data);
  const submissionNonce = normalized.resolved?.submissionNonce ?? null;
  const submissionEndpoint =
    normalized.submissionEndpoint ??
    appointmentFormDefaults.submissionEndpoint ??
    "/api/booking/reservations";
  const successMessage =
    normalized.successMessage ??
    appointmentFormDefaults.successMessage ??
    "Appointment booked successfully.";
  const slotSummaryLabel =
    normalized.slotSummaryLabel ?? appointmentFormDefaults.slotSummaryLabel ?? "Selected slot";
  const slotSummaryEmptyMessage =
    normalized.slotSummaryEmptyMessage ??
    appointmentFormDefaults.slotSummaryEmptyMessage ??
    "Select a slot in Booking Calendar first.";
  const customerNameLabel =
    normalized.customerNameLabel ?? appointmentFormDefaults.customerNameLabel ?? "Full name";
  const customerEmailLabel =
    normalized.customerEmailLabel ?? appointmentFormDefaults.customerEmailLabel ?? "Email";
  const customerPhoneLabel =
    normalized.customerPhoneLabel ?? appointmentFormDefaults.customerPhoneLabel ?? "Phone";
  const notesLabel = normalized.notesLabel ?? appointmentFormDefaults.notesLabel ?? "Notes";
  const customerNamePlaceholder =
    normalized.customerNamePlaceholder ??
    appointmentFormDefaults.customerNamePlaceholder ??
    "Your name";
  const customerEmailPlaceholder =
    normalized.customerEmailPlaceholder ??
    appointmentFormDefaults.customerEmailPlaceholder ??
    "you@example.com";
  const customerPhonePlaceholder =
    normalized.customerPhonePlaceholder ??
    appointmentFormDefaults.customerPhonePlaceholder ??
    "+1 000 000 000";
  const notesPlaceholder =
    normalized.notesPlaceholder ?? appointmentFormDefaults.notesPlaceholder ?? "Optional notes";
  const submitLabel =
    normalized.submitLabel ?? appointmentFormDefaults.submitLabel ?? "Book appointment";
  const noSelectionMessage =
    normalized.noSelectionMessage ??
    appointmentFormDefaults.noSelectionMessage ??
    "Select a slot first.";
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const summaryStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.summaryBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.summaryBorderColor),
  });
  const submitStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.submitBackground),
  });
  const legacyFrameClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]/95" : "";
  const legacySummaryClass =
    normalized.style === undefined ? "border-[var(--color-border)]/70 bg-[var(--color-bg)]/70" : "";
  const legacySubmitClass = normalized.style === undefined ? "bg-[var(--color-primary)]" : "";

  return (
    <section className={`space-y-4 rounded-xl border p-5 ${legacyFrameClass}`} style={frameStyle}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{normalized.title}</h3>
        <p className="text-sm text-[var(--color-text)]/70">{normalized.description}</p>
      </div>

      {normalized.resolved?.error ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Booking runtime warning: {normalized.resolved.error}
        </div>
      ) : null}

      <form
        action={submissionEndpoint}
        method="post"
        className="space-y-3"
        data-nextless-appointment-form="1"
        data-flow-id={normalized.flowId}
        data-submission-endpoint={submissionEndpoint}
        data-success-message={successMessage}
      >
        <div
          className={`rounded-md border px-3 py-2 text-xs text-[var(--color-text)]/80 ${legacySummaryClass}`}
          style={summaryStyle}
        >
          <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--color-text)]/65">
            {slotSummaryLabel}
          </p>
          <p data-booking-selected-slot data-empty={slotSummaryEmptyMessage}>
            {slotSummaryEmptyMessage}
          </p>
        </div>

        <Field label={customerNameLabel}>
          <input
            required
            name="customerName"
            placeholder={customerNamePlaceholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>

        <Field label={customerEmailLabel}>
          <input
            type="email"
            name="customerEmail"
            placeholder={customerEmailPlaceholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
          />
        </Field>

        {normalized.showPhone ? (
          <Field label={customerPhoneLabel}>
            <input
              type="tel"
              name="customerPhone"
              placeholder={customerPhonePlaceholder}
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </Field>
        ) : null}

        {normalized.showNotes ? (
          <Field label={notesLabel}>
            <textarea
              name="notes"
              placeholder={notesPlaceholder}
              className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </Field>
        ) : null}

        {submissionNonce ? <input type="hidden" name="formNonce" value={submissionNonce} /> : null}
        {submissionNonce ? (
          <input type="hidden" name="__nl_booking_nonce" value={submissionNonce} />
        ) : null}

        <p
          className="hidden rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900"
          data-booking-form-error
          data-no-selection={noSelectionMessage}
        />

        <p
          className="hidden rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
          data-booking-form-success
        />

        <button
          type="submit"
          data-booking-submit
          className={`rounded-md px-4 py-2 text-sm font-semibold text-[var(--color-bg)] ${legacySubmitClass}`}
          style={submitStyle}
        >
          {submitLabel}
        </button>
      </form>

      <script dangerouslySetInnerHTML={{ __html: getBookingRuntimeClientScript() }} />
    </section>
  );
}

export function createAppointmentFormWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<AppointmentFormData>>;
  visual: ComponentType<WidgetEditorProps<AppointmentFormData>>;
  advanced: ComponentType<WidgetEditorProps<AppointmentFormData>>;
}): WidgetDefinition<AppointmentFormData> {
  return {
    type: "appointment-form",
    title: "Appointment Form",
    description: "Customer details form linked to selected booking calendar slot.",
    category: "forms",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Standard appointment confirmation form.",
      },
    ],
    schema: appointmentFormSchema,
    defaults: appointmentFormDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    render: AppointmentFormBlock,
  };
}
