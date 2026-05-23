export function resolveDevAssetUrl(baseUrl: string | undefined, assetPath: string) {
  if (!baseUrl) return null;
  try {
    const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(assetPath.replace(/^\//, ""), normalized).toString();
  } catch {
    return null;
  }
}

export function resolveSiteDevServerUrl(
  explicitSiteUrl: string | undefined,
  adminDevUrl: string | undefined
) {
  const normalizeBaseUrl = (value: string) => {
    const url = new URL(value);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  };

  if (explicitSiteUrl) {
    try {
      return normalizeBaseUrl(explicitSiteUrl);
    } catch {
      return null;
    }
  }
  if (!adminDevUrl) return null;

  try {
    const url = new URL(adminDevUrl);
    if (url.port) {
      const nextPort = Number.parseInt(url.port, 10) + 1;
      if (Number.isFinite(nextPort) && nextPort > 0) {
        url.port = String(nextPort);
      }
    }
    return normalizeBaseUrl(url.toString());
  } catch {
    return null;
  }
}

export const resolveDevCssUrl = resolveDevAssetUrl;
