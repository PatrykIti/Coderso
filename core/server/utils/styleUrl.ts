export function resolveDevAssetUrl(baseUrl: string | undefined, assetPath: string) {
  if (!baseUrl) return null;
  try {
    const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(assetPath.replace(/^\//, ""), normalized).toString();
  } catch {
    return null;
  }
}

export const resolveDevCssUrl = resolveDevAssetUrl;
