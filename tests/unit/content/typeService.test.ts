import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentTypes } from "../../../core/db/schema";
import {
  createContentType,
  deleteContentType,
  updateContentType,
} from "../../../core/services/content/typeService";

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

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
};

let contentTypeId: string | undefined;

afterAll(async () => {
  if (contentTypeId) {
    await db.delete(contentTypes).where(eq(contentTypes.id, contentTypeId));
  }
});

testIfDb("create and update content type", async () => {
  const created = await createContentType({
    name: "Blog",
    slug: `blog-${randomUUID()}`,
    schema,
  });

  contentTypeId = created.id;

  const updated = await updateContentType(created.id, {
    name: "Blog Updated",
  });

  expect(updated?.name).toBe("Blog Updated");

  const removed = await deleteContentType(created.id);
  expect(removed?.id).toBe(created.id);

  contentTypeId = undefined;
});
