import type { WidgetDefinition, WidgetSurface } from "./types";
import { getWidgetSlotKind } from "./slots";
import {
  listWidgetPackMatrix,
  type ModuleWidgetPackDefinition,
  type WidgetPackEnforcement,
} from "./modulePackMatrix";

const registry = new Map<string, WidgetDefinition<any>>();

const coreTypePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pluginTypePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const widgetComplexityValues = new Set(["composite", "atomic"]);
const widgetAudienceValues = new Set(["beginner", "intermediate", "advanced"]);
const widgetSurfaceValues = new Set<WidgetSurface>([
  "page-builder",
  "widget-library",
  "custom-screen-builder",
  "admin-list-view",
  "admin-editor-view",
]);
const defaultWidgetSurfaces: WidgetSurface[] = ["page-builder", "widget-library"];
const widgetDataAccessSources = new Set(["none", "selected-content-type", "selected-entry"]);
const widgetDataAccessModes = new Set(["read", "write"]);

export type ModulePackStatus = {
  module: string;
  label: string;
  enforcement: WidgetPackEnforcement;
  minimum: {
    pagePresets: number;
    sectionPresets: number;
    compositeWidgets: number;
  };
  counts: {
    pagePresets: number;
    sectionPresets: number;
    compositeWidgets: number;
  };
  missing: {
    pagePresets: number;
    sectionPresets: number;
    compositeWidgets: number;
    compositeWidgetRefs: string[];
  };
  valid: boolean;
  notes?: string;
};

function normalizeWidgetSurfaces(value: unknown): WidgetSurface[] {
  if (value === undefined) {
    return [...defaultWidgetSurfaces];
  }
  if (!Array.isArray(value)) {
    throw new Error("widget_surfaces_invalid");
  }

  const normalized = Array.from(
    new Set(
      value.map((entry) => {
        if (typeof entry !== "string") {
          throw new Error("widget_surfaces_invalid");
        }
        const surface = entry.trim() as WidgetSurface;
        if (!widgetSurfaceValues.has(surface)) {
          throw new Error("widget_surfaces_invalid");
        }
        return surface;
      })
    )
  );

  if (normalized.length === 0) {
    throw new Error("widget_surfaces_invalid");
  }

  return normalized;
}

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
  const normalizedComplexity =
    def.complexity ?? (def.category === "layout" ? "atomic" : "composite");
  if (!widgetComplexityValues.has(normalizedComplexity)) {
    throw new Error("widget_complexity_invalid");
  }
  const normalizedAudience =
    def.audience ?? (normalizedComplexity === "atomic" ? "advanced" : "beginner");
  if (!widgetAudienceValues.has(normalizedAudience)) {
    throw new Error("widget_audience_invalid");
  }
  if (typeof def.module === "string" && !def.module.trim()) {
    throw new Error("widget_module_invalid");
  }
  const normalizedModule = typeof def.module === "string" ? def.module.trim() : def.category;
  if (!normalizedModule) {
    throw new Error("widget_module_invalid");
  }
  if (def.presets !== undefined) {
    if (!Array.isArray(def.presets)) {
      throw new Error("widget_presets_invalid");
    }
    for (const preset of def.presets) {
      if (!preset || typeof preset !== "object" || !preset.id || !preset.label) {
        throw new Error("widget_preset_invalid");
      }
    }
  }
  if (
    def.requires !== undefined &&
    (!Array.isArray(def.requires) ||
      def.requires.some((value) => typeof value !== "string" || !value.trim()))
  ) {
    throw new Error("widget_requires_invalid");
  }
  const normalizedSurfaces = normalizeWidgetSurfaces(def.surfaces);
  if (def.dataAccess !== undefined) {
    if (!def.dataAccess || typeof def.dataAccess !== "object") {
      throw new Error("widget_data_access_invalid");
    }
    if (!widgetDataAccessSources.has(def.dataAccess.source)) {
      throw new Error("widget_data_access_invalid");
    }
    if (
      !Array.isArray(def.dataAccess.modes) ||
      def.dataAccess.modes.length === 0 ||
      def.dataAccess.modes.some((mode) => !widgetDataAccessModes.has(mode))
    ) {
      throw new Error("widget_data_access_invalid");
    }
  }
  if (!def.schema || typeof def.schema !== "object" || Array.isArray(def.schema)) {
    throw new Error("widget_schema_invalid");
  }
  if (!def.defaults || typeof def.defaults !== "object" || Array.isArray(def.defaults)) {
    throw new Error("widget_defaults_invalid");
  }
  if (def.canHaveChildren !== undefined && typeof def.canHaveChildren !== "boolean") {
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
        (!Number.isFinite(slot.maxItems) ||
          slot.maxItems <= 0 ||
          Math.floor(slot.maxItems) !== slot.maxItems)
      ) {
        throw new Error("widget_slot_max_invalid");
      }
      if (
        slot.minItems !== undefined &&
        (!Number.isFinite(slot.minItems) ||
          slot.minItems < 0 ||
          Math.floor(slot.minItems) !== slot.minItems)
      ) {
        throw new Error("widget_slot_min_invalid");
      }
      const kind = getWidgetSlotKind(slot);
      if (slot.kind !== undefined && kind !== slot.kind) {
        throw new Error("widget_slot_kind_invalid");
      }
      if (kind === "fixed" && slot.minItems !== undefined) {
        throw new Error("widget_slot_min_unsupported");
      }
      if (
        slot.minItems !== undefined &&
        slot.maxItems !== undefined &&
        slot.minItems > slot.maxItems
      ) {
        throw new Error("widget_slot_min_max_invalid");
      }
      if (
        slot.allowedTypes !== undefined &&
        (!Array.isArray(slot.allowedTypes) ||
          slot.allowedTypes.some((value) => typeof value !== "string" || !value.trim()))
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
  registry.set(def.type, {
    ...def,
    complexity: normalizedComplexity,
    audience: normalizedAudience,
    module: normalizedModule,
    presets: def.presets ?? [],
    requires: def.requires ?? [],
    surfaces: normalizedSurfaces,
    dataAccess: def.dataAccess
      ? {
          source: def.dataAccess.source,
          modes: Array.from(new Set(def.dataAccess.modes)),
        }
      : undefined,
  });
}

export function getWidget(type: string): WidgetDefinition<any> | null {
  return registry.get(type) ?? null;
}

export function listWidgets(): WidgetDefinition<any>[] {
  return Array.from(registry.values());
}

export function listWidgetsForSurface(surface: WidgetSurface): WidgetDefinition<any>[] {
  return listWidgets().filter((widget) => widget.surfaces?.includes(surface));
}

export function listWidgetsForSurfaceContext(input: {
  surface: WidgetSurface;
  hasSelectedContentType?: boolean;
}): WidgetDefinition<any>[] {
  return listWidgetsForSurface(input.surface).filter((widget) => {
    if (widget.dataAccess?.source === "selected-content-type") {
      return input.hasSelectedContentType === true;
    }
    if (widget.dataAccess?.source === "selected-entry") {
      return input.surface === "admin-editor-view" && input.hasSelectedContentType === true;
    }
    return true;
  });
}

export function clearWidgets() {
  registry.clear();
}

function resolvePackStatus(
  pack: ModuleWidgetPackDefinition,
  widgets: WidgetDefinition<any>[]
): ModulePackStatus {
  const widgetByType = new Map(widgets.map((widget) => [widget.type, widget]));
  const validCompositeRefs = pack.compositeWidgets.filter((type) => {
    const def = widgetByType.get(type);
    return Boolean(def && def.complexity === "composite");
  });
  const missingCompositeRefs = pack.compositeWidgets.filter(
    (type) => !validCompositeRefs.includes(type)
  );

  const counts = {
    pagePresets: pack.pagePresets.length,
    sectionPresets: pack.sectionPresets.length,
    compositeWidgets: validCompositeRefs.length,
  };

  const missing = {
    pagePresets: Math.max(pack.minimum.pagePresets - counts.pagePresets, 0),
    sectionPresets: Math.max(pack.minimum.sectionPresets - counts.sectionPresets, 0),
    compositeWidgets: Math.max(pack.minimum.compositeWidgets - counts.compositeWidgets, 0),
    compositeWidgetRefs: missingCompositeRefs,
  };

  const valid =
    missing.pagePresets === 0 &&
    missing.sectionPresets === 0 &&
    missing.compositeWidgets === 0 &&
    missing.compositeWidgetRefs.length === 0;

  return {
    module: pack.module,
    label: pack.label,
    enforcement: pack.enforcement,
    minimum: {
      pagePresets: pack.minimum.pagePresets,
      sectionPresets: pack.minimum.sectionPresets,
      compositeWidgets: pack.minimum.compositeWidgets,
    },
    counts,
    missing,
    valid,
    notes: pack.notes,
  };
}

export function listModulePackStatus(
  widgets: WidgetDefinition<any>[] = listWidgets()
): ModulePackStatus[] {
  return listWidgetPackMatrix().map((pack) => resolvePackStatus(pack, widgets));
}

export function validateModulePackMatrix(options?: {
  widgets?: WidgetDefinition<any>[];
  strictOnly?: boolean;
}) {
  const strictOnly = options?.strictOnly ?? true;
  const statuses = listModulePackStatus(options?.widgets ?? listWidgets());

  for (const status of statuses) {
    if (strictOnly && status.enforcement !== "strict") continue;
    if (!status.valid) {
      throw new Error(`module_pack_invalid:${status.module}`);
    }
  }

  return statuses;
}
