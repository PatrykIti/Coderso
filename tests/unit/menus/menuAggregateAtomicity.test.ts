import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menus } from "../../../core/db/schema";
import {
  captureMenuAggregateNativeSnapshot,
  mutateMenuAggregateAtomic,
  prepareMenuAggregateNativeTargets,
} from "../../../core/services/menus/menuService";

const ACTOR_ID = "00000000-0000-4000-8000-000000000547";
const dbTestTimeoutMs = 360_000;
const ownedIds = new Set<string>();
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

afterEach(async () => {
  for (const id of ownedIds) await db.delete(menus).where(eq(menus.id, id));
  ownedIds.clear();
});

const packageDesired = (name: string, itemId: string) => ({
  name,
  location: null,
  status: "published" as const,
  document: null,
  appearance: {},
  extras: [],
  items: [
    {
      id: itemId,
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      settings: {},
    },
  ],
});

testIfDb(
  "stages and publishes one exact precomputed Menu aggregate",
  async () => {
    const id = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const publicationTimestamp = "2026-08-06T12:00:00.000Z";
    ownedIds.add(id);
    const targets = prepareMenuAggregateNativeTargets({
      id,
      desired: packageDesired(`Atomic menu ${id}`, itemId),
      expectedCurrent: null,
      publicationTimestamp,
    });
    expect(targets.staged?.desired.status).toBe("draft");
    expect(targets.complete.desired.status).toBe("published");
    expect(targets.complete.desired.publishedAt).toBe(publicationTimestamp);

    const staged = await mutateMenuAggregateAtomic({
      operation: "create",
      id,
      desired: targets.staged!.desired,
      actorId: ACTOR_ID,
    });
    expect(staged.snapshot).toEqual(targets.staged);
    const published = await mutateMenuAggregateAtomic({
      operation: "replace",
      id,
      desired: targets.complete.desired,
      expectedCurrent: targets.staged!,
      actorId: ACTOR_ID,
    });
    expect(published.snapshot).toEqual(targets.complete);
    expect(await captureMenuAggregateNativeSnapshot(id)).toEqual(targets.complete);

    await mutateMenuAggregateAtomic({
      operation: "delete",
      id,
      expectedCurrent: targets.complete,
      actorId: ACTOR_ID,
    });
    ownedIds.delete(id);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rejects stale Menu CAS without changing the current aggregate",
  async () => {
    const id = crypto.randomUUID();
    ownedIds.add(id);
    const targets = prepareMenuAggregateNativeTargets({
      id,
      desired: { ...packageDesired(`CAS menu ${id}`, crypto.randomUUID()), status: "draft" },
      expectedCurrent: null,
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    const created = await mutateMenuAggregateAtomic({
      operation: "create",
      id,
      desired: targets.complete.desired,
      actorId: ACTOR_ID,
    });
    const stale = {
      ...created.snapshot!,
      desired: { ...created.snapshot!.desired, name: "Stale" },
    };
    await expect(
      mutateMenuAggregateAtomic({
        operation: "delete",
        id,
        expectedCurrent: stale,
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("site_package_state_changed");
    expect(await captureMenuAggregateNativeSnapshot(id)).toEqual(created.snapshot);
  },
  dbTestTimeoutMs
);
