import { redactAssistantMetadata, redactAssistantText } from "./assistantRedaction";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";

type JsonRecord = Record<string, unknown>;

export type AssistantSiteBuilderReferenceMediaAsset = {
  id: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  title?: string | null;
  originalName?: string | null;
  alt?: string | null;
  caption?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AssistantSiteBuilderTemporaryReferenceRecord = {
  id: string;
  status: "scanned" | "pending" | "rejected";
  contentType: string;
  sizeBytes: number;
  originalFilename?: string | null;
  metadata?: Record<string, unknown> | null;
  ocrText?: string | null;
  extractedText?: string | null;
  altText?: string | null;
};

export type AssistantSiteBuilderReferenceDeps = {
  resolveReadableMediaAsset(id: string): Promise<AssistantSiteBuilderReferenceMediaAsset | null>;
  resolveTemporaryReference(
    id: string
  ): Promise<AssistantSiteBuilderTemporaryReferenceRecord | null>;
};

export type AssistantSiteBuilderSafeMediaReference = {
  id: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  metadataDigest: string | null;
};

export type AssistantSiteBuilderSafeTemporaryReference = {
  id: string;
  contentType: string;
  sizeBytes: number;
  filenameDigest: string | null;
  metadataDigest: string | null;
  textDigest: string | null;
};

export type AssistantSiteBuilderReferenceGate = {
  code:
    | "remote_reference_url_unsupported"
    | "temporary_reference_missing"
    | "temporary_reference_unscanned"
    | "temporary_reference_rejected"
    | "temporary_reference_type_unsupported"
    | "temporary_reference_too_large";
  severity: "info" | "warning";
  message: string;
  referenceId?: string;
  digest?: string;
};

export type AssistantSiteBuilderSafeReferenceInput = {
  schemaVersion: 1;
  mediaAssets: AssistantSiteBuilderSafeMediaReference[];
  temporaryReferences: AssistantSiteBuilderSafeTemporaryReference[];
  textBrief: string | null;
  gates: AssistantSiteBuilderReferenceGate[];
  warnings: string[];
  redactionApplied: boolean;
};

const allowedReferenceInputKeys = new Set([
  "mediaAssetIds",
  "temporaryReferenceIds",
  "textBrief",
  "remoteUrls",
]);
const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const unsafeReferenceUriPattern = /(?:https?:\/\/|www\.|data:|blob:|file:|javascript:)/iu;
const supportedReferenceContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/markdown",
  "text/plain",
]);
const maxTemporaryReferenceSizeBytes = 10 * 1024 * 1024;
const instructionPatterns = [
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|above|system|developer)\s+instructions?\b/giu,
  /\b(bypass|disable|override)\s+(rbac|csrf|schema|schemas|validation|media\s+gates?|confirmation|review)\b/giu,
  /\b(execute|publish|apply|mutate)\s+without\s+(review|confirmation|permission|permissions)\b/giu,
  /\b(ignoruj|zignoruj|pomin|pomiń|zapomnij)\s+(wszystkie\s+)?(poprzednie|systemowe|developerskie)\s+instrukcje\b/giu,
  /\b(obejdz|obejdź|pomin|pomiń|wylacz|wyłącz|nadpisz)\s+(rbac|csrf|schema|schematy|walidacje|walidację|bramki\s+media|potwierdzenie|review|zatwierdzenie)\b/giu,
] as const;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (
  code:
    | "intake_answer_invalid"
    | "intake_answer_unknown_key"
    | "intake_answer_required"
    | "intake_text_invalid",
  details: Readonly<Record<string, unknown>> = {}
): never => throwAssistantSiteBuilderIntakeError(code, details);

const readRecord = (value: unknown, details: Readonly<Record<string, unknown>> = {}) =>
  isRecord(value) ? value : fail("intake_answer_invalid", details);

const rejectUnknownKeys = (
  input: JsonRecord,
  allowed: ReadonlySet<string>,
  details: Readonly<Record<string, unknown>>
) => {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) fail("intake_answer_unknown_key", { ...details, key });
  }
};

const pushWarning = (warnings: string[], warning: string) => {
  if (!warnings.includes(warning)) warnings.push(warning);
};

const normalizeText = (value: string) =>
  value
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const stableJson = (value: unknown): string => {
  if (value === undefined) return "null";
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(String(value));
};

const hashReferenceValue = (value: unknown): string => {
  const input = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const normalizeStringArray = (
  value: unknown,
  field: string,
  options: { maxItems: number; maxLength: number }
): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("intake_answer_invalid", { field });
  const values = value as unknown[];
  const ids = values
    .slice(0, options.maxItems)
    .map((entry, index) => {
      const text =
        typeof entry === "string"
          ? entry
          : fail("intake_text_invalid", { field: `${field}.${index}` });
      const normalized = normalizeText(text);
      if (!normalized) fail("intake_answer_required", { field: `${field}.${index}` });
      return redactAssistantText(normalized, options.maxLength);
    })
    .filter((item): item is string => Boolean(item));
  return [...new Set(ids)];
};

const normalizeStableIds = (value: unknown, field: string, maxItems: number): string[] => {
  const ids = normalizeStringArray(value, field, { maxItems, maxLength: 80 });
  for (const id of ids) {
    if (!stableIdPattern.test(id)) fail("intake_answer_invalid", { field, id });
  }
  return ids;
};

export const normalizeReferenceTextValue = (
  value: unknown,
  field: string,
  options: { maxLength: number; required?: boolean } = { maxLength: 700 }
): string | undefined => {
  if (value === undefined || value === null) {
    if (options.required) fail("intake_answer_required", { field });
    return undefined;
  }
  const text = typeof value === "string" ? value : fail("intake_text_invalid", { field });
  const normalized = normalizeText(text);
  if (!normalized) {
    if (options.required) fail("intake_answer_required", { field });
    return undefined;
  }
  if (unsafeReferenceUriPattern.test(normalized)) {
    fail("intake_answer_invalid", { field, reason: "remote_reference_url_unsupported" });
  }

  let filtered = normalized;
  for (const pattern of instructionPatterns) {
    filtered = filtered.replace(pattern, "[FILTERED_INSTRUCTION]");
  }
  return redactAssistantText(filtered, options.maxLength);
};

const sanitizeReferenceTextForDigest = (
  value: string | null | undefined,
  warnings: string[],
  maxLength: number
): string | null => {
  if (!value) return null;
  let filtered = normalizeText(value);
  for (const pattern of instructionPatterns) {
    filtered = filtered.replace(pattern, "[FILTERED_INSTRUCTION]");
  }
  if (filtered !== normalizeText(value)) pushWarning(warnings, "reference_instruction_filtered");
  const redacted = redactAssistantText(filtered, maxLength);
  if (redacted.includes("[REDACTED]") || redacted.includes("[REDACTED_URL]")) {
    pushWarning(warnings, "reference_secret_redacted");
  }
  return redacted || null;
};

const sanitizeMetadataForDigest = (value: unknown, warnings: string[]): unknown => {
  if (typeof value === "string") return sanitizeReferenceTextForDigest(value, warnings, 200);
  if (Array.isArray(value)) return value.map((entry) => sanitizeMetadataForDigest(entry, warnings));
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sanitizeMetadataForDigest(entry, warnings),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
};

const metadataDigest = (
  value: Record<string, unknown> | null | undefined,
  warnings: string[]
): string | null => {
  if (!value) return null;
  const redacted = sanitizeMetadataForDigest(redactAssistantMetadata(value), warnings);
  if (stableJson(redacted) !== stableJson(value)) {
    pushWarning(warnings, "reference_metadata_redacted");
  }
  return hashReferenceValue(redacted);
};

const mediaAssetToSafeReference = (
  asset: AssistantSiteBuilderReferenceMediaAsset,
  warnings: string[]
): AssistantSiteBuilderSafeMediaReference => {
  const labelDigest = hashReferenceValue([
    sanitizeReferenceTextForDigest(asset.title, warnings, 160),
    sanitizeReferenceTextForDigest(asset.originalName, warnings, 160),
    sanitizeReferenceTextForDigest(asset.alt, warnings, 240),
    sanitizeReferenceTextForDigest(asset.caption, warnings, 240),
  ]);
  return {
    id: asset.id,
    mimeType: asset.mimeType ?? null,
    width:
      typeof asset.width === "number" && Number.isFinite(asset.width)
        ? Math.floor(asset.width)
        : null,
    height:
      typeof asset.height === "number" && Number.isFinite(asset.height)
        ? Math.floor(asset.height)
        : null,
    metadataDigest: hashReferenceValue([labelDigest, metadataDigest(asset.metadata, warnings)]),
  };
};

const temporaryReferenceToSafeReference = (
  reference: AssistantSiteBuilderTemporaryReferenceRecord,
  warnings: string[]
): AssistantSiteBuilderSafeTemporaryReference => {
  const textValues = [
    sanitizeReferenceTextForDigest(reference.ocrText, warnings, 800),
    sanitizeReferenceTextForDigest(reference.extractedText, warnings, 800),
    sanitizeReferenceTextForDigest(reference.altText, warnings, 240),
  ].filter((value): value is string => Boolean(value));

  return {
    id: reference.id,
    contentType: reference.contentType,
    sizeBytes: Math.max(0, Math.floor(reference.sizeBytes)),
    filenameDigest: reference.originalFilename
      ? hashReferenceValue(
          sanitizeReferenceTextForDigest(reference.originalFilename, warnings, 160)
        )
      : null,
    metadataDigest: metadataDigest(reference.metadata, warnings),
    textDigest: textValues.length > 0 ? hashReferenceValue(textValues) : null,
  };
};

const buildRemoteUrlGates = (value: unknown): AssistantSiteBuilderReferenceGate[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("intake_answer_invalid", { field: "remoteUrls" });
  const values = value as unknown[];

  return values.slice(0, 8).map((entry, index) => {
    const text =
      typeof entry === "string"
        ? entry
        : fail("intake_text_invalid", { field: `remoteUrls.${index}` });
    const url = normalizeText(text);
    if (!url) fail("intake_answer_required", { field: `remoteUrls.${index}` });
    if (!unsafeReferenceUriPattern.test(url)) {
      fail("intake_answer_invalid", { field: "remoteUrls", reason: "remote_url_invalid" });
    }
    const redactedUrl = redactAssistantText(url, 2048);
    return {
      code: "remote_reference_url_unsupported",
      severity: "warning",
      digest: hashReferenceValue(redactedUrl),
      message:
        "Remote reference URLs are not accepted until a backend-owned trusted adapter validates the source.",
    };
  });
};

export const normalizeSafeReferenceInput = async (
  input: unknown,
  deps: AssistantSiteBuilderReferenceDeps
): Promise<AssistantSiteBuilderSafeReferenceInput> => {
  const record = readRecord(input, { scope: "reference-input" });
  rejectUnknownKeys(record, allowedReferenceInputKeys, { scope: "reference-input" });

  const warnings: string[] = [];
  const gates = buildRemoteUrlGates(record.remoteUrls);
  const textBrief = normalizeReferenceTextValue(record.textBrief, "textBrief", {
    maxLength: 700,
  });
  const mediaAssetIds = normalizeStableIds(record.mediaAssetIds, "mediaAssetIds", 12);
  const temporaryReferenceIds = normalizeStableIds(
    record.temporaryReferenceIds,
    "temporaryReferenceIds",
    8
  );

  const mediaAssets: AssistantSiteBuilderSafeMediaReference[] = [];
  for (const mediaAssetId of mediaAssetIds) {
    const asset = await deps.resolveReadableMediaAsset(mediaAssetId);
    if (!asset) {
      fail("intake_answer_invalid", {
        field: "mediaAssetIds",
        id: mediaAssetId,
        reason: "media_asset_unreadable",
      });
      continue;
    }
    mediaAssets.push(mediaAssetToSafeReference(asset, warnings));
  }

  const temporaryReferences: AssistantSiteBuilderSafeTemporaryReference[] = [];
  for (const referenceId of temporaryReferenceIds) {
    const reference = await deps.resolveTemporaryReference(referenceId);
    if (!reference) {
      gates.push({
        code: "temporary_reference_missing",
        severity: "warning",
        referenceId,
        message: "Temporary reference id was not found or is no longer available.",
      });
      continue;
    }
    if (reference.status === "pending") {
      gates.push({
        code: "temporary_reference_unscanned",
        severity: "warning",
        referenceId,
        message: "Temporary reference must be scanned before it can influence design facts.",
      });
      continue;
    }
    if (reference.status === "rejected") {
      gates.push({
        code: "temporary_reference_rejected",
        severity: "warning",
        referenceId,
        message: "Temporary reference scan rejected the file.",
      });
      continue;
    }
    if (!supportedReferenceContentTypes.has(reference.contentType)) {
      gates.push({
        code: "temporary_reference_type_unsupported",
        severity: "warning",
        referenceId,
        message: "Temporary reference content type is not supported for design evidence.",
      });
      continue;
    }
    if (
      !Number.isFinite(reference.sizeBytes) ||
      reference.sizeBytes <= 0 ||
      reference.sizeBytes > maxTemporaryReferenceSizeBytes
    ) {
      gates.push({
        code: "temporary_reference_too_large",
        severity: "warning",
        referenceId,
        message: "Temporary reference has an invalid or oversized design-evidence size.",
      });
      continue;
    }
    temporaryReferences.push(temporaryReferenceToSafeReference(reference, warnings));
  }

  return {
    schemaVersion: 1,
    mediaAssets,
    temporaryReferences,
    textBrief: textBrief ?? null,
    gates,
    warnings,
    redactionApplied: warnings.length > 0,
  };
};
