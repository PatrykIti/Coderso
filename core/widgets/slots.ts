import type { WidgetSlotDefinition } from "./types";

const REPEATABLE_SEPARATOR = ":";

export type ResolvedWidgetSlot = {
  definitionId: string;
  slotId: string;
  label: string;
  kind: "fixed" | "repeatable";
  instanceId?: string;
};

export function getWidgetSlotKind(slot: WidgetSlotDefinition): "fixed" | "repeatable" {
  return slot.kind === "repeatable" ? "repeatable" : "fixed";
}

export function isRepeatableWidgetSlot(slot: WidgetSlotDefinition): boolean {
  return getWidgetSlotKind(slot) === "repeatable";
}

export function buildRepeatableSlotId(slotId: string, instanceId: string): string {
  return `${slotId.trim()}${REPEATABLE_SEPARATOR}${instanceId.trim()}`;
}

export function parseRepeatableSlotId(slotId: string): {
  definitionId: string;
  instanceId: string;
} | null {
  const normalized = slotId.trim();
  const separatorIndex = normalized.indexOf(REPEATABLE_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === normalized.length - 1) {
    return null;
  }
  const definitionId = normalized.slice(0, separatorIndex).trim();
  const instanceId = normalized.slice(separatorIndex + 1).trim();
  if (!definitionId || !instanceId) return null;
  return { definitionId, instanceId };
}

export function isSlotIdMatchingDefinition(slot: WidgetSlotDefinition, slotId: string): boolean {
  if (getWidgetSlotKind(slot) === "fixed") return slot.id === slotId;
  const parsed = parseRepeatableSlotId(slotId);
  return parsed?.definitionId === slot.id;
}

export function getRepeatableSlotIds(
  slot: WidgetSlotDefinition,
  slotMap: Record<string, unknown>
): string[] {
  if (!isRepeatableWidgetSlot(slot)) return [];
  const ids: string[] = [];
  for (const key of Object.keys(slotMap)) {
    const parsed = parseRepeatableSlotId(key);
    if (parsed?.definitionId === slot.id) ids.push(key);
  }
  return ids;
}

export function getNextRepeatableSlotInstanceId(
  definitionId: string,
  slotMap: Record<string, unknown>
): string {
  const used = new Set<string>();
  for (const key of Object.keys(slotMap)) {
    const parsed = parseRepeatableSlotId(key);
    if (parsed?.definitionId === definitionId) used.add(parsed.instanceId);
  }
  let next = 1;
  while (used.has(String(next))) next += 1;
  return String(next);
}

export function reorderRepeatableSlotMap<T>(
  slotMap: Record<string, T>,
  definitionId: string,
  orderedInstanceIds: string[]
): Record<string, T> {
  const orderedSlotIds = orderedInstanceIds.map((instanceId) =>
    buildRepeatableSlotId(definitionId, instanceId)
  );
  const orderedSet = new Set(orderedSlotIds);
  const nextSlots: Record<string, T> = {};

  for (const slotId of orderedSlotIds) {
    if (slotId in slotMap) {
      nextSlots[slotId] = slotMap[slotId]!;
    }
  }

  for (const slotId of Object.keys(slotMap)) {
    const parsed = parseRepeatableSlotId(slotId);
    if (!parsed || parsed.definitionId !== definitionId) {
      nextSlots[slotId] = slotMap[slotId]!;
      continue;
    }
    if (!orderedSet.has(slotId)) {
      nextSlots[slotId] = slotMap[slotId]!;
    }
  }

  return nextSlots;
}

export function resolveWidgetSlotTargets(
  slots: WidgetSlotDefinition[],
  slotMap: Record<string, unknown>
): ResolvedWidgetSlot[] {
  const result: ResolvedWidgetSlot[] = [];
  for (const slot of slots) {
    if (getWidgetSlotKind(slot) === "fixed") {
      result.push({
        definitionId: slot.id,
        slotId: slot.id,
        label: slot.label,
        kind: "fixed",
      });
      continue;
    }

    const instances = getRepeatableSlotIds(slot, slotMap);
    if (instances.length === 0) {
      const minimum = Number.isFinite(slot.minItems)
        ? Math.max(0, Math.floor(slot.minItems ?? 0))
        : 0;
      for (let index = 0; index < minimum; index += 1) {
        const slotId = buildRepeatableSlotId(slot.id, String(index + 1));
        result.push({
          definitionId: slot.id,
          slotId,
          label: `${slot.label} ${index + 1}`,
          kind: "repeatable",
          instanceId: String(index + 1),
        });
      }
      continue;
    }

    for (let index = 0; index < instances.length; index += 1) {
      const slotId = instances[index]!;
      const parsed = parseRepeatableSlotId(slotId);
      result.push({
        definitionId: slot.id,
        slotId,
        label: `${slot.label} ${index + 1}`,
        kind: "repeatable",
        instanceId: parsed?.instanceId,
      });
    }
  }
  return result;
}
