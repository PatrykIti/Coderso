import { desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { integrationRequests, integrations } from "../../db/schema";
import {
  decryptSecret,
  encryptSecret,
  hasValidSecretMasterKey,
  isEncryptedSecret,
} from "../security/secretStore";
import {
  getIntegrationDefinition,
  listIntegrationDefinitions,
  type IntegrationDefinition,
  type IntegrationField,
} from "./registry";

export type IntegrationStatus = "connected" | "disconnected";
export type IntegrationHealth = "unknown" | "healthy" | "issue";

export type IntegrationFieldSummary = {
  key: string;
  label: string;
  type: IntegrationField["type"];
  required: boolean;
  secret: boolean;
  value: string | null;
  configured: boolean;
};

export type IntegrationSummary = {
  id: string;
  name: string;
  description: string;
  category: string;
  scopes: string[];
  status: IntegrationStatus;
  health: {
    status: IntegrationHealth;
    lastCheckedAt: Date | null;
    lastError: string | null;
  };
  updatedAt: Date | null;
  fields: IntegrationFieldSummary[];
};

export type IntegrationUpdateInput = {
  config?: Record<string, string | null | undefined>;
};

export type IntegrationRequestInput = {
  name: string;
  website?: string | null;
  notes?: string | null;
};

export type IntegrationRuntimeConfig = Record<string, string | null>;

type StoredConfig = Record<string, string | ReturnType<typeof encryptSecret> | null>;

type IntegrationRow = typeof integrations.$inferSelect;

type IntegrationRequestRow = typeof integrationRequests.$inferSelect;

const normalizeString = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("integration_config_invalid");
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const normalizeOptional = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("integration_request_invalid");
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

const normalizeStoredConfig = (value: unknown): StoredConfig => {
  if (!value || typeof value !== "object") return {};
  return value as StoredConfig;
};

const isConfiguredValue = (value: unknown) =>
  typeof value === "string" || isEncryptedSecret(value);

const toFieldSummary = (field: IntegrationField, config: StoredConfig): IntegrationFieldSummary => {
  const raw = config[field.key];
  const secret = field.type === "secret";
  if (secret) {
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      secret: true,
      value: null,
      configured: isConfiguredValue(raw),
    };
  }

  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: Boolean(field.required),
    secret: false,
    value: typeof raw === "string" ? raw : null,
    configured: typeof raw === "string" && raw.trim().length > 0,
  };
};

const resolveStatus = (definition: IntegrationDefinition, config: StoredConfig) => {
  const missingRequired = definition.fields.some((field) => {
    if (!field.required) return false;
    const raw = config[field.key];
    if (field.type === "secret") {
      return !isConfiguredValue(raw);
    }
    return typeof raw !== "string" || raw.trim().length === 0;
  });
  return (missingRequired ? "disconnected" : "connected") as IntegrationStatus;
};

const toSummary = (definition: IntegrationDefinition, row?: IntegrationRow | null): IntegrationSummary => {
  const config = normalizeStoredConfig(row?.config);
  const status = resolveStatus(definition, config);
  const healthStatus = (row?.healthStatus ?? (status === "connected" ? "healthy" : "unknown")) as IntegrationHealth;

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    scopes: definition.scopes,
    status,
    health: {
      status: healthStatus,
      lastCheckedAt: row?.lastCheckedAt ?? null,
      lastError: row?.lastError ?? null,
    },
    updatedAt: row?.updatedAt ?? null,
    fields: definition.fields.map((field) => toFieldSummary(field, config)),
  };
};

const ensureKnownKeys = (definition: IntegrationDefinition, config?: Record<string, unknown>) => {
  if (!config) return;
  const allowed = new Set(definition.fields.map((field) => field.key));
  for (const key of Object.keys(config)) {
    if (!allowed.has(key)) {
      throw new Error("integration_config_invalid");
    }
  }
};

export async function listIntegrations(): Promise<IntegrationSummary[]> {
  const definitions = listIntegrationDefinitions();
  if (definitions.length === 0) return [];

  const ids = definitions.map((definition) => definition.id);
  const rows = await db
    .select()
    .from(integrations)
    .where(inArray(integrations.id, ids))
    .orderBy(desc(integrations.updatedAt));

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return definitions.map((definition) => toSummary(definition, rowMap.get(definition.id)));
}

export async function getIntegration(id: string): Promise<IntegrationSummary | null> {
  const definition = getIntegrationDefinition(id);
  if (!definition) return null;

  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  return toSummary(definition, row ?? null);
}

export async function updateIntegration(
  id: string,
  input: IntegrationUpdateInput
): Promise<IntegrationSummary> {
  const definition = getIntegrationDefinition(id);
  if (!definition) {
    throw new Error("integration_not_found");
  }

  ensureKnownKeys(definition, input.config);

  const [existing] = await db.select().from(integrations).where(eq(integrations.id, id));
  const existingConfig = normalizeStoredConfig(existing?.config);
  const nextConfig: StoredConfig = { ...existingConfig };

  for (const field of definition.fields) {
    if (!input.config || !Object.prototype.hasOwnProperty.call(input.config, field.key)) {
      continue;
    }

    const rawValue = input.config[field.key];
    const normalized = normalizeString(rawValue);

    if (field.type === "secret") {
      if (normalized === undefined) {
        continue;
      }
      if (normalized === null) {
        nextConfig[field.key] = null;
      } else {
        if (!hasValidSecretMasterKey()) {
          throw new Error("secret_master_key_invalid");
        }
        nextConfig[field.key] = encryptSecret(normalized);
      }
      continue;
    }

    if (normalized === undefined) {
      continue;
    }
    nextConfig[field.key] = normalized;
  }

  const status = resolveStatus(definition, nextConfig);
  const payload = {
    id,
    config: nextConfig,
    status,
    healthStatus: status === "connected" ? "healthy" : "unknown",
    updatedAt: new Date(),
  } satisfies Partial<IntegrationRow> & { id: string; config: StoredConfig };

  let row: IntegrationRow | undefined;
  if (existing) {
    const [updated] = await db
      .update(integrations)
      .set(payload)
      .where(eq(integrations.id, id))
      .returning();
    row = updated;
  } else {
    const [created] = await db
      .insert(integrations)
      .values({
        ...payload,
        createdAt: new Date(),
      })
      .returning();
    row = created;
  }

  if (!row) {
    throw new Error("integration_update_failed");
  }

  return toSummary(definition, row);
}

export async function requestIntegration(input: IntegrationRequestInput) {
  const name = normalizeOptional(input.name);
  if (!name) {
    throw new Error("integration_request_invalid");
  }

  const website = normalizeOptional(input.website);
  const notes = normalizeOptional(input.notes);

  const [row] = await db
    .insert(integrationRequests)
    .values({
      name,
      website,
      notes,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("integration_request_failed");
  }

  return row as IntegrationRequestRow;
}

export function decryptIntegrationConfig(
  config: StoredConfig
): IntegrationRuntimeConfig {
  const resolved: IntegrationRuntimeConfig = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      resolved[key] = value;
    } else if (isEncryptedSecret(value)) {
      resolved[key] = decryptSecret(value);
    } else {
      resolved[key] = null;
    }
  }
  return resolved;
}

export async function getIntegrationRuntimeConfig(
  id: string
): Promise<IntegrationRuntimeConfig | null> {
  const definition = getIntegrationDefinition(id);
  if (!definition) return null;

  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  if (!row) return {};

  return decryptIntegrationConfig(normalizeStoredConfig(row.config));
}
