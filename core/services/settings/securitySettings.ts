import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { settings } from "../../db/schema";

export type SecuritySettings = {
  requestId: {
    enabled: boolean;
    headerName: string;
  };
  csrf: {
    enabled: boolean;
    headerName: string;
    tokenTtlMinutes: number;
  };
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAgeSeconds: number;
  };
  rateLimit: {
    enabled: boolean;
    admin: { windowSeconds: number; maxRequests: number };
    auth: { windowSeconds: number; maxRequests: number };
  };
  headers: {
    enabled: boolean;
    frameOptions: "DENY" | "SAMEORIGIN";
    contentTypeOptions: boolean;
    referrerPolicy: string | null;
    permissionsPolicy: string | null;
    csp: string | null;
    hsts: string | null;
  };
  validation: {
    rejectUnknownFields: boolean;
  };
};

export type SecuritySettingsUpdate = {
  requestId?: Partial<SecuritySettings["requestId"]>;
  csrf?: Partial<SecuritySettings["csrf"]>;
  cors?: Partial<SecuritySettings["cors"]>;
  rateLimit?: {
    enabled?: boolean;
    admin?: Partial<SecuritySettings["rateLimit"]["admin"]>;
    auth?: Partial<SecuritySettings["rateLimit"]["auth"]>;
  };
  headers?: Partial<SecuritySettings["headers"]>;
  validation?: Partial<SecuritySettings["validation"]>;
};

const SECURITY_SETTINGS_KEY = "security.settings";

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  requestId: {
    enabled: true,
    headerName: "x-request-id",
  },
  csrf: {
    enabled: true,
    headerName: "x-csrf-token",
    tokenTtlMinutes: 30,
  },
  cors: {
    allowedOrigins: [],
    allowCredentials: true,
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-csrf-token"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: true,
    admin: { windowSeconds: 60, maxRequests: 120 },
    auth: { windowSeconds: 60, maxRequests: 20 },
  },
  headers: {
    enabled: true,
    frameOptions: "DENY",
    contentTypeOptions: true,
    referrerPolicy: "no-referrer",
    permissionsPolicy: null,
    csp: null,
    hsts: null,
  },
  validation: {
    rejectUnknownFields: true,
  },
};

let cachedSettings: SecuritySettings | null = null;
let cachedUpdatedAt: number | null = null;

const assertPlainObject = (value: unknown) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertAllowedKeys = (value: unknown, allowed: string[]) => {
  if (!assertPlainObject(value)) return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!allowed.includes(key)) {
      throw new Error("security_settings_invalid");
    }
  }
};

const assertObjectOrUndefined = (value: unknown) => {
  if (value === undefined) return;
  if (!assertPlainObject(value)) {
    throw new Error("security_settings_invalid");
  }
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  throw new Error("security_settings_invalid");
};

const normalizeNumber = (value: unknown, fallback: number) => {
  if (value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  throw new Error("security_settings_invalid");
};

const normalizeString = (
  value: unknown,
  fallback: string | null,
  options?: { allowNull?: boolean; lowerCase?: boolean; upperCase?: boolean }
) => {
  if (value === undefined) return fallback;
  if (value === null) {
    if (options?.allowNull) return null;
    throw new Error("security_settings_invalid");
  }
  if (typeof value !== "string") throw new Error("security_settings_invalid");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("security_settings_invalid");
  if (options?.lowerCase) return trimmed.toLowerCase();
  if (options?.upperCase) return trimmed.toUpperCase();
  return trimmed;
};

const normalizeStringList = (
  value: unknown,
  fallback: string[],
  options?: { lowerCase?: boolean; upperCase?: boolean }
) => {
  if (value === undefined) return fallback;
  let entries: string[] = [];
  if (typeof value === "string") {
    entries = value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } else if (Array.isArray(value)) {
    entries = value.map((entry) => String(entry).trim()).filter(Boolean);
  } else {
    throw new Error("security_settings_invalid");
  }

  const normalized = entries.map((entry) => {
    if (options?.lowerCase) return entry.toLowerCase();
    if (options?.upperCase) return entry.toUpperCase();
    return entry;
  });
  return Array.from(new Set(normalized));
};

const normalizeFrameOptions = (
  value: unknown,
  fallback: SecuritySettings["headers"]["frameOptions"]
) => {
  if (value === undefined) return fallback;
  if (value === "DENY" || value === "SAMEORIGIN") return value;
  throw new Error("security_settings_invalid");
};

const mergeSecuritySettings = (
  base: SecuritySettings,
  update: SecuritySettingsUpdate
): SecuritySettings => {
  assertObjectOrUndefined(update.requestId);
  assertObjectOrUndefined(update.csrf);
  assertObjectOrUndefined(update.cors);
  assertObjectOrUndefined(update.rateLimit);
  assertObjectOrUndefined(update.headers);
  assertObjectOrUndefined(update.validation);
  assertObjectOrUndefined(update.rateLimit?.admin);
  assertObjectOrUndefined(update.rateLimit?.auth);

  assertAllowedKeys(update, ["requestId", "csrf", "cors", "rateLimit", "headers", "validation"]);
  if (update.requestId) {
    assertAllowedKeys(update.requestId, ["enabled", "headerName"]);
  }
  if (update.csrf) {
    assertAllowedKeys(update.csrf, ["enabled", "headerName", "tokenTtlMinutes"]);
  }
  if (update.cors) {
    assertAllowedKeys(update.cors, [
      "allowedOrigins",
      "allowCredentials",
      "allowedMethods",
      "allowedHeaders",
      "maxAgeSeconds",
    ]);
  }
  if (update.rateLimit) {
    assertAllowedKeys(update.rateLimit, ["enabled", "admin", "auth"]);
    if (update.rateLimit.admin) {
      assertAllowedKeys(update.rateLimit.admin, ["windowSeconds", "maxRequests"]);
    }
    if (update.rateLimit.auth) {
      assertAllowedKeys(update.rateLimit.auth, ["windowSeconds", "maxRequests"]);
    }
  }
  if (update.headers) {
    assertAllowedKeys(update.headers, [
      "enabled",
      "frameOptions",
      "contentTypeOptions",
      "referrerPolicy",
      "permissionsPolicy",
      "csp",
      "hsts",
    ]);
  }
  if (update.validation) {
    assertAllowedKeys(update.validation, ["rejectUnknownFields"]);
  }

  const requestId = {
    enabled: normalizeBoolean(update.requestId?.enabled, base.requestId.enabled),
    headerName: normalizeString(update.requestId?.headerName, base.requestId.headerName, {
      lowerCase: true,
    }) as string,
  };

  const csrf = {
    enabled: normalizeBoolean(update.csrf?.enabled, base.csrf.enabled),
    headerName: normalizeString(update.csrf?.headerName, base.csrf.headerName, {
      lowerCase: true,
    }) as string,
    tokenTtlMinutes: normalizeNumber(update.csrf?.tokenTtlMinutes, base.csrf.tokenTtlMinutes),
  };

  const corsAllowedOrigins = normalizeStringList(
    update.cors?.allowedOrigins,
    base.cors.allowedOrigins,
    { lowerCase: true }
  );

  let corsAllowCredentials = normalizeBoolean(
    update.cors?.allowCredentials,
    base.cors.allowCredentials
  );
  if (corsAllowedOrigins.includes("*")) {
    corsAllowCredentials = false;
  }

  const cors = {
    allowedOrigins: corsAllowedOrigins,
    allowCredentials: corsAllowCredentials,
    allowedMethods: normalizeStringList(update.cors?.allowedMethods, base.cors.allowedMethods, {
      upperCase: true,
    }),
    allowedHeaders: normalizeStringList(update.cors?.allowedHeaders, base.cors.allowedHeaders, {
      lowerCase: true,
    }),
    maxAgeSeconds: normalizeNumber(update.cors?.maxAgeSeconds, base.cors.maxAgeSeconds),
  };

  const rateLimit = {
    enabled: normalizeBoolean(update.rateLimit?.enabled, base.rateLimit.enabled),
    admin: {
      windowSeconds: normalizeNumber(
        update.rateLimit?.admin?.windowSeconds,
        base.rateLimit.admin.windowSeconds
      ),
      maxRequests: normalizeNumber(
        update.rateLimit?.admin?.maxRequests,
        base.rateLimit.admin.maxRequests
      ),
    },
    auth: {
      windowSeconds: normalizeNumber(
        update.rateLimit?.auth?.windowSeconds,
        base.rateLimit.auth.windowSeconds
      ),
      maxRequests: normalizeNumber(
        update.rateLimit?.auth?.maxRequests,
        base.rateLimit.auth.maxRequests
      ),
    },
  };

  const headers = {
    enabled: normalizeBoolean(update.headers?.enabled, base.headers.enabled),
    frameOptions: normalizeFrameOptions(update.headers?.frameOptions, base.headers.frameOptions),
    contentTypeOptions: normalizeBoolean(
      update.headers?.contentTypeOptions,
      base.headers.contentTypeOptions
    ),
    referrerPolicy: normalizeString(update.headers?.referrerPolicy, base.headers.referrerPolicy, {
      allowNull: true,
    }),
    permissionsPolicy: normalizeString(update.headers?.permissionsPolicy, base.headers.permissionsPolicy, {
      allowNull: true,
    }),
    csp: normalizeString(update.headers?.csp, base.headers.csp, { allowNull: true }),
    hsts: normalizeString(update.headers?.hsts, base.headers.hsts, { allowNull: true }),
  };

  const validation = {
    rejectUnknownFields: normalizeBoolean(
      update.validation?.rejectUnknownFields,
      base.validation.rejectUnknownFields
    ),
  };

  return {
    requestId,
    csrf,
    cors,
    rateLimit,
    headers,
    validation,
  };
};

const normalizeStoredSettings = (value: unknown): SecuritySettings => {
  if (!assertPlainObject(value)) return DEFAULT_SECURITY_SETTINGS;
  try {
    return mergeSecuritySettings(DEFAULT_SECURITY_SETTINGS, value as SecuritySettingsUpdate);
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
};

export function resetSecuritySettingsCache() {
  cachedSettings = null;
  cachedUpdatedAt = null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (cachedSettings) return cachedSettings;
  const [row] = await db
    .select({ value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, SECURITY_SETTINGS_KEY));

  const merged = normalizeStoredSettings(row?.value);
  cachedSettings = merged;
  cachedUpdatedAt = row?.updatedAt ? row.updatedAt.getTime() : null;
  return merged;
}

export async function setSecuritySettings(update: SecuritySettingsUpdate) {
  if (!assertPlainObject(update)) throw new Error("security_settings_invalid");
  const current = await getSecuritySettings();
  const merged = mergeSecuritySettings(current, update);
  const now = new Date();

  await db
    .insert(settings)
    .values({ key: SECURITY_SETTINGS_KEY, value: merged, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: merged, updatedAt: now },
    });

  cachedSettings = merged;
  cachedUpdatedAt = now.getTime();
  return merged;
}

export async function getSecuritySettingsUpdatedAt() {
  if (cachedUpdatedAt) return cachedUpdatedAt;
  const [row] = await db
    .select({ updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, SECURITY_SETTINGS_KEY));
  return row?.updatedAt?.getTime() ?? null;
}

export const SECURITY_SETTINGS_DEFAULTS = DEFAULT_SECURITY_SETTINGS;
