import { apiRequest, type ApiClientError } from "./apiClient";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthSession = {
  expiresAt: string;
};

export type BotProtectionConfig = {
  enabled: boolean;
  provider: "recaptcha_v3";
  siteKey: string | null;
  enforceOnLocalhost: boolean;
};

export type LoginResponse = {
  user: AuthUser;
  session: AuthSession;
};

export async function login(payload: { email: string; password: string; captchaToken?: string }) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  return apiRequest<{ ok: boolean }>("/auth/logout", {
    method: "POST",
  }, { withCsrf: true });
}

export async function me() {
  return apiRequest<{ user: AuthUser }>("/auth/me", { method: "GET" });
}

export async function getAuthBotProtection() {
  return apiRequest<BotProtectionConfig>("/auth/bot-protection", { method: "GET" });
}

export async function verifyOtp(payload: { code?: string; recoveryCode?: string }) {
  return apiRequest<{ ok: boolean }>("/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, { withCsrf: true });
}

export async function requestPasswordReset(payload: { email: string; captchaToken?: string }) {
  return apiRequest<{ ok: boolean }>("/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function confirmPasswordReset(payload: { token: string; password: string }) {
  return apiRequest<{ ok: boolean }>("/auth/reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function toFieldErrors(error: ApiClientError | null) {
  const fields: Record<string, string> = {};
  if (!error?.details) return fields;

  if (Array.isArray(error.details)) {
    for (const item of error.details) {
      if (!item || typeof item !== "object") continue;
      const record = item as { path?: string; message?: string };
      if (record.path && record.message) {
        fields[record.path] = record.message;
      }
    }
    return fields;
  }

  if (typeof error.details === "object" && error.details) {
    const record = error.details as Record<string, unknown>;
    if (record.fields && typeof record.fields === "object") {
      for (const [key, value] of Object.entries(record.fields as Record<string, unknown>)) {
        if (typeof value === "string") fields[key] = value;
      }
    }
  }

  return fields;
}
