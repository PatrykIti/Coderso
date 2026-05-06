import type { AssistantPlannedAction } from "../actionPlanTypes";
import { normalizeBlueprintConflict, type BlueprintConflict } from "./blueprintCapabilityTypes";
import { buildBlueprintActionMergeKey, mergeBlueprintActions } from "./blueprintActionAssembler";
import type { BlueprintCompositionGraph } from "./blueprintCapabilityTypes";

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readSchemaFieldType = (value: unknown) => {
  const record = readRecord(value);
  if (!record) return null;
  return readString(record.xFieldType) ?? readString(record.type);
};

const findFieldTypeConflict = (
  leftSchema: Record<string, unknown>,
  rightSchema: Record<string, unknown>
) => {
  const leftProperties = readRecord(leftSchema.properties);
  const rightProperties = readRecord(rightSchema.properties);
  if (!leftProperties || !rightProperties) return null;

  for (const [fieldName, leftField] of Object.entries(leftProperties)) {
    const rightField = rightProperties[fieldName];
    if (!rightField) continue;
    const leftType = readSchemaFieldType(leftField);
    const rightType = readSchemaFieldType(rightField);
    if (!leftType || !rightType || leftType === rightType) continue;
    return { fieldName, leftType, rightType };
  }

  return null;
};

const buildTypedConflict = (input: {
  current: AssistantPlannedAction;
  previous: AssistantPlannedAction;
  capabilityId: string;
}): BlueprintConflict => {
  const { current, previous, capabilityId } = input;

  switch (current.type) {
    case "setting.content-route.upsert": {
      const other = previous as typeof current;
      return normalizeBlueprintConflict({
        code: "route_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `content-route:${current.input.typeSlug}`,
        message: `Conflicting public content route mapping for "${current.input.typeSlug}" uses different list/detail paths (${other.input.listPath} -> ${other.input.detailPath} vs ${current.input.listPath} -> ${current.input.detailPath}).`,
      });
    }
    case "page.upsert":
      return normalizeBlueprintConflict({
        code: "route_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `page:${current.input.slug}`,
        message: `Conflicting page setup targets the same route "${current.input.slug}" with incompatible page composition inputs.`,
      });
    case "content-type.upsert": {
      const other = previous as typeof current;
      const fieldConflict = findFieldTypeConflict(
        current.input.schema as Record<string, unknown>,
        other.input.schema as Record<string, unknown>
      );
      if (fieldConflict) {
        return normalizeBlueprintConflict({
          code: "field_type_conflict",
          severity: "error",
          capabilityId,
          actionType: current.type,
          resourceKey: `content-type:${current.input.slug}:field:${fieldConflict.fieldName}`,
          message: `Conflicting content model field "${fieldConflict.fieldName}" on "${current.input.slug}" uses incompatible types (${fieldConflict.leftType} vs ${fieldConflict.rightType}).`,
        });
      }
      return normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `content-type:${current.input.slug}`,
        message: `Conflicting content-type setup targets the same slug "${current.input.slug}" with incompatible schema details.`,
      });
    }
    case "listing-template.upsert":
      return normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `listing-template:${current.input.slug}`,
        message: `Conflicting listing template setup targets the same slug "${current.input.slug}" with incompatible template config.`,
      });
    case "listing-query.upsert":
      return normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `listing-query:${current.input.name}`,
        message: `Conflicting listing query setup targets "${current.input.name}" with incompatible query configuration.`,
      });
    case "form.upsert":
      return normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `form:${current.input.slug}`,
        message: `Conflicting form setup targets the same slug "${current.input.slug}" with incompatible form fields or lifecycle settings.`,
      });
    case "custom-screen.upsert":
      return normalizeBlueprintConflict({
        code: "resource_slug_conflict",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: `custom-screen:${current.input.contentTypeSlug}:${current.input.name}`,
        message: `Conflicting custom screen setup targets "${current.input.name}" with incompatible bindings or screen layout.`,
      });
    default:
      return normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "error",
        capabilityId,
        actionType: current.type,
        resourceKey: buildBlueprintActionMergeKey(current),
        message: `Conflicting ${current.type} actions target the same resource (${buildBlueprintActionMergeKey(current)}).`,
      });
  }
};

export const resolveBlueprintCompositionConflicts = (graph: {
  fragments: BlueprintCompositionGraph["fragments"];
  gated?: BlueprintCompositionGraph["gated"];
}) => {
  const conflicts: BlueprintConflict[] = [];
  const seen = new Map<string, BlueprintCompositionGraph["fragments"][number]["actions"][number]>();
  const gatedConflictKeys = new Set<string>();

  for (const fragment of graph.fragments) {
    for (const action of fragment.actions) {
      const mergeKey = buildBlueprintActionMergeKey(action);
      const previous = seen.get(mergeKey);
      if (!previous) {
        seen.set(mergeKey, action);
        continue;
      }
      if (!mergeBlueprintActions(previous, action)) {
        conflicts.push(
          buildTypedConflict({
            current: action,
            previous,
            capabilityId: fragment.capabilityId,
          })
        );
      }
    }
  }

  for (const gatedNode of graph.gated ?? []) {
    for (const gated of gatedNode.capability.gated) {
      const key = `${gatedNode.capability.id}:${gated.key}`;
      if (gatedConflictKeys.has(key)) continue;
      gatedConflictKeys.add(key);
      conflicts.push(
        normalizeBlueprintConflict({
          code: "gated_domain",
          severity: gated.blocking === false ? "warning" : "error",
          capabilityId: gatedNode.capability.id,
          resourceKey: gated.key,
          message: `${gated.label} remains gated: ${gated.reason}`,
        })
      );
    }
  }

  return conflicts;
};
