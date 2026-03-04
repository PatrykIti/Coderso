import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { customScreens } from "../../../core/db/schema";
import {
  createCustomScreen,
  deleteCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../../../core/services/customScreens/customScreenService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const createdScreenIds = new Set<string>();

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function ensureCustomScreensTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "custom_screens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "content_type_id" uuid NOT NULL,
      "status" text DEFAULT 'draft' NOT NULL,
      "schema_version" integer DEFAULT 1 NOT NULL,
      "blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "bindings" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "custom_screens_name_idx" ON "custom_screens" ("name")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "custom_screens_content_type_id_idx" ON "custom_screens" ("content_type_id")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "custom_screens_status_idx" ON "custom_screens" ("status")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "custom_screens_updated_at_idx" ON "custom_screens" ("updated_at")`
  );
}

afterAll(async () => {
  if (!hasDb || createdScreenIds.size === 0) return;
  await db
    .delete(customScreens)
    .where(eq(customScreens.id, Array.from(createdScreenIds)[0]));
  for (const id of Array.from(createdScreenIds).slice(1)) {
    await db.delete(customScreens).where(eq(customScreens.id, id));
  }
});

testIfDb("custom screen CRUD flow", async () => {
  await ensureCustomScreensTable();
  const unique = randomUUID();

  const created = await createCustomScreen({
    name: `Catalog ${unique}`,
    contentTypeId: "type-1",
    blocks: [{ id: "section-1", type: "section", data: {} }],
    bindings: [],
  });

  createdScreenIds.add(created.id);
  expect(created.schemaVersion).toBe(1);
  expect(created.status).toBe("draft");

  const updated = await updateCustomScreen(created.id, {
    status: "active",
  });

  expect(updated?.status).toBe("active");

  const listed = await listCustomScreens();
  expect(listed.some((screen) => screen.id === created.id)).toBe(true);

  const removed = await deleteCustomScreen(created.id);
  expect(removed?.id).toBe(created.id);
  createdScreenIds.delete(created.id);
});
