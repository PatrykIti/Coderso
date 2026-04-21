import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { ipAllowlist } from "../../../core/db/schema";
import {
  addAllowlistEntry,
  isIpAllowed,
  listAllowlist,
  matchesCidr,
  parseCidr,
} from "../../../core/services/security/ipAllowlistService";

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

let entryIds: string[] = [];

afterAll(async () => {
  if (entryIds.length > 0) {
    await db.delete(ipAllowlist).where(inArray(ipAllowlist.id, entryIds));
  }
});

test("parseCidr validates ipv4 and masks", () => {
  expect(parseCidr("192.168.1.1")).not.toBeNull();
  expect(parseCidr("192.168.1.0/24")).not.toBeNull();
  expect(parseCidr("10.0.0.1/32")).not.toBeNull();
  expect(parseCidr("10.0.0.1/33")).toBeNull();
  expect(parseCidr("10.0.0")).toBeNull();
  expect(parseCidr("300.1.1.1/24")).toBeNull();
});

test("matchesCidr evaluates ranges", () => {
  expect(matchesCidr("192.168.1.5", "192.168.1.0/24")).toBe(true);
  expect(matchesCidr("192.168.2.5", "192.168.1.0/24")).toBe(false);
  expect(matchesCidr("10.0.0.1", "10.0.0.1")).toBe(true);
});

test("isIpAllowed allows when list empty", async () => {
  await expect(isIpAllowed("10.0.0.1", [])).resolves.toBe(true);
});

testIfDb("add and list allowlist entries", async () => {
  const entry = await addAllowlistEntry(`10.1.${Math.floor(Math.random() * 200)}.1/32`, "Office", "HQ");
  expect(entry).not.toBeNull();
  if (entry) {
    entryIds.push(entry.id);
  }

  const items = await listAllowlist();
  expect(items.length).toBeGreaterThan(0);
});

testIfDb("isIpAllowed respects allowlist", async () => {
  const subnet = Math.floor(Math.random() * 200);
  const cidr = `172.16.${subnet}.0/24`;
  const entry = await addAllowlistEntry(cidr, "Test", undefined);
  expect(entry).not.toBeNull();
  if (entry) entryIds.push(entry.id);

  const allowed = await isIpAllowed(`172.16.${subnet}.10`);
  const denied = await isIpAllowed("10.0.0.1");
  expect(allowed).toBe(true);
  expect(denied).toBe(false);
});
