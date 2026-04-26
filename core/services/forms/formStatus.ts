export const FORM_STATUS_VALUES = ["draft", "published", "archived"] as const;

export type FormStatus = (typeof FORM_STATUS_VALUES)[number];

const formStatuses = new Set<string>(FORM_STATUS_VALUES);

export const isFormStatus = (value: unknown): value is FormStatus =>
  typeof value === "string" && formStatuses.has(value);

export const normalizeFormStatus = (
  value: unknown,
  fallback: FormStatus
): FormStatus => {
  if (value === undefined || value === null) return fallback;
  if (isFormStatus(value)) return value;
  throw new Error("form_invalid");
};
