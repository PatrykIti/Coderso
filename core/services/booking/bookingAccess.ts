export type BookingAccessMode = "public" | "internal";

const allowedModes = new Set<BookingAccessMode>(["public", "internal"]);

export const bookingAccessDefaults = {
  mode: "public" as BookingAccessMode,
  requiredApiKeyScope: "booking.submit",
};

export function normalizeBookingAccessMode(
  value: unknown,
  fallback: BookingAccessMode = bookingAccessDefaults.mode
): BookingAccessMode {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && allowedModes.has(value as BookingAccessMode)) {
    return value as BookingAccessMode;
  }
  throw new Error("booking_submission_access_invalid");
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function resolveBookingAccessModeFromSettings(
  settings: unknown,
  fallback: BookingAccessMode = bookingAccessDefaults.mode
): BookingAccessMode {
  if (!isRecord(settings)) {
    return fallback;
  }
  return normalizeBookingAccessMode(settings.submissionAccess, fallback);
}

export function applyBookingAccessModeToSettings(
  settings: unknown,
  mode: BookingAccessMode
): Record<string, unknown> {
  const normalizedMode = normalizeBookingAccessMode(mode, bookingAccessDefaults.mode);
  const base = isRecord(settings) ? settings : {};
  return {
    ...base,
    submissionAccess: normalizedMode,
  };
}

export type BookingAccessEvaluation = {
  allow: boolean;
  requireCaptcha: boolean;
  reason?: "auth_required" | "forbidden";
};

export function evaluateBookingAccess(params: {
  mode: BookingAccessMode;
  isAuthenticated: boolean;
  apiKeyScopes?: string[] | null;
  requiredApiKeyScope?: string;
}): BookingAccessEvaluation {
  const requiredScope = params.requiredApiKeyScope ?? bookingAccessDefaults.requiredApiKeyScope;

  if (params.mode === "public") {
    return { allow: true, requireCaptcha: true };
  }

  if (params.isAuthenticated) {
    return { allow: true, requireCaptcha: false };
  }

  if (Array.isArray(params.apiKeyScopes)) {
    if (params.apiKeyScopes.includes(requiredScope)) {
      return { allow: true, requireCaptcha: false };
    }
    return { allow: false, requireCaptcha: false, reason: "forbidden" };
  }

  return { allow: false, requireCaptcha: false, reason: "auth_required" };
}
