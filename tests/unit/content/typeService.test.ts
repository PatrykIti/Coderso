import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { contentEntries, contentTypes, detailPageDocuments } from "../../../core/db/schema";
import {
  createContentType,
  deleteContentType,
  duplicateContentType,
  updateContentType,
} from "../../../core/services/content/typeService";
import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";

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

const cleanupTypeIds = new Set<string>();

afterAll(async () => {
  for (const id of cleanupTypeIds) {
    await db.delete(contentEntries).where(eq(contentEntries.typeId, id));
    await db.delete(detailPageDocuments).where(eq(detailPageDocuments.contentTypeId, id));
    await db.delete(contentTypes).where(eq(contentTypes.id, id));
  }
});

testIfDb("create and update content type", async () => {
  const created = await createContentType({
    name: "Blog",
    slug: `blog-${randomUUID()}`,
    schema,
  });

  cleanupTypeIds.add(created.id);

  const updated = await updateContentType(created.id, {
    name: "Blog Updated",
  });

  expect(updated?.name).toBe("Blog Updated");

  const removed = await deleteContentType(created.id);
  expect(removed?.id).toBe(created.id);

  cleanupTypeIds.delete(created.id);
});

testIfDb("duplicate content type copies schema as a draft with unique identity", async () => {
  const created = await createContentType({
    name: `Products ${randomUUID()}`,
    slug: `products-${randomUUID()}`,
    schema,
    status: "published",
  });
  cleanupTypeIds.add(created.id);

  const duplicated = await duplicateContentType(created.id);
  if (!duplicated) throw new Error("expected duplicate");
  cleanupTypeIds.add(duplicated.id);

  expect(duplicated.name.startsWith("Copy of ")).toBe(true);
  expect(duplicated.slug.endsWith("-copy")).toBe(true);
  expect(duplicated.status).toBe("draft");
  expect(duplicated.schema).toEqual(created.schema);
});

testIfDb("content type validation rejects generated screen UUID names", async () => {
  await expect(
    createContentType({
      name: "Screen 2dcaeaad",
      slug: `screen-${randomUUID()}`,
      schema,
    })
  ).rejects.toThrow("content_type_name_generated_uuid");
});

testIfDb("delete content type is blocked while entries exist", async () => {
  const created = await createContentType({
    name: `Guarded ${randomUUID()}`,
    slug: `guarded-${randomUUID()}`,
    schema,
  });
  cleanupTypeIds.add(created.id);

  await db.insert(contentEntries).values({
    typeId: created.id,
    slug: "entry-one",
    title: "Entry One",
    data: { title: "Entry One" },
  });

  await expect(deleteContentType(created.id)).rejects.toThrow("content_type_has_entries");
});

testIfDb("delete content type is blocked while detail page documents exist", async () => {
  const created = await createContentType({
    name: `Detail Guarded ${randomUUID()}`,
    slug: `detail-guarded-${randomUUID()}`,
    schema,
  });
  cleanupTypeIds.add(created.id);

  await db.insert(detailPageDocuments).values({
    id: randomUUID(),
    name: "Product detail",
    contentTypeId: created.id,
    status: "draft",
    currentDocument: normalizeDetailPageDocument({
      schemaVersion: 1,
      id: randomUUID(),
      name: "Product detail",
      contentTypeId: created.id,
      contentTypeSlug: created.slug,
      status: "draft",
      titlePattern: "{{ title }}",
      settings: {
        template: "detail",
        layout: {},
      },
      blocks: [
        {
          id: "hero",
          type: "hero",
          data: {
            headline: "Product detail",
          },
        },
      ],
      bindings: [
        {
          id: "binding-title",
          blockId: "hero",
          propPath: "headline",
          source: {
            kind: "entry-meta",
            field: "title",
          },
        },
      ],
    }),
  });

  await expect(deleteContentType(created.id)).rejects.toThrow("content_type_has_detail_pages");
});

testIfDb("delete content type removes its auto content route reference", async () => {
  const originalContentRoutes = await getSetting("site.contentRoutes");
  const created = await createContentType({
    name: `Routed ${randomUUID()}`,
    slug: `routed-${randomUUID()}`,
    schema,
  });
  cleanupTypeIds.add(created.id);

  try {
    await setSetting("site.contentRoutes", [
      ...((Array.isArray(originalContentRoutes)
        ? originalContentRoutes
        : []) as ContentRouteSetting[]),
      {
        type: created.slug,
        listPath: `/${created.slug}`,
        detailPath: `/${created.slug}/:slug`,
        enabled: true,
      },
    ]);

    const removed = await deleteContentType(created.id);
    expect(removed?.id).toBe(created.id);
    cleanupTypeIds.delete(created.id);

    const nextContentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
    expect(
      Array.isArray(nextContentRoutes) &&
        nextContentRoutes.some((route) => route.type === created.slug)
    ).toBe(false);
  } finally {
    await setSetting("site.contentRoutes", originalContentRoutes);
  }
});
