import { eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { settings } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "../security/secretStore";

export type StorageDriver = "local" | "s3" | "azure";

export type StorageSettingsPublic = {
  driver: StorageDriver;
  local: { dir: string | null };
  publicBaseUrl: string | null;
  maxSizeBytes: number | null;
  allowedMime: string | null;
  s3: {
    bucket: string | null;
    region: string | null;
    endpoint: string | null;
    accessKey: { configured: boolean };
    secretKey: { configured: boolean };
  };
  azure: {
    container: string | null;
    account: string | null;
    key: { configured: boolean };
    connectionString: { configured: boolean };
  };
};

export type StorageSettingsInternal = {
  driver: StorageDriver;
  localDir: string | null;
  publicBaseUrl: string | null;
  maxSizeBytes: number | null;
  allowedMime: string[];
  s3: {
    bucket: string | null;
    region: string | null;
    endpoint: string | null;
    accessKey: string | null;
    secretKey: string | null;
  };
  azure: {
    container: string | null;
    account: string | null;
    key: string | null;
    connectionString: string | null;
  };
};

export type StorageSettingsUpdate = {
  driver?: StorageDriver;
  local?: { dir?: string | null };
  publicBaseUrl?: string | null;
  maxSizeBytes?: number | null;
  allowedMime?: string | string[] | null;
  s3?: {
    bucket?: string | null;
    region?: string | null;
    endpoint?: string | null;
    accessKey?: string | null;
    secretKey?: string | null;
  };
  azure?: {
    container?: string | null;
    account?: string | null;
    key?: string | null;
    connectionString?: string | null;
  };
};

const STORAGE_KEYS = {
  driver: "storage.driver",
  localDir: "storage.local.dir",
  publicBaseUrl: "storage.publicBaseUrl",
  maxSizeBytes: "storage.maxSizeBytes",
  allowedMime: "storage.allowedMime",
  s3Bucket: "storage.s3.bucket",
  s3Region: "storage.s3.region",
  s3AccessKey: "storage.s3.accessKey",
  s3SecretKey: "storage.s3.secretKey",
  s3Endpoint: "storage.s3.endpoint",
  azureContainer: "storage.azure.container",
  azureAccount: "storage.azure.account",
  azureKey: "storage.azure.key",
  azureConnectionString: "storage.azure.connectionString",
} as const;

const ALL_KEYS: string[] = Object.values(STORAGE_KEYS);

let cachedPublic: StorageSettingsPublic | null = null;
let cachedInternal: StorageSettingsInternal | null = null;
let cachedUpdatedAt: number | null = null;

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME = "image/*,application/pdf";

const normalizeString = (value: unknown) => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("storage_settings_invalid");
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const normalizeDriver = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) throw new Error("storage_settings_invalid");
  if (value === "local" || value === "s3" || value === "azure") return value;
  throw new Error("storage_settings_invalid");
};

const normalizeNumber = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error("storage_settings_invalid");
};

const normalizeAllowedMime = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(",");
  }
  if (typeof value === "string") return value;
  throw new Error("storage_settings_invalid");
};

const normalizeSecret = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("storage_settings_invalid");
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const normalizeAllowedMimeList = (value: unknown) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return [] as string[];
};

const getStringValue = (value: unknown) =>
  typeof value === "string" ? value : null;

const getNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const hasSecretValue = (value: unknown) =>
  typeof value === "string" || isEncryptedSecret(value);

const resolveSecretValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (isEncryptedSecret(value)) return decryptSecret(value);
  return null;
};

const resolveDriverWithFallback = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "local" || normalized === "s3" || normalized === "azure") {
      return normalized as StorageDriver;
    }
    throw new Error(`media_storage_unknown:${normalized}`);
  }
  const envDriver = process.env.MEDIA_STORAGE?.toLowerCase();
  if (envDriver === "s3" || envDriver === "azure" || envDriver === "local") {
    return envDriver;
  }
  if (envDriver) {
    throw new Error(`media_storage_unknown:${envDriver}`);
  }
  return "local";
};

const resolveStringWithFallback = (value: unknown, fallback?: string | null) =>
  getStringValue(value) ?? fallback ?? null;

const resolveNumberWithFallback = (value: unknown, fallback?: number | null) =>
  getNumberValue(value) ?? fallback ?? null;

const resolveAllowedMimeWithFallback = (value: unknown) => {
  if (value !== null && value !== undefined) return normalizeAllowedMimeList(value);
  const fallback = process.env.MEDIA_ALLOWED_MIME ?? DEFAULT_ALLOWED_MIME;
  return normalizeAllowedMimeList(fallback);
};

const resolveMaxSizeWithFallback = (value: unknown) => {
  if (value !== null && value !== undefined) return getNumberValue(value) ?? null;
  const fallback = Number(process.env.MEDIA_MAX_SIZE_BYTES ?? DEFAULT_MAX_SIZE);
  return Number.isFinite(fallback) ? fallback : DEFAULT_MAX_SIZE;
};

const buildUpdatedAt = (rows: Array<{ updatedAt: Date }>) => {
  if (!rows.length) return null;
  return Math.max(...rows.map((row) => row.updatedAt.getTime()));
};

async function loadStorageRecords() {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, ALL_KEYS));
    const map = new Map(rows.map((row) => [row.key, row]));
    return { map, updatedAt: buildUpdatedAt(rows) };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return { map: new Map(), updatedAt: null };
    }
    throw error;
  }
}

export function resetStorageSettingsCache() {
  cachedPublic = null;
  cachedInternal = null;
  cachedUpdatedAt = null;
}

export async function getStorageSettings(): Promise<StorageSettingsPublic> {
  const { map, updatedAt } = await loadStorageRecords();
  if (cachedPublic && cachedUpdatedAt === updatedAt) return cachedPublic;

  const driver = resolveDriverWithFallback(map.get(STORAGE_KEYS.driver)?.value);
  const publicBaseUrl = resolveStringWithFallback(
    map.get(STORAGE_KEYS.publicBaseUrl)?.value,
    process.env.MEDIA_BASE_URL
  );

  const payload: StorageSettingsPublic = {
    driver,
    local: {
      dir: resolveStringWithFallback(
        map.get(STORAGE_KEYS.localDir)?.value,
        process.env.MEDIA_DIR
      ),
    },
    publicBaseUrl,
    maxSizeBytes: resolveNumberWithFallback(
      map.get(STORAGE_KEYS.maxSizeBytes)?.value,
      resolveMaxSizeWithFallback(undefined)
    ),
    allowedMime: resolveStringWithFallback(
      map.get(STORAGE_KEYS.allowedMime)?.value,
      process.env.MEDIA_ALLOWED_MIME
    ),
    s3: {
      bucket: getStringValue(map.get(STORAGE_KEYS.s3Bucket)?.value),
      region: getStringValue(map.get(STORAGE_KEYS.s3Region)?.value),
      endpoint: getStringValue(map.get(STORAGE_KEYS.s3Endpoint)?.value),
      accessKey: { configured: hasSecretValue(map.get(STORAGE_KEYS.s3AccessKey)?.value) },
      secretKey: { configured: hasSecretValue(map.get(STORAGE_KEYS.s3SecretKey)?.value) },
    },
    azure: {
      container: getStringValue(map.get(STORAGE_KEYS.azureContainer)?.value),
      account: getStringValue(map.get(STORAGE_KEYS.azureAccount)?.value),
      key: { configured: hasSecretValue(map.get(STORAGE_KEYS.azureKey)?.value) },
      connectionString: {
        configured: hasSecretValue(map.get(STORAGE_KEYS.azureConnectionString)?.value),
      },
    },
  };

  cachedPublic = payload;
  cachedUpdatedAt = updatedAt;
  return payload;
}

export async function getStorageSettingsInternal(): Promise<StorageSettingsInternal> {
  const { map, updatedAt } = await loadStorageRecords();
  if (cachedInternal && cachedUpdatedAt === updatedAt) return cachedInternal;

  const driver = resolveDriverWithFallback(map.get(STORAGE_KEYS.driver)?.value);
  const publicBaseUrl = resolveStringWithFallback(
    map.get(STORAGE_KEYS.publicBaseUrl)?.value,
    process.env.MEDIA_BASE_URL
  );
  const localDir = resolveStringWithFallback(
    map.get(STORAGE_KEYS.localDir)?.value,
    process.env.MEDIA_DIR ?? "/data/media"
  );

  const maxSizeBytes = resolveMaxSizeWithFallback(
    map.get(STORAGE_KEYS.maxSizeBytes)?.value
  );
  const allowedMime = resolveAllowedMimeWithFallback(
    map.get(STORAGE_KEYS.allowedMime)?.value
  );

  const s3Config = {
    bucket: getStringValue(map.get(STORAGE_KEYS.s3Bucket)?.value) ?? process.env.S3_BUCKET ?? null,
    region: getStringValue(map.get(STORAGE_KEYS.s3Region)?.value) ?? process.env.S3_REGION ?? null,
    endpoint: getStringValue(map.get(STORAGE_KEYS.s3Endpoint)?.value) ?? process.env.S3_ENDPOINT ?? null,
    accessKey:
      driver === "s3"
        ? resolveSecretValue(map.get(STORAGE_KEYS.s3AccessKey)?.value) ??
          process.env.S3_ACCESS_KEY ??
          null
        : null,
    secretKey:
      driver === "s3"
        ? resolveSecretValue(map.get(STORAGE_KEYS.s3SecretKey)?.value) ??
          process.env.S3_SECRET_KEY ??
          null
        : null,
  };

  const azureConfig = {
    container:
      getStringValue(map.get(STORAGE_KEYS.azureContainer)?.value) ??
      process.env.AZURE_CONTAINER ??
      null,
    account:
      getStringValue(map.get(STORAGE_KEYS.azureAccount)?.value) ??
      process.env.AZURE_ACCOUNT ??
      null,
    key:
      driver === "azure"
        ? resolveSecretValue(map.get(STORAGE_KEYS.azureKey)?.value) ??
          process.env.AZURE_KEY ??
          null
        : null,
    connectionString:
      driver === "azure"
        ? resolveSecretValue(map.get(STORAGE_KEYS.azureConnectionString)?.value) ??
          process.env.AZURE_STORAGE_CONNECTION_STRING ??
          null
        : null,
  };

  const payload: StorageSettingsInternal = {
    driver,
    localDir,
    publicBaseUrl,
    maxSizeBytes,
    allowedMime,
    s3: s3Config,
    azure: azureConfig,
  };

  cachedInternal = payload;
  cachedUpdatedAt = updatedAt;
  return payload;
}

export async function setStorageSettings(payload: StorageSettingsUpdate) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("storage_settings_invalid");
  }

  const driver = normalizeDriver(payload.driver);
  const localDir = payload.local?.dir !== undefined
    ? normalizeString(payload.local?.dir)
    : undefined;
  const publicBaseUrl = normalizeString(payload.publicBaseUrl);
  const maxSizeBytes = normalizeNumber(payload.maxSizeBytes);
  const allowedMime = normalizeAllowedMime(payload.allowedMime);

  const s3Bucket = normalizeString(payload.s3?.bucket);
  const s3Region = normalizeString(payload.s3?.region);
  const s3Endpoint = normalizeString(payload.s3?.endpoint);
  const s3AccessKey = normalizeSecret(payload.s3?.accessKey);
  const s3SecretKey = normalizeSecret(payload.s3?.secretKey);

  const azureContainer = normalizeString(payload.azure?.container);
  const azureAccount = normalizeString(payload.azure?.account);
  const azureKey = normalizeSecret(payload.azure?.key);
  const azureConnectionString = normalizeSecret(payload.azure?.connectionString);

  const toUpsert: Array<{ key: string; value: unknown }> = [];
  const toDelete: string[] = [];

  const queueValue = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (value === null) {
      toDelete.push(key);
      return;
    }
    toUpsert.push({ key, value });
  };

  queueValue(STORAGE_KEYS.driver, driver);
  queueValue(STORAGE_KEYS.localDir, localDir);
  queueValue(STORAGE_KEYS.publicBaseUrl, publicBaseUrl);
  queueValue(STORAGE_KEYS.maxSizeBytes, maxSizeBytes);
  queueValue(STORAGE_KEYS.allowedMime, allowedMime);

  queueValue(STORAGE_KEYS.s3Bucket, s3Bucket);
  queueValue(STORAGE_KEYS.s3Region, s3Region);
  queueValue(STORAGE_KEYS.s3Endpoint, s3Endpoint);

  if (s3AccessKey !== undefined) {
    queueValue(
      STORAGE_KEYS.s3AccessKey,
      s3AccessKey === null ? null : encryptSecret(s3AccessKey)
    );
  }
  if (s3SecretKey !== undefined) {
    queueValue(
      STORAGE_KEYS.s3SecretKey,
      s3SecretKey === null ? null : encryptSecret(s3SecretKey)
    );
  }

  queueValue(STORAGE_KEYS.azureContainer, azureContainer);
  queueValue(STORAGE_KEYS.azureAccount, azureAccount);

  if (azureKey !== undefined) {
    queueValue(
      STORAGE_KEYS.azureKey,
      azureKey === null ? null : encryptSecret(azureKey)
    );
  }
  if (azureConnectionString !== undefined) {
    queueValue(
      STORAGE_KEYS.azureConnectionString,
      azureConnectionString === null ? null : encryptSecret(azureConnectionString)
    );
  }

  if (toUpsert.length === 0 && toDelete.length === 0) {
    return getStorageSettings();
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const entry of toUpsert) {
      await tx
        .insert(settings)
        .values({ key: entry.key, value: entry.value, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: now },
        });
    }

    if (toDelete.length > 0) {
      await tx.delete(settings).where(inArray(settings.key, toDelete));
    }
  });

  resetStorageSettingsCache();
  return getStorageSettings();
}

export async function getStorageSettingRecord(key: string) {
  if (!ALL_KEYS.includes(key)) {
    throw new Error("storage_settings_invalid");
  }
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row ?? null;
}
