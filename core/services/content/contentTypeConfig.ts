// Content-type-level `config` shape + authoritative server normalizer.
//
// This module is intentionally db/Bun-free: it imports NO `db/client` (which throws when
// DATABASE_URL is unset and opens a postgres pool at load). Both the server (`typeService.ts`)
// and the Vitest Bun-free pure lane import from here without dragging in drizzle/postgres.

export type ContentTypePermissionCapabilities = {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  publish?: boolean;
};

export type ContentTypeConfig = {
  singularName?: string;
  pluralName?: string;
  draftsEnabled?: boolean; // resolved default true
  versioning?: boolean; // resolved default false
  permissions?: Record<string, ContentTypePermissionCapabilities>;
};

export const CONFIG_KEYS = new Set<string>([
  "singularName",
  "pluralName",
  "draftsEnabled",
  "versioning",
  "permissions",
]);

export const CAP_KEYS = new Set<keyof ContentTypePermissionCapabilities>([
  "read",
  "create",
  "update",
  "delete",
  "publish",
]);

const MAX_NAME = 120;
const MAX_ROLES = 50;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const trimName = (value: unknown): string =>
  typeof value === "string" ? value.trim().slice(0, MAX_NAME) : "";

const normalizePermissions = (
  input: unknown
): Record<string, ContentTypePermissionCapabilities> | undefined => {
  if (input === undefined) return undefined;
  if (!isRecord(input)) throw new Error("content_type_config_invalid");
  const roleKeys = Object.keys(input);
  if (roleKeys.length > MAX_ROLES) throw new Error("content_type_config_invalid");
  const perms: Record<string, ContentTypePermissionCapabilities> = {};
  for (const role of roleKeys) {
    const caps = input[role];
    if (!isRecord(caps)) throw new Error("content_type_config_invalid");
    for (const capKey of Object.keys(caps)) {
      if (!CAP_KEYS.has(capKey as keyof ContentTypePermissionCapabilities)) {
        throw new Error("content_type_config_invalid"); // reject-unknown capability
      }
    }
    const kept: ContentTypePermissionCapabilities = {};
    for (const cap of CAP_KEYS) {
      if (caps[cap] === true) kept[cap] = true;
    }
    if (Object.keys(kept).length) perms[role] = kept;
  }
  return Object.keys(perms).length ? perms : undefined;
};

/**
 * Server-authoritative content-type config normalizer.
 * - Reject-unknown top-level key OR unknown per-role capability key => throw
 *   `content_type_config_invalid` (mapped to HTTP 400).
 * - Bad scalar (wrong type) => fail-soft omit (never persisted raw).
 * - Present-only: keys at resolved default (draftsEnabled=true, versioning=false) and empty
 *   strings are dropped so a default type persists `config = {}` (legacy rows read unchanged).
 */
export function normalizeContentTypeConfig(input: unknown): ContentTypeConfig {
  if (input === undefined || input === null) return {};
  if (!isRecord(input)) throw new Error("content_type_config_invalid");
  for (const key of Object.keys(input)) {
    if (!CONFIG_KEYS.has(key)) throw new Error("content_type_config_invalid"); // reject-unknown
  }

  const out: ContentTypeConfig = {};

  const singularName = trimName(input.singularName);
  if (singularName) out.singularName = singularName;
  const pluralName = trimName(input.pluralName);
  if (pluralName) out.pluralName = pluralName;

  // booleans: present-only, DROP when at resolved default (drafts default true, versioning false)
  if (typeof input.draftsEnabled === "boolean" && input.draftsEnabled === false) {
    out.draftsEnabled = false;
  }
  if (typeof input.versioning === "boolean" && input.versioning === true) {
    out.versioning = true;
  }

  const perms = normalizePermissions(input.permissions);
  if (perms) out.permissions = perms;

  return out;
}
