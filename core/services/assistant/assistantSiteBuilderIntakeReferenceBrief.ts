import { redactAssistantText } from "./assistantRedaction";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import type { AssistantSiteBuilderSafeReferenceInput } from "./assistantSiteBuilderIntakeReferencePolicy";
import {
  assistantSiteBuilderDesignDensityIds,
  assistantSiteBuilderDesignImageTreatmentIds,
  assistantSiteBuilderDesignTypographyIds,
  assistantSiteBuilderReferenceColorHintIds,
  assistantSiteBuilderReferenceDesignBriefGateCodes,
  assistantSiteBuilderReferenceDesignBriefWarningCodes,
  assistantSiteBuilderReferenceLayoutHintIds,
  type AssistantSiteBuilderDesignDensityId,
  type AssistantSiteBuilderDesignImageTreatmentId,
  type AssistantSiteBuilderDesignTypographyId,
  type AssistantSiteBuilderIntakeFacts,
  type AssistantSiteBuilderReferenceColorHintId,
  type AssistantSiteBuilderReferenceDesignBriefFacts,
  type AssistantSiteBuilderReferenceDesignBriefGate,
  type AssistantSiteBuilderReferenceDesignBriefGateCode,
  type AssistantSiteBuilderReferenceDesignBriefWarning,
  type AssistantSiteBuilderReferenceDesignBriefWarningCode,
  type AssistantSiteBuilderReferenceLayoutHintId,
} from "./assistantSiteBuilderIntakeTypes";

type JsonRecord = Record<string, unknown>;

export type AssistantSiteBuilderReferenceBriefReview = {
  confirmed?: boolean;
};

export type AssistantSiteBuilderReferenceBriefMergeResult = {
  facts: AssistantSiteBuilderIntakeFacts;
  gates: AssistantSiteBuilderReferenceDesignBriefGate[];
};

const briefKeys = new Set([
  "schemaVersion",
  "sourceDigest",
  "colorHintIds",
  "layoutHintIds",
  "densityId",
  "typographyId",
  "imageTreatmentId",
  "evidence",
  "warnings",
  "gates",
  "constraints",
]);
const evidenceKeys = new Set(["mediaAssetCount", "temporaryReferenceCount", "hasTextBrief"]);
const warningKeys = new Set(["code", "severity", "message", "count"]);
const gateKeys = new Set(["code", "severity", "message", "count"]);
const constraintKeys = new Set([
  "executableActionsAllowed",
  "mediaImportsAllowed",
  "rawReferenceMaterialIncluded",
]);
const digestPattern = /^[a-f0-9]{8,64}$/;
const colorHintIds = new Set<string>(assistantSiteBuilderReferenceColorHintIds);
const layoutHintIds = new Set<string>(assistantSiteBuilderReferenceLayoutHintIds);
const densityIds = new Set<string>(assistantSiteBuilderDesignDensityIds);
const typographyIds = new Set<string>(assistantSiteBuilderDesignTypographyIds);
const imageTreatmentIds = new Set<string>(assistantSiteBuilderDesignImageTreatmentIds);
const warningCodes = new Set<string>(assistantSiteBuilderReferenceDesignBriefWarningCodes);
const gateCodes = new Set<string>(assistantSiteBuilderReferenceDesignBriefGateCodes);

const fail = (
  code: "intake_answer_invalid" | "intake_answer_unknown_key",
  details: Readonly<Record<string, unknown>> = {}
): never => throwAssistantSiteBuilderIntakeError(code, details);

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const hashReferenceBriefValue = (value: unknown): string => {
  const input = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const pushUnique = <T extends string>(values: T[], value: T) => {
  if (!values.includes(value)) values.push(value);
};

const countByCode = (codes: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return counts;
};

const getTextBrief = (reference: AssistantSiteBuilderSafeReferenceInput) =>
  (reference.textBrief ?? "").toLocaleLowerCase();

const buildSourceDigest = (reference: AssistantSiteBuilderSafeReferenceInput) =>
  hashReferenceBriefValue({
    textBriefDigest: reference.textBrief ? hashReferenceBriefValue(reference.textBrief) : null,
    mediaAssets: reference.mediaAssets.map((asset) => ({
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      metadataDigest: asset.metadataDigest,
    })),
    temporaryReferences: reference.temporaryReferences.map((item) => ({
      contentType: item.contentType,
      sizeBytes: item.sizeBytes,
      filenameDigest: item.filenameDigest,
      metadataDigest: item.metadataDigest,
      textDigest: item.textDigest,
    })),
    gateCodes: reference.gates.map((gate) => gate.code),
    warningCodes: reference.warnings,
  });

const resolveColorHints = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderReferenceColorHintId[] => {
  const text = getTextBrief(reference);
  const hints: AssistantSiteBuilderReferenceColorHintId[] = [];
  if (/\b(warm|earth|natural|cream|beige|sun|gold)\b/u.test(text)) pushUnique(hints, "warm");
  if (/\b(cool|blue|steel|tech|clinical)\b/u.test(text)) pushUnique(hints, "cool");
  if (/\b(muted|soft|quiet|subtle|pastel)\b/u.test(text)) pushUnique(hints, "muted");
  if (/\b(high contrast|contrast|bold|dark|black)\b/u.test(text)) {
    pushUnique(hints, "high-contrast");
  }
  if (/\b(accent|colorful|colourful|neon|vivid)\b/u.test(text)) pushUnique(hints, "accent-led");
  if (hints.length === 0 && hasReferenceEvidence(reference)) pushUnique(hints, "neutral");
  return hints;
};

const resolveLayoutHints = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderReferenceLayoutHintId[] => {
  const text = getTextBrief(reference);
  const hints: AssistantSiteBuilderReferenceLayoutHintId[] = [];
  if (/\b(grid|cards|gallery|catalog|katalog)\b/u.test(text)) pushUnique(hints, "grid");
  if (/\b(split|two column|two-column|media left|media right)\b/u.test(text)) {
    pushUnique(hints, "split");
  }
  if (/\b(editorial|magazine|story|article|journal)\b/u.test(text)) pushUnique(hints, "editorial");
  if (/\b(compact|dense|tight)\b/u.test(text)) pushUnique(hints, "compact");
  if (
    reference.mediaAssets.length > 0 ||
    reference.temporaryReferences.length > 0 ||
    /\b(photo|image|visual|media|zdjecia|zdjęcia)\b/u.test(text)
  ) {
    pushUnique(hints, "media-support");
  }
  if (hints.length === 0 && hasReferenceEvidence(reference)) pushUnique(hints, "copy-first");
  return hints;
};

const resolveDensity = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderDesignDensityId | null => {
  if (!hasReferenceEvidence(reference)) return null;
  const text = getTextBrief(reference);
  if (/\b(compact|dense|tight)\b/u.test(text)) return "compact";
  if (/\b(spacious|airy|large|breathing|open)\b/u.test(text)) return "spacious";
  return "balanced";
};

const resolveTypography = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderDesignTypographyId | null => {
  const text = getTextBrief(reference);
  if (/\b(editorial|serif|magazine|journal)\b/u.test(text)) return "serif-accent";
  if (/\b(display|poster|bold headline|expressive)\b/u.test(text)) return "display-accent";
  if (hasReferenceEvidence(reference)) return "sans";
  return null;
};

const resolveImageTreatment = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderDesignImageTreatmentId | null => {
  const text = getTextBrief(reference);
  const hasMedia = reference.mediaAssets.length > 0 || reference.temporaryReferences.length > 0;
  if (/\b(editorial|crop|magazine)\b/u.test(text)) return "editorial-crop";
  if (/\b(high contrast|contrast|bold|dark)\b/u.test(text)) return "high-contrast";
  if (/\b(quiet|soft|muted|minimal)\b/u.test(text)) return "quiet";
  if (/\b(cinematic|immersive|wide)\b/u.test(text)) return "cinematic";
  if (/\b(functional|utilitarian|dashboard|work-focused)\b/u.test(text)) return "functional";
  return hasMedia ? "crisp" : null;
};

const hasReferenceEvidence = (reference: AssistantSiteBuilderSafeReferenceInput) =>
  Boolean(
    reference.textBrief ||
    reference.mediaAssets.length > 0 ||
    reference.temporaryReferences.length > 0
  );

const buildWarnings = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderReferenceDesignBriefWarning[] => {
  const warningCounts = countByCode(reference.warnings);
  const warnings: AssistantSiteBuilderReferenceDesignBriefWarning[] = [];
  const pushWarning = (
    code: AssistantSiteBuilderReferenceDesignBriefWarningCode,
    message: string,
    count = warningCounts.get(code) ?? 0,
    severity: "info" | "warning" = "warning"
  ) => {
    if (count <= 0) return;
    warnings.push({
      code,
      severity,
      message: redactAssistantText(message, 220),
      count,
    });
  };

  pushWarning(
    "reference_instruction_filtered",
    "Instruction-like reference text was filtered before design brief extraction."
  );
  pushWarning("reference_secret_redacted", "Secret-like reference text was redacted.");
  pushWarning(
    "reference_metadata_redacted",
    "Reference metadata was redacted before design brief extraction.",
    warningCounts.get("reference_metadata_redacted") ?? 0,
    "info"
  );

  const remoteGateCount = reference.gates.filter(
    (gate) => gate.code === "remote_reference_url_unsupported"
  ).length;
  if (remoteGateCount > 0) {
    warnings.push({
      code: "reference_remote_url_unsupported",
      severity: "warning",
      message: "Remote reference URLs were not used for design evidence.",
      count: remoteGateCount,
    });
  }

  return warnings;
};

const buildGates = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderReferenceDesignBriefGate[] => {
  const gates: AssistantSiteBuilderReferenceDesignBriefGate[] = [];
  const gatedReferenceCount = reference.gates.filter(
    (gate) => gate.code !== "remote_reference_url_unsupported"
  ).length;
  if (gatedReferenceCount > 0) {
    gates.push({
      code: "reference_material_gated",
      severity: "warning",
      message: "Some reference material was not eligible for design evidence.",
      count: gatedReferenceCount,
    });
  }
  if (!hasReferenceEvidence(reference)) {
    gates.push({
      code: "reference_brief_empty",
      severity: "info",
      message: "No safe reference evidence is available for design hints.",
    });
  }
  return gates;
};

export const buildReferenceDesignBrief = (
  reference: AssistantSiteBuilderSafeReferenceInput
): AssistantSiteBuilderReferenceDesignBriefFacts => ({
  schemaVersion: 1,
  sourceDigest: buildSourceDigest(reference),
  colorHintIds: resolveColorHints(reference),
  layoutHintIds: resolveLayoutHints(reference),
  densityId: resolveDensity(reference),
  typographyId: resolveTypography(reference),
  imageTreatmentId: resolveImageTreatment(reference),
  evidence: {
    mediaAssetCount: reference.mediaAssets.length,
    temporaryReferenceCount: reference.temporaryReferences.length,
    hasTextBrief: Boolean(reference.textBrief),
  },
  warnings: buildWarnings(reference),
  gates: buildGates(reference),
  constraints: {
    executableActionsAllowed: false,
    mediaImportsAllowed: false,
    rawReferenceMaterialIncluded: false,
  },
});

const normalizeCount = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const numeric = typeof value === "number" ? value : fail("intake_answer_invalid", { field });
  if (!Number.isFinite(numeric) || numeric < 0) {
    fail("intake_answer_invalid", { field });
  }
  return Math.floor(numeric);
};

const normalizeBoolean = (value: unknown, field: string): boolean => {
  return typeof value === "boolean" ? value : fail("intake_answer_invalid", { field });
};

const normalizeString = (value: unknown, field: string, maxLength: number): string => {
  const text = typeof value === "string" ? value : fail("intake_answer_invalid", { field });
  const normalized = redactAssistantText(text, maxLength);
  if (!normalized) fail("intake_answer_invalid", { field });
  return normalized;
};

const normalizeEnumArray = <TId extends string>(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>,
  maxItems: number
): TId[] => {
  if (!Array.isArray(value)) fail("intake_answer_invalid", { field });
  const values = value as unknown[];
  const normalized: TId[] = [];
  for (const [index, entry] of values.slice(0, maxItems).entries()) {
    if (typeof entry !== "string" || !allowed.has(entry)) {
      fail("intake_answer_invalid", { field: `${field}.${index}` });
    }
    if (!normalized.includes(entry as TId)) normalized.push(entry as TId);
  }
  return normalized;
};

const normalizeEnum = <TId extends string>(
  value: unknown,
  field: string,
  allowed: ReadonlySet<string>
): TId | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !allowed.has(value)) fail("intake_answer_invalid", { field });
  return value as TId;
};

const referenceWarningMessages = Object.freeze({
  reference_instruction_filtered:
    "Instruction-like reference text was filtered before design brief extraction.",
  reference_secret_redacted: "Secret-like reference text was redacted.",
  reference_metadata_redacted: "Reference metadata was redacted before design brief extraction.",
  reference_remote_url_unsupported: "Remote reference URLs were not used for design evidence.",
} satisfies Record<AssistantSiteBuilderReferenceDesignBriefWarningCode, string>);

const referenceGateMessages = Object.freeze({
  reference_review_required:
    "Reference design hints must be reviewed before they influence planning.",
  reference_material_gated: "Some reference material was not eligible for design evidence.",
  reference_brief_empty: "No safe reference evidence is available for design hints.",
} satisfies Record<AssistantSiteBuilderReferenceDesignBriefGateCode, string>);

const normalizeWarning = (value: unknown, index: number) => {
  const record = readRecord(value, { field: `warnings.${index}` });
  rejectUnknownKeys(record, warningKeys, { field: `warnings.${index}` });
  const code = normalizeEnum<AssistantSiteBuilderReferenceDesignBriefWarningCode>(
    record.code,
    `warnings.${index}.code`,
    warningCodes
  ) as AssistantSiteBuilderReferenceDesignBriefWarningCode;
  normalizeString(record.message, `warnings.${index}.message`, 220);
  return {
    code,
    severity: normalizeEnum<"info" | "warning">(
      record.severity,
      `warnings.${index}.severity`,
      new Set(["info", "warning"])
    ) as "info" | "warning",
    message: referenceWarningMessages[code],
    count: normalizeCount(record.count, `warnings.${index}.count`),
  } satisfies AssistantSiteBuilderReferenceDesignBriefWarning;
};

const normalizeGate = (value: unknown, index: number) => {
  const record = readRecord(value, { field: `gates.${index}` });
  rejectUnknownKeys(record, gateKeys, { field: `gates.${index}` });
  const code = normalizeEnum<AssistantSiteBuilderReferenceDesignBriefGateCode>(
    record.code,
    `gates.${index}.code`,
    gateCodes
  ) as AssistantSiteBuilderReferenceDesignBriefGateCode;
  normalizeString(record.message, `gates.${index}.message`, 220);
  return {
    code,
    severity: normalizeEnum<"info" | "warning">(
      record.severity,
      `gates.${index}.severity`,
      new Set(["info", "warning"])
    ) as "info" | "warning",
    message: referenceGateMessages[code],
    count: normalizeCount(record.count, `gates.${index}.count`),
  } satisfies AssistantSiteBuilderReferenceDesignBriefGate;
};

const normalizeEvidence = (value: unknown) => {
  const record = readRecord(value, { field: "evidence" });
  rejectUnknownKeys(record, evidenceKeys, { field: "evidence" });
  return {
    mediaAssetCount: normalizeCount(record.mediaAssetCount, "evidence.mediaAssetCount") ?? 0,
    temporaryReferenceCount:
      normalizeCount(record.temporaryReferenceCount, "evidence.temporaryReferenceCount") ?? 0,
    hasTextBrief: normalizeBoolean(record.hasTextBrief, "evidence.hasTextBrief"),
  };
};

const normalizeConstraints = (value: unknown) => {
  const record = readRecord(value, { field: "constraints" });
  rejectUnknownKeys(record, constraintKeys, { field: "constraints" });
  if (
    record.executableActionsAllowed !== false ||
    record.mediaImportsAllowed !== false ||
    record.rawReferenceMaterialIncluded !== false
  ) {
    fail("intake_answer_invalid", { field: "constraints" });
  }
  return {
    executableActionsAllowed: false,
    mediaImportsAllowed: false,
    rawReferenceMaterialIncluded: false,
  } as const;
};

const normalizeList = <TItem>(
  value: unknown,
  field: string,
  normalize: (item: unknown, index: number) => TItem
) => {
  if (!Array.isArray(value)) fail("intake_answer_invalid", { field });
  const values = value as unknown[];
  return values.map((item, index) => normalize(item, index));
};

export const normalizeReferenceDesignBriefFacts = (
  input: unknown
): AssistantSiteBuilderReferenceDesignBriefFacts => {
  const record = readRecord(input, { scope: "referenceDesignBrief" });
  rejectUnknownKeys(record, briefKeys, { scope: "referenceDesignBrief" });
  if (record.schemaVersion !== 1) fail("intake_answer_invalid", { field: "schemaVersion" });
  const sourceDigest = normalizeString(record.sourceDigest, "sourceDigest", 80);
  if (!digestPattern.test(sourceDigest)) fail("intake_answer_invalid", { field: "sourceDigest" });

  return {
    schemaVersion: 1,
    sourceDigest,
    colorHintIds: normalizeEnumArray<AssistantSiteBuilderReferenceColorHintId>(
      record.colorHintIds,
      "colorHintIds",
      colorHintIds,
      6
    ),
    layoutHintIds: normalizeEnumArray<AssistantSiteBuilderReferenceLayoutHintId>(
      record.layoutHintIds,
      "layoutHintIds",
      layoutHintIds,
      6
    ),
    densityId: normalizeEnum<AssistantSiteBuilderDesignDensityId>(
      record.densityId,
      "densityId",
      densityIds
    ),
    typographyId: normalizeEnum<AssistantSiteBuilderDesignTypographyId>(
      record.typographyId,
      "typographyId",
      typographyIds
    ),
    imageTreatmentId: normalizeEnum<AssistantSiteBuilderDesignImageTreatmentId>(
      record.imageTreatmentId,
      "imageTreatmentId",
      imageTreatmentIds
    ),
    evidence: normalizeEvidence(record.evidence),
    warnings: normalizeList(record.warnings, "warnings", normalizeWarning),
    gates: normalizeList(record.gates, "gates", normalizeGate),
    constraints: normalizeConstraints(record.constraints),
  };
};

export const mergeReviewedReferenceDesignBrief = (
  facts: AssistantSiteBuilderIntakeFacts,
  brief: AssistantSiteBuilderReferenceDesignBriefFacts,
  review: AssistantSiteBuilderReferenceBriefReview
): AssistantSiteBuilderReferenceBriefMergeResult => {
  const normalizedBrief = normalizeReferenceDesignBriefFacts(brief);
  if (review.confirmed !== true) {
    return {
      facts,
      gates: [
        {
          code: "reference_review_required",
          severity: "warning",
          message: referenceGateMessages.reference_review_required,
        },
      ],
    };
  }

  return {
    facts: {
      ...facts,
      referenceDesignBrief: normalizedBrief,
    },
    gates: [...normalizedBrief.gates],
  };
};
