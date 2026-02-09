import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { assertTokenOverrides } from "../theme/tokenValidation";
import type { DesignTokenOverrides } from "../theme/tokenTypes";

type WidgetTemplateCategorySetting = {
  id: string;
  name: string;
};

export type AssistantMode = "docs-only" | "llm-rag";
export type AssistantLlmProvider = "openrouter" | "none";

export type AssistantGlobalSettings = {
  "assistant.enabled": boolean;
  "assistant.defaultMode": AssistantMode;
  "assistant.docs.paths": string[];
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

export type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
};

const DEFAULT_WIDGET_TEMPLATE_CATEGORIES: WidgetTemplateCategorySetting[] = [
  { id: "layout", name: "Layout" },
  { id: "content", name: "Content" },
  { id: "forms", name: "Forms" },
  { id: "navigation", name: "Navigation" },
  { id: "media", name: "Media" },
];

const DEFAULT_CONTENT_ROUTES: ContentRouteSetting[] = [];
const DEFAULT_ASSISTANT_DOC_PATHS = ["_docs"];

const DEFAULT_SETTINGS = {
  "site.name": "Nextless",
  "site.locale": "en",
  "site.adminBaseUrl": null as string | null,
  "site.publicBaseUrl": null as string | null,
  "site.adminPath": "/admin",
  "site.adminRedirectEnabled": false,
  "site.homepageId": null as string | null,
  "site.notFoundPageId": null as string | null,
  "site.previewEnabled": true,
  "site.contentRoutes": DEFAULT_CONTENT_ROUTES,
  "site.cacheTtlSeconds": 30,
  "design.tokens": {} as DesignTokenOverrides,
  "search.categoryOverrides": {} as SearchCategoryOverrides,
  "widgets.templateCategories": DEFAULT_WIDGET_TEMPLATE_CATEGORIES,
  "assistant.enabled": false,
  "assistant.defaultMode": "docs-only" as AssistantMode,
  "assistant.docs.paths": DEFAULT_ASSISTANT_DOC_PATHS,
  "assistant.docs.reindexOnBoot": false,
  "assistant.llm.enabled": false,
  "assistant.llm.provider": "none" as AssistantLlmProvider,
  "assistant.llm.model": "google/gemma-3n-e2b-it:free",
  "assistant.llm.maxInputTokens": 8192,
  "assistant.llm.maxOutputTokens": 2048,
  "assistant.llm.timeoutMs": 20000,
  "assistant.quotas.requestsPerMinute": 20,
  "assistant.quotas.requestsPerDay": 1000,
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type SettingValueMap = typeof DEFAULT_SETTINGS;

export type SearchCategoryOverrides = Record<
  string,
  { label?: string; hidden?: boolean }
>;

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

const isBaseUrlKey = (key: SettingKey) =>
  key === "site.adminBaseUrl" || key === "site.publicBaseUrl";

const isAdminPathKey = (key: SettingKey) => key === "site.adminPath";
const isAdminRedirectKey = (key: SettingKey) => key === "site.adminRedirectEnabled";

function assertSettingKey(key: string): asserts key is SettingKey {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error("settings_key_invalid");
  }
}

const ASSISTANT_SETTING_KEYS = [
  "assistant.enabled",
  "assistant.defaultMode",
  "assistant.docs.paths",
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
const assistantModes: AssistantMode[] = ["docs-only", "llm-rag"];
const assistantProviders: AssistantLlmProvider[] = ["openrouter", "none"];

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

const normalizeAssistantMode = (value: unknown): AssistantMode => {
  if (typeof value !== "string" || !assistantModes.includes(value as AssistantMode)) {
    throw new Error("settings_value_invalid");
  }
  return value as AssistantMode;
};

const normalizeAssistantProvider = (value: unknown): AssistantLlmProvider => {
  if (
    typeof value !== "string" ||
    !assistantProviders.includes(value as AssistantLlmProvider)
  ) {
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

const normalizeAssistantDocsPaths = (value: unknown) => {
  if (!Array.isArray(value)) {
    throw new Error("settings_value_invalid");
  }
  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error("settings_value_invalid");
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      throw new Error("settings_value_invalid");
    }
    if (!normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }
  return normalized;
};

const pickAssistantSettings = (
  values: SettingValueMap
): AssistantGlobalSettings => ({
  "assistant.enabled": values["assistant.enabled"],
  "assistant.defaultMode": values["assistant.defaultMode"],
  "assistant.docs.paths": values["assistant.docs.paths"],
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

export function assertAssistantSettingsConsistency(
  values: AssistantGlobalSettings
): void {
  if (values["assistant.enabled"] && values["assistant.docs.paths"].length === 0) {
    throw new Error("settings_value_invalid");
  }
  if (values["assistant.defaultMode"] === "llm-rag") {
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
    prefixed.length > 1 && prefixed.endsWith("/")
      ? prefixed.slice(0, -1)
      : prefixed;
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

const normalizeOptionalIdValue = (value: unknown) => {
  if (value === null) return "";
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
};

const normalizeRoutePath = (value: unknown, allowRoot = false) => {
  if (typeof value !== "string") {
    throw new Error("settings_value_invalid");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("settings_value_invalid");
  }
  if (allowRoot && trimmed === "/") return "/";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") && prefixed.length > 1
    ? prefixed.slice(0, -1)
    : prefixed;
};

export const normalizeContentRoutes = (
  value: unknown
): ContentRouteSetting[] => {
  if (!Array.isArray(value)) {
    throw new Error("settings_value_invalid");
  }
  const seenTypes = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("settings_value_invalid");
    }
    const record = entry as {
      type?: unknown;
      listPath?: unknown;
      detailPath?: unknown;
      enabled?: unknown;
    };
    if (typeof record.type !== "string") {
      throw new Error("settings_value_invalid");
    }
    const type = record.type.trim();
    if (!type) {
      throw new Error("settings_value_invalid");
    }
    if (seenTypes.has(type)) {
      throw new Error("settings_value_invalid");
    }
    seenTypes.add(type);
    const listPath = normalizeRoutePath(record.listPath, true);
    const detailPath = normalizeRoutePath(record.detailPath, false);
    if (record.enabled !== undefined && typeof record.enabled !== "boolean") {
      throw new Error("settings_value_invalid");
    }
    return {
      type,
      listPath,
      detailPath,
      enabled: record.enabled ?? true,
    };
  });
};

function validateSettingValue(key: SettingKey, value: unknown): SettingValueMap[SettingKey] {
  if (key === "site.name" || key === "site.locale") {
    if (typeof value !== "string") {
      throw new Error("settings_value_invalid");
    }
    return value;
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

  if (key === "site.homepageId" || key === "site.notFoundPageId") {
    return normalizeOptionalIdValue(value);
  }

  if (key === "site.previewEnabled") {
    if (typeof value !== "boolean") {
      throw new Error("settings_value_invalid");
    }
    return value;
  }

  if (key === "site.cacheTtlSeconds") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("settings_value_invalid");
    }
    if (value < 0) {
      throw new Error("settings_value_invalid");
    }
    return Math.floor(value);
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

  if (key === "assistant.enabled" || key === "assistant.docs.reindexOnBoot") {
    return normalizeBooleanValue(value);
  }

  if (key === "assistant.defaultMode") {
    return normalizeAssistantMode(value);
  }

  if (key === "assistant.docs.paths") {
    return normalizeAssistantDocsPaths(value);
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

export async function listSettings(): Promise<SettingValueMap> {
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));

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

    if (key === "site.homepageId" || key === "site.notFoundPageId") {
      merged[key] = normalizeOptionalId(row.value);
      continue;
    }

    if (key === "site.previewEnabled") {
      merged[key] = Boolean(row.value);
      continue;
    }

    if (key === "site.cacheTtlSeconds") {
      merged[key] = typeof row.value === "number" ? row.value : DEFAULT_SETTINGS[key];
      continue;
    }

    if (key === "site.contentRoutes") {
      merged[key] = row.value as ContentRouteSetting[];
      continue;
    }

    if (key in merged) {
      merged[key] = row.value as string;
    }
  }

  return merged;
}

export async function getSetting(key: string) {
  assertSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) return DEFAULT_SETTINGS[key];
  if (isBaseUrlKey(key)) {
    return normalizeBaseUrlOutput(row.value);
  }
  if (isAdminPathKey(key)) {
    return normalizeAdminPathValue(row.value);
  }
  if (isAdminRedirectKey(key)) {
    return Boolean(row.value);
  }
  if (key === "site.homepageId" || key === "site.notFoundPageId") {
    return normalizeOptionalId(row.value);
  }
  if (key === "site.previewEnabled") {
    return Boolean(row.value);
  }
  if (key === "site.cacheTtlSeconds") {
    return typeof row.value === "number" ? row.value : DEFAULT_SETTINGS[key];
  }
  if (key === "site.contentRoutes") {
    return row.value as ContentRouteSetting[];
  }
  if (isAssistantSettingKey(key)) {
    try {
      return validateSettingValue(key, row.value);
    } catch {
      return DEFAULT_SETTINGS[key];
    }
  }
  return row.value as SettingValueMap[SettingKey];
}

export async function getSettingRecord(key: string) {
  assertSettingKey(key);
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row ?? null;
}

export async function setSetting(key: string, value: unknown) {
  assertSettingKey(key);
  const typedValue = validateSettingValue(key, value);
  if (isAssistantSettingKey(key)) {
    const current = await listSettings();
    const next = {
      ...current,
      [key]: typedValue,
    } as SettingValueMap;
    assertAssistantSettingsConsistency(pickAssistantSettings(next));
  }
  const now = new Date();

  const [row] = await db
    .insert(settings)
    .values({ key, value: typedValue, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: typedValue, updatedAt: now },
    })
    .returning();

  return row;
}

export async function setSettings(values: Record<string, unknown>) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("settings_payload_invalid");
  }

  const entries = Object.entries(values);
  const now = new Date();
  const validated = entries.map(([key, value]) => {
    assertSettingKey(key);
    const typedValue = validateSettingValue(key, value);
    return { key, value: typedValue };
  });

  if (validated.some((entry) => isAssistantSettingKey(entry.key))) {
    const current = await listSettings();
    const next = { ...current } as SettingValueMap;
    for (const entry of validated) {
      (next as Record<string, unknown>)[entry.key] = entry.value;
    }
    assertAssistantSettingsConsistency(pickAssistantSettings(next));
  }

  await db.transaction(async (tx) => {
    for (const entry of validated) {
      await tx
        .insert(settings)
        .values({ key: entry.key, value: entry.value, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: now },
        });
    }
  });

  return listSettings();
}

export async function deleteSetting(key: string) {
  assertSettingKey(key);
  const [row] = await db
    .delete(settings)
    .where(eq(settings.key, key))
    .returning();

  return row ?? null;
}
