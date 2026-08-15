import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, settings } from "../../db/schema";
import { clearSiteCache, invalidateContentRouteCacheTransition } from "../../site/cache/siteCache";
import { assertTokenOverrides } from "../theme/tokenValidation";
import type { DesignTokenOverrides } from "../theme/tokenTypes";
import { normalizeContentRoutes, type ContentRouteSetting } from "./settingsContracts";
import { MAX_SITE_CACHE_TTL_SECONDS } from "../analytics/beaconTtl";
import { normalizeStoredSiteLocaleForWrite } from "./siteLocale";

export type { ContentRouteSetting } from "./settingsContracts";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type WidgetTemplateCategorySetting = {
  id: string;
  name: string;
};

export type AssistantMode = "docs-only" | "llm-guide";
export type AssistantLlmProvider = "openai" | "openrouter" | "none";
export type AssistantDocsBackend = "db";
export type PostEditorMode = "blocks" | "classic";

export type AssistantGlobalSettings = {
  "assistant.enabled": boolean;
  "assistant.launcher.avatarEnabled": boolean;
  "assistant.launcher.avatarAsset": string | null;
  "assistant.defaultMode": AssistantMode;
  "assistant.docs.reindexOnBoot": boolean;
  "assistant.llm.enabled": boolean;
  "assistant.llm.provider": AssistantLlmProvider;
  "assistant.llm.model": string;
  "assistant.llm.maxInputTokens": number;
  "assistant.llm.maxOutputTokens": number;
  "assistant.llm.timeoutMs": number;
  "assistant.quotas.requestsPerMinute": number;
  "assistant.quotas.requestsPerDay": number;
};

const DEFAULT_WIDGET_TEMPLATE_CATEGORIES: WidgetTemplateCategorySetting[] = [
  { id: "layout", name: "Layout" },
  { id: "content", name: "Content" },
  { id: "forms", name: "Forms" },
  { id: "navigation", name: "Navigation" },
  { id: "media", name: "Media" },
];

const DEFAULT_CONTENT_ROUTES: ContentRouteSetting[] = [];
const DEFAULT_SETTINGS = {
  "site.name": "Coderso",
  "site.locale": "en",
  "site.timezone": "UTC",
  "site.adminBaseUrl": null as string | null,
  "site.publicBaseUrl": null as string | null,
  "site.adminPath": "/admin",
  "site.adminRedirectEnabled": false,
  "site.homepageId": null as string | null,
  "site.notFoundPageId": null as string | null,
  "site.navigationMenuId": null as string | null,
  "site.footerTemplateId": null as string | null,
  "site.previewEnabled": true,
  "site.contentRoutes": DEFAULT_CONTENT_ROUTES,
  "site.cacheTtlSeconds": 30,
  // Disaster-restore gate (TASK-511-05): while ON, the whole PUBLIC surface
  // (pages + non-admin public APIs) returns 503; admin SPA + /admin/api/* stay
  // reachable so the admin can drive the backup import and flip the flag back.
  "site.maintenanceMode": false,
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
  "posts.editor.mode": "blocks" as PostEditorMode,
  "setup.completed": false,
  "design.tokens": {} as DesignTokenOverrides,
  "search.categoryOverrides": {} as SearchCategoryOverrides,
  "widgets.templateCategories": DEFAULT_WIDGET_TEMPLATE_CATEGORIES,
  "assistant.enabled": false,
  "assistant.launcher.avatarEnabled": false,
  "assistant.launcher.avatarAsset": null as string | null,
  "assistant.defaultMode": "docs-only" as AssistantMode,
  "assistant.docs.reindexOnBoot": false,
  "assistant.llm.enabled": false,
  "assistant.llm.provider": "none" as AssistantLlmProvider,
  "assistant.llm.model": "google/gemma-3n-e2b-it:free",
  "assistant.llm.maxInputTokens": 8192,
  "assistant.llm.maxOutputTokens": 2048,
  "assistant.llm.timeoutMs": 20000,
  "assistant.quotas.requestsPerMinute": 20,
  "assistant.quotas.requestsPerDay": 1000,
  // Global "real analytics collection" gate (TASK-483-03-L02). Default true so
  // analytics collect out of the box; DNT/GPC is still honored client- and
  // server-side, and preview renders never inject the snippet. When false, the
  // tracking snippet is not injected at all.
  "analytics.trackingEnabled": true,
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type SettingValueMap = typeof DEFAULT_SETTINGS;

export type SearchCategoryOverrides = Record<string, { label?: string; hidden?: boolean }>;

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));
const SETTING_KEY_ALIASES = {
  "site.baseUrl": "site.publicBaseUrl",
} as const;

const isBaseUrlKey = (key: SettingKey) =>
  key === "site.adminBaseUrl" || key === "site.publicBaseUrl";

const isAdminPathKey = (key: SettingKey) => key === "site.adminPath";
const isAdminRedirectKey = (key: SettingKey) => key === "site.adminRedirectEnabled";

const isOptionalIdSettingKey = (key: SettingKey) =>
  key === "site.homepageId" ||
  key === "site.notFoundPageId" ||
  key === "site.navigationMenuId" ||
  key === "site.footerTemplateId";

const isSiteShellSettingKey = (key: SettingKey) =>
  key === "site.name" ||
  key === "site.locale" ||
  key === "site.homepageId" ||
  key === "site.navigationMenuId" ||
  key === "site.footerTemplateId" ||
  key === "site.contentRoutes" ||
  key === "design.tokens";

/**
 * The public pages cache stores fully rendered HTML that embeds the global
 * site shell and document locale (TASK-455/TASK-547). Writes (or deletes)
 * touching a public-render setting must clear the whole site cache so the
 * next response cannot retain stale shell, route, design, or `<html lang>`
 * output.
 */
export const invalidateSiteShellCachesForKeys = (keys: Iterable<SettingKey>) => {
  for (const key of keys) {
    if (isSiteShellSettingKey(key)) {
      clearSiteCache();
      return;
    }
  }
};

export function resolveSettingKey(key: string): SettingKey {
  const normalized = SETTING_KEY_ALIASES[key as keyof typeof SETTING_KEY_ALIASES] ?? key;
  if (!ALLOWED_KEYS.has(normalized)) {
    throw new Error("settings_key_invalid");
  }
  return normalized as SettingKey;
}

export async function lockContentRouteSettingRootsTx(
  tx: DbTransaction,
  value: unknown
): Promise<void> {
  if (value === null || value === undefined) return;
  if (!Array.isArray(value)) throw new Error("settings_value_invalid");
  const slugs = new Set<string>();
  for (const route of value) {
    if (!route || Array.isArray(route) || typeof route !== "object") {
      throw new Error("settings_value_invalid");
    }
    const slug = Reflect.get(route, "type");
    if (typeof slug !== "string" || !slug) throw new Error("settings_value_invalid");
    slugs.add(slug);
  }
  const ordered = [...slugs].sort();
  if (ordered.length === 0) return;
  const rows = await tx
    .select({ id: contentTypes.id, slug: contentTypes.slug })
    .from(contentTypes)
    .where(inArray(contentTypes.slug, ordered))
    .orderBy(asc(contentTypes.id))
    .for("key share");
  const found = new Set(rows.map((row) => row.slug));
  if (rows.length !== ordered.length || ordered.some((slug) => !found.has(slug))) {
    throw new Error("settings_value_invalid");
  }
}

const ASSISTANT_SETTING_KEYS = [
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "assistant.defaultMode",
  "assistant.docs.reindexOnBoot",
  "assistant.llm.enabled",
  "assistant.llm.provider",
  "assistant.llm.model",
  "assistant.llm.maxInputTokens",
  "assistant.llm.maxOutputTokens",
  "assistant.llm.timeoutMs",
  "assistant.quotas.requestsPerMinute",
  "assistant.quotas.requestsPerDay",
] as const;

type AssistantSettingKey = (typeof ASSISTANT_SETTING_KEYS)[number];
const assistantSettingKeySet = new Set<string>(ASSISTANT_SETTING_KEYS);
const assistantModes: AssistantMode[] = ["docs-only", "llm-guide"];
const assistantProviders: AssistantLlmProvider[] = ["openai", "openrouter", "none"];
const postEditorModes: PostEditorMode[] = ["blocks", "classic"];
const LEGACY_ASSISTANT_DOCS_SETTING_KEYS = [
  "assistant.docs.backend",
  "assistant.docs.sourceRoot",
  "assistant.docs.paths",
] as const;

const isAssistantSettingKey = (key: SettingKey): key is AssistantSettingKey =>
  assistantSettingKeySet.has(key);

const normalizeBooleanValue = (value: unknown) => {
  if (typeof value !== "boolean") {
    throw new Error("settings_value_invalid");
  }
  return value;
};

const normalizePositiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("settings_value_invalid");
  }
  const normalized = Math.floor(value);
  if (normalized <= 0) {
    throw new Error("settings_value_invalid");
  }
  return normalized;
};

const normalizeBoundedInteger = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("settings_value_invalid");
  }
  const normalized = Math.floor(value);
  if (normalized < min || normalized > max) {
    throw new Error("settings_value_invalid");
  }
  return normalized;
};

const normalizeAssistantMode = (value: unknown): AssistantMode => {
  if (value === "llm-rag") return "llm-guide";
  if (typeof value !== "string" || !assistantModes.includes(value as AssistantMode)) {
    throw new Error("settings_value_invalid");
  }
  return value as AssistantMode;
};

const normalizeAssistantProvider = (value: unknown): AssistantLlmProvider => {
  if (typeof value !== "string" || !assistantProviders.includes(value as AssistantLlmProvider)) {
    throw new Error("settings_value_invalid");
  }
  return value as AssistantLlmProvider;
};

const normalizeAssistantModel = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("settings_value_invalid");
  }
  return trimmed;
};

const normalizeOptionalAssistantAsset = (value: unknown) => {
  if (value === null) return "";
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
};

const pickAssistantSettings = (values: SettingValueMap): AssistantGlobalSettings => ({
  "assistant.enabled": values["assistant.enabled"],
  "assistant.launcher.avatarEnabled": values["assistant.launcher.avatarEnabled"],
  "assistant.launcher.avatarAsset": values["assistant.launcher.avatarAsset"],
  "assistant.defaultMode": values["assistant.defaultMode"],
  "assistant.docs.reindexOnBoot": values["assistant.docs.reindexOnBoot"],
  "assistant.llm.enabled": values["assistant.llm.enabled"],
  "assistant.llm.provider": values["assistant.llm.provider"],
  "assistant.llm.model": values["assistant.llm.model"],
  "assistant.llm.maxInputTokens": values["assistant.llm.maxInputTokens"],
  "assistant.llm.maxOutputTokens": values["assistant.llm.maxOutputTokens"],
  "assistant.llm.timeoutMs": values["assistant.llm.timeoutMs"],
  "assistant.quotas.requestsPerMinute": values["assistant.quotas.requestsPerMinute"],
  "assistant.quotas.requestsPerDay": values["assistant.quotas.requestsPerDay"],
});

export function assertAssistantSettingsConsistency(values: AssistantGlobalSettings): void {
  if (values["assistant.defaultMode"] === "llm-guide") {
    if (!values["assistant.llm.enabled"]) {
      throw new Error("settings_value_invalid");
    }
    if (values["assistant.llm.provider"] === "none") {
      throw new Error("settings_value_invalid");
    }
  }
}

const normalizeBaseUrlValue = (value: unknown) => {
  if (value === null) return "";
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("settings_value_invalid");
    }
    return parsed.toString();
  } catch {
    throw new Error("settings_value_invalid");
  }
};

const normalizeBaseUrlOutput = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAdminPathValue = (value: unknown) => {
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) return "/admin";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized =
    prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
  if (!/^\/[a-zA-Z0-9_-]+$/.test(normalized)) {
    throw new Error("settings_value_invalid");
  }
  return normalized;
};

const normalizeOptionalId = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// TASK-482-05-L01: `site.timezone` is an IANA time-zone string. Prefer the
// runtime's own zone database (Intl) over a hardcoded list so the allowlist
// stays current; a non-string or an unknown zone is rejected as
// `settings_value_invalid`. Module-private (validated on write via the
// `validateSettingValue` dispatch); the Bun service suite covers the edge cases.
const normalizeTimezoneValue = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const tz = value.trim();
  if (!tz) {
    throw new Error("settings_value_invalid");
  }
  try {
    // Throws RangeError for an invalid IANA zone.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error("settings_value_invalid");
  }
  return tz;
};

const normalizeOptionalIdValue = (value: unknown) => {
  if (value === null) return "";
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const readContentRoutesSettingValue = (value: unknown): ContentRouteSetting[] => {
  try {
    return normalizeContentRoutes(value);
  } catch {
    return DEFAULT_SETTINGS["site.contentRoutes"];
  }
};

function validateSettingValue(key: SettingKey, value: unknown): SettingValueMap[SettingKey] {
  if (key === "site.name") {
    if (typeof value !== "string") {
      throw new Error("settings_value_invalid");
    }
    return value;
  }

  if (key === "site.locale") {
    return normalizeStoredSiteLocaleForWrite(value);
  }

  if (key === "site.timezone") {
    return normalizeTimezoneValue(value);
  }

  if (isBaseUrlKey(key)) {
    return normalizeBaseUrlValue(value);
  }

  if (isAdminPathKey(key)) {
    return normalizeAdminPathValue(value);
  }

  if (isAdminRedirectKey(key)) {
    if (typeof value !== "boolean") {
      throw new Error("settings_value_invalid");
    }
    return value;
  }

  if (isOptionalIdSettingKey(key)) {
    return normalizeOptionalIdValue(value);
  }

  if (key === "site.previewEnabled") {
    if (typeof value !== "boolean") {
      throw new Error("settings_value_invalid");
    }
    return value;
  }

  if (key === "site.maintenanceMode") {
    return normalizeBooleanValue(value);
  }

  if (key === "site.cacheTtlSeconds") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("settings_value_invalid");
    }
    const seconds = Math.floor(value);
    // Upper bound guarantees the site HTML cache TTL never outlives the beacon
    // nonce baked into cached pages (TASK-483 post-audit MEDIUM). See
    // analytics/beaconTtl.ts for the coupling invariant.
    if (seconds < 0 || seconds > MAX_SITE_CACHE_TTL_SECONDS) {
      throw new Error("settings_value_invalid");
    }
    return seconds;
  }

  if (key === "auth.sessionTtlDays") {
    return normalizeBoundedInteger(value, 1, 365);
  }

  if (key === "auth.resetTtlMinutes") {
    return normalizeBoundedInteger(value, 5, 1440);
  }

  if (key === "posts.editor.mode") {
    if (typeof value !== "string" || !postEditorModes.includes(value as PostEditorMode)) {
      throw new Error("settings_value_invalid");
    }
    return value as PostEditorMode;
  }

  if (key === "setup.completed") {
    return normalizeBooleanValue(value);
  }

  if (key === "analytics.trackingEnabled") {
    return normalizeBooleanValue(value);
  }

  if (key === "site.contentRoutes") {
    return normalizeContentRoutes(value);
  }

  if (key === "design.tokens") {
    assertTokenOverrides(value);
    return value;
  }

  if (key === "search.categoryOverrides") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("settings_value_invalid");
    }
    for (const entry of Object.values(value as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("settings_value_invalid");
      }
      const record = entry as { label?: unknown; hidden?: unknown };
      if (record.label !== undefined && typeof record.label !== "string") {
        throw new Error("settings_value_invalid");
      }
      if (record.hidden !== undefined && typeof record.hidden !== "boolean") {
        throw new Error("settings_value_invalid");
      }
    }
    return value as SearchCategoryOverrides;
  }

  if (key === "widgets.templateCategories") {
    if (!Array.isArray(value)) {
      throw new Error("settings_value_invalid");
    }
    const normalized = value.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("settings_value_invalid");
      }
      const record = entry as { id?: unknown; name?: unknown };
      if (typeof record.id !== "string" || typeof record.name !== "string") {
        throw new Error("settings_value_invalid");
      }
      const id = record.id.trim();
      const name = record.name.trim();
      if (!id || !name) {
        throw new Error("settings_value_invalid");
      }
      return { id, name };
    });
    return normalized as WidgetTemplateCategorySetting[];
  }

  if (
    key === "assistant.enabled" ||
    key === "assistant.launcher.avatarEnabled" ||
    key === "assistant.docs.reindexOnBoot"
  ) {
    return normalizeBooleanValue(value);
  }

  if (key === "assistant.launcher.avatarAsset") {
    return normalizeOptionalAssistantAsset(value);
  }

  if (key === "assistant.defaultMode") {
    return normalizeAssistantMode(value);
  }

  if (key === "assistant.llm.enabled") {
    return normalizeBooleanValue(value);
  }

  if (key === "assistant.llm.provider") {
    return normalizeAssistantProvider(value);
  }

  if (key === "assistant.llm.model") {
    return normalizeAssistantModel(value);
  }

  if (
    key === "assistant.llm.maxInputTokens" ||
    key === "assistant.llm.maxOutputTokens" ||
    key === "assistant.llm.timeoutMs" ||
    key === "assistant.quotas.requestsPerMinute" ||
    key === "assistant.quotas.requestsPerDay"
  ) {
    return normalizePositiveInteger(value);
  }

  throw new Error("settings_value_invalid");
}

export const normalizeSettingValueForWrite = (key: string, value: unknown) => {
  const normalizedKey = resolveSettingKey(key);
  return {
    key: normalizedKey,
    value: validateSettingValue(normalizedKey, value),
  };
};

let legacyAssistantSettingsMigrationPromise: Promise<void> | null = null;

const migrateLegacyAssistantSettingsTx = async (tx: DbTransaction): Promise<void> => {
  await tx.delete(settings).where(inArray(settings.key, [...LEGACY_ASSISTANT_DOCS_SETTING_KEYS]));
  const [defaultMode] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "assistant.defaultMode"));
  if (defaultMode?.value === "llm-rag") {
    await tx
      .update(settings)
      .set({ value: "llm-guide", updatedAt: new Date() })
      .where(eq(settings.key, "assistant.defaultMode"));
  }
};

async function ensureLegacyAssistantSettingsMigrated() {
  if (legacyAssistantSettingsMigrationPromise) {
    return legacyAssistantSettingsMigrationPromise;
  }

  legacyAssistantSettingsMigrationPromise = db
    .transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await migrateLegacyAssistantSettingsTx(tx);
      },
      { isolationLevel: "read committed" }
    )
    .catch(() => undefined);

  return legacyAssistantSettingsMigrationPromise;
}

export async function listSettings(): Promise<SettingValueMap> {
  await ensureLegacyAssistantSettingsMigrated();
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));

  const merged = { ...DEFAULT_SETTINGS } as SettingValueMap;
  const mergedByKey = merged as Record<SettingKey, SettingValueMap[SettingKey]>;
  for (const row of rows) {
    const key = row.key as SettingKey;
    if (key === "design.tokens") {
      merged[key] = row.value as DesignTokenOverrides;
      continue;
    }

    if (key === "search.categoryOverrides") {
      merged[key] = row.value as SearchCategoryOverrides;
      continue;
    }

    if (key === "widgets.templateCategories") {
      merged[key] = row.value as WidgetTemplateCategorySetting[];
      continue;
    }

    if (isAssistantSettingKey(key)) {
      try {
        mergedByKey[key] = validateSettingValue(key, row.value);
      } catch {
        mergedByKey[key] = DEFAULT_SETTINGS[key];
      }
      continue;
    }

    if (isBaseUrlKey(key)) {
      merged[key] = normalizeBaseUrlOutput(row.value);
      continue;
    }

    if (isAdminPathKey(key)) {
      merged[key] = normalizeAdminPathValue(row.value);
      continue;
    }

    if (isAdminRedirectKey(key)) {
      merged[key] = Boolean(row.value);
      continue;
    }

    if (isOptionalIdSettingKey(key)) {
      mergedByKey[key] = normalizeOptionalId(row.value);
      continue;
    }

    if (key === "site.previewEnabled") {
      merged[key] = Boolean(row.value);
      continue;
    }

    if (key === "site.maintenanceMode") {
      merged[key] = Boolean(row.value);
      continue;
    }

    if (key === "site.cacheTtlSeconds") {
      merged[key] = typeof row.value === "number" ? row.value : DEFAULT_SETTINGS[key];
      continue;
    }

    if (
      key === "auth.sessionTtlDays" ||
      key === "auth.resetTtlMinutes" ||
      key === "posts.editor.mode" ||
      key === "setup.completed" ||
      key === "analytics.trackingEnabled"
    ) {
      try {
        mergedByKey[key] = validateSettingValue(key, row.value);
      } catch {
        mergedByKey[key] = DEFAULT_SETTINGS[key];
      }
      continue;
    }

    if (key === "site.contentRoutes") {
      merged[key] = readContentRoutesSettingValue(row.value);
      continue;
    }

    if (key === "site.locale") {
      merged[key] = row.value as string;
      continue;
    }

    if (key in merged) {
      merged[key] = row.value as string;
    }
  }

  return merged;
}

export async function getSetting(key: string) {
  await ensureLegacyAssistantSettingsMigrated();
  const normalizedKey = resolveSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, normalizedKey));
  if (!row) return DEFAULT_SETTINGS[normalizedKey];
  if (isBaseUrlKey(normalizedKey)) {
    return normalizeBaseUrlOutput(row.value);
  }
  if (isAdminPathKey(normalizedKey)) {
    return normalizeAdminPathValue(row.value);
  }
  if (isAdminRedirectKey(normalizedKey)) {
    return Boolean(row.value);
  }
  if (isOptionalIdSettingKey(normalizedKey)) {
    return normalizeOptionalId(row.value);
  }
  if (normalizedKey === "site.previewEnabled") {
    return Boolean(row.value);
  }
  if (normalizedKey === "site.cacheTtlSeconds") {
    return typeof row.value === "number" ? row.value : DEFAULT_SETTINGS[normalizedKey];
  }
  if (normalizedKey === "site.contentRoutes") {
    return readContentRoutesSettingValue(row.value);
  }
  if (normalizedKey === "site.locale") {
    return row.value as SettingValueMap[typeof normalizedKey];
  }
  if (
    normalizedKey === "auth.sessionTtlDays" ||
    normalizedKey === "auth.resetTtlMinutes" ||
    normalizedKey === "setup.completed" ||
    normalizedKey === "analytics.trackingEnabled" ||
    isAssistantSettingKey(normalizedKey)
  ) {
    try {
      return validateSettingValue(normalizedKey, row.value);
    } catch {
      return DEFAULT_SETTINGS[normalizedKey];
    }
  }
  return row.value as SettingValueMap[typeof normalizedKey];
}

export async function getSettingRecord(key: string) {
  await ensureLegacyAssistantSettingsMigrated();
  const normalizedKey = resolveSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, normalizedKey));
  return row ?? null;
}

type ValidatedSettingWrite = Readonly<{
  key: SettingKey;
  value: SettingValueMap[SettingKey];
}>;

const validateSettingsObject = (values: Record<string, unknown>): ValidatedSettingWrite[] => {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("settings_payload_invalid");
  }
  const usedKeys = new Set<SettingKey>();
  return Object.entries(values).map(([rawKey, value]) => {
    const normalized = normalizeSettingValueForWrite(rawKey, value);
    if (usedKeys.has(normalized.key)) throw new Error("settings_payload_invalid");
    usedKeys.add(normalized.key);
    return normalized as ValidatedSettingWrite;
  });
};

const assertAssistantSettingsWriteTx = async (
  tx: DbTransaction,
  writes: readonly ValidatedSettingWrite[]
): Promise<void> => {
  if (!writes.some((entry) => isAssistantSettingKey(entry.key))) return;
  const rows = await tx
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...ASSISTANT_SETTING_KEYS]));
  const current = { ...DEFAULT_SETTINGS } as SettingValueMap;
  const currentByKey = current as Record<SettingKey, SettingValueMap[SettingKey]>;
  for (const row of rows) {
    const key = row.key as SettingKey;
    if (!isAssistantSettingKey(key)) continue;
    try {
      currentByKey[key] = validateSettingValue(key, row.value);
    } catch {
      currentByKey[key] = DEFAULT_SETTINGS[key];
    }
  }
  for (const entry of writes) currentByKey[entry.key] = entry.value;
  assertAssistantSettingsConsistency(pickAssistantSettings(current));
};

const readContentRoutesForUpdateTx = async (tx: DbTransaction): Promise<ContentRouteSetting[]> => {
  const [row] = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "site.contentRoutes"))
    .for("update");
  return row ? readContentRoutesSettingValue(row.value) : [];
};

const writeValidatedSettingsTx = async (
  tx: DbTransaction,
  writes: readonly ValidatedSettingWrite[]
): Promise<void> => {
  const keys = writes.map((entry) => entry.key).sort();
  if (keys.length > 0) {
    await tx
      .select({ key: settings.key })
      .from(settings)
      .where(inArray(settings.key, keys))
      .orderBy(asc(settings.key))
      .for("update");
  }
  const now = new Date();
  for (const entry of writes) {
    await tx
      .insert(settings)
      .values({ key: entry.key, value: entry.value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: entry.value, updatedAt: now },
      });
  }
};

const invalidateContentRouteTransition = (
  previous: readonly ContentRouteSetting[],
  next: readonly ContentRouteSetting[]
): void => {
  const touchedTypes = new Set([
    ...previous.map((entry) => entry.type),
    ...next.map((entry) => entry.type),
  ]);
  for (const typeSlug of touchedTypes) {
    invalidateContentRouteCacheTransition({
      previousRoutes: [...previous],
      nextRoutes: [...next],
      typeSlug,
    });
  }
};

export async function setSetting(key: string, value: unknown) {
  const write = validateSettingsObject({ [key]: value })[0]!;
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      if (write.key === "site.contentRoutes") {
        await lockContentRouteSettingRootsTx(tx, write.value);
      }
      await migrateLegacyAssistantSettingsTx(tx);
      const previous =
        write.key === "site.contentRoutes" ? await readContentRoutesForUpdateTx(tx) : null;
      await assertAssistantSettingsWriteTx(tx, [write]);
      await writeValidatedSettingsTx(tx, [write]);
      const [row] = await tx.select().from(settings).where(eq(settings.key, write.key));
      return { previous, row };
    },
    { isolationLevel: "read committed" }
  );

  if (result.previous) {
    invalidateContentRouteTransition(result.previous, write.value as ContentRouteSetting[]);
  }
  invalidateSiteShellCachesForKeys([write.key]);
  return result.row;
}

export async function setSettings(values: Record<string, unknown>) {
  const writes = validateSettingsObject(values);
  const routeWrite = writes.find((entry) => entry.key === "site.contentRoutes");
  const previousContentRoutes = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await lockContentRouteSettingRootsTx(tx, routeWrite?.value);
      await migrateLegacyAssistantSettingsTx(tx);
      const previous = routeWrite ? await readContentRoutesForUpdateTx(tx) : null;
      await assertAssistantSettingsWriteTx(tx, writes);
      await writeValidatedSettingsTx(tx, writes);
      return previous;
    },
    { isolationLevel: "read committed" }
  );

  if (previousContentRoutes && routeWrite) {
    invalidateContentRouteTransition(
      previousContentRoutes,
      routeWrite.value as ContentRouteSetting[]
    );
  }
  invalidateSiteShellCachesForKeys(writes.map((entry) => entry.key));
  return listSettings();
}

export async function setSettingsTx(tx: DbTransaction, values: Record<string, unknown>) {
  const writes = validateSettingsObject(values);
  const routeWrite = writes.find((entry) => entry.key === "site.contentRoutes");
  await lockContentRouteSettingRootsTx(tx, routeWrite?.value);
  await migrateLegacyAssistantSettingsTx(tx);
  if (routeWrite) await readContentRoutesForUpdateTx(tx);
  await assertAssistantSettingsWriteTx(tx, writes);
  await writeValidatedSettingsTx(tx, writes);
}

export async function deleteSetting(key: string) {
  const normalizedKey = resolveSettingKey(key);
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      await migrateLegacyAssistantSettingsTx(tx);
      const previous =
        normalizedKey === "site.contentRoutes" ? await readContentRoutesForUpdateTx(tx) : null;
      const [row] = await tx.delete(settings).where(eq(settings.key, normalizedKey)).returning();
      return { previous, row };
    },
    { isolationLevel: "read committed" }
  );

  if (result.previous) invalidateContentRouteTransition(result.previous, []);
  invalidateSiteShellCachesForKeys([normalizedKey]);
  return result.row ?? null;
}
