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
  expect(redactPreviewProbeTargetLabel("/preview?type=page&token=secret")).not.toContain("secret");
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

test("probeGeneratedPreviewUrl retries loopback names against 127.0.0.1 with Host preserved", async () => {
  const attempts: Array<{ url: string; host: string | undefined }> = [];
  const result = await probeGeneratedPreviewUrl(
    "http://coderso-a.localhost:3000/preview?type=page&token=secret",
    {
      fetchImpl: async (input, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        attempts.push({ url: input, host: headers.Host });
        if (input.startsWith("http://coderso-a.localhost:3000/")) {
          throw new Error("ConnectionRefused");
        }
        return new Response(null, { status: 204 });
      },
    }
  );

  expect(result).toEqual({
    ok: true,
    status: 204,
    targetLabel: "http://coderso-a.localhost:3000/preview",
  });
  expect(attempts).toHaveLength(2);
  expect(attempts[0]?.url).toBe("http://coderso-a.localhost:3000/preview?type=page&token=secret");
  expect(attempts[0]?.host).toBeUndefined();
  expect(attempts[1]?.url).toBe("http://127.0.0.1:3000/preview?type=page&token=secret");
  expect(attempts[1]?.host).toBe("coderso-a.localhost:3000");
});

test("probeGeneratedPreviewUrl keeps non-loopback connection failures unreachable", async () => {
  let attempts = 0;
  const result = await probeGeneratedPreviewUrl(
    "https://preview.example.test/preview?token=secret",
    {
      fetchImpl: async () => {
        attempts += 1;
        throw new Error("ConnectionRefused");
      },
    }
  );

  expect(result).toEqual({
    ok: false,
    reason: "unreachable",
    targetLabel: "https://preview.example.test/preview",
  });
  // Single HEAD attempt fails fast — no loopback retry for public hosts.
  expect(attempts).toBe(1);
});

testIfDb("create and validate preview token", async () => {
  const targetId = randomUUID();
  const { token } = await createPreviewToken({
    targetType: "page",
    targetId,
    ttlMinutes: 5,
  });

  const result = await validatePreviewToken(token, "page");
  expect(result).toEqual({
    status: "valid",
    token: expect.objectContaining({
      targetId,
      targetType: "page",
      context: null,
    }),
  });

  await db.delete(previewTokens).where(eq(previewTokens.targetId, targetId));
});

testIfDb("expired preview token is rejected", async () => {
  const targetId = randomUUID();
  const { token } = await createPreviewToken({
    targetType: "page",
    targetId,
    ttlMinutes: -1,
  });

  const result = await validatePreviewToken(token, "page");
  expect(result).toEqual({ status: "expired" });

  await db.delete(previewTokens).where(eq(previewTokens.targetId, targetId));
});

testIfDb("detail-page preview tokens persist strict sample-entry context", async () => {
  const targetId = randomUUID();
  const sampleEntryId = randomUUID();
  const { token } = await createPreviewToken({
    targetType: "detail-page",
    targetId,
    ttlMinutes: 5,
    context: {
      kind: "detail-page",
      sampleEntryId,
    },
  });

  const result = await validatePreviewToken(token, "detail-page");
  expect(result).toEqual({
    status: "valid",
    token: expect.objectContaining({
      targetId,
      targetType: "detail-page",
      context: {
        kind: "detail-page",
        sampleEntryId,
      },
    }),
  });

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

  const rows = await db.select().from(previewTokens).where(eq(previewTokens.targetId, targetId));
  expect(rows.length).toBe(0);
});
