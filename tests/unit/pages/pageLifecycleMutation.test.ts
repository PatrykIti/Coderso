import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pages, users } from "../../../core/db/schema";
import {
  capturePageLifecycleNativeSnapshot,
  mutatePageLifecycleAtomic,
  preparePageLifecycleNativeTargets,
} from "../../../core/services/pages/pageService";

const dbTestTimeoutMs = 360_000;
const ownedPageIds = new Set<string>();
const ownedUserIds = new Set<string>();
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
  for (const id of ownedPageIds) await db.delete(pages).where(eq(pages.id, id));
  for (const id of ownedUserIds) await db.delete(users).where(eq(users.id, id));
  ownedPageIds.clear();
  ownedUserIds.clear();
});

const createActor = async () => {
  const id = crypto.randomUUID();
  ownedUserIds.add(id);
  await db.insert(users).values({
    id,
    email: `page-lifecycle-${id}@example.com`,
    passwordHash: "test",
    status: "active",
  });
  return id;
};

const pageData = {
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections: [],
};

testIfDb(
  "stages and publishes one exact precomputed Page lifecycle aggregate",
  async () => {
    const actorId = await createActor();
    const id = crypto.randomUUID();
    ownedPageIds.add(id);
    const targets = preparePageLifecycleNativeTargets({
      id,
      desired: {
        title: "Atomic page",
        slug: `atomic-page-${id}`,
        status: "published",
        data: pageData,
      },
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    expect(targets.staged?.desired.status).toBe("draft");
    expect(targets.complete.desired.revisions).toHaveLength(1);

    const staged = await mutatePageLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.staged!.desired,
      actorId,
    });
    expect(staged.snapshot).toEqual(targets.staged);
    const published = await mutatePageLifecycleAtomic({
      operation: "replace",
      id,
      desired: targets.complete.desired,
      expectedCurrent: targets.staged!,
      actorId,
    });
    expect(published.snapshot).toEqual(targets.complete);
    expect(await capturePageLifecycleNativeSnapshot(id)).toEqual(targets.complete);

    await mutatePageLifecycleAtomic({
      operation: "delete",
      id,
      expectedCurrent: targets.complete,
      actorId,
    });
    ownedPageIds.delete(id);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rejects stale Page CAS before mutation",
  async () => {
    const actorId = await createActor();
    const id = crypto.randomUUID();
    ownedPageIds.add(id);
    const targets = preparePageLifecycleNativeTargets({
      id,
      desired: {
        title: "CAS page",
        slug: `cas-page-${id}`,
        status: "draft",
        data: pageData,
      },
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    const created = await mutatePageLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.complete.desired,
      actorId,
    });
    await expect(
      mutatePageLifecycleAtomic({
        operation: "delete",
        id,
        expectedCurrent: {
          ...created.snapshot!,
          desired: { ...created.snapshot!.desired, title: "Stale" },
        },
        actorId,
      })
    ).rejects.toThrow("site_package_state_changed");
    expect(await capturePageLifecycleNativeSnapshot(id)).toEqual(created.snapshot);
  },
  dbTestTimeoutMs
);
