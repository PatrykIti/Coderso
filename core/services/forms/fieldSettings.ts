export const FORM_FIELD_LOGIC_OPERATOR_VALUES = [
  "always",
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "exists",
  "not_exists",
] as const;
export type FormFieldLogicOperator = (typeof FORM_FIELD_LOGIC_OPERATOR_VALUES)[number];

export type FormFieldLogic = {
  operator: FormFieldLogicOperator;
  field?: string;
  value?: string;
};

export const FORM_FIELD_WIDTH_VALUES = ["full", "half"] as const;
export type FormFieldWidth = (typeof FORM_FIELD_WIDTH_VALUES)[number];
export const FORM_FIELD_LABEL_POSITION_VALUES = ["above", "inline", "hidden"] as const;
export type FormFieldLabelPosition = (typeof FORM_FIELD_LABEL_POSITION_VALUES)[number];

export const FORM_FIELD_SHARED_LIMITS = {
  name: 120,
  settingText: 2_000,
} as const;

export type FormFieldStyle = {
  width?: FormFieldWidth;
  labelPosition?: FormFieldLabelPosition;
};

export type ResolvedFormFieldStyle = {
  width: FormFieldWidth;
  labelPosition: FormFieldLabelPosition;
};

const logicOperatorSet = new Set<FormFieldLogicOperator>(FORM_FIELD_LOGIC_OPERATOR_VALUES);

const fieldWidthSet = new Set<FormFieldWidth>(FORM_FIELD_WIDTH_VALUES);
const fieldLabelPositionSet = new Set<FormFieldLabelPosition>(FORM_FIELD_LABEL_POSITION_VALUES);

export const FORM_FIELD_VALUE_LOGIC_OPERATOR_VALUES = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
] as const satisfies readonly FormFieldLogicOperator[];

const valueOperatorSet = new Set<FormFieldLogicOperator>(FORM_FIELD_VALUE_LOGIC_OPERATOR_VALUES);

export const FORM_FIELD_ONLY_LOGIC_OPERATOR_VALUES = [
  "exists",
  "not_exists",
] as const satisfies readonly FormFieldLogicOperator[];

const fieldOnlyOperatorSet = new Set<FormFieldLogicOperator>(FORM_FIELD_ONLY_LOGIC_OPERATOR_VALUES);

export const formFieldLogicSchema = {
  oneOf: [
    {
      type: "object",
      required: ["operator"],
      properties: { operator: { const: "always" } },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["operator", "field", "value"],
      properties: {
        operator: { enum: FORM_FIELD_VALUE_LOGIC_OPERATOR_VALUES },
        field: { type: "string", minLength: 1, maxLength: FORM_FIELD_SHARED_LIMITS.name },
        value: {
          type: "string",
          minLength: 1,
          maxLength: FORM_FIELD_SHARED_LIMITS.settingText,
        },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["operator", "field"],
      properties: {
        operator: { enum: FORM_FIELD_ONLY_LOGIC_OPERATOR_VALUES },
        field: { type: "string", minLength: 1, maxLength: FORM_FIELD_SHARED_LIMITS.name },
      },
      additionalProperties: false,
    },
  ],
} as const;

export const formFieldStyleSchema = {
  type: "object",
  properties: {
    width: { enum: FORM_FIELD_WIDTH_VALUES },
    labelPosition: { enum: FORM_FIELD_LABEL_POSITION_VALUES },
  },
  additionalProperties: false,
} as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeComparableValue = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("form_field_invalid");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("form_field_invalid");
  return trimmed;
};

const toComparableValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

export const formFieldLogicOperatorOptions: Array<{
  value: FormFieldLogicOperator;
  label: string;
}> = [
  { value: "always", label: "Always visible" },
  { value: "equals", label: "Field equals" },
  { value: "not_equals", label: "Field not equals" },
  { value: "contains", label: "Field contains" },
  { value: "not_contains", label: "Field not contains" },
  { value: "exists", label: "Field has value" },
  { value: "not_exists", label: "Field is empty" },
];

export const formFieldWidthOptions: Array<{ value: FormFieldWidth; label: string }> = [
  { value: "full", label: "Full width" },
  { value: "half", label: "Half width" },
];

export const formFieldLabelPositionOptions: Array<{
  value: FormFieldLabelPosition;
  label: string;
}> = [
  { value: "above", label: "Above input" },
  { value: "inline", label: "Inline" },
  { value: "hidden", label: "Hidden" },
];

export const isValueLogicOperator = (operator: FormFieldLogicOperator) =>
  valueOperatorSet.has(operator);

export const isFieldOnlyLogicOperator = (operator: FormFieldLogicOperator) =>
  fieldOnlyOperatorSet.has(operator);

export const resolveFormFieldStyle = (
  style: FormFieldStyle | undefined
): ResolvedFormFieldStyle => {
  const width = style?.width;
  const labelPosition = style?.labelPosition;
  return {
    width: width && fieldWidthSet.has(width) ? width : "full",
    labelPosition:
      labelPosition && fieldLabelPositionSet.has(labelPosition) ? labelPosition : "above",
  };
};

export const normalizeFormFieldLogic = (value: unknown): FormFieldLogic | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new Error("form_field_invalid");

  const rawOperator = value.operator;
  if (typeof rawOperator !== "string") throw new Error("form_field_invalid");
  if (!logicOperatorSet.has(rawOperator as FormFieldLogicOperator)) {
    throw new Error("form_field_invalid");
  }
  const operator = rawOperator as FormFieldLogicOperator;

  if (operator === "always") {
    return { operator: "always" };
  }

  const field = normalizeOptionalString(value.field);
  if (!field) throw new Error("form_field_invalid");

  if (isValueLogicOperator(operator)) {
    return {
      operator,
      field,
      value: normalizeComparableValue(value.value),
    };
  }

  return {
    operator,
    field,
  };
};

export const normalizeFormFieldStyle = (value: unknown): FormFieldStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new Error("form_field_invalid");

  const width = value.width;
  const labelPosition = value.labelPosition;

  const normalized: FormFieldStyle = {};

  if (width !== undefined) {
    if (typeof width !== "string" || !fieldWidthSet.has(width as FormFieldWidth)) {
      throw new Error("form_field_invalid");
    }
    normalized.width = width as FormFieldWidth;
  }

  if (labelPosition !== undefined) {
    if (
      typeof labelPosition !== "string" ||
      !fieldLabelPositionSet.has(labelPosition as FormFieldLabelPosition)
    ) {
      throw new Error("form_field_invalid");
    }
    normalized.labelPosition = labelPosition as FormFieldLabelPosition;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const evaluateFormFieldLogic = (
  logic: FormFieldLogic | undefined,
  values: Record<string, unknown>
): boolean => {
  if (!logic || logic.operator === "always") return true;

  const dependentField = logic.field;
  if (!dependentField) return true;

  const raw = Object.hasOwn(values, dependentField) ? values[dependentField] : undefined;
  const actual = toComparableValue(raw);

  switch (logic.operator) {
    case "exists":
      return actual !== null;
    case "not_exists":
      return actual === null;
    case "equals": {
      if (!logic.value) return true;
      return (actual ?? "").toLowerCase() === logic.value.toLowerCase();
    }
    case "not_equals": {
      if (!logic.value) return true;
      return (actual ?? "").toLowerCase() !== logic.value.toLowerCase();
    }
    case "contains": {
      if (!logic.value) return true;
      return (actual ?? "").toLowerCase().includes(logic.value.toLowerCase());
    }
    case "not_contains": {
      if (!logic.value) return true;
      return !(actual ?? "").toLowerCase().includes(logic.value.toLowerCase());
    }
    default:
      return true;
  }
};
