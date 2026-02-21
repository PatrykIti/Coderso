import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import {
  autosavePost,
  createPost,
  deletePost,
  getPost,
  listPostRevisions,
  restorePostRevision,
} from "../../../core/services/content/postsService";

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

const createdPostIds = new Set<string>();
const createdUserIds = new Set<string>();

const cleanup = async () => {
  for (const postId of createdPostIds) {
    await deletePost(postId).catch(() => undefined);
  }
  createdPostIds.clear();

  for (const userId of createdUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  createdUserIds.clear();
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `post-editor-${randomUUID()}@nextless.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Post Editor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  await cleanup();
});

testIfDb(
  "autosavePost creates revisions and deduplicates identical snapshots",
  async () => {
    const actor = await createActor();
    const post = await createPost({
      title: `Autosave ${randomUUID()}`,
      data: { excerpt: "Draft body v1" },
    });
    if (!post) throw new Error("post_create_failed");
    createdPostIds.add(post.id);

    const first = await autosavePost(
      post.id,
      {
        title: `${post.title} Updated`,
        data: {
          ...(post.data as Record<string, unknown>),
          excerpt: "Draft body v1",
        },
        tags: ["news"],
      },
      actor.id
    );
    expect(first.reusedRevision).toBe(false);
    expect(first.revision.version).toBe(1);

    const second = await autosavePost(
      post.id,
      {
        title: `${post.title} Updated`,
        data: {
          ...(post.data as Record<string, unknown>),
          excerpt: "Draft body v1",
        },
        tags: ["news"],
      },
      actor.id
    );
    expect(second.reusedRevision).toBe(true);
    expect(second.revision.id).toBe(first.revision.id);

    const third = await autosavePost(
      post.id,
      {
        title: `${post.title} Updated`,
        data: {
          ...(post.data as Record<string, unknown>),
          excerpt: "Draft body v2",
        },
        tags: ["news", "release"],
      },
      actor.id
    );
    expect(third.reusedRevision).toBe(false);
    expect(third.revision.version).toBeGreaterThan(first.revision.version);

    const revisions = await listPostRevisions(post.id);
    expect(revisions.length).toBeGreaterThanOrEqual(2);
    expect(revisions[0]?.version).toBeGreaterThanOrEqual(revisions[1]?.version ?? 0);
  },
  { timeout: 15_000 }
);

testIfDb(
  "restorePostRevision restores older snapshot and is idempotent",
  async () => {
    const actor = await createActor();
    const post = await createPost({
      title: `Restore ${randomUUID()}`,
      data: { excerpt: "Initial" },
    });
    if (!post) throw new Error("post_create_failed");
    createdPostIds.add(post.id);

    await autosavePost(
      post.id,
      {
        title: post.title,
        data: {
          ...(post.data as Record<string, unknown>),
          excerpt: "Snapshot A",
        },
      },
      actor.id
    );

    await autosavePost(
      post.id,
      {
        title: post.title,
        data: {
          ...(post.data as Record<string, unknown>),
          excerpt: "Snapshot B",
        },
      },
      actor.id
    );

    const revisions = await listPostRevisions(post.id);
    const target = revisions.find((revision) => revision.version === 1);
    if (!target) throw new Error("expected_revision_missing");

    const restored = await restorePostRevision(post.id, target.id, actor.id);
    expect(restored.restored).toBe(true);

    const loaded = await getPost(post.id);
    expect((loaded?.data as Record<string, unknown>)?.excerpt).toBe("Snapshot A");

    const restoredAgain = await restorePostRevision(post.id, target.id, actor.id);
    expect(restoredAgain.restored).toBe(false);
  },
  { timeout: 15_000 }
);
