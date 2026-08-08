import { afterEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, users } from "../../../core/db/schema";
import {
  captureEntryLifecycleNativeSnapshot,
  mutateEntryLifecycleAtomic,
  prepareEntryLifecycleNativeTargets,
} from "../../../core/services/content/entryLifecycleMutationService";

const dbTestTimeoutMs = 360_000;
const ownedEntryIds = new Set<string>();
const ownedContentTypeIds = new Set<string>();
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
  for (const id of ownedEntryIds) await db.delete(contentEntries).where(eq(contentEntries.id, id));
  for (const id of ownedContentTypeIds) {
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
  }
  for (const id of ownedUserIds) await db.delete(users).where(eq(users.id, id));
  ownedEntryIds.clear();
  ownedContentTypeIds.clear();
  ownedUserIds.clear();
});

const createRoots = async () => {
  const actorId = crypto.randomUUID();
  const contentTypeId = crypto.randomUUID();
  ownedUserIds.add(actorId);
  ownedContentTypeIds.add(contentTypeId);
  await db.insert(users).values({
    id: actorId,
    email: `entry-lifecycle-${actorId}@example.com`,
    passwordHash: "test",
    status: "active",
  });
  await db.insert(contentTypes).values({
    id: contentTypeId,
    name: `Entry lifecycle ${contentTypeId}`,
    slug: `entry-lifecycle-${contentTypeId}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: { title: { type: "string" } },
    },
  });
  return { actorId, contentTypeId };
};

testIfDb(
  "stages and publishes one precomputed Entry aggregate with its exact revision",
  async () => {
    const { actorId, contentTypeId } = await createRoots();
    const id = crypto.randomUUID();
    ownedEntryIds.add(id);
    const targets = prepareEntryLifecycleNativeTargets({
      id,
      desired: {
        contentTypeId,
        title: "Atomic entry",
        slug: `atomic-entry-${id}`,
        status: "published",
        data: { title: "Atomic entry" },
      },
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    expect(targets.staged?.desired.status).toBe("draft");
    expect(targets.complete.desired.revisions).toHaveLength(1);

    const staged = await mutateEntryLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.staged!.desired,
      actorId,
    });
    expect(staged.snapshot).toEqual(targets.staged);
    const published = await mutateEntryLifecycleAtomic({
      operation: "replace",
      id,
      desired: targets.complete.desired,
      expectedCurrent: targets.staged!,
      actorId,
    });
    expect(published.snapshot).toEqual(targets.complete);
    expect(await captureEntryLifecycleNativeSnapshot(id)).toEqual(targets.complete);

    await mutateEntryLifecycleAtomic({
      operation: "delete",
      id,
      expectedCurrent: targets.complete,
      actorId,
    });
    ownedEntryIds.delete(id);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rejects stale Entry CAS before mutation",
  async () => {
    const { actorId, contentTypeId } = await createRoots();
    const id = crypto.randomUUID();
    ownedEntryIds.add(id);
    const targets = prepareEntryLifecycleNativeTargets({
      id,
      desired: {
        contentTypeId,
        title: "CAS entry",
        slug: `cas-entry-${id}`,
        status: "draft",
        data: { title: "CAS entry" },
      },
      actorId,
      expectedCurrent: null,
      revisionId: crypto.randomUUID(),
      publicationTimestamp: "2026-08-06T12:00:00.000Z",
    });
    const created = await mutateEntryLifecycleAtomic({
      operation: "create",
      id,
      desired: targets.complete.desired,
      actorId,
    });
    await expect(
      mutateEntryLifecycleAtomic({
        operation: "delete",
        id,
        expectedCurrent: {
          ...created.snapshot!,
          desired: { ...created.snapshot!.desired, title: "Stale" },
        },
        actorId,
      })
    ).rejects.toThrow("site_package_state_changed");
    expect(await captureEntryLifecycleNativeSnapshot(id)).toEqual(created.snapshot);
  },
  dbTestTimeoutMs
);
