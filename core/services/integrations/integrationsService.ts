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
import { evaluateIntegrationHealth } from "./healthEvaluator";

export { evaluateIntegrationHealth } from "./healthEvaluator";

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

const isConfiguredValue = (value: unknown) => typeof value === "string" || isEncryptedSecret(value);

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

const toSummary = (
  definition: IntegrationDefinition,
  row?: IntegrationRow | null
): IntegrationSummary => {
  const config = normalizeStoredConfig(row?.config);
  const status = resolveStatus(definition, config);
  // Mirror the stored health exactly; never auto-promote a connected row to
  // "healthy" (TASK-491-04-L01). Health is real state from deliveries/checks.
  const healthStatus = (row?.healthStatus ?? "unknown") as IntegrationHealth;

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
  const configChanged = Boolean(input.config && Object.keys(input.config).length > 0);
  // A config change invalidates any previously recorded health: reset to
  // "unknown" and clear the last check so a stale "healthy" can never display
  // for an invalid new config (TASK-491-04-L01 M1 fix).
  const healthStatus = configChanged
    ? "unknown"
    : ((existing?.healthStatus ?? "unknown") as IntegrationHealth);
  const payload = {
    id,
    config: nextConfig,
    status,
    healthStatus,
    lastCheckedAt: configChanged ? null : (existing?.lastCheckedAt ?? null),
    lastError: configChanged ? null : (existing?.lastError ?? null),
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

export function decryptIntegrationConfig(config: StoredConfig): IntegrationRuntimeConfig {
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

/**
 * Persist a per-target health outcome (TASK-491-02-L02). Called by the Slack /
 * Zapier delivery adapters after a real outbound delivery (`ok` boolean) and by
 * the manual health-check flow (TASK-491-04-L01, `ok: null` for "unknown").
 * `lastError` must be a machine-readable code only — never a URL, secret, or
 * response body.
 */
export async function recordIntegrationHealth(
  id: string,
  input: { ok: boolean | null; lastError: string | null }
): Promise<void> {
  const healthStatus = input.ok === null ? "unknown" : input.ok ? "healthy" : "issue";
  await db
    .update(integrations)
    .set({
      healthStatus,
      lastCheckedAt: new Date(),
      lastError: input.ok ? null : input.lastError,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, id));
}

/**
 * Deterministic manual health check (TASK-491-04-L01): resolve + decrypt the
 * runtime config, evaluate it against the definition's validators, persist the
 * outcome, and return the refreshed (masked) summary. No live network probes:
 * a Slack/Zapier webhook has no safe no-op ping, so health reflects configured
 * validity plus the last real delivery outcome.
 */
export async function runIntegrationHealthCheck(id: string): Promise<IntegrationSummary> {
  const definition = getIntegrationDefinition(id);
  if (!definition) {
    throw new Error("integration_not_found");
  }

  const [row] = await db.select().from(integrations).where(eq(integrations.id, id));
  const config = decryptIntegrationConfig(normalizeStoredConfig(row?.config));
  const result = evaluateIntegrationHealth(definition, config, row?.lastError ?? null);
  const ok = result.status === "healthy" ? true : result.status === "issue" ? false : null;
  await recordIntegrationHealth(id, { ok, lastError: result.lastError });

  const updated = await getIntegration(id);
  if (!updated) {
    throw new Error("integration_update_failed");
  }
  return updated;
}
