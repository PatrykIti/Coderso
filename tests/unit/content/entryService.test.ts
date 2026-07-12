import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isAsExpression,
  isCallExpression,
  isFunctionDeclaration,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isVariableDeclaration,
  type CallExpression,
  type FunctionDeclaration,
  type Node,
  type SourceFile,
} from "typescript";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentRevisions,
  contentTaxonomies,
  contentTermAssignments,
  contentTerms,
  contentTypes,
  media,
  previewTokens,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import {
  coordinateEntryMetadataMutation,
  createEntry,
  createEntryMutationDepsForTest,
  deleteEntry,
  duplicateEntry,
  updateEntry,
  createEntryPreview,
  getEntry,
  getEntryBySlug,
  listEntries,
  listEntriesWithContentTypes,
  listEntryRevisions,
  publishEntry,
  unpublishEntry,
  updateEntryMetadata,
  updateEntryMetadataForRoute,
  type EntryMutationDeps,
} from "../../../core/services/content/entryService";
import { createTerm, setTaxonomyConfig } from "../../../core/services/content/taxonomyService";
import { createContentType } from "../../../core/services/content/typeService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

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

const uniqueName = (prefix: string) => `${prefix} ${randomUUID()}`;

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

const entryServiceSource = readFileSync(
  new URL("../../../core/services/content/entryService.ts", import.meta.url),
  "utf8"
);
const entryServiceAst = createSourceFile(
  "entryService.ts",
  entryServiceSource,
  ScriptTarget.Latest,
  true,
  ScriptKind.TS
);

const findFunction = (sourceFile: SourceFile, name: string): FunctionDeclaration => {
  let found: FunctionDeclaration | undefined;
  const visit = (node: Node) => {
    if (isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (!found) forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) throw new Error(`missing_function:${name}`);
  return found;
};

const collectCalls = (root: Node): CallExpression[] => {
  const calls: CallExpression[] = [];
  const visit = (node: Node) => {
    if (isCallExpression(node)) calls.push(node);
    forEachChild(node, visit);
  };
  visit(root);
  return calls;
};

const methodCallsNamed = (root: Node, name: string) =>
  collectCalls(root).filter(
    (call) => isPropertyAccessExpression(call.expression) && call.expression.name.text === name
  );

const readProjectionKeys = (name: string) => {
  let initializer: Node | undefined;
  const visit = (node: Node) => {
    if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === name) {
      initializer = node.initializer;
      return;
    }
    if (!initializer) forEachChild(node, visit);
  };
  visit(entryServiceAst);
  const object = initializer && isAsExpression(initializer) ? initializer.expression : initializer;
  if (!object || !isObjectLiteralExpression(object)) throw new Error(`missing_projection:${name}`);
  return object.properties.map((property) => property.name?.getText(entryServiceAst));
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

type EntryMutationFixture = {
  actorId: string;
  entryId: string;
  typeId: string;
  typeSlug: string;
};

const withEntryMutationFixture = async <T>(
  run: (fixture: EntryMutationFixture) => Promise<T>
): Promise<T> => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `entry-mutation-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning({ id: users.id });
  if (!actor) throw new Error("missing_entry_mutation_actor");

  let type: Awaited<ReturnType<typeof createContentType>> | null = null;
  let createdEntryId: string | null = null;

  try {
    type = await createContentType({
      name: uniqueName("Entry mutation"),
      slug: `entry-mutation-${randomUUID()}`,
      schema,
    });
    const entry = await createEntry(type.id, {
      title: "Entry mutation fixture",
      slug: `entry-mutation-${randomUUID()}`,
      data: { title: "Entry mutation fixture" },
      authorId: actor.id,
    });
    createdEntryId = entry.id;
    return await run({
      actorId: actor.id,
      entryId: entry.id,
      typeId: type.id,
      typeSlug: type.slug,
    });
  } finally {
    if (createdEntryId) {
      await db.delete(seoDocuments).where(eq(seoDocuments.targetId, createdEntryId));
      await db.delete(contentRevisions).where(eq(contentRevisions.entryId, createdEntryId));
      await db
        .delete(contentTermAssignments)
        .where(eq(contentTermAssignments.entryId, createdEntryId));
      await db.delete(contentEntries).where(eq(contentEntries.id, createdEntryId));
    }
    if (type) await db.delete(contentTypes).where(eq(contentTypes.id, type.id));
    await db.delete(users).where(eq(users.id, actor.id));
  }
};

const createCacheRecordingDeps = (overrides: Partial<EntryMutationDeps> = {}) => {
  const cacheEvents: string[] = [];
  const deps = createEntryMutationDepsForTest({
    invalidateEntrySiteCache: async () => {
      cacheEvents.push("targeted");
    },
    clearAllSiteCache: () => {
      cacheEvents.push("global");
    },
    reportCacheFailure: (code) => {
      cacheEvents.push(`report:${code}`);
    },
    ...overrides,
  });
  return { cacheEvents, deps };
};

const createMutationTag = async (typeId: string, name = "Mutation tag") => {
  const taxonomies = await setTaxonomyConfig(typeId, { categories: true, tags: true });
  const tagTaxonomy = taxonomies.find((taxonomy) => taxonomy.kind === "tag");
  if (!tagTaxonomy) throw new Error("missing_mutation_tag_taxonomy");
  const tag = await createTerm(tagTaxonomy.id, { name: `${name} ${randomUUID()}` });
  if (!tag) throw new Error("missing_mutation_tag");
  return tag;
};

const readStoredEntryMutationState = async (entryId: string) => {
  const [row] = await db
    .select({
      status: contentEntries.status,
      visibility: contentEntries.visibility,
      accessPassword: contentEntries.accessPassword,
      tags: contentEntries.tags,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
    })
    .from(contentEntries)
    .where(eq(contentEntries.id, entryId));
  if (!row) throw new Error("missing_stored_entry_mutation_state");
  return row;
};

test("entry mutation source pins secret-minimal projections and write query shapes", () => {
  expect(readProjectionKeys("ENTRY_MUTATION_FIELDS")).toEqual([
    "id",
    "typeId",
    "slug",
    "title",
    "status",
    "data",
    "publishedAt",
    "scheduledAt",
    "visibility",
    "tags",
    "createdAt",
    "updatedAt",
    "hasPassword",
  ]);
  expect(readProjectionKeys("ENTRY_CACHE_FIELDS")).toEqual([
    "id",
    "typeId",
    "slug",
    "status",
    "publishedAt",
    "scheduledAt",
    "updatedAt",
  ]);
  expect(readProjectionKeys("ENTRY_DELETE_FIELDS")).toEqual(["id", "title"]);
  expect(readProjectionKeys("ENTRY_UPDATE_FIELDS")).toEqual([
    "id",
    "typeId",
    "title",
    "slug",
    "data",
  ]);
  expect(readProjectionKeys("CONTENT_TYPE_MUTATION_CONTEXT_FIELDS")).toEqual([
    "id",
    "slug",
    "schema",
  ]);

  for (const name of [
    "ENTRY_MUTATION_FIELDS",
    "ENTRY_CACHE_FIELDS",
    "ENTRY_DELETE_FIELDS",
    "ENTRY_UPDATE_FIELDS",
  ]) {
    expect(readProjectionKeys(name)).not.toContain("accessPassword");
  }

  const loader = findFunction(entryServiceAst, "loadEntryMutationStateForUpdate");
  expect(methodCallsNamed(loader, "select")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_MUTATION_FIELDS"
  );
  expect(methodCallsNamed(loader, "for")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    '"update"'
  );

  const statusWriter = findFunction(entryServiceAst, "writeEntryStatusTx");
  expect(
    methodCallsNamed(statusWriter, "returning")[0]?.arguments[0]?.getText(entryServiceAst)
  ).toBe("ENTRY_CACHE_FIELDS");
  const metadataWriter = findFunction(entryServiceAst, "writeEntryMetadataTx");
  expect(methodCallsNamed(metadataWriter, "returning")).toHaveLength(0);

  const update = findFunction(entryServiceAst, "updateEntry");
  expect(methodCallsNamed(update, "select")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_UPDATE_FIELDS"
  );
  expect(methodCallsNamed(update, "returning")).toHaveLength(0);

  const remove = findFunction(entryServiceAst, "deleteEntry");
  expect(methodCallsNamed(remove, "returning")[0]?.arguments[0]?.getText(entryServiceAst)).toBe(
    "ENTRY_DELETE_FIELDS"
  );

  const publish = findFunction(entryServiceAst, "publishEntry");
  expect(
    collectCalls(publish).some(
      (call) =>
        isIdentifier(call.expression) && call.expression.text === "loadEntryMutationStateForUpdate"
    )
  ).toBe(true);
  expect(entryServiceSource).not.toContain("select({ accessPassword:");
  expect(entryServiceSource).not.toContain("returning({ accessPassword:");
});

test("entry mutation dependency factory clones and freezes production seams", () => {
  const hash = async () => "test-hash";
  const first = createEntryMutationDepsForTest({ hashPassword: hash });
  const second = createEntryMutationDepsForTest({});

  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(second)).toBe(true);
  expect(first.hashPassword).toBe(hash);
  expect(second.hashPassword).not.toBe(hash);
  expect(() => {
    (first as unknown as { hashPassword: null }).hashPassword = null;
  }).toThrow();
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
      expect(revisions.length).toBe(1);

      const preview = await createEntryPreview(entry.id, 30);
      expect(preview.token).toHaveLength(36);

      const draft = await unpublishEntry(entry.id);
      expect(draft?.status).toBe("draft");
    } finally {
      if (localEntryId) {
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
        await db.delete(previewTokens).where(eq(previewTokens.targetId, localEntryId));
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
      await db.delete(contentEntries).where(eq(contentEntries.id, articleEntryId));
    }
    if (productEntryId) {
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
  userId = user?.id;

  const type = await createContentType({
    name: uniqueName("Notes"),
    slug: `notes-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
    authorId: userId,
  });
  entryId = entry?.id;

  const updated = await updateEntry(entry.id, { title: "Updated" });
  expect(updated?.author?.id).toBe(userId);
  expect(updated?.author?.email).toBe(user?.email);

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
  userId = undefined;
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

      await createEntry(type.id, {
        title: "Existing copy",
        slug: `${sourceSlug}-copy`,
        data: { title: "Existing copy" },
      });

      await updateEntryMetadata(entry.id, {
        taxonomy: { tagIds: [tag!.id] },
        seo: { description: "Source SEO summary", robots: "index,follow" },
      });

      const duplicated = await duplicateEntry(entry.id, localUserId);

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
      await db.delete(contentEntries).where(eq(contentEntries.id, teamEntryId));
    }
    if (projectEntryId) {
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

// TASK-514-01: entry visibility (schema + service round-trip + secret never leaks).
const hasSecretKey = (value: unknown) => {
  const serialized = JSON.stringify(value);
  return serialized.includes("accessPassword") || serialized.includes("access_password");
};

testIfDbWithOptions(
  "entry visibility round-trips and never echoes the access password",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;
    let localUserId: string | undefined;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `visibility-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("Visibility"),
        slug: `visibility-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const slug = `entry-${randomUUID()}`;
      const created = await createEntry(type.id, {
        title: "Visible Entry",
        slug,
        data: { title: "Hello" },
      });
      localEntryId = created?.id;

      // AC#2b/#8: fresh create is narrowed through getEntry — defaults + no secret.
      expect(created?.visibility).toBe("public");
      expect(created?.hasPassword).toBe(false);
      expect(hasSecretKey(created)).toBe(false);

      // public -> private (no password involved)
      const priv = await updateEntryMetadata(created!.id, { visibility: "private" });
      expect(priv?.visibility).toBe("private");
      expect(priv?.hasPassword).toBe(false);
      expect(hasSecretKey(priv)).toBe(false);

      // private -> password (AC#3): stores hash, hasPassword true, secret not echoed.
      const pw = await updateEntryMetadata(created!.id, {
        visibility: "password",
        accessPassword: "s3cret",
      });
      expect(pw?.visibility).toBe("password");
      expect(pw?.hasPassword).toBe(true);
      expect(hasSecretKey(pw)).toBe(false);

      // AC#6: omitting visibility leaves stored value + hash untouched (present-only).
      const untouched = await updateEntryMetadata(created!.id, { tags: ["keep"] });
      expect(untouched?.visibility).toBe("password");
      expect(untouched?.hasPassword).toBe(true);

      // password + no accessPassword but existing hash -> keep hash (no reject).
      const keep = await updateEntryMetadata(created!.id, { visibility: "password" });
      expect(keep?.hasPassword).toBe(true);

      // AC#5: password -> public clears the stored hash.
      const cleared = await updateEntryMetadata(created!.id, { visibility: "public" });
      expect(cleared?.visibility).toBe("public");
      expect(cleared?.hasPassword).toBe(false);

      // AC#2b: no read/return path over content_entries leaks the secret.
      const detail = await getEntry(created!.id);
      expect(hasSecretKey(detail)).toBe(false);
      const bySlug = await getEntryBySlug(type.id, slug);
      expect(hasSecretKey(bySlug)).toBe(false);
      const published = await publishEntry(created!.id, localUserId!);
      expect(hasSecretKey(published)).toBe(false);
      const unpublished = await unpublishEntry(created!.id);
      expect(hasSecretKey(unpublished)).toBe(false);
    } finally {
      if (localEntryId) {
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
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
  { timeout: 20_000 }
);

testIfDb("visibility password with no password and no existing hash is rejected", async () => {
  const type = await createContentType({
    name: uniqueName("PwReq"),
    slug: `pwreq-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  await expect(updateEntryMetadata(entry!.id, { visibility: "password" })).rejects.toThrow(
    "entry_password_required"
  );

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
});

testIfDbWithOptions(
  "combined {status:published, visibility:password} without password rejects before any write",
  async () => {
    let localContentTypeId: string | undefined;
    let localEntryId: string | undefined;
    let localUserId: string | undefined;

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: `combined-${randomUUID()}@example.com`,
          passwordHash: "test",
          status: "active",
        })
        .returning();
      localUserId = user?.id;

      const type = await createContentType({
        name: uniqueName("Combined"),
        slug: `combined-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const entry = await createEntry(type.id, {
        title: "Entry",
        slug: `entry-${randomUUID()}`,
        data: { title: "Hello" },
      });
      localEntryId = entry?.id;

      await expect(
        updateEntryMetadata(entry!.id, { status: "published", visibility: "password" }, localUserId)
      ).rejects.toThrow("entry_password_required");

      // AC#10: the status side-effect must NOT have committed (no partial write).
      const after = await getEntry(entry!.id);
      expect(after?.status).toBe("draft");
      expect(after?.visibility).toBe("public");
      expect(after?.hasPassword).toBe(false);
    } finally {
      if (localEntryId) {
        await db.delete(contentRevisions).where(eq(contentRevisions.entryId, localEntryId));
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
  { timeout: 20_000 }
);

testIfDbWithOptions(
  "duplicateEntry copies visibility, downgrades password to private, never copies the hash",
  async () => {
    let localContentTypeId: string | undefined;

    try {
      const type = await createContentType({
        name: uniqueName("Dup"),
        slug: `dup-${randomUUID()}`,
        schema,
      });
      localContentTypeId = type.id;

      const entry = await createEntry(type.id, {
        title: "Password Source",
        slug: `dup-${randomUUID()}`,
        data: { title: "Password Source" },
      });
      await updateEntryMetadata(entry!.id, {
        visibility: "password",
        accessPassword: "s3cret",
      });

      const duplicated = await duplicateEntry(entry!.id);
      // AC#9: password source -> copy downgraded to private, no hash copied.
      expect(duplicated?.visibility).toBe("private");
      expect(duplicated?.hasPassword).toBe(false);
      expect(hasSecretKey(duplicated)).toBe(false);
    } finally {
      if (localContentTypeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, localContentTypeId));
      }
    }
  },
  { timeout: 20_000 }
);

testIfDb("all three read projections expose visibility + hasPassword", async () => {
  const type = await createContentType({
    name: uniqueName("Projections"),
    slug: `projections-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const entry = await createEntry(type.id, {
    title: "Projection Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  // (a) per-type list selection
  const listRows = await listEntries(type.id);
  const listRow = listRows.find((row) => row.id === entry!.id);
  expect(listRow?.visibility).toBe("public");
  expect(listRow?.hasPassword).toBe(false);

  // (b) all-entries list selection
  const allRows = await listEntriesWithContentTypes();
  const allRow = allRows.find((row) => row.id === entry!.id);
  expect(allRow?.visibility).toBe("public");
  expect(allRow?.hasPassword).toBe(false);

  // (c) detail
  const detail = await getEntry(entry!.id);
  expect(detail?.visibility).toBe("public");
  expect(detail?.hasPassword).toBe(false);

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
});

testIfDbWithOptions(
  "entry metadata write plans follow the exact status and accumulated metadata matrix",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Write plan");
      const statusPlans: Array<Parameters<EntryMutationDeps["writeStatus"]>[1]> = [];
      const metadataPlans: Array<Parameters<EntryMutationDeps["writeMetadata"]>[1]> = [];
      const cacheEvents: string[] = [];
      const deps = createEntryMutationDepsForTest({
        hashPassword: async () => "prepared-test-hash",
        createRevision: async (_tx, entryId, data, userId) => ({
          id: randomUUID(),
          entryId,
          version: 1,
          data,
          createdBy: userId,
          createdAt: new Date(),
        }),
        writeStatus: async (_tx, plan) => {
          statusPlans.push(plan);
          return null;
        },
        applyTaxonomy: async () => ({ category: null, tags: [] }),
        writeMetadata: async (_tx, plan) => {
          metadataPlans.push(plan);
        },
        invalidateEntrySiteCache: async () => {
          cacheEvents.push("targeted");
        },
        clearAllSiteCache: () => {
          cacheEvents.push("global");
        },
      });

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "draft" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans).toHaveLength(0);
      expect(metadataPlans).toHaveLength(0);
      expect(cacheEvents).toHaveLength(0);

      const scheduledAt = new Date("2035-01-02T03:04:05.000Z");
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "scheduled", scheduledAt },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.entryId).toBe(fixture.entryId);
      expect(statusPlans.at(-1)?.values).toMatchObject({
        status: "scheduled",
        scheduledAt,
      });
      expect(Object.hasOwn(statusPlans.at(-1)?.values ?? {}, "publishedAt")).toBe(false);
      expect(Object.isFrozen(statusPlans.at(-1))).toBe(true);
      expect(Object.isFrozen(statusPlans.at(-1)?.values)).toBe(true);

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "archived" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.values).toMatchObject({
        status: "archived",
        scheduledAt: null,
      });
      expect(Object.hasOwn(statusPlans.at(-1)?.values ?? {}, "publishedAt")).toBe(false);

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "published" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(statusPlans.at(-1)?.values.status).toBe("published");
      expect(statusPlans.at(-1)?.values.publishedAt).toBeInstanceOf(Date);
      expect(statusPlans.at(-1)?.values.scheduledAt).toBeNull();

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        {
          scheduledAt,
          visibility: "password",
          accessPassword: "new password",
          taxonomy: { tagIds: [tag.id] },
        },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      const metadataPlan = metadataPlans.at(-1);
      expect(metadataPlan?.entryId).toBe(fixture.entryId);
      expect(metadataPlan?.values).toMatchObject({
        tags: [tag.name],
        scheduledAt,
        visibility: "password",
        accessPassword: "prepared-test-hash",
      });
      expect(Object.keys(metadataPlan?.values ?? {}).sort()).toEqual([
        "accessPassword",
        "scheduledAt",
        "tags",
        "updatedAt",
        "visibility",
      ]);
      expect(Object.isFrozen(metadataPlan)).toBe(true);
      expect(Object.isFrozen(metadataPlan?.values)).toBe(true);
      expect(cacheEvents.filter((event) => event === "targeted")).toHaveLength(4);
      expect(cacheEvents).not.toContain("global");
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "taxonomy and SEO preparation reject before every metadata write and cache effect",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Prepare rollback");
      const { cacheEvents, deps } = createCacheRecordingDeps();

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            status: "published",
            taxonomy: { tagIds: [randomUUID()] },
          },
          fixture.actorId,
          { kind: "trusted-internal" }
        )
      ).rejects.toThrow(/taxonomy_term_(missing|invalid)/);

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          {
            taxonomy: { tagIds: [tag.id] },
            visibility: "private",
            seo: { canonicalUrl: "ftp://invalid.example.test" },
          },
          fixture.actorId,
          { kind: "trusted-internal" }
        )
      ).rejects.toThrow("seo_canonical_invalid");

      const stored = await readStoredEntryMutationState(fixture.entryId);
      expect(stored.status).toBe("draft");
      expect(stored.visibility).toBe("public");
      expect(stored.tags ?? []).toEqual([]);
      expect(
        await db
          .select({ id: contentRevisions.id })
          .from(contentRevisions)
          .where(eq(contentRevisions.entryId, fixture.entryId))
      ).toHaveLength(0);
      expect(
        await db
          .select({ termId: contentTermAssignments.termId })
          .from(contentTermAssignments)
          .where(eq(contentTermAssignments.entryId, fixture.entryId))
      ).toHaveLength(0);
      expect(
        await db
          .select({ id: seoDocuments.id })
          .from(seoDocuments)
          .where(eq(seoDocuments.targetId, fixture.entryId))
      ).toHaveLength(0);
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "entry metadata cache matrix is global for SEO, targeted otherwise, and no-op silent",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const { cacheEvents, deps } = createCacheRecordingDeps();

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { seo: { description: "Cache matrix SEO description" } },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual(["global"]);

      cacheEvents.length = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { tags: ["cache-matrix"] },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual(["targeted"]);

      cacheEvents.length = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "draft", accessPassword: "ignored" },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(cacheEvents).toEqual([]);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "post-commit cache and reporter failures preserve durable metadata success",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const reported: string[] = [];
      const deps = createEntryMutationDepsForTest({
        invalidateEntrySiteCache: async () => {
          throw new Error("raw-cache-provider-secret");
        },
        reportCacheFailure: (code) => {
          reported.push(code);
          throw new Error("reporter_failed");
        },
      });

      const result = await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { tags: ["durable-cache-failure"] },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      expect(result?.tags).toEqual(["durable-cache-failure"]);
      expect((await readStoredEntryMutationState(fixture.entryId)).tags).toEqual([
        "durable-cache-failure",
      ]);
      expect(reported).toEqual(["entry_cache_invalidation_failed"]);
      expect(JSON.stringify(reported)).not.toContain("raw-cache-provider-secret");
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "a failure after every metadata write seam rolls the entire outer transaction back",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Fault seam");
      const { cacheEvents, deps: base } = createCacheRecordingDeps();

      const failAfterCreateRevision: EntryMutationDeps["createRevision"] = async (...args) => {
        await base.createRevision(...args);
        throw new Error("fault_after_create_revision");
      };
      const failAfterWriteStatus: EntryMutationDeps["writeStatus"] = async (...args) => {
        await base.writeStatus(...args);
        throw new Error("fault_after_write_status");
      };
      const failAfterApplyTaxonomy: EntryMutationDeps["applyTaxonomy"] = async (...args) => {
        await base.applyTaxonomy(...args);
        throw new Error("fault_after_apply_taxonomy");
      };
      const failAfterWriteMetadata: EntryMutationDeps["writeMetadata"] = async (...args) => {
        await base.writeMetadata(...args);
        throw new Error("fault_after_write_metadata");
      };
      const failAfterApplySeo: EntryMutationDeps["applySeo"] = async (...args) => {
        await base.applySeo(...args);
        throw new Error("fault_after_apply_seo");
      };

      const faults: Array<{
        code: string;
        overrides: Partial<EntryMutationDeps>;
      }> = [
        {
          code: "fault_after_create_revision",
          overrides: { createRevision: failAfterCreateRevision },
        },
        { code: "fault_after_write_status", overrides: { writeStatus: failAfterWriteStatus } },
        {
          code: "fault_after_apply_taxonomy",
          overrides: { applyTaxonomy: failAfterApplyTaxonomy },
        },
        {
          code: "fault_after_write_metadata",
          overrides: { writeMetadata: failAfterWriteMetadata },
        },
        { code: "fault_after_apply_seo", overrides: { applySeo: failAfterApplySeo } },
      ];

      for (const fault of faults) {
        const deps = createEntryMutationDepsForTest({
          ...base,
          ...fault.overrides,
        });
        await expect(
          coordinateEntryMetadataMutation(
            deps,
            fixture.entryId,
            {
              status: "published",
              visibility: "private",
              taxonomy: { tagIds: [tag.id] },
              seo: { description: `SEO ${fault.code}` },
            },
            fixture.actorId,
            { kind: "trusted-internal" }
          )
        ).rejects.toThrow(fault.code);

        const stored = await readStoredEntryMutationState(fixture.entryId);
        expect(stored.status, fault.code).toBe("draft");
        expect(stored.visibility, fault.code).toBe("public");
        expect(stored.tags ?? [], fault.code).toEqual([]);
        expect(stored.publishedAt, fault.code).toBeNull();
        expect(
          await db
            .select({ id: contentRevisions.id })
            .from(contentRevisions)
            .where(eq(contentRevisions.entryId, fixture.entryId)),
          fault.code
        ).toHaveLength(0);
        expect(
          await db
            .select({ termId: contentTermAssignments.termId })
            .from(contentTermAssignments)
            .where(eq(contentTermAssignments.entryId, fixture.entryId)),
          fault.code
        ).toHaveLength(0);
        expect(
          await db
            .select({ id: seoDocuments.id })
            .from(seoDocuments)
            .where(eq(seoDocuments.targetId, fixture.entryId)),
          fault.code
        ).toHaveLength(0);
        expect(cacheEvents, fault.code).toHaveLength(0);
      }
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "deferred taxonomy and SEO applies are awaited and stay cache-silent until commit",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Deferred seam");
      const taxonomyGate = createDeferred<void>();
      const taxonomyEntered = createDeferred<void>();
      const { cacheEvents, deps: base } = createCacheRecordingDeps();
      const taxonomyDeps = createEntryMutationDepsForTest({
        ...base,
        applyTaxonomy: async (...args) => {
          taxonomyEntered.resolve();
          await taxonomyGate.promise;
          return base.applyTaxonomy(...args);
        },
      });

      let taxonomySettled = false;
      const pendingTaxonomy = coordinateEntryMetadataMutation(
        taxonomyDeps,
        fixture.entryId,
        { taxonomy: { tagIds: [tag.id] } },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      void pendingTaxonomy.finally(() => {
        taxonomySettled = true;
      });
      await taxonomyEntered.promise;
      expect(taxonomySettled).toBe(false);
      expect(cacheEvents).toHaveLength(0);
      taxonomyGate.resolve();
      await pendingTaxonomy;
      expect(cacheEvents).toEqual(["targeted"]);

      cacheEvents.length = 0;
      const seoGate = createDeferred<void>();
      const seoEntered = createDeferred<void>();
      const seoDeps = createEntryMutationDepsForTest({
        ...base,
        applySeo: async (...args) => {
          seoEntered.resolve();
          await seoGate.promise;
          return base.applySeo(...args);
        },
      });
      const scheduledAt = new Date("2036-02-03T04:05:06.000Z");
      const pendingSeo = coordinateEntryMetadataMutation(
        seoDeps,
        fixture.entryId,
        {
          status: "scheduled",
          scheduledAt,
          seo: { description: "Deferred SEO" },
        },
        fixture.actorId,
        { kind: "trusted-internal" }
      );
      await seoEntered.promise;
      expect(cacheEvents).toHaveLength(0);
      seoGate.reject(new Error("deferred_seo_rejected"));
      await expect(pendingSeo).rejects.toThrow("deferred_seo_rejected");
      const stored = await readStoredEntryMutationState(fixture.entryId);
      expect(stored.status).toBe("draft");
      expect(stored.scheduledAt).toBeNull();
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "locked publish authorization runs before preparation and only for a real transition",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const tag = await createMutationTag(fixture.typeId, "Authorization order");
      const events: string[] = [];
      const { deps: base } = createCacheRecordingDeps();
      const deps = createEntryMutationDepsForTest({
        ...base,
        hashPassword: async () => {
          events.push("hash");
          return "authorization-order-hash";
        },
        prepareTaxonomy: async (...args) => {
          events.push("prepare-taxonomy");
          return base.prepareTaxonomy(...args);
        },
        prepareSeo: async (...args) => {
          events.push("prepare-seo");
          return base.prepareSeo(...args);
        },
        createRevision: async (...args) => {
          events.push("create-revision");
          return base.createRevision(...args);
        },
        writeStatus: async (...args) => {
          events.push("write-status");
          return base.writeStatus(...args);
        },
        applyTaxonomy: async (...args) => {
          events.push("apply-taxonomy");
          return base.applyTaxonomy(...args);
        },
        writeMetadata: async (...args) => {
          events.push("write-metadata");
          return base.writeMetadata(...args);
        },
        applySeo: async (...args) => {
          events.push("apply-seo");
          return base.applySeo(...args);
        },
      });

      await expect(
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { status: "published" },
          fixture.actorId,
          undefined as never
        )
      ).rejects.toThrow("entry_publish_authorization_required");
      expect(events).toHaveLength(0);
      expect((await readStoredEntryMutationState(fixture.entryId)).status).toBe("draft");

      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        {
          status: "published",
          visibility: "password",
          accessPassword: "authorization password",
          taxonomy: { tagIds: [tag.id] },
          seo: { description: "Authorization order SEO" },
        },
        fixture.actorId,
        {
          kind: "route",
          authorize: async () => {
            events.push("authorize");
          },
        }
      );
      expect(events).toEqual([
        "authorize",
        "hash",
        "prepare-taxonomy",
        "prepare-seo",
        "create-revision",
        "write-status",
        "apply-taxonomy",
        "write-metadata",
        "apply-seo",
      ]);

      let redundantAuthorizationCalls = 0;
      await coordinateEntryMetadataMutation(
        deps,
        fixture.entryId,
        { status: "published", tags: ["already-published"] },
        fixture.actorId,
        {
          kind: "route",
          authorize: async () => {
            redundantAuthorizationCalls += 1;
          },
        }
      );
      expect(redundantAuthorizationCalls).toBe(0);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "accessPassword is ignored when visibility is omitted for every stored visibility",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      let hashCalls = 0;
      const { cacheEvents, deps: base } = createCacheRecordingDeps();
      const deps = createEntryMutationDepsForTest({
        ...base,
        hashPassword: async () => {
          hashCalls += 1;
          return "must-not-be-used";
        },
      });
      const states = [
        { visibility: "public" as const, accessPassword: null },
        { visibility: "private" as const, accessPassword: null },
        { visibility: "password" as const, accessPassword: "stored-byte-identical-hash" },
      ];

      for (const state of states) {
        await db.update(contentEntries).set(state).where(eq(contentEntries.id, fixture.entryId));
        await coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { accessPassword: "ignored-author-input" },
          fixture.actorId,
          { kind: "trusted-internal" }
        );
        const stored = await readStoredEntryMutationState(fixture.entryId);
        expect(stored.visibility).toBe(state.visibility);
        expect(stored.accessPassword).toBe(state.accessPassword);
      }

      expect(hashCalls).toBe(0);
      expect(cacheEvents).toHaveLength(0);
    });
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "concurrent password keep and clear mutations cannot leave password visibility without a hash",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      await db
        .update(contentEntries)
        .set({ visibility: "password", accessPassword: "concurrency-hash" })
        .where(eq(contentEntries.id, fixture.entryId));
      const { deps } = createCacheRecordingDeps();

      const results = await Promise.allSettled([
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { visibility: "public" },
          fixture.actorId,
          { kind: "trusted-internal" }
        ),
        coordinateEntryMetadataMutation(
          deps,
          fixture.entryId,
          { visibility: "password" },
          fixture.actorId,
          { kind: "trusted-internal" }
        ),
      ]);
      expect(results.some((result) => result.status === "fulfilled")).toBe(true);
      for (const result of results) {
        if (result.status === "rejected") {
          expect(String(result.reason)).toContain("entry_password_required");
        }
      }

      const stored = await readStoredEntryMutationState(fixture.entryId);
      expect(stored.visibility === "password" && stored.accessPassword === null).toBe(false);
      if (stored.visibility === "password") {
        expect(stored.accessPassword).toBe("concurrency-hash");
      } else {
        expect(stored.visibility).toBe("public");
        expect(stored.accessPassword).toBeNull();
      }
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "concurrent standalone publishes serialize distinct revision versions",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      const results = await Promise.all([
        publishEntry(fixture.entryId, fixture.actorId),
        publishEntry(fixture.entryId, fixture.actorId),
      ]);
      expect(results.every((result) => result?.status === "published")).toBe(true);
      const revisions = await db
        .select({ version: contentRevisions.version })
        .from(contentRevisions)
        .where(eq(contentRevisions.entryId, fixture.entryId));
      expect(
        revisions.map((revision) => revision.version).sort((left, right) => left - right)
      ).toEqual([1, 2]);
    });
  },
  { timeout: 45_000 }
);

testIfDbWithOptions(
  "route metadata wrapper preserves direct SEO null values as omitted fields",
  async () => {
    await withEntryMutationFixture(async (fixture) => {
      await updateEntryMetadata(fixture.entryId, {
        seo: {
          title: "Stored SEO title",
          description: "Stored SEO description",
          canonicalUrl: "https://example.test/stored",
          robots: "index,follow",
        },
      });

      await updateEntryMetadataForRoute(
        fixture.entryId,
        {
          seo: {
            title: null,
            description: null,
            canonicalUrl: null,
            robots: null,
          },
        },
        fixture.actorId,
        async () => undefined
      );
      const [seo] = await db
        .select({
          title: seoDocuments.title,
          description: seoDocuments.description,
          canonicalUrl: seoDocuments.canonicalUrl,
          robots: seoDocuments.robots,
        })
        .from(seoDocuments)
        .where(
          and(eq(seoDocuments.targetType, "entry"), eq(seoDocuments.targetId, fixture.entryId))
        );
      expect(seo).toEqual({
        title: "Stored SEO title",
        description: "Stored SEO description",
        canonicalUrl: "https://example.test/stored",
        robots: "index,follow",
      });
    });
  },
  { timeout: 30_000 }
);

testIfDb("deleteEntry returns only the assistant consumer id and title", async () => {
  await withEntryMutationFixture(async (fixture) => {
    const deleted = await deleteEntry(fixture.entryId);
    expect(Object.keys(deleted ?? {})).toEqual(["id", "title"]);
    expect(deleted?.id).toBe(fixture.entryId);
  });
});
