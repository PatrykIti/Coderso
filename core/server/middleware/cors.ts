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

export function applyCorsHeaders(
  req: Request,
  headers: Headers,
  config: SecuritySettings["cors"]
): CorsResult {
  const origin = req.headers.get("origin");
  if (!origin) return { allowed: false };

  const allowedOrigins = new Set(config.allowedOrigins.map(normalizeOrigin));
  const devOrigin = resolveDevOrigin();
  if (devOrigin) allowedOrigins.add(devOrigin);

  const normalizedOrigin = normalizeOrigin(origin);
  const allowAny = allowedOrigins.has("*");
  const isAllowed = allowAny || allowedOrigins.has(normalizedOrigin);
  if (!isAllowed) return { allowed: false, origin };

  headers.set("Access-Control-Allow-Origin", allowAny ? "*" : origin);
  headers.set("Access-Control-Allow-Methods", config.allowedMethods.join(", "));
  headers.set("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
  headers.set("Access-Control-Max-Age", String(config.maxAgeSeconds));
  if (config.allowCredentials && !allowAny) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  headers.append("Vary", "Origin");

  return { allowed: true, origin };
}
