import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { pages, users } from "../../db/schema";
import { createRevisionTx, type RevisionData } from "./revisionService";
import { invalidateSiteCachePath, normalizeSitePath } from "../../site/cache/siteCache";
import { getSetting } from "../settings/settingsService";

export type PageStatus = "draft" | "published" | "scheduled" | "archived";
export type PageData = Record<string, unknown>;

export type PageAuthor = {
  id: string;
  name: string | null;
  email: string;
};

export type PageSummary = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  updatedAt: Date;
  author: PageAuthor | null;
};

export type CreatePageInput = {
  title: string;
  slug: string;
  data: PageData;
  authorId?: string;
  template?: string;
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

function applyTemplate(data: PageData, template?: string): PageData {
  if (!template) return data;
  const settings = (data.settings ?? {}) as Record<string, unknown>;
  return {
    ...data,
    settings: {
      ...settings,
      template,
    },
  };
}

export async function createPage(input: CreatePageInput) {
  const [page] = await db
    .insert(pages)
    .values({
      title: input.title,
      slug: input.slug,
      status: "draft",
      authorId: input.authorId,
      currentData: applyTemplate(input.data, input.template),
    })
    .returning();
  return page;
}

export async function listPages(): Promise<PageSummary[]> {
  const rows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      updatedAt: pages.updatedAt,
      authorId: pages.authorId,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(pages)
    .leftJoin(users, eq(pages.authorId, users.id))
    .orderBy(desc(pages.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as PageStatus,
    updatedAt: row.updatedAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName ?? null,
          email: row.authorEmail ?? "",
        }
      : null,
  }));
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
  const updates: Partial<typeof pages.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof input.title !== "undefined") {
    updates.title = input.title;
  }
  if (typeof input.slug !== "undefined") {
    updates.slug = input.slug;
  }
  if (typeof input.data !== "undefined") {
    updates.currentData = input.data;
  }

  const [page] = await db
    .update(pages)
    .set(updates)
    .where(eq(pages.id, id))
    .returning();
  return page ?? null;
}

export async function publishPage(id: string, userId: string, data?: PageData) {
  const updated = await db.transaction(async (tx) => {
    const [page] = await tx.select().from(pages).where(eq(pages.id, id));
    if (!page) throw new Error("page_not_found");

    const nextData = (data ?? page.currentData) as PageData;

    await createRevisionTx(tx, id, nextData as RevisionData, userId);

    const publishedData = toPublishedData(nextData);
    const [updated] = await tx
      .update(pages)
      .set({
        currentData: nextData,
        publishedData,
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning();

    return updated ?? null;
  });

  if (updated) {
    const normalizedSlug = normalizeSitePath(updated.slug);
    invalidateSiteCachePath(normalizedSlug);

    const homepageId = await getSetting("site.homepageId");
    if (homepageId && homepageId === updated.id) {
      invalidateSiteCachePath("/");
    }

    const notFoundPageId = await getSetting("site.notFoundPageId");
    if (notFoundPageId && notFoundPageId === updated.id) {
      invalidateSiteCachePath("/404");
    }
  }

  return updated;
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

  if (page) {
    const normalizedSlug = normalizeSitePath(page.slug);
    invalidateSiteCachePath(normalizedSlug);

    const homepageId = await getSetting("site.homepageId");
    if (homepageId && homepageId === page.id) {
      invalidateSiteCachePath("/");
    }

    const notFoundPageId = await getSetting("site.notFoundPageId");
    if (notFoundPageId && notFoundPageId === page.id) {
      invalidateSiteCachePath("/404");
    }
  }

  return page ?? null;
}

export async function duplicatePage(id: string, actorId?: string) {
  const page = await getPage(id);
  if (!page) throw new Error("page_not_found");

  const suffix = Math.random().toString(36).slice(2, 8);
  const baseSlug = page.slug.replace(/\/$/, "");
  const clonedSlug = `${baseSlug}-copy-${suffix}`;

  const [clone] = await db
    .insert(pages)
    .values({
      title: `${page.title} (copy)`,
      slug: clonedSlug,
      status: "draft",
      authorId: actorId ?? page.authorId ?? null,
      currentData: page.currentData,
    })
    .returning();

  return clone ?? null;
}

export async function deletePage(id: string) {
  const [page] = await db
    .delete(pages)
    .where(eq(pages.id, id))
    .returning();
  return page ?? null;
}
