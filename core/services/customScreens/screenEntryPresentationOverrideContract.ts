import { isScreenMediaAssetUuid, isScreenUuid } from "./customScreenSchemas";

export const customScreenOverrideErrorCodes = [
  "custom_screen_override_invalid",
  "custom_screen_override_not_found",
  "custom_screen_override_conflict",
] as const;

export const screenEntryPresentationOverridePropPaths = [
  "image",
  "mediaAssetId",
  "textSize",
  "textEmphasis",
  "tone",
] as const;

export const screenEntryPresentationTextSizes = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

export const screenEntryPresentationTextEmphasisValues = [
  "normal",
  "medium",
  "semibold",
  "bold",
] as const;

export const screenEntryPresentationToneValues = [
  "default",
  "muted",
  "strong",
  "neutral",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export type ScreenEntryPresentationOverridePropPath =
  (typeof screenEntryPresentationOverridePropPaths)[number];
export type ScreenEntryPresentationTextSize = (typeof screenEntryPresentationTextSizes)[number];
export type ScreenEntryPresentationTextEmphasis =
  (typeof screenEntryPresentationTextEmphasisValues)[number];
export type ScreenEntryPresentationTone = (typeof screenEntryPresentationToneValues)[number];
export type ScreenEntryPresentationOverrideValue =
  | string
  | ScreenEntryPresentationTextSize
  | ScreenEntryPresentationTextEmphasis
  | ScreenEntryPresentationTone;

export type ScreenEntryPresentationOverrideDraft = {
  blockId: string;
  propPath: ScreenEntryPresentationOverridePropPath;
  value: ScreenEntryPresentationOverrideValue;
};

export type ScreenEntryPresentationOverrideRecord = ScreenEntryPresentationOverrideDraft & {
  screenId: string;
  entryId: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScreenEntryPresentationOverrideTransportRecord = Omit<
  ScreenEntryPresentationOverrideRecord,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type ScreenEntryPresentationOverrideReplacePayload = {
  overrides: ScreenEntryPresentationOverrideDraft[];
};

export const screenEntryPresentationOverrideSchema = {
  type: "object",
  required: ["blockId", "propPath", "value"],
  properties: {
    blockId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    propPath: { enum: screenEntryPresentationOverridePropPaths },
    value: { type: "string", minLength: 1, maxLength: 160 },
  },
  additionalProperties: false,
} as const;

export const screenEntryPresentationOverrideReplaceSchema = {
  type: "object",
  required: ["overrides"],
  properties: {
    overrides: {
      type: "array",
      maxItems: 200,
      items: screenEntryPresentationOverrideSchema,
    },
  },
  additionalProperties: false,
} as const;

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const overridePropPathSet = new Set<string>(screenEntryPresentationOverridePropPaths);
const mediaPropPathSet = new Set<string>(["image", "mediaAssetId"]);
const textSizeSet = new Set<string>(screenEntryPresentationTextSizes);
const textEmphasisSet = new Set<string>(screenEntryPresentationTextEmphasisValues);
const toneSet = new Set<string>(screenEntryPresentationToneValues);

const invalidOverride = () => new Error("custom_screen_override_invalid");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isScreenEntryPresentationSingleMediaField = (value: unknown): boolean => {
  if (!isRecord(value) || value.type !== "media") return false;
  if (value.media === undefined) return true;
  return isRecord(value.media) && value.media.multiple !== true;
};

export const isScreenEntryPresentationSingleMediaSchemaDefinition = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const fieldConfig = isRecord(value.xFieldConfig) ? value.xFieldConfig : null;
  const mediaConfig =
    fieldConfig && isRecord(fieldConfig.media)
      ? fieldConfig.media
      : value.xFieldType === "media"
        ? fieldConfig
        : null;
  if (value.xFieldType !== "media" && mediaConfig === null) return false;
  return value.type !== "array" && mediaConfig?.multiple !== true;
};

const expectOverrideRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) throw invalidOverride();
  return value;
};

const rejectUnknownKeys = (input: Record<string, unknown>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  if (Object.keys(input).some((key) => !allowedSet.has(key))) throw invalidOverride();
};

const normalizeSafePath = (value: unknown, maxLength = 160): string => {
  if (typeof value !== "string") throw invalidOverride();
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    !/^[a-zA-Z0-9_.-]+$/.test(normalized)
  ) {
    throw invalidOverride();
  }
  if (
    normalized.split(".").some((segment) => segment.length === 0 || unsafePathSegments.has(segment))
  ) {
    throw invalidOverride();
  }
  return normalized;
};

export const normalizeScreenEntryPresentationScopeId = (value: unknown): string =>
  normalizeSafePath(value);

const normalizePropPath = (value: unknown): ScreenEntryPresentationOverridePropPath => {
  const normalized = normalizeSafePath(value);
  if (!overridePropPathSet.has(normalized)) throw invalidOverride();
  return normalized as ScreenEntryPresentationOverridePropPath;
};

const normalizeOwnedEnum = (value: unknown, allowed: ReadonlySet<string>): string => {
  if (typeof value !== "string" || !allowed.has(value)) throw invalidOverride();
  return value;
};

const normalizeCanonicalMediaUuid = (value: unknown): string => {
  if (!isScreenMediaAssetUuid(value)) throw invalidOverride();
  return value;
};

const normalizeOverrideValue = (
  propPath: ScreenEntryPresentationOverridePropPath,
  value: unknown
): ScreenEntryPresentationOverrideValue => {
  if (mediaPropPathSet.has(propPath)) return normalizeCanonicalMediaUuid(value);
  if (propPath === "textSize") return normalizeOwnedEnum(value, textSizeSet);
  if (propPath === "textEmphasis") return normalizeOwnedEnum(value, textEmphasisSet);
  if (propPath === "tone") return normalizeOwnedEnum(value, toneSet);
  throw invalidOverride();
};

export function normalizeScreenEntryPresentationOverrideDraft(
  input: unknown
): ScreenEntryPresentationOverrideDraft {
  const record = expectOverrideRecord(input);
  rejectUnknownKeys(record, ["blockId", "propPath", "value"]);
  const propPath = normalizePropPath(record.propPath);
  return {
    blockId: normalizeSafePath(record.blockId),
    propPath,
    value: normalizeOverrideValue(propPath, record.value),
  };
}

const normalizeDraftKeys = (record: Record<string, unknown>) =>
  normalizeScreenEntryPresentationOverrideDraft({
    blockId: record.blockId,
    propPath: record.propPath,
    value: record.value,
  });

const normalizeUpdatedBy = (value: unknown): string | null => {
  if (value === null) return null;
  if (!isScreenUuid(value)) throw invalidOverride();
  return value;
};

const normalizeRepositoryDate = (value: unknown): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw invalidOverride();
  return value;
};

const normalizeTransportTimestamp = (value: unknown): string => {
  if (typeof value !== "string") throw invalidOverride();
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== value) {
    throw invalidOverride();
  }
  return value;
};

const recordKeys = [
  "blockId",
  "propPath",
  "value",
  "screenId",
  "entryId",
  "updatedBy",
  "createdAt",
  "updatedAt",
] as const;

const normalizeRepositoryRecord = (value: unknown): ScreenEntryPresentationOverrideRecord => {
  const record = expectOverrideRecord(value);
  rejectUnknownKeys(record, recordKeys);
  return {
    screenId: normalizeScreenEntryPresentationScopeId(record.screenId),
    entryId: normalizeScreenEntryPresentationScopeId(record.entryId),
    updatedBy: normalizeUpdatedBy(record.updatedBy),
    createdAt: normalizeRepositoryDate(record.createdAt),
    updatedAt: normalizeRepositoryDate(record.updatedAt),
    ...normalizeDraftKeys(record),
  };
};

const normalizeTransportRecord = (value: unknown): ScreenEntryPresentationOverrideDraft => {
  const record = expectOverrideRecord(value);
  rejectUnknownKeys(record, recordKeys);
  normalizeScreenEntryPresentationScopeId(record.screenId);
  normalizeScreenEntryPresentationScopeId(record.entryId);
  normalizeUpdatedBy(record.updatedBy);
  normalizeTransportTimestamp(record.createdAt);
  normalizeTransportTimestamp(record.updatedAt);
  return normalizeDraftKeys(record);
};

type OverrideListSource = "draft-cache" | "repository-record" | "transport-response";

type NormalizedOverrideList<TSource extends OverrideListSource> =
  TSource extends "repository-record"
    ? ScreenEntryPresentationOverrideRecord[]
    : ScreenEntryPresentationOverrideDraft[];

export function normalizeScreenEntryPresentationOverrideList<TSource extends OverrideListSource>(
  input: unknown,
  options: { source: TSource }
): NormalizedOverrideList<TSource> {
  if (!Array.isArray(input) || input.length > 200) throw invalidOverride();
  let normalized: ScreenEntryPresentationOverrideDraft[] | ScreenEntryPresentationOverrideRecord[];
  switch (options.source) {
    case "draft-cache":
      normalized = input.map(normalizeScreenEntryPresentationOverrideDraft);
      break;
    case "repository-record":
      normalized = input.map(normalizeRepositoryRecord);
      break;
    case "transport-response":
      normalized = input.map(normalizeTransportRecord);
      break;
    default:
      throw invalidOverride();
  }
  return normalized as NormalizedOverrideList<TSource>;
}

export function normalizeScreenEntryPresentationOverrideReplacePayload(
  input: unknown
): ScreenEntryPresentationOverrideReplacePayload {
  const record = expectOverrideRecord(input);
  rejectUnknownKeys(record, ["overrides"]);
  return {
    overrides: normalizeScreenEntryPresentationOverrideList(record.overrides, {
      source: "draft-cache",
    }),
  };
}
