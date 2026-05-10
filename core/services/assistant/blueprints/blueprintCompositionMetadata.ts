import type { AssistantBlueprintCompositionMetadata } from "../actionPlanTypes";
import {
  normalizeBlueprintConflict,
  type BlueprintCompositionGraph,
  type BlueprintConflict,
  type BlueprintCompositionNode,
} from "./blueprintCapabilityTypes";
import type { BlueprintExistingResourceMatch } from "./blueprintExistingResourceMatcher";

const secretLikeMetadataPattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)[\w.-]*\b/gi;

const redactMetadataText = (value: string) =>
  value.trim().replace(secretLikeMetadataPattern, "[redacted]");

const uniqueSorted = (items: string[]) =>
  Array.from(new Set(items.map(redactMetadataText).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );

const compareByKey = <T extends { key?: string; resourceKey?: string; actionId?: string | null }>(
  left: T,
  right: T
) => {
  const leftKey = left.key ?? left.resourceKey ?? left.actionId ?? "";
  const rightKey = right.key ?? right.resourceKey ?? right.actionId ?? "";
  return leftKey.localeCompare(rightKey);
};

const selectedNodes = (graph: BlueprintCompositionGraph): BlueprintCompositionNode[] => [
  ...(graph.primary ? [graph.primary] : []),
  ...graph.adjuncts,
  ...graph.gated,
];

const buildMergedResources = (graph: BlueprintCompositionGraph) => {
  const resources = new Map<
    string,
    AssistantBlueprintCompositionMetadata["mergedResources"][number]
  >();

  for (const node of selectedNodes(graph)) {
    for (const resource of node.capability.resources) {
      const mapKey = `${resource.kind}:${resource.key}`;
      const previous = resources.get(mapKey);
      if (!previous) {
        resources.set(mapKey, {
          key: redactMetadataText(resource.key),
          kind: resource.kind,
          sourceCapabilityIds: [redactMetadataText(node.capability.id)],
        });
        continue;
      }
      previous.sourceCapabilityIds = uniqueSorted([
        ...previous.sourceCapabilityIds,
        node.capability.id,
      ]);
    }
  }

  return [...resources.values()].sort(compareByKey);
};

const normalizeConflictMetadata = (conflict: BlueprintConflict) => {
  const normalized = normalizeBlueprintConflict(conflict);
  return {
    code: normalized.code,
    severity: normalized.severity,
    message: redactMetadataText(normalized.message),
    ...(normalized.capabilityId
      ? { capabilityId: redactMetadataText(normalized.capabilityId) }
      : {}),
    ...(normalized.resourceKey ? { resourceKey: redactMetadataText(normalized.resourceKey) } : {}),
    ...(normalized.actionType !== undefined ? { actionType: normalized.actionType } : {}),
  };
};

const normalizeExistingResourceMatchMetadata = (match: BlueprintExistingResourceMatch) => ({
  actionId: match.actionId ? redactMetadataText(match.actionId) : null,
  actionType: match.actionType,
  resourceKey: redactMetadataText(match.resourceKey),
  existingId: match.existingId ? redactMetadataText(match.existingId) : null,
  status: match.status,
  reason: match.reason ? redactMetadataText(match.reason) : null,
  candidateIds: uniqueSorted(match.candidateIds),
});

export const buildBlueprintCompositionMetadata = (input: {
  graph: BlueprintCompositionGraph;
  existingResourceMatches?: BlueprintExistingResourceMatch[];
  resolvedConflicts?: BlueprintConflict[];
  unresolvedConflicts?: BlueprintConflict[];
}): AssistantBlueprintCompositionMetadata => {
  if (!input.graph.primary) {
    throw new Error("assistant_blueprint_composition_metadata_missing_primary");
  }

  const candidateScores = selectedNodes(input.graph).map((node) => ({
    id: redactMetadataText(node.capability.id),
    role: node.role,
    score: node.score,
    reasons: uniqueSorted(node.reasons),
  }));

  return {
    schemaVersion: 1,
    kind: "blueprint-composition",
    primaryCapabilityId: redactMetadataText(input.graph.primary.capability.id),
    adjunctCapabilityIds: input.graph.adjuncts.map((node) =>
      redactMetadataText(node.capability.id)
    ),
    gatedCapabilityIds: input.graph.gated.map((node) => redactMetadataText(node.capability.id)),
    mergedResources: buildMergedResources(input.graph),
    existingResourceMatches: (input.existingResourceMatches ?? [])
      .map(normalizeExistingResourceMatchMetadata)
      .sort(compareByKey),
    resolvedConflicts: (input.resolvedConflicts ?? [])
      .map(normalizeConflictMetadata)
      .sort(compareByKey),
    unresolvedConflicts: (input.unresolvedConflicts ?? [])
      .map(normalizeConflictMetadata)
      .sort(compareByKey),
    ...(candidateScores.length > 0
      ? {
          diagnostics: {
            candidateScores,
          },
        }
      : {}),
  };
};
