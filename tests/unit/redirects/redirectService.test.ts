import { afterEach, expect, test } from "bun:test";
import { sql, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { redirects } from "../../../core/db/schema";
import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  resolvePublicRedirect,
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

testIfDb("resolvePublicRedirect follows enabled internal redirects and detects loops", async () => {
  const direct = await createRedirect({
    fromPath: "campaign-old",
    toPath: "/campaign-new",
    statusCode: 302,
    enabled: true,
  });
  expect(direct).not.toBeNull();
  if (!direct) return;
  createdIds.push(direct.id);

  await expect(resolvePublicRedirect("/campaign-old")).resolves.toEqual({
    location: "/campaign-new",
    statusCode: 302,
  });

  const disabled = await createRedirect({
    fromPath: "/disabled-old",
    toPath: "/disabled-new",
    statusCode: 301,
    enabled: false,
  });
  if (disabled) createdIds.push(disabled.id);
  await expect(resolvePublicRedirect("/disabled-old")).resolves.toBeNull();

  const first = await createRedirect({
    fromPath: "/loop-a",
    toPath: "/loop-b",
    statusCode: 301,
    enabled: true,
  });
  const second = await createRedirect({
    fromPath: "/loop-b",
    toPath: "/loop-a",
    statusCode: 302,
    enabled: true,
  });
  if (first) createdIds.push(first.id);
  if (second) createdIds.push(second.id);

  await expect(resolvePublicRedirect("/loop-a")).rejects.toThrow("redirect_loop");
});

testIfDb("redirect service rejects external targets and self loops", async () => {
  await expect(
    createRedirect({
      fromPath: "/external-old",
      toPath: "https://evil.example.com",
      statusCode: 301,
      enabled: true,
    })
  ).rejects.toThrow("redirect_target_external");

  await expect(
    createRedirect({
      fromPath: "//network-source",
      toPath: "/safe-target",
      statusCode: 301,
      enabled: true,
    })
  ).rejects.toThrow("redirect_invalid");

  await expect(
    createRedirect({
      fromPath: "/network-old",
      toPath: "//evil.example.com",
      statusCode: 301,
      enabled: true,
    })
  ).rejects.toThrow("redirect_target_external");

  await expect(
    createRedirect({
      fromPath: "/backslash-old",
      toPath: "/\\evil.example.com",
      statusCode: 301,
      enabled: true,
    })
  ).rejects.toThrow("redirect_invalid");

  await expect(
    createRedirect({
      fromPath: "/same",
      toPath: "/same",
      statusCode: 301,
      enabled: true,
    })
  ).rejects.toThrow("redirect_loop");
});
