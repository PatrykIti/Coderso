import { desc, eq, ne, and } from "drizzle-orm";

import { db } from "../../db/client";
import { pageTemplates } from "../../db/schema";
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

const isSlugTakenInDb = async (slug: string, excludeId?: string) => {
  const where = excludeId
    ? and(eq(pageTemplates.slug, slug), ne(pageTemplates.id, excludeId))
    : eq(pageTemplates.slug, slug);
  const [row] = await db.select({ id: pageTemplates.id }).from(pageTemplates).where(where).limit(1);
  return Boolean(row);
};

const assertSlugAvailable = async (slug: string, excludeId?: string) => {
  if (await isSlugTakenInDb(slug, excludeId)) {
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
  await assertSlugAvailable(input.slug);
  try {
    const now = new Date();
    const [row] = await db
      .insert(pageTemplates)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        status: input.status,
        document: input.document,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
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
  const existing = await findRowById(id);
  if (!existing) return null;
  if (input.slug !== undefined) {
    await assertSlugAvailable(input.slug, id);
  }

  const update: Partial<typeof pageTemplates.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) update.name = input.name;
  if (input.slug !== undefined) update.slug = input.slug;
  if (input.description !== undefined) update.description = input.description;
  if (input.category !== undefined) update.category = input.category;
  if (input.status !== undefined) update.status = input.status;
  if (input.document !== undefined) update.document = input.document;

  try {
    const [row] = await db
      .update(pageTemplates)
      .set(update)
      .where(eq(pageTemplates.id, id))
      .returning();
    if (!row) return null;
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
  const [row] = await db.delete(pageTemplates).where(eq(pageTemplates.id, id)).returning();
  if (!row) return null;
  return toSummary(row);
}

export async function duplicatePageTemplate(id: string): Promise<PageTemplateRecord> {
  const source = await findRowById(id);
  if (!source) {
    throw new PageTemplateError("page_template_not_found", "Template not found.");
  }
  // Server-owned copy: the stored document must be readable before copying.
  const document = normalizeStoredPageTemplateDocument(source.document);
  const takenSlugs = new Set(
    (await db.select({ slug: pageTemplates.slug }).from(pageTemplates)).map((row) => row.slug)
  );
  const naming = resolvePageTemplateCopyNaming({ name: source.name, slug: source.slug }, (slug) =>
    takenSlugs.has(slug)
  );
  return createPageTemplate({
    name: naming.name,
    slug: naming.slug,
    description: source.description,
    category: source.category,
    status: "draft",
    document,
  });
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
