import type { AssistantPlannedAction } from "../actionPlanTypes";
import { getAssistantActionFamilyContract } from "../actionFamilyContracts";
import {
  normalizeBlueprintConflict,
  type BlueprintCapability,
  type BlueprintConflict,
  type BlueprintMediaResourceMetadata,
  type BlueprintResourceContribution,
} from "./blueprintCapabilityTypes";
import { buildBlueprintActionMergeKey, mergeBlueprintActions } from "./blueprintActionAssembler";
import type { BlueprintCompositionGraph } from "./blueprintCapabilityTypes";
import { BlueprintSchemaMergeError, mergeBlueprintSchemas } from "./blueprintSchemaMerger";

type BlueprintConflictResolverInput = {
  fragments: BlueprintCompositionGraph["fragments"];
  gated?: BlueprintCompositionGraph["gated"];
  resources?: BlueprintResourceContribution[];
  selectedCapabilities?: BlueprintCapability[];
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
      try {
        mergeBlueprintSchemas([
          current.input.schema as Record<string, unknown>,
          (previous as typeof current).input.schema as Record<string, unknown>,
        ]);
      } catch (error) {
        if (
          error instanceof BlueprintSchemaMergeError &&
          error.code === "field_type_conflict" &&
          error.fieldName &&
          error.leftType &&
          error.rightType
        ) {
          return normalizeBlueprintConflict({
            code: "field_type_conflict",
            severity: "error",
            capabilityId,
            actionType: current.type,
            resourceKey: `content-type:${current.input.slug}:field:${error.fieldName}`,
            message: `Conflicting content model field "${error.fieldName}" on "${current.input.slug}" uses incompatible types (${error.leftType} vs ${error.rightType}).`,
          });
        }
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

const unique = <T>(items: T[]) => Array.from(new Set(items));

const isMediaResource = (
  resource: BlueprintResourceContribution
): resource is BlueprintResourceContribution & { metadata: BlueprintMediaResourceMetadata } =>
  resource.kind === "media";

const buildMediaConflict = (input: {
  code: "media_asset_missing" | "media_asset_ambiguous" | "media_delete_gated";
  capabilityId?: string | null;
  resource: BlueprintResourceContribution;
  message: string;
}) => {
  const actionType = input.resource.actionTypes[0];
  return normalizeBlueprintConflict({
    code: input.code,
    severity: "error",
    capabilityId: input.capabilityId ?? undefined,
    resourceKey: input.resource.key,
    message: input.message,
    ...(actionType ? { actionType } : {}),
  });
};

const resolveMediaResourceConflicts = (input: BlueprintConflictResolverInput) => {
  const resourcesByCapability =
    input.selectedCapabilities && input.selectedCapabilities.length > 0
      ? input.selectedCapabilities.flatMap((capability) =>
          capability.resources.map((resource) => ({
            capabilityId: capability.id,
            resource,
          }))
        )
      : (input.resources ?? []).map((resource) => ({
          capabilityId: null,
          resource,
        }));
  const conflicts: BlueprintConflict[] = [];

  for (const { capabilityId, resource } of resourcesByCapability) {
    if (!isMediaResource(resource)) continue;
    const metadata = resource.metadata;
    const candidateIds = unique(metadata.candidateIds ?? []).filter((candidateId) =>
      candidateId.trim()
    );

    if (metadata.operation === "delete-asset") {
      conflicts.push(
        buildMediaConflict({
          code: "media_delete_gated",
          capabilityId,
          resource,
          message: `Media asset deletion for "${resource.label}" must stay outside blueprint composition and use the media owner flow.`,
        })
      );
      continue;
    }

    if (candidateIds.length > 1) {
      conflicts.push(
        buildMediaConflict({
          code: "media_asset_ambiguous",
          capabilityId,
          resource,
          message: `Media reference "${resource.label}" matched multiple existing assets (${candidateIds.join(", ")}); choose one exact media id before composition can continue.`,
        })
      );
      continue;
    }

    if (metadata.required === true && !metadata.assetId && candidateIds.length === 0) {
      conflicts.push(
        buildMediaConflict({
          code: "media_asset_missing",
          capabilityId,
          resource,
          message: `Media reference "${resource.label}" requires a trusted existing media-library asset before composition can continue.`,
        })
      );
    }
  }

  return conflicts;
};

const collectActionPermissions = (fragments: BlueprintConflictResolverInput["fragments"]) => {
  const permissions = new Set<string>();
  for (const fragment of fragments) {
    for (const action of fragment.actions) {
      const contract = getAssistantActionFamilyContract(action.type);
      for (const permission of [
        ...contract.permissions.plan,
        ...contract.permissions.dryRun,
        ...contract.permissions.execute,
      ]) {
        permissions.add(permission);
      }
    }
  }
  return permissions;
};

const resolvePermissionConflicts = (input: BlueprintConflictResolverInput) => {
  const capabilities = input.selectedCapabilities ?? [];
  if (capabilities.length === 0) return [];

  const availablePermissions = collectActionPermissions(input.fragments);
  const conflicts: BlueprintConflict[] = [];

  for (const capability of capabilities) {
    for (const requirement of capability.requires) {
      if (requirement.kind !== "permission") continue;
      if (availablePermissions.has(requirement.key)) continue;
      conflicts.push(
        normalizeBlueprintConflict({
          code: "permission_gap",
          severity: requirement.optional === true ? "warning" : "error",
          capabilityId: capability.id,
          resourceKey: `permission:${requirement.key}`,
          message: `Capability "${capability.label}" requires "${requirement.label}" (${requirement.key}), but the composed action fragments do not declare that permission boundary.`,
        })
      );
    }
  }

  return conflicts;
};

const buildGatedConflict = (input: {
  capabilityId: string;
  key: string;
  kind: string;
  label: string;
  reason: string;
  blocking?: boolean;
}) => {
  if (input.kind === "media-import") {
    return normalizeBlueprintConflict({
      code: "media_upload_gated",
      severity: input.blocking === false ? "warning" : "error",
      capabilityId: input.capabilityId,
      resourceKey: input.key,
      message: `${input.label} remains gated: ${input.reason}`,
    });
  }

  return normalizeBlueprintConflict({
    code: "gated_domain",
    severity: input.blocking === false ? "warning" : "error",
    capabilityId: input.capabilityId,
    resourceKey: input.key,
    message: `${input.label} remains gated: ${input.reason}`,
  });
};

export const resolveBlueprintCompositionConflicts = (graph: BlueprintConflictResolverInput) => {
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
      conflicts.push(buildGatedConflict({ capabilityId: gatedNode.capability.id, ...gated }));
    }
  }

  conflicts.push(...resolveMediaResourceConflicts(graph));
  conflicts.push(...resolvePermissionConflicts(graph));

  return conflicts;
};
