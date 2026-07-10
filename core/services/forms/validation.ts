import { randomUUID } from "node:crypto";
import Ajv, { type ValidateFunction } from "ajv";
import { normalizeFormStep } from "./formSettings";
import {
  evaluateFormFieldLogic,
  formFieldLogicSchema,
  formFieldStyleSchema,
  FORM_FIELD_SHARED_LIMITS,
  normalizeFormFieldLogic,
  normalizeFormFieldStyle,
  type FormFieldLogic,
  type FormFieldStyle,
} from "./fieldSettings";

export const FORM_FIELD_TYPE_VALUES = [
  "text",
  "email",
  "select",
  "radio",
  "number",
  "time",
  "range",
  "rating",
  "hidden",
  "checkbox",
  "textarea",
  "phone",
  "file",
  "date",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPE_VALUES)[number];

export const FORM_FIELD_SCHEMA_LIMITS = {
  fields: 100,
  label: 240,
  name: FORM_FIELD_SHARED_LIMITS.name,
  orderIndex: 9_999,
  settingText: FORM_FIELD_SHARED_LIMITS.settingText,
  pattern: 256,
  options: 100,
  mimeTokens: 32,
  mimeToken: 127,
  numericMagnitude: 1_000_000_000_000,
  submissionString: 20_000,
  submissionArray: 20,
  formNonce: 1_024,
  captchaToken: 4_096,
} as const;

export const FORM_UUID_PATTERN =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

export const FORM_MIME_TOKEN_PATTERN = "^\\s*[A-Za-z0-9.+-]+/[A-Za-z0-9.*+-]+\\s*$";

export type FormFieldSettings = {
  placeholder?: string;
  helper?: string;
  options?: string[];
  defaultValue?: string | boolean;
  pattern?: string;
  min?: number;
  max?: number;
  formStep?: number;
  inputStep?: number;
  step?: number;
  accept?: string[];
  maxSizeMb?: number;
  multiple?: boolean;
  logic?: FormFieldLogic;
  style?: FormFieldStyle;
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

type JsonSchema = Readonly<Record<string, unknown>>;

const optionalAuthoringTextSchema = {
  type: "string",
  maxLength: FORM_FIELD_SCHEMA_LIMITS.settingText,
} as const;

const optionalPatternSchema = {
  type: "string",
  maxLength: FORM_FIELD_SCHEMA_LIMITS.pattern,
} as const;

const commonFieldSettingProperties = {
  placeholder: optionalAuthoringTextSchema,
  helper: optionalAuthoringTextSchema,
  pattern: optionalPatternSchema,
  defaultValue: optionalAuthoringTextSchema,
  formStep: { type: "integer", minimum: 1, maximum: 10 },
  step: { type: "integer", minimum: 1, maximum: 10 },
  logic: formFieldLogicSchema,
  style: formFieldStyleSchema,
} as const;

const boundedNumberSchema = {
  type: "number",
  minimum: -FORM_FIELD_SCHEMA_LIMITS.numericMagnitude,
  maximum: FORM_FIELD_SCHEMA_LIMITS.numericMagnitude,
} as const;

const positiveStepSchema = {
  type: "number",
  exclusiveMinimum: 0,
  maximum: FORM_FIELD_SCHEMA_LIMITS.numericMagnitude,
} as const;

const optionListSchema = {
  type: "array",
  maxItems: FORM_FIELD_SCHEMA_LIMITS.options,
  items: {
    type: "string",
    minLength: 1,
    maxLength: FORM_FIELD_SCHEMA_LIMITS.settingText,
  },
} as const;

const strictSettingsSchema = (
  extraProperties: Record<string, unknown> = {},
  options: { required?: readonly string[]; overrides?: Record<string, unknown> } = {}
): JsonSchema => ({
  type: "object",
  ...(options.required ? { required: options.required } : {}),
  properties: {
    ...commonFieldSettingProperties,
    ...extraProperties,
    ...options.overrides,
  },
  additionalProperties: false,
});

export const fieldSettingsSchemaByType = {
  text: strictSettingsSchema(),
  email: strictSettingsSchema(),
  select: strictSettingsSchema({ options: optionListSchema }),
  radio: strictSettingsSchema({ options: optionListSchema }),
  number: strictSettingsSchema({
    min: boundedNumberSchema,
    max: boundedNumberSchema,
    inputStep: positiveStepSchema,
  }),
  time: strictSettingsSchema(
    { inputStep: positiveStepSchema },
    {
      overrides: {
        defaultValue: {
          type: "string",
          maxLength: FORM_FIELD_SCHEMA_LIMITS.settingText,
          pattern: "^(?:\\s*|(?:[01]\\d|2[0-3]):[0-5]\\d)$",
        },
      },
    }
  ),
  range: strictSettingsSchema({
    min: boundedNumberSchema,
    max: boundedNumberSchema,
    inputStep: positiveStepSchema,
  }),
  rating: strictSettingsSchema({
    max: { type: "integer", minimum: 3, maximum: 10 },
  }),
  hidden: strictSettingsSchema(
    {},
    {
      required: ["defaultValue"],
      overrides: {
        defaultValue: {
          type: "string",
          minLength: 1,
          maxLength: FORM_FIELD_SCHEMA_LIMITS.settingText,
          pattern: "\\S",
        },
      },
    }
  ),
  checkbox: strictSettingsSchema(
    {},
    {
      overrides: {
        defaultValue: {
          anyOf: [{ type: "boolean" }, optionalAuthoringTextSchema],
        },
      },
    }
  ),
  textarea: strictSettingsSchema(),
  phone: strictSettingsSchema(),
  file: strictSettingsSchema({
    accept: {
      type: "array",
      maxItems: FORM_FIELD_SCHEMA_LIMITS.mimeTokens,
      items: {
        type: "string",
        minLength: 1,
        maxLength: FORM_FIELD_SCHEMA_LIMITS.mimeToken,
        pattern: FORM_MIME_TOKEN_PATTERN,
      },
    },
    maxSizeMb: { type: "integer", minimum: 1, maximum: 100 },
    multiple: { type: "boolean" },
  }),
  date: strictSettingsSchema(),
} satisfies Record<FormFieldType, JsonSchema>;

const fieldBaseProperties = {
  id: { type: "string", pattern: FORM_UUID_PATTERN },
  label: {
    type: "string",
    minLength: 1,
    maxLength: FORM_FIELD_SCHEMA_LIMITS.label,
  },
  name: {
    type: "string",
    minLength: 1,
    maxLength: FORM_FIELD_SCHEMA_LIMITS.name,
  },
  required: { type: "boolean" },
  orderIndex: {
    type: "integer",
    minimum: 0,
    maximum: FORM_FIELD_SCHEMA_LIMITS.orderIndex,
  },
} as const;

export const formFieldSchema = {
  oneOf: FORM_FIELD_TYPE_VALUES.map((type) => ({
    type: "object",
    required: type === "hidden" ? ["type", "label", "settings"] : ["type", "label"],
    properties: {
      ...fieldBaseProperties,
      type: { const: type },
      settings: fieldSettingsSchemaByType[type],
    },
    additionalProperties: false,
  })),
} as const;

export const formFieldsWriteSchema = {
  type: "array",
  maxItems: FORM_FIELD_SCHEMA_LIMITS.fields,
  items: formFieldSchema,
} as const;

const mediaIdStringSchema = { type: "string", pattern: FORM_UUID_PATTERN } as const;
const mediaIdObjectSchema = {
  type: "object",
  required: ["id"],
  properties: { id: mediaIdStringSchema },
  additionalProperties: false,
} as const;

const formSubmissionValueSchema = {
  anyOf: [
    { type: "null" },
    { type: "boolean" },
    boundedNumberSchema,
    { type: "string", maxLength: FORM_FIELD_SCHEMA_LIMITS.submissionString },
    mediaIdObjectSchema,
    {
      type: "array",
      maxItems: FORM_FIELD_SCHEMA_LIMITS.submissionArray,
      items: { anyOf: [mediaIdStringSchema, mediaIdObjectSchema] },
    },
  ],
} as const;

export const formSubmissionDataSchema = {
  type: "object",
  maxProperties: FORM_FIELD_SCHEMA_LIMITS.fields,
  propertyNames: {
    type: "string",
    minLength: 1,
    maxLength: FORM_FIELD_SCHEMA_LIMITS.name,
  },
  additionalProperties: formSubmissionValueSchema,
} as const;

export const formSubmissionWriteSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: formSubmissionDataSchema,
    formNonce: {
      type: "string",
      minLength: 1,
      maxLength: FORM_FIELD_SCHEMA_LIMITS.formNonce,
    },
    captchaToken: {
      type: "string",
      minLength: 1,
      maxLength: FORM_FIELD_SCHEMA_LIMITS.captchaToken,
    },
  },
  additionalProperties: false,
} as const;

export const formAttachmentUploadWriteSchema = {
  type: "object",
  required: ["fieldName", "file"],
  properties: {
    fieldName: {
      type: "string",
      minLength: 1,
      maxLength: FORM_FIELD_SCHEMA_LIMITS.name,
    },
    file: { type: "object" },
    formNonce: {
      type: "string",
      minLength: 1,
      maxLength: FORM_FIELD_SCHEMA_LIMITS.formNonce,
    },
    captchaToken: {
      type: "string",
      minLength: 1,
      maxLength: FORM_FIELD_SCHEMA_LIMITS.captchaToken,
    },
  },
  additionalProperties: false,
} as const;

const fieldTypes = new Set<FormFieldType>(FORM_FIELD_TYPE_VALUES);

const MEDIA_ID_RE = new RegExp(FORM_UUID_PATTERN);
const MIME_TOKEN_RE = /^[a-z0-9.+-]+\/[a-z0-9.*+-]+$/;

const hasPatternControlCharacter = (pattern: string): boolean => {
  for (const char of pattern) {
    const codePoint = char.codePointAt(0);
    if (
      codePoint !== undefined &&
      (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
    ) {
      return true;
    }
  }
  return false;
};

const readBraceQuantifier = (
  pattern: string,
  index: number
): { length: number; variable: boolean } | null => {
  const match = pattern.slice(index).match(/^\{\d+(?:,\d*)?\}/);
  if (!match) return null;
  const body = match[0].slice(1, -1);
  const [minimum, maximum] = body.split(",");
  return {
    length: match[0].length,
    variable: maximum !== undefined && maximum !== minimum,
  };
};

const hasUnsafePatternStructure = (pattern: string): boolean => {
  let inCharacterClass = false;
  let previousWasQuantifier = false;
  let variableQuantifierCount = 0;

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "\\") {
      const escaped = pattern[index + 1];
      if (escaped && (/[1-9]/.test(escaped) || escaped === "k")) return true;
      index += 1;
      previousWasQuantifier = false;
      continue;
    }
    if (inCharacterClass) {
      if (char === "]") inCharacterClass = false;
      continue;
    }
    if (char === "[") {
      inCharacterClass = true;
      previousWasQuantifier = false;
      continue;
    }
    if (char === "(" && pattern[index + 1] === "?") return true;
    if (char === ")") {
      const next = pattern[index + 1];
      if (next === "*" || next === "+" || next === "?" || next === "{") return true;
      previousWasQuantifier = false;
      continue;
    }

    const braceQuantifier = char === "{" ? readBraceQuantifier(pattern, index) : null;
    const isSimpleVariableQuantifier = char === "*" || char === "+" || char === "?";
    const isQuantifier = isSimpleVariableQuantifier || braceQuantifier !== null;
    if (isQuantifier) {
      if (previousWasQuantifier) return true;
      if (isSimpleVariableQuantifier || braceQuantifier?.variable) {
        variableQuantifierCount += 1;
        // A single variable repetition over an ungrouped atom is the intentionally
        // conservative grammar. Multiple repetitions can overlap through nullable or
        // equivalent atoms (`a*a*...`) and produce super-linear backtracking even when
        // no group is quantified.
        if (variableQuantifierCount > 1) return true;
      }
      previousWasQuantifier = true;
      if (braceQuantifier) index += braceQuantifier.length - 1;
      continue;
    }
    previousWasQuantifier = false;
  }
  return false;
};

export function compileSafeFormFieldPattern(
  pattern: unknown,
  failureCode = "form_field_invalid"
): RegExp {
  if (
    typeof pattern !== "string" ||
    pattern.length === 0 ||
    pattern.length > FORM_FIELD_SCHEMA_LIMITS.pattern * 2 ||
    Array.from(pattern).length > FORM_FIELD_SCHEMA_LIMITS.pattern ||
    hasPatternControlCharacter(pattern) ||
    hasUnsafePatternStructure(pattern)
  ) {
    throw new Error(failureCode);
  }
  try {
    return new RegExp(pattern);
  } catch {
    throw new Error(failureCode);
  }
}

export function isSafeFormFieldPattern(pattern: unknown): pattern is string {
  try {
    compileSafeFormFieldPattern(pattern);
    return true;
  } catch {
    return false;
  }
}

let formFieldsWriteValidator: ValidateFunction | undefined;
let formSubmissionDataValidator: ValidateFunction | undefined;

const getFormFieldsWriteValidator = (): ValidateFunction => {
  if (!formFieldsWriteValidator) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictTypes: false,
      allowUnionTypes: true,
    });
    formFieldsWriteValidator = ajv.compile(formFieldsWriteSchema);
  }
  return formFieldsWriteValidator;
};

export function assertFormFieldsWriteShape(fields: unknown): asserts fields is FormFieldInput[] {
  if (!getFormFieldsWriteValidator()(fields)) {
    throw new Error("form_field_invalid");
  }
}

const assertFormSubmissionDataShape = (data: unknown): void => {
  if (!formSubmissionDataValidator) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictTypes: false,
      allowUnionTypes: true,
    });
    formSubmissionDataValidator = ajv.compile(formSubmissionDataSchema);
  }
  if (!formSubmissionDataValidator(data)) {
    throw new Error("form_payload_invalid");
  }
};

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
    .replace(/(^_|_$)+/g, "")
    .slice(0, FORM_FIELD_SCHEMA_LIMITS.name)
    .replace(/_+$/g, "");

const normalizeOptions = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("form_field_invalid");
  const options = value.map((entry) => normalizeString(entry)).filter(Boolean) as string[];
  return Array.from(new Set(options));
};

const normalizeOptionalFiniteNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error("form_field_invalid");
  return parsed;
};

const normalizeOptionalPositiveFiniteNumber = (value: unknown) => {
  const parsed = normalizeOptionalFiniteNumber(value);
  if (parsed === undefined) return undefined;
  if (parsed <= 0) throw new Error("form_field_invalid");
  return parsed;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const resolveFormFieldStep = (
  settings?: Pick<FormFieldSettings, "formStep" | "step"> | null
) => normalizeFormStep(settings?.formStep ?? settings?.step ?? 1);

export const resolveFormFieldInputStep = (
  settings?: Pick<FormFieldSettings, "inputStep"> | null
) => {
  const value = settings?.inputStep;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
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

  const normalizeOptionalSettingText = (value: unknown) => {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error("form_field_invalid");
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  if (settings.placeholder !== undefined) {
    const placeholder = normalizeOptionalSettingText(settings.placeholder);
    if (placeholder !== undefined) {
      normalized.placeholder = placeholder;
    }
  }
  if (settings.helper !== undefined) {
    const helper = normalizeOptionalSettingText(settings.helper);
    if (helper !== undefined) {
      normalized.helper = helper;
    }
  }
  if (settings.pattern !== undefined) {
    const pattern = normalizeOptionalSettingText(settings.pattern);
    if (pattern !== undefined) {
      compileSafeFormFieldPattern(pattern, "form_field_invalid");
      normalized.pattern = pattern;
    }
  }
  if (settings.defaultValue !== undefined) {
    if (type === "checkbox" && typeof settings.defaultValue === "boolean") {
      normalized.defaultValue = settings.defaultValue;
    } else if (typeof settings.defaultValue === "string") {
      const trimmed = settings.defaultValue.trim();
      if (trimmed.length > 0) {
        normalized.defaultValue = trimmed;
      }
    } else {
      throw new Error("form_field_invalid");
    }
  }

  const legacyStep = settings.step !== undefined ? normalizeFormStep(settings.step) : undefined;
  const explicitFormStep =
    settings.formStep !== undefined ? normalizeFormStep(settings.formStep) : undefined;
  const formStep = explicitFormStep ?? legacyStep;
  if (legacyStep !== undefined) {
    normalized.step = legacyStep;
  }
  if (formStep !== undefined) {
    normalized.formStep = formStep;
  }

  if (settings.inputStep !== undefined) {
    if (type !== "number" && type !== "range" && type !== "time") {
      throw new Error("form_field_invalid");
    }
    const inputStep = normalizeOptionalPositiveFiniteNumber(settings.inputStep);
    if (inputStep !== undefined) {
      normalized.inputStep = inputStep;
    }
  }

  if (type === "number" || type === "range" || type === "rating") {
    const min = normalizeOptionalFiniteNumber(settings.min);
    const max = normalizeOptionalFiniteNumber(settings.max);
    if (min !== undefined) normalized.min = min;
    if (max !== undefined) normalized.max = max;
    if (min !== undefined && max !== undefined && max < min) {
      throw new Error("form_field_invalid");
    }
  }

  if (type === "time") {
    const defaultValue =
      typeof normalized.defaultValue === "string" ? normalized.defaultValue : undefined;
    if (defaultValue && !timePattern.test(defaultValue)) {
      throw new Error("form_field_invalid");
    }
  }

  if (type === "hidden") {
    const defaultValue =
      typeof normalized.defaultValue === "string" ? normalized.defaultValue : undefined;
    if (!defaultValue) {
      throw new Error("form_field_invalid");
    }
  }

  if (type === "rating") {
    const max = normalized.max ?? 5;
    if (!Number.isInteger(max) || max < 3 || max > 10) {
      throw new Error("form_field_invalid");
    }
    normalized.max = max;
    if (normalized.min !== undefined) {
      delete normalized.min;
    }
  }

  if (type === "select" || type === "radio") {
    normalized.options = normalizeOptions(settings.options);
    const defaultValue =
      typeof normalized.defaultValue === "string" ? normalized.defaultValue : undefined;
    if (defaultValue && !normalized.options.includes(defaultValue)) {
      throw new Error("form_field_invalid");
    }
  }

  if (type === "file") {
    if (settings.accept !== undefined) {
      if (!Array.isArray(settings.accept)) throw new Error("form_field_invalid");
      const seen = new Set<string>();
      const accept: string[] = [];
      for (const entry of settings.accept) {
        if (typeof entry !== "string") continue;
        const token = entry.trim().toLowerCase();
        if (!token || !MIME_TOKEN_RE.test(token) || seen.has(token)) continue;
        seen.add(token);
        accept.push(token);
      }
      if (accept.length > 0) normalized.accept = accept;
    }
    if (settings.maxSizeMb !== undefined) {
      const parsed = normalizeOptionalFiniteNumber(settings.maxSizeMb);
      if (parsed !== undefined) {
        // Static sanity bound (1..100). The TRUE global cap is enforced at upload via
        // uploadMedia (min(field, global)); the sync normalizer cannot read the async
        // media getConfig cap.
        normalized.maxSizeMb = Math.min(100, Math.max(1, Math.round(parsed)));
      }
    }
    if (settings.multiple !== undefined) {
      normalized.multiple = Boolean(settings.multiple);
    }
  }

  const logic = normalizeFormFieldLogic(settings.logic);
  if (logic) {
    normalized.logic = logic;
  }

  const style = normalizeFormFieldStyle(settings.style);
  if (style) {
    normalized.style = style;
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

    const id = (normalizeString(field.id) ?? randomUUID()).toLowerCase();
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

type MediaRef = string | string[];

const extractOneId = (entry: unknown): string | null => {
  // Accept "<uuid>" OR { id: "<uuid>" } (the upload endpoint response shape).
  const raw =
    typeof entry === "object" && entry
      ? normalizeString((entry as { id?: unknown }).id)
      : normalizeString(entry);
  return raw && MEDIA_ID_RE.test(raw) ? raw : null;
};

/**
 * SYNC, STRUCTURAL ONLY (no DB). Discriminates an owned-media-ID reference from
 * anything else. Does NOT accept raw bytes and — to avoid cross-origin/SSRF ambiguity
 * — does NOT accept bare URLs: the canonical stored reference is the media ROW id (the
 * upload route returns `{ id }`). Returns the normalized reference, or null for
 * "present but malformed" / empty (the caller decides absent-vs-invalid).
 */
export const normalizeMediaReference = (
  value: unknown,
  settings: FormFieldSettings
): MediaRef | null => {
  if (settings.multiple === true) {
    if (!Array.isArray(value)) return null; // present-but-malformed
    const ids: string[] = [];
    for (const entry of value) {
      const id = extractOneId(entry);
      if (!id) return null; // ANY bad entry ⇒ reject whole payload
      ids.push(id);
    }
    return ids.length ? ids : null; // [] ⇒ null (caller maps to "no files chosen")
  }
  return extractOneId(value);
};

export function validateSubmissionPayload(payload: unknown, fields: NormalizedFormField[]) {
  assertFormSubmissionDataShape(payload);
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
    const visible = evaluateFormFieldLogic(field.settings.logic, data);
    if (!visible) {
      continue;
    }
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
      case "select":
      case "radio": {
        if (typeof value !== "string") throw new Error("form_payload_invalid");
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
      case "number":
      case "range":
      case "rating": {
        if (typeof value !== "string" && typeof value !== "number") {
          throw new Error("form_payload_invalid");
        }
        const text = typeof value === "number" ? String(value) : normalizeString(value);
        if (!text) {
          if (field.required) throw new Error("form_payload_required");
          break;
        }
        const parsed = Number(text);
        if (!Number.isFinite(parsed)) throw new Error("form_payload_invalid");
        if (field.settings.min !== undefined && parsed < field.settings.min) {
          throw new Error("form_payload_invalid");
        }
        if (field.settings.max !== undefined && parsed > field.settings.max) {
          throw new Error("form_payload_invalid");
        }
        const inputStep = resolveFormFieldInputStep(field.settings);
        if (inputStep !== undefined && field.type !== "rating") {
          const origin = field.settings.min ?? 0;
          const delta = (parsed - origin) / inputStep;
          if (Math.abs(delta - Math.round(delta)) > 1e-9) {
            throw new Error("form_payload_invalid");
          }
        }
        if (field.type === "rating" && !Number.isInteger(parsed)) {
          throw new Error("form_payload_invalid");
        }
        normalized[field.name] = text;
        break;
      }
      case "time": {
        if (typeof value !== "string") throw new Error("form_payload_invalid");
        const text = normalizeString(value);
        if (!text) {
          if (field.required) throw new Error("form_payload_required");
          break;
        }
        if (!timePattern.test(text)) {
          throw new Error("form_payload_invalid");
        }
        normalized[field.name] = text;
        break;
      }
      case "file": {
        const ref = normalizeMediaReference(value, field.settings);
        if (!ref) {
          // An empty array is the plausible client shape for "no files chosen" on a
          // multiple-file field. The pre-switch guard only catches undefined/null/"",
          // so [] reaches here and normalizes to null — treat that as "absent".
          if (Array.isArray(value) && value.length === 0) {
            if (field.required) throw new Error("form_payload_required");
            break;
          }
          // Otherwise PRESENT-but-invalid must REJECT (mirrors the hidden strict-reject).
          throw new Error("form_payload_invalid");
        }
        normalized[field.name] = ref; // owned media id(s) — never bytes
        break;
      }
      case "hidden": {
        const text = normalizeString(value);
        if (!text) throw new Error("form_payload_invalid");
        if (
          typeof field.settings.defaultValue !== "string" ||
          field.settings.defaultValue !== text
        ) {
          throw new Error("form_payload_invalid");
        }
        normalized[field.name] = text;
        break;
      }
      default: {
        if (typeof value !== "string") throw new Error("form_payload_invalid");
        const text = normalizeString(value);
        if (!text) {
          if (field.required) throw new Error("form_payload_required");
          break;
        }
        if (field.settings.pattern) {
          const regex = compileSafeFormFieldPattern(field.settings.pattern, "form_payload_invalid");
          if (!regex.test(text)) {
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
