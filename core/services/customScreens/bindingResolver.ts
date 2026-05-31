import { getWidget } from "../../widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import type {
  WidgetBindingTarget,
  WidgetBlock,
  WidgetDataAccess,
  WidgetDefinition,
} from "../../widgets/types";
import {
  readBindingPathValue,
  splitBindingPath,
  writeBindingPathValue,
} from "../utils/bindingPath";
export { collectBindingPropPaths } from "../utils/bindingPropPaths";

import type { CustomScreenBinding } from "./customScreenSchemas";

export { readBindingPathValue, splitBindingPath, writeBindingPathValue };

export type CustomScreenBindingWidgetSource = "screen-registry" | "legacy-fallback" | "unknown";

export type ResolvedCustomScreenBindingContract = {
  widgetId: string;
  widgetType: string;
  widgetSource: CustomScreenBindingWidgetSource;
  dataAccessSource: WidgetDataAccess["source"] | null;
  bindingTargets: Map<
    string,
    {
      propPath: string;
      label: string;
      description?: string;
      modes: Array<"read" | "write">;
    }
  >;
};

export type WidgetBindingTargetCard = {
  propPath: string;
  label: string;
  description?: string;
  modes: Array<"read" | "write">;
  kind: "declared" | "compatibility";
};

type BindingContractCandidate = Pick<
  CustomScreenBinding,
  "widgetId" | "propPath" | "field" | "mode"
>;

const modeAllowsWrite = (mode: BindingContractCandidate["mode"]) =>
  mode === "write" || mode === "readwrite";

const normalizeTargetModes = (
  target: WidgetBindingTarget | undefined,
  widget: WidgetDefinition | null
) => {
  const requested = target?.modes ?? widget?.dataAccess?.modes ?? ["read"];
  return Array.from(
    new Set(
      requested.filter((mode): mode is "read" | "write" => mode === "read" || mode === "write")
    )
  );
};

const isScreenRegistryWidget = (widget: WidgetDefinition | null) =>
  Boolean(
    widget?.surfaces?.includes("admin-editor-view") ||
    widget?.surfaces?.includes("custom-screen-builder")
  );

const resolveWidgetSource = (widget: WidgetDefinition | null): CustomScreenBindingWidgetSource => {
  if (!widget) return "unknown";
  return isScreenRegistryWidget(widget) ? "screen-registry" : "legacy-fallback";
};

const visitBlocks = (blocks: WidgetBlock[], visitor: (block: WidgetBlock) => void) => {
  blocks.forEach((block) => {
    visitor(block);
    if (Array.isArray(block.children) && block.children.length > 0) {
      visitBlocks(block.children, visitor);
    }
    if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
      Object.values(block.slots).forEach((items) => {
        if (Array.isArray(items) && items.length > 0) {
          visitBlocks(items, visitor);
        }
      });
    }
  });
};

export function resolveCustomScreenBindingContracts(
  blocks: WidgetBlock[]
): Map<string, ResolvedCustomScreenBindingContract> {
  ensureRuntimeWidgetsRegistered();
  const contracts = new Map<string, ResolvedCustomScreenBindingContract>();

  visitBlocks(blocks, (block) => {
    const widget = getWidget(block.type);
    const bindingTargets = new Map<
      string,
      {
        propPath: string;
        label: string;
        description?: string;
        modes: Array<"read" | "write">;
      }
    >();

    (widget?.bindingTargets ?? []).forEach((target) => {
      const modes = normalizeTargetModes(target, widget);
      if (!target.propPath || modes.length === 0) return;
      bindingTargets.set(target.propPath, {
        propPath: target.propPath,
        label: target.label,
        ...(target.description ? { description: target.description } : {}),
        modes,
      });
    });

    contracts.set(block.id, {
      widgetId: block.id,
      widgetType: block.type,
      widgetSource: resolveWidgetSource(widget),
      dataAccessSource: widget?.dataAccess?.source ?? null,
      bindingTargets,
    });
  });

  return contracts;
}

export function getWidgetBindingTarget(
  widget: WidgetDefinition | null | undefined,
  propPath: string
) {
  const target = widget?.bindingTargets?.find((item) => item.propPath === propPath);
  if (!target || !propPath) return null;
  return {
    propPath: target.propPath,
    label: target.label,
    ...(target.description ? { description: target.description } : {}),
    modes: normalizeTargetModes(target, widget ?? null),
  };
}

export function listSelectedEntryWidgetBindingTargets(input: {
  widget: WidgetDefinition | null | undefined;
  existingBindings: CustomScreenBinding[];
}): WidgetBindingTargetCard[] {
  const widget = input.widget ?? null;
  if (widget?.dataAccess?.source !== "selected-entry") {
    return [];
  }

  const declared = (widget.bindingTargets ?? []).flatMap((target) => {
    const normalized = getWidgetBindingTarget(widget, target.propPath);
    return normalized
      ? [
          {
            ...normalized,
            kind: "declared" as const,
          },
        ]
      : [];
  });
  const declaredPaths = new Set(declared.map((target) => target.propPath));
  const compatibility = input.existingBindings
    .filter((binding) => !declaredPaths.has(binding.propPath))
    .map((binding) => ({
      propPath: binding.propPath,
      label: binding.propPath,
      description: "Existing custom binding path from a previously saved screen.",
      modes: ["read"] as Array<"read" | "write">,
      kind: "compatibility" as const,
    }));

  return [...declared, ...compatibility];
}

const resolveBindingContractsFromInput = (input?: {
  blocks?: WidgetBlock[] | null;
  contracts?: Map<string, ResolvedCustomScreenBindingContract> | null;
}) => {
  if (input?.contracts) return input.contracts;
  if (Array.isArray(input?.blocks) && input.blocks.length > 0) {
    return resolveCustomScreenBindingContracts(input.blocks);
  }
  return null;
};

export function isBindingWriteModeSupported(
  binding: BindingContractCandidate,
  input?: {
    blocks?: WidgetBlock[] | null;
    contracts?: Map<string, ResolvedCustomScreenBindingContract> | null;
  }
) {
  if (!modeAllowsWrite(binding.mode)) return true;
  const contracts = resolveBindingContractsFromInput(input);
  if (!contracts || contracts.size === 0) return true;
  const contract = contracts.get(binding.widgetId);
  if (!contract) return true;
  if (contract.widgetSource === "legacy-fallback") return true;
  const target = contract.bindingTargets.get(binding.propPath);
  return target?.modes.includes("write") === true;
}

export function isBindingWriteAllowed(
  binding: BindingContractCandidate,
  input?: {
    blocks?: WidgetBlock[] | null;
    contracts?: Map<string, ResolvedCustomScreenBindingContract> | null;
    fallbackToModeOnly?: boolean;
  }
) {
  if (!modeAllowsWrite(binding.mode)) return false;
  const contracts = resolveBindingContractsFromInput(input);
  if (!contracts || contracts.size === 0) {
    return input?.fallbackToModeOnly ?? true;
  }
  const contract = contracts.get(binding.widgetId);
  if (!contract) {
    return input?.fallbackToModeOnly ?? true;
  }
  if (contract.widgetSource === "legacy-fallback") return false;
  const target = contract.bindingTargets.get(binding.propPath);
  return target?.modes.includes("write") === true;
}

export const getWidgetBindings = (
  bindings: CustomScreenBinding[],
  widgetId: string,
  options?: { includeRead?: boolean; includeWrite?: boolean }
) => {
  const includeRead = options?.includeRead ?? true;
  const includeWrite = options?.includeWrite ?? true;

  return bindings.filter((binding) => {
    if (binding.widgetId !== widgetId) return false;
    if (binding.mode === "read") return includeRead;
    if (binding.mode === "write") return includeWrite;
    return includeRead || includeWrite;
  });
};

export function applyBindingsToBlockData(
  data: Record<string, unknown>,
  widgetId: string,
  bindings: CustomScreenBinding[],
  fieldValues: Record<string, unknown>
) {
  return getWidgetBindings(bindings, widgetId, {
    includeRead: true,
    includeWrite: false,
  }).reduce<Record<string, unknown>>((current, binding) => {
    const nextValue = readBindingPathValue(fieldValues, binding.field);
    if (nextValue === undefined) return current;
    return writeBindingPathValue(current, binding.propPath, nextValue) as Record<string, unknown>;
  }, data);
}

export function mergeBindingValuesIntoEntryData(
  entryData: Record<string, unknown>,
  widgetId: string,
  widgetData: Record<string, unknown>,
  bindings: CustomScreenBinding[]
) {
  return getWidgetBindings(bindings, widgetId, {
    includeRead: false,
    includeWrite: true,
  }).reduce<Record<string, unknown>>((current, binding) => {
    const nextValue = readBindingPathValue(widgetData, binding.propPath);
    if (nextValue === undefined) return current;
    return writeBindingPathValue(current, binding.field, nextValue) as Record<string, unknown>;
  }, entryData);
}

const applyBindingsToBlock = (
  block: WidgetBlock,
  bindings: CustomScreenBinding[],
  fieldValues: Record<string, unknown>
): WidgetBlock => {
  const data = applyBindingsToBlockData(block.data ?? {}, block.id, bindings, fieldValues);
  const slots =
    block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
      ? Object.fromEntries(
          Object.entries(block.slots).map(([slotId, items]) => [
            slotId,
            Array.isArray(items)
              ? items.map((item) => applyBindingsToBlock(item, bindings, fieldValues))
              : [],
          ])
        )
      : undefined;
  const children = Array.isArray(block.children)
    ? block.children.map((child) => applyBindingsToBlock(child, bindings, fieldValues))
    : undefined;

  return {
    ...block,
    data,
    ...(slots ? { slots } : {}),
    ...(children ? { children } : {}),
  };
};

export function applyBindingsToBlocks(
  blocks: WidgetBlock[],
  bindings: CustomScreenBinding[],
  fieldValues: Record<string, unknown>
) {
  return blocks.map((block) => applyBindingsToBlock(block, bindings, fieldValues));
}

export function collectWritableBindingFields(
  bindings: BindingContractCandidate[],
  input?: {
    blocks?: WidgetBlock[] | null;
    contracts?: Map<string, ResolvedCustomScreenBindingContract> | null;
    fallbackToModeOnly?: boolean;
  }
) {
  const contracts = resolveBindingContractsFromInput(input);
  return Array.from(
    new Set(
      bindings
        .filter((binding) =>
          isBindingWriteAllowed(binding, {
            contracts,
            fallbackToModeOnly: input?.fallbackToModeOnly,
          })
        )
        .map((binding) => binding.field)
    )
  );
}

export function sanitizeUnsupportedWriteBindings(
  bindings: CustomScreenBinding[],
  input?: {
    blocks?: WidgetBlock[] | null;
    contracts?: Map<string, ResolvedCustomScreenBindingContract> | null;
  }
) {
  const contracts = resolveBindingContractsFromInput(input);
  return bindings.map((binding) =>
    isBindingWriteModeSupported(binding, { contracts })
      ? binding
      : {
          ...binding,
          mode: "read" as const,
        }
  );
}
