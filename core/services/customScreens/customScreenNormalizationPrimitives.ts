import {
  customScreenBindingModes,
  customScreenCollectionRoleValues,
  customScreenListColumnSources,
  customScreenListFilterOperators,
  customScreenListFormatters,
  customScreenSortDirections,
} from "./customScreenContracts";
import type {
  CustomScreenBindingMode,
  CustomScreenCollectionRole,
  CustomScreenDefinitionContext,
  CustomScreenDefinitionVersion,
  CustomScreenListColumnSource,
  CustomScreenListFilterOperator,
  CustomScreenListFormatter,
  CustomScreenSortDirection,
} from "./customScreenContracts";

export const supportedDefinitionVersions = new Set<CustomScreenDefinitionVersion>([1, 2, 3, 4]);

export const bindingModes = new Set<CustomScreenBindingMode>(customScreenBindingModes);

export const collectionRoles = new Set<CustomScreenCollectionRole>(
  customScreenCollectionRoleValues
);

export const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

export const SCREEN_PATH_MAX = 160;

export const SCREEN_PATH_SEGMENT_PATTERN_SOURCE = "[a-zA-Z0-9_-]+";

export const SCREEN_PATH_BODY_PATTERN_SOURCE = `${SCREEN_PATH_SEGMENT_PATTERN_SOURCE}(?:\\.${SCREEN_PATH_SEGMENT_PATTERN_SOURCE})*`;

export const SCREEN_PATH_PATTERN_SOURCE = `^${SCREEN_PATH_BODY_PATTERN_SOURCE}$`;

export const SCREEN_PATH_PATTERN = new RegExp(SCREEN_PATH_PATTERN_SOURCE);

export const SCREEN_UNSAFE_PATH_SEGMENT_PATTERN_SOURCE =
  "(^|\\.)(?:__proto__|prototype|constructor)(?:\\.|$)";

export const SCREEN_BINDING_ID_MAX = 120;

export const SCREEN_BINDING_ID_PATTERN_SOURCE = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

export const SCREEN_PATH_HASH_OFFSET = 0xcbf29ce484222325n;

export const SCREEN_PATH_HASH_PRIME = 0x100000001b3n;

export const columnSources = new Set<CustomScreenListColumnSource>(customScreenListColumnSources);

export const listFormatters = new Set<CustomScreenListFormatter>(customScreenListFormatters);

export const sortDirections = new Set<CustomScreenSortDirection>(customScreenSortDirections);

export const filterOperators = new Set<CustomScreenListFilterOperator>(
  customScreenListFilterOperators
);

export const systemListFields = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ScreenNormalizeMode = "write" | "stored-read";

export type ScreenBindingNormalizeMode = ScreenNormalizeMode | "compatibility-write";

export type ScreenFieldPathToken =
  | "definition"
  | "editorView"
  | "listView"
  | "rowTemplate"
  | "document"
  | "sections"
  | "blocks"
  | "children"
  | "slots"
  | "data"
  | "tabs"
  | "id"
  | "action"
  | "href"
  | "src";

export type ScreenFieldPathSegment = ScreenFieldPathToken | number;

export type GeneratedScreenFieldPath = string & { readonly __generated: unique symbol };

export const CUSTOM_SCREEN_ERROR_FIELDS_MAX = 8;

export const CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX = 240;

export const generatedFieldPath = (
  ...segments: ReadonlyArray<ScreenFieldPathSegment>
): GeneratedScreenFieldPath =>
  segments.join(".").slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX) as GeneratedScreenFieldPath;

export const boundGeneratedFields = (fields: readonly GeneratedScreenFieldPath[]): string[] =>
  [...new Set(fields)]
    .slice(0, CUSTOM_SCREEN_ERROR_FIELDS_MAX)
    .map((field) => field.slice(0, CUSTOM_SCREEN_ERROR_FIELD_PATH_MAX));

export class CustomScreenDefinitionError extends Error {
  readonly code = "custom_screen_definition_invalid" as const;
  readonly fields: string[];

  constructor(fields: readonly GeneratedScreenFieldPath[] = []) {
    super("custom_screen_definition_invalid");
    this.name = "CustomScreenDefinitionError";
    this.fields = boundGeneratedFields(fields);
  }
}

export const invalid = (...fields: readonly GeneratedScreenFieldPath[]): never => {
  throw new CustomScreenDefinitionError(fields);
};

export const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const rejectUnknownKeys = (input: Record<string, unknown>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(input).find((key) => !allowedSet.has(key));
  if (unknown) throw new Error("custom_screen_definition_invalid");
};

export const normalizePath = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !SCREEN_PATH_PATTERN.test(text)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("custom_screen_definition_invalid");
  }
  return text;
};

export const stableScreenPathHash = (value: string) => {
  let hash = SCREEN_PATH_HASH_OFFSET;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * SCREEN_PATH_HASH_PRIME);
  }
  return hash.toString(36).padStart(13, "0");
};

export const canonicalizeStoredScreenPath = (value: string) => {
  if (value.length <= SCREEN_PATH_MAX) return value;
  const suffix = `-${stableScreenPathHash(value)}`;
  return `${value.slice(0, SCREEN_PATH_MAX - suffix.length)}${suffix}`;
};

export const canonicalizeScreenBindingId = (value: string, hashSeed = value) => {
  if (value.length <= SCREEN_BINDING_ID_MAX) return value;
  const suffix = `-${stableScreenPathHash(hashSeed)}`;
  const prefix = value.slice(0, SCREEN_BINDING_ID_MAX - suffix.length).replace(/-+$/g, "");
  return `${prefix}${suffix}`;
};

export const buildScreenFieldBindingId = (blockId: string, propPath: string) => {
  const slugSeed = `${blockId}-${propPath}`;
  const hashSeed = JSON.stringify([blockId, propPath]);
  const hash = stableScreenPathHash(hashSeed);
  const maxPrefixLength = SCREEN_BINDING_ID_MAX - hash.length - 1;
  const readablePrefix = slugify(slugSeed) || "binding";
  const boundedPrefix = readablePrefix.slice(0, maxPrefixLength).replace(/-+$/g, "") || "binding";
  return `${boundedPrefix}-${hash}`;
};

export const normalizeScreenPath = (
  value: unknown,
  mode: ScreenBindingNormalizeMode,
  canonicalizeStoredOverflow = true
) => {
  const normalized = normalizePath(value);
  if (
    mode !== "stored-read" &&
    (typeof value !== "string" || value !== normalized || normalized.length > SCREEN_PATH_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  return mode === "stored-read" && canonicalizeStoredOverflow
    ? canonicalizeStoredScreenPath(normalized)
    : normalized;
};

export const normalizeBindingMode = (value: unknown): CustomScreenBindingMode => {
  const mode = normalizeText(value) ?? "readwrite";
  if (!bindingModes.has(mode as CustomScreenBindingMode)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return mode as CustomScreenBindingMode;
};

export const readContentSchemaProperties = (context?: CustomScreenDefinitionContext) => {
  const properties = context?.contentType?.schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return {};
  }
  return properties;
};

export const getSchemaFieldNames = (context?: CustomScreenDefinitionContext) =>
  new Set(Object.keys(readContentSchemaProperties(context)));

export const getAllowedBindingFieldRoots = (context?: CustomScreenDefinitionContext) => {
  const schemaFields = getSchemaFieldNames(context);
  if (schemaFields.size === 0) return null;
  return new Set([...systemListFields, ...schemaFields]);
};

export const assertFieldAllowed = (
  field: string,
  source: CustomScreenListColumnSource,
  context?: CustomScreenDefinitionContext
) => {
  if (source === "system") {
    if (!systemListFields.has(field)) {
      throw new Error("custom_screen_definition_invalid");
    }
    return;
  }

  const schemaFields = getSchemaFieldNames(context);
  if (schemaFields.size > 0 && !schemaFields.has(field)) {
    throw new Error("custom_screen_definition_invalid");
  }
};

export const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const normalizeStringEnum = <T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T
): T => {
  const normalized = normalizeText(value) ?? fallback;
  if (!allowed.has(normalized as T)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return normalized as T;
};

export function normalizeCustomScreenSchemaVersion(value: unknown): CustomScreenDefinitionVersion {
  if (value === undefined || value === null) return 1;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.floor(value) !== value) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (!supportedDefinitionVersions.has(value as CustomScreenDefinitionVersion)) {
    throw new Error("custom_screen_definition_invalid");
  }
  return value as CustomScreenDefinitionVersion;
}

export const normalizeJsonValue = (value: unknown): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeJsonValue);
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (unsafePathSegments.has(key)) throw new Error("custom_screen_definition_invalid");
      return [key, normalizeJsonValue(item)];
    })
  );
};

export const normalizeUniqueIds = <T extends { id: string }>(items: T[]) => {
  const ids = new Set<string>();
  items.forEach((item) => {
    if (ids.has(item.id)) throw new Error("custom_screen_definition_invalid");
    ids.add(item.id);
  });
  return items;
};
