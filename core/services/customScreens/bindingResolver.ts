import type { WidgetBlock } from "../../widgets/types";

import type { CustomScreenBinding } from "./customScreenSchemas";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isArrayIndex = (segment: string) => /^[0-9]+$/.test(segment);

export const splitBindingPath = (path: string) =>
  path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

export function readBindingPathValue(source: unknown, path: string): unknown {
  const segments = splitBindingPath(path);
  let current = source;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!isArrayIndex(segment)) return undefined;
      current = current[Number(segment)];
      continue;
    }
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }

  return current;
}

export function writeBindingPathValue(
  source: unknown,
  path: string,
  value: unknown
): unknown {
  const segments = splitBindingPath(path);
  if (segments.length === 0) return source;

  const writeAt = (current: unknown, index: number): unknown => {
    const segment = segments[index];
    if (segment === undefined) return current;

    if (index === segments.length - 1) {
      if (Array.isArray(current)) {
        const next = [...current];
        if (!isArrayIndex(segment)) return current;
        next[Number(segment)] = value;
        return next;
      }

      const next = isRecord(current) ? { ...current } : {};
      next[segment] = value;
      return next;
    }

    const nextContainer =
      Array.isArray(current) && isArrayIndex(segment)
        ? current[Number(segment)]
        : isRecord(current)
          ? current[segment]
          : undefined;
    const resolvedChild = writeAt(
      nextContainer,
      index + 1
    );

    if (Array.isArray(current)) {
      if (!isArrayIndex(segment)) return current;
      const next = [...current];
      next[Number(segment)] = resolvedChild;
      return next;
    }

    const next = isRecord(current) ? { ...current } : {};
    next[segment] = resolvedChild;
    return next;
  };

  return writeAt(source, 0);
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
    return writeBindingPathValue(current, binding.propPath, nextValue) as Record<
      string,
      unknown
    >;
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
    return writeBindingPathValue(current, binding.field, nextValue) as Record<
      string,
      unknown
    >;
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

export function collectBindingPropPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectBindingPropPaths(item, prefix ? `${prefix}.${String(index)}` : String(index))
    );
  }

  if (!isRecord(value)) {
    return prefix ? [prefix] : [];
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return prefix ? [prefix] : [];
  }

  return entries.flatMap(([key, nested]) =>
    collectBindingPropPaths(nested, prefix ? `${prefix}.${key}` : key)
  );
}

export function collectWritableBindingFields(bindings: CustomScreenBinding[]) {
  return Array.from(
    new Set(
      bindings
        .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
        .map((binding) => binding.field)
    )
  );
}
