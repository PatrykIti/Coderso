import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../../db/client";
import { apiKeys } from "../../db/schema";
import { hashPassword, verifyPassword } from "../auth/password";

const TOKEN_BYTES = 32;
const PREFIX_LENGTH = 6;

export type ApiKeyRow = typeof apiKeys.$inferSelect;

export type ApiKeySummary = {
  id: string;
  name: string;
  scopes: string[];
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export type ApiKeyCreateInput = {
  name: string;
  scopes: string[];
};

export type ApiKeyCreateResult = {
  apiKey: ApiKeySummary;
  secret: string;
};

export function normalizeScopes(scopes: unknown) {
  if (!Array.isArray(scopes)) return [];
  const values = scopes
    .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(values));
}

function toSummary(row: ApiKeyRow): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    scopes: normalizeScopes(row.scopes),
    prefix: row.prefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt ?? null,
  };
}

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function listApiKeys() {
  const rows = await db
    .select()
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));
  return rows.map(toSummary);
}

export async function createApiKey(input: ApiKeyCreateInput): Promise<ApiKeyCreateResult> {
  const name = input.name.trim();
  const scopes = normalizeScopes(input.scopes);
  if (!name) {
    throw new Error("api_key_name_required");
  }
  if (scopes.length === 0) {
    throw new Error("api_key_scopes_required");
  }

  const secret = generateToken();
  const prefix = secret.slice(0, PREFIX_LENGTH);
  const keyHash = await hashPassword(secret);

  const [row] = await db
    .insert(apiKeys)
    .values({
      name,
      scopes,
      keyHash,
      prefix,
    })
    .returning();

  if (!row) {
    throw new Error("api_key_create_failed");
  }

  return { apiKey: toSummary(row), secret };
}

export async function revokeApiKey(id: string) {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();

  return row ? toSummary(row) : null;
}

export async function rotateApiKey(id: string): Promise<ApiKeyCreateResult | null> {
  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, id));

  if (!existing) return null;
  if (existing.revokedAt) {
    throw new Error("api_key_revoked");
  }

  const secret = generateToken();
  const prefix = secret.slice(0, PREFIX_LENGTH);
  const keyHash = await hashPassword(secret);

  const [row] = await db
    .update(apiKeys)
    .set({ keyHash, prefix, lastUsedAt: null, revokedAt: null })
    .where(eq(apiKeys.id, id))
    .returning();

  if (!row) return null;

  return { apiKey: toSummary(row), secret };
}

export async function recordApiKeyUsage(prefix: string, id?: string) {
  const now = new Date();
  const baseFilter = id ? eq(apiKeys.id, id) : eq(apiKeys.prefix, prefix);
  await db
    .update(apiKeys)
    .set({ lastUsedAt: now })
    .where(and(baseFilter, isNull(apiKeys.revokedAt)));
}

export async function verifyApiKeyToken(token: string): Promise<ApiKeySummary | null> {
  if (token.length < PREFIX_LENGTH) return null;
  const prefix = token.slice(0, PREFIX_LENGTH);
  if (!prefix) return null;

  const candidates = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.prefix, prefix));

  for (const candidate of candidates) {
    if (candidate.revokedAt) continue;
    const valid = await verifyPassword(candidate.keyHash, token);
    if (!valid) continue;
    await recordApiKeyUsage(candidate.prefix, candidate.id);
    return toSummary(candidate);
  }

  return null;
}
