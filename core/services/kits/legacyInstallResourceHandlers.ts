import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import {
  contentTaxonomies,
  contentTerms,
  contentTypes,
  formFields,
  forms,
  menuItems,
  menus,
  pages,
  seoDocuments,
} from "../../db/schema";
import { normalizeContentTypeName, normalizeContentTypeSlug } from "../content/typeService";
import type { SolutionKitSeoDefaults, SolutionKitTaxonomyTerm } from "./solutionKitTypes";
import {
  asRecord,
  compareFormFields,
  compareMenuItems,
  compareSeo,
  compareTaxonomyState,
  getTaxonomyByKind,
  normalizePageSlug,
  normalizeSeoDefaults,
  normalizeTermSlug,
  pageSlugCandidates,
  resolvePageFormReferences,
  snapshotContentType,
  snapshotForm,
  snapshotMenu,
  snapshotPage,
  toSnapshotTerms,
} from "./legacyInstallPlanning";
import type {
  ContentTaxonomyRow,
  FormFieldDesired,
  InstallOperationResult,
  InstallPlanOperation,
  JsonRecord,
  MenuItemDesired,
  MenuItemSnapshot,
  MenuRow,
  QueryExecutor,
  SeoSnapshot,
} from "./legacyInstallPlanning";

export const ensureTaxonomyRow = async (
  executor: QueryExecutor,
  input: {
    existing: ContentTaxonomyRow | undefined;
    typeId: string;
    kind: "category" | "tag";
  }
) => {
  if (input.existing) return input.existing;
  const defaults =
    input.kind === "category"
      ? { name: "Categories", slug: "categories" }
      : { name: "Tags", slug: "tags" };
  const [created] = await executor
    .insert(contentTaxonomies)
    .values({
      typeId: input.typeId,
      kind: input.kind,
      name: defaults.name,
      slug: defaults.slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return created;
};

export const syncTaxonomyTermsForKind = async (
  executor: QueryExecutor,
  input: {
    typeId: string;
    kind: "category" | "tag";
    desired: SolutionKitTaxonomyTerm[];
  }
) => {
  const taxonomyRows = await executor
    .select()
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, input.typeId));
  const currentTaxonomy = getTaxonomyByKind(taxonomyRows, input.kind);

  if (input.desired.length === 0) {
    if (currentTaxonomy) {
      await executor.delete(contentTaxonomies).where(eq(contentTaxonomies.id, currentTaxonomy.id));
    }
    return;
  }

  const taxonomy = await ensureTaxonomyRow(executor, {
    existing: currentTaxonomy,
    typeId: input.typeId,
    kind: input.kind,
  });
  if (!taxonomy) return;

  const existingTerms = await executor
    .select()
    .from(contentTerms)
    .where(eq(contentTerms.taxonomyId, taxonomy.id));
  const bySlug = new Map(existingTerms.map((row) => [row.slug, row]));
  const desiredBySlug = new Map(
    input.desired.map((item) => [normalizeTermSlug(item.name, item.slug), item])
  );

  for (const [slug, desiredTerm] of desiredBySlug.entries()) {
    const existing = bySlug.get(slug);
    if (existing) {
      if (existing.name !== desiredTerm.name) {
        await executor
          .update(contentTerms)
          .set({
            name: desiredTerm.name,
            updatedAt: new Date(),
          })
          .where(eq(contentTerms.id, existing.id));
      }
      bySlug.delete(slug);
      continue;
    }

    await executor.insert(contentTerms).values({
      taxonomyId: taxonomy.id,
      name: desiredTerm.name,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  for (const stale of bySlug.values()) {
    await executor.delete(contentTerms).where(eq(contentTerms.id, stale.id));
  }
};

export const syncContentTypeTaxonomy = async (
  executor: QueryExecutor,
  typeId: string,
  taxonomy: { categories?: SolutionKitTaxonomyTerm[]; tags?: SolutionKitTaxonomyTerm[] }
) => {
  await syncTaxonomyTermsForKind(executor, {
    typeId,
    kind: "category",
    desired: taxonomy.categories ?? [],
  });
  await syncTaxonomyTermsForKind(executor, {
    typeId,
    kind: "tag",
    desired: taxonomy.tags ?? [],
  });
};

export const replaceFormFieldsTx = async (
  executor: QueryExecutor,
  formId: string,
  fields: FormFieldDesired[]
) => {
  await executor.delete(formFields).where(eq(formFields.formId, formId));
  if (fields.length === 0) return;
  await executor.insert(formFields).values(
    fields.map((field, index) => ({
      id: field.id && field.id.trim().length > 0 ? field.id : randomUUID(),
      formId,
      type: field.type,
      label: field.label,
      name: field.name,
      required: field.required,
      orderIndex: Number.isFinite(field.orderIndex) ? field.orderIndex : index,
      settings: field.settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );
};

export const upsertPageSeoTx = async (
  executor: QueryExecutor,
  input: {
    pageId: string;
    pageSlug: string;
    seo: SolutionKitSeoDefaults | null;
  }
) => {
  if (!input.seo) return;
  const [existing] = await executor
    .select()
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, input.pageId)));

  if (existing) {
    await executor
      .update(seoDocuments)
      .set({
        slug: input.pageSlug,
        title: input.seo.title ?? null,
        description: input.seo.description ?? null,
        canonicalUrl: input.seo.canonicalUrl ?? null,
        robots: input.seo.robots ?? null,
        updatedAt: new Date(),
      })
      .where(eq(seoDocuments.id, existing.id));
    return;
  }

  await executor.insert(seoDocuments).values({
    targetType: "page",
    targetId: input.pageId,
    slug: input.pageSlug,
    title: input.seo.title ?? null,
    description: input.seo.description ?? null,
    canonicalUrl: input.seo.canonicalUrl ?? null,
    robots: input.seo.robots ?? null,
    status: "warning",
    issues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

export const restorePageSeoTx = async (
  executor: QueryExecutor,
  pageId: string,
  snapshot: SeoSnapshot | null
) => {
  const [existing] = await executor
    .select()
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, pageId)));

  if (!snapshot) {
    if (existing) {
      await executor.delete(seoDocuments).where(eq(seoDocuments.id, existing.id));
    }
    return;
  }

  if (existing) {
    await executor
      .update(seoDocuments)
      .set({
        title: snapshot.title,
        description: snapshot.description,
        canonicalUrl: snapshot.canonicalUrl,
        robots: snapshot.robots,
        updatedAt: new Date(),
      })
      .where(eq(seoDocuments.id, existing.id));
    return;
  }

  await executor.insert(seoDocuments).values({
    id: snapshot.id,
    targetType: "page",
    targetId: pageId,
    slug: null,
    title: snapshot.title,
    description: snapshot.description,
    canonicalUrl: snapshot.canonicalUrl,
    robots: snapshot.robots,
    status: "warning",
    issues: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

export const resolvePageIdBySlug = async (
  executor: QueryExecutor,
  slug: string
): Promise<string | null> => {
  const [page] = await executor
    .select({ id: pages.id })
    .from(pages)
    .where(inArray(pages.slug, pageSlugCandidates(slug)));
  return page?.id ?? null;
};

export const resolveMenuDesiredItems = async (
  executor: QueryExecutor,
  menuItemsPayload: Array<{
    key: string;
    label: string;
    href: string | null;
    pageSlug: string | null;
    parentKey: string | null;
    orderIndex: number;
    settings: JsonRecord;
  }>,
  options?: {
    allowMissingPageSlug?: boolean;
  }
): Promise<MenuItemDesired[]> => {
  const resolved: Array<{
    key: string;
    label: string;
    href: string | null;
    pageId: string | null;
    parentKey: string | null;
    orderIndex: number;
    settings: JsonRecord;
  }> = [];

  for (const item of menuItemsPayload) {
    let pageId: string | null = null;
    if (item.pageSlug) {
      pageId = await resolvePageIdBySlug(executor, item.pageSlug);
      if (!pageId) {
        if (options?.allowMissingPageSlug) {
          pageId = `predicted:page:${normalizePageSlug(item.pageSlug)}`;
        } else {
          throw new Error("solution_kit_menu_item_page_missing");
        }
      }
    }
    resolved.push({
      key: item.key,
      label: item.label,
      href: item.href ?? null,
      pageId,
      parentKey: item.parentKey ?? null,
      orderIndex: item.orderIndex,
      settings: item.settings,
    });
  }

  const idByKey = new Map<string, string>();
  for (const item of resolved) {
    idByKey.set(item.key, randomUUID());
  }

  return resolved.map((item) => ({
    id: idByKey.get(item.key) ?? randomUUID(),
    label: item.label,
    href: item.href,
    pageId: item.pageId,
    parentId: item.parentKey ? (idByKey.get(item.parentKey) ?? null) : null,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));
};

export const replaceMenuItemsTx = async (
  executor: QueryExecutor,
  menuId: string,
  items: MenuItemDesired[]
) => {
  await executor.delete(menuItems).where(eq(menuItems.menuId, menuId));
  if (items.length === 0) return;
  await executor.insert(menuItems).values(
    items.map((item, index) => ({
      id: item.id && item.id.trim().length > 0 ? item.id : randomUUID(),
      menuId,
      label: item.label,
      href: item.href ?? null,
      pageId: item.pageId ?? null,
      parentId: item.parentId ?? null,
      orderIndex: Number.isFinite(item.orderIndex) ? item.orderIndex : index,
      settings: item.settings,
    }))
  );
};

export const toMenuDesiredFromSnapshot = (items: MenuItemSnapshot[]): MenuItemDesired[] =>
  items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    pageId: item.pageId,
    parentId: item.parentId,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));

export const toMenuSnapshotFromDesired = (items: MenuItemDesired[]): MenuItemSnapshot[] =>
  items.map((item, index) => ({
    id: item.id && item.id.trim().length > 0 ? item.id : `predicted:${index + 1}`,
    label: item.label,
    href: item.href ?? null,
    pageId: item.pageId ?? null,
    parentId: item.parentId ?? null,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));

export const executeContentTypeOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "content_type" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const normalizedName = normalizeContentTypeName(op.payload.name);
  const normalizedSlug = normalizeContentTypeSlug(op.payload.slug);
  const [existing] = await executor
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, normalizedSlug));
  const [nameConflict] = await executor
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(
      existing
        ? and(
            sql`lower(${contentTypes.name}) = ${normalizedName.toLowerCase()}`,
            ne(contentTypes.id, existing.id)
          )
        : sql`lower(${contentTypes.name}) = ${normalizedName.toLowerCase()}`
    )
    .limit(1);
  if (nameConflict) throw new Error("solution_kit_content_type_name_exists");

  if (!existing) {
    const predictedTaxonomy = {
      categories: toSnapshotTerms(op.payload.taxonomy.categories ?? [], "category"),
      tags: toSnapshotTerms(op.payload.taxonomy.tags ?? [], "tag"),
    };
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          id: `predicted:${normalizedSlug}`,
          name: normalizedName,
          slug: normalizedSlug,
          schema: op.payload.schema,
          status: op.payload.status,
          taxonomy: predictedTaxonomy,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const [created] = await executor
      .insert(contentTypes)
      .values({
        name: normalizedName,
        slug: normalizedSlug,
        schema: op.payload.schema,
        status: op.payload.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    if (!created) throw new Error("solution_kit_content_type_create_failed");

    await syncContentTypeTaxonomy(executor, created.id, op.payload.taxonomy);
    const [reloaded] = await executor
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.id, created.id));
    if (!reloaded) throw new Error("solution_kit_content_type_create_failed");
    const afterSnapshot = await snapshotContentType(executor, reloaded);
    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot,
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = await snapshotContentType(executor, existing);
  const expectedTaxonomy = {
    categories: toSnapshotTerms(op.payload.taxonomy.categories ?? [], "category"),
    tags: toSnapshotTerms(op.payload.taxonomy.tags ?? [], "tag"),
  };
  const taxonomyChanged = !compareTaxonomyState(beforeSnapshot.taxonomy, expectedTaxonomy);
  const patch: Partial<typeof contentTypes.$inferInsert> = {};

  if (existing.name !== normalizedName) patch.name = normalizedName;
  if (existing.status !== op.payload.status) patch.status = op.payload.status;
  if (!isDeepStrictEqual(existing.schema, op.payload.schema)) {
    patch.schema = op.payload.schema;
  }

  if (Object.keys(patch).length === 0 && !taxonomyChanged) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.schema ? { schema: asRecord(patch.schema) } : {}),
        ...(taxonomyChanged ? { taxonomy: expectedTaxonomy } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  if (Object.keys(patch).length > 0) {
    const [updated] = await executor
      .update(contentTypes)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(contentTypes.id, existing.id))
      .returning();
    if (!updated) throw new Error("solution_kit_content_type_update_failed");
  }

  if (taxonomyChanged) {
    await syncContentTypeTaxonomy(executor, existing.id, op.payload.taxonomy);
  }

  const [reloaded] = await executor
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.id, existing.id));
  if (!reloaded) throw new Error("solution_kit_content_type_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: await snapshotContentType(executor, reloaded),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

export const executeFormOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "form" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const [existing] = await executor.select().from(forms).where(eq(forms.slug, op.payload.slug));

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          id: `predicted:${op.payload.slug}`,
          name: op.payload.name,
          slug: op.payload.slug,
          status: op.payload.status,
          description: op.payload.description,
          successMessage: op.payload.successMessage,
          successRedirectUrl: op.payload.successRedirectUrl,
          submissionAccess: op.payload.submissionAccess,
          settings: op.payload.settings,
          fields: op.payload.fields,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const now = new Date();
    const [created] = await executor
      .insert(forms)
      .values({
        name: op.payload.name,
        slug: op.payload.slug,
        status: op.payload.status,
        description: op.payload.description,
        successMessage: op.payload.successMessage,
        successRedirectUrl: op.payload.successRedirectUrl,
        submissionAccess: op.payload.submissionAccess,
        settings: op.payload.settings,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) throw new Error("solution_kit_form_create_failed");
    await replaceFormFieldsTx(executor, created.id, op.payload.fields);
    const [reloaded] = await executor.select().from(forms).where(eq(forms.id, created.id));
    if (!reloaded) throw new Error("solution_kit_form_create_failed");

    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: await snapshotForm(executor, reloaded),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = await snapshotForm(executor, existing);
  const patch: Partial<typeof forms.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if (op.payload.status === "published" && existing.status !== "published") {
    patch.status = "published";
  }
  if ((existing.description ?? null) !== (op.payload.description ?? null)) {
    patch.description = op.payload.description;
  }
  if ((existing.successMessage ?? null) !== (op.payload.successMessage ?? null)) {
    patch.successMessage = op.payload.successMessage;
  }
  if ((existing.successRedirectUrl ?? null) !== (op.payload.successRedirectUrl ?? null)) {
    patch.successRedirectUrl = op.payload.successRedirectUrl;
  }
  if ((existing.submissionAccess ?? "public") !== op.payload.submissionAccess) {
    patch.submissionAccess = op.payload.submissionAccess;
  }
  if (!isDeepStrictEqual(asRecord(existing.settings), op.payload.settings)) {
    patch.settings = op.payload.settings;
  }

  const fieldsChanged = !compareFormFields(beforeSnapshot.fields, op.payload.fields);

  if (Object.keys(patch).length === 0 && !fieldsChanged) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(typeof patch.description !== "undefined"
          ? { description: patch.description ?? null }
          : {}),
        ...(typeof patch.successMessage !== "undefined"
          ? { successMessage: patch.successMessage ?? null }
          : {}),
        ...(typeof patch.successRedirectUrl !== "undefined"
          ? { successRedirectUrl: patch.successRedirectUrl ?? null }
          : {}),
        ...(patch.submissionAccess ? { submissionAccess: patch.submissionAccess } : {}),
        ...(patch.settings ? { settings: asRecord(patch.settings) } : {}),
        ...(fieldsChanged ? { fields: op.payload.fields } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  if (Object.keys(patch).length > 0) {
    const [updated] = await executor
      .update(forms)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, existing.id))
      .returning();
    if (!updated) throw new Error("solution_kit_form_update_failed");
  }

  if (fieldsChanged) {
    await replaceFormFieldsTx(executor, existing.id, op.payload.fields);
  }

  const [reloaded] = await executor.select().from(forms).where(eq(forms.id, existing.id));
  if (!reloaded) throw new Error("solution_kit_form_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: await snapshotForm(executor, reloaded),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

export const executePageOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "page" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const currentData = await resolvePageFormReferences(executor, op.payload.currentData);
  const candidates = pageSlugCandidates(op.payload.slug);
  const rows = await executor.select().from(pages).where(inArray(pages.slug, candidates));
  const existing =
    rows.find((item) => item.slug === op.payload.slug) ??
    rows.find((item) => item.slug === "/") ??
    rows[0];

  if (!existing) {
    if (dryRun) {
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          id: `predicted:${op.payload.slug}`,
          title: op.payload.title,
          slug: op.payload.slug,
          status: op.payload.status,
          authorId: null,
          currentData,
          publishedData: op.payload.status === "published" ? currentData : null,
          publishedAt: op.payload.status === "published" ? new Date().toISOString() : null,
          seo: normalizeSeoDefaults(op.payload.seo),
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const now = new Date();
    const [created] = await executor
      .insert(pages)
      .values({
        title: op.payload.title,
        slug: op.payload.slug,
        status: op.payload.status,
        authorId: null,
        currentData,
        publishedData: op.payload.status === "published" ? currentData : null,
        publishedAt: op.payload.status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) throw new Error("solution_kit_page_create_failed");
    await upsertPageSeoTx(executor, {
      pageId: created.id,
      pageSlug: created.slug,
      seo: op.payload.seo,
    });
    const [reloaded] = await executor.select().from(pages).where(eq(pages.id, created.id));
    if (!reloaded) throw new Error("solution_kit_page_create_failed");

    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: await snapshotPage(executor, reloaded),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = await snapshotPage(executor, existing);
  const patch: Partial<typeof pages.$inferInsert> = {};
  const now = new Date();

  if (existing.title !== op.payload.title) patch.title = op.payload.title;
  if (!isDeepStrictEqual(asRecord(existing.currentData), currentData)) {
    patch.currentData = currentData;
  }
  if (op.payload.status === "published" && existing.status !== "published") {
    patch.status = "published";
    patch.publishedData = currentData;
    patch.publishedAt = existing.publishedAt ?? now;
  } else if (
    op.payload.status === "published" &&
    !isDeepStrictEqual(asRecord(existing.publishedData), currentData)
  ) {
    patch.publishedData = currentData;
  }
  const seoChanged = !compareSeo(beforeSnapshot.seo, op.payload.seo);

  if (Object.keys(patch).length === 0 && !seoChanged) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.publishedData ? { publishedData: asRecord(patch.publishedData) } : {}),
        ...(patch.publishedAt
          ? {
              publishedAt:
                patch.publishedAt instanceof Date ? patch.publishedAt.toISOString() : null,
            }
          : {}),
        ...(seoChanged ? { seo: normalizeSeoDefaults(op.payload.seo) } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  if (Object.keys(patch).length > 0) {
    const [updated] = await executor
      .update(pages)
      .set({
        ...patch,
        updatedAt: now,
      })
      .where(eq(pages.id, existing.id))
      .returning();
    if (!updated) throw new Error("solution_kit_page_update_failed");
  }

  if (seoChanged) {
    await upsertPageSeoTx(executor, {
      pageId: existing.id,
      pageSlug: op.payload.slug,
      seo: op.payload.seo,
    });
  }

  const [reloaded] = await executor.select().from(pages).where(eq(pages.id, existing.id));
  if (!reloaded) throw new Error("solution_kit_page_update_failed");

  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: await snapshotPage(executor, reloaded),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

export const executeMenuOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "menu" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  let existing: MenuRow | undefined;
  if (op.payload.location) {
    [existing] = await executor.select().from(menus).where(eq(menus.location, op.payload.location));
  } else {
    [existing] = await executor.select().from(menus).where(eq(menus.name, op.payload.name));
  }

  if (!existing) {
    if (dryRun) {
      const desiredItems = await resolveMenuDesiredItems(executor, op.payload.items, {
        allowMissingPageSlug: true,
      });
      return {
        operation: "create",
        beforeSnapshot: null,
        afterSnapshot: {
          id: `predicted:${op.payload.name.toLowerCase()}`,
          name: op.payload.name,
          location: op.payload.location,
          status: "published",
          publishedAt: new Date().toISOString(),
          items: toMenuSnapshotFromDesired(desiredItems),
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const desiredItems = await resolveMenuDesiredItems(executor, op.payload.items);
    const [created] = await executor
      .insert(menus)
      .values({
        name: op.payload.name,
        location: op.payload.location,
        status: "published",
        publishedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    if (!created) throw new Error("solution_kit_menu_create_failed");
    await replaceMenuItemsTx(executor, created.id, desiredItems);
    const [reloaded] = await executor.select().from(menus).where(eq(menus.id, created.id));
    if (!reloaded) throw new Error("solution_kit_menu_create_failed");
    return {
      operation: "create",
      beforeSnapshot: null,
      afterSnapshot: await snapshotMenu(executor, reloaded),
      rollbackAction: { strategy: "delete_by_id", id: created.id },
    };
  }

  const beforeSnapshot = await snapshotMenu(executor, existing);
  const desiredItems = await resolveMenuDesiredItems(executor, op.payload.items, {
    allowMissingPageSlug: dryRun,
  });
  const itemsChanged = !compareMenuItems(
    toMenuDesiredFromSnapshot(beforeSnapshot.items),
    desiredItems
  );
  const patch: Partial<typeof menus.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if ((existing.location ?? null) !== (op.payload.location ?? null)) {
    patch.location = op.payload.location;
  }
  if (existing.status !== "published" || !existing.publishedAt) {
    patch.status = "published";
    patch.publishedAt = existing.publishedAt ?? new Date();
  }

  if (Object.keys(patch).length === 0 && !itemsChanged) {
    return {
      operation: "noop",
      beforeSnapshot,
      afterSnapshot: beforeSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (dryRun) {
    return {
      operation: "update",
      beforeSnapshot,
      afterSnapshot: {
        ...beforeSnapshot,
        ...(patch.name ? { name: patch.name } : {}),
        ...(typeof patch.location !== "undefined" ? { location: patch.location } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.publishedAt
          ? {
              publishedAt:
                patch.publishedAt instanceof Date ? patch.publishedAt.toISOString() : null,
            }
          : {}),
        ...(itemsChanged ? { items: toMenuSnapshotFromDesired(desiredItems) } : {}),
      },
      rollbackAction: { strategy: "restore_snapshot" },
    };
  }

  if (Object.keys(patch).length > 0) {
    const [updated] = await executor
      .update(menus)
      .set(patch)
      .where(eq(menus.id, existing.id))
      .returning();
    if (!updated) throw new Error("solution_kit_menu_update_failed");
  }

  if (itemsChanged) {
    await replaceMenuItemsTx(executor, existing.id, desiredItems);
  }

  const [reloaded] = await executor.select().from(menus).where(eq(menus.id, existing.id));
  if (!reloaded) throw new Error("solution_kit_menu_update_failed");
  return {
    operation: "update",
    beforeSnapshot,
    afterSnapshot: await snapshotMenu(executor, reloaded),
    rollbackAction: { strategy: "restore_snapshot" },
  };
};

export const executeInstallOperation = async (
  executor: QueryExecutor,
  op: InstallPlanOperation,
  dryRun: boolean
) => {
  switch (op.resourceType) {
    case "content_type":
      return executeContentTypeOperation(executor, op, dryRun);
    case "form":
      return executeFormOperation(executor, op, dryRun);
    case "page":
      return executePageOperation(executor, op, dryRun);
    case "menu":
      return executeMenuOperation(executor, op, dryRun);
    default: {
      const neverType: never = op;
      throw new Error(`solution_kit_operation_unknown:${JSON.stringify(neverType)}`);
    }
  }
};
