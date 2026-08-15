import { asc, desc, eq, inArray } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { menuItems, pageRevisions, pages, themeRoutes, users } from "../../db/schema";
import {
  createOrReplaceAutosaveRevisionTx,
  createRevisionTx,
  normalizePageRevisionSnapshot,
  pruneRevisionsTx,
  type PageAutosaveRevisionResult,
  type RevisionData,
} from "./revisionService";
import {
  clearSiteCache,
  invalidateSiteCachePath,
  normalizeSitePath,
} from "../../site/cache/siteCache";
import { getSetting } from "../settings/settingsService";
import {
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  toPublishedPageDocumentV2,
  type PageDocumentV2,
} from "./pageDocumentV2";
import { createSecureRandomHexFragment } from "../security/secureRandom";
import { resolveEmailValue } from "../security/piiEmail";
import { emitIntegrationEventSafe } from "../integrations/integrationEventDispatch";
import { MAX_PAGE_REVISION_RETENTION, resolvePageRevisionRetention } from "./revisionRetention";

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
  const page = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [created] = await tx
        .insert(pages)
        .values({
          title: input.title,
          slug: input.slug,
          status: "draft",
          authorId: input.authorId,
          currentData: preparePageData(input.data, input.template),
        })
        .returning();
      return created ?? null;
    },
    { isolationLevel: "read committed" }
  );
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
  const page = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, id))
        .for("update");
      if (!existing) return null;
      const updates: Partial<typeof pages.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.slug !== undefined) updates.slug = input.slug;
      if (input.data !== undefined) updates.currentData = preparePageData(input.data);
      const [updated] = await tx.update(pages).set(updates).where(eq(pages.id, id)).returning();
      return updated ?? null;
    },
    { isolationLevel: "read committed" }
  );
  return page ? normalizePageRowForRead(page) : null;
}

export async function publishPage(id: string, userId: string, data?: PageData) {
  const updated = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx.select().from(pages).where(eq(pages.id, id)).for("update");
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
    },
    { isolationLevel: "read committed" }
  );

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

    emitIntegrationEventSafe("page.published", {
      type: "page",
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
    });
  }

  return updated;
}

export async function autosavePage(id: string, input: PageAutosaveInput, userId: string) {
  const result = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx.select().from(pages).where(eq(pages.id, id)).for("update");
      if (!page) throw new Error("page_not_found");
      const snapshot = buildRevisionSnapshot(page, {
        title: input.title ?? undefined,
        slug: input.slug ?? undefined,
        data: input.data === undefined ? undefined : preparePageData(input.data),
      });
      return createOrReplaceAutosaveRevisionTx(tx, id, snapshot, userId);
    },
    { isolationLevel: "read committed" }
  );

  return {
    ...result,
    savedAt: new Date().toISOString(),
  };
}

export async function unpublishPage(id: string) {
  const page = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, id))
        .for("update");
      if (!existing) return null;
      const [updated] = await tx
        .update(pages)
        .set({ status: "draft", publishedData: null, publishedAt: null, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning();
      return updated ?? null;
    },
    { isolationLevel: "read committed" }
  );

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
  const clone = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [page] = await tx.select().from(pages).where(eq(pages.id, id)).for("key share");
      if (!page) throw new Error("page_not_found");
      const suffix = createSecureRandomHexFragment(6);
      if (!suffix) throw new Error("secure_random_unavailable");
      const baseSlug = page.slug.replace(/\/$/, "");
      const [created] = await tx
        .insert(pages)
        .values({
          title: `${page.title} (copy)`,
          slug: `${baseSlug}-copy-${suffix}`,
          status: "draft",
          authorId: actorId ?? page.authorId ?? null,
          currentData: prepareStoredPageDataForRead(page.currentData),
        })
        .returning();
      return created ?? null;
    },
    { isolationLevel: "read committed" }
  );

  return clone ? normalizePageRowForRead(clone) : null;
}

export async function deletePage(id: string) {
  const page = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [existing] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, id))
        .for("update");
      if (!existing) return null;
      const [deleted] = await tx.delete(pages).where(eq(pages.id, id)).returning();
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );
  if (page) clearSiteCache();
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

export type PageLifecycleRevisionSnapshot = Readonly<{
  id: string;
  version: number;
  kind: "publish" | "autosave";
  data: RevisionData;
  createdAt: string;
  createdBy: string | null;
}>;

export type PageLifecycleNativeDesired = Readonly<{
  title: string;
  slug: string;
  status: "draft" | "published";
  authorId: string | null;
  currentData: PageData;
  publishedData: PageData | null;
  publishedAt: string | null;
  revisions: readonly PageLifecycleRevisionSnapshot[];
}>;

export type PageLifecycleNativeSnapshot = Readonly<{
  id: string;
  desired: PageLifecycleNativeDesired;
}>;

export type PageLifecycleAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: PageLifecycleNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: PageLifecycleNativeDesired;
      expectedCurrent: PageLifecycleNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: PageLifecycleNativeSnapshot;
      actorId: string;
    }>;

export type PageLifecycleAtomicMutationResult = Readonly<{
  id: string;
  snapshot: PageLifecycleNativeSnapshot | null;
}>;

type PageLifecycleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const normalizeIsoTimestamp = (value: unknown, code = "page_invalid"): string => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(code);
  return new Date(value).toISOString();
};

const normalizePageLifecycleRevision = (
  value: PageLifecycleRevisionSnapshot
): PageLifecycleRevisionSnapshot => {
  if (
    !value ||
    typeof value.id !== "string" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1 ||
    (value.kind !== "publish" && value.kind !== "autosave") ||
    (value.createdBy !== null && typeof value.createdBy !== "string")
  ) {
    throw new Error("page_invalid");
  }
  return {
    id: value.id,
    version: value.version,
    kind: value.kind,
    data: normalizePageRevisionSnapshot(value.data),
    createdAt: normalizeIsoTimestamp(value.createdAt),
    createdBy: value.createdBy,
  };
};

export const normalizePageLifecycleNativeDesired = (
  value: PageLifecycleNativeDesired
): PageLifecycleNativeDesired => {
  if (
    !value ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.slug !== "string" ||
    !value.slug.trim() ||
    (value.status !== "draft" && value.status !== "published") ||
    (value.authorId !== null && typeof value.authorId !== "string") ||
    !Array.isArray(value.revisions)
  ) {
    throw new Error("page_invalid");
  }
  const currentData = preparePageData(value.currentData);
  const publishedData =
    value.publishedData === null ? null : preparePublishedPageData(value.publishedData);
  if (
    (value.status === "draft" && (publishedData !== null || value.publishedAt !== null)) ||
    (value.status === "published" && (publishedData === null || value.publishedAt === null))
  ) {
    throw new Error("page_invalid");
  }
  const revisions = value.revisions
    .map(normalizePageLifecycleRevision)
    .sort((left, right) => right.version - left.version || left.id.localeCompare(right.id));
  if (
    revisions.length > MAX_PAGE_REVISION_RETENTION ||
    new Set(revisions.map((revision) => revision.id)).size !== revisions.length ||
    new Set(revisions.map((revision) => revision.version)).size !== revisions.length
  ) {
    throw new Error("page_revision_snapshot_too_large");
  }
  return {
    title: value.title.trim(),
    slug: value.slug.trim(),
    status: value.status,
    authorId: value.authorId,
    currentData,
    publishedData,
    publishedAt: value.publishedAt === null ? null : normalizeIsoTimestamp(value.publishedAt),
    revisions: Object.freeze(revisions),
  };
};

export const preparePageLifecycleNativeTargets = (
  input: Readonly<{
    id: string;
    desired: Readonly<{
      title: string;
      slug: string;
      status: "draft" | "published";
      data: PageData;
    }>;
    actorId: string;
    expectedCurrent: PageLifecycleNativeSnapshot | null;
    revisionId: string;
    publicationTimestamp: string;
  }>
): Readonly<{
  staged: PageLifecycleNativeSnapshot | null;
  complete: PageLifecycleNativeSnapshot;
}> => {
  const currentData = preparePageData(input.desired.data);
  const current = input.expectedCurrent?.desired;
  const stagedDesired = normalizePageLifecycleNativeDesired({
    title: input.desired.title,
    slug: input.desired.slug,
    status: "draft",
    authorId: current?.authorId ?? input.actorId,
    currentData,
    publishedData: null,
    publishedAt: null,
    revisions: current?.revisions ?? [],
  });
  if (input.desired.status === "draft") {
    return { staged: null, complete: { id: input.id, desired: stagedDesired } };
  }
  const nextVersion =
    Math.max(0, ...stagedDesired.revisions.map((revision) => revision.version)) + 1;
  const nextRevision: PageLifecycleRevisionSnapshot = {
    id: input.revisionId,
    version: nextVersion,
    kind: "publish",
    data: normalizePageRevisionSnapshot({
      title: stagedDesired.title,
      slug: stagedDesired.slug,
      data: stagedDesired.currentData,
    }),
    createdAt: input.publicationTimestamp,
    createdBy: input.actorId,
  };
  const retention = resolvePageRevisionRetention(stagedDesired.currentData);
  const publishIdsToKeep = new Set(
    [nextRevision, ...stagedDesired.revisions]
      .filter((revision) => revision.kind === "publish")
      .sort((left, right) => right.version - left.version || left.id.localeCompare(right.id))
      .slice(0, retention)
      .map((revision) => revision.id)
  );
  const revisions = [nextRevision, ...stagedDesired.revisions].filter(
    (revision) => revision.kind !== "publish" || publishIdsToKeep.has(revision.id)
  );
  const completeDesired = normalizePageLifecycleNativeDesired({
    ...stagedDesired,
    status: "published",
    publishedData: preparePublishedPageData(stagedDesired.currentData),
    publishedAt: input.publicationTimestamp,
    revisions,
  });
  return {
    staged: { id: input.id, desired: stagedDesired },
    complete: { id: input.id, desired: completeDesired },
  };
};

const rowsToPageLifecycleSnapshot = (
  page: PageRow,
  revisions: readonly (typeof pageRevisions.$inferSelect)[]
): PageLifecycleNativeSnapshot => ({
  id: page.id,
  desired: normalizePageLifecycleNativeDesired({
    title: page.title,
    slug: page.slug,
    status: page.status === "published" ? "published" : "draft",
    authorId: page.authorId,
    currentData: prepareStoredPageDataForRead(page.currentData),
    publishedData: page.publishedData ? preparePublishedPageData(page.publishedData) : null,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    revisions: revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      kind: revision.kind === "autosave" ? "autosave" : "publish",
      data: normalizePageRevisionSnapshot(revision.data),
      createdAt: revision.createdAt.toISOString(),
      createdBy: revision.createdBy,
    })),
  }),
});

const readPageLifecycleTx = async (
  tx: PageLifecycleTransaction,
  id: string,
  lock: boolean
): Promise<PageLifecycleNativeSnapshot | null> => {
  const pageSelect = tx.select().from(pages).where(eq(pages.id, id));
  const [page] = lock ? await pageSelect.for("update") : await pageSelect;
  if (!page) return null;
  const revisionSelect = tx
    .select()
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, id))
    .orderBy(desc(pageRevisions.version), asc(pageRevisions.id))
    .limit(MAX_PAGE_REVISION_RETENTION + 1);
  const revisions = lock ? await revisionSelect.for("update") : await revisionSelect;
  if (revisions.length > MAX_PAGE_REVISION_RETENTION) {
    throw new Error("page_revision_snapshot_too_large");
  }
  return rowsToPageLifecycleSnapshot(page, revisions);
};

const writePageRevisionsTx = async (
  tx: PageLifecycleTransaction,
  pageId: string,
  revisions: readonly PageLifecycleRevisionSnapshot[]
): Promise<void> => {
  await tx.delete(pageRevisions).where(eq(pageRevisions.pageId, pageId));
  if (revisions.length === 0) return;
  await tx.insert(pageRevisions).values(
    revisions.map((revision) => ({
      id: revision.id,
      pageId,
      version: revision.version,
      kind: revision.kind,
      data: revision.data,
      createdAt: new Date(revision.createdAt),
      createdBy: revision.createdBy,
    }))
  );
};

export const capturePageLifecycleNativeSnapshot = async (
  id: string
): Promise<PageLifecycleNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    return readPageLifecycleTx(tx, id, false);
  });

export async function mutatePageLifecycleAtomic(
  input: PageLifecycleAtomicMutation
): Promise<PageLifecycleAtomicMutationResult> {
  let invalidate = false;
  const result = await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    if (input.operation === "create") {
      const desired = normalizePageLifecycleNativeDesired(input.desired);
      await tx.insert(pages).values({
        id: input.id,
        title: desired.title,
        slug: desired.slug,
        status: desired.status,
        authorId: desired.authorId,
        currentData: desired.currentData,
        publishedData: desired.publishedData,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
      });
      await writePageRevisionsTx(tx, input.id, desired.revisions);
      const snapshot = await readPageLifecycleTx(tx, input.id, false);
      if (!snapshot) throw new Error("page_write_failed");
      return { id: input.id, snapshot };
    }
    const current = await readPageLifecycleTx(tx, input.id, true);
    if (
      !current ||
      input.expectedCurrent.id !== input.id ||
      !isDeepStrictEqual(current, input.expectedCurrent)
    ) {
      throw new Error("site_package_state_changed");
    }
    invalidate = true;
    if (input.operation === "delete") {
      const [menuReference] = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.pageId, input.id))
        .limit(1);
      const [themeReference] = await tx
        .select({ id: themeRoutes.id })
        .from(themeRoutes)
        .where(eq(themeRoutes.pageId, input.id))
        .limit(1);
      if (menuReference || themeReference) throw new Error("site_package_state_changed");
      const [deleted] = await tx
        .delete(pages)
        .where(eq(pages.id, input.id))
        .returning({ id: pages.id });
      if (!deleted) throw new Error("site_package_state_changed");
      return { id: input.id, snapshot: null };
    }
    const desired = normalizePageLifecycleNativeDesired(input.desired);
    const [updated] = await tx
      .update(pages)
      .set({
        title: desired.title,
        slug: desired.slug,
        status: desired.status,
        authorId: desired.authorId,
        currentData: desired.currentData,
        publishedData: desired.publishedData,
        publishedAt: desired.publishedAt ? new Date(desired.publishedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, input.id))
      .returning({ id: pages.id });
    if (!updated) throw new Error("site_package_state_changed");
    await writePageRevisionsTx(tx, input.id, desired.revisions);
    const snapshot = await readPageLifecycleTx(tx, input.id, false);
    if (!snapshot) throw new Error("site_package_state_changed");
    return { id: input.id, snapshot };
  });
  if (invalidate) clearSiteCache();
  return result;
}
