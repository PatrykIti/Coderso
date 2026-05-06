import {
  buildAssistantAdminContext,
  readTrustedAssistantResourceCatalog,
} from "../adminContextService";
import type { AssistantActionContext, AssistantActionPlan } from "../actionPlanTypes";
import { resolveBlueprintCandidates } from "./blueprintCandidateResolver";
import type { BlueprintCandidate } from "./blueprintCapabilityTypes";

const shadowAllowlist = new Set([
  "catalog_showcase",
  "product_catalog",
  "portfolio_projects",
  "services_directory",
  "lead_capture_site",
  "booking_service",
  "editorial_content_hub",
]);

const shouldExposeBlueprintShadowMetadata = () => process.env.ASSISTANT_BLUEPRINT_SHADOW === "1";

const composedIntentPrefix = "blueprint-composed-";
const composedPlanIdPrefix = "plan-blueprint-composed-";

const usesBlueprintComposer = (plan: AssistantActionPlan) =>
  plan.intentId.startsWith(composedIntentPrefix);

const extractCurrentPrimaryCapabilityId = (plan: AssistantActionPlan) => {
  if (!usesBlueprintComposer(plan)) return plan.intentId;
  const suffix = plan.intentId.slice(composedIntentPrefix.length);
  return suffix.endsWith("-needs-input") ? suffix.slice(0, -"-needs-input".length) : suffix;
};

const extractCurrentSelectedCapabilityIds = (plan: AssistantActionPlan) => {
  if (!plan.id.startsWith(composedPlanIdPrefix)) return null;
  const suffix = plan.id.slice(composedPlanIdPrefix.length);
  const encoded = suffix.endsWith("-needs-input")
    ? suffix.slice(0, -"-needs-input".length)
    : suffix;
  return encoded.length > 0 ? encoded.split("~").filter((value) => value.length > 0) : [];
};

export const shouldRunBlueprintCandidateShadow = (input: {
  promptKind?: string;
  intentFamily?: string;
  context?: AssistantActionContext;
}) => {
  if (input.context?.siteKit) return false;
  if (input.promptKind !== "setup_request" && input.promptKind !== "refinement_request") {
    return false;
  }
  if (process.env.NODE_ENV === "test") {
    return input.intentFamily === "unknown" || shadowAllowlist.has(input.intentFamily ?? "");
  }
  if (!shouldExposeBlueprintShadowMetadata()) return false;
  return shadowAllowlist.has(input.intentFamily ?? "");
};

const buildMismatchReason = (input: {
  currentPlan: AssistantActionPlan;
  candidates: BlueprintCandidate[];
}) => {
  if (input.candidates.length === 0) return "no_candidates";
  const primary = input.candidates.find((candidate) => candidate.role === "primary");
  const adjuncts = input.candidates.filter((candidate) => candidate.role === "adjunct");
  const gated = input.candidates.filter((candidate) => candidate.role === "gated");
  if (!primary) return "missing_primary_candidate";
  if (extractCurrentPrimaryCapabilityId(input.currentPlan) !== primary.capabilityId) {
    return "legacy_primary_routing";
  }
  const selectedCapabilityIds = extractCurrentSelectedCapabilityIds(input.currentPlan);
  if (usesBlueprintComposer(input.currentPlan) && selectedCapabilityIds) {
    const expectedIds = [
      primary.capabilityId,
      ...adjuncts.map((candidate) => candidate.capabilityId),
      ...gated.map((candidate) => candidate.capabilityId),
    ].sort();
    const currentIds = [...selectedCapabilityIds].sort();
    if (expectedIds.length !== currentIds.length) {
      return "composed_capabilities_drifted";
    }
    for (const [index, capabilityId] of expectedIds.entries()) {
      if (currentIds[index] !== capabilityId) {
        return "composed_capabilities_drifted";
      }
    }
    return null;
  }
  if (adjuncts.length > 0) {
    return "adjunct_capabilities_deferred";
  }
  if (gated.length > 0) {
    return "gated_capabilities_detected";
  }
  return null;
};

export const compareBlueprintCandidateSelection = (input: {
  currentPlan: AssistantActionPlan;
  candidates: BlueprintCandidate[];
}) => {
  const primary = input.candidates.find((candidate) => candidate.role === "primary");
  const adjuncts = input.candidates.filter((candidate) => candidate.role === "adjunct");
  const gated = input.candidates.filter((candidate) => candidate.role === "gated");
  return {
    schemaVersion: 1 as const,
    currentIntentId: input.currentPlan.intentId,
    currentIntentFamily: input.currentPlan.intentFamily ?? null,
    primaryCapabilityId: primary?.capabilityId ?? null,
    adjunctCapabilityIds: adjuncts.map((candidate) => candidate.capabilityId),
    gatedCapabilityIds: gated.map((candidate) => candidate.capabilityId),
    candidates: input.candidates.map((candidate) => ({
      capabilityId: candidate.capabilityId,
      role: candidate.role,
      score: candidate.score,
      matchedSignals: [...candidate.matchedSignals],
      reasons: [...candidate.reasons],
    })),
    mismatchReason: buildMismatchReason(input),
  };
};

export const runBlueprintCandidateShadow = (input: {
  prompt: string;
  context?: AssistantActionContext;
  currentPlan: AssistantActionPlan;
}) => {
  const normalizedContext = buildAssistantAdminContext(input.context);
  const trustedResourceCatalog = readTrustedAssistantResourceCatalog(input.context);
  const candidates = resolveBlueprintCandidates({
    prompt: input.prompt,
    context: {
      ...input.context,
      page: normalizedContext.route ?? input.context?.page,
      locale: normalizedContext.locale ?? input.context?.locale,
      resourceCatalog: trustedResourceCatalog,
      runtimeSnapshot: normalizedContext.runtimeSnapshot ?? input.context?.runtimeSnapshot,
      activeSurface: normalizedContext.activeSurface ?? input.context?.activeSurface,
      planningState: normalizedContext.planningState ?? input.context?.planningState,
    },
  });
  return compareBlueprintCandidateSelection({
    currentPlan: input.currentPlan,
    candidates,
  });
};

export const attachBlueprintShadowMetadata = (input: {
  plan: AssistantActionPlan;
  prompt: string;
  context?: AssistantActionContext;
  promptKind?: string;
  intentFamily?: string;
}) => {
  if (
    input.plan.intentId.startsWith("cms-") ||
    input.plan.responseKind === "inspection" ||
    input.plan.responseKind === "docs"
  ) {
    return input.plan;
  }
  if (
    !shouldRunBlueprintCandidateShadow({
      promptKind: input.promptKind,
      intentFamily: input.intentFamily,
      context: input.context,
    })
  ) {
    return input.plan;
  }

  const shadow = runBlueprintCandidateShadow({
    prompt: input.prompt,
    context: input.context,
    currentPlan: input.plan,
  });

  if (!shouldExposeBlueprintShadowMetadata()) {
    return input.plan;
  }

  return {
    ...input.plan,
    metadata: {
      planner: input.plan.metadata?.planner ?? "local",
      providerDraftUsed: input.plan.metadata?.providerDraftUsed ?? false,
      ...(input.plan.metadata?.providerId !== undefined
        ? { providerId: input.plan.metadata.providerId }
        : {}),
      blueprintShadow: shadow,
    },
  } satisfies AssistantActionPlan;
};
