import type { WidgetDefinition } from "./types";

const registry = new Map<string, WidgetDefinition<any>>();

const coreTypePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pluginTypePattern =
  /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidType(type: string) {
  return coreTypePattern.test(type) || pluginTypePattern.test(type);
}

export function registerWidget(def: WidgetDefinition<any>) {
  if (!def || typeof def !== "object") {
    throw new Error("widget_definition_required");
  }
  if (!isValidType(def.type)) {
    throw new Error("widget_type_invalid");
  }
  if (!def.variants || def.variants.length === 0) {
    throw new Error("widget_variants_required");
  }
  for (const variant of def.variants) {
    if (!variant.id || !variant.label) {
      throw new Error("widget_variant_invalid");
    }
  }
  if (!def.schema || typeof def.schema !== "object" || Array.isArray(def.schema)) {
    throw new Error("widget_schema_invalid");
  }
  if (!def.defaults || typeof def.defaults !== "object" || Array.isArray(def.defaults)) {
    throw new Error("widget_defaults_invalid");
  }
  if (
    def.canHaveChildren !== undefined &&
    typeof def.canHaveChildren !== "boolean"
  ) {
    throw new Error("widget_children_flag_invalid");
  }
  if (def.slots !== undefined) {
    if (!Array.isArray(def.slots)) {
      throw new Error("widget_slots_invalid");
    }
    const slotIds = new Set<string>();
    for (const slot of def.slots) {
      if (!slot || typeof slot !== "object") {
        throw new Error("widget_slots_invalid");
      }
      if (!slot.id || typeof slot.id !== "string") {
        throw new Error("widget_slot_id_invalid");
      }
      if (!slot.label || typeof slot.label !== "string") {
        throw new Error("widget_slot_label_invalid");
      }
      const trimmedId = slot.id.trim();
      if (!trimmedId) {
        throw new Error("widget_slot_id_invalid");
      }
      if (slotIds.has(trimmedId)) {
        throw new Error("widget_slot_duplicate");
      }
      slotIds.add(trimmedId);
      if (
        slot.maxItems !== undefined &&
        (!Number.isFinite(slot.maxItems) || slot.maxItems <= 0)
      ) {
        throw new Error("widget_slot_max_invalid");
      }
      if (
        slot.allowedTypes !== undefined &&
        (!Array.isArray(slot.allowedTypes) ||
          slot.allowedTypes.some(
            (value) => typeof value !== "string" || !value.trim()
          ))
      ) {
        throw new Error("widget_slot_allowed_invalid");
      }
    }
  }
  if (!def.editor?.wizard || !def.editor?.visual || !def.editor?.advanced) {
    throw new Error("widget_editor_invalid");
  }
  if (typeof def.render !== "function") {
    throw new Error("widget_render_invalid");
  }
  if (registry.has(def.type)) {
    throw new Error("widget_already_registered");
  }
  registry.set(def.type, def);
}

export function getWidget(type: string): WidgetDefinition<any> | null {
  return registry.get(type) ?? null;
}

export function listWidgets(): WidgetDefinition<any>[] {
  return Array.from(registry.values());
}

export function clearWidgets() {
  registry.clear();
}
