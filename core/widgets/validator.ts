import Ajv, { type ValidateFunction } from "ajv";

import { getWidget } from "./registry";
import type { WidgetBlock, WidgetDefinition } from "./types";
import {
  buildRepeatableSlotId,
  getNextRepeatableSlotInstanceId,
  getRepeatableSlotIds,
  getWidgetSlotKind,
} from "./slots";

const ajv = new Ajv({ allErrors: true, strict: true });
const validators = new Map<string, ValidateFunction>();

function getValidator(def: WidgetDefinition<any>) {
  const cached = validators.get(def.type);
  if (cached) return cached;
  const compiled = ajv.compile(def.schema);
  validators.set(def.type, compiled);
  return compiled;
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeSlotMap(block: WidgetBlock) {
  const slots = block.slots;
  if (slots && typeof slots === "object" && !Array.isArray(slots)) {
    const normalized: Record<string, WidgetBlock[]> = {};
    for (const [key, value] of Object.entries(slots)) {
      const slotId = key.trim();
      if (!slotId) continue;
      normalized[slotId] = Array.isArray(value) ? (value as WidgetBlock[]) : [];
    }
    return normalized;
  }

  if (Array.isArray(block.children)) {
    return { default: block.children };
  }

  return undefined;
}

function normalizeSlotsForDefinition(
  def: WidgetDefinition<any>,
  slotMap: Record<string, WidgetBlock[]> | undefined
) {
  if (!Array.isArray(def.slots) || def.slots.length === 0) return slotMap;

  const normalized: Record<string, WidgetBlock[]> = {
    ...(slotMap ?? {}),
  };
  for (const slot of def.slots) {
    if (getWidgetSlotKind(slot) === "fixed") {
      normalized[slot.id] = normalized[slot.id] ?? [];
      continue;
    }

    const legacyItems = normalized[slot.id];
    const repeatableIds = getRepeatableSlotIds(slot, normalized);
    if (Array.isArray(legacyItems)) {
      if (repeatableIds.length === 0) {
        normalized[buildRepeatableSlotId(slot.id, "1")] = legacyItems;
      } else {
        const first = repeatableIds[0]!;
        normalized[first] = [...(normalized[first] ?? []), ...legacyItems];
      }
      delete normalized[slot.id];
    }

    let instanceIds = getRepeatableSlotIds(slot, normalized);
    const minimum =
      Number.isFinite(slot.minItems) && (slot.minItems ?? 0) > 0
        ? Math.floor(slot.minItems ?? 0)
        : 0;

    while (instanceIds.length < minimum) {
      const nextInstanceId = getNextRepeatableSlotInstanceId(slot.id, normalized);
      const nextSlotId = buildRepeatableSlotId(slot.id, nextInstanceId);
      normalized[nextSlotId] = normalized[nextSlotId] ?? [];
      instanceIds = getRepeatableSlotIds(slot, normalized);
    }

    if (
      Number.isFinite(slot.maxItems) &&
      (slot.maxItems ?? 0) >= 0 &&
      instanceIds.length > Math.floor(slot.maxItems ?? 0)
    ) {
      const keep = new Set(
        instanceIds.slice(0, Math.floor(slot.maxItems ?? 0))
      );
      for (const key of instanceIds) {
        if (!keep.has(key)) delete normalized[key];
      }
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeWidgetBlock(block: WidgetBlock): WidgetBlock {
  const def = getWidget(block.type);
  if (!def) throw new Error("widget_unknown_type");

  const variant = block.variant ?? def.variants[0]?.id;
  if (!variant || !def.variants.some((item) => item.id === variant)) {
    throw new Error("widget_invalid_variant");
  }

  const data = ensureObject(block.data);
  const merged = { ...def.defaults, ...data } as Record<string, unknown>;

  const validate = getValidator(def);
  const valid = validate(merged);
  if (!valid) {
    const details = validate.errors
      ? ajv.errorsText(validate.errors, { separator: "; " })
      : "unknown";
    throw new Error(`widget_schema_invalid: ${details}`);
  }

  const slots = normalizeSlotsForDefinition(def, normalizeSlotMap(block));
  const children = slots ? undefined : Array.isArray(block.children) ? block.children : undefined;

  return {
    ...block,
    variant,
    data: merged,
    children,
    slots,
  };
}

export function normalizeWidgetBlocks(blocks: WidgetBlock[]): WidgetBlock[] {
  return blocks.map((block) => {
    const normalized = normalizeWidgetBlock(block);
    const slots =
      normalized.slots &&
      Object.fromEntries(
        Object.entries(normalized.slots).map(([key, items]) => [
          key,
          normalizeWidgetBlocks(items),
        ])
      );
    const children =
      normalized.slots || !Array.isArray(block.children)
        ? normalized.children
        : normalizeWidgetBlocks(block.children);
    return { ...normalized, slots, children };
  });
}

export function clearWidgetValidators() {
  validators.clear();
}
