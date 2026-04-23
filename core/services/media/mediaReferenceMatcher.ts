const mediaKeyNames = new Set([
  "assetId",
  "backgroundMediaId",
  "featuredMediaId",
  "heroImage",
  "heroMediaId",
  "image",
  "imageId",
  "media",
  "mediaId",
  "thumbnailMediaId",
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const containsMediaReference = (value: unknown, mediaId: string): boolean => {
  if (value === mediaId) return true;
  if (Array.isArray(value)) {
    return value.some((entry) => containsMediaReference(entry, mediaId));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
      if (mediaKeyNames.has(key) && entry === mediaId) return true;
      return containsMediaReference(entry, mediaId);
    });
  }
  if (typeof value === "string") {
    const escaped = escapeRegExp(mediaId);
    const dataMediaIdPattern = new RegExp(`data-media-id=["']${escaped}["']`);
    return dataMediaIdPattern.test(value);
  }
  return false;
};
