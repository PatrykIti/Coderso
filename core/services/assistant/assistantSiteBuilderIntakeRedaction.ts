import { redactAssistantMetadata, redactAssistantText } from "./assistantRedaction";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import type {
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeMode,
  AssistantSiteBuilderIntakeSession,
  AssistantSiteBuilderIntakeStepId,
  AssistantSiteBuilderReviewStateId,
} from "./assistantSiteBuilderIntakeTypes";
import {
  assistantSiteBuilderContentEngineIds,
  assistantSiteBuilderHeroPresetIds,
  assistantSiteBuilderIntakeStepIds,
  assistantSiteBuilderMediaPolicyIds,
  assistantSiteBuilderMenuPresetIds,
  assistantSiteBuilderPageRoleIds,
  assistantSiteBuilderReviewStateIds,
  assistantSiteBuilderSectionRoleIds,
} from "./assistantSiteBuilderIntakeTypes";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type AssistantSiteBuilderIntakeDiagnostic = {
  schemaVersion: 1;
  version: AssistantSiteBuilderIntakeSession["version"];
  mode: AssistantSiteBuilderIntakeMode;
  currentStepId: AssistantSiteBuilderIntakeStepId;
  answeredStepIds: AssistantSiteBuilderIntakeStepId[];
  factsHash: string;
  reviewState: AssistantSiteBuilderReviewStateId | null;
  readyForReview: boolean;
  readyForExecution: boolean;
  redactionApplied: boolean;
  warnings: string[];
};

export type AssistantSiteBuilderIntakeProviderContext = {
  schemaVersion: 1;
  businessProfile: {
    siteName: string | null;
    entityName: string | null;
    topic: string | null;
    vertical: string | null;
    audience: string | null;
    locale: string | null;
    region: string | null;
    summary: string | null;
    offerSummary: string | null;
  };
  goals: {
    primary: string | null;
    summaries: string[];
  };
  structure: {
    pageRoleIds: NonNullable<AssistantSiteBuilderIntakeFacts["pageRoles"]>;
    sectionRoleIds: NonNullable<AssistantSiteBuilderIntakeFacts["sectionRoles"]>;
    contentEngineIds: NonNullable<AssistantSiteBuilderIntakeFacts["contentEngines"]>;
  };
  visual: {
    menuPresetId: AssistantSiteBuilderIntakeFacts["menuPreset"] | null;
    heroPresetId: AssistantSiteBuilderIntakeFacts["heroPreset"] | null;
    heroHeadline: string | null;
    heroSubheadline: string | null;
    designBrief: string | null;
  };
  media: {
    policyId: AssistantSiteBuilderIntakeFacts["mediaPolicy"] | null;
    notes: string | null;
  };
  references: {
    present: boolean;
    digest: string | null;
    rawIncluded: false;
  };
  readiness: {
    reviewState: AssistantSiteBuilderReviewStateId | null;
    readyForReview: boolean;
    readyForExecution: boolean;
    missingRequiredStepIds: AssistantSiteBuilderIntakeStepId[];
    missingReviewInputStepIds: AssistantSiteBuilderIntakeStepId[];
  };
  constraints: {
    factsAreAdvisory: true;
    executableActionsAllowed: false;
    providerMayOverrideSchemas: false;
    requiresReviewConfirmation: true;
    rawReferencesIncluded: false;
    mediaUploadsAllowed: false;
  };
  warnings: string[];
};

const textBoundary = String.raw`(?=$|[^\p{L}\p{N}_])`;

const providerInstructionOverridePatterns = [
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|above|system|developer)\s+instructions?\b/gi,
  /\b(bypass|disable|override)\s+(rbac|csrf|schema|schemas|validation|media\s+gates?|confirmation|review)\b/gi,
  /\b(execute|publish|apply|mutate)\s+without\s+(review|confirmation|permission|permissions)\b/gi,
  new RegExp(
    String.raw`\b(ignoruj|zignoruj|pomin|pomiń|zapomnij)\s+(wszystkie\s+)?(poprzednie|systemowe|developerskie)\s+instrukcje${textBoundary}`,
    "giu"
  ),
  new RegExp(
    String.raw`\b(obejdz|obejdź|pomin|pomiń|wylacz|wyłącz|nadpisz)\s+(rbac|csrf|schema|schematy|walidacje|walidację|bramki\s+media|potwierdzenie|review|zatwierdzenie)${textBoundary}`,
    "giu"
  ),
  new RegExp(
    String.raw`\b(wykonaj|opublikuj|zastosuj|mutuj)\s+bez\s+(review|zatwierdzenia|potwierdzenia|uprawnien|uprawnień)${textBoundary}`,
    "giu"
  ),
] as const;

const pageRoleIds = new Set<string>(assistantSiteBuilderPageRoleIds);
const sectionRoleIds = new Set<string>(assistantSiteBuilderSectionRoleIds);
const contentEngineIds = new Set<string>(assistantSiteBuilderContentEngineIds);
const menuPresetIds = new Set<string>(assistantSiteBuilderMenuPresetIds);
const heroPresetIds = new Set<string>(assistantSiteBuilderHeroPresetIds);
const mediaPolicyIds = new Set<string>(assistantSiteBuilderMediaPolicyIds);
const reviewStateIds = new Set<string>(assistantSiteBuilderReviewStateIds);
const stepIds = new Set<string>(assistantSiteBuilderIntakeStepIds);

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

export const hashStableAssistantIntakeValue = (value: unknown): string => {
  const input = stableJson(value as JsonValue);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const pushWarning = (warnings: string[], warning: string) => {
  if (!warnings.includes(warning)) warnings.push(warning);
};

const sanitizeProviderText = (
  value: string | null | undefined,
  warnings: string[],
  maxLength: number
): string | null => {
  if (!value) return null;
  let filtered = value;
  for (const pattern of providerInstructionOverridePatterns) {
    filtered = filtered.replace(pattern, "[FILTERED_INSTRUCTION]");
  }
  if (filtered !== value) pushWarning(warnings, "instruction_text_filtered");
  const redacted = redactAssistantText(filtered, maxLength);
  if (redacted.includes("[REDACTED]") || redacted.includes("[REDACTED_URL]")) {
    pushWarning(warnings, "secret_like_text_redacted");
  }
  return redacted || null;
};

const sanitizeTextArray = (
  values: readonly string[] | undefined,
  warnings: string[],
  options: { maxItems: number; maxLength: number }
) =>
  [...new Set(values ?? [])]
    .slice(0, options.maxItems)
    .map((value) => sanitizeProviderText(value, warnings, options.maxLength))
    .filter((value): value is string => Boolean(value));

const sanitizeId = <TId extends string>(
  value: unknown,
  allowed: ReadonlySet<string>,
  warnings: string[]
): TId | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && allowed.has(value)) return value as TId;
  pushWarning(warnings, "invalid_intake_id_dropped");
  return null;
};

const sanitizeIdArray = <TId extends string>(
  values: unknown,
  allowed: ReadonlySet<string>,
  warnings: string[]
): TId[] => {
  if (!Array.isArray(values)) return [];
  const normalized: TId[] = [];
  for (const value of values) {
    const id = sanitizeId<TId>(value, allowed, warnings);
    if (id && !normalized.includes(id)) normalized.push(id);
  }
  return normalized;
};

const normalizeStepIds = (
  values: readonly AssistantSiteBuilderIntakeStepId[] | undefined,
  warnings?: string[]
): AssistantSiteBuilderIntakeStepId[] =>
  warnings
    ? sanitizeIdArray<AssistantSiteBuilderIntakeStepId>(values, stepIds, warnings)
    : [...new Set(values ?? [])];

const sanitizeReviewState = (
  value: AssistantSiteBuilderIntakeFacts["reviewState"],
  warnings: string[]
): AssistantSiteBuilderReviewStateId | null =>
  sanitizeId<AssistantSiteBuilderReviewStateId>(value, reviewStateIds, warnings);

export const redactAssistantSiteBuilderIntakeSession = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderIntakeDiagnostic => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  const facts = normalized.facts ?? {};
  const warnings: string[] = [];

  if (facts.redactionApplied === true) pushWarning(warnings, "intake_text_redacted");
  if (facts.referenceNotes) pushWarning(warnings, "reference_material_hashed");
  if (facts.readyForReview !== true) pushWarning(warnings, "intake_not_ready_for_review");
  if (facts.readyForExecution !== true) pushWarning(warnings, "intake_not_ready_for_execution");
  if ((facts.missingRequiredStepIds ?? []).length > 0) {
    pushWarning(warnings, "required_steps_missing");
  }

  return {
    schemaVersion: 1,
    version: normalized.version,
    mode: normalized.mode,
    currentStepId: normalized.currentStepId,
    answeredStepIds: normalizeStepIds(facts.answeredStepIds),
    factsHash: hashStableAssistantIntakeValue(facts),
    reviewState: facts.reviewState ?? null,
    readyForReview: facts.readyForReview === true,
    readyForExecution: facts.readyForExecution === true,
    redactionApplied: facts.redactionApplied === true,
    warnings: warnings.map((warning) => redactAssistantText(warning, 80)),
  };
};

export const buildSiteBuilderIntakeProviderContext = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderIntakeProviderContext => {
  const warnings: string[] = [];
  const referenceDigest = facts.referenceNotes
    ? hashStableAssistantIntakeValue(facts.referenceNotes)
    : null;
  if (referenceDigest) pushWarning(warnings, "reference_material_hashed");

  const context: AssistantSiteBuilderIntakeProviderContext = {
    schemaVersion: 1,
    businessProfile: {
      siteName: sanitizeProviderText(facts.siteName, warnings, 120),
      entityName: sanitizeProviderText(facts.entityName, warnings, 120),
      topic: sanitizeProviderText(facts.topic, warnings, 160),
      vertical: sanitizeProviderText(facts.vertical, warnings, 120),
      audience: sanitizeProviderText(facts.audience, warnings, 240),
      locale: sanitizeProviderText(facts.locale, warnings, 16),
      region: sanitizeProviderText(facts.region, warnings, 80),
      summary: sanitizeProviderText(facts.summary, warnings, 360),
      offerSummary: sanitizeProviderText(facts.offerSummary, warnings, 360),
    },
    goals: {
      primary: sanitizeProviderText(facts.primaryGoal, warnings, 160),
      summaries: sanitizeTextArray(facts.goals, warnings, { maxItems: 8, maxLength: 120 }),
    },
    structure: {
      pageRoleIds: sanitizeIdArray(facts.pageRoles, pageRoleIds, warnings),
      sectionRoleIds: sanitizeIdArray(facts.sectionRoles, sectionRoleIds, warnings),
      contentEngineIds: sanitizeIdArray(facts.contentEngines, contentEngineIds, warnings),
    },
    visual: {
      menuPresetId: sanitizeId<NonNullable<AssistantSiteBuilderIntakeFacts["menuPreset"]>>(
        facts.menuPreset,
        menuPresetIds,
        warnings
      ),
      heroPresetId: sanitizeId<NonNullable<AssistantSiteBuilderIntakeFacts["heroPreset"]>>(
        facts.heroPreset,
        heroPresetIds,
        warnings
      ),
      heroHeadline: sanitizeProviderText(facts.heroHeadline, warnings, 160),
      heroSubheadline: sanitizeProviderText(facts.heroSubheadline, warnings, 240),
      designBrief: sanitizeProviderText(facts.designBrief, warnings, 360),
    },
    media: {
      policyId: sanitizeId<NonNullable<AssistantSiteBuilderIntakeFacts["mediaPolicy"]>>(
        facts.mediaPolicy,
        mediaPolicyIds,
        warnings
      ),
      notes: sanitizeProviderText(facts.mediaNotes, warnings, 240),
    },
    references: {
      present: Boolean(facts.referenceNotes),
      digest: referenceDigest,
      rawIncluded: false,
    },
    readiness: {
      reviewState: sanitizeReviewState(facts.reviewState, warnings),
      readyForReview: facts.readyForReview === true,
      readyForExecution: facts.readyForExecution === true,
      missingRequiredStepIds: normalizeStepIds(facts.missingRequiredStepIds, warnings),
      missingReviewInputStepIds: normalizeStepIds(facts.missingReviewInputStepIds, warnings),
    },
    constraints: {
      factsAreAdvisory: true,
      executableActionsAllowed: false,
      providerMayOverrideSchemas: false,
      requiresReviewConfirmation: true,
      rawReferencesIncluded: false,
      mediaUploadsAllowed: false,
    },
    warnings,
  };

  return redactAssistantMetadata(context) as AssistantSiteBuilderIntakeProviderContext;
};
