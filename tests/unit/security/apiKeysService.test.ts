import { afterAll, expect, test } from "bun:test";
import { sql, eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { apiKeys } from "../../../core/db/schema";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  verifyApiKeyToken,
} from "../../../core/services/security/apiKeysService";
import { parseBearerToken } from "../../../core/services/security/apiKeyAuth";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupIds: string[] = [];

afterAll(async () => {
  if (cleanupIds.length > 0) {
    await db.delete(apiKeys).where(inArray(apiKeys.id, cleanupIds));
  }
});

test("parseBearerToken extracts token", () => {
  expect(parseBearerToken("Bearer abc123")).toBe("abc123");
  expect(parseBearerToken("bearer token")).toBe("token");
  expect(parseBearerToken("Basic abc")).toBeNull();
});

testIfDb("create/list api keys and verify token", async () => {
  const created = await createApiKey({
    name: `Key ${Date.now()}`,
    scopes: ["content.read", "media.read"],
  });
  cleanupIds.push(created.apiKey.id);

  const list = await listApiKeys();
  expect(list.some((item) => item.id === created.apiKey.id)).toBe(true);

  const verified = await verifyApiKeyToken(created.secret);
  expect(verified?.id).toBe(created.apiKey.id);

  const [row] = await db
    .select({ lastUsedAt: apiKeys.lastUsedAt })
    .from(apiKeys)
    .where(eq(apiKeys.id, created.apiKey.id));
  expect(row?.lastUsedAt).not.toBeNull();
});

testIfDb("rotate and revoke api keys", async () => {
  const created = await createApiKey({
    name: `Rotate ${Date.now()}`,
    scopes: ["content.read"],
  });
  cleanupIds.push(created.apiKey.id);

  const rotated = await rotateApiKey(created.apiKey.id);
  expect(rotated).not.toBeNull();
  if (!rotated) return;

  const oldValid = await verifyApiKeyToken(created.secret);
  expect(oldValid).toBeNull();

  const newValid = await verifyApiKeyToken(rotated.secret);
  expect(newValid?.id).toBe(created.apiKey.id);

  const revoked = await revokeApiKey(created.apiKey.id);
  expect(revoked?.revokedAt).not.toBeNull();

  const revokedValid = await verifyApiKeyToken(rotated.secret);
  expect(revokedValid).toBeNull();
});

