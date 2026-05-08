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

export function writeBindingPathValue(source: unknown, path: string, value: unknown): unknown {
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
    const resolvedChild = writeAt(nextContainer, index + 1);

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
