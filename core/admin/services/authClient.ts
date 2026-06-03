import { apiRequest, type ApiClientError } from "./apiClient";

export type AdminPermissionSnapshotRole = {
  id: string;
  slug: string;
  name: string;
};

export type AdminPermissionSnapshot = {
  permissions: string[];
  roles: AdminPermissionSnapshotRole[];
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  permissionSnapshot: AdminPermissionSnapshot | null;
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

export type AuthBootstrapState = "authenticated" | "unauthenticated";

export type AuthBootstrapResult = {
  state: AuthBootstrapState;
  user: AuthUser | null;
};

let authBootstrapCache: AuthBootstrapResult | null = null;
let authBootstrapPromise: Promise<AuthBootstrapResult> | null = null;

const isAuthBootstrapError = (error: unknown) =>
  error instanceof Error &&
  "status" in error &&
  "code" in error &&
  (Number((error as { status?: unknown }).status) === 401 ||
    Number((error as { status?: unknown }).status) === 403 ||
    String((error as { code?: unknown }).code) === "auth_required");

export const clearAuthBootstrapCache = () => {
  authBootstrapCache = null;
  authBootstrapPromise = null;
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string"))
  ).sort();
};

export const normalizeAdminPermissionSnapshot = (
  value: unknown
): AdminPermissionSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.permissions) || !Array.isArray(record.roles)) return null;
  const roles = record.roles.flatMap((item): AdminPermissionSnapshotRole[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const role = item as Record<string, unknown>;
    if (
      typeof role.id !== "string" ||
      typeof role.slug !== "string" ||
      typeof role.name !== "string"
    ) {
      return [];
    }
    return [{ id: role.id, slug: role.slug, name: role.name }];
  });
  return {
    permissions: normalizeStringArray(record.permissions),
    roles,
  };
};

export const normalizeAuthUser = (value: unknown): AuthUser => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("auth_user_invalid");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.email !== "string") {
    throw new Error("auth_user_invalid");
  }
  const name = typeof record.name === "string" || record.name === null ? record.name : null;
  return {
    id: record.id,
    email: record.email,
    name,
    permissionSnapshot: normalizeAdminPermissionSnapshot(record.permissionSnapshot),
  };
};

export const canAdmin = (
  permission: string,
  snapshot: AdminPermissionSnapshot | null | undefined
) => {
  if (!snapshot) return false;
  return snapshot.permissions.includes("*") || snapshot.permissions.includes(permission);
};

export async function resolveAuthBootstrap(options?: { force?: boolean }) {
  const force = options?.force ?? false;
  if (!force && authBootstrapCache) {
    return authBootstrapCache;
  }

  if (!force && authBootstrapPromise) {
    return authBootstrapPromise;
  }

  const request = me()
    .then(
      (result) =>
        ({
          state: "authenticated",
          user: result.user,
        }) satisfies AuthBootstrapResult
    )
    .catch((error: unknown) => {
      if (isAuthBootstrapError(error)) {
        return {
          state: "unauthenticated",
          user: null,
        } satisfies AuthBootstrapResult;
      }
      throw error;
    })
    .finally(() => {
      authBootstrapPromise = null;
    });

  authBootstrapPromise = request;
  const resolved = await request;
  authBootstrapCache = resolved;
  return resolved;
}

export async function login(payload: { email: string; password: string; captchaToken?: string }) {
  const result = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const normalizedLoginUser = normalizeAuthUser(result.user);
  authBootstrapCache = {
    state: "authenticated",
    user: normalizedLoginUser,
  };
  const bootstrap = await resolveAuthBootstrap({ force: true });
  return {
    ...result,
    user: bootstrap.user ?? normalizedLoginUser,
  };
}

export async function logout() {
  clearAuthBootstrapCache();
  const result = await apiRequest<{ ok: boolean }>(
    "/auth/logout",
    {
      method: "POST",
    },
    { withCsrf: true }
  );
  if (result?.ok) {
    authBootstrapCache = {
      state: "unauthenticated",
      user: null,
    };
  }
  return result;
}

export async function me() {
  const result = await apiRequest<{ user: unknown }>("/auth/me", { method: "GET" });
  return { user: normalizeAuthUser(result.user) };
}

export async function getAuthBotProtection() {
  return apiRequest<BotProtectionConfig>("/auth/bot-protection", { method: "GET" });
}

export async function verifyOtp(payload: { code?: string; recoveryCode?: string }) {
  return apiRequest<{ ok: boolean }>(
    "/auth/verify-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
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
