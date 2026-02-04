import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { contentTaxonomies, contentTermAssignments, contentTerms } from "../../db/schema";

export type TaxonomyKind = "category" | "tag";

export type ContentTaxonomy = {
  id: string;
  typeId: string;
  name: string;
  slug: string;
  kind: TaxonomyKind;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentTerm = {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TaxonomyConfig = {
  categories?: boolean;
  tags?: boolean;
};

export type TaxonomyOverview = {
  taxonomies: {
    category?: ContentTaxonomy | null;
    tag?: ContentTaxonomy | null;
  };
  terms: {
    categories: ContentTerm[];
    tags: ContentTerm[];
  };
};

export type EntryTaxonomyAssignments = {
  category?: ContentTerm | null;
  tags: ContentTerm[];
};

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const resolveSlug = (name: string, slug?: string | null) => {
  const normalizedSlug = normalizeString(slug ?? "") ?? null;
  const candidate = normalizedSlug ? slugify(normalizedSlug) : slugify(name);
  return candidate || null;
};

const defaultTaxonomy = (kind: TaxonomyKind) => {
  if (kind === "category") {
    return { name: "Categories", slug: "categories" };
  }
  return { name: "Tags", slug: "tags" };
};

export async function listTaxonomies(typeId: string): Promise<ContentTaxonomy[]> {
  const rows = await db
    .select()
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, typeId))
    .orderBy(asc(contentTaxonomies.kind));
  return rows.map((row) => ({ ...row, kind: row.kind as TaxonomyKind }));
}

export async function getTaxonomyByKind(
  typeId: string,
  kind: TaxonomyKind
): Promise<ContentTaxonomy | null> {
  const [row] = await db
    .select()
    .from(contentTaxonomies)
    .where(and(eq(contentTaxonomies.typeId, typeId), eq(contentTaxonomies.kind, kind)));
  return row ? { ...row, kind: row.kind as TaxonomyKind } : null;
}

export async function setTaxonomyConfig(
  typeId: string,
  config: TaxonomyConfig
) {
  const existing = await listTaxonomies(typeId);
  const byKind = new Map(existing.map((item) => [item.kind, item]));

  const handleKind = async (kind: TaxonomyKind, enabled?: boolean) => {
    const current = byKind.get(kind);
    if (enabled === undefined) return;
    if (enabled && !current) {
      const defaults = defaultTaxonomy(kind);
      const [created] = await db
        .insert(contentTaxonomies)
        .values({
          typeId,
          kind,
          name: defaults.name,
          slug: defaults.slug,
        })
        .returning();
      if (created) byKind.set(kind, { ...created, kind });
      return;
    }
    if (!enabled && current) {
      await db
        .delete(contentTaxonomies)
        .where(eq(contentTaxonomies.id, current.id));
      byKind.delete(kind);
    }
  };

  await handleKind("category", config.categories);
  await handleKind("tag", config.tags);

  return listTaxonomies(typeId);
}

export async function listTerms(taxonomyId: string): Promise<ContentTerm[]> {
  return db
    .select()
    .from(contentTerms)
    .where(eq(contentTerms.taxonomyId, taxonomyId))
    .orderBy(asc(contentTerms.name));
}

export async function createTerm(
  taxonomyId: string,
  input: { name: string; slug?: string | null }
) {
  const name = normalizeString(input.name);
  if (!name) throw new Error("term_name_required");
  const slug = resolveSlug(name, input.slug);
  if (!slug) throw new Error("term_slug_invalid");

  const [row] = await db
    .insert(contentTerms)
    .values({
      taxonomyId,
      name,
      slug,
    })
    .returning();
  return row ?? null;
}

export async function updateTerm(
  id: string,
  input: { name?: string | null; slug?: string | null }
) {
  const name = input.name ? normalizeString(input.name) : null;
  if (input.name !== undefined && !name) {
    throw new Error("term_name_required");
  }
  const slug = name ? resolveSlug(name, input.slug) : resolveSlug("", input.slug);
  if (input.slug !== undefined && !slug) {
    throw new Error("term_slug_invalid");
  }

  const [row] = await db
    .update(contentTerms)
    .set({
      name: name ?? undefined,
      slug: slug ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(contentTerms.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTerm(id: string) {
  const [row] = await db
    .delete(contentTerms)
    .where(eq(contentTerms.id, id))
    .returning();
  return row ?? null;
}

export async function getTaxonomyOverview(typeId: string): Promise<TaxonomyOverview> {
  const taxonomies = await listTaxonomies(typeId);
  const category = taxonomies.find((item) => item.kind === "category") ?? null;
  const tag = taxonomies.find((item) => item.kind === "tag") ?? null;
  const taxonomyIds = taxonomies.map((item) => item.id);
  const terms =
    taxonomyIds.length > 0
      ? await db
          .select()
          .from(contentTerms)
          .where(inArray(contentTerms.taxonomyId, taxonomyIds))
          .orderBy(asc(contentTerms.name))
      : [];

  return {
    taxonomies: { category, tag },
    terms: {
      categories: category
        ? terms.filter((term) => term.taxonomyId === category.id)
        : [],
      tags: tag ? terms.filter((term) => term.taxonomyId === tag.id) : [],
    },
  };
}

export async function getEntryTaxonomies(
  entryId: string
): Promise<EntryTaxonomyAssignments> {
  const rows = await db
    .select({
      termId: contentTerms.id,
      termName: contentTerms.name,
      termSlug: contentTerms.slug,
      taxonomyId: contentTerms.taxonomyId,
      kind: contentTaxonomies.kind,
    })
    .from(contentTermAssignments)
    .innerJoin(contentTerms, eq(contentTermAssignments.termId, contentTerms.id))
    .innerJoin(
      contentTaxonomies,
      eq(contentTerms.taxonomyId, contentTaxonomies.id)
    )
    .where(eq(contentTermAssignments.entryId, entryId))
    .orderBy(asc(contentTerms.name));

  const tags: ContentTerm[] = [];
  let category: ContentTerm | null = null;

  for (const row of rows) {
    const term = {
      id: row.termId,
      taxonomyId: row.taxonomyId,
      name: row.termName,
      slug: row.termSlug,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    if (row.kind === "category") {
      if (!category) category = term;
    } else if (row.kind === "tag") {
      tags.push(term);
    }
  }

  return { category, tags };
}

export async function replaceEntryTaxonomies(
  entryId: string,
  typeId: string,
  input: { categoryId?: string | null; tagIds?: string[] }
): Promise<EntryTaxonomyAssignments> {
  const taxonomies = await listTaxonomies(typeId);
  const categoryTax = taxonomies.find((item) => item.kind === "category") ?? null;
  const tagTax = taxonomies.find((item) => item.kind === "tag") ?? null;

  if (input.categoryId !== undefined && !categoryTax) {
    throw new Error("taxonomy_category_disabled");
  }
  if (input.tagIds !== undefined && !tagTax) {
    throw new Error("taxonomy_tag_disabled");
  }

  const normalizedTagIds = Array.from(new Set(input.tagIds ?? [])).filter(Boolean);
  const termIds = [
    ...(input.categoryId ? [input.categoryId] : []),
    ...normalizedTagIds,
  ];

  const termRows =
    termIds.length > 0
      ? await db
          .select({
            id: contentTerms.id,
            taxonomyId: contentTerms.taxonomyId,
            name: contentTerms.name,
            slug: contentTerms.slug,
          })
          .from(contentTerms)
          .where(inArray(contentTerms.id, termIds))
      : [];

  if (termIds.length > termRows.length) {
    throw new Error("taxonomy_term_missing");
  }

  const categoryTerm = input.categoryId
    ? termRows.find((term) => term.id === input.categoryId) ?? null
    : null;
  if (categoryTerm && categoryTax && categoryTerm.taxonomyId !== categoryTax.id) {
    throw new Error("taxonomy_term_invalid");
  }

  if (normalizedTagIds.length > 0 && tagTax) {
    const tagTerms = termRows.filter((term) => normalizedTagIds.includes(term.id));
    const invalid = tagTerms.some((term) => term.taxonomyId !== tagTax.id);
    if (invalid) throw new Error("taxonomy_term_invalid");
  }

  return db.transaction(async (tx) => {
    const taxonomyIds = [categoryTax?.id, tagTax?.id].filter(Boolean) as string[];
    if (taxonomyIds.length > 0) {
      const termsToClear = await tx
        .select({ id: contentTerms.id })
        .from(contentTerms)
        .where(inArray(contentTerms.taxonomyId, taxonomyIds));
      const idsToClear = termsToClear.map((row) => row.id);
      if (idsToClear.length > 0) {
        await tx
          .delete(contentTermAssignments)
          .where(
            and(
              eq(contentTermAssignments.entryId, entryId),
              inArray(contentTermAssignments.termId, idsToClear)
            )
          );
      }
    }

    const assignments: Array<{ entryId: string; termId: string }> = [];
    if (input.categoryId) {
      assignments.push({ entryId, termId: input.categoryId });
    }
    normalizedTagIds.forEach((id) => assignments.push({ entryId, termId: id }));
    if (assignments.length > 0) {
      await tx.insert(contentTermAssignments).values(assignments);
    }

    const selectedTerms =
      assignments.length > 0
        ? await tx
            .select({
              id: contentTerms.id,
              taxonomyId: contentTerms.taxonomyId,
              name: contentTerms.name,
              slug: contentTerms.slug,
            })
            .from(contentTerms)
            .where(inArray(contentTerms.id, termIds))
        : [];

    const tags = tagTax
      ? selectedTerms
          .filter((term) => term.taxonomyId === tagTax.id)
          .map((term) => ({
            id: term.id,
            taxonomyId: term.taxonomyId,
            name: term.name,
            slug: term.slug,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          }))
      : [];

    const category =
      categoryTax && categoryTerm
        ? {
            id: categoryTerm.id,
            taxonomyId: categoryTerm.taxonomyId,
            name: categoryTerm.name,
            slug: categoryTerm.slug,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          }
        : null;

    return { category, tags };
  });
}

export async function resolveEntryTagsFromTaxonomy(
  entryId: string,
  typeId: string
) {
  const taxonomies = await listTaxonomies(typeId);
  const tagTax = taxonomies.find((item) => item.kind === "tag") ?? null;
  if (!tagTax) return [];

  const rows = await db
    .select({
      name: contentTerms.name,
    })
    .from(contentTermAssignments)
    .innerJoin(contentTerms, eq(contentTermAssignments.termId, contentTerms.id))
    .where(
      and(
        eq(contentTermAssignments.entryId, entryId),
        eq(contentTerms.taxonomyId, tagTax.id)
      )
    )
    .orderBy(asc(contentTerms.name));

  return rows.map((row) => row.name);
}
