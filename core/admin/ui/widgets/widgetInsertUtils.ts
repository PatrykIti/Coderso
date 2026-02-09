import {
  getWidgetSlotKind,
  isSlotIdMatchingDefinition,
  parseRepeatableSlotId,
  resolveWidgetSlotTargets,
} from "../../../widgets/slots";

export type WidgetBlockOption = {
  id: string;
  label: string;
  type: string;
  depth: number;
};

export type WidgetSlotOption = {
  id: string;
  label: string;
  count: number;
  definitionId: string;
  kind: "fixed" | "repeatable";
  instanceId?: string;
  maxItems?: number;
  allowedTypes?: string[];
  disabled: boolean;
  reason?: string;
};

type SlotDefinition = {
  id: string;
  label: string;
  kind?: "fixed" | "repeatable";
  minItems?: number;
  maxItems?: number;
  allowedTypes?: string[];
};

type BlockLike = {
  id?: unknown;
  type?: unknown;
  children?: unknown;
  slots?: unknown;
};

const getSlotMap = (block: BlockLike): Record<string, unknown[]> => {
  if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
    const result: Record<string, unknown[]> = {};
    for (const [key, value] of Object.entries(block.slots)) {
      const id = key.trim();
      if (!id) continue;
      result[id] = Array.isArray(value) ? (value as unknown[]) : [];
    }
    return result;
  }
  if (Array.isArray(block.children)) {
    return { default: block.children };
  }
  return {};
};

export const mapWidgetBlockOptions = (
  blocks: unknown[],
  resolveLabel: (type: string) => string,
  depth = 0
): WidgetBlockOption[] => {
  if (!Array.isArray(blocks)) return [];
  const options: WidgetBlockOption[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const record = block as BlockLike;
    if (typeof record.id !== "string" || typeof record.type !== "string") continue;
    const id = record.id.trim();
    const type = record.type.trim();
    if (!id || !type) continue;
    const prefix = depth > 0 ? `${"-- ".repeat(depth)}` : "";
    options.push({
      id,
      type,
      depth,
      label: `${prefix}${resolveLabel(type)}`,
    });
    const slotMap = getSlotMap(record);
    for (const slotBlocks of Object.values(slotMap)) {
      if (!Array.isArray(slotBlocks) || slotBlocks.length === 0) continue;
      options.push(
        ...mapWidgetBlockOptions(slotBlocks, resolveLabel, depth + 1)
      );
    }
  }
  return options;
};

export const buildSlotOptions = (
  slotDefinitions: SlotDefinition[],
  block: BlockLike,
  widgetType?: string | null
): WidgetSlotOption[] => {
  const slotMap = getSlotMap(block);
  const resolvedSlots = resolveWidgetSlotTargets(slotDefinitions, slotMap);

  return resolvedSlots.map((resolvedSlot) => {
    const slot = slotDefinitions.find((item) =>
      isSlotIdMatchingDefinition(item, resolvedSlot.slotId)
    );
    if (!slot) {
      return {
        id: resolvedSlot.slotId,
        label: resolvedSlot.label,
        count: Array.isArray(slotMap[resolvedSlot.slotId])
          ? slotMap[resolvedSlot.slotId]!.length
          : 0,
        definitionId: resolvedSlot.definitionId,
        kind: resolvedSlot.kind,
        instanceId: resolvedSlot.instanceId,
        disabled: false,
      };
    }

    const count = Array.isArray(slotMap[resolvedSlot.slotId])
      ? slotMap[resolvedSlot.slotId]!.length
      : 0;
    const isFixed = getWidgetSlotKind(slot) === "fixed";
    const isFull =
      isFixed &&
      typeof slot.maxItems === "number" &&
      count >= slot.maxItems;
    const isAllowed =
      !slot.allowedTypes ||
      slot.allowedTypes.length === 0 ||
      (widgetType ? slot.allowedTypes.includes(widgetType) : false);
    const disabled = isFull || !isAllowed;
    const reason = isFull
      ? "Slot is full"
      : !isAllowed
        ? "Widget type not allowed"
        : undefined;
    const parsed = parseRepeatableSlotId(resolvedSlot.slotId);
    return {
      id: resolvedSlot.slotId,
      label: resolvedSlot.label,
      count,
      definitionId: slot.id,
      kind: getWidgetSlotKind(slot),
      instanceId: parsed?.instanceId,
      maxItems: isFixed ? slot.maxItems : undefined,
      allowedTypes: slot.allowedTypes,
      disabled,
      reason,
    };
  });
};
