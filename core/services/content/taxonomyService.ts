import { and, asc, eq, inArray, or } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import {
  contentEntries,
  contentTaxonomies,
  contentTermAssignments,
  contentTerms,
  contentTypes,
} from "../../db/schema";

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

export type TaxonomyExecutor = Pick<typeof db, "select" | "insert" | "delete">;

type TaxonomyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type PreparedTaxonomyTerm = Readonly<Pick<ContentTerm, "id" | "taxonomyId" | "name" | "slug">>;

export type EntryTaxonomyPlan = Readonly<{
  entryId: string;
  typeId: string;
  taxonomyIdsToClear: readonly string[];
  category: PreparedTaxonomyTerm | null;
  tags: readonly PreparedTaxonomyTerm[];
  assignmentTermIds: readonly string[];
  resolvedTagNames: readonly string[];
}>;

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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveContentTypeIdWithExecutor = async (executor: TaxonomyExecutor, identifier: string) => {
  const normalized = normalizeString(identifier);
  if (!normalized) return null;

  const [row] = await executor
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      uuidPattern.test(normalized)
        ? or(eq(contentTypes.id, normalized), eq(contentTypes.slug, normalized))
        : eq(contentTypes.slug, normalized)
    )
    .limit(1);

  if (row) return row.id;
  return uuidPattern.test(normalized) ? normalized : null;
};

const resolveContentTypeId = (identifier: string) =>
  resolveContentTypeIdWithExecutor(db, identifier);

const lockContentTypeTx = async (tx: TaxonomyTransaction, typeId: string): Promise<void> => {
  const [row] = await tx
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(eq(contentTypes.id, typeId))
    .for("key share");
  if (!row) throw new Error("taxonomy_not_found");
};

const lockTaxonomyContentTypeTx = async (
  tx: TaxonomyTransaction,
  taxonomyId: string
): Promise<string> => {
  const [observed] = await tx
    .select({ typeId: contentTaxonomies.typeId })
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.id, taxonomyId));
  if (!observed) throw new Error("taxonomy_not_found");
  await lockContentTypeTx(tx, observed.typeId);
  const [taxonomy] = await tx
    .select({ id: contentTaxonomies.id, typeId: contentTaxonomies.typeId })
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.id, taxonomyId))
    .for("key share");
  if (!taxonomy || taxonomy.typeId !== observed.typeId) throw new Error("taxonomy_not_found");
  return taxonomy.typeId;
};

const defaultTaxonomy = (kind: TaxonomyKind) => {
  if (kind === "category") {
    return { name: "Categories", slug: "categories" };
  }
  return { name: "Tags", slug: "tags" };
};

const listTaxonomiesWithExecutor = async (
  executor: TaxonomyExecutor,
  typeIdOrSlug: string
): Promise<ContentTaxonomy[]> => {
  const resolvedTypeId = await resolveContentTypeIdWithExecutor(executor, typeIdOrSlug);
  if (!resolvedTypeId) return [];

  const rows = await executor
    .select({
      id: contentTaxonomies.id,
      typeId: contentTaxonomies.typeId,
      name: contentTaxonomies.name,
      slug: contentTaxonomies.slug,
      kind: contentTaxonomies.kind,
      createdAt: contentTaxonomies.createdAt,
      updatedAt: contentTaxonomies.updatedAt,
    })
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, resolvedTypeId))
    .orderBy(asc(contentTaxonomies.kind));
  return rows.map((row) => ({ ...row, kind: row.kind as TaxonomyKind }));
};

export async function listTaxonomies(typeIdOrSlug: string): Promise<ContentTaxonomy[]> {
  return listTaxonomiesWithExecutor(db, typeIdOrSlug);
}

export async function getTaxonomyByKind(
  typeId: string,
  kind: TaxonomyKind
): Promise<ContentTaxonomy | null> {
  const resolvedTypeId = await resolveContentTypeId(typeId);
  if (!resolvedTypeId) return null;

  const [row] = await db
    .select()
    .from(contentTaxonomies)
    .where(and(eq(contentTaxonomies.typeId, resolvedTypeId), eq(contentTaxonomies.kind, kind)));
  return row ? { ...row, kind: row.kind as TaxonomyKind } : null;
}

export async function setTaxonomyConfig(typeId: string, config: TaxonomyConfig) {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const resolvedTypeId = await resolveContentTypeIdWithExecutor(tx, typeId);
      if (!resolvedTypeId) throw new Error("taxonomy_not_found");
      await lockContentTypeTx(tx, resolvedTypeId);
      const existing = await listTaxonomiesWithExecutor(tx, resolvedTypeId);
      const byKind = new Map(existing.map((item) => [item.kind, item]));
      const handleKind = async (kind: TaxonomyKind, enabled?: boolean) => {
        const current = byKind.get(kind);
        if (enabled === undefined) return;
        if (enabled && !current) {
          const defaults = defaultTaxonomy(kind);
          const [created] = await tx
            .insert(contentTaxonomies)
            .values({ typeId: resolvedTypeId, kind, name: defaults.name, slug: defaults.slug })
            .returning();
          if (created) byKind.set(kind, { ...created, kind });
        } else if (!enabled && current) {
          await tx.delete(contentTaxonomies).where(eq(contentTaxonomies.id, current.id));
          byKind.delete(kind);
        }
      };
      await handleKind("category", config.categories);
      await handleKind("tag", config.tags);
      return listTaxonomiesWithExecutor(tx, resolvedTypeId);
    },
    { isolationLevel: "read committed" }
  );
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
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const name = normalizeString(input.name);
      if (!name) throw new Error("term_name_required");
      const slug = resolveSlug(name, input.slug);
      if (!slug) throw new Error("term_slug_invalid");
      await lockTaxonomyContentTypeTx(tx, taxonomyId);
      const [row] = await tx.insert(contentTerms).values({ taxonomyId, name, slug }).returning();
      return row ?? null;
    },
    { isolationLevel: "read committed" }
  );
}

export async function updateTerm(
  id: string,
  input: { name?: string | null; slug?: string | null }
) {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const name = input.name ? normalizeString(input.name) : null;
      if (input.name !== undefined && !name) throw new Error("term_name_required");
      const slug = name ? resolveSlug(name, input.slug) : resolveSlug("", input.slug);
      if (input.slug !== undefined && !slug) throw new Error("term_slug_invalid");
      const [observed] = await tx
        .select({ taxonomyId: contentTerms.taxonomyId })
        .from(contentTerms)
        .where(eq(contentTerms.id, id));
      if (!observed) return null;
      await lockTaxonomyContentTypeTx(tx, observed.taxonomyId);
      const [locked] = await tx
        .select({ taxonomyId: contentTerms.taxonomyId })
        .from(contentTerms)
        .where(eq(contentTerms.id, id))
        .for("update");
      if (!locked || locked.taxonomyId !== observed.taxonomyId) return null;
      const [row] = await tx
        .update(contentTerms)
        .set({ name: name ?? undefined, slug: slug ?? undefined, updatedAt: new Date() })
        .where(eq(contentTerms.id, id))
        .returning();
      return row ?? null;
    },
    { isolationLevel: "read committed" }
  );
}

export async function deleteTerm(id: string) {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [row] = await tx.delete(contentTerms).where(eq(contentTerms.id, id)).returning();
      return row ?? null;
    },
    { isolationLevel: "read committed" }
  );
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
      categories: category ? terms.filter((term) => term.taxonomyId === category.id) : [],
      tags: tag ? terms.filter((term) => term.taxonomyId === tag.id) : [],
    },
  };
}

export async function getEntryTaxonomies(entryId: string): Promise<EntryTaxonomyAssignments> {
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
    .innerJoin(contentTaxonomies, eq(contentTerms.taxonomyId, contentTaxonomies.id))
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

const toPreparedTerm = (term: PreparedTaxonomyTerm): PreparedTaxonomyTerm =>
  Object.freeze({
    id: term.id,
    taxonomyId: term.taxonomyId,
    name: term.name,
    slug: term.slug,
  });

export async function prepareEntryTaxonomyMutation(
  executor: TaxonomyExecutor,
  entryId: string,
  typeIdOrSlug: string,
  input: { categoryId?: string | null; tagIds?: string[] }
): Promise<EntryTaxonomyPlan> {
  const taxonomies = await listTaxonomiesWithExecutor(executor, typeIdOrSlug);
  const categoryTax = taxonomies.find((item) => item.kind === "category") ?? null;
  const tagTax = taxonomies.find((item) => item.kind === "tag") ?? null;

  if (input.categoryId !== undefined && !categoryTax) {
    throw new Error("taxonomy_category_disabled");
  }
  if (input.tagIds !== undefined && !tagTax) {
    throw new Error("taxonomy_tag_disabled");
  }

  const categoryId =
    input.categoryId === null || input.categoryId === undefined
      ? null
      : normalizeString(input.categoryId);
  const normalizedTagIds = (input.tagIds ?? []).map((id) => normalizeString(id));
  if (
    (input.categoryId !== null &&
      input.categoryId !== undefined &&
      (!categoryId || !uuidPattern.test(categoryId))) ||
    normalizedTagIds.some((id) => !id || !uuidPattern.test(id))
  ) {
    throw new Error("taxonomy_term_missing");
  }

  const tagIds = Array.from(new Set(normalizedTagIds.filter((id): id is string => id !== null)));
  const termIds = Array.from(new Set([...(categoryId ? [categoryId] : []), ...tagIds]));
  const termRows =
    termIds.length > 0
      ? await executor
          .select({
            id: contentTerms.id,
            taxonomyId: contentTerms.taxonomyId,
            name: contentTerms.name,
            slug: contentTerms.slug,
          })
          .from(contentTerms)
          .where(inArray(contentTerms.id, termIds))
          .orderBy(asc(contentTerms.name), asc(contentTerms.id))
      : [];

  if (termRows.length !== termIds.length) {
    throw new Error("taxonomy_term_missing");
  }

  const categoryTerm = categoryId
    ? (termRows.find((term) => term.id === categoryId) ?? null)
    : null;
  if (categoryTerm && categoryTerm.taxonomyId !== categoryTax?.id) {
    throw new Error("taxonomy_term_invalid");
  }

  const tagTerms = termRows.filter((term) => tagIds.includes(term.id));
  if (tagTerms.some((term) => term.taxonomyId !== tagTax?.id)) {
    throw new Error("taxonomy_term_invalid");
  }

  const resolvedTypeId =
    taxonomies[0]?.typeId ?? (await resolveContentTypeIdWithExecutor(executor, typeIdOrSlug));
  if (!resolvedTypeId) {
    throw new Error("taxonomy_not_found");
  }

  const category = categoryTerm ? toPreparedTerm(categoryTerm) : null;
  const tags = Object.freeze(tagTerms.map(toPreparedTerm));
  const taxonomyIdsToClear = Object.freeze(
    taxonomies
      .filter((taxonomy) => taxonomy.kind === "category" || taxonomy.kind === "tag")
      .map((taxonomy) => taxonomy.id)
  );
  const assignmentTermIds = Object.freeze([
    ...(category ? [category.id] : []),
    ...tags.map((tag) => tag.id),
  ]);
  const resolvedTagNames = Object.freeze(tags.map((tag) => tag.name));

  return Object.freeze({
    entryId,
    typeId: resolvedTypeId,
    taxonomyIdsToClear,
    category,
    tags,
    assignmentTermIds,
    resolvedTagNames,
  });
}

export async function applyEntryTaxonomyMutation(
  executor: TaxonomyExecutor,
  plan: EntryTaxonomyPlan
): Promise<EntryTaxonomyAssignments> {
  if (plan.taxonomyIdsToClear.length > 0) {
    const termsToClear = await executor
      .select({ id: contentTerms.id })
      .from(contentTerms)
      .where(inArray(contentTerms.taxonomyId, plan.taxonomyIdsToClear));
    const termIdsToClear = termsToClear.map((term) => term.id);
    if (termIdsToClear.length > 0) {
      await executor
        .delete(contentTermAssignments)
        .where(
          and(
            eq(contentTermAssignments.entryId, plan.entryId),
            inArray(contentTermAssignments.termId, termIdsToClear)
          )
        );
    }
  }

  if (plan.assignmentTermIds.length > 0) {
    await executor.insert(contentTermAssignments).values(
      plan.assignmentTermIds.map((termId) => ({
        entryId: plan.entryId,
        termId,
      }))
    );
  }

  return {
    category: plan.category
      ? {
          ...plan.category,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        }
      : null,
    tags: plan.tags.map((term) => ({
      ...term,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
  };
}

export async function replaceEntryTaxonomies(
  entryId: string,
  typeIdOrSlug: string,
  input: { categoryId?: string | null; tagIds?: string[] }
): Promise<EntryTaxonomyAssignments> {
  return db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      if (input.categoryId === undefined && input.tagIds === undefined) {
        const resolvedTypeId = await resolveContentTypeIdWithExecutor(tx, typeIdOrSlug);
        if (!resolvedTypeId) {
          return { category: null, tags: [] };
        }
      }

      const plan = await prepareEntryTaxonomyMutation(tx, entryId, typeIdOrSlug, input);
      await lockContentTypeTx(tx, plan.typeId);
      const [entry] = await tx
        .select({ id: contentEntries.id, typeId: contentEntries.typeId })
        .from(contentEntries)
        .where(eq(contentEntries.id, entryId))
        .for("key share");
      if (!entry || entry.typeId !== plan.typeId) throw new Error("taxonomy_not_found");
      if (plan.assignmentTermIds.length > 0) {
        const terms = await tx
          .select({ id: contentTerms.id })
          .from(contentTerms)
          .where(inArray(contentTerms.id, [...plan.assignmentTermIds]))
          .orderBy(asc(contentTerms.id))
          .for("key share");
        const expected = [...plan.assignmentTermIds].sort();
        if (
          terms.length !== expected.length ||
          terms.some((term, index) => term.id !== expected[index])
        ) {
          throw new Error("taxonomy_term_missing");
        }
      }
      return applyEntryTaxonomyMutation(tx, plan);
    },
    { isolationLevel: "read committed" }
  );
}

export async function resolveEntryTagsFromTaxonomy(entryId: string, typeId: string) {
  const taxonomies = await listTaxonomies(typeId);
  const tagTax = taxonomies.find((item) => item.kind === "tag") ?? null;
  if (!tagTax) return [];

  const rows = await db
    .select({
      name: contentTerms.name,
    })
    .from(contentTermAssignments)
    .innerJoin(contentTerms, eq(contentTermAssignments.termId, contentTerms.id))
    .where(and(eq(contentTermAssignments.entryId, entryId), eq(contentTerms.taxonomyId, tagTax.id)))
    .orderBy(asc(contentTerms.name));

  return rows.map((row) => row.name);
}
