const SCREEN_UUID: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isScreenUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_UUID.test(value);
}

// Compatibility/domain wrapper: media consumers retain their expressive API.
export function isScreenMediaAssetUuid(value: unknown): value is string {
  return isScreenUuid(value);
}

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

export function firstScreenMediaAssetUuid(value: unknown): string | null {
  if (isScreenMediaAssetUuid(value)) return value;
  if (!isUnknownArray(value)) return null;
  return value.find(isScreenMediaAssetUuid) ?? null;
}
