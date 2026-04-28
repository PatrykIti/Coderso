import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { plugins, pluginSettings } from "../db/schema";

export type PluginStatus = "installed" | "disabled" | "error";
export type PluginRecord = typeof plugins.$inferSelect;
export type PluginEntry = {
  server: string;
  client?: string;
  styles?: string;
};

export type RegisterPluginInput = {
  name: string;
  version: string;
  apiVersion: string;
  coreVersion: string;
  permissions: string[];
  entry: PluginEntry;
  integrity: Record<string, string>;
  signature?: string | null;
  enabled?: boolean;
  status?: PluginStatus;
};

const MAX_ERROR_LENGTH = 2000;

function truncateError(value: string) {
  if (value.length <= MAX_ERROR_LENGTH) return value;
  return value.slice(0, MAX_ERROR_LENGTH);
}

export function formatPluginError(error: unknown) {
  if (error instanceof Error) {
    const header = `${error.name}: ${error.message}`;
    if (!error.stack) return header;
    return truncateError(`${header}\n${error.stack}`);
  }

  if (typeof error === "string") return truncateError(error);

  try {
    return truncateError(JSON.stringify(error));
  } catch {
    return "unknown_error";
  }
}

export async function listPlugins() {
  return db.select().from(plugins).orderBy(plugins.name);
}

export async function getPluginByName(name: string) {
  const [row] = await db.select().from(plugins).where(eq(plugins.name, name));
  return row ?? null;
}

export async function registerPlugin(input: RegisterPluginInput) {
  const now = new Date();
  const existing = await getPluginByName(input.name);
  const enabled = input.enabled ?? existing?.enabled ?? true;
  const status = input.status ?? existing?.status ?? "installed";

  if (!existing) {
    const [row] = await db
      .insert(plugins)
      .values({
        name: input.name,
        version: input.version,
        apiVersion: input.apiVersion,
        coreVersion: input.coreVersion,
        enabled,
        status,
        permissions: input.permissions,
        entry: input.entry,
        integrity: input.integrity,
        signature: input.signature ?? null,
        installedAt: now,
        updatedAt: now,
      })
      .returning();

    return row ?? null;
  }

  const [row] = await db
    .update(plugins)
    .set({
      version: input.version,
      apiVersion: input.apiVersion,
      coreVersion: input.coreVersion,
      permissions: input.permissions,
      entry: input.entry,
      integrity: input.integrity,
      signature: input.signature ?? null,
      enabled,
      status,
      updatedAt: now,
    })
    .where(eq(plugins.name, input.name))
    .returning();

  return row ?? null;
}

export async function setPluginEnabled(name: string, enabled: boolean) {
  const now = new Date();
  const status: PluginStatus = enabled ? "installed" : "disabled";

  const [row] = await db
    .update(plugins)
    .set({ enabled, status, updatedAt: now })
    .where(eq(plugins.name, name))
    .returning();

  return row ?? null;
}

export async function setPluginStatus(name: string, status: PluginStatus) {
  const now = new Date();
  const [row] = await db
    .update(plugins)
    .set({ status, updatedAt: now })
    .where(eq(plugins.name, name))
    .returning();

  return row ?? null;
}

export async function updatePluginErrorState(
  name: string,
  input: { errorCount: number; lastError: string | null; status?: PluginStatus; enabled?: boolean }
) {
  const now = new Date();
  const values: Partial<typeof plugins.$inferInsert> = {
    errorCount: input.errorCount,
    lastError: input.lastError,
    updatedAt: now,
  };

  if (input.status) {
    values.status = input.status;
  }

  if (typeof input.enabled === "boolean") {
    values.enabled = input.enabled;
  }

  const [row] = await db
    .update(plugins)
    .set(values)
    .where(eq(plugins.name, name))
    .returning();

  return row ?? null;
}

export async function resetPluginErrors(name: string) {
  const now = new Date();
  const [row] = await db
    .update(plugins)
    .set({ errorCount: 0, lastError: null, status: "installed", updatedAt: now })
    .where(eq(plugins.name, name))
    .returning();

  return row ?? null;
}

export async function getPluginSetting(pluginName: string, key: string) {
  const [row] = await db
    .select()
    .from(pluginSettings)
    .where(and(eq(pluginSettings.pluginName, pluginName), eq(pluginSettings.key, key)));

  return row?.value ?? null;
}

export async function listPluginSettings(pluginName: string) {
  const rows = await db
    .select()
    .from(pluginSettings)
    .where(eq(pluginSettings.pluginName, pluginName));

  return rows.reduce<Record<string, unknown>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function setPluginSetting(
  pluginName: string,
  key: string,
  value: unknown
) {
  const now = new Date();
  const [row] = await db
    .insert(pluginSettings)
    .values({ pluginName, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [pluginSettings.pluginName, pluginSettings.key],
      set: { value, updatedAt: now },
    })
    .returning();

  return row ?? null;
}

export async function deletePluginSetting(pluginName: string, key: string) {
  const [row] = await db
    .delete(pluginSettings)
    .where(and(eq(pluginSettings.pluginName, pluginName), eq(pluginSettings.key, key)))
    .returning();

  return row ?? null;
}
