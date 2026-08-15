import { eq } from "drizzle-orm";

import { settings } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  type EncryptedSecret,
} from "../security/secretStore";
import { isPasswordPepperConfigured } from "../auth/passwordPepper";
import { isLikelyEmail } from "../security/piiEmail";

export type RateLimitBucket =
  "auth" | "admin_read" | "admin_write" | "public_read" | "public_write" | "assistant";

export type RateLimitBucketConfig = {
  windowSeconds: number;
  maxRequests: number;
};

export type BotProtectionSettings = {
  enabled: boolean;
  provider: "recaptcha_v3";
  siteKey: string | null;
  secretKey: string | EncryptedSecret | null;
  thresholds: {
    login: number;
    reset: number;
    publicWrite: number;
  };
  enforceOnLocalhost: boolean;
};

export type BotProtectionSettingsPublic = Omit<BotProtectionSettings, "secretKey"> & {
  secretKey: { configured: boolean };
};

export type LoginAlertsSettings = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  recipients: string[];
  webhookUrl: string | null;
  webhookSecret: string | EncryptedSecret | null;
  deliveryError: string | null;
};

export type LoginAlertsSettingsPublic = Omit<LoginAlertsSettings, "webhookSecret"> & {
  webhookSecret: { configured: boolean };
};

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
    buckets: Record<RateLimitBucket, RateLimitBucketConfig>;
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
  plugins: {
    safeMode: boolean;
  };
  session: {
    ttlDays: number;
    maxPerUser: number;
    singleSession: boolean;
  };
  loginAlerts: LoginAlertsSettings;
  botProtection: BotProtectionSettings;
};

export type SecuritySettingsPublic = Omit<SecuritySettings, "botProtection" | "loginAlerts"> & {
  botProtection: BotProtectionSettingsPublic;
  loginAlerts: LoginAlertsSettingsPublic;
  passwordPepperConfigured: boolean;
};

export type SecuritySettingsUpdate = {
  requestId?: Partial<SecuritySettings["requestId"]>;
  csrf?: Partial<SecuritySettings["csrf"]>;
  cors?: Partial<SecuritySettings["cors"]>;
  rateLimit?: {
    enabled?: boolean;
    buckets?: Partial<
      Record<RateLimitBucket, Partial<SecuritySettings["rateLimit"]["buckets"][RateLimitBucket]>>
    >;
    admin?: Partial<RateLimitBucketConfig>;
    auth?: Partial<RateLimitBucketConfig>;
  };
  headers?: Partial<SecuritySettings["headers"]>;
  validation?: Partial<SecuritySettings["validation"]>;
  plugins?: Partial<SecuritySettings["plugins"]>;
  session?: Partial<SecuritySettings["session"]>;
  loginAlerts?: Partial<SecuritySettings["loginAlerts"]>;
  botProtection?: {
    enabled?: boolean;
    provider?: "recaptcha_v3";
    siteKey?: string | null;
    secretKey?: string | null;
    thresholds?: Partial<SecuritySettings["botProtection"]["thresholds"]>;
    enforceOnLocalhost?: boolean;
  };
};

const SECURITY_SETTINGS_KEY = "security.settings";

let dbPromise: Promise<typeof import("../../db/client").db> | null = null;

const getDb = async () => {
  dbPromise ??= import("../../db/client").then((module) => module.db);
  return dbPromise;
};

const RATE_LIMIT_BUCKETS: RateLimitBucket[] = [
  "auth",
  "admin_read",
  "admin_write",
  "public_read",
  "public_write",
  "assistant",
];

const MAX_LOGIN_ALERT_RECIPIENTS = 10;
const MAX_LOGIN_ALERT_DELIVERY_ERROR_LENGTH = 240;
const LOGIN_ALERT_LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

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
    allowedHeaders: ["content-type", "x-csrf-token", "x-coderso-expected-user-id"],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    enabled: true,
    buckets: {
      auth: { windowSeconds: 60, maxRequests: 10 },
      admin_read: { windowSeconds: 60, maxRequests: 600 },
      admin_write: { windowSeconds: 60, maxRequests: 120 },
      public_read: { windowSeconds: 60, maxRequests: 300 },
      public_write: { windowSeconds: 60, maxRequests: 30 },
      assistant: { windowSeconds: 60, maxRequests: 30 },
    },
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
  plugins: {
    safeMode: false,
  },
  session: {
    ttlDays: 7,
    maxPerUser: 3,
    singleSession: false,
  },
  loginAlerts: {
    enabled: true,
    notifyOnNewDevice: true,
    notifyOnNewLocation: true,
    recipients: [],
    webhookUrl: null,
    webhookSecret: null,
    deliveryError: null,
  },
  botProtection: {
    enabled: false,
    provider: "recaptcha_v3",
    siteKey: null,
    secretKey: null,
    thresholds: {
      login: 0.5,
      reset: 0.6,
      publicWrite: 0.5,
    },
    enforceOnLocalhost: true,
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

const normalizeScore = (value: unknown, fallback: number) => {
  if (value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
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

const normalizeRateLimitBucket = (
  value: unknown,
  fallback: RateLimitBucketConfig
): RateLimitBucketConfig => {
  if (value === undefined) return fallback;
  if (!assertPlainObject(value)) throw new Error("security_settings_invalid");
  const record = value as Record<string, unknown>;
  return {
    windowSeconds: normalizeNumber(record.windowSeconds, fallback.windowSeconds),
    maxRequests: normalizeNumber(record.maxRequests, fallback.maxRequests),
  };
};

const normalizeBotProvider = (value: unknown, fallback: BotProtectionSettings["provider"]) => {
  if (value === undefined) return fallback;
  if (value === "recaptcha_v3") return value;
  throw new Error("security_settings_invalid");
};

const normalizeBotSecret = (value: unknown, fallback: BotProtectionSettings["secretKey"]) => {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("security_settings_invalid");
    return trimmed;
  }
  if (isEncryptedSecret(value)) return value;
  throw new Error("security_settings_invalid");
};

const hasBotSecretConfigured = (secret: BotProtectionSettings["secretKey"]) => {
  if (typeof secret === "string") return Boolean(secret.trim());
  if (isEncryptedSecret(secret)) return true;
  return false;
};

const resolveBotSecretValue = (secret: BotProtectionSettings["secretKey"]) => {
  if (typeof secret === "string") return secret.trim() || null;
  if (isEncryptedSecret(secret)) {
    try {
      return decryptSecret(secret);
    } catch {
      return null;
    }
  }
  return null;
};

const isLoginWebhookLoopbackHost = (hostname: string) =>
  LOGIN_ALERT_LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());

const isLoginWebhookPrivateHost = (hostname: string) => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "::1") return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const first = Number(ipv4[1]);
    const second = Number(ipv4[2]);
    if (first === 10) return true;
    if (first === 127) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 169 && second === 254) return true;
    if (first === 0) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    if (first >= 224) return true;
    return false;
  }
  if (host.includes(":")) {
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb")
    ) {
      return true;
    }
    if (host === "::" || host.startsWith("0:0:0:0:0:0:0:")) return true;
    return false;
  }
  return false;
};

const normalizeLoginRecipients = (value: unknown, fallback: string[]) => {
  const list = normalizeStringList(value, fallback, { lowerCase: true });
  return list.filter((entry) => isLikelyEmail(entry)).slice(0, MAX_LOGIN_ALERT_RECIPIENTS);
};

const normalizeLoginWebhookUrl = (value: unknown, fallback: string | null) => {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("security_settings_invalid");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("security_settings_invalid");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("security_settings_invalid");
  }

  const loopback = isLoginWebhookLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("security_settings_invalid");
  }
  if (!loopback && isLoginWebhookPrivateHost(url.hostname)) {
    throw new Error("security_settings_invalid");
  }
  if (url.username || url.password) {
    throw new Error("security_settings_invalid");
  }
  return url.toString();
};

const normalizeLoginWebhookSecret = (
  value: unknown,
  fallback: LoginAlertsSettings["webhookSecret"]
): LoginAlertsSettings["webhookSecret"] => normalizeBotSecret(value, fallback);

const normalizeLoginDeliveryError = (value: unknown, fallback: string | null) => {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("security_settings_invalid");
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_LOGIN_ALERT_DELIVERY_ERROR_LENGTH) : null;
};

const hasLoginWebhookSecretConfigured = (secret: LoginAlertsSettings["webhookSecret"]) => {
  if (typeof secret === "string") return Boolean(secret.trim());
  if (isEncryptedSecret(secret)) return true;
  return false;
};

export const resolveLoginWebhookSecret = (secret: LoginAlertsSettings["webhookSecret"]) => {
  if (typeof secret === "string") return secret.trim() || null;
  if (isEncryptedSecret(secret)) {
    try {
      return decryptSecret(secret);
    } catch {
      return null;
    }
  }
  return null;
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
  assertObjectOrUndefined(update.plugins);
  assertObjectOrUndefined(update.session);
  assertObjectOrUndefined(update.loginAlerts);
  assertObjectOrUndefined(update.botProtection);
  assertObjectOrUndefined(update.rateLimit?.admin);
  assertObjectOrUndefined(update.rateLimit?.auth);
  assertObjectOrUndefined(update.rateLimit?.buckets);
  assertObjectOrUndefined(update.botProtection?.thresholds);

  assertAllowedKeys(update, [
    "requestId",
    "csrf",
    "cors",
    "rateLimit",
    "headers",
    "validation",
    "plugins",
    "session",
    "loginAlerts",
    "botProtection",
  ]);
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
    assertAllowedKeys(update.rateLimit, ["enabled", "buckets", "admin", "auth"]);
    if (update.rateLimit.admin) {
      assertAllowedKeys(update.rateLimit.admin, ["windowSeconds", "maxRequests"]);
    }
    if (update.rateLimit.auth) {
      assertAllowedKeys(update.rateLimit.auth, ["windowSeconds", "maxRequests"]);
    }
    if (update.rateLimit.buckets) {
      assertAllowedKeys(update.rateLimit.buckets, RATE_LIMIT_BUCKETS);
      for (const bucket of RATE_LIMIT_BUCKETS) {
        const bucketUpdate = update.rateLimit.buckets[bucket];
        if (bucketUpdate) {
          assertAllowedKeys(bucketUpdate, ["windowSeconds", "maxRequests"]);
        }
      }
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
  if (update.plugins) {
    assertAllowedKeys(update.plugins, ["safeMode"]);
  }
  if (update.session) {
    assertAllowedKeys(update.session, ["ttlDays", "maxPerUser", "singleSession"]);
  }
  if (update.loginAlerts) {
    assertAllowedKeys(update.loginAlerts, [
      "enabled",
      "notifyOnNewDevice",
      "notifyOnNewLocation",
      "recipients",
      "webhookUrl",
      "webhookSecret",
      "deliveryError",
    ]);
  }
  if (update.botProtection) {
    assertAllowedKeys(update.botProtection, [
      "enabled",
      "provider",
      "siteKey",
      "secretKey",
      "thresholds",
      "enforceOnLocalhost",
    ]);
    if (update.botProtection.thresholds) {
      assertAllowedKeys(update.botProtection.thresholds, ["login", "reset", "publicWrite"]);
    }
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

  const rateLimitEnabled = normalizeBoolean(update.rateLimit?.enabled, base.rateLimit.enabled);
  const legacyAdmin = update.rateLimit?.admin;
  const legacyAuth = update.rateLimit?.auth;
  const bucketUpdates = update.rateLimit?.buckets ?? {};

  const rateLimitBuckets: Record<RateLimitBucket, RateLimitBucketConfig> = {
    auth: normalizeRateLimitBucket(bucketUpdates.auth ?? legacyAuth, base.rateLimit.buckets.auth),
    admin_read: normalizeRateLimitBucket(
      bucketUpdates.admin_read ?? legacyAdmin,
      base.rateLimit.buckets.admin_read
    ),
    admin_write: normalizeRateLimitBucket(
      bucketUpdates.admin_write ?? legacyAdmin,
      base.rateLimit.buckets.admin_write
    ),
    public_read: normalizeRateLimitBucket(
      bucketUpdates.public_read,
      base.rateLimit.buckets.public_read
    ),
    public_write: normalizeRateLimitBucket(
      bucketUpdates.public_write,
      base.rateLimit.buckets.public_write
    ),
    assistant: normalizeRateLimitBucket(bucketUpdates.assistant, base.rateLimit.buckets.assistant),
  };

  const rateLimit = {
    enabled: rateLimitEnabled,
    buckets: rateLimitBuckets,
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
    permissionsPolicy: normalizeString(
      update.headers?.permissionsPolicy,
      base.headers.permissionsPolicy,
      {
        allowNull: true,
      }
    ),
    csp: normalizeString(update.headers?.csp, base.headers.csp, { allowNull: true }),
    hsts: normalizeString(update.headers?.hsts, base.headers.hsts, { allowNull: true }),
  };

  const validation = {
    rejectUnknownFields: normalizeBoolean(
      update.validation?.rejectUnknownFields,
      base.validation.rejectUnknownFields
    ),
  };

  const plugins = {
    safeMode: normalizeBoolean(update.plugins?.safeMode, base.plugins.safeMode),
  };

  const session = {
    ttlDays: normalizeNumber(update.session?.ttlDays, base.session.ttlDays),
    maxPerUser: normalizeNumber(update.session?.maxPerUser, base.session.maxPerUser),
    singleSession: normalizeBoolean(update.session?.singleSession, base.session.singleSession),
  };

  const loginAlerts = {
    enabled: normalizeBoolean(update.loginAlerts?.enabled, base.loginAlerts.enabled),
    notifyOnNewDevice: normalizeBoolean(
      update.loginAlerts?.notifyOnNewDevice,
      base.loginAlerts.notifyOnNewDevice
    ),
    notifyOnNewLocation: normalizeBoolean(
      update.loginAlerts?.notifyOnNewLocation,
      base.loginAlerts.notifyOnNewLocation
    ),
    recipients: normalizeLoginRecipients(
      update.loginAlerts?.recipients,
      base.loginAlerts.recipients
    ),
    webhookUrl: normalizeLoginWebhookUrl(
      update.loginAlerts?.webhookUrl,
      base.loginAlerts.webhookUrl
    ),
    webhookSecret: normalizeLoginWebhookSecret(
      update.loginAlerts?.webhookSecret,
      base.loginAlerts.webhookSecret
    ),
    deliveryError: normalizeLoginDeliveryError(
      update.loginAlerts?.deliveryError,
      base.loginAlerts.deliveryError
    ),
  };

  if (loginAlerts.webhookUrl && !hasLoginWebhookSecretConfigured(loginAlerts.webhookSecret)) {
    throw new Error("security_settings_invalid");
  }

  const botProtection = {
    enabled: normalizeBoolean(update.botProtection?.enabled, base.botProtection.enabled),
    provider: normalizeBotProvider(update.botProtection?.provider, base.botProtection.provider),
    siteKey: normalizeString(update.botProtection?.siteKey, base.botProtection.siteKey, {
      allowNull: true,
    }),
    secretKey: normalizeBotSecret(update.botProtection?.secretKey, base.botProtection.secretKey),
    thresholds: {
      login: normalizeScore(
        update.botProtection?.thresholds?.login,
        base.botProtection.thresholds.login
      ),
      reset: normalizeScore(
        update.botProtection?.thresholds?.reset,
        base.botProtection.thresholds.reset
      ),
      publicWrite: normalizeScore(
        update.botProtection?.thresholds?.publicWrite,
        base.botProtection.thresholds.publicWrite
      ),
    },
    enforceOnLocalhost: normalizeBoolean(
      update.botProtection?.enforceOnLocalhost,
      base.botProtection.enforceOnLocalhost
    ),
  };

  return {
    requestId,
    csrf,
    cors,
    rateLimit,
    headers,
    validation,
    plugins,
    session,
    loginAlerts,
    botProtection,
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

const toStoredSettings = (settings: SecuritySettings): SecuritySettings => {
  const botSecret = settings.botProtection.secretKey;
  const encryptedBotSecret = (() => {
    if (typeof botSecret === "string") {
      return encryptSecret(botSecret);
    }
    if (isEncryptedSecret(botSecret)) {
      return botSecret;
    }
    return null;
  })();

  const loginWebhookSecret = settings.loginAlerts.webhookSecret;
  const encryptedLoginWebhookSecret = (() => {
    if (typeof loginWebhookSecret === "string") {
      return encryptSecret(loginWebhookSecret);
    }
    if (isEncryptedSecret(loginWebhookSecret)) {
      return loginWebhookSecret;
    }
    return null;
  })();

  return {
    ...settings,
    botProtection: {
      ...settings.botProtection,
      secretKey: encryptedBotSecret,
    },
    loginAlerts: {
      ...settings.loginAlerts,
      webhookSecret: encryptedLoginWebhookSecret,
    },
  };
};

const toPublicSettings = (settings: SecuritySettings): SecuritySettingsPublic => ({
  ...settings,
  botProtection: {
    ...settings.botProtection,
    secretKey: { configured: hasBotSecretConfigured(settings.botProtection.secretKey) },
  },
  loginAlerts: {
    ...settings.loginAlerts,
    webhookSecret: {
      configured: hasLoginWebhookSecretConfigured(settings.loginAlerts.webhookSecret),
    },
  },
  passwordPepperConfigured: isPasswordPepperConfigured(),
});

const assertBotProtectionConfig = (settings: SecuritySettings) => {
  if (!settings.botProtection.enabled) return;
  if (!settings.botProtection.siteKey) {
    throw new Error("bot_protection_site_key_missing");
  }
  const secretValue = resolveBotSecretValue(settings.botProtection.secretKey);
  if (!secretValue) {
    throw new Error("bot_protection_secret_key_missing");
  }
};

export function resetSecuritySettingsCache() {
  cachedSettings = null;
  cachedUpdatedAt = null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  if (cachedSettings) return cachedSettings;
  const db = await getDb();
  const [row] = await db
    .select({ value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, SECURITY_SETTINGS_KEY));

  const merged = normalizeStoredSettings(row?.value);
  cachedSettings = merged;
  cachedUpdatedAt = row?.updatedAt ? row.updatedAt.getTime() : null;
  return merged;
}

export async function getSecuritySettingsPublic(): Promise<SecuritySettingsPublic> {
  const current = await getSecuritySettings();
  return toPublicSettings(current);
}

export async function setSecuritySettings(update: SecuritySettingsUpdate) {
  if (!assertPlainObject(update)) throw new Error("security_settings_invalid");
  const current = await getSecuritySettings();
  const merged = mergeSecuritySettings(current, update);
  assertBotProtectionConfig(merged);
  const now = new Date();
  const stored = toStoredSettings(merged);
  const db = await getDb();

  await db
    .insert(settings)
    .values({ key: SECURITY_SETTINGS_KEY, value: stored, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: stored, updatedAt: now },
    });

  cachedSettings = merged;
  cachedUpdatedAt = now.getTime();
  return merged;
}

export async function setSecuritySettingsPublic(update: SecuritySettingsUpdate) {
  const updated = await setSecuritySettings(update);
  return toPublicSettings(updated);
}

export async function getSecuritySettingsUpdatedAt() {
  if (cachedUpdatedAt) return cachedUpdatedAt;
  const db = await getDb();
  const [row] = await db
    .select({ updatedAt: settings.updatedAt })
    .from(settings)
    .where(eq(settings.key, SECURITY_SETTINGS_KEY));
  return row?.updatedAt?.getTime() ?? null;
}

export const SECURITY_SETTINGS_DEFAULTS = DEFAULT_SECURITY_SETTINGS;
