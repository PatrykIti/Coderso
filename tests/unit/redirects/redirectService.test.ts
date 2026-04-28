import { afterEach, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { redirects } from "../../../core/db/schema";
import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "../../../core/services/redirects/redirectService";

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

const createdIds: string[] = [];

afterEach(async () => {
  if (!hasDb || createdIds.length === 0) return;
  await db.delete(redirects).where(inArray(redirects.id, [...createdIds]));
  createdIds.length = 0;
});

testIfDb("create/update/delete redirect lifecycle", async () => {
  const created = await createRedirect({
    fromPath: "/old-path",
    toPath: "/new-path",
    statusCode: 301,
    enabled: true,
  });

  expect(created).not.toBeNull();
  if (!created) return;
  createdIds.push(created.id);

  const list = await listRedirects();
  expect(list.some((row) => row.id === created.id)).toBe(true);

  const updated = await updateRedirect(created.id, { enabled: false, statusCode: 302 });
  expect(updated?.enabled).toBe(false);
  expect(updated?.statusCode).toBe(302);

  const deleted = await deleteRedirect(created.id);
  expect(deleted?.id).toBe(created.id);
});
