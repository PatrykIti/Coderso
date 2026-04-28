export type PublicUrlContext = {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  protocol?: string | null;
};

type PublicBaseUrlSources = {
  settingValue: unknown;
  envValue: string | undefined;
  context?: PublicUrlContext;
};

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!isHttpProtocol(parsed.protocol)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeHost(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const first = value
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  if (!first) return null;
  if (first.includes("/") || first.includes(" ")) return null;
  try {
    const parsed = new URL(`http://${first}`);
    return parsed.host;
  } catch {
    return null;
  }
}

function normalizeProto(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const first = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .find(Boolean);
  if (!first) return null;
  const normalized = first.endsWith(":") ? first : `${first}:`;
  return isHttpProtocol(normalized) ? normalized.slice(0, -1) : null;
}

function readHostname(host: string) {
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return host.toLowerCase();
  }
}

function isLoopbackHost(host: string | null) {
  if (!host) return false;
  const hostname = readHostname(host);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveProtocol(context: PublicUrlContext | undefined, host: string | null) {
  const candidates = [context?.forwardedProto, context?.protocol];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    if (!candidate.trim()) continue;
    const normalized = normalizeProto(candidate);
    if (!normalized) return null;
    return normalized;
  }
  return isLoopbackHost(host) ? "http" : "https";
}

export function resolvePublicBaseUrlFromSources(
  sources: PublicBaseUrlSources
): string | null {
  const settingBaseUrl = normalizeHttpUrl(sources.settingValue);
  if (settingBaseUrl) return settingBaseUrl;

  const envBaseUrl = normalizeHttpUrl(sources.envValue);
  if (envBaseUrl) return envBaseUrl;

  const host =
    normalizeHost(sources.context?.forwardedHost) ??
    normalizeHost(sources.context?.host);
  if (!host) return null;

  const protocol = resolveProtocol(sources.context, host);
  if (!protocol) return null;

  return `${protocol}://${host}/`;
}

export async function resolvePublicBaseUrl(
  context?: PublicUrlContext
): Promise<string | null> {
  const { getSetting } = await import("../../services/settings/settingsService");
  const settingValue = await getSetting("site.publicBaseUrl");
  return resolvePublicBaseUrlFromSources({
    settingValue,
    envValue: process.env.PUBLIC_BASE_URL,
    context,
  });
}

export function buildAbsolutePublicUrl(baseUrl: string | null, path: string): string {
  if (!baseUrl) return path;
  return new URL(path, baseUrl).toString();
}
