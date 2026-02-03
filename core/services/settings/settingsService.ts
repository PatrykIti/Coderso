import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { assertTokenOverrides } from "../theme/tokenValidation";
import type { DesignTokenOverrides } from "../theme/tokenTypes";

type WidgetTemplateCategorySetting = {
  id: string;
  name: string;
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
    return normalizeOptionalId(value);
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

  throw new Error("settings_value_invalid");
}

export async function listSettings(): Promise<SettingValueMap> {
  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, keys));

  const merged = { ...DEFAULT_SETTINGS } as SettingValueMap;
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
