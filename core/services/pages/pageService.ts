import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { pages } from "../../db/schema";
import { createRevisionTx, type RevisionData } from "./revisionService";

export type PageStatus = "draft" | "published";
export type PageData = Record<string, unknown>;

export type CreatePageInput = {
  title: string;
  slug: string;
  data: PageData;
};

export type UpdatePageInput = {
  title?: string;
  slug?: string;
  data?: PageData;
};

function toPublishedData(data: PageData): PageData {
  const blocks = Array.isArray(data.blocks)
    ? data.blocks.map((block) => {
        if (!block || typeof block !== "object") return block;
        const { editor: _editor, ...rest } = block as Record<string, unknown>;
        return rest;
      })
    : data.blocks;

  return { ...data, blocks };
}

export async function createPage(input: CreatePageInput) {
  const [page] = await db
    .insert(pages)
    .values({
      title: input.title,
      slug: input.slug,
      status: "draft",
      currentData: input.data,
    })
    .returning();
  return page;
}

export async function listPages() {
  return db.select().from(pages).orderBy(pages.updatedAt);
}

export async function getPage(id: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, id));
  return page ?? null;
}

export async function getPageBySlug(slug: string) {
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
  return page ?? null;
}

export async function updatePage(id: string, input: UpdatePageInput) {
  const [page] = await db
    .update(pages)
    .set({
      title: input.title,
      slug: input.slug,
      currentData: input.data,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, id))
    .returning();
  return page ?? null;
}

export async function publishPage(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select().from(pages).where(eq(pages.id, id));
    if (!page) throw new Error("page_not_found");

    await createRevisionTx(tx, id, page.currentData as RevisionData, userId);

    const publishedData = toPublishedData(page.currentData as PageData);
    const [updated] = await tx
      .update(pages)
      .set({
        publishedData,
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning();

    return updated ?? null;
  });
}

export async function unpublishPage(id: string) {
  const [page] = await db
    .update(pages)
    .set({
      status: "draft",
      publishedData: null,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, id))
    .returning();

  return page ?? null;
}
