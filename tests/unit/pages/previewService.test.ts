import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { previewTokens } from "../../../core/db/schema";
import {
  createPreviewToken,
  hashPreviewToken,
  probeGeneratedPreviewUrl,
  purgeExpiredPreviewTokens,
  redactPreviewProbeTargetLabel,
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

test("redactPreviewProbeTargetLabel removes token and device query values", () => {
  expect(
    redactPreviewProbeTargetLabel(
      "https://preview.example.test/preview?type=page&token=secret&device=mobile"
    )
  ).toBe("https://preview.example.test/preview");
  expect(
    redactPreviewProbeTargetLabel("/preview?type=page&token=secret")
  ).not.toContain("secret");
});

test("probeGeneratedPreviewUrl maps success, http error, redirects, and timeout", async () => {
  const success = await probeGeneratedPreviewUrl(
    "https://preview.example.test/preview?token=secret",
    {
      fetchImpl: async () => new Response(null, { status: 204 }),
    }
  );
  expect(success).toEqual({
    ok: true,
    status: 204,
    targetLabel: "https://preview.example.test/preview",
  });

  const httpError = await probeGeneratedPreviewUrl(
    "https://preview.example.test/preview?token=secret",
    {
      fetchImpl: async () => new Response(null, { status: 503 }),
    }
  );
  expect(httpError).toEqual({
    ok: false,
    status: 503,
    reason: "http_error",
    targetLabel: "https://preview.example.test/preview",
  });
  expect(JSON.stringify(httpError)).not.toContain("secret");

  const redirect = await probeGeneratedPreviewUrl(
    "https://preview.example.test/preview?token=secret",
    {
      fetchImpl: async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: "https://evil.example.test/preview?token=secret",
          },
        }),
    }
  );
  expect(redirect).toEqual({
    ok: false,
    reason: "redirect_blocked",
    targetLabel: "https://evil.example.test/preview",
  });

  const timeoutError = new Error("aborted");
  timeoutError.name = "AbortError";
  const timeout = await probeGeneratedPreviewUrl(
    "https://preview.example.test/preview?token=secret",
    {
      fetchImpl: async () => {
        throw timeoutError;
      },
    }
  );
  expect(timeout).toEqual({
    ok: false,
    reason: "timeout",
    targetLabel: "https://preview.example.test/preview",
  });
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

testIfDb("purgeExpiredPreviewTokens removes expired rows", async () => {
  const targetId = randomUUID();
  await createPreviewToken({
    targetType: "page",
    targetId,
    ttlMinutes: -5,
  });

  await purgeExpiredPreviewTokens();

  const rows = await db
    .select()
    .from(previewTokens)
    .where(eq(previewTokens.targetId, targetId));
  expect(rows.length).toBe(0);
});
