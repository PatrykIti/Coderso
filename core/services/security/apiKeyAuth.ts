import { verifyApiKeyToken } from "./apiKeysService";

export function parseBearerToken(authorization?: string | null) {
  if (!authorization) return null;
  const [scheme, token] = authorization.trim().split(/\s+/);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}

export async function authenticateApiKey(authorization?: string | null) {
  const token = parseBearerToken(authorization);
  if (!token) return null;
  return verifyApiKeyToken(token);
}

