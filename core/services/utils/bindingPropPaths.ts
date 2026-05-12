const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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
