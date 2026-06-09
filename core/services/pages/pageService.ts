import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { pages, users } from "../../db/schema";
import {
  createOrReplaceAutosaveRevisionTx,
  createRevisionTx,
  pruneRevisionsTx,
  type PageAutosaveRevisionResult,
  type RevisionData,
} from "./revisionService";
import { invalidateSiteCachePath, normalizeSitePath } from "../../site/cache/siteCache";
import { getSetting } from "../settings/settingsService";
import {
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  toPublishedPageDocumentV2,
  type PageDocumentV2,
} from "./pageDocumentV2";
import { resolveEmailValue } from "../security/piiEmail";
import { resolvePageRevisionRetention } from "./revisionRetention";

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

export type PageAutosaveInput = {
  title?: string;
  slug?: string;
  data?: PageData;
};

export type PageAutosaveResult = PageAutosaveRevisionResult & {
  savedAt: string;
};

type PageRow = typeof pages.$inferSelect;

const toPageData = (document: PageDocumentV2): PageData => document as unknown as PageData;

const prepareStoredPageDataForRead = (data: unknown): PageData =>
  toPageData(normalizeStoredPageDocumentV2ForRead(data));

const preparePublishedPageData = (data: unknown): PageData =>
  toPageData(toPublishedPageDocumentV2(data));

const normalizePageRowForRead = <T extends PageRow>(page: T): T => ({
  ...page,
  currentData: prepareStoredPageDataForRead(page.currentData),
  publishedData: page.publishedData ? preparePublishedPageData(page.publishedData) : null,
});

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

function preparePageData(data: PageData, template?: string): PageData {
  const withTemplate = applyTemplate(data, template);
  return toPageData(normalizePageDocumentV2ForWrite(withTemplate));
}

const buildRevisionSnapshot = (
  page: Pick<typeof pages.$inferSelect, "title" | "slug" | "currentData">,
  overrides?: {
    title?: string | null;
    slug?: string | null;
    data?: PageData;
  }
) => ({
  title: overrides?.title ?? page.title,
  slug: overrides?.slug ?? page.slug,
  data: (overrides?.data ?? prepareStoredPageDataForRead(page.currentData)) as RevisionData,
});

export async function createPage(input: CreatePageInput) {
  const [page] = await db
    .insert(pages)
    .values({
      title: input.title,
      slug: input.slug,
      status: "draft",
      authorId: input.authorId,
      currentData: preparePageData(input.data, input.template),
    })
    .returning();
  return page ? normalizePageRowForRead(page) : page;
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
      authorEmailEncrypted: users.emailEncrypted,
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
          email:
            resolveEmailValue({
              emailEncrypted: row.authorEmailEncrypted,
              email: row.authorEmail,
            }) ?? "",
        }
      : null,
  }));
}

export async function getPage(id: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, id));
  return page ? normalizePageRowForRead(page) : null;
}

export async function getPageBySlug(slug: string) {
  const candidates = [
    slug,
    normalizeSitePath(slug),
    slug.startsWith("/") ? slug.slice(1) : `/${slug}`,
  ].filter((candidate, index, items) => candidate && items.indexOf(candidate) === index);

  for (const candidate of candidates) {
    const [page] = await db.select().from(pages).where(eq(pages.slug, candidate)).limit(1);
    if (page) return normalizePageRowForRead(page);
  }

  return null;
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
    updates.currentData = preparePageData(input.data);
  }

  const [page] = await db.update(pages).set(updates).where(eq(pages.id, id)).returning();
  return page ? normalizePageRowForRead(page) : null;
}

export async function publishPage(id: string, userId: string, data?: PageData) {
  const updated = await db.transaction(async (tx) => {
    const [page] = await tx.select().from(pages).where(eq(pages.id, id));
    if (!page) throw new Error("page_not_found");

    const nextData =
      data === undefined ? prepareStoredPageDataForRead(page.currentData) : preparePageData(data);

    const retention = resolvePageRevisionRetention(nextData as Record<string, unknown>);

    await createRevisionTx(
      tx,
      id,
      buildRevisionSnapshot(page, { data: nextData }),
      userId,
      "publish"
    );
    await pruneRevisionsTx(tx, id, retention);

    const publishedData = preparePublishedPageData(nextData);
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

    return updated ? normalizePageRowForRead(updated) : null;
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

export async function autosavePage(id: string, input: PageAutosaveInput, userId: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, id));
  if (!page) throw new Error("page_not_found");

  const snapshot = buildRevisionSnapshot(page, {
    title: input.title ?? undefined,
    slug: input.slug ?? undefined,
    data: input.data === undefined ? undefined : preparePageData(input.data),
  });

  const result = await db.transaction(async (tx) =>
    createOrReplaceAutosaveRevisionTx(tx, id, snapshot, userId)
  );

  return {
    ...result,
    savedAt: new Date().toISOString(),
  };
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

  return page ? normalizePageRowForRead(page) : null;
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
      currentData: prepareStoredPageDataForRead(page.currentData),
    })
    .returning();

  return clone ? normalizePageRowForRead(clone) : null;
}

export async function deletePage(id: string) {
  const [page] = await db.delete(pages).where(eq(pages.id, id)).returning();
  return page ? normalizePageRowForRead(page) : null;
}

type PublishedPageNavigationRow = {
  id: string;
  title: string;
  slug: string;
  publishedData: Record<string, unknown> | null;
};

export type NavigationPageSummary = {
  id: string;
  title: string;
  slug: string;
  showInNav: boolean;
};

const resolveShowInNav = (publishedData: unknown): boolean => {
  const document = normalizeStoredPageDocumentV2ForRead(publishedData);
  return document.settings.showInNav;
};

export async function listPublishedPagesForNavigation(): Promise<NavigationPageSummary[]> {
  const rows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      publishedData: pages.publishedData,
    })
    .from(pages)
    .where(eq(pages.status, "published" as PageStatus));

  const items = (rows as PublishedPageNavigationRow[])
    .filter((row) => Boolean(row.publishedData))
    .map((row) => ({
      id: row.id,
      title: (row.title ?? "").trim(),
      slug: normalizeSitePath(row.slug ?? "/"),
      showInNav: resolveShowInNav(row.publishedData),
    }))
    .filter((page) => page.showInNav);

  items.sort((a, b) => {
    const titleCompare = a.title.localeCompare(b.title);
    if (titleCompare !== 0) return titleCompare;
    const slugCompare = a.slug.localeCompare(b.slug);
    if (slugCompare !== 0) return slugCompare;
    return a.id.localeCompare(b.id);
  });

  return items;
}

export async function getPageSlugsByIds(pageIds: string[]) {
  const ids = Array.from(
    new Set(
      pageIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return new Map<string, string>();

  const rows = await db
    .select({ id: pages.id, slug: pages.slug })
    .from(pages)
    .where(inArray(pages.id, ids));

  return new Map(rows.map((row) => [row.id, normalizeSitePath(row.slug)]));
}
