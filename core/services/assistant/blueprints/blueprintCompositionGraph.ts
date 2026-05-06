import type { AssistantIntentFamily, AssistantPromptKind } from "../actionPlanTypes";
import { getBlueprintCapabilityRegistration } from "./blueprintCapabilityRegistry";
import { resolveBlueprintCompositionConflicts } from "./blueprintConflictResolver";
import type {
  BlueprintCandidate,
  BlueprintCompositionGraph,
  BlueprintCompositionNode,
} from "./blueprintCapabilityTypes";

const roleOrder: Record<BlueprintCandidate["role"], number> = {
  primary: 0,
  adjunct: 1,
  gated: 2,
};

const compareCandidates = (left: BlueprintCandidate, right: BlueprintCandidate) => {
  if (roleOrder[left.role] !== roleOrder[right.role]) {
    return roleOrder[left.role] - roleOrder[right.role];
  }
  if (right.score !== left.score) return right.score - left.score;
  return left.capabilityId.localeCompare(right.capabilityId);
};

const toNode = (candidate: BlueprintCandidate): BlueprintCompositionNode | null => {
  const registration = getBlueprintCapabilityRegistration(candidate.capabilityId);
  if (!registration) return null;
  return {
    ...candidate,
    capability: registration.capability,
  };
};

export const buildBlueprintCompositionGraph = (input: {
  candidates: BlueprintCandidate[];
  promptKind: AssistantPromptKind;
  intentFamily: AssistantIntentFamily;
}) => {
  const orderedCandidates = [...input.candidates].sort(compareCandidates);
  const dedupedCandidates = orderedCandidates.filter(
    (candidate, index) =>
      orderedCandidates.findIndex((entry) => entry.capabilityId === candidate.capabilityId) ===
      index
  );
  const nodes = dedupedCandidates
    .map((candidate) => toNode(candidate))
    .filter(Boolean) as BlueprintCompositionNode[];
  const primary = nodes.find((node) => node.role === "primary") ?? null;
  const adjuncts = nodes.filter((node) => node.role === "adjunct");
  const gated = nodes.filter((node) => node.role === "gated");
  const selectedNodes = [...(primary ? [primary] : []), ...adjuncts, ...gated];
  const fragments =
    primary === null
      ? []
      : [primary, ...adjuncts].map((node) => {
          const registration = getBlueprintCapabilityRegistration(node.capability.id);
          if (!registration) {
            throw new Error("assistant_blueprint_registry_missing");
          }
          const planIntentFamily =
            input.intentFamily === "unknown"
              ? (registration.primaryIntentFamilies[0] ?? "unknown")
              : input.intentFamily;
          const plan = registration.buildPlan({
            promptKind: input.promptKind,
            intentFamily: planIntentFamily,
          });
          return {
            capabilityId: node.capability.id,
            planId: plan.id,
            title: plan.title,
            assumptions: [...plan.assumptions],
            actions: [...plan.actions],
          };
        });

  const resources = [
    ...(primary?.capability.resources ?? []),
    ...adjuncts.flatMap((node) => node.capability.resources),
    ...gated.flatMap((node) => node.capability.resources),
  ];
  const conflicts = resolveBlueprintCompositionConflicts({ fragments, gated });

  return {
    primary,
    adjuncts,
    gated,
    resources,
    conflicts,
    fragments,
    selectedCapabilityIds: selectedNodes.map((node) => node.capability.id),
  } satisfies BlueprintCompositionGraph;
};
