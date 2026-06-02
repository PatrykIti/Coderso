export const appointmentFormCustomFieldTypes = [
  "text",
  "email",
  "phone",
  "select",
  "checkbox",
  "textarea",
] as const;

export const appointmentFormFieldLimits = {
  customerName: 200,
  customerNamePart: 100,
  customerEmail: 320,
  customerPhone: 64,
  notes: 2000,
  customFieldId: 120,
  customFieldLabel: 240,
  customFieldValue: 2000,
  customFieldOptions: 12,
  customFields: 12,
  consentLabel: 240,
  metadataFlowId: 120,
  metadataPathname: 512,
  timezone: 120,
  captchaToken: 4096,
  formNonce: 1024,
} as const;

export const clampAppointmentFormText = (value: string, maxLength: number) =>
  value.slice(0, maxLength);
