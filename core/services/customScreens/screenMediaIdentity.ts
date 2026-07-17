const SCREEN_MEDIA_ASSET_UUID: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isScreenMediaAssetUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_MEDIA_ASSET_UUID.test(value);
}
