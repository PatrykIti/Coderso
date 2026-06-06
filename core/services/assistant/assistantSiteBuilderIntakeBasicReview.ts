import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import { redactAssistantText } from "./assistantRedaction";
import { getSiteBuilderIntakeOption } from "./assistantSiteBuilderIntakeRegistry";
import {
  resolveSiteBuilderIntakeContentEngines,
  type AssistantSiteBuilderContentEngineDecisionResult,
  type AssistantSiteBuilderContentEngineDecisionSource,
} from "./assistantSiteBuilderIntakeContentEngines";
import type {
  AssistantSiteBuilderBasicMenuItemDefault,
  AssistantSiteBuilderBasicPageRouteDefault,
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeStepId,
  AssistantSiteBuilderMediaPolicyId,
  AssistantSiteBuilderPageRoleId,
  AssistantSiteBuilderSectionRoleId,
} from "./assistantSiteBuilderIntakeTypes";
import { listWidgetPackMatrix } from "../../widgets/modulePackMatrix";

export type AssistantSiteBuilderBasicWidgetCandidate = {
  sectionRoleId: AssistantSiteBuilderSectionRoleId;
  alias: string;
  widgetType: string;
  module: string;
  label: string;
  pagePresetIds: string[];
  sectionPresetIds: string[];
};

export type AssistantSiteBuilderBasicContentEngineCandidate = {
  id: AssistantSiteBuilderContentEngineId;
  label: string;
  source: AssistantSiteBuilderContentEngineDecisionSource;
};

export type AssistantSiteBuilderBasicReviewGate = {
  code:
    | "widget_alias_unsupported"
    | "content_engine_required"
    | "content_engine_unsupported"
    | "media_library_selection_required";
  severity: "info" | "warning" | "error";
  message: string;
  sectionRoleId?: AssistantSiteBuilderSectionRoleId;
  pageRoleId?: AssistantSiteBuilderPageRoleId;
  contentEngineId?: string;
  mediaPolicy?: AssistantSiteBuilderMediaPolicyId;
};

export type AssistantSiteBuilderBasicReviewFacts = {
  schemaVersion: 1;
  pages: AssistantSiteBuilderBasicPageRouteDefault[];
  menuItems: AssistantSiteBuilderBasicMenuItemDefault[];
  widgetCandidates: AssistantSiteBuilderBasicWidgetCandidate[];
  contentEngineCandidates: AssistantSiteBuilderBasicContentEngineCandidate[];
  contactPath: string | null;
  mediaPolicy: AssistantSiteBuilderMediaPolicyId | null;
  gates: AssistantSiteBuilderBasicReviewGate[];
  summary: string;
};

const sectionRoleWidgetAliases = Object.freeze({
  "value-proposition": "hero",
  "services-overview": "content-list",
  "featured-items": "content-list",
  proof: "testimonials",
  process: null,
  benefits: null,
  comparison: null,
  pricing: null,
  faq: "faq",
  "lead-capture": "form-embed",
  contact: "contact",
  "content-feed": "posts-feed",
  "call-to-action": "cta",
} satisfies Record<AssistantSiteBuilderSectionRoleId, string | null>);

const basicReviewInputStepIds = Object.freeze([
  "business-profile",
  "site-goals",
  "site-map",
  "menu",
  "hero",
  "homepage-sections",
  "media-policy",
] as const satisfies readonly AssistantSiteBuilderIntakeStepId[]);

const widgetAliasDefinitions = (() => {
  const definitions = new Map<
    string,
    {
      alias: string;
      widgetType: string;
      module: string;
      label: string;
      pagePresetIds: string[];
      sectionPresetIds: string[];
    }
  >();

  for (const pack of listWidgetPackMatrix()) {
    for (const section of pack.assistantPageSections ?? []) {
      definitions.set(section.alias, {
        alias: section.alias,
        widgetType: section.widgetType,
        module: pack.module,
        label: pack.label,
        pagePresetIds: [...(section.pagePresets ?? [])],
        sectionPresetIds: [...(section.sectionPresets ?? [])],
      });
    }
  }

  return definitions;
})();

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

const validatePageRoleId = (roleId: string): AssistantSiteBuilderPageRoleId =>
  getSiteBuilderIntakeOption("pageRoles", roleId).id as AssistantSiteBuilderPageRoleId;

const validateSectionRoleId = (roleId: string): AssistantSiteBuilderSectionRoleId =>
  getSiteBuilderIntakeOption("sectionRoles", roleId).id as AssistantSiteBuilderSectionRoleId;

const validateMediaPolicyId = (mediaPolicy: string): AssistantSiteBuilderMediaPolicyId =>
  getSiteBuilderIntakeOption("mediaPolicies", mediaPolicy).id as AssistantSiteBuilderMediaPolicyId;

const collectMissingBasicReviewInputs = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderIntakeStepId[] => {
  const answeredStepIds = new Set(facts.answeredStepIds ?? []);
  return unique([
    ...basicReviewInputStepIds.filter((stepId) => !answeredStepIds.has(stepId)),
    ...(facts.missingReviewInputStepIds ?? []),
    ...(facts.missingRequiredStepIds ?? []).filter((stepId) => stepId !== "review"),
  ]);
};

const collectMissingBasicReviewFacts = (facts: AssistantSiteBuilderIntakeFacts): string[] => {
  const missing: string[] = [];
  if (!facts.basicDefaults) missing.push("basicDefaults");
  if ((facts.basicDefaults?.pageRoutes.length ?? 0) === 0) missing.push("basicDefaults.pageRoutes");
  if ((facts.basicDefaults?.menuItems.length ?? 0) === 0) missing.push("basicDefaults.menuItems");
  if ((facts.basicDefaults?.homepageSectionRoles.length ?? 0) === 0) {
    missing.push("basicDefaults.homepageSectionRoles");
  }
  if (!facts.mediaPolicy) missing.push("mediaPolicy");
  if (!facts.heroPreset) missing.push("heroPreset");
  return unique(missing);
};

const assertBasicFactsReadyForReview = (facts: AssistantSiteBuilderIntakeFacts) => {
  const missingRequiredStepIds = collectMissingBasicReviewInputs(facts);
  const missingFacts = collectMissingBasicReviewFacts(facts);

  if (
    facts.readyForReview !== true ||
    missingRequiredStepIds.length > 0 ||
    missingFacts.length > 0
  ) {
    throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "basic_review_not_ready",
      missingRequiredStepIds,
      missingFacts,
    });
  }
};

const getPageRoutes = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderBasicPageRouteDefault[] =>
  [...(facts.basicDefaults?.pageRoutes ?? [])].map((route) => ({
    roleId: validatePageRoleId(route.roleId),
    label: redactAssistantText(route.label, 80),
    menuLabel: redactAssistantText(route.menuLabel, 80),
    path: route.path,
  }));

const getMenuItems = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderBasicMenuItemDefault[] =>
  [...(facts.basicDefaults?.menuItems ?? [])].map((item) => ({
    key: item.key,
    roleId: item.roleId ? validatePageRoleId(item.roleId) : null,
    label: redactAssistantText(item.label, 80),
    href: item.href,
    parentKey: item.parentKey,
    orderIndex: item.orderIndex,
  }));

const buildWidgetCandidate = (
  sectionRoleId: AssistantSiteBuilderSectionRoleId,
  alias: string
): AssistantSiteBuilderBasicWidgetCandidate | null => {
  const definition = widgetAliasDefinitions.get(alias);
  if (!definition) return null;

  return {
    sectionRoleId,
    alias: definition.alias,
    widgetType: definition.widgetType,
    module: definition.module,
    label: definition.label,
    pagePresetIds: [...definition.pagePresetIds],
    sectionPresetIds: [...definition.sectionPresetIds],
  };
};

const resolveSectionRoles = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderSectionRoleId[] =>
  unique([...(facts.sectionRoles ?? facts.basicDefaults?.homepageSectionRoles ?? [])]).map(
    validateSectionRoleId
  );

const resolvePageRoles = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderPageRoleId[] =>
  unique([...(facts.pageRoles ?? facts.basicDefaults?.pageRoles ?? [])]).map(validatePageRoleId);

const collectWidgetCandidatesAndGates = (
  sectionRoleIds: readonly AssistantSiteBuilderSectionRoleId[]
) => {
  const widgetCandidates: AssistantSiteBuilderBasicWidgetCandidate[] = [];
  const gates: AssistantSiteBuilderBasicReviewGate[] = [];

  for (const sectionRoleId of sectionRoleIds) {
    const alias = sectionRoleWidgetAliases[sectionRoleId];
    if (!alias) {
      gates.push({
        code: "widget_alias_unsupported",
        severity: "warning",
        sectionRoleId,
        message: `The "${sectionRoleId}" section needs a supported widget mapping before execution.`,
      });
      continue;
    }

    const candidate = buildWidgetCandidate(sectionRoleId, alias);
    if (!candidate) {
      gates.push({
        code: "widget_alias_unsupported",
        severity: "warning",
        sectionRoleId,
        message: `The "${sectionRoleId}" section maps to unsupported widget alias "${alias}".`,
      });
      continue;
    }

    widgetCandidates.push(candidate);
  }

  return { widgetCandidates, gates };
};

const mapContentEngineCandidates = (
  result: AssistantSiteBuilderContentEngineDecisionResult
): AssistantSiteBuilderBasicContentEngineCandidate[] =>
  result.decisions.map((decision) => ({
    id: decision.id,
    label: decision.label,
    source: decision.sources[0]?.source ?? "explicit",
  }));

const collectContentGates = (
  result: AssistantSiteBuilderContentEngineDecisionResult
): AssistantSiteBuilderBasicReviewGate[] => {
  const gates: AssistantSiteBuilderBasicReviewGate[] = [];
  if (result.decisions.length > 0) {
    gates.push({
      code: "content_engine_required",
      severity: "info",
      message:
        "Structured content candidates are review-only until the content-engine adapter creates schemas and pages.",
    });
  }

  for (const gate of result.gates) {
    gates.push({
      code: gate.code,
      severity: gate.severity,
      contentEngineId: gate.requestedEngineId,
      message: gate.message,
    });
  }

  return gates;
};

const collectMediaGates = (
  mediaPolicy: AssistantSiteBuilderMediaPolicyId | null
): AssistantSiteBuilderBasicReviewGate[] =>
  mediaPolicy === "library"
    ? [
        {
          code: "media_library_selection_required",
          severity: "info",
          mediaPolicy,
          message: "Media-library mode needs confirmed existing media assets before execution.",
        },
      ]
    : [];

const resolveContactPath = (
  pages: readonly AssistantSiteBuilderBasicPageRouteDefault[]
): string | null => pages.find((page) => page.roleId === "contact")?.path ?? null;

const buildSummary = (input: {
  pages: readonly AssistantSiteBuilderBasicPageRouteDefault[];
  widgetCandidates: readonly AssistantSiteBuilderBasicWidgetCandidate[];
  contentEngineCandidates: readonly AssistantSiteBuilderBasicContentEngineCandidate[];
  contactPath: string | null;
  mediaPolicy: AssistantSiteBuilderMediaPolicyId | null;
  gates: readonly AssistantSiteBuilderBasicReviewGate[];
}) => {
  const pageLabels = input.pages.map((page) => page.label).join(", ") || "no pages yet";
  const widgets =
    input.widgetCandidates.map((candidate) => candidate.alias).join(", ") || "no widget candidates";
  const readableWidgets =
    input.widgetCandidates
      .map((candidate) => `${candidate.label} ${candidate.widgetType}`)
      .join(", ") || "no readable widget descriptions";
  const engines =
    input.contentEngineCandidates.map((candidate) => candidate.label).join(", ") ||
    "no content engines";
  const contact = input.contactPath ?? "no contact page";
  const media = input.mediaPolicy ?? "no media policy";
  const gateCount = input.gates.length;

  return redactAssistantText(
    [
      `Pages: ${pageLabels}.`,
      `Homepage widget candidates: ${widgets}.`,
      `Readable homepage blocks: ${readableWidgets}.`,
      `Content candidates: ${engines}.`,
      `Contact path: ${contact}.`,
      `Media policy: ${media}.`,
      `Review gates: ${gateCount}.`,
    ].join(" "),
    900
  );
};

export const buildBasicSiteBuilderReviewFacts = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderBasicReviewFacts => {
  assertBasicFactsReadyForReview(facts);

  const pages = getPageRoutes(facts);
  const menuItems = getMenuItems(facts);
  const pageRoleIds = resolvePageRoles(facts);
  const sectionRoleIds = resolveSectionRoles(facts);
  const widgets = collectWidgetCandidatesAndGates(sectionRoleIds);
  const contentEngineDecisionResult = resolveSiteBuilderIntakeContentEngines({
    ...facts,
    pageRoles: pageRoleIds,
    sectionRoles: sectionRoleIds,
  });
  const contentEngineCandidates = mapContentEngineCandidates(contentEngineDecisionResult);
  const mediaPolicy = facts.mediaPolicy ? validateMediaPolicyId(facts.mediaPolicy) : null;
  const contactPath = resolveContactPath(pages);
  const gates = [
    ...widgets.gates,
    ...collectContentGates(contentEngineDecisionResult),
    ...collectMediaGates(mediaPolicy),
  ];

  return {
    schemaVersion: 1,
    pages,
    menuItems,
    widgetCandidates: widgets.widgetCandidates,
    contentEngineCandidates,
    contactPath,
    mediaPolicy,
    gates,
    summary: buildSummary({
      pages,
      widgetCandidates: widgets.widgetCandidates,
      contentEngineCandidates,
      contactPath,
      mediaPolicy,
      gates,
    }),
  };
};
