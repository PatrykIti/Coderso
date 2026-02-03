import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTypes,
  previewTokens,
  users,
} from "../../../core/db/schema";
import {
  createEntry,
  createEntryPreview,
  getEntry,
  listEntryRevisions,
  publishEntry,
  unpublishEntry,
  updateEntryMetadata,
} from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";

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
let entryId: string | undefined;
let userId: string | undefined;

const cleanup = async () => {
  if (entryId) {
    await db.delete(contentRevisions).where(eq(contentRevisions.entryId, entryId));
    await db.delete(previewTokens).where(eq(previewTokens.targetId, entryId));
    await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
  }
  if (contentTypeId) {
    await db.delete(contentTypes).where(eq(contentTypes.id, contentTypeId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("publish flow creates revisions and preview", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `author-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  userId = user?.id;

  const type = await createContentType({
    name: "News",
    slug: `news-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  const published = await publishEntry(entry.id, userId!);
  expect(published?.status).toBe("published");

  const revisions = await listEntryRevisions(entry.id);
  expect(revisions.length).toBe(1);

  const preview = await createEntryPreview(entry.id, 30);
  expect(preview.token).toHaveLength(36);

  const draft = await unpublishEntry(entry.id);
  expect(draft?.status).toBe("draft");

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
  userId = undefined;
});

testIfDb("enforces slug uniqueness per type", async () => {
  const type = await createContentType({
    name: "FAQ",
    slug: `faq-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const slug = `entry-${randomUUID()}`;

  await createEntry(type.id, {
    title: "Entry",
    slug,
    data: { title: "One" },
  });

  await expect(
    createEntry(type.id, {
      title: "Entry Two",
      slug,
      data: { title: "Two" },
    })
  ).rejects.toThrow("entry_slug_conflict");

  await cleanup();
  contentTypeId = undefined;
});

testIfDb("updateEntryMetadata stores tags, schedule, and SEO", async () => {
  const type = await createContentType({
    name: "Blog",
    slug: `blog-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
  await updateEntryMetadata(entry.id, {
    status: "scheduled",
    scheduledAt,
    tags: ["alpha", "beta", "alpha"],
    seo: { description: "SEO summary" },
  });

  const updated = await getEntry(entry.id);
  expect(updated?.status).toBe("scheduled");
  expect(updated?.scheduledAt?.toISOString()).toBe(scheduledAt.toISOString());
  expect(updated?.tags).toEqual(["alpha", "beta"]);
  expect(updated?.seo?.description).toBe("SEO summary");

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
});

testIfDb("validates relation entry IDs", async () => {
  const projectSlug = `projects-${randomUUID()}`;
  const teamSlug = `teams-${randomUUID()}`;

  const projectType = await createContentType({
    name: "Projects",
    slug: projectSlug,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    },
  });

  const teamType = await createContentType({
    name: "Teams",
    slug: teamSlug,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        leadProject: {
          type: "string",
          xFieldType: "relation",
          xRelationTarget: projectSlug,
          xFieldConfig: { relation: { target: projectSlug } },
        },
        relatedProjects: {
          type: "array",
          items: { type: "string" },
          xFieldType: "relation",
          xRelationTarget: projectSlug,
          xFieldConfig: { relation: { target: projectSlug, multiple: true } },
        },
      },
    },
  });

  let projectEntryId: string | undefined;
  let teamEntryId: string | undefined;

  try {
    const projectEntry = await createEntry(projectType.id, {
      title: "Project Alpha",
      slug: `project-${randomUUID()}`,
      data: { title: "Project Alpha" },
    });
    projectEntryId = projectEntry?.id;

    const teamEntry = await createEntry(teamType.id, {
      title: "Team One",
      slug: `team-${randomUUID()}`,
      data: {
        title: "Team One",
        leadProject: projectEntryId,
        relatedProjects: [projectEntryId],
      },
    });
    teamEntryId = teamEntry?.id;

    await expect(
      createEntry(teamType.id, {
        title: "Team Broken",
        slug: `team-${randomUUID()}`,
        data: {
          title: "Team Broken",
          leadProject: "missing-id",
        },
      })
    ).rejects.toThrow("relation_entry_missing");
  } finally {
    if (teamEntryId) {
      await db
        .delete(contentEntries)
        .where(eq(contentEntries.id, teamEntryId));
    }
    if (projectEntryId) {
      await db
        .delete(contentEntries)
        .where(eq(contentEntries.id, projectEntryId));
    }
    await db.delete(contentTypes).where(eq(contentTypes.id, teamType.id));
    await db.delete(contentTypes).where(eq(contentTypes.id, projectType.id));
  }
});

testIfDb("updateEntryMetadata requires scheduledAt for scheduled status", async () => {
  const type = await createContentType({
    name: "FAQ",
    slug: `faq-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  await expect(
    updateEntryMetadata(entry.id, {
      status: "scheduled",
    })
  ).rejects.toThrow("scheduled_at_required");

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
});
