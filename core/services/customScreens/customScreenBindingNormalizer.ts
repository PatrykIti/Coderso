import type {
  CustomScreenBinding,
  CustomScreenBindingMode,
  CustomScreenDefinitionContext,
  ScreenBindingWarningSink,
  ScreenFieldBinding,
} from "./customScreenContracts";
import {
  SCREEN_BINDING_ID_MAX,
  bindingModes,
  buildScreenFieldBindingId,
  canonicalizeScreenBindingId,
  getAllowedBindingFieldRoots,
  isRecord,
  normalizeBindingMode,
  normalizePath,
  normalizeScreenPath,
  normalizeText,
  normalizeUniqueIds,
  rejectUnknownKeys,
  slugify,
} from "./customScreenNormalizationPrimitives";
import type { ScreenBindingNormalizeMode } from "./customScreenNormalizationPrimitives";

// TASK-505-01 (Item B): a missing-content-type-field binding (fieldRoot ∉ live schema) is
// PRUNED + recorded when a `sink` is threaded (write=warn, ForRead=discard — both non-fatal
// → recoverable Save), returning null to signal "drop me". Only when NO sink is threaded does
// the field-orphan case keep the bare throw. Genuinely-malformed bindings (non-record, no
// blockId, bad source/mode, unknown KEY) STILL throw regardless of the sink.
export const normalizeScreenFieldBinding = (
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink,
  mode: ScreenBindingNormalizeMode = "write"
): ScreenFieldBinding | null => {
  if (!isRecord(value)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(
    value,
    mode === "write"
      ? ["id", "blockId", "propPath", "source", "field", "mode"]
      : ["id", "blockId", "widgetId", "propPath", "source", "field", "mode"]
  );
  const hasBlockId = Object.prototype.hasOwnProperty.call(value, "blockId");
  const hasWidgetId = Object.prototype.hasOwnProperty.call(value, "widgetId");
  if (mode === "compatibility-write" && hasBlockId === hasWidgetId) {
    throw new Error("custom_screen_definition_invalid");
  }
  const blockId = normalizeScreenPath(value.blockId ?? value.widgetId, mode);
  const propPath = normalizeScreenPath(value.propPath, mode);
  const field = normalizeScreenPath(value.field, mode);
  const hasSource = Object.prototype.hasOwnProperty.call(value, "source");
  if (mode === "write" && (!hasSource || value.source !== "entry")) {
    throw new Error("custom_screen_definition_invalid");
  }
  if (mode === "compatibility-write" && hasSource && value.source !== "entry") {
    throw new Error("custom_screen_definition_invalid");
  }
  if (mode === "stored-read") {
    const source = normalizeText(value.source) ?? "entry";
    if (source !== "entry") throw new Error("custom_screen_definition_invalid");
  }
  const hasExplicitId = Object.prototype.hasOwnProperty.call(value, "id");
  const explicitId = hasExplicitId ? normalizeText(value.id) : null;
  const normalizedExplicitId = explicitId ? slugify(explicitId) : null;
  if (
    mode !== "stored-read" &&
    hasExplicitId &&
    (typeof value.id !== "string" ||
      !normalizedExplicitId ||
      value.id !== normalizedExplicitId ||
      normalizedExplicitId.length > SCREEN_BINDING_ID_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  const id = normalizedExplicitId
    ? canonicalizeScreenBindingId(normalizedExplicitId)
    : buildScreenFieldBindingId(blockId, propPath);
  const hasMode = Object.prototype.hasOwnProperty.call(value, "mode");
  let bindingMode: CustomScreenBindingMode;
  if (mode === "stored-read") {
    bindingMode = normalizeBindingMode(value.mode);
  } else if (!hasMode) {
    bindingMode = "readwrite";
  } else if (
    typeof value.mode === "string" &&
    bindingModes.has(value.mode as CustomScreenBindingMode)
  ) {
    bindingMode = value.mode as CustomScreenBindingMode;
  } else {
    throw new Error("custom_screen_definition_invalid");
  }
  const fieldRoot = field.split(".")[0] ?? field;
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);
  if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
    if (sink) {
      sink.removedFieldOrphans.push(field); // PRUNE + record (write=warn / ForRead=discarded)
      return null;
    }
    throw new Error("custom_screen_definition_invalid"); // only when NO sink is threaded
  }
  return {
    id,
    blockId,
    propPath,
    source: "entry",
    field,
    mode: bindingMode,
  };
};

export const isCustomScreenDefinitionInvalidError = (error: unknown): error is Error =>
  error instanceof Error && error.message === "custom_screen_definition_invalid";

export const normalizeScreenFieldBindingsWithMode = (
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink,
  mode: ScreenBindingNormalizeMode = "write"
): ScreenFieldBinding[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("custom_screen_definition_invalid");
  const bindings = value.flatMap((item) => {
    try {
      const binding = normalizeScreenFieldBinding(item, context, sink, mode);
      return binding ? [binding] : [];
    } catch (error) {
      if (mode !== "stored-read" || !isCustomScreenDefinitionInvalidError(error)) {
        throw error;
      }
      return [];
    }
  });
  return normalizeUniqueIds(bindings);
};

export function normalizeScreenFieldBindings(
  value: unknown,
  context?: CustomScreenDefinitionContext,
  sink?: ScreenBindingWarningSink
): ScreenFieldBinding[] {
  return normalizeScreenFieldBindingsWithMode(value, context, sink, "compatibility-write");
}

export const migrateCustomScreenBindingToScreenFieldBinding = (
  binding: CustomScreenBinding
): ScreenFieldBinding => ({
  id: binding.id,
  blockId: binding.widgetId,
  propPath: binding.propPath,
  source: "entry",
  field: binding.field,
  mode: binding.mode,
});

export const projectScreenFieldBindingToCustomScreenBinding = (
  binding: ScreenFieldBinding
): CustomScreenBinding => ({
  id: binding.id,
  widgetId: binding.blockId,
  propPath: binding.propPath,
  field: binding.field,
  mode: binding.mode,
});

export const normalizeCustomScreenBinding = (
  item: unknown,
  index: number,
  context?: CustomScreenDefinitionContext
): CustomScreenBinding => {
  const allowedFieldRoots = getAllowedBindingFieldRoots(context);
  if (!isRecord(item)) throw new Error("custom_screen_definition_invalid");

  const widgetId = normalizeText(item.widgetId);
  if (!widgetId) throw new Error("custom_screen_definition_invalid");

  const propPath = normalizePath(item.propPath);
  const field = normalizePath(item.field);
  const fieldRoot = field.split(".")[0] ?? field;
  if (allowedFieldRoots && !allowedFieldRoots.has(fieldRoot)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const mode = normalizeBindingMode(item.mode);
  const explicitId = normalizeText(item.id);
  const id = explicitId
    ? slugify(explicitId) || `binding-${index + 1}`
    : buildScreenFieldBindingId(widgetId, propPath);

  return {
    id,
    widgetId,
    propPath,
    field,
    mode,
  };
};

export const assertUniqueCustomScreenBindingIds = (bindings: CustomScreenBinding[]) => {
  const ids = new Set<string>();
  bindings.forEach((binding) => {
    if (ids.has(binding.id)) {
      throw new Error("custom_screen_definition_invalid");
    }
    ids.add(binding.id);
  });
  return bindings;
};

export function normalizeCustomScreenBindings(
  value: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenBinding[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("custom_screen_definition_invalid");
  }

  const normalized = value.map((item, index) => normalizeCustomScreenBinding(item, index, context));

  return assertUniqueCustomScreenBindingIds(normalized);
}

export const normalizeCustomScreenBindingsForRead = (
  value: unknown,
  context?: CustomScreenDefinitionContext
): CustomScreenBinding[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("custom_screen_definition_invalid");

  const bindings = value.flatMap((item, index) => {
    try {
      return [normalizeCustomScreenBinding(item, index, context)];
    } catch (error) {
      if (!isCustomScreenDefinitionInvalidError(error)) throw error;
      if (context === undefined) return [];
      try {
        return [normalizeCustomScreenBinding(item, index)];
      } catch (fallbackError) {
        if (!isCustomScreenDefinitionInvalidError(fallbackError)) throw fallbackError;
        return [];
      }
    }
  });

  return assertUniqueCustomScreenBindingIds(bindings);
};
