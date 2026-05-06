import type { BlueprintConflict } from "./blueprintCapabilityTypes";
import { buildBlueprintActionMergeKey, mergeBlueprintActions } from "./blueprintActionAssembler";
import type { BlueprintCompositionGraph } from "./blueprintCapabilityTypes";

export const resolveBlueprintCompositionConflicts = (graph: {
  fragments: BlueprintCompositionGraph["fragments"];
}) => {
  const conflicts: BlueprintConflict[] = [];
  const seen = new Map<string, BlueprintCompositionGraph["fragments"][number]["actions"][number]>();

  for (const fragment of graph.fragments) {
    for (const action of fragment.actions) {
      const mergeKey = buildBlueprintActionMergeKey(action);
      const previous = seen.get(mergeKey);
      if (!previous) {
        seen.set(mergeKey, action);
        continue;
      }
      if (!mergeBlueprintActions(previous, action)) {
        conflicts.push({
          code: "blueprint_action_merge_conflict",
          severity: "error",
          message: `Conflicting ${action.type} actions target the same resource (${mergeKey}).`,
          resourceKey: mergeKey,
          actionType: action.type,
        });
      }
    }
  }

  return conflicts;
};
