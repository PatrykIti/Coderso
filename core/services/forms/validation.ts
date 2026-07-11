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
): { length: number; minimum: number; variable: boolean } | null => {
  const match = pattern.slice(index).match(/^\{\d+(?:,\d*)?\}/);
  if (!match) return null;
  const body = match[0].slice(1, -1);
  const [minimum, maximum] = body.split(",");
  return {
    length: match[0].length,
    minimum: Number(minimum),
    variable: maximum !== undefined && maximum !== minimum,
  };
};

type ComplementPatternCharacterSet = Readonly<{
  kind: "complement";
  excluded: ReadonlySet<string>;
}>;

type PatternCharacterSet = ReadonlySet<string> | ComplementPatternCharacterSet | null;

const isComplementPatternCharacterSet = (
  characters: Exclude<PatternCharacterSet, null>
): characters is ComplementPatternCharacterSet =>
  "kind" in characters && characters.kind === "complement";

const DIGIT_PATTERN_CHARACTERS = new Set("0123456789");
const WORD_PATTERN_CHARACTERS = new Set(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz"
);
const SPACE_PATTERN_CHARACTERS = new Set(
  [
    0x0009,
    0x000a,
    0x000b,
    0x000c,
    0x000d,
    0x0020,
    0x00a0,
    0x1680,
    ...Array.from({ length: 11 }, (_, index) => 0x2000 + index),
    0x2028,
    0x2029,
    0x202f,
    0x205f,
    0x3000,
    0xfeff,
  ].map((codePoint) => String.fromCodePoint(codePoint))
);

const patternCharacterSetsOverlap = (
  left: PatternCharacterSet,
  right: PatternCharacterSet
): boolean => {
  if (!left || !right) return true;
  const leftIsComplement = isComplementPatternCharacterSet(left);
  const rightIsComplement = isComplementPatternCharacterSet(right);
  if (leftIsComplement && rightIsComplement) return true;
  if (leftIsComplement) {
    for (const character of right as ReadonlySet<string>) {
      if (!left.excluded.has(character)) return true;
    }
    return false;
  }
  if (rightIsComplement) {
    for (const character of left) {
      if (!right.excluded.has(character)) return true;
    }
    return false;
  }
  for (const character of left) {
    if (right.has(character)) return true;
  }
  return false;
};

const patternCharacterSetFingerprint = (characters: PatternCharacterSet): string =>
  characters === null
    ? "unknown"
    : isComplementPatternCharacterSet(characters)
      ? `complement:${JSON.stringify(Array.from(characters.excluded).sort())}`
      : `finite:${JSON.stringify(Array.from(characters).sort())}`;

const mergePatternCharacterSets = (
  left: readonly PatternCharacterSet[],
  right: readonly PatternCharacterSet[]
): PatternCharacterSet[] => {
  const merged = new Map<string, PatternCharacterSet>();
  for (const characters of [...left, ...right]) {
    merged.set(patternCharacterSetFingerprint(characters), characters);
  }
  return Array.from(merged.values());
};

// Bound independent alternative choices before RegExp construction. A sequence of
// small groups such as `(a|a)(a|a)...` otherwise creates exponentially many paths
// even though every individual group and the complete source stay short.
const MAX_PATTERN_ALTERNATIVE_PATHS = 256;

const multiplyPatternPathCounts = (left: number, right: number): number | null =>
  left > Math.floor(MAX_PATTERN_ALTERNATIVE_PATHS / right) ? null : left * right;

const sumPatternPathCounts = (counts: readonly number[]): number | null => {
  let total = 0;
  for (const count of counts) {
    if (count > MAX_PATTERN_ALTERNATIVE_PATHS - total) return null;
    total += count;
  }
  return total;
};

const readSimpleCharacterClass = (
  pattern: string,
  start: number
): { end: number; characters: PatternCharacterSet; unsafe: boolean } => {
  let end = start + 1;
  let escaped = false;
  for (; end < pattern.length; end += 1) {
    const character = pattern[end];
    if (!escaped && character === "]") break;
    if (!escaped && character === "\\") {
      escaped = true;
      continue;
    }
    escaped = false;
  }
  if (end >= pattern.length) {
    return { end: pattern.length, characters: null, unsafe: false };
  }

  const body = pattern.slice(start + 1, end);
  const negated = body.startsWith("^");
  const characters = new Set<string>();
  let precisionUnknown = false;

  const readElement = (
    index: number
  ): {
    next: number;
    characters: ReadonlySet<string>;
    literal?: string;
    unsafe?: boolean;
    unknown?: boolean;
  } | null => {
    const character = body[index];
    if (character === undefined) return null;
    if (character !== "\\") {
      return { next: index + 1, characters: new Set([character]), literal: character };
    }
    const escapedCharacter = body[index + 1];
    if (escapedCharacter === undefined) return null;
    if (
      /[0-9]/.test(escapedCharacter) ||
      escapedCharacter === "c" ||
      "bnrtfv0".includes(escapedCharacter)
    ) {
      return { next: index + 2, characters: new Set(), unsafe: true };
    }
    const hexByte = escapedCharacter === "x" ? body.slice(index + 2, index + 4) : "";
    const hexWord = escapedCharacter === "u" ? body.slice(index + 2, index + 6) : "";
    if (hexByte.length === 2 && /^[0-9a-fA-F]{2}$/.test(hexByte)) {
      const literal = String.fromCharCode(Number.parseInt(hexByte, 16));
      return {
        next: index + 4,
        characters: new Set([literal]),
        literal,
        unsafe: hasPatternControlCharacter(literal),
      };
    }
    if (hexWord.length === 4 && /^[0-9a-fA-F]{4}$/.test(hexWord)) {
      const literal = String.fromCharCode(Number.parseInt(hexWord, 16));
      return {
        next: index + 6,
        characters: new Set([literal]),
        literal,
        unsafe: hasPatternControlCharacter(literal),
      };
    }
    if (escapedCharacter === "d") {
      return { next: index + 2, characters: DIGIT_PATTERN_CHARACTERS };
    }
    if (escapedCharacter === "w") {
      return { next: index + 2, characters: WORD_PATTERN_CHARACTERS };
    }
    if (escapedCharacter === "s") {
      return { next: index + 2, characters: SPACE_PATTERN_CHARACTERS };
    }
    if ("DWS".includes(escapedCharacter)) {
      return { next: index + 2, characters: new Set(), unknown: true };
    }
    return {
      next: index + 2,
      characters: new Set([escapedCharacter]),
      literal: escapedCharacter,
    };
  };

  for (let index = negated ? 1 : 0; index < body.length; ) {
    const first = readElement(index);
    if (!first) {
      precisionUnknown = true;
      index += 1;
      continue;
    }
    if (first.unsafe) return { end: end + 1, characters: null, unsafe: true };
    if (first.literal && body[first.next] === "-" && first.next + 1 < body.length) {
      const last = readElement(first.next + 1);
      if (!last) {
        precisionUnknown = true;
        index = first.next + 1;
        continue;
      }
      if (last.unsafe) return { end: end + 1, characters: null, unsafe: true };
      if (!last.literal) {
        precisionUnknown = true;
        index = last.next;
        continue;
      }
      const firstCode = first.literal.charCodeAt(0);
      const lastCode = last.literal.charCodeAt(0);
      if (firstCode > lastCode) {
        precisionUnknown = true;
        index = last.next;
        continue;
      }
      if (firstCode <= 0x1f || (firstCode <= 0x9f && lastCode >= 0x7f)) {
        return { end: end + 1, characters: null, unsafe: true };
      }
      if (firstCode > 0x7f || lastCode > 0x7f) {
        precisionUnknown = true;
      } else {
        for (let code = firstCode; code <= lastCode; code += 1) {
          characters.add(String.fromCharCode(code));
        }
      }
      index = last.next;
      continue;
    }
    if (first.unknown) precisionUnknown = true;
    for (const character of first.characters) characters.add(character);
    index = first.next;
  }
  const resolvedCharacters: PatternCharacterSet = precisionUnknown
    ? null
    : negated
      ? { kind: "complement", excluded: characters }
      : characters;
  return { end: end + 1, characters: resolvedCharacters, unsafe: false };
};

const readPatternQuantifier = (
  pattern: string,
  index: number
): { length: number; minimum: number; variable: boolean } | null => {
  const character = pattern[index];
  if (character === "*" || character === "+" || character === "?") {
    const length = pattern[index + 1] === "?" ? 2 : 1;
    return {
      length,
      minimum: character === "+" ? 1 : 0,
      variable: true,
    };
  }
  const braceQuantifier = character === "{" ? readBraceQuantifier(pattern, index) : null;
  if (!braceQuantifier) return null;
  return {
    ...braceQuantifier,
    length: braceQuantifier.length + (pattern[index + braceQuantifier.length] === "?" ? 1 : 0),
  };
};

const hasUnsafePatternStructure = (pattern: string): boolean => {
  let activeVariableAtoms: PatternCharacterSet[] = [];
  const completedTopLevelPathCounts: number[] = [];
  let currentTopLevelPathCount = 1;
  const groupStack: Array<{
    entryActiveAtoms: PatternCharacterSet[];
    branchEndAtoms: PatternCharacterSet[];
    completedBranchPathCounts: number[];
    currentBranchPathCount: number;
  }> = [];

  for (let index = 0; index < pattern.length; ) {
    const char = pattern[index];
    if (char === "(") {
      if (pattern[index + 1] === "?") return true;
      groupStack.push({
        entryActiveAtoms: [...activeVariableAtoms],
        branchEndAtoms: [],
        completedBranchPathCounts: [],
        currentBranchPathCount: 1,
      });
      index += 1;
      continue;
    }
    if (char === ")") {
      if (readPatternQuantifier(pattern, index + 1)) return true;
      const group = groupStack.pop();
      if (group) {
        group.branchEndAtoms = mergePatternCharacterSets(group.branchEndAtoms, activeVariableAtoms);
        const groupPathCount = sumPatternPathCounts([
          ...group.completedBranchPathCounts,
          group.currentBranchPathCount,
        ]);
        if (groupPathCount === null) return true;
        const parentGroup = groupStack.at(-1);
        if (parentGroup) {
          const parentPathCount = multiplyPatternPathCounts(
            parentGroup.currentBranchPathCount,
            groupPathCount
          );
          if (parentPathCount === null) return true;
          parentGroup.currentBranchPathCount = parentPathCount;
        } else {
          const topLevelPathCount = multiplyPatternPathCounts(
            currentTopLevelPathCount,
            groupPathCount
          );
          if (topLevelPathCount === null) return true;
          currentTopLevelPathCount = topLevelPathCount;
        }
        activeVariableAtoms = group.branchEndAtoms;
      }
      index += 1;
      continue;
    }
    if (char === "|") {
      const group = groupStack.at(-1);
      if (group) {
        group.branchEndAtoms = mergePatternCharacterSets(group.branchEndAtoms, activeVariableAtoms);
        group.completedBranchPathCounts.push(group.currentBranchPathCount);
        group.currentBranchPathCount = 1;
        activeVariableAtoms = [...group.entryActiveAtoms];
      } else {
        activeVariableAtoms = [];
        completedTopLevelPathCounts.push(currentTopLevelPathCount);
        currentTopLevelPathCount = 1;
      }
      index += 1;
      continue;
    }
    if (char === "^" || char === "$") {
      index += 1;
      continue;
    }

    let atomEnd = index + 1;
    let atomCharacters: PatternCharacterSet;
    if (char === "\\") {
      const escapedCharacter = pattern[index + 1];
      if (!escapedCharacter) return true;
      if (/[1-9]/.test(escapedCharacter) || escapedCharacter === "k") return true;
      if (escapedCharacter === "b" || escapedCharacter === "B") {
        index += 2;
        continue;
      }
      if ("nrtfv0".includes(escapedCharacter) || escapedCharacter === "c") {
        return true;
      }
      const hexByte = escapedCharacter === "x" ? pattern.slice(index + 2, index + 4) : "";
      const hexWord = escapedCharacter === "u" ? pattern.slice(index + 2, index + 6) : "";
      if (hexByte.length === 2 && /^[0-9a-fA-F]{2}$/.test(hexByte)) {
        const character = String.fromCharCode(Number.parseInt(hexByte, 16));
        if (hasPatternControlCharacter(character)) return true;
        atomCharacters = new Set([character]);
        atomEnd = index + 4;
      } else if (hexWord.length === 4 && /^[0-9a-fA-F]{4}$/.test(hexWord)) {
        const character = String.fromCharCode(Number.parseInt(hexWord, 16));
        if (hasPatternControlCharacter(character)) return true;
        atomCharacters = new Set([character]);
        atomEnd = index + 6;
      } else {
        if (escapedCharacter === "d") atomCharacters = DIGIT_PATTERN_CHARACTERS;
        else if (escapedCharacter === "w") atomCharacters = WORD_PATTERN_CHARACTERS;
        else if (escapedCharacter === "s") atomCharacters = SPACE_PATTERN_CHARACTERS;
        else if ("DWS".includes(escapedCharacter)) atomCharacters = null;
        else atomCharacters = new Set([escapedCharacter]);
        atomEnd = index + 2;
      }
    } else if (char === "[") {
      const parsedClass = readSimpleCharacterClass(pattern, index);
      if (parsedClass.unsafe) return true;
      atomCharacters = parsedClass.characters;
      atomEnd = parsedClass.end;
    } else if (char === ".") {
      atomCharacters = null;
    } else {
      atomCharacters = new Set([char]);
    }

    const quantifier = readPatternQuantifier(pattern, atomEnd);
    if (!quantifier) {
      if (
        !activeVariableAtoms.some((activeAtom) =>
          patternCharacterSetsOverlap(activeAtom, atomCharacters)
        )
      ) {
        activeVariableAtoms = [];
      }
      index = atomEnd;
      continue;
    }
    if (readPatternQuantifier(pattern, atomEnd + quantifier.length)) return true;

    if (quantifier.variable) {
      if (
        activeVariableAtoms.some((activeAtom) =>
          patternCharacterSetsOverlap(activeAtom, atomCharacters)
        )
      ) {
        return true;
      }
      if (quantifier.minimum > 0) activeVariableAtoms = [atomCharacters];
      else {
        activeVariableAtoms = mergePatternCharacterSets(activeVariableAtoms, [atomCharacters]);
      }
    } else if (
      quantifier.minimum > 0 &&
      !activeVariableAtoms.some((activeAtom) =>
        patternCharacterSetsOverlap(activeAtom, atomCharacters)
      )
    ) {
      activeVariableAtoms = [];
    }
    index = atomEnd + quantifier.length;
  }
  return sumPatternPathCounts([...completedTopLevelPathCounts, currentTopLevelPathCount]) === null;
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

type PlainFormDataRecord = Record<string, unknown>;
type PlainFormDataRecordEntry = readonly [key: string, value: unknown];

export const FORM_PLAIN_DATA_PREFLIGHT_PROFILES = {
  field: {
    maxDepth: 3,
    maxArrayItems: FORM_FIELD_SCHEMA_LIMITS.fields,
    maxRecordProperties: FORM_FIELD_SCHEMA_LIMITS.fields,
    maxNodes: 1 + FORM_FIELD_SCHEMA_LIMITS.fields * 5,
  },
  submission: {
    maxDepth: 2,
    maxArrayItems: FORM_FIELD_SCHEMA_LIMITS.submissionArray,
    maxRecordProperties: FORM_FIELD_SCHEMA_LIMITS.fields,
    maxNodes: 1 + FORM_FIELD_SCHEMA_LIMITS.fields * (1 + FORM_FIELD_SCHEMA_LIMITS.submissionArray),
  },
} as const;

type PlainFormDataPreflightProfile =
  (typeof FORM_PLAIN_DATA_PREFLIGHT_PROFILES)[keyof typeof FORM_PLAIN_DATA_PREFLIGHT_PROFILES];

type PlainFormDataCloneState = {
  readonly active: WeakSet<object>;
  readonly completed: WeakMap<object, PlainFormDataRecord | unknown[]>;
  readonly profile: PlainFormDataPreflightProfile;
  nodes: number;
};

const INVALID_PLAIN_FORM_DATA = Symbol("invalid_plain_form_data");

const readPlainFormDataRecordEntries = (
  value: unknown,
  maxProperties: number
): PlainFormDataRecordEntry[] | null => {
  if (!value || typeof value !== "object") return null;
  try {
    if (Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length > maxProperties) return null;
    const entries: PlainFormDataRecordEntry[] = [];
    for (const key of keys) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      entries.push([key, descriptor.value]);
    }
    return entries;
  } catch {
    return null;
  }
};

const readPlainFormDataArrayEntries = (value: unknown, maxItems: number): unknown[] | null => {
  try {
    if (!Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      lengthDescriptor.enumerable ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.value > maxItems
    ) {
      return null;
    }

    const keys = Reflect.ownKeys(value);
    if (keys.length !== lengthDescriptor.value + 1 || keys.some((key) => typeof key !== "string")) {
      return null;
    }
    const entries: unknown[] = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
      entries.push(descriptor.value);
    }
    return entries;
  } catch {
    return null;
  }
};

const definePlainFormDataValue = (
  target: PlainFormDataRecord,
  key: string,
  value: unknown
): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
};

const clonePlainFormDataValue = (
  value: unknown,
  state: PlainFormDataCloneState,
  depth = 0
): unknown | typeof INVALID_PLAIN_FORM_DATA => {
  if (value === null || typeof value !== "object") return value;
  if (depth > state.profile.maxDepth || state.active.has(value)) {
    return INVALID_PLAIN_FORM_DATA;
  }
  const completed = state.completed.get(value);
  if (completed !== undefined) return completed;
  if (state.nodes >= state.profile.maxNodes) return INVALID_PLAIN_FORM_DATA;
  state.nodes += 1;
  state.active.add(value);

  try {
    if (Array.isArray(value)) {
      const entries = readPlainFormDataArrayEntries(value, state.profile.maxArrayItems);
      if (!entries) return INVALID_PLAIN_FORM_DATA;
      const clone: unknown[] = [];
      for (const entry of entries) {
        const clonedEntry = clonePlainFormDataValue(entry, state, depth + 1);
        if (clonedEntry === INVALID_PLAIN_FORM_DATA) return INVALID_PLAIN_FORM_DATA;
        clone.push(clonedEntry);
      }
      state.completed.set(value, clone);
      return clone;
    }

    const entries = readPlainFormDataRecordEntries(value, state.profile.maxRecordProperties);
    if (!entries) return INVALID_PLAIN_FORM_DATA;
    const clone = Object.create(null) as PlainFormDataRecord;
    for (const [key, entry] of entries) {
      const clonedEntry = clonePlainFormDataValue(entry, state, depth + 1);
      if (clonedEntry === INVALID_PLAIN_FORM_DATA) return INVALID_PLAIN_FORM_DATA;
      definePlainFormDataValue(clone, key, clonedEntry);
    }
    state.completed.set(value, clone);
    return clone;
  } catch {
    return INVALID_PLAIN_FORM_DATA;
  } finally {
    state.active.delete(value);
  }
};

const clonePlainFormDataRoot = (
  value: unknown,
  profile: PlainFormDataPreflightProfile
): unknown | typeof INVALID_PLAIN_FORM_DATA =>
  clonePlainFormDataValue(
    value,
    {
      active: new WeakSet(),
      completed: new WeakMap(),
      profile,
      nodes: 0,
    },
    0
  );

const clonePlainFormDataRecord = (
  value: unknown,
  profile: PlainFormDataPreflightProfile
): PlainFormDataRecord | null => {
  const clone = clonePlainFormDataRoot(value, profile);
  return clone !== INVALID_PLAIN_FORM_DATA &&
    clone !== null &&
    typeof clone === "object" &&
    !Array.isArray(clone)
    ? (clone as PlainFormDataRecord)
    : null;
};

const clonePlainFormFieldRecords = (value: unknown): PlainFormDataRecord[] | null => {
  const clone = clonePlainFormDataRoot(value, FORM_PLAIN_DATA_PREFLIGHT_PROFILES.field);
  if (clone === INVALID_PLAIN_FORM_DATA || !Array.isArray(clone)) return null;
  if (
    !clone.every(
      (entry): entry is PlainFormDataRecord =>
        entry !== null && typeof entry === "object" && !Array.isArray(entry)
    )
  ) {
    return null;
  }
  return clone;
};

let formFieldsWriteValidator: ValidateFunction | undefined;
let formSubmissionDataValidator: ValidateFunction | undefined;

const getFormFieldsWriteValidator = (): ValidateFunction => {
  if (!formFieldsWriteValidator) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictTypes: false,
      allowUnionTypes: true,
      ownProperties: true,
    });
    formFieldsWriteValidator = ajv.compile(formFieldsWriteSchema);
  }
  return formFieldsWriteValidator;
};

export function snapshotFormFieldsWriteShape(fields: unknown): FormFieldInput[] {
  const plainFields = clonePlainFormFieldRecords(fields);
  if (!plainFields || !getFormFieldsWriteValidator()(plainFields)) {
    throw new Error("form_field_invalid");
  }
  return plainFields as unknown as FormFieldInput[];
}

export function assertFormFieldsWriteShape(fields: unknown): asserts fields is FormFieldInput[] {
  void snapshotFormFieldsWriteShape(fields);
}

const assertFormSubmissionDataShape = (data: unknown): PlainFormDataRecord => {
  const plainData = clonePlainFormDataRecord(data, FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission);
  if (!plainData) {
    throw new Error("form_payload_invalid");
  }
  if (!formSubmissionDataValidator) {
    const ajv = new Ajv({
      allErrors: true,
      strict: true,
      strictTypes: false,
      allowUnionTypes: true,
      ownProperties: true,
    });
    formSubmissionDataValidator = ajv.compile(formSubmissionDataSchema);
  }
  if (!formSubmissionDataValidator(plainData)) {
    throw new Error("form_payload_invalid");
  }
  return plainData;
};

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
    if (type === "hidden") throw new Error("form_field_invalid");
    return {};
  }
  if (
    !readPlainFormDataRecordEntries(
      settings,
      FORM_PLAIN_DATA_PREFLIGHT_PROFILES.field.maxRecordProperties
    )
  ) {
    throw new Error("form_field_invalid");
  }
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

const defineSubmissionValue = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
};

export function normalizeFormFields(fields: FormFieldInput[]): NormalizedFormField[] {
  let fieldsAreArray: boolean;
  try {
    fieldsAreArray = Array.isArray(fields);
  } catch {
    throw new Error("form_field_invalid");
  }
  if (!fieldsAreArray) {
    throw new Error("form_fields_invalid");
  }
  const plainFields = clonePlainFormFieldRecords(fields);
  if (!plainFields) throw new Error("form_field_invalid");

  const normalized = plainFields.map((plainField, index) => {
    const field = plainField as unknown as FormFieldInput;

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

const readExactMediaIdValue = (entry: unknown): unknown => {
  const entries = readPlainFormDataRecordEntries(entry, 1);
  return entries?.length === 1 && entries[0]?.[0] === "id" ? entries[0][1] : undefined;
};

const extractOneId = (entry: unknown): string | null => {
  // Accept "<uuid>" OR { id: "<uuid>" } (the upload endpoint response shape).
  const raw =
    typeof entry === "object" && entry
      ? normalizeString(readExactMediaIdValue(entry))
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
  try {
    if (settings.multiple === true) {
      const entries = readPlainFormDataArrayEntries(
        value,
        FORM_PLAIN_DATA_PREFLIGHT_PROFILES.submission.maxArrayItems
      );
      if (!entries) return null; // present-but-malformed
      const ids: string[] = [];
      for (const entry of entries) {
        const id = extractOneId(entry);
        if (!id) return null; // ANY bad entry ⇒ reject whole payload
        ids.push(id);
      }
      return ids.length ? ids : null; // [] ⇒ null (caller maps to "no files chosen")
    }
    return extractOneId(value);
  } catch {
    return null;
  }
};

export function validateSubmissionPayload(payload: unknown, fields: NormalizedFormField[]) {
  const data = assertFormSubmissionDataShape(payload);
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
    const value = Object.hasOwn(data, field.name) ? data[field.name] : undefined;
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
        defineSubmissionValue(normalized, field.name, parsed);
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
        defineSubmissionValue(normalized, field.name, text);
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
        if (
          !Number.isFinite(parsed) ||
          Math.abs(parsed) > FORM_FIELD_SCHEMA_LIMITS.numericMagnitude
        ) {
          throw new Error("form_payload_invalid");
        }
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
        defineSubmissionValue(normalized, field.name, text);
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
        defineSubmissionValue(normalized, field.name, text);
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
        defineSubmissionValue(normalized, field.name, ref); // owned media id(s) — never bytes
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
        defineSubmissionValue(normalized, field.name, text);
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
        defineSubmissionValue(normalized, field.name, text);
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
