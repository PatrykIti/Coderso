const detailPageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeDetailPageIdText = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export const isDetailPageIdFormat = (value: string) => detailPageIdPattern.test(value);

export const normalizeOptionalDetailPageId = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const normalized = normalizeDetailPageIdText(value);
  if (!normalized) return null;
  if (!isDetailPageIdFormat(normalized)) {
    throw new Error("settings_value_invalid");
  }
  return normalized;
};
