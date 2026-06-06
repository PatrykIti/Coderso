import type { AssistantSiteKitPlanInput } from "./actionPlanTypes";
import { throwAssistantSiteBuilderIntakeError } from "./assistantSiteBuilderIntakeErrors";
import {
  resolveSiteBuilderIntakeContentEngines,
  type AssistantSiteBuilderContentEngineDecisionResult,
} from "./assistantSiteBuilderIntakeContentEngines";
import {
  resolveSiteBuilderIntakeCustomScreens,
  type AssistantSiteBuilderCustomScreenDecisionResult,
} from "./assistantSiteBuilderIntakeCustomScreens";
import { normalizeAssistantSiteBuilderIntakeSession } from "./assistantSiteBuilderIntakeNormalizer";
import { buildSiteBuilderIntakeReviewSummary } from "./assistantSiteBuilderIntakeReviewSummary";
import type {
  AssistantSiteBuilderContentEngineId,
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeSession,
  AssistantSiteBuilderIntakeStepId,
} from "./assistantSiteBuilderIntakeTypes";
import {
  siteBuilderGoals,
  siteBuilderPlanStepIds,
  type SiteBuilderBusinessType,
  type SiteBuilderGoal,
  type SiteBuilderPlanStepId,
  type SolutionKitId,
} from "../kits/solutionKitTypes";

export type AssistantSiteBuilderIntakeCompileGate = {
  code:
    | "intake_not_ready"
    | "intake_missing_shell_fact"
    | "content_engine_unsupported"
    | "custom_screen_unsupported"
    | "custom_screen_route_invalid"
    | "custom_screen_permission_invalid";
  message: string;
  stepId?: AssistantSiteBuilderIntakeStepId;
  field?: string;
  contentEngineId?: string;
  customScreenEngineId?: AssistantSiteBuilderContentEngineId;
  source?: string;
};

export type AssistantSiteBuilderIntakeCompileResult = {
  siteKit: AssistantSiteKitPlanInput;
  reviewFacts: {
    pageRoles: AssistantSiteBuilderIntakeFacts["pageRoles"];
    sectionRoles: AssistantSiteBuilderIntakeFacts["sectionRoles"];
    menuPreset: AssistantSiteBuilderIntakeFacts["menuPreset"];
    heroPreset: AssistantSiteBuilderIntakeFacts["heroPreset"];
    mediaPolicy: AssistantSiteBuilderIntakeFacts["mediaPolicy"];
    contentEngines: AssistantSiteBuilderIntakeFacts["contentEngines"];
    contentEngineDecisions: AssistantSiteBuilderContentEngineDecisionResult;
    customScreenDecisions: AssistantSiteBuilderCustomScreenDecisionResult;
    designPresetId: AssistantSiteBuilderIntakeFacts["designPresetId"];
    advancedLayout: AssistantSiteBuilderIntakeFacts["advancedLayout"];
    referenceDesignBrief: AssistantSiteBuilderIntakeFacts["referenceDesignBrief"];
    readyForReview: boolean;
    readyForExecution: boolean;
    redactionApplied: boolean;
  };
  gates: readonly AssistantSiteBuilderIntakeCompileGate[];
};

export type AssistantSiteBuilderIntakeActionPlanRequest = {
  prompt: string;
  context: {
    siteKit: AssistantSiteKitPlanInput;
  };
};

const siteBuilderGoalOrder = [...siteBuilderGoals];

const lowerText = (values: readonly unknown[]) =>
  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

const hasAny = (haystack: string, needles: readonly string[]) =>
  needles.some((needle) => haystack.includes(needle));

const tokenizeText = (text: string) => text.match(/[\p{L}\p{N}]+/gu) ?? [];

const hasToken = (tokens: readonly string[], values: readonly string[]) =>
  tokens.some((token) => values.includes(token));

const hasTokenPrefix = (tokens: readonly string[], prefixes: readonly string[]) =>
  tokens.some((token) => prefixes.some((prefix) => token.startsWith(prefix)));

const hasNearbyTokenPrefix = (
  tokens: readonly string[],
  index: number,
  prefixes: readonly string[],
  windowSize = 3
) => {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(tokens.length - 1, index + windowSize);
  for (let cursor = start; cursor <= end; cursor += 1) {
    if (cursor === index) continue;
    if (prefixes.some((prefix) => tokens[cursor]?.startsWith(prefix))) return true;
  }
  return false;
};

const hasAutomotiveContext = (text: string) => {
  const tokens = tokenizeText(text);
  return (
    hasToken(tokens, ["auto", "car", "cars", "vehicle", "vehicles"]) ||
    hasTokenPrefix(tokens, ["mechanic", "samochod", "samochód", "pojazd", "mechanik", "motoryzac"])
  );
};

const hasPolishDirectoryCatalogContext = (tokens: readonly string[]) =>
  tokens.some(
    (token, index) =>
      token.startsWith("katalog") &&
      hasNearbyTokenPrefix(tokens, index, [
        "biznes",
        "dostawc",
        "firm",
        "kawiar",
        "lekarz",
        "lokal",
        "miejsc",
        "provider",
        "restaur",
        "specjalist",
        "usługodawc",
        "uslugodawc",
        "wykonawc",
      ])
  );

const hasDirectoryContext = (text: string) => {
  const tokens = tokenizeText(text);
  return (
    hasToken(tokens, [
      "aggregator",
      "aggregatorze",
      "directory",
      "directories",
      "listing",
      "listings",
      "marketplace",
      "searchable",
      "wyszukiwarka",
    ]) ||
    hasTokenPrefix(tokens, ["agregator", "marketplace", "porown", "porówn", "wyszuk"]) ||
    hasPolishDirectoryCatalogContext(tokens)
  );
};

const hasRole = (
  facts: AssistantSiteBuilderIntakeFacts,
  roles: readonly (
    | NonNullable<AssistantSiteBuilderIntakeFacts["pageRoles"]>[number]
    | AssistantSiteBuilderContentEngineId
  )[]
) => {
  const values = new Set<string>([...(facts.pageRoles ?? []), ...(facts.contentEngines ?? [])]);
  return roles.some((role) => values.has(role));
};

const hasSection = (
  facts: AssistantSiteBuilderIntakeFacts,
  sections: readonly NonNullable<AssistantSiteBuilderIntakeFacts["sectionRoles"]>[number][]
) => {
  const values = new Set<string>(facts.sectionRoles ?? []);
  return sections.some((section) => values.has(section));
};

const addGoal = (goals: Set<SiteBuilderGoal>, goal: SiteBuilderGoal) => {
  goals.add(goal);
};

export const resolveSiteKitBusinessTypeFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts
): SiteBuilderBusinessType => {
  const text = lowerText([
    facts.topic,
    facts.vertical,
    facts.summary,
    facts.offerSummary,
    facts.primaryGoal,
    ...(facts.goals ?? []),
  ]);

  if (hasAutomotiveContext(text)) {
    return "automotive_workshop";
  }
  if (hasAny(text, ["clinic", "doctor", "medical", "health", "lekarz", "medycz"])) {
    return "medical_clinic";
  }
  if (hasAny(text, ["salon", "beauty", "spa", "wellness", "urod", "fryz"])) {
    return "beauty_salon";
  }
  if (hasRole(facts, ["products"])) return "small_ecommerce";
  if (hasDirectoryContext(text)) return "services_directory";

  return "custom";
};

export const resolveSiteKitGoalsFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts
): SiteBuilderGoal[] => {
  const goals = new Set<SiteBuilderGoal>(["lead_generation"]);
  const text = lowerText([
    facts.primaryGoal,
    facts.summary,
    facts.offerSummary,
    ...(facts.goals ?? []),
  ]);

  if (hasAny(text, ["book", "booking", "appointment", "reservation", "rezerw", "umow"])) {
    addGoal(goals, "online_booking");
  }
  if (
    hasRole(facts, ["products"]) ||
    hasAny(text, ["sell", "sales", "shop", "store", "checkout", "sprzed"])
  ) {
    addGoal(goals, "sell_products");
    addGoal(goals, "catalog_showcase");
  }
  if (
    hasRole(facts, [
      "services",
      "products",
      "portfolio",
      "case-studies",
      "blog",
      "team",
      "locations",
    ]) ||
    hasSection(facts, ["featured-items", "content-feed", "services-overview"])
  ) {
    addGoal(goals, "catalog_showcase");
  }
  if (hasRole(facts, ["testimonials"]) || hasSection(facts, ["proof"])) {
    addGoal(goals, "reviews_social_proof");
  }
  if (
    hasRole(facts, ["contact"]) ||
    hasSection(facts, ["lead-capture", "contact"]) ||
    hasAny(text, ["lead", "inquiry", "quote", "zapyt", "kontakt"])
  ) {
    addGoal(goals, "collect_qualified_leads");
  }

  return siteBuilderGoalOrder.filter((goal) => goals.has(goal));
};

export const resolvePreferredSiteKitIdFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts,
  businessType: SiteBuilderBusinessType
): SolutionKitId | null => {
  if (businessType === "automotive_workshop") return "automotive-workshop";
  if (businessType === "medical_clinic") return "medical-clinic";
  if (businessType === "beauty_salon") return "beauty-salon";
  if (businessType === "small_ecommerce") return "small-ecommerce";
  if (businessType === "services_directory") return "services-directory";
  if (hasRole(facts, ["products"])) return "small-ecommerce";
  const text = lowerText([
    facts.topic,
    facts.vertical,
    facts.summary,
    facts.offerSummary,
    facts.primaryGoal,
    ...(facts.goals ?? []),
  ]);
  if (hasDirectoryContext(text)) {
    return "services-directory";
  }
  return "local-service-business";
};

export const resolveEnabledSiteKitPlanStepIdsFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts,
  supportedSteps: readonly SiteBuilderPlanStepId[] = siteBuilderPlanStepIds
): SiteBuilderPlanStepId[] => {
  const supported = new Set<SiteBuilderPlanStepId>(supportedSteps);
  const requested = facts.siteKitPlanStepIds?.filter((stepId) => supported.has(stepId));

  if (requested && requested.length > 0) {
    return siteBuilderPlanStepIds.filter((stepId) => requested.includes(stepId));
  }

  const enabled = new Set<SiteBuilderPlanStepId>(["settings", "pages", "navigation", "qa"]);
  if (
    hasRole(facts, [
      "services",
      "products",
      "portfolio",
      "case-studies",
      "blog",
      "team",
      "locations",
      "faq",
      "testimonials",
    ]) ||
    hasSection(facts, ["featured-items", "content-feed", "services-overview", "proof", "faq"])
  ) {
    enabled.add("content-model");
  }
  if (
    hasRole(facts, ["contact"]) ||
    hasSection(facts, ["lead-capture", "contact"]) ||
    resolveSiteKitGoalsFromIntakeFacts(facts).includes("collect_qualified_leads")
  ) {
    enabled.add("forms");
  }

  return siteBuilderPlanStepIds.filter((stepId) => supported.has(stepId) && enabled.has(stepId));
};

const collectReadinessGates = (
  facts: AssistantSiteBuilderIntakeFacts
): AssistantSiteBuilderIntakeCompileGate[] => {
  const gates: AssistantSiteBuilderIntakeCompileGate[] = [];
  if (facts.readyForExecution !== true) {
    gates.push({
      code: "intake_not_ready",
      message: "The site-builder intake must be reviewed and explicitly confirmed before planning.",
      stepId: "review",
    });
  }
  if (!facts.siteName && !facts.entityName && !facts.topic) {
    gates.push({
      code: "intake_missing_shell_fact",
      message: "A site name, entity name, or topic is required before site-kit planning.",
      stepId: "business-profile",
      field: "siteName",
    });
  }
  if (!facts.locale) {
    gates.push({
      code: "intake_missing_shell_fact",
      message: "Locale is required before site-kit planning.",
      stepId: "business-profile",
      field: "locale",
    });
  }
  return gates;
};

const assertFactsReadyForSiteKit = (facts: AssistantSiteBuilderIntakeFacts) => {
  const gates = collectReadinessGates(facts);
  if (gates.length > 0) {
    throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "site_kit_handoff_blocked",
      gates,
      missingRequiredStepIds: facts.missingRequiredStepIds ?? [],
      missingReviewInputStepIds: facts.missingReviewInputStepIds ?? [],
      reviewState: facts.reviewState ?? null,
    });
  }
};

export const buildSiteKitPlanInputFromIntakeFacts = (
  facts: AssistantSiteBuilderIntakeFacts,
  options: { supportedSteps?: readonly SiteBuilderPlanStepId[] } = {}
): AssistantSiteKitPlanInput => {
  assertFactsReadyForSiteKit(facts);
  const businessType = resolveSiteKitBusinessTypeFromIntakeFacts(facts);
  const preferredKitId = resolvePreferredSiteKitIdFromIntakeFacts(facts, businessType);

  return {
    businessType,
    goals: resolveSiteKitGoalsFromIntakeFacts(facts),
    locale: facts.locale ?? "en",
    region: facts.region ?? null,
    siteName: facts.siteName ?? facts.entityName ?? facts.topic ?? null,
    preferredKitId,
    selectedKitId: preferredKitId,
    enabledStepIds: resolveEnabledSiteKitPlanStepIdsFromIntakeFacts(
      facts,
      options.supportedSteps ?? siteBuilderPlanStepIds
    ),
  };
};

export const buildSiteBuilderIntakeCompileResult = (
  facts: AssistantSiteBuilderIntakeFacts,
  options: { supportedSteps?: readonly SiteBuilderPlanStepId[] } = {}
): AssistantSiteBuilderIntakeCompileResult => {
  const contentEngineDecisions = resolveSiteBuilderIntakeContentEngines(facts);
  const customScreenDecisions = resolveSiteBuilderIntakeCustomScreens(contentEngineDecisions);
  const contentEngineGates: AssistantSiteBuilderIntakeCompileGate[] =
    contentEngineDecisions.gates.map((gate) => ({
      code: gate.code,
      message: gate.message,
      contentEngineId: gate.requestedEngineId,
      source: gate.source,
    }));
  const customScreenGates: AssistantSiteBuilderIntakeCompileGate[] =
    customScreenDecisions.gates.map((gate) => ({
      code: gate.code,
      message: gate.message,
      contentEngineId: gate.engineId,
      customScreenEngineId: gate.engineId,
    }));

  return {
    siteKit: buildSiteKitPlanInputFromIntakeFacts(facts, options),
    reviewFacts: {
      pageRoles: facts.pageRoles,
      sectionRoles: facts.sectionRoles,
      menuPreset: facts.menuPreset,
      heroPreset: facts.heroPreset,
      mediaPolicy: facts.mediaPolicy,
      contentEngines: facts.contentEngines,
      contentEngineDecisions,
      customScreenDecisions,
      designPresetId: facts.designPresetId,
      advancedLayout: facts.advancedLayout,
      referenceDesignBrief: facts.referenceDesignBrief,
      readyForReview: facts.readyForReview === true,
      readyForExecution: facts.readyForExecution === true,
      redactionApplied: facts.redactionApplied === true,
    },
    gates: [...contentEngineGates, ...customScreenGates],
  };
};

export const compileIntakeToSiteKitPlanInput = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteKitPlanInput => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  return buildSiteKitPlanInputFromIntakeFacts(normalized.facts ?? {});
};

const buildSiteKitPromptSummary = (facts: AssistantSiteBuilderIntakeFacts) => {
  const subject = facts.siteName ?? facts.entityName ?? facts.topic ?? "new site";
  const goal = facts.primaryGoal ?? facts.goals?.[0] ?? "site setup";
  return `Prepare reviewed site-kit plan for ${subject}: ${goal}.`;
};

export const buildActionPlanRequestFromReviewedIntake = (
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteBuilderIntakeActionPlanRequest => {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  const facts = normalized.facts ?? {};
  const reviewSummary = buildSiteBuilderIntakeReviewSummary(facts);
  const blockingReviewGates = reviewSummary?.gates.filter((gate) => gate.blocking) ?? [];
  if (!reviewSummary || reviewSummary.confirmationAllowed !== true || blockingReviewGates.length) {
    throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "review_summary_handoff_blocked",
      gates: blockingReviewGates.map((gate) => ({
        code: gate.code,
        message: gate.message,
        severity: gate.severity,
        stepId: gate.stepId,
      })),
      reviewHashStale: facts.reviewHashStale === true,
    });
  }
  const compileResult = buildSiteBuilderIntakeCompileResult(facts);
  if (compileResult.gates.length > 0) {
    throwAssistantSiteBuilderIntakeError("intake_session_invalid", {
      reason: "content_engine_handoff_blocked",
      gates: compileResult.gates,
    });
  }
  return {
    prompt: buildSiteKitPromptSummary(facts),
    context: {
      siteKit: compileResult.siteKit,
    },
  };
};
