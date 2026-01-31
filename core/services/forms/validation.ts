import { randomUUID } from "node:crypto";

export type FormFieldType =
  | "text"
  | "email"
  | "select"
  | "checkbox"
  | "textarea"
  | "phone"
  | "date";

export type FormFieldSettings = {
  placeholder?: string;
  helper?: string;
  options?: string[];
  defaultValue?: string | boolean;
  pattern?: string;
};

export type FormFieldInput = {
  id?: string;
  type: FormFieldType;
  label: string;
  name?: string;
  required?: boolean;
  orderIndex?: number;
  settings?: FormFieldSettings;
};

export type NormalizedFormField = {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: FormFieldSettings;
};

const fieldTypes = new Set<FormFieldType>([
  "text",
  "email",
  "select",
  "checkbox",
  "textarea",
  "phone",
  "date",
]);

const assertPlainObject = (value: unknown) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeFieldName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)+/g, "");

const normalizeOptions = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("form_field_invalid");
  const options = value
    .map((entry) => normalizeString(entry))
    .filter(Boolean) as string[];
  return Array.from(new Set(options));
};

const normalizeSettings = (
  type: FormFieldType,
  settings?: FormFieldSettings
): FormFieldSettings => {
  if (settings === undefined) {
    return {};
  }
  if (!assertPlainObject(settings)) throw new Error("form_field_invalid");
  const normalized: FormFieldSettings = {};

  if (settings.placeholder !== undefined) {
    const placeholder = normalizeString(settings.placeholder);
    if (!placeholder) throw new Error("form_field_invalid");
    normalized.placeholder = placeholder;
  }
  if (settings.helper !== undefined) {
    const helper = normalizeString(settings.helper);
    if (!helper) throw new Error("form_field_invalid");
    normalized.helper = helper;
  }
  if (settings.pattern !== undefined) {
    const pattern = normalizeString(settings.pattern);
    if (!pattern) throw new Error("form_field_invalid");
    normalized.pattern = pattern;
  }
  if (settings.defaultValue !== undefined) {
    if (type === "checkbox" && typeof settings.defaultValue === "boolean") {
      normalized.defaultValue = settings.defaultValue;
    } else if (typeof settings.defaultValue === "string") {
      const trimmed = settings.defaultValue.trim();
      if (!trimmed) throw new Error("form_field_invalid");
      normalized.defaultValue = trimmed;
    } else {
      throw new Error("form_field_invalid");
    }
  }

  if (type === "select") {
    normalized.options = normalizeOptions(settings.options);
  }

  return normalized;
};

const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  throw new Error("form_payload_invalid");
};

export function normalizeFormFields(fields: FormFieldInput[]): NormalizedFormField[] {
  if (!Array.isArray(fields)) {
    throw new Error("form_fields_invalid");
  }

  const normalized = fields.map((field, index) => {
    if (!assertPlainObject(field)) {
      throw new Error("form_fields_invalid");
    }

    if (!fieldTypes.has(field.type)) {
      throw new Error("form_field_invalid");
    }

    const label = normalizeString(field.label);
    if (!label) throw new Error("form_field_label_required");

    const baseName = normalizeString(field.name) ?? normalizeFieldName(label);
    const name = baseName || `field_${index + 1}`;

    const id = normalizeString(field.id) ?? randomUUID();
    const orderIndex = Number.isFinite(field.orderIndex) ? Number(field.orderIndex) : index;
    const required = field.required ?? false;
    const settings = normalizeSettings(field.type, field.settings);

    return {
      id,
      type: field.type,
      label,
      name,
      required,
      orderIndex,
      settings,
    };
  });

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  for (const field of normalized) {
    if (seenIds.has(field.id)) throw new Error("form_field_id_duplicate");
    seenIds.add(field.id);

    if (seenNames.has(field.name)) throw new Error("form_field_name_duplicate");
    seenNames.add(field.name);
  }

  return normalized;
}

export function validateSubmissionPayload(
  payload: unknown,
  fields: NormalizedFormField[]
) {
  if (!assertPlainObject(payload)) throw new Error("form_payload_invalid");
  const data = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  const allowedNames = new Set(fields.map((field) => field.name));
  for (const key of Object.keys(data)) {
    if (!allowedNames.has(key)) {
      throw new Error("form_payload_unknown_field");
    }
  }

  for (const field of fields) {
    const value = data[field.name];
    if (value === undefined || value === null || value === "") {
      if (field.required) {
        throw new Error("form_payload_required");
      }
      continue;
    }

    switch (field.type) {
      case "checkbox": {
        const parsed = parseBoolean(value);
        if (field.required && parsed !== true) {
          throw new Error("form_payload_required");
        }
        normalized[field.name] = parsed;
        break;
      }
      case "select": {
        const text = normalizeString(value);
        if (!text) {
          if (field.required) throw new Error("form_payload_required");
          break;
        }
        if (field.settings.options && field.settings.options.length > 0) {
          if (!field.settings.options.includes(text)) {
            throw new Error("form_payload_invalid");
          }
        }
        normalized[field.name] = text;
        break;
      }
      default: {
        const text = normalizeString(value);
        if (!text) {
          if (field.required) throw new Error("form_payload_required");
          break;
        }
        if (field.settings.pattern) {
          try {
            const regex = new RegExp(field.settings.pattern);
            if (!regex.test(text)) {
              throw new Error("form_payload_invalid");
            }
          } catch {
            throw new Error("form_payload_invalid");
          }
        }
        normalized[field.name] = text;
        break;
      }
    }
  }

  return normalized;
}

export function deriveFormSlug(name: string, slug?: string | null) {
  const base = normalizeString(slug ?? null) ?? slugify(name);
  if (!base) throw new Error("form_slug_required");
  return base;
}
