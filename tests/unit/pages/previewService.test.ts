import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { previewTokens } from "../../../core/db/schema";
import {
  createPreviewToken,
  hashPreviewToken,
  validatePreviewToken,
} from "../../../core/services/pages/previewService";

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

test("hashPreviewToken is deterministic", () => {
  const value = "token-123";
  const hash1 = hashPreviewToken(value);
  const hash2 = hashPreviewToken(value);

  expect(hash1).toBe(hash2);
  expect(hash1).toHaveLength(64);
  expect(hash1).not.toBe(hashPreviewToken("different"));
});

testIfDb("create and validate preview token", async () => {
  const targetId = randomUUID();
  const { token } = await createPreviewToken({
    targetType: "page",
    targetId,
    ttlMinutes: 5,
  });

  const row = await validatePreviewToken(token, "page");
  expect(row?.targetId).toBe(targetId);

  await db.delete(previewTokens).where(eq(previewTokens.targetId, targetId));
});

testIfDb("expired preview token is rejected", async () => {
  const targetId = randomUUID();
  const { token } = await createPreviewToken({
    targetType: "page",
    targetId,
    ttlMinutes: -1,
  });

  const row = await validatePreviewToken(token, "page");
  expect(row).toBeNull();

  await db.delete(previewTokens).where(eq(previewTokens.targetId, targetId));
});
