const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const DEFAULT_PAGE_REVISION_RETENTION = 10;
export const MIN_PAGE_REVISION_RETENTION = 1;
export const MAX_PAGE_REVISION_RETENTION = 100;

export const normalizePageRevisionRetentionValue = (value: unknown) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return DEFAULT_PAGE_REVISION_RETENTION;
  }

  const rounded = Math.floor(numeric);
  if (!Number.isFinite(rounded)) {
    return DEFAULT_PAGE_REVISION_RETENTION;
  }

  return Math.min(
    MAX_PAGE_REVISION_RETENTION,
    Math.max(MIN_PAGE_REVISION_RETENTION, rounded)
  );
};

export const resolvePageRevisionRetention = (data: Record<string, unknown>) => {
  const settings = isRecord(data.settings) ? data.settings : {};
  return normalizePageRevisionRetentionValue(settings.revisionRetention);
};
