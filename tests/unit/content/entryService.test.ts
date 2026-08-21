import { afterAll, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTypes,
  media,
  previewTokens,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import {
  createEntry,
  createEntryPreview,
  deleteEntry,
  duplicateEntry,
  getEntry,
  listEntriesWithContentTypes,
  listEntryRevisions,
  publishEntry,
  unpublishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../../../core/services/content/entryService";
import { createTerm, setTaxonomyConfig } from "../../../core/services/content/taxonomyService";
import { createContentType } from "../../../core/services/content/typeService";
import {
  cleanup,
  entryServiceTestState,
  schema,
  testIfDb,
  testIfDbWithOptions,
  uniqueName,
  withEntryMutationFixture,
} from "./support/entryServiceTestSupport";

afterAll(async () => {
  await cleanup();
});

testIfDbWithOptions(
  "publish flow creates revisions and preview",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;
    let localUserId: string | undefined;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `author-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("News"),
        slug: `news-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const entry = await createEntry(type.id, {
        title: "Entry",
        slug: `entry-${randomUUID()}`,
        data: { title: "Hello" },
      });
      localEntryId = entry?.id;

      const published = await publishEntry(entry.id, localUserId!);
      expect(published?.status).toBe("published");

      const revisions = await listEntryRevisions(entry.id);
      expect(revisions.items.length).toBe(1);

      const preview = await createEntryPreview(entry.id, 30);
      expect(preview.token).toHaveLength(36);

      const draft = await unpublishEntry(entry.id);
      expect(draft?.status).toBe("draft");
    } finally {
      if (localEntryId) {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, localEntryId));
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
        await db.delete(previewTokens).where(eq(previewTokens.targetId, localEntryId));
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, localEntryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, localEntryId));
      }
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
      if (localUserId) {
        await db.delete(users).where(eq(users.id, localUserId));
      }
    }
  },
  { timeout: 15_000 }
);

testIfDb("enforces slug uniqueness per type", async () => {
  const type = await createContentType({
    name: uniqueName("FAQ"),
    slug: `faq-${randomUUID()}`,
    schema,
  });
  entryServiceTestState.contentTypeId = type.id;

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
  entryServiceTestState.contentTypeId = undefined;
});

testIfDb("listEntriesWithContentTypes returns cross-type rows with owner metadata", async () => {
  const articlesType = await createContentType({
    name: uniqueName("Articles"),
    slug: `articles-${randomUUID()}`,
    schema,
  });
  const productsType = await createContentType({
    name: uniqueName("Products"),
    slug: `products-${randomUUID()}`,
    schema,
  });
  let articleEntryId: string | undefined;
  let productEntryId: string | undefined;

  try {
    const articleEntry = await createEntry(articlesType.id, {
      title: "Article entry",
      slug: `article-${randomUUID()}`,
      data: { title: "Article entry" },
    });
    const productEntry = await createEntry(productsType.id, {
      title: "Product entry",
      slug: `product-${randomUUID()}`,
      data: { title: "Product entry" },
    });
    articleEntryId = articleEntry.id;
    productEntryId = productEntry.id;
    await db
      .update(contentEntries)
      .set({ updatedAt: new Date(Date.now() + 1000) })
      .where(eq(contentEntries.id, productEntry.id));

    const rows = await listEntriesWithContentTypes();
    const articleRow = rows.find((row) => row.id === articleEntry.id);
    const productRow = rows.find((row) => row.id === productEntry.id);

    expect(articleRow?.contentType).toEqual({
      id: articlesType.id,
      slug: articlesType.slug,
      name: articlesType.name,
      status: "draft",
    });
    expect(productRow?.contentType.slug).toBe(productsType.slug);
    expect(rows.findIndex((row) => row.id === productEntry.id)).toBeLessThan(
      rows.findIndex((row) => row.id === articleEntry.id)
    );
  } finally {
    if (articleEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, articleEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, articleEntryId));
    }
    if (productEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, productEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, productEntryId));
    }
    await db.delete(contentTypes).where(eq(contentTypes.id, articlesType.id));
    await db.delete(contentTypes).where(eq(contentTypes.id, productsType.id));
  }
});

testIfDb("updateEntry preserves author metadata", async () => {
  const [user] = await db
    .insert(users)
    .values({
      email: `author-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  entryServiceTestState.userId = user?.id;

  const type = await createContentType({
    name: uniqueName("Notes"),
    slug: `notes-${randomUUID()}`,
    schema,
  });
  entryServiceTestState.contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
    authorId: entryServiceTestState.userId,
  });
  entryServiceTestState.entryId = entry?.id;

  const updated = await updateEntry(entry.id, { title: "Updated" });
  expect(updated?.author?.id).toBe(entryServiceTestState.userId);
  expect(updated?.author?.email).toBe(user?.email);

  await cleanup();
  entryServiceTestState.contentTypeId = undefined;
  entryServiceTestState.entryId = undefined;
  entryServiceTestState.userId = undefined;
});

testIfDbWithOptions(
  "updateEntryMetadata stores taxonomy tags, schedule, and SEO",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;

    try {
      const type = await createContentType({
        name: uniqueName("Blog"),
        slug: `blog-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const taxonomies = await setTaxonomyConfig(type.id, {
        categories: true,
        tags: true,
      });
      const tagTaxonomy = taxonomies.find((item) => item.kind === "tag");
      const tag = await createTerm(tagTaxonomy!.id, { name: "Release" });

      const entry = await createEntry(type.id, {
        title: "Entry",
        slug: `entry-${randomUUID()}`,
        data: { title: "Hello" },
      });
      localEntryId = entry?.id;

      const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
      await updateEntryMetadata(entry.id, {
        status: "scheduled",
        scheduledAt,
        taxonomy: { tagIds: [tag!.id] },
        seo: { description: "SEO summary" },
      });

      const updated = await getEntry(entry.id);
      expect(updated?.status).toBe("scheduled");
      expect(updated?.scheduledAt?.toISOString()).toBe(scheduledAt.toISOString());
      expect(updated?.tags).toEqual(["Release"]);
      expect(updated?.taxonomy?.tags?.map((term) => term.name)).toEqual(["Release"]);
      expect(updated?.seo?.description).toBe("SEO summary");
    } finally {
      if (localEntryId) {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, localEntryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, localEntryId));
      }
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
    }
  },
  { timeout: 15_000 }
);

testIfDbWithOptions(
  "duplicateEntry creates a draft copy with unique slug and metadata",
  async () => {
    let localContentTypeId: string | undefined;
    let localUserId: string | undefined;
    const localEntryIds: string[] = [];

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `entry-copy-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("Stories"),
        slug: `stories-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const taxonomies = await setTaxonomyConfig(type.id, {
        categories: true,
        tags: true,
      });
      const tagTaxonomy = taxonomies.find((item) => item.kind === "tag");
      const tag = await createTerm(tagTaxonomy!.id, { name: "Featured" });

      const sourceSlug = `story-${randomUUID()}`;
      const entry = await createEntry(type.id, {
        title: "Source Story",
        slug: sourceSlug,
        data: { title: "Source Story" },
      });
      localEntryIds.push(entry.id);

      const copyEntry = await createEntry(type.id, {
        title: "Existing copy",
        slug: `${sourceSlug}-copy`,
        data: { title: "Existing copy" },
      });
      localEntryIds.push(copyEntry.id);

      await updateEntryMetadata(entry.id, {
        taxonomy: { tagIds: [tag!.id] },
        seo: { description: "Source SEO summary", robots: "index,follow" },
      });

      const duplicated = await duplicateEntry(entry.id, localUserId);
      if (duplicated) localEntryIds.push(duplicated.id);

      expect(duplicated?.title).toBe("Source Story (Copy 2)");
      expect(duplicated?.slug).toBe(`${sourceSlug}-copy-2`);
      expect(duplicated?.status).toBe("draft");
      expect(duplicated?.publishedAt).toBeNull();
      expect(duplicated?.scheduledAt).toBeNull();
      expect(duplicated?.author?.id).toBe(localUserId);
      expect(duplicated?.taxonomy?.tags?.map((term) => term.name)).toEqual(["Featured"]);
      expect(duplicated?.seo?.description).toBe("Source SEO summary");
      expect(duplicated?.seo?.robots).toBe("index,follow");
    } finally {
      for (const entryId of localEntryIds) {
        await db.delete(seoDocuments).where(eq(seoDocuments.targetId, entryId));
        await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
      }
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
      if (localUserId) {
        await db.delete(users).where(eq(users.id, localUserId));
      }
    }
  },
  { timeout: 15_000 }
);

testIfDb("validates relation entry IDs", async () => {
  const projectSlug = `projects-${randomUUID()}`;
  const teamSlug = `teams-${randomUUID()}`;

  const projectType = await createContentType({
    name: uniqueName("Projects"),
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
    name: uniqueName("Teams"),
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
          leadProject: randomUUID(),
        },
      })
    ).rejects.toThrow("relation_entry_missing");
  } finally {
    if (teamEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, teamEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, teamEntryId));
    }
    if (projectEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, projectEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, projectEntryId));
    }
    await db.delete(contentTypes).where(eq(contentTypes.id, teamType.id));
    await db.delete(contentTypes).where(eq(contentTypes.id, projectType.id));
  }
});

testIfDb("validates media asset IDs and types", async () => {
  const type = await createContentType({
    name: uniqueName("Gallery"),
    slug: `gallery-${randomUUID()}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        heroImage: {
          type: "string",
          xFieldType: "media",
          xFieldConfig: { media: { accept: ["image/*"] } },
        },
        gallery: {
          type: "array",
          items: { type: "string" },
          maxItems: 2,
          xFieldType: "media",
          xFieldConfig: { media: { multiple: true, accept: ["image/*"], maxItems: 2 } },
        },
        coverImageUrl: { type: "string" },
      },
    },
  });

  let imageId: string | undefined;
  let docId: string | undefined;
  let entryId: string | undefined;

  try {
    const [image] = await db
      .insert(media)
      .values({
        key: `test/${randomUUID()}.png`,
        url: `https://cdn.example.com/${randomUUID()}.png`,
        type: "image",
        mimeType: "image/png",
        size: 1024,
      })
      .returning();
    imageId = image?.id;

    const [doc] = await db
      .insert(media)
      .values({
        key: `test/${randomUUID()}.pdf`,
        url: `https://cdn.example.com/${randomUUID()}.pdf`,
        type: "document",
        mimeType: "application/pdf",
        size: 2048,
      })
      .returning();
    docId = doc?.id;

    const entry = await createEntry(type.id, {
      title: "Gallery entry",
      slug: `entry-${randomUUID()}`,
      data: {
        title: "Gallery entry",
        heroImage: imageId,
        gallery: [imageId],
        coverImageUrl: "https://images.unsplash.com/photo-1604014237800-1c9102c219da",
      },
    });
    entryId = entry?.id;
    expect((entry.data as Record<string, unknown>).coverImageUrl).toBe(
      "https://images.unsplash.com/photo-1604014237800-1c9102c219da"
    );

    await expect(
      createEntry(type.id, {
        title: "Missing media",
        slug: `entry-${randomUUID()}`,
        data: { title: "Missing media", heroImage: randomUUID() },
      })
    ).rejects.toThrow("media_asset_missing");

    await expect(
      createEntry(type.id, {
        title: "Remote media URL",
        slug: `entry-${randomUUID()}`,
        data: {
          title: "Remote media URL",
          heroImage: "https://images.unsplash.com/photo-1604014237800-1c9102c219da",
        },
      })
    ).rejects.toThrow("media_asset_missing");

    await expect(
      createEntry(type.id, {
        title: "Wrong type",
        slug: `entry-${randomUUID()}`,
        data: { title: "Wrong type", heroImage: docId },
      })
    ).rejects.toThrow("media_type_not_allowed");
  } finally {
    if (entryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, entryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
    }
    if (imageId) {
      await db.delete(media).where(eq(media.id, imageId));
    }
    if (docId) {
      await db.delete(media).where(eq(media.id, docId));
    }
    await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
  }
});

testIfDb("updateEntryMetadata requires scheduledAt for scheduled status", async () => {
  const type = await createContentType({
    name: uniqueName("FAQ"),
    slug: `faq-${randomUUID()}`,
    schema,
  });
  entryServiceTestState.contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryServiceTestState.entryId = entry?.id;

  await expect(
    updateEntryMetadata(entry.id, {
      status: "scheduled",
    })
  ).rejects.toThrow("scheduled_at_required");

  await cleanup();
  entryServiceTestState.contentTypeId = undefined;
  entryServiceTestState.entryId = undefined;
});

testIfDb("deleteEntry returns only the assistant consumer id and title", async () => {
  await withEntryMutationFixture(async (fixture) => {
    const deleted = await deleteEntry(fixture.entryId);
    expect(Object.keys(deleted ?? {})).toEqual(["id", "title"]);
    expect(deleted?.id).toBe(fixture.entryId);
  });
});
