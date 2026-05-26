import type { ComponentType, CSSProperties, ReactNode } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { getBookingRuntimeClientScript } from "./bookingRuntimeScript";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type AppointmentFormVariantId =
  | "default"
  | "compact"
  | "inline"
  | "sidebar"
  | "card-summary";
export type AppointmentFormNameMode = "full" | "split";
export type AppointmentFormConsent = {
  enabled?: boolean;
  label?: string;
  required?: boolean;
  privacyUrl?: string;
  termsUrl?: string;
};
export type AppointmentCustomFieldType =
  | "text"
  | "email"
  | "phone"
  | "select"
  | "checkbox"
  | "textarea";
export type AppointmentCustomField = {
  id: string;
  label: string;
  type: AppointmentCustomFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};
export type AppointmentFormResolvedCaptcha = {
  provider?: "recaptcha_v3";
  siteKey?: string;
  action?: "public_write";
};

export type AppointmentFormData = {
  flowId?: string;
  title?: string;
  description?: string;
  slotSummaryLabel?: string;
  slotSummaryEmptyMessage?: string;
  customerNameLabel?: string;
  customerFirstNameLabel?: string;
  customerLastNameLabel?: string;
  customerEmailLabel?: string;
  customerPhoneLabel?: string;
  notesLabel?: string;
  customerNamePlaceholder?: string;
  customerFirstNamePlaceholder?: string;
  customerLastNamePlaceholder?: string;
  customerEmailPlaceholder?: string;
  customerPhonePlaceholder?: string;
  notesPlaceholder?: string;
  submitLabel?: string;
  loadingMessage?: string;
  successMessage?: string;
  noSelectionMessage?: string;
  showServiceInSummary?: boolean;
  showResourceInSummary?: boolean;
  locale?: string;
  successRedirectUrl?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showNotes?: boolean;
  requiredEmail?: boolean;
  requiredPhone?: boolean;
  nameMode?: AppointmentFormNameMode;
  phonePattern?: string;
  phonePatternMessage?: string;
  notesMaxLength?: number;
  customFields?: AppointmentCustomField[];
  consent?: AppointmentFormConsent;
  submissionEndpoint?: string;
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
    summaryBackground?: string;
    summaryBorderColor?: string;
    submitBackground?: string;
    submitTextColor?: string;
  };
  resolved?: {
    submissionNonce?: string | null;
    error?: string;
    captcha?: AppointmentFormResolvedCaptcha | null;
  };
};

export const appointmentFormEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "appointment-form.wizard.flow-setup",
      title: "Flow setup",
      role: "setup",
      writablePaths: ["flowId"],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.variant-flow",
      title: "Variant and flow behavior",
      role: "layout",
      writablePaths: ["variant", "locale", "successRedirectUrl"],
      readOnlyPaths: ["flowId"],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.copy",
      title: "Copy",
      role: "content",
      writablePaths: ["title", "description", "submitLabel", "loadingMessage", "successMessage"],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.slot-summary",
      title: "Slot summary",
      role: "content",
      writablePaths: [
        "slotSummaryLabel",
        "slotSummaryEmptyMessage",
        "noSelectionMessage",
        "showServiceInSummary",
        "showResourceInSummary",
      ],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.fields",
      title: "Fields",
      role: "content",
      writablePaths: [
        "nameMode",
        "customerNameLabel",
        "customerFirstNameLabel",
        "customerLastNameLabel",
        "customerEmailLabel",
        "customerPhoneLabel",
        "notesLabel",
        "customerNamePlaceholder",
        "customerFirstNamePlaceholder",
        "customerLastNamePlaceholder",
        "customerEmailPlaceholder",
        "customerPhonePlaceholder",
        "notesPlaceholder",
        "showEmail",
        "showPhone",
        "showNotes",
        "requiredEmail",
        "requiredPhone",
        "phonePattern",
        "phonePatternMessage",
        "notesMaxLength",
      ],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.custom-fields",
      title: "Custom fields",
      role: "content",
      writablePaths: [
        "customFields.label",
        "customFields.type",
        "customFields.required",
        "customFields.placeholder",
        "customFields.options",
      ],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.consent",
      title: "Consent and protection",
      role: "content",
      writablePaths: [
        "consent.enabled",
        "consent.label",
        "consent.required",
        "consent.privacyUrl",
        "consent.termsUrl",
      ],
    },
    {
      mode: "visual",
      id: "appointment-form.visual.surface",
      title: "Surface",
      role: "visual",
      writablePaths: [
        "style.frameBackground",
        "style.frameBorderColor",
        "style.summaryBackground",
        "style.summaryBorderColor",
        "style.submitBackground",
        "style.submitTextColor",
      ],
    },
    {
      mode: "advanced",
      id: "appointment-form.advanced.runtime-endpoint",
      title: "Runtime route",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["submissionEndpoint", "flowId"],
    },
    {
      mode: "advanced",
      id: "appointment-form.advanced.submission-security",
      title: "Submission security",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["resolved.submissionNonce", "resolved.captcha", "resolved.error"],
    },
  ],
};

export const appointmentFormDefaults: AppointmentFormData = {
  flowId: "booking-flow",
  title: "Appointment details",
  description: "Provide contact details and confirm the selected slot.",
  slotSummaryLabel: "Selected slot",
  slotSummaryEmptyMessage: "Select a slot in Booking Calendar first.",
  customerNameLabel: "Full name",
  customerFirstNameLabel: "First name",
  customerLastNameLabel: "Last name",
  customerEmailLabel: "Email",
  customerPhoneLabel: "Phone",
  notesLabel: "Notes",
  customerNamePlaceholder: "Your name",
  customerFirstNamePlaceholder: "Jamie",
  customerLastNamePlaceholder: "Doe",
  customerEmailPlaceholder: "you@example.com",
  customerPhonePlaceholder: "+1 000 000 000",
  notesPlaceholder: "Optional notes",
  submitLabel: "Book appointment",
  loadingMessage: "Booking...",
  successMessage: "Appointment booked successfully.",
  noSelectionMessage: "Select a slot first.",
  showServiceInSummary: true,
  showResourceInSummary: true,
  locale: "",
  showEmail: true,
  showPhone: true,
  showNotes: true,
  requiredEmail: false,
  requiredPhone: false,
  nameMode: "full",
  phonePattern: "^\\+?[0-9()\\-.\\s]{7,20}$",
  phonePatternMessage: "Use digits, spaces, parentheses, or an optional leading +.",
  notesMaxLength: 500,
  consent: {
    enabled: false,
    label: "I agree to the booking terms.",
    required: true,
    privacyUrl: "",
    termsUrl: "",
  },
  submissionEndpoint: "/api/booking/reservations",
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

const safeRelativeEndpoint = (value: string | undefined, fallback: string) => {
  const normalized = optionalText(value) ?? fallback;
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
  try {
    const url = new URL(normalized, "https://coderso.local");
    if (url.origin !== "https://coderso.local") return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
};

const bool = (value: boolean | undefined, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const intInRange = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(Number(value))));
};

const nameMode = (value: AppointmentFormData["nameMode"]): AppointmentFormNameMode =>
  value === "split" ? "split" : "full";

const bookingLink = (value: string | undefined) => {
  const normalized = optionalText(value);
  if (!normalized) return undefined;
  if (normalized.startsWith("/")) return normalized;
  try {
    const url = new URL(normalized);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const appointmentCustomFieldTypes = [
  "text",
  "email",
  "phone",
  "select",
  "checkbox",
  "textarea",
] as const satisfies readonly AppointmentCustomFieldType[];

const normalizeCustomFieldType = (value: unknown): AppointmentCustomFieldType =>
  typeof value === "string" &&
  appointmentCustomFieldTypes.includes(value as AppointmentCustomFieldType)
    ? (value as AppointmentCustomFieldType)
    : "text";

const normalizeCustomFieldOptions = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const options = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
  return options.length > 0 ? options : undefined;
};

const normalizeAppointmentCustomFields = (value: unknown): AppointmentCustomField[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const usedIds = new Set<string>();
  const fields = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const field = entry as AppointmentCustomField;
      const label = optionalText(field.label);
      if (!label) return null;

      const type = normalizeCustomFieldType(field.type);
      const baseId = optionalText(field.id) ?? `custom-field-${index + 1}`;
      let nextId = baseId;
      let suffix = 2;
      while (usedIds.has(nextId)) {
        nextId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(nextId);

      return compactObject({
        id: nextId,
        label,
        type,
        required: bool(field.required, false) ? true : undefined,
        placeholder: type === "checkbox" ? undefined : optionalText(field.placeholder),
        options: type === "select" ? normalizeCustomFieldOptions(field.options) : undefined,
      }) as AppointmentCustomField;
    })
    .filter((field): field is AppointmentCustomField => Boolean(field))
    .slice(0, 12);

  return fields.length > 0 ? fields : undefined;
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
    customerFirstNameLabel: { type: "string" },
    customerLastNameLabel: { type: "string" },
    customerEmailLabel: { type: "string" },
    customerPhoneLabel: { type: "string" },
    notesLabel: { type: "string" },
    customerNamePlaceholder: { type: "string" },
    customerFirstNamePlaceholder: { type: "string" },
    customerLastNamePlaceholder: { type: "string" },
    customerEmailPlaceholder: { type: "string" },
    customerPhonePlaceholder: { type: "string" },
    notesPlaceholder: { type: "string" },
    submitLabel: { type: "string" },
    loadingMessage: { type: "string" },
    successMessage: { type: "string" },
    noSelectionMessage: { type: "string" },
    showServiceInSummary: { type: "boolean" },
    showResourceInSummary: { type: "boolean" },
    locale: { type: "string" },
    successRedirectUrl: { type: "string" },
    showEmail: { type: "boolean" },
    showPhone: { type: "boolean" },
    showNotes: { type: "boolean" },
    requiredEmail: { type: "boolean" },
    requiredPhone: { type: "boolean" },
    nameMode: { enum: ["full", "split"] },
    phonePattern: { type: "string" },
    phonePatternMessage: { type: "string" },
    notesMaxLength: { type: "integer", minimum: 50, maximum: 2000 },
    customFields: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "type"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          type: { enum: [...appointmentCustomFieldTypes] },
          required: { type: "boolean" },
          placeholder: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    consent: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
        required: { type: "boolean" },
        privacyUrl: { type: "string" },
        termsUrl: { type: "string" },
      },
    },
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
        submitTextColor: { type: "string" },
      },
    },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        submissionNonce: { type: ["string", "null"] },
        error: { type: "string" },
        captcha: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            provider: { enum: ["recaptcha_v3"] },
            siteKey: { type: "string" },
            action: { enum: ["public_write"] },
          },
        },
      },
    },
  },
} as const;

export function normalizeAppointmentFormData(data: AppointmentFormData): AppointmentFormData {
  const hasStyleObject = data.style !== undefined;
  const customFields = normalizeAppointmentCustomFields(data.customFields);
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(data.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
        summaryBackground: resolveClearableStyleValue(data.style?.summaryBackground),
        summaryBorderColor: resolveClearableStyleValue(data.style?.summaryBorderColor),
        submitBackground: resolveClearableStyleValue(data.style?.submitBackground),
        submitTextColor: resolveClearableStyleValue(data.style?.submitTextColor),
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
    customerFirstNameLabel: text(
      data.customerFirstNameLabel,
      appointmentFormDefaults.customerFirstNameLabel ?? "First name"
    ),
    customerLastNameLabel: text(
      data.customerLastNameLabel,
      appointmentFormDefaults.customerLastNameLabel ?? "Last name"
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
    customerFirstNamePlaceholder: text(
      data.customerFirstNamePlaceholder,
      appointmentFormDefaults.customerFirstNamePlaceholder ?? "Jamie"
    ),
    customerLastNamePlaceholder: text(
      data.customerLastNamePlaceholder,
      appointmentFormDefaults.customerLastNamePlaceholder ?? "Doe"
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
    loadingMessage: text(
      data.loadingMessage,
      appointmentFormDefaults.loadingMessage ?? "Booking..."
    ),
    successMessage: text(
      data.successMessage,
      appointmentFormDefaults.successMessage ?? "Appointment booked successfully."
    ),
    noSelectionMessage: text(
      data.noSelectionMessage,
      appointmentFormDefaults.noSelectionMessage ?? "Select a slot first."
    ),
    showServiceInSummary: bool(
      data.showServiceInSummary,
      appointmentFormDefaults.showServiceInSummary !== false
    ),
    showResourceInSummary: bool(
      data.showResourceInSummary,
      appointmentFormDefaults.showResourceInSummary !== false
    ),
    locale: optionalText(data.locale),
    successRedirectUrl: optionalText(data.successRedirectUrl),
    showEmail: bool(data.showEmail, appointmentFormDefaults.showEmail !== false),
    showPhone: bool(data.showPhone, appointmentFormDefaults.showPhone !== false),
    showNotes: bool(data.showNotes, appointmentFormDefaults.showNotes !== false),
    requiredEmail:
      bool(data.showEmail, appointmentFormDefaults.showEmail !== false) &&
      bool(data.requiredEmail, appointmentFormDefaults.requiredEmail === true),
    requiredPhone:
      bool(data.showPhone, appointmentFormDefaults.showPhone !== false) &&
      bool(data.requiredPhone, appointmentFormDefaults.requiredPhone === true),
    nameMode: nameMode(data.nameMode),
    phonePattern: text(
      data.phonePattern,
      appointmentFormDefaults.phonePattern ?? "^\\+?[0-9()\\-.\\s]{7,20}$"
    ),
    phonePatternMessage: text(
      data.phonePatternMessage,
      appointmentFormDefaults.phonePatternMessage ??
        "Use digits, spaces, parentheses, or an optional leading +."
    ),
    notesMaxLength: intInRange(
      data.notesMaxLength,
      appointmentFormDefaults.notesMaxLength ?? 500,
      50,
      2000
    ),
    ...(customFields ? { customFields } : {}),
    consent: {
      enabled: bool(data.consent?.enabled, appointmentFormDefaults.consent?.enabled === true),
      label: text(
        data.consent?.label,
        appointmentFormDefaults.consent?.label ?? "I agree to the booking terms."
      ),
      required:
        bool(data.consent?.enabled, appointmentFormDefaults.consent?.enabled === true) &&
        bool(data.consent?.required, appointmentFormDefaults.consent?.required !== false),
      privacyUrl: bookingLink(data.consent?.privacyUrl),
      termsUrl: bookingLink(data.consent?.termsUrl),
    },
    submissionEndpoint: safeRelativeEndpoint(
      data.submissionEndpoint,
      appointmentFormDefaults.submissionEndpoint ?? "/api/booking/reservations"
    ),
    ...(hasStyleObject ? { style } : {}),
    resolved: {
      submissionNonce: optionalText(data.resolved?.submissionNonce ?? undefined) ?? null,
      ...(optionalText(data.resolved?.error) ? { error: text(data.resolved?.error, "") } : {}),
      ...(data.resolved?.captcha?.siteKey
        ? {
            captcha: {
              provider: "recaptcha_v3" as const,
              siteKey: text(data.resolved.captcha.siteKey, ""),
              action: "public_write" as const,
            },
          }
        : {}),
    },
  };
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-1 text-xs font-medium text-[var(--color-text)]/80">
    <span>{label}</span>
    {children}
  </label>
);

const renderAppointmentCustomField = (field: AppointmentCustomField) => {
  const sharedProps = {
    "data-appointment-custom-field": field.id,
    "data-appointment-custom-field-label": field.label,
    "data-appointment-custom-field-type": field.type,
    className:
      "w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]",
  };

  if (field.type === "textarea") {
    return (
      <textarea
        {...sharedProps}
        name={`customField:${field.id}`}
        required={field.required === true}
        placeholder={field.placeholder}
        className={`min-h-24 ${sharedProps.className}`}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          name={`customField:${field.id}`}
          required={field.required === true}
          data-appointment-custom-field={field.id}
          data-appointment-custom-field-label={field.label}
          data-appointment-custom-field-type={field.type}
          className="h-4 w-4"
        />
        <span>{field.placeholder ?? "Select if applicable"}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <select
        {...sharedProps}
        name={`customField:${field.id}`}
        required={field.required === true}
        defaultValue=""
      >
        <option value="" disabled={field.required === true}>
          {field.placeholder ?? "Choose an option"}
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const inputType = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  const autoComplete =
    field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined;

  return (
    <input
      {...sharedProps}
      type={inputType}
      autoComplete={autoComplete}
      name={`customField:${field.id}`}
      required={field.required === true}
      placeholder={field.placeholder}
    />
  );
};

const resolveVariantClasses = (variant: string) => {
  switch (variant) {
    case "compact":
      return {
        root: "space-y-3 rounded-xl border p-4",
        header: "space-y-1",
        form: "space-y-2",
      };
    case "inline":
      return {
        root: "space-y-4 rounded-xl border p-4 md:p-5",
        header: "space-y-1",
        form: "grid gap-3 md:grid-cols-2",
      };
    case "sidebar":
      return {
        root: "space-y-4 rounded-xl border p-5 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-5",
        header: "space-y-1 lg:pr-4",
        form: "space-y-3",
      };
    case "card-summary":
      return {
        root: "space-y-4 rounded-2xl border p-6 shadow-sm",
        header: "space-y-2",
        form: "space-y-3",
      };
    default:
      return {
        root: "space-y-4 rounded-xl border p-5",
        header: "space-y-1",
        form: "space-y-3",
      };
  }
};

export function AppointmentFormBlock({
  data,
  variant,
}: {
  data: AppointmentFormData;
  variant: string;
}) {
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
  const customerFirstNameLabel =
    normalized.customerFirstNameLabel ??
    appointmentFormDefaults.customerFirstNameLabel ??
    "First name";
  const customerLastNameLabel =
    normalized.customerLastNameLabel ??
    appointmentFormDefaults.customerLastNameLabel ??
    "Last name";
  const customerFirstNamePlaceholder =
    normalized.customerFirstNamePlaceholder ??
    appointmentFormDefaults.customerFirstNamePlaceholder ??
    "Jamie";
  const customerLastNamePlaceholder =
    normalized.customerLastNamePlaceholder ??
    appointmentFormDefaults.customerLastNamePlaceholder ??
    "Doe";
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
  const loadingMessage =
    normalized.loadingMessage ?? appointmentFormDefaults.loadingMessage ?? "Booking...";
  const noSelectionMessage =
    normalized.noSelectionMessage ??
    appointmentFormDefaults.noSelectionMessage ??
    "Select a slot first.";
  const titleText = normalized.title ?? appointmentFormDefaults.title ?? "Appointment details";
  const descriptionText =
    normalized.description ??
    appointmentFormDefaults.description ??
    "Provide contact details and confirm the selected slot.";
  const showEmail = normalized.showEmail !== false;
  const showPhone = normalized.showPhone !== false;
  const showNotes = normalized.showNotes !== false;
  const isSplitName = normalized.nameMode === "split";
  const phonePattern =
    normalized.phonePattern ?? appointmentFormDefaults.phonePattern ?? "^\\+?[0-9()\\-.\\s]{7,20}$";
  const phonePatternMessage =
    normalized.phonePatternMessage ??
    appointmentFormDefaults.phonePatternMessage ??
    "Use digits, spaces, parentheses, or an optional leading +.";
  const notesMaxLength = normalized.notesMaxLength ?? appointmentFormDefaults.notesMaxLength ?? 500;
  const consent = normalized.consent ?? appointmentFormDefaults.consent ?? {};
  const showConsent = (consent.enabled ?? false) && (consent.label ?? "").trim().length > 0;
  const formLabel = titleText.trim().length > 0 ? titleText.trim() : "Appointment form";
  const formDescription =
    descriptionText.trim().length > 0
      ? descriptionText.trim()
      : "Provide your contact details and confirm the selected slot.";
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
    color: resolveClearableStyleValue(normalized.style?.submitTextColor),
  });
  const variantClasses = resolveVariantClasses(variant);
  const legacyFrameClass =
    normalized.style === undefined ? "border-[var(--color-border)] bg-[var(--color-bg)]/95" : "";
  const legacySummaryClass =
    normalized.style === undefined ? "border-[var(--color-border)]/70 bg-[var(--color-bg)]/70" : "";
  const legacySubmitClass = normalized.style === undefined ? "bg-[var(--color-primary)]" : "";
  const legacySubmitTextClass = normalized.style?.submitTextColor ? "" : "text-[var(--color-bg)]";

  return (
    <section className={`${variantClasses.root} ${legacyFrameClass}`} style={frameStyle}>
      <div className={variantClasses.header}>
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
        className={variantClasses.form}
        data-nextless-appointment-form="1"
        data-flow-id={normalized.flowId}
        data-submission-endpoint={submissionEndpoint}
        data-loading-message={loadingMessage}
        data-locale={normalized.locale ?? ""}
        data-show-service-in-summary={normalized.showServiceInSummary === false ? "false" : "true"}
        data-show-resource-in-summary={
          normalized.showResourceInSummary === false ? "false" : "true"
        }
        data-captcha-site-key={normalized.resolved?.captcha?.siteKey ?? ""}
        data-captcha-action={normalized.resolved?.captcha?.action ?? ""}
        data-success-redirect={normalized.successRedirectUrl ?? ""}
        data-success-message={successMessage}
        aria-label={formLabel}
        aria-description={formDescription}
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

        {isSplitName ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={customerFirstNameLabel}>
              <input
                required
                name="customerFirstName"
                placeholder={customerFirstNamePlaceholder}
                autoComplete="given-name"
                className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </Field>

            <Field label={customerLastNameLabel}>
              <input
                required
                name="customerLastName"
                placeholder={customerLastNamePlaceholder}
                autoComplete="family-name"
                className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
              />
            </Field>
          </div>
        ) : (
          <Field label={customerNameLabel}>
            <input
              required
              name="customerName"
              placeholder={customerNamePlaceholder}
              autoComplete="name"
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </Field>
        )}

        {showEmail ? (
          <Field label={customerEmailLabel}>
            <input
              type="email"
              name="customerEmail"
              required={normalized.requiredEmail === true}
              placeholder={customerEmailPlaceholder}
              autoComplete="email"
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </Field>
        ) : null}

        {showPhone ? (
          <Field label={customerPhoneLabel}>
            <input
              type="tel"
              name="customerPhone"
              required={normalized.requiredPhone === true}
              pattern={phonePattern}
              title={phonePatternMessage}
              placeholder={customerPhonePlaceholder}
              autoComplete="tel"
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <p className="text-[11px] text-[var(--color-text)]/65">{phonePatternMessage}</p>
          </Field>
        ) : null}

        {showNotes ? (
          <Field label={notesLabel}>
            <textarea
              name="notes"
              placeholder={notesPlaceholder}
              maxLength={notesMaxLength}
              className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <p
              aria-live="polite"
              className="text-[11px] text-[var(--color-text)]/65"
              data-booking-notes-counter
            >
              0 / {notesMaxLength} characters
            </p>
          </Field>
        ) : null}

        {(normalized.customFields ?? []).map((field) =>
          field.type === "checkbox" ? (
            <div
              key={field.id}
              className="space-y-1 text-xs font-medium text-[var(--color-text)]/80"
            >
              <span>{field.label}</span>
              {renderAppointmentCustomField(field)}
            </div>
          ) : (
            <Field key={field.id} label={field.label}>
              {renderAppointmentCustomField(field)}
            </Field>
          )
        )}

        {showConsent ? (
          <label className="flex items-start gap-2 rounded-md border border-[var(--color-border)]/70 px-3 py-2 text-xs text-[var(--color-text)]/80">
            <input
              type="checkbox"
              name="consentAccepted"
              required={consent.required === true}
              className="mt-0.5"
              data-booking-consent-input
              data-booking-consent-label={consent.label ?? ""}
            />
            <span>
              {consent.label}
              {consent.privacyUrl ? (
                <>
                  {" "}
                  <a
                    className="underline"
                    href={consent.privacyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy policy
                  </a>
                </>
              ) : null}
              {consent.termsUrl ? (
                <>
                  {" "}
                  <a className="underline" href={consent.termsUrl} target="_blank" rel="noreferrer">
                    Terms
                  </a>
                </>
              ) : null}
            </span>
          </label>
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
          data-idle-label={submitLabel}
          disabled
          className={`rounded-md px-4 py-2 text-sm font-semibold ${legacySubmitClass} ${legacySubmitTextClass}`}
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
      {
        id: "compact",
        label: "Compact",
        description: "Tighter spacing for short appointment forms.",
      },
      {
        id: "inline",
        label: "Inline",
        description: "Balanced two-column form layout for wider surfaces.",
      },
      {
        id: "sidebar",
        label: "Sidebar",
        description: "Emphasize the booking summary beside the form.",
      },
      {
        id: "card-summary",
        label: "Card summary",
        description: "Larger framed presentation with extra summary emphasis.",
      },
    ],
    schema: appointmentFormSchema,
    defaults: appointmentFormDefaults,
    editor: {
      wizard: editors.wizard,
      visual: editors.visual,
      advanced: editors.advanced,
    },
    editorContract: appointmentFormEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: AppointmentFormBlock,
  };
}
