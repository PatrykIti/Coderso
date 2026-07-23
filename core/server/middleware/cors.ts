import type { SecuritySettings } from "../../services/settings/securitySettings";

export type CorsResult = {
  allowed: boolean;
  origin?: string;
};

const resolveDevOrigin = () => {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (!devUrl) return null;
  try {
    return new URL(devUrl).origin.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeOrigin = (origin: string) => origin.toLowerCase();

const REQUIRED_ADMIN_CORS_HEADERS = ["x-coderso-expected-user-id"] as const;

const resolveAllowedCorsHeaders = (configured: readonly string[]): string[] => {
  const required = new Set<string>(REQUIRED_ADMIN_CORS_HEADERS);
  const seenRequired = new Set<string>();
  const allowed: string[] = [];

  for (const header of configured) {
    const normalized = header.toLowerCase();
    if (required.has(normalized)) {
      if (seenRequired.has(normalized)) continue;
      seenRequired.add(normalized);
    }
    allowed.push(header);
  }

  for (const header of REQUIRED_ADMIN_CORS_HEADERS) {
    if (!seenRequired.has(header)) allowed.push(header);
  }
  return allowed;
};

const buildAllowedOriginMap = (origins: string[]) => {
  const allowed = new Map<string, string>();
  for (const origin of origins) {
    const trimmed = origin.trim();
    if (!trimmed) continue;
    if (trimmed === "*") {
      allowed.set("*", "*");
      continue;
    }
    allowed.set(normalizeOrigin(trimmed), trimmed);
  }
  return allowed;
};

export function applyCorsHeaders(
  req: Request,
  headers: Headers,
  config: SecuritySettings["cors"]
): CorsResult {
  const origin = req.headers.get("origin");
  if (!origin) return { allowed: false };

  const allowedOrigins = buildAllowedOriginMap(config.allowedOrigins);
  const devOrigin = resolveDevOrigin();
  if (devOrigin) allowedOrigins.set(devOrigin, devOrigin);

  const normalizedOrigin = normalizeOrigin(origin);
  const allowAny = allowedOrigins.has("*");
  const allowedOrigin = allowAny ? "*" : allowedOrigins.get(normalizedOrigin);
  if (!allowedOrigin) return { allowed: false, origin };

  // nosemgrep: javascript.express.security.cors-misconfiguration.cors-misconfiguration -- allowedOrigin is selected from configured trusted origins or literal "*" after validation, not reflected directly from the request header.
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", config.allowedMethods.join(", "));
  headers.set(
    "Access-Control-Allow-Headers",
    resolveAllowedCorsHeaders(config.allowedHeaders).join(", ")
  );
  headers.set("Access-Control-Max-Age", String(config.maxAgeSeconds));
  if (config.allowCredentials && !allowAny) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  headers.append("Vary", "Origin");

  return { allowed: true, origin };
}
