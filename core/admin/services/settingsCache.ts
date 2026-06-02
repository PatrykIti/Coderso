import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";

export type RedactedSettingsContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export type RedactedSettingsCache = {
  schemaVersion: 1;
  general: {
    siteName: string;
    siteLocale: string;
    publicBaseUrl: string | null;
  };
  runtime: {
    authSessionTtlDays: number;
    authResetTtlMinutes: number;
    setupCompleted: boolean;
  };
  assistant: {
    enabled: boolean;
    defaultMode: "docs-only" | "llm-guide";
    docsReindexOnBoot: boolean;
    launcherAvatarEnabled: boolean;
    launcherAvatarAsset: string | null;
    llmEnabled: boolean;
    llmProvider: "openai" | "openrouter" | "none";
    llmModel: string;
    llmInputLimit: number;
    llmOutputLimit: number;
    llmTimeoutMs: number;
    quotaRequestsPerMinute: number;
    quotaRequestsPerDay: number;
  };
  site: {
    adminBaseUrl: string | null;
    publicBaseUrl: string | null;
    adminPath: string;
    adminRedirectEnabled: boolean;
    homepageId: string | null;
    notFoundPageId: string | null;
    previewEnabled: boolean;
    cacheTtlSeconds: number;
    contentRoutes: RedactedSettingsContentRoute[];
  };
  securityConfigured: {
    botProtectionEnabled: boolean;
    botProtectionPublicConfigured: boolean;
    botProtectionConfigured: boolean;
    pepperConfigured: boolean;
  };
};

type SecuritySettingsCachePatch = {
  botProtection?: {
    enabled?: boolean;
    siteKey?: string | null;
    secretKey?: { configured?: boolean };
  };
  passwordPepperConfigured?: boolean;
};

const unsafeSettingsCacheKeyPattern = /password|secret|token|accessKey|connectionString|apiKey/i;

const redactedSettingsTopLevelKeys = new Set([
  "schemaVersion",
  "general",
  "runtime",
  "assistant",
  "site",
  "securityConfigured",
]);
const redactedGeneralKeys = new Set(["siteName", "siteLocale", "publicBaseUrl"]);
const redactedRuntimeKeys = new Set([
  "authSessionTtlDays",
  "authResetTtlMinutes",
  "setupCompleted",
]);
const redactedAssistantKeys = new Set([
  "enabled",
  "defaultMode",
  "docsReindexOnBoot",
  "launcherAvatarEnabled",
  "launcherAvatarAsset",
  "llmEnabled",
  "llmProvider",
  "llmModel",
  "llmInputLimit",
  "llmOutputLimit",
  "llmTimeoutMs",
  "quotaRequestsPerMinute",
  "quotaRequestsPerDay",
]);
const redactedSiteKeys = new Set([
  "adminBaseUrl",
  "publicBaseUrl",
  "adminPath",
  "adminRedirectEnabled",
  "homepageId",
  "notFoundPageId",
  "previewEnabled",
  "cacheTtlSeconds",
  "contentRoutes",
]);
const redactedContentRouteKeys = new Set([
  "type",
  "listPath",
  "detailPath",
  "enabled",
  "detailPageId",
]);
const redactedSecurityKeys = new Set([
  "botProtectionEnabled",
  "botProtectionPublicConfigured",
  "botProtectionConfigured",
  "pepperConfigured",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>) =>
  Object.keys(value).every((key) => allowed.has(key));

const isNullableString = (value: unknown) => value === null || typeof value === "string";

const normalizeString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const normalizeNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const normalizeInteger = (value: unknown, fallback: number, min = 0) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
};

const normalizeAssistantMode = (
  value: unknown
): RedactedSettingsCache["assistant"]["defaultMode"] =>
  value === "llm-rag"
    ? "llm-guide"
    : value === "docs-only" || value === "llm-guide"
      ? value
      : "docs-only";

const normalizeAssistantProvider = (
  value: unknown
): RedactedSettingsCache["assistant"]["llmProvider"] =>
  value === "openai" || value === "openrouter" || value === "none" ? value : "none";

const normalizeContentRoutes = (value: unknown): RedactedSettingsContentRoute[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      return {
        type: entry.type,
        listPath: entry.listPath,
        detailPath: entry.detailPath,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
        ...(Object.prototype.hasOwnProperty.call(entry, "detailPageId")
          ? { detailPageId: normalizeNullableString(entry.detailPageId) }
          : {}),
      } satisfies RedactedSettingsContentRoute;
    })
    .filter((entry): entry is RedactedSettingsContentRoute => Boolean(entry));
};

const isRedactedContentRoute = (value: unknown): value is RedactedSettingsContentRoute => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, redactedContentRouteKeys)) return false;
  if (typeof value.type !== "string") return false;
  if (typeof value.listPath !== "string") return false;
  if (typeof value.detailPath !== "string") return false;
  if (typeof value.enabled !== "boolean") return false;
  return (
    !Object.prototype.hasOwnProperty.call(value, "detailPageId") ||
    isNullableString(value.detailPageId)
  );
};

export const findUnsafeRedactedSettingsCachePaths = (
  value: unknown,
  path: string[] = []
): string[] => {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        findUnsafeRedactedSettingsCachePaths(item, [...path, String(index)])
      );
    }
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPath = [...path, key];
    const ownPath = unsafeSettingsCacheKeyPattern.test(key) ? [nextPath.join(".")] : [];
    return [...ownPath, ...findUnsafeRedactedSettingsCachePaths(nestedValue, nextPath)];
  });
};

export const isRedactedSettingsCache = (value: unknown): value is RedactedSettingsCache => {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, redactedSettingsTopLevelKeys)) return false;
  if (value.schemaVersion !== 1) return false;
  if (findUnsafeRedactedSettingsCachePaths(value).length > 0) return false;

  if (!isRecord(value.general) || !hasOnlyKeys(value.general, redactedGeneralKeys)) return false;
  if (typeof value.general.siteName !== "string") return false;
  if (typeof value.general.siteLocale !== "string") return false;
  if (!isNullableString(value.general.publicBaseUrl)) return false;

  if (!isRecord(value.runtime) || !hasOnlyKeys(value.runtime, redactedRuntimeKeys)) return false;
  if (typeof value.runtime.authSessionTtlDays !== "number") return false;
  if (typeof value.runtime.authResetTtlMinutes !== "number") return false;
  if (typeof value.runtime.setupCompleted !== "boolean") return false;

  if (!isRecord(value.assistant) || !hasOnlyKeys(value.assistant, redactedAssistantKeys)) {
    return false;
  }
  if (typeof value.assistant.enabled !== "boolean") return false;
  if (value.assistant.defaultMode !== "docs-only" && value.assistant.defaultMode !== "llm-guide") {
    return false;
  }
  if (typeof value.assistant.docsReindexOnBoot !== "boolean") return false;
  if (typeof value.assistant.launcherAvatarEnabled !== "boolean") return false;
  if (!isNullableString(value.assistant.launcherAvatarAsset)) return false;
  if (typeof value.assistant.llmEnabled !== "boolean") return false;
  if (
    value.assistant.llmProvider !== "openai" &&
    value.assistant.llmProvider !== "openrouter" &&
    value.assistant.llmProvider !== "none"
  ) {
    return false;
  }
  if (typeof value.assistant.llmModel !== "string") return false;
  if (typeof value.assistant.llmInputLimit !== "number") return false;
  if (typeof value.assistant.llmOutputLimit !== "number") return false;
  if (typeof value.assistant.llmTimeoutMs !== "number") return false;
  if (typeof value.assistant.quotaRequestsPerMinute !== "number") return false;
  if (typeof value.assistant.quotaRequestsPerDay !== "number") return false;

  if (!isRecord(value.site) || !hasOnlyKeys(value.site, redactedSiteKeys)) return false;
  if (!isNullableString(value.site.adminBaseUrl)) return false;
  if (!isNullableString(value.site.publicBaseUrl)) return false;
  if (typeof value.site.adminPath !== "string") return false;
  if (typeof value.site.adminRedirectEnabled !== "boolean") return false;
  if (!isNullableString(value.site.homepageId)) return false;
  if (!isNullableString(value.site.notFoundPageId)) return false;
  if (typeof value.site.previewEnabled !== "boolean") return false;
  if (typeof value.site.cacheTtlSeconds !== "number") return false;
  if (!Array.isArray(value.site.contentRoutes)) return false;
  if (!value.site.contentRoutes.every(isRedactedContentRoute)) return false;

  if (
    !isRecord(value.securityConfigured) ||
    !hasOnlyKeys(value.securityConfigured, redactedSecurityKeys)
  ) {
    return false;
  }
  if (typeof value.securityConfigured.botProtectionEnabled !== "boolean") return false;
  if (typeof value.securityConfigured.botProtectionPublicConfigured !== "boolean") return false;
  if (typeof value.securityConfigured.botProtectionConfigured !== "boolean") return false;
  if (typeof value.securityConfigured.pepperConfigured !== "boolean") return false;

  return true;
};

const redactedSettingsCache = createMemoryBackedLocalCache({
  key: cacheKeys.settingsRedacted,
  ttlMs: cacheTtlMs.detail,
  validate: isRedactedSettingsCache,
});

export const toRedactedSettingsCache = (
  payload: Record<string, unknown>
): RedactedSettingsCache => ({
  schemaVersion: 1,
  general: {
    siteName: normalizeString(payload["site.name"], "Coderso"),
    siteLocale: normalizeString(payload["site.locale"], "en"),
    publicBaseUrl: normalizeNullableString(payload["site.publicBaseUrl"]),
  },
  runtime: {
    authSessionTtlDays: normalizeInteger(payload["auth.sessionTtlDays"], 14, 1),
    authResetTtlMinutes: normalizeInteger(payload["auth.resetTtlMinutes"], 60, 5),
    setupCompleted: normalizeBoolean(payload["setup.completed"], false),
  },
  assistant: {
    enabled: normalizeBoolean(payload["assistant.enabled"], false),
    defaultMode: normalizeAssistantMode(payload["assistant.defaultMode"]),
    docsReindexOnBoot: normalizeBoolean(payload["assistant.docs.reindexOnBoot"], false),
    launcherAvatarEnabled: normalizeBoolean(payload["assistant.launcher.avatarEnabled"], false),
    launcherAvatarAsset: normalizeNullableString(payload["assistant.launcher.avatarAsset"]),
    llmEnabled: normalizeBoolean(payload["assistant.llm.enabled"], false),
    llmProvider: normalizeAssistantProvider(payload["assistant.llm.provider"]),
    llmModel: normalizeString(payload["assistant.llm.model"], ""),
    llmInputLimit: normalizeInteger(payload["assistant.llm.maxInputTokens"], 12000, 1),
    llmOutputLimit: normalizeInteger(payload["assistant.llm.maxOutputTokens"], 1200, 1),
    llmTimeoutMs: normalizeInteger(payload["assistant.llm.timeoutMs"], 30000, 1000),
    quotaRequestsPerMinute: normalizeInteger(payload["assistant.quotas.requestsPerMinute"], 20, 1),
    quotaRequestsPerDay: normalizeInteger(payload["assistant.quotas.requestsPerDay"], 500, 1),
  },
  site: {
    adminBaseUrl: normalizeNullableString(payload["site.adminBaseUrl"]),
    publicBaseUrl: normalizeNullableString(payload["site.publicBaseUrl"]),
    adminPath: normalizeString(payload["site.adminPath"], "/admin"),
    adminRedirectEnabled: normalizeBoolean(payload["site.adminRedirectEnabled"], false),
    homepageId: normalizeNullableString(payload["site.homepageId"]),
    notFoundPageId: normalizeNullableString(payload["site.notFoundPageId"]),
    previewEnabled: normalizeBoolean(payload["site.previewEnabled"], true),
    cacheTtlSeconds: normalizeInteger(payload["site.cacheTtlSeconds"], 30, 0),
    contentRoutes: normalizeContentRoutes(payload["site.contentRoutes"]),
  },
  securityConfigured: {
    botProtectionEnabled: normalizeBoolean(payload["security.botProtection.enabled"], false),
    botProtectionPublicConfigured:
      typeof payload["security.botProtection.siteKey"] === "string" &&
      payload["security.botProtection.siteKey"].trim().length > 0,
    botProtectionConfigured: normalizeBoolean(
      payload["security.botProtection.secretKey.configured"],
      false
    ),
    pepperConfigured: normalizeBoolean(payload["security.passwordPepperConfigured"], false),
  },
});

export const toSettingsResponseFromRedactedCache = (
  cache: RedactedSettingsCache
): Record<string, unknown> => ({
  "site.name": cache.general.siteName,
  "site.locale": cache.general.siteLocale,
  "site.publicBaseUrl": cache.general.publicBaseUrl,
  "auth.sessionTtlDays": cache.runtime.authSessionTtlDays,
  "auth.resetTtlMinutes": cache.runtime.authResetTtlMinutes,
  "setup.completed": cache.runtime.setupCompleted,
  "assistant.enabled": cache.assistant.enabled,
  "assistant.defaultMode": cache.assistant.defaultMode,
  "assistant.docs.reindexOnBoot": cache.assistant.docsReindexOnBoot,
  "assistant.launcher.avatarEnabled": cache.assistant.launcherAvatarEnabled,
  "assistant.launcher.avatarAsset": cache.assistant.launcherAvatarAsset,
  "assistant.llm.enabled": cache.assistant.llmEnabled,
  "assistant.llm.provider": cache.assistant.llmProvider,
  "assistant.llm.model": cache.assistant.llmModel,
  "assistant.llm.maxInputTokens": cache.assistant.llmInputLimit,
  "assistant.llm.maxOutputTokens": cache.assistant.llmOutputLimit,
  "assistant.llm.timeoutMs": cache.assistant.llmTimeoutMs,
  "assistant.quotas.requestsPerMinute": cache.assistant.quotaRequestsPerMinute,
  "assistant.quotas.requestsPerDay": cache.assistant.quotaRequestsPerDay,
  "site.adminBaseUrl": cache.site.adminBaseUrl,
  "site.adminPath": cache.site.adminPath,
  "site.adminRedirectEnabled": cache.site.adminRedirectEnabled,
  "site.homepageId": cache.site.homepageId,
  "site.notFoundPageId": cache.site.notFoundPageId,
  "site.previewEnabled": cache.site.previewEnabled,
  "site.cacheTtlSeconds": cache.site.cacheTtlSeconds,
  "site.contentRoutes": cache.site.contentRoutes,
});

export const getCachedRedactedSettings = () => redactedSettingsCache.read();

export const getCachedRedactedSettingsStorageFirst = () => redactedSettingsCache.readStorageFirst();

export const getCachedSettingsResponse = () => {
  const cached = getCachedRedactedSettings();
  return cached ? toSettingsResponseFromRedactedCache(cached) : null;
};

export const getCachedSettingsResponseStorageFirst = () => {
  const cached = getCachedRedactedSettingsStorageFirst();
  return cached ? toSettingsResponseFromRedactedCache(cached) : null;
};

export const primeRedactedSettingsCache = (payload: Record<string, unknown>) => {
  const redacted = toRedactedSettingsCache(payload);
  redactedSettingsCache.write(redacted);
  return redacted;
};

export const clearRedactedSettingsCache = () => {
  redactedSettingsCache.clear();
};

export const patchRedactedSettingsSecurity = (payload: SecuritySettingsCachePatch) => {
  const current = getCachedRedactedSettings();
  if (!current) return null;
  const next: RedactedSettingsCache = {
    ...current,
    securityConfigured: {
      ...current.securityConfigured,
      botProtectionEnabled:
        typeof payload.botProtection?.enabled === "boolean"
          ? payload.botProtection.enabled
          : current.securityConfigured.botProtectionEnabled,
      botProtectionPublicConfigured:
        payload.botProtection &&
        Object.prototype.hasOwnProperty.call(payload.botProtection, "siteKey")
          ? typeof payload.botProtection.siteKey === "string" &&
            payload.botProtection.siteKey.trim().length > 0
          : current.securityConfigured.botProtectionPublicConfigured,
      botProtectionConfigured:
        typeof payload.botProtection?.secretKey?.configured === "boolean"
          ? payload.botProtection.secretKey.configured
          : current.securityConfigured.botProtectionConfigured,
      pepperConfigured:
        typeof payload.passwordPepperConfigured === "boolean"
          ? payload.passwordPepperConfigured
          : current.securityConfigured.pepperConfigured,
    },
  };
  redactedSettingsCache.write(next);
  return next;
};
