const PLUGIN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,62})$/;
const REF_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._:/-]{0,95})$/;

const PROVIDE_KEYS = ["modules", "widgets", "presets", "templates", "routes"] as const;

export type CodersoPluginProvideKey = (typeof PROVIDE_KEYS)[number];

export type CodersoPluginProvides = Partial<Record<CodersoPluginProvideKey, string[]>>;

export type CodersoPluginMigration = {
  id: string;
  file: string;
};

export type CodersoPluginEntry = {
  server: string;
  client?: string;
  styles?: string;
};

export type CodersoPluginManifest = {
  id: string;
  name: string;
  version: string;
  targetApiVersion: string;
  targetCoreVersion: string;
  entry: CodersoPluginEntry;
  provides: CodersoPluginProvides;
  permissions: string[];
  dependencies: string[];
  featureFlags: string[];
  migrations: CodersoPluginMigration[];
  metadata?: Record<string, unknown>;
  integrity: Record<string, string>;
  signature?: string | null;
};

export type CodersoPluginManifestInput = {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  targetApiVersion?: unknown;
  apiVersion?: unknown;
  targetCoreVersion?: unknown;
  coreVersion?: unknown;
  entry?: unknown;
  provides?: unknown;
  permissions?: unknown;
  dependencies?: unknown;
  featureFlags?: unknown;
  migrations?: unknown;
  metadata?: unknown;
  integrity?: unknown;
  signature?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, errorCode: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(errorCode);
  }
  return value.trim();
}

function normalizeRefArray(value: unknown, errorCode: string) {
  if (value == null) return [] as string[];
  if (!Array.isArray(value)) throw new Error(errorCode);

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    const ref = assertNonEmptyString(item, errorCode);
    if (!REF_ID_PATTERN.test(ref)) throw new Error(errorCode);
    if (seen.has(ref)) continue;
    seen.add(ref);
    normalized.push(ref);
  }

  return normalized;
}

function normalizeRouteRefArray(value: unknown, errorCode: string) {
  if (value == null) return [] as string[];
  if (!Array.isArray(value)) throw new Error(errorCode);

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    const ref = assertNonEmptyString(item, errorCode);
    if (seen.has(ref)) continue;
    seen.add(ref);
    normalized.push(ref);
  }

  return normalized;
}

function normalizeProvides(value: unknown) {
  if (value == null) return {} satisfies CodersoPluginProvides;
  if (!isObject(value)) throw new Error("plugin_manifest_provides_invalid");

  const output: CodersoPluginProvides = {};

  for (const key of PROVIDE_KEYS) {
    const refs =
      key === "routes"
        ? normalizeRouteRefArray(value[key], "plugin_manifest_provides_invalid")
        : normalizeRefArray(value[key], "plugin_manifest_provides_invalid");
    if (refs.length > 0) output[key] = refs;
  }

  return output;
}

function normalizeMigrations(value: unknown) {
  if (value == null) return [] as CodersoPluginMigration[];
  if (!Array.isArray(value)) throw new Error("plugin_manifest_migrations_invalid");

  return value.map((item) => {
    if (!isObject(item)) throw new Error("plugin_manifest_migrations_invalid");
    return {
      id: assertNonEmptyString(item.id, "plugin_manifest_migrations_invalid"),
      file: assertNonEmptyString(item.file, "plugin_manifest_migrations_invalid"),
    };
  });
}

export function isPluginManifestLike(value: unknown): value is CodersoPluginManifestInput {
  if (!isObject(value)) return false;
  const name = value.name;
  const version = value.version;
  const apiVersion = value.targetApiVersion ?? value.apiVersion;
  const coreVersion = value.targetCoreVersion ?? value.coreVersion;
  const entry = value.entry;

  return (
    typeof name === "string" &&
    typeof version === "string" &&
    typeof apiVersion === "string" &&
    typeof coreVersion === "string" &&
    isObject(entry) &&
    typeof entry.server === "string"
  );
}

export function normalizePluginManifest(input: CodersoPluginManifestInput): CodersoPluginManifest {
  if (!isObject(input)) throw new Error("plugin_manifest_invalid");

  const rawName = assertNonEmptyString(input.name, "plugin_manifest_invalid");
  const id = assertNonEmptyString(input.id ?? rawName, "plugin_manifest_invalid");
  if (!PLUGIN_ID_PATTERN.test(id)) throw new Error("plugin_manifest_invalid");

  const targetApiVersion = assertNonEmptyString(
    input.targetApiVersion ?? input.apiVersion,
    "plugin_manifest_invalid"
  );

  const targetCoreVersion = assertNonEmptyString(
    input.targetCoreVersion ?? input.coreVersion,
    "plugin_manifest_invalid"
  );

  const entry = input.entry;
  if (!isObject(entry)) throw new Error("plugin_manifest_invalid");

  const normalizedEntry: CodersoPluginEntry = {
    server: assertNonEmptyString(entry.server, "plugin_manifest_invalid"),
    client:
      typeof entry.client === "string" && entry.client.trim().length > 0
        ? entry.client.trim()
        : undefined,
    styles:
      typeof entry.styles === "string" && entry.styles.trim().length > 0
        ? entry.styles.trim()
        : undefined,
  };

  const integrityRaw = input.integrity;
  if (!isObject(integrityRaw)) throw new Error("plugin_manifest_invalid");
  const integrity = Object.entries(integrityRaw).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error("plugin_manifest_invalid");
      }
      acc[key] = value.trim();
      return acc;
    },
    {}
  );

  const permissions = normalizeRefArray(input.permissions, "plugin_manifest_permissions_invalid");
  const dependencies = normalizeRefArray(input.dependencies, "plugin_manifest_dependencies_invalid");
  const featureFlags = normalizeRefArray(input.featureFlags, "plugin_manifest_feature_flags_invalid");
  const provides = normalizeProvides(input.provides);
  const migrations = normalizeMigrations(input.migrations);

  return {
    id,
    name: rawName,
    version: assertNonEmptyString(input.version, "plugin_manifest_invalid"),
    targetApiVersion,
    targetCoreVersion,
    entry: normalizedEntry,
    provides,
    permissions,
    dependencies,
    featureFlags,
    migrations,
    metadata: isObject(input.metadata) ? input.metadata : undefined,
    integrity,
    signature: typeof input.signature === "string" ? input.signature : undefined,
  };
}
