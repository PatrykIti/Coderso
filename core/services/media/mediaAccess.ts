export type MediaDeliveryAccessMode = "public" | "internal";

const allowedModes = new Set<MediaDeliveryAccessMode>(["public", "internal"]);

export const mediaAccessDefaults = {
  mode: "public" as MediaDeliveryAccessMode,
  requiredApiKeyScope: "media.read",
};

export function normalizeMediaDeliveryAccessMode(
  value: unknown,
  fallback: MediaDeliveryAccessMode = mediaAccessDefaults.mode
): MediaDeliveryAccessMode {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && allowedModes.has(value as MediaDeliveryAccessMode)) {
    return value as MediaDeliveryAccessMode;
  }
  throw new Error("media_access_invalid");
}

export type MediaAccessEvaluation = {
  allow: boolean;
  reason?: "auth_required" | "forbidden";
};

export function evaluateMediaAccess(params: {
  mode: MediaDeliveryAccessMode;
  isAuthenticated: boolean;
  apiKeyScopes?: string[] | null;
  requiredApiKeyScope?: string;
}): MediaAccessEvaluation {
  const requiredScope = params.requiredApiKeyScope ?? mediaAccessDefaults.requiredApiKeyScope;

  if (params.mode === "public") {
    return { allow: true };
  }

  if (params.isAuthenticated) {
    return { allow: true };
  }

  if (Array.isArray(params.apiKeyScopes)) {
    if (params.apiKeyScopes.includes(requiredScope)) {
      return { allow: true };
    }
    return { allow: false, reason: "forbidden" };
  }

  return { allow: false, reason: "auth_required" };
}
