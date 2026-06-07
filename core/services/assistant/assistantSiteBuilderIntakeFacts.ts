import { listSiteBuilderIntakeStepDefinitionsForMode } from "./assistantSiteBuilderIntakeRegistry";
import { deriveBasicSiteMapDefaults } from "./assistantSiteBuilderIntakeBasicDefaults";
import { buildSiteBuilderIntakeAdvancedLayoutFacts } from "./assistantSiteBuilderIntakeAdvancedOptions";
import { buildSiteBuilderIntakeDesignPresetFacts } from "./assistantSiteBuilderIntakeDesignPresets";
import type {
  AssistantSiteBuilderAdvancedHeroVariantId,
  AssistantSiteBuilderAdvancedMenuBehaviorId,
  AssistantSiteBuilderAdvancedSectionVariantId,
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderDesignPresetId,
  AssistantSiteBuilderHeroPresetId,
  AssistantSiteBuilderIntakeAnswer,
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeMode,
  AssistantSiteBuilderIntakeStepId,
  AssistantSiteBuilderMediaPolicyId,
  AssistantSiteBuilderMenuPresetId,
  AssistantSiteBuilderPageRoleId,
  AssistantSiteBuilderReviewStateId,
  AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";
import { assistantSiteBuilderIntakeStepIds } from "./assistantSiteBuilderIntakeTypes";

type AnswerValuesByStep = Partial<
  Record<AssistantSiteBuilderIntakeStepId, Record<string, unknown>>
>;

type FactInput = {
  mode: AssistantSiteBuilderIntakeMode;
  answers: readonly AssistantSiteBuilderIntakeAnswer[];
};

type StableJsonValue =
  | null
  | boolean
  | number
  | string
  | StableJsonValue[]
  | { [key: string]: StableJsonValue };

type ReviewHashInput = {
  mode: AssistantSiteBuilderIntakeMode;
  answers: readonly AssistantSiteBuilderIntakeAnswer[];
};

const reviewHashStepOrder = new Map(
  assistantSiteBuilderIntakeStepIds.map((stepId, index) => [stepId, index])
);

const toStableJsonValue = (value: unknown): StableJsonValue => {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) return value.map(toStableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, toStableJsonValue(nested)])
    );
  }
  return null;
};

const hashString = (value: string, seed: number) => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const buildAssistantSiteBuilderIntakeReviewHash = ({
  mode,
  answers,
}: ReviewHashInput): string => {
  const canonicalAnswers = answers
    .filter((answer) => answer.stepId !== "review")
    .map((answer) => ({
      stepId: answer.stepId,
      values: toStableJsonValue(answer.values),
    }))
    .sort(
      (left, right) =>
        (reviewHashStepOrder.get(left.stepId) ?? 999) -
        (reviewHashStepOrder.get(right.stepId) ?? 999)
    );
  const payload = JSON.stringify({
    schemaVersion: 1,
    mode,
    answers: canonicalAnswers,
  });

  return `${hashString(payload, 0x811c9dc5)}${hashString(payload, 0x9e3779b9)}`;
};

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asTextArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asTypedArray = <T extends string>(value: unknown): T[] =>
  Array.isArray(value) ? value.filter((item): item is T => typeof item === "string") : [];

const asPageRoleLabels = (
  value: unknown
): Partial<Record<AssistantSiteBuilderPageRoleId, string>> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const labels: Partial<Record<AssistantSiteBuilderPageRoleId, string>> = {};
  for (const [roleId, label] of Object.entries(value as Record<string, unknown>)) {
    if (typeof label === "string" && label.trim()) {
      labels[roleId as AssistantSiteBuilderPageRoleId] = label;
    }
  }
  return labels;
};

const indexAnswersByStep = (answers: readonly AssistantSiteBuilderIntakeAnswer[]) => {
  const indexed: AnswerValuesByStep = {};

  for (const answer of answers) {
    indexed[answer.stepId] = answer.values;
  }

  return indexed;
};

const getMissingRequiredStepIds = (
  mode: AssistantSiteBuilderIntakeMode,
  answers: AnswerValuesByStep
) =>
  listSiteBuilderIntakeStepDefinitionsForMode(mode)
    .filter((definition) => definition.required && !answers[definition.id])
    .map((definition) => definition.id);

const hasRedactedValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.includes("[REDACTED]") || value.includes("[FILTERED_INSTRUCTION]");
  }
  if (Array.isArray(value)) return value.some((item) => hasRedactedValue(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasRedactedValue(item));
  }
  return false;
};

const getReviewState = (
  valuesByStep: AnswerValuesByStep,
  missingReviewInputStepIds: readonly AssistantSiteBuilderIntakeStepId[]
): AssistantSiteBuilderReviewStateId => {
  const review = valuesByStep.review;
  const reviewState = review?.reviewState;
  if (typeof reviewState === "string") return reviewState as AssistantSiteBuilderReviewStateId;
  return missingReviewInputStepIds.length > 0 ? "needs-input" : "ready";
};

const omitEmpty = (facts: AssistantSiteBuilderIntakeFacts): AssistantSiteBuilderIntakeFacts => {
  const entries = Object.entries(facts).filter(([, value]) => {
    if (value === undefined) return false;
    if (value === null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  return Object.fromEntries(entries) as AssistantSiteBuilderIntakeFacts;
};

export const deriveAssistantSiteBuilderIntakeFacts = ({
  mode,
  answers,
}: FactInput): AssistantSiteBuilderIntakeFacts => {
  const valuesByStep = indexAnswersByStep(answers);
  const profile = valuesByStep["business-profile"] ?? {};
  const goals = valuesByStep["site-goals"] ?? {};
  const siteMap = valuesByStep["site-map"] ?? {};
  const menu = valuesByStep.menu ?? {};
  const sections = valuesByStep["homepage-sections"] ?? {};
  const hero = valuesByStep.hero ?? {};
  const subpages = valuesByStep.subpages ?? {};
  const media = valuesByStep["media-policy"] ?? {};
  const contentEngine = valuesByStep["content-engine"] ?? {};
  const design = valuesByStep["design-preset"] ?? {};
  const reference = valuesByStep["reference-intake"] ?? {};
  const review = valuesByStep.review ?? {};

  const answeredStepIds = answers.map((answer) => answer.stepId);
  const missingRequiredStepIds = getMissingRequiredStepIds(mode, valuesByStep);
  const missingReviewInputStepIds = missingRequiredStepIds.filter((stepId) => stepId !== "review");
  const resolvedReviewState = getReviewState(valuesByStep, missingReviewInputStepIds);
  const confirmed = review.confirmed === true;
  const reviewHash = buildAssistantSiteBuilderIntakeReviewHash({ mode, answers });
  const confirmedReviewHash = asText(review.confirmedReviewHash);
  const reviewHashMatches = confirmed && confirmedReviewHash === reviewHash;

  const pageRoles = unique([
    ...asTypedArray<AssistantSiteBuilderPageRoleId>(siteMap.pageRoles),
    ...asTypedArray<AssistantSiteBuilderPageRoleId>(subpages.pageRoles),
  ]);
  const sectionRoles = unique(
    asTypedArray<AssistantSiteBuilderSectionRoleId>(sections.sectionRoles)
  );
  const pageRoleLabels = {
    ...asPageRoleLabels(siteMap.customLabels),
    ...asPageRoleLabels(subpages.customLabels),
  };
  const basicDefaults =
    mode === "basic"
      ? deriveBasicSiteMapDefaults({
          pageRoles,
          goals: asTextArray(goals.goals),
          primaryGoal: asText(goals.primaryGoal),
          menuPreset: asText(menu.menuPreset) as AssistantSiteBuilderMenuPresetId | null,
          sectionRoles,
          customLabels: pageRoleLabels,
        })
      : undefined;
  const designPresetId = asText(design.designPresetId) as AssistantSiteBuilderDesignPresetId | null;
  const designPreset = designPresetId
    ? buildSiteBuilderIntakeDesignPresetFacts(designPresetId)
    : undefined;
  const advancedLayout = buildSiteBuilderIntakeAdvancedLayoutFacts({
    menuBehaviorIds: asTypedArray<AssistantSiteBuilderAdvancedMenuBehaviorId>(
      menu.advancedMenuBehaviorIds
    ),
    ctaTargetPageRole: asText(
      menu.advancedCtaTargetPageRole
    ) as AssistantSiteBuilderPageRoleId | null,
    heroVariantId: asText(
      hero.advancedHeroVariantId
    ) as AssistantSiteBuilderAdvancedHeroVariantId | null,
    sectionVariantIds: asTypedArray<AssistantSiteBuilderAdvancedSectionVariantId>(
      sections.advancedSectionVariantIds
    ),
    selectedSectionRoleIds: sectionRoles,
    designSupportedSectionRoleIds: designPreset?.supportedSectionRoleIds,
  });

  return omitEmpty({
    siteName: asText(profile.siteName),
    entityName: asText(profile.entityName),
    topic: asText(profile.topic),
    vertical: asText(profile.vertical),
    audience: asText(profile.audience),
    locale: asText(profile.locale),
    region: asText(profile.region),
    summary: asText(profile.summary),
    offerSummary: asText(profile.offerSummary),
    goals: asTextArray(goals.goals),
    primaryGoal: asText(goals.primaryGoal),
    pageRoles,
    pageRoleLabels: Object.keys(pageRoleLabels).length > 0 ? pageRoleLabels : undefined,
    sectionRoles,
    menuPreset: asText(menu.menuPreset) as AssistantSiteBuilderMenuPresetId | null,
    heroPreset: asText(hero.heroPreset) as AssistantSiteBuilderHeroPresetId | null,
    heroHeadline: asText(hero.headline),
    heroSubheadline: asText(hero.subheadline),
    mediaPolicy: asText(media.mediaPolicy) as AssistantSiteBuilderMediaPolicyId | null,
    mediaNotes: asText(media.notes),
    contentEngines: unique(
      asTypedArray<AssistantSiteBuilderContentEngineId>(contentEngine.contentEngines)
    ),
    designPresetId,
    designPreset,
    designBrief: asText(design.designBrief),
    advancedLayout,
    referenceNotes: asText(reference.referenceNotes),
    referenceTextBrief: asText(reference.textBrief),
    reviewState: resolvedReviewState,
    reviewNotes: asText(review.notes),
    reviewHash,
    confirmedReviewHash,
    reviewHashStale: confirmed && !reviewHashMatches,
    answeredStepIds,
    missingRequiredStepIds,
    missingReviewInputStepIds,
    readyForReview: missingReviewInputStepIds.length === 0 && resolvedReviewState !== "blocked",
    readyForExecution:
      missingRequiredStepIds.length === 0 &&
      confirmed &&
      reviewHashMatches &&
      resolvedReviewState === "confirmed",
    redactionApplied: answers.some((answer) => hasRedactedValue(answer.values)),
    basicDefaults,
  });
};
