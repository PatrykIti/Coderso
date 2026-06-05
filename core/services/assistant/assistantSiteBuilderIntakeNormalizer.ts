import { redactAssistantText } from "./assistantRedaction";
import {
  getSiteBuilderIntakeModeDefinition,
  getSiteBuilderIntakeOption,
  getSiteBuilderIntakeStepDefinition,
  listSiteBuilderIntakeStepDefinitionsForMode,
} from "./assistantSiteBuilderIntakeRegistry";
import { deriveAssistantSiteBuilderIntakeFacts } from "./assistantSiteBuilderIntakeFacts";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderContentEngineId,
  type AssistantSiteBuilderHeroPresetId,
  type AssistantSiteBuilderIntakeAnswer,
  type AssistantSiteBuilderIntakeMode,
  type AssistantSiteBuilderIntakeSession,
  type AssistantSiteBuilderIntakeStepDefinition,
  type AssistantSiteBuilderIntakeStepId,
  type AssistantSiteBuilderMediaPolicyId,
  type AssistantSiteBuilderMenuPresetId,
  type AssistantSiteBuilderPageRoleId,
  type AssistantSiteBuilderReviewStateId,
  type AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";

type JsonRecord = Record<string, unknown>;
type AnswerValueNormalizer = (input: unknown) => Record<string, unknown>;

const sessionKeys = new Set([
  "version",
  "mode",
  "currentStepId",
  "answers",
  "facts",
  "reviewState",
]);
const answerKeys = new Set(["stepId", "values", "updatedAt"]);
const profileKeys = new Set([
  "siteName",
  "entityName",
  "topic",
  "vertical",
  "audience",
  "locale",
  "region",
  "summary",
  "offerSummary",
]);
const goalsKeys = new Set(["goals", "primaryGoal", "notes"]);
const siteMapKeys = new Set(["pageRoles"]);
const menuKeys = new Set(["menuPreset", "primaryActionLabel", "primaryActionPageRole"]);
const sectionsKeys = new Set(["sectionRoles"]);
const heroKeys = new Set(["heroPreset", "headline", "subheadline", "primaryCallToAction"]);
const subpagesKeys = new Set(["pageRoles", "notes"]);
const mediaPolicyKeys = new Set(["mediaPolicy", "notes"]);
const contentEngineKeys = new Set(["contentEngines", "notes"]);
const designPresetKeys = new Set(["designBrief", "tone", "colorNotes", "layoutNotes"]);
const referenceIntakeKeys = new Set(["referenceNotes", "referenceLabels", "referenceIds"]);
const reviewKeys = new Set(["reviewState", "confirmed", "notes"]);

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const secretLikeSegmentPattern =
  /\b(password|token|secret|api[-_\s]?key|authorization|cookie|bearer|csrf|session)\b\s*[:=]\s*\S+/gi;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (
  code:
    | "intake_session_invalid"
    | "intake_answer_invalid"
    | "intake_answer_required"
    | "intake_answer_unknown_key"
    | "intake_answer_duplicate"
    | "intake_text_invalid",
  details: Readonly<Record<string, unknown>> = {}
): never => throwAssistantSiteBuilderIntakeError(code, details);

const readRecord = (
  value: unknown,
  code: "intake_session_invalid" | "intake_answer_invalid",
  details: Readonly<Record<string, unknown>> = {}
): JsonRecord => (isRecord(value) ? value : fail(code, details));

const rejectUnknownKeys = (
  input: JsonRecord,
  allowed: ReadonlySet<string>,
  details: Readonly<Record<string, unknown>>
) => {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      fail("intake_answer_unknown_key", { ...details, key });
    }
  }
};

const omitUndefined = (input: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));

const normalizeTextValue = (
  value: unknown,
  field: string,
  options: { required?: boolean; maxLength?: number } = {}
): string | undefined => {
  if (value === undefined || value === null) {
    if (options.required) fail("intake_answer_required", { field });
    return undefined;
  }

  if (typeof value !== "string") fail("intake_text_invalid", { field });
  const text = value as string;

  const normalized = text
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    if (options.required) fail("intake_answer_required", { field });
    return undefined;
  }

  const redacted = normalized.replace(secretLikeSegmentPattern, "$1: [REDACTED]");
  const fullRedacted = redactAssistantText(redacted, Math.max(2048, redacted.length + 16));
  const clamped = redactAssistantText(redacted, options.maxLength ?? 240);

  if (fullRedacted.includes("[REDACTED]") && !clamped.includes("[REDACTED]")) {
    return "[REDACTED]";
  }

  return clamped;
};

const normalizeBooleanValue = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail("intake_answer_invalid", { field });
  return value as boolean;
};

const normalizeTextArray = (
  value: unknown,
  field: string,
  options: { required?: boolean; maxItems?: number; maxLength?: number } = {}
): string[] => {
  if (value === undefined || value === null) {
    if (options.required) fail("intake_answer_required", { field });
    return [];
  }

  if (!Array.isArray(value)) fail("intake_answer_invalid", { field });
  const items = value as unknown[];

  const normalized = items
    .slice(0, options.maxItems ?? 12)
    .map((item, index) =>
      normalizeTextValue(item, `${field}.${index}`, {
        required: true,
        maxLength: options.maxLength ?? 120,
      })
    )
    .filter((item): item is string => Boolean(item));
  const unique = [...new Set(normalized)];

  if (options.required && unique.length === 0) fail("intake_answer_required", { field });
  return unique;
};

const normalizeStableIdArray = (
  value: unknown,
  field: string,
  options: { maxItems?: number } = {}
): string[] => {
  const values = normalizeTextArray(value, field, {
    maxItems: options.maxItems ?? 12,
    maxLength: 80,
  });

  for (const id of values) {
    if (!stableIdPattern.test(id)) fail("intake_answer_invalid", { field, id });
  }

  return values;
};

const normalizeOption = <TId extends string>(
  value: unknown,
  registryId: string,
  field: string,
  options: { required?: boolean } = {}
): TId | undefined => {
  const id = normalizeTextValue(value, field, { required: options.required, maxLength: 80 });
  if (!id) return undefined;

  return getSiteBuilderIntakeOption(registryId, id).id as TId;
};

const normalizeOptionArray = <TId extends string>(
  value: unknown,
  registryId: string,
  field: string,
  options: { required?: boolean; maxItems?: number } = {}
): TId[] => {
  if (value === undefined || value === null) {
    if (options.required) fail("intake_answer_required", { field });
    return [];
  }

  if (!Array.isArray(value)) fail("intake_answer_invalid", { field });
  const items = value as unknown[];

  const ids = items
    .slice(0, options.maxItems ?? 12)
    .map((item, index) =>
      normalizeOption<TId>(item, registryId, `${field}.${index}`, { required: true })
    );
  const unique = [...new Set(ids.filter((id): id is TId => Boolean(id)))];

  if (options.required && unique.length === 0) fail("intake_answer_required", { field });
  return unique;
};

const normalizeProfileValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "business-profile" });
  rejectUnknownKeys(record, profileKeys, { stepId: "business-profile" });

  const normalized = omitUndefined({
    siteName: normalizeTextValue(record.siteName, "siteName", { maxLength: 120 }),
    entityName: normalizeTextValue(record.entityName, "entityName", { maxLength: 120 }),
    topic: normalizeTextValue(record.topic, "topic", { maxLength: 160 }),
    vertical: normalizeTextValue(record.vertical, "vertical", { maxLength: 120 }),
    audience: normalizeTextValue(record.audience, "audience", { maxLength: 240 }),
    locale: normalizeTextValue(record.locale, "locale", { maxLength: 16 }),
    region: normalizeTextValue(record.region, "region", { maxLength: 80 }),
    summary: normalizeTextValue(record.summary, "summary", { maxLength: 500 }),
    offerSummary: normalizeTextValue(record.offerSummary, "offerSummary", { maxLength: 500 }),
  });

  if (!normalized.siteName && !normalized.entityName && !normalized.topic && !normalized.summary) {
    fail("intake_answer_required", { stepId: "business-profile", field: "siteName" });
  }

  return normalized;
};

const normalizeGoalsValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "site-goals" });
  rejectUnknownKeys(record, goalsKeys, { stepId: "site-goals" });

  return omitUndefined({
    goals: normalizeTextArray(record.goals, "goals", {
      required: true,
      maxItems: 8,
      maxLength: 120,
    }),
    primaryGoal: normalizeTextValue(record.primaryGoal, "primaryGoal", { maxLength: 160 }),
    notes: normalizeTextValue(record.notes, "notes", { maxLength: 360 }),
  });
};

const normalizeSiteMapValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "site-map" });
  rejectUnknownKeys(record, siteMapKeys, { stepId: "site-map" });

  return {
    pageRoles: normalizeOptionArray<AssistantSiteBuilderPageRoleId>(
      record.pageRoles,
      "pageRoles",
      "pageRoles",
      { required: true, maxItems: 14 }
    ),
  };
};

const normalizeMenuValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "menu" });
  rejectUnknownKeys(record, menuKeys, { stepId: "menu" });

  return omitUndefined({
    menuPreset: normalizeOption<AssistantSiteBuilderMenuPresetId>(
      record.menuPreset,
      "menuPresets",
      "menuPreset",
      { required: true }
    ),
    primaryActionLabel: normalizeTextValue(record.primaryActionLabel, "primaryActionLabel", {
      maxLength: 80,
    }),
    primaryActionPageRole: normalizeOption<AssistantSiteBuilderPageRoleId>(
      record.primaryActionPageRole,
      "pageRoles",
      "primaryActionPageRole"
    ),
  });
};

const normalizeSectionsValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "homepage-sections" });
  rejectUnknownKeys(record, sectionsKeys, { stepId: "homepage-sections" });

  return {
    sectionRoles: normalizeOptionArray<AssistantSiteBuilderSectionRoleId>(
      record.sectionRoles,
      "sectionRoles",
      "sectionRoles",
      { required: true, maxItems: 12 }
    ),
  };
};

const normalizeHeroValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "hero" });
  rejectUnknownKeys(record, heroKeys, { stepId: "hero" });

  return omitUndefined({
    heroPreset: normalizeOption<AssistantSiteBuilderHeroPresetId>(
      record.heroPreset,
      "heroPresets",
      "heroPreset",
      { required: true }
    ),
    headline: normalizeTextValue(record.headline, "headline", { maxLength: 160 }),
    subheadline: normalizeTextValue(record.subheadline, "subheadline", { maxLength: 280 }),
    primaryCallToAction: normalizeTextValue(record.primaryCallToAction, "primaryCallToAction", {
      maxLength: 80,
    }),
  });
};

const normalizeSubpagesValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "subpages" });
  rejectUnknownKeys(record, subpagesKeys, { stepId: "subpages" });

  return omitUndefined({
    pageRoles: normalizeOptionArray<AssistantSiteBuilderPageRoleId>(
      record.pageRoles,
      "pageRoles",
      "pageRoles",
      { maxItems: 14 }
    ),
    notes: normalizeTextValue(record.notes, "notes", { maxLength: 360 }),
  });
};

const normalizeMediaPolicyValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "media-policy" });
  rejectUnknownKeys(record, mediaPolicyKeys, { stepId: "media-policy" });

  return omitUndefined({
    mediaPolicy: normalizeOption<AssistantSiteBuilderMediaPolicyId>(
      record.mediaPolicy,
      "mediaPolicies",
      "mediaPolicy",
      { required: true }
    ),
    notes: normalizeTextValue(record.notes, "notes", { maxLength: 360 }),
  });
};

const normalizeContentEngineValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "content-engine" });
  rejectUnknownKeys(record, contentEngineKeys, { stepId: "content-engine" });

  return omitUndefined({
    contentEngines: normalizeOptionArray<AssistantSiteBuilderContentEngineId>(
      record.contentEngines,
      "contentEngines",
      "contentEngines",
      { maxItems: 10 }
    ),
    notes: normalizeTextValue(record.notes, "notes", { maxLength: 360 }),
  });
};

const normalizeDesignPresetValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "design-preset" });
  rejectUnknownKeys(record, designPresetKeys, { stepId: "design-preset" });

  return omitUndefined({
    designBrief: normalizeTextValue(record.designBrief, "designBrief", { maxLength: 700 }),
    tone: normalizeTextValue(record.tone, "tone", { maxLength: 160 }),
    colorNotes: normalizeTextValue(record.colorNotes, "colorNotes", { maxLength: 240 }),
    layoutNotes: normalizeTextValue(record.layoutNotes, "layoutNotes", { maxLength: 360 }),
  });
};

const normalizeReferenceIntakeValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "reference-intake" });
  rejectUnknownKeys(record, referenceIntakeKeys, { stepId: "reference-intake" });

  return omitUndefined({
    referenceNotes: normalizeTextValue(record.referenceNotes, "referenceNotes", {
      maxLength: 700,
    }),
    referenceLabels: normalizeTextArray(record.referenceLabels, "referenceLabels", {
      maxItems: 8,
      maxLength: 120,
    }),
    referenceIds: normalizeStableIdArray(record.referenceIds, "referenceIds", { maxItems: 8 }),
  });
};

const normalizeReviewValues: AnswerValueNormalizer = (input) => {
  const record = readRecord(input, "intake_answer_invalid", { stepId: "review" });
  rejectUnknownKeys(record, reviewKeys, { stepId: "review" });
  const confirmed = normalizeBooleanValue(record.confirmed, "confirmed") ?? false;

  return omitUndefined({
    reviewState:
      normalizeOption<AssistantSiteBuilderReviewStateId>(
        record.reviewState,
        "reviewStates",
        "reviewState"
      ) ?? (confirmed ? "confirmed" : "ready"),
    confirmed,
    notes: normalizeTextValue(record.notes, "notes", { maxLength: 360 }),
  });
};

const answerValueNormalizers: Readonly<
  Record<AssistantSiteBuilderIntakeStepId, AnswerValueNormalizer>
> = {
  "business-profile": normalizeProfileValues,
  "site-goals": normalizeGoalsValues,
  "site-map": normalizeSiteMapValues,
  menu: normalizeMenuValues,
  "homepage-sections": normalizeSectionsValues,
  hero: normalizeHeroValues,
  subpages: normalizeSubpagesValues,
  "media-policy": normalizeMediaPolicyValues,
  "content-engine": normalizeContentEngineValues,
  "design-preset": normalizeDesignPresetValues,
  "reference-intake": normalizeReferenceIntakeValues,
  review: normalizeReviewValues,
};

const readStepId = (value: unknown): AssistantSiteBuilderIntakeStepId => {
  const stepId = normalizeTextValue(value, "stepId", { required: true, maxLength: 80 });
  if (!stepId) return fail("intake_answer_required", { field: "stepId" });
  return getSiteBuilderIntakeStepDefinition(stepId).id;
};

const readMode = (value: unknown): AssistantSiteBuilderIntakeMode => {
  const mode = normalizeTextValue(value, "mode", { required: true, maxLength: 40 });
  if (!mode) return fail("intake_session_invalid", { field: "mode" });
  return getSiteBuilderIntakeModeDefinition(mode).id;
};

const assertStepAvailableForMode = (
  mode: AssistantSiteBuilderIntakeMode,
  stepId: AssistantSiteBuilderIntakeStepId
) => {
  const availableStepIds = new Set(
    listSiteBuilderIntakeStepDefinitionsForMode(mode).map((definition) => definition.id)
  );
  if (!availableStepIds.has(stepId)) {
    throwAssistantSiteBuilderIntakeError("intake_step_invalid", { mode, stepId });
  }
};

export const normalizeAssistantSiteBuilderIntakeAnswerValues = (
  stepId: AssistantSiteBuilderIntakeStepId,
  input: unknown
): Record<string, unknown> => answerValueNormalizers[stepId](input);

export const normalizeAssistantSiteBuilderIntakeAnswer = (
  input: unknown,
  expectedStep?: AssistantSiteBuilderIntakeStepDefinition | AssistantSiteBuilderIntakeStepId
): AssistantSiteBuilderIntakeAnswer => {
  const record = readRecord(input, "intake_answer_invalid");
  rejectUnknownKeys(record, answerKeys, { scope: "answer" });
  const stepId = readStepId(record.stepId);
  const expectedStepId = typeof expectedStep === "string" ? expectedStep : expectedStep?.id;

  if (expectedStepId && stepId !== expectedStepId) {
    throwAssistantSiteBuilderIntakeError("intake_step_invalid", {
      expectedStepId,
      stepId,
    });
  }

  return omitUndefined({
    stepId,
    values: normalizeAssistantSiteBuilderIntakeAnswerValues(stepId, record.values),
    updatedAt: normalizeTextValue(record.updatedAt, "updatedAt", { maxLength: 64 }),
  }) as AssistantSiteBuilderIntakeAnswer;
};

export const normalizeAssistantSiteBuilderIntakeSession = (
  input: unknown
): AssistantSiteBuilderIntakeSession => {
  const record = readRecord(input, "intake_session_invalid");
  rejectUnknownKeys(record, sessionKeys, { scope: "session" });

  if (record.version !== ASSISTANT_SITE_BUILDER_INTAKE_VERSION) {
    fail("intake_session_invalid", { field: "version" });
  }

  const mode = readMode(record.mode);
  const currentStepId = readStepId(record.currentStepId);
  assertStepAvailableForMode(mode, currentStepId);

  const answerInputs = record.answers;
  if (!Array.isArray(answerInputs)) {
    fail("intake_answer_invalid", { field: "answers" });
  }

  const answers = (answerInputs as unknown[]).map((answer) =>
    normalizeAssistantSiteBuilderIntakeAnswer(answer)
  );
  const seenStepIds = new Set<AssistantSiteBuilderIntakeStepId>();

  for (const answer of answers) {
    assertStepAvailableForMode(mode, answer.stepId);
    if (seenStepIds.has(answer.stepId)) {
      fail("intake_answer_duplicate", { stepId: answer.stepId });
    }
    seenStepIds.add(answer.stepId);
  }

  const facts = deriveAssistantSiteBuilderIntakeFacts({
    mode,
    answers,
  });

  return omitUndefined({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode,
    currentStepId,
    answers,
    facts,
    reviewState: facts.reviewState,
  }) as AssistantSiteBuilderIntakeSession;
};
