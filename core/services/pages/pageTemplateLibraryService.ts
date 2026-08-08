import { desc, eq, ne, and } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { pageTemplates } from "../../db/schema";
import { clearSiteCache } from "../../site/cache/siteCache";
import type { PageDocumentV2 } from "./pageDocumentV2";
import {
  PageTemplateError,
  normalizePageTemplateCreateInput,
  normalizePageTemplateUpdateInput,
  normalizeStoredPageTemplateDocument,
  resolvePageTemplateCopyNaming,
  type PageTemplateStatus,
} from "./pageTemplateLibrarySchema";

export type PageTemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: PageTemplateStatus;
  sectionsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PageTemplateRecord = PageTemplateSummary & {
  document: PageDocumentV2;
};

type PageTemplateTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUniqueViolation = (error: unknown) =>
  Boolean(error) && typeof error === "object" && (error as { code?: unknown }).code === "23505";

const countStoredSections = (document: unknown) => {
  if (!document || typeof document !== "object" || Array.isArray(document)) return 0;
  const sections = (document as { sections?: unknown }).sections;
  return Array.isArray(sections) ? sections.length : 0;
};

const toSummary = (row: typeof pageTemplates.$inferSelect): PageTemplateSummary => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  category: row.category,
  status: row.status === "published" ? "published" : "draft",
  sectionsCount: countStoredSections(row.document),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toRecord = (row: typeof pageTemplates.$inferSelect): PageTemplateRecord => {
  const document = normalizeStoredPageTemplateDocument(row.document);
  return {
    ...toSummary(row),
    sectionsCount: document.sections.length,
    document,
  };
};

const findRowById = async (id: string) => {
  if (!uuidPattern.test(id)) return null;
  const [row] = await db.select().from(pageTemplates).where(eq(pageTemplates.id, id));
  return row ?? null;
};

const isSlugTakenTx = async (tx: PageTemplateTransaction, slug: string, excludeId?: string) => {
  const where = excludeId
    ? and(eq(pageTemplates.slug, slug), ne(pageTemplates.id, excludeId))
    : eq(pageTemplates.slug, slug);
  const [row] = await tx.select({ id: pageTemplates.id }).from(pageTemplates).where(where).limit(1);
  return Boolean(row);
};

const assertSlugAvailableTx = async (
  tx: PageTemplateTransaction,
  slug: string,
  excludeId?: string
) => {
  if (await isSlugTakenTx(tx, slug, excludeId)) {
    throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
  }
};

export async function listPageTemplates(): Promise<PageTemplateSummary[]> {
  const rows = await db.select().from(pageTemplates).orderBy(desc(pageTemplates.updatedAt));
  return rows.map(toSummary);
}

export async function getPageTemplate(id: string): Promise<PageTemplateRecord | null> {
  const row = await findRowById(id);
  if (!row) return null;
  return toRecord(row);
}

export async function createPageTemplate(rawInput: unknown): Promise<PageTemplateRecord> {
  const input = normalizePageTemplateCreateInput(rawInput);
  try {
    const row = await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await assertSlugAvailableTx(tx, input.slug);
        const now = new Date();
        const [created] = await tx
          .insert(pageTemplates)
          .values({ ...input, createdAt: now, updatedAt: now })
          .returning();
        return created;
      },
      { isolationLevel: "read committed" }
    );
    if (!row) throw new PageTemplateError("page_template_invalid", "Template was not created.");
    return toRecord(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
    }
    throw error;
  }
}

export async function updatePageTemplate(
  id: string,
  rawUpdate: unknown
): Promise<PageTemplateRecord | null> {
  const input = normalizePageTemplateUpdateInput(rawUpdate);
  if (!uuidPattern.test(id)) return null;

  try {
    const row = await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        const [existing] = await tx
          .select()
          .from(pageTemplates)
          .where(eq(pageTemplates.id, id))
          .for("update");
        if (!existing) return null;
        if (input.slug !== undefined) await assertSlugAvailableTx(tx, input.slug, id);
        const update: Partial<typeof pageTemplates.$inferInsert> = { updatedAt: new Date() };
        if (input.name !== undefined) update.name = input.name;
        if (input.slug !== undefined) update.slug = input.slug;
        if (input.description !== undefined) update.description = input.description;
        if (input.category !== undefined) update.category = input.category;
        if (input.status !== undefined) update.status = input.status;
        if (input.document !== undefined) update.document = input.document;
        const [updated] = await tx
          .update(pageTemplates)
          .set(update)
          .where(eq(pageTemplates.id, id))
          .returning();
        return updated ?? null;
      },
      { isolationLevel: "read committed" }
    );
    if (!row) return null;
    clearSiteCache();
    return toRecord(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
    }
    throw error;
  }
}

export async function deletePageTemplate(id: string): Promise<PageTemplateSummary | null> {
  if (!uuidPattern.test(id)) return null;
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [current] = await tx
        .select({ id: pageTemplates.id })
        .from(pageTemplates)
        .where(eq(pageTemplates.id, id))
        .for("update");
      if (!current) return null;
      const [deleted] = await tx.delete(pageTemplates).where(eq(pageTemplates.id, id)).returning();
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );
  if (!row) return null;
  clearSiteCache();
  return toSummary(row);
}

export async function duplicatePageTemplate(id: string): Promise<PageTemplateRecord> {
  if (!uuidPattern.test(id)) {
    throw new PageTemplateError("page_template_not_found", "Template not found.");
  }
  try {
    const row = await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        const [source] = await tx
          .select()
          .from(pageTemplates)
          .where(eq(pageTemplates.id, id))
          .for("key share");
        if (!source) {
          throw new PageTemplateError("page_template_not_found", "Template not found.");
        }
        const document = normalizeStoredPageTemplateDocument(source.document);
        const takenSlugs = new Set(
          (await tx.select({ slug: pageTemplates.slug }).from(pageTemplates)).map(
            (candidate) => candidate.slug
          )
        );
        const naming = resolvePageTemplateCopyNaming(
          { name: source.name, slug: source.slug },
          (slug) => takenSlugs.has(slug)
        );
        const input = normalizePageTemplateCreateInput({
          name: naming.name,
          slug: naming.slug,
          description: source.description,
          category: source.category,
          status: "draft",
          document,
        });
        await assertSlugAvailableTx(tx, input.slug);
        const now = new Date();
        const [created] = await tx
          .insert(pageTemplates)
          .values({ ...input, createdAt: now, updatedAt: now })
          .returning();
        return created;
      },
      { isolationLevel: "read committed" }
    );
    if (!row) throw new PageTemplateError("page_template_invalid", "Template was not created.");
    return toRecord(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
    }
    throw error;
  }
}

export type PageTemplatePreviewModel = {
  id: string;
  name: string;
  slug: string;
  status: PageTemplateStatus;
  sectionsCount: number;
  document: PageDocumentV2;
};

export async function getPageTemplatePreviewModel(id: string): Promise<PageTemplatePreviewModel> {
  const row = await findRowById(id);
  if (!row) {
    throw new PageTemplateError("page_template_not_found", "Template not found.");
  }
  const record = toRecord(row);
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    status: record.status,
    sectionsCount: record.sectionsCount,
    document: record.document,
  };
}

export type PageTemplateNativeDesired = ReturnType<typeof normalizePageTemplateCreateInput>;

export type PageTemplateNativeSnapshot = Readonly<{
  id: string;
  desired: PageTemplateNativeDesired;
}>;

export type PageTemplateAtomicMutation =
  | Readonly<{
      operation: "create";
      id: string;
      desired: PageTemplateNativeDesired;
      actorId: string;
    }>
  | Readonly<{
      operation: "replace";
      id: string;
      desired: PageTemplateNativeDesired;
      expectedCurrent: PageTemplateNativeSnapshot;
      actorId: string;
    }>
  | Readonly<{
      operation: "delete";
      id: string;
      expectedCurrent: PageTemplateNativeSnapshot;
      actorId: string;
    }>;

export type PageTemplateAtomicMutationResult = Readonly<{
  id: string;
  snapshot: PageTemplateNativeSnapshot | null;
}>;

const rowToNativeSnapshot = (
  row: typeof pageTemplates.$inferSelect
): PageTemplateNativeSnapshot => ({
  id: row.id,
  desired: normalizePageTemplateCreateInput({
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    status: row.status,
    document: row.document,
  }),
});

export const capturePageTemplateNativeSnapshot = async (
  id: string
): Promise<PageTemplateNativeSnapshot | null> =>
  db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const [row] = await tx.select().from(pageTemplates).where(eq(pageTemplates.id, id));
    return row ? rowToNativeSnapshot(row) : null;
  });

export async function mutatePageTemplateAtomic(
  input: PageTemplateAtomicMutation
): Promise<PageTemplateAtomicMutationResult> {
  let invalidate = false;
  try {
    const result = await db.transaction(async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const desired =
        input.operation === "delete" ? null : normalizePageTemplateCreateInput(input.desired);
      if (input.operation === "create") {
        const [conflict] = await tx
          .select({ id: pageTemplates.id })
          .from(pageTemplates)
          .where(eq(pageTemplates.slug, desired!.slug))
          .limit(1);
        if (conflict) {
          throw new PageTemplateError(
            "page_template_slug_conflict",
            "Template slug already exists."
          );
        }
        const now = new Date();
        const [row] = await tx
          .insert(pageTemplates)
          .values({ id: input.id, ...desired!, createdAt: now, updatedAt: now })
          .returning();
        if (!row) throw new PageTemplateError("page_template_invalid", "Template was not created.");
        return { id: row.id, snapshot: rowToNativeSnapshot(row) };
      }

      const [currentRow] = await tx
        .select()
        .from(pageTemplates)
        .where(eq(pageTemplates.id, input.id))
        .for("update");
      if (!currentRow) throw new Error("site_package_state_changed");
      const current = rowToNativeSnapshot(currentRow);
      if (
        input.expectedCurrent.id !== input.id ||
        !isDeepStrictEqual(current, input.expectedCurrent)
      ) {
        throw new Error("site_package_state_changed");
      }
      invalidate = true;
      if (input.operation === "delete") {
        const [deleted] = await tx
          .delete(pageTemplates)
          .where(eq(pageTemplates.id, input.id))
          .returning({ id: pageTemplates.id });
        if (!deleted) throw new Error("site_package_state_changed");
        return { id: input.id, snapshot: null };
      }
      if (desired!.slug !== current.desired.slug) {
        const [conflict] = await tx
          .select({ id: pageTemplates.id })
          .from(pageTemplates)
          .where(and(eq(pageTemplates.slug, desired!.slug), ne(pageTemplates.id, input.id)))
          .limit(1);
        if (conflict) {
          throw new PageTemplateError(
            "page_template_slug_conflict",
            "Template slug already exists."
          );
        }
      }
      const [row] = await tx
        .update(pageTemplates)
        .set({ ...desired!, updatedAt: new Date() })
        .where(eq(pageTemplates.id, input.id))
        .returning();
      if (!row) throw new Error("site_package_state_changed");
      return { id: row.id, snapshot: rowToNativeSnapshot(row) };
    });
    if (invalidate) clearSiteCache();
    return result;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PageTemplateError("page_template_slug_conflict", "Template slug already exists.");
    }
    throw error;
  }
}
