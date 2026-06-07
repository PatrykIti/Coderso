import { deriveBasicSiteMapDefaults } from "./assistantSiteBuilderIntakeBasicDefaults";
import { buildBasicSiteBuilderReviewFacts } from "./assistantSiteBuilderIntakeBasicReview";
import {
  resolveSiteBuilderIntakeContentEngines,
  type AssistantSiteBuilderContentEngineDecisionResult,
} from "./assistantSiteBuilderIntakeContentEngines";
import {
  resolveSiteBuilderIntakeCustomScreens,
  type AssistantSiteBuilderCustomScreenDecisionResult,
} from "./assistantSiteBuilderIntakeCustomScreens";
import { getSiteBuilderIntakeOption } from "./assistantSiteBuilderIntakeRegistry";
import type {
  AssistantSiteBuilderIntakeFacts,
  AssistantSiteBuilderIntakeStepId,
} from "./assistantSiteBuilderIntakeTypes";

export type AssistantSiteBuilderReviewSummarySectionId =
  | "pages"
  | "menu"
  | "footer"
  | "hero"
  | "homepage-sections"
  | "subpages"
  | "content-engines"
  | "custom-screens"
  | "media-policy"
  | "seo"
  | "lead-capture";

export type AssistantSiteBuilderReviewSummarySection = {
  id: AssistantSiteBuilderReviewSummarySectionId;
  label: string;
  items: readonly string[];
};

export type AssistantSiteBuilderReviewSummaryGate = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  stepId?: AssistantSiteBuilderIntakeStepId;
  blocking: boolean;
};

export type AssistantSiteBuilderReviewSummary = {
  schemaVersion: 1;
  reviewHash: string | null;
  confirmedReviewHash: string | null;
  reviewHashStale: boolean;
  readyForReview: boolean;
  readyForExecution: boolean;
  confirmationAllowed: boolean;
  sections: readonly AssistantSiteBuilderReviewSummarySection[];
  gates: readonly AssistantSiteBuilderReviewSummaryGate[];
  blockingGateCount: number;
  contentEngineDecisions: AssistantSiteBuilderContentEngineDecisionResult;
  customScreenDecisions: AssistantSiteBuilderCustomScreenDecisionResult;
};

const hasItems = (values: readonly unknown[] | undefined): boolean =>
  Array.isArray(values) && values.length > 0;

const labelFor = (registryId: string, id: string | null | undefined) => {
  if (!id) return null;
  try {
    return getSiteBuilderIntakeOption(registryId, id).label;
  } catch {
    return id;
  }
};

const joinLabelAndValue = (label: string, value: string | null | undefined) =>
  value ? `${label}: ${value}` : label;

const buildDefaults = (facts: AssistantSiteBuilderIntakeFacts) =>
  facts.basicDefaults ??
  deriveBasicSiteMapDefaults({
    pageRoles: facts.pageRoles,
    goals: facts.goals,
    primaryGoal: facts.primaryGoal,
    menuPreset: facts.menuPreset,
    sectionRoles: facts.sectionRoles,
    customLabels: facts.pageRoleLabels,
  });

const pushGate = (
  gates: AssistantSiteBuilderReviewSummaryGate[],
  gate: AssistantSiteBuilderReviewSummaryGate
) => {
  gates.push(gate);
};

const collectBasicReviewGates = (
  facts: AssistantSiteBuilderIntakeFacts,
  gates: AssistantSiteBuilderReviewSummaryGate[]
) => {
  if (facts.readyForReview !== true) return;
  try {
    const reviewFacts = buildBasicSiteBuilderReviewFacts({
      ...facts,
      basicDefaults: buildDefaults(facts),
    });
    for (const gate of reviewFacts.gates) {
      pushGate(gates, {
        code: gate.code,
        severity: gate.severity,
        message: gate.message,
        blocking:
          gate.code === "media_library_selection_required" ||
          gate.code === "widget_alias_unsupported" ||
          gate.code === "content_engine_unsupported",
      });
    }
  } catch {
    pushGate(gates, {
      code: "review_summary_unavailable",
      severity: "error",
      message: "The review summary could not be generated from the current intake answers.",
      stepId: "review",
      blocking: true,
    });
  }
};

const collectReviewGates = (
  facts: AssistantSiteBuilderIntakeFacts,
  contentEngineDecisions: AssistantSiteBuilderContentEngineDecisionResult,
  customScreenDecisions: AssistantSiteBuilderCustomScreenDecisionResult
): AssistantSiteBuilderReviewSummaryGate[] => {
  const gates: AssistantSiteBuilderReviewSummaryGate[] = [];

  for (const stepId of facts.missingReviewInputStepIds ?? []) {
    pushGate(gates, {
      code: "review_input_missing",
      severity: "error",
      message: `Complete the ${stepId} step before confirming the reviewed site plan.`,
      stepId,
      blocking: true,
    });
  }

  if (facts.reviewHashStale === true) {
    pushGate(gates, {
      code: "review_hash_stale",
      severity: "error",
      message: "Review confirmation is stale because earlier intake answers changed.",
      stepId: "review",
      blocking: true,
    });
  }

  if ((facts.referenceNotes || facts.referenceTextBrief) && !facts.referenceDesignBrief) {
    pushGate(gates, {
      code: "reference_review_required",
      severity: "warning",
      message: "Reference material must be reviewed before it can influence generation.",
      stepId: "reference-intake",
      blocking: true,
    });
  }

  for (const gate of facts.referenceDesignBrief?.gates ?? []) {
    pushGate(gates, {
      code: gate.code,
      severity: gate.severity,
      message: gate.message,
      stepId: "reference-intake",
      blocking: gate.code !== "reference_material_gated",
    });
  }

  for (const gate of contentEngineDecisions.gates) {
    pushGate(gates, {
      code: gate.code,
      severity: gate.severity,
      message: gate.message,
      stepId: "content-engine",
      blocking: true,
    });
  }

  for (const gate of customScreenDecisions.gates) {
    pushGate(gates, {
      code: gate.code,
      severity: gate.severity,
      message: gate.message,
      stepId: "content-engine",
      blocking: true,
    });
  }

  for (const gate of facts.advancedLayout?.gates ?? []) {
    pushGate(gates, {
      code: gate.code,
      severity: gate.severity,
      message: gate.message,
      stepId: "homepage-sections",
      blocking: false,
    });
  }

  collectBasicReviewGates(facts, gates);
  return gates;
};

export const buildSiteBuilderIntakeReviewSummary = (
  facts: AssistantSiteBuilderIntakeFacts | null | undefined
): AssistantSiteBuilderReviewSummary | null => {
  if (!facts) return null;
  const defaults = buildDefaults(facts);
  const contentEngineDecisions = resolveSiteBuilderIntakeContentEngines(facts);
  const customScreenDecisions = resolveSiteBuilderIntakeCustomScreens(contentEngineDecisions);
  const gates = collectReviewGates(facts, contentEngineDecisions, customScreenDecisions);
  const blockingGateCount = gates.filter((gate) => gate.blocking).length;
  const pageItems = defaults.pageRoutes.map((route) => `${route.label} (${route.path})`);
  const subpageItems = defaults.pageRoutes
    .filter((route) => route.roleId !== "home")
    .map((route) => `${route.label} (${route.path})`);
  const sectionItems = defaults.homepageSectionRoles.map((sectionRoleId) => {
    const variant = facts.advancedLayout?.sectionVariants?.find(
      (candidate) => candidate.sectionRoleId === sectionRoleId
    );
    const label = labelFor("sectionRoles", sectionRoleId) ?? sectionRoleId;
    return variant ? `${label}: ${variant.widgetVariantId}` : label;
  });
  const contentEngineItems = contentEngineDecisions.decisions.map((decision) =>
    joinLabelAndValue(decision.label, `${decision.capabilities.length} capabilities`)
  );
  const customScreenItems = customScreenDecisions.candidates.map(
    (candidate) => `${candidate.name} (${candidate.adminPath})`
  );
  const leadCaptureEnabled =
    hasItems(facts.goals) &&
    [...(facts.goals ?? []), facts.primaryGoal ?? ""].join(" ").toLowerCase().includes("lead");
  const contactEnabled =
    (facts.pageRoles ?? []).includes("contact") || (facts.sectionRoles ?? []).includes("contact");
  const sections: AssistantSiteBuilderReviewSummarySection[] = [
    {
      id: "pages",
      label: "Pages",
      items: pageItems,
    },
    {
      id: "menu",
      label: "Menu",
      items: defaults.menuItems
        .filter((item) => item.href)
        .map((item) => `${item.label} (${item.href})`),
    },
    {
      id: "footer",
      label: "Footer",
      items: pageItems.slice(0, 8),
    },
    {
      id: "hero",
      label: "Hero",
      items: [
        joinLabelAndValue("Preset", labelFor("heroPresets", facts.heroPreset)),
        joinLabelAndValue("Headline", facts.heroHeadline),
        joinLabelAndValue("Subheadline", facts.heroSubheadline),
      ].filter((item): item is string => Boolean(item)),
    },
    {
      id: "homepage-sections",
      label: "Homepage sections",
      items: sectionItems,
    },
    {
      id: "subpages",
      label: "Subpages",
      items: subpageItems,
    },
    {
      id: "content-engines",
      label: "Content engines",
      items: contentEngineItems.length > 0 ? contentEngineItems : ["Static pages only"],
    },
    {
      id: "custom-screens",
      label: "Custom screens",
      items: customScreenItems.length > 0 ? customScreenItems : ["No custom admin screen needed"],
    },
    {
      id: "media-policy",
      label: "Media policy",
      items: [
        labelFor("mediaPolicies", facts.mediaPolicy) ?? "Not selected",
        facts.mediaNotes ? `Notes: ${facts.mediaNotes}` : null,
      ].filter((item): item is string => Boolean(item)),
    },
    {
      id: "seo",
      label: "SEO",
      items: [
        joinLabelAndValue("Locale", facts.locale),
        joinLabelAndValue("Region", facts.region),
        `${defaults.pageRoutes.length} page-level defaults`,
      ].filter((item): item is string => Boolean(item)),
    },
    {
      id: "lead-capture",
      label: "Lead capture",
      items:
        leadCaptureEnabled || contactEnabled || (facts.sectionRoles ?? []).includes("lead-capture")
          ? ["Contact/lead capture path included in reviewed plan"]
          : ["No lead capture path requested"],
    },
  ];

  return {
    schemaVersion: 1,
    reviewHash: facts.reviewHash ?? null,
    confirmedReviewHash: facts.confirmedReviewHash ?? null,
    reviewHashStale: facts.reviewHashStale === true,
    readyForReview: facts.readyForReview === true,
    readyForExecution: facts.readyForExecution === true,
    confirmationAllowed: facts.readyForReview === true && blockingGateCount === 0,
    sections,
    gates,
    blockingGateCount,
    contentEngineDecisions,
    customScreenDecisions,
  };
};
