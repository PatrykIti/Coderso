import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { seoDocuments } from "../../../core/db/schema";
import { ApiError } from "../../../core/server/errorHandler";
import { seoAuditSchema } from "../../../core/server/validation/seoSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

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

const targetId = randomUUID();

afterAll(async () => {
  if (!hasDb) return;
  await db.delete(seoDocuments).where(eq(seoDocuments.targetId, targetId));
});

testIfDb("seoDocuments enforces unique target", async () => {
  await db.insert(seoDocuments).values({
    targetType: "page",
    targetId,
    status: "warning",
    issues: [],
  });

  let threw = false;
  try {
    await db.insert(seoDocuments).values({
      targetType: "page",
      targetId,
      status: "warning",
      issues: [],
    });
  } catch {
    threw = true;
  }

  expect(threw).toBe(true);
});

test("seoAuditSchema rejects unknown audit checks", () => {
  expect(() =>
    validate(seoAuditSchema, {
      checks: ["meta", "performance"],
    })
  ).toThrow(ApiError);
});

test("seoAuditSchema accepts bounded known audit checks", () => {
  expect(() =>
    validate(seoAuditSchema, {
      checks: ["meta", "links", "robots"],
    })
  ).not.toThrow();
});
