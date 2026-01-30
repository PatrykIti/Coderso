export const listToText = (list: string[]) => list.join(", ");

export const parseList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export const parseListWithFallback = (
  value: string,
  fallback: string[],
  allowEmpty = false
) => {
  const parsed = parseList(value);
  if (!parsed.length && !allowEmpty) return fallback;
  return parsed;
};

export const parsePositiveNumber = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}_missing`);
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label}_invalid`);
  return parsed;
};

export const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
