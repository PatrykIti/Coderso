import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
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
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../db/schema";
import { logAudit } from "../audit/auditService";
import { getSolutionKitFromCatalog } from "./solutionKitsCatalog";
import type {
  SolutionKitContentTypeBlueprint,
  SolutionKitDefinition,
  SolutionKitFormBlueprint,
  SolutionKitId,
  SolutionKitMenuBlueprint,
  SolutionKitPageBlueprint,
  SolutionKitResourceBlueprint,
  SolutionKitSeoDefaults,
  SolutionKitTaxonomyTerm,
} from "./solutionKitTypes";

type JsonRecord = Record<string, unknown>;

export type SolutionKitInstallMode = "dry_run" | "apply" | "rollback";
export type SolutionKitInstallStatus = "running" | "success" | "failed";
export type SolutionKitInstallItemStatus =
  | "planned"
  | "success"
  | "failed"
  | "skipped";
export type SolutionKitInstallItemOperation =
  | "create"
  | "update"
  | "noop"
  | "delete"
  | "restore";
export type SolutionKitInstallResourceType =
  | "content_type"
  | "form"
  | "page"
  | "menu";

type SolutionKitInstallRunRow = typeof solutionKitInstallRuns.$inferSelect;
type SolutionKitInstallItemRow = typeof solutionKitInstallItems.$inferSelect;
type ContentTypeRow = typeof contentTypes.$inferSelect;
type ContentTaxonomyRow = typeof contentTaxonomies.$inferSelect;
type ContentTermRow = typeof contentTerms.$inferSelect;
type FormRow = typeof forms.$inferSelect;
type PageRow = typeof pages.$inferSelect;
type SeoDocumentRow = typeof seoDocuments.$inferSelect;
type MenuRow = typeof menus.$inferSelect;

type ContentTypeSnapshot = {
  id: string;
  name: string;
  slug: string;
  schema: JsonRecord;
  taxonomy: {
    categories: Array<{ id: string; name: string; slug: string }>;
    tags: Array<{ id: string; name: string; slug: string }>;
  };
};

type FormFieldSnapshot = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: JsonRecord;
};

type FormFieldDesired = {
  id?: string | null;
  type: string;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: JsonRecord;
};

type FormSnapshot = {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  successMessage: string | null;
  successRedirectUrl: string | null;
  submissionAccess: string;
  settings: JsonRecord;
  fields: FormFieldSnapshot[];
};

type SeoSnapshot = {
  id: string;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
};

type PageSnapshot = {
  id: string;
  title: string;
  slug: string;
  status: string;
  authorId: string | null;
  currentData: JsonRecord;
  publishedData: JsonRecord | null;
  publishedAt: string | null;
  seo: SeoSnapshot | null;
};

type MenuItemSnapshot = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings: JsonRecord;
};

type MenuItemDesired = {
  id?: string | null;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings: JsonRecord;
};

type MenuSnapshot = {
  id: string;
  name: string;
  location: string | null;
  items: MenuItemSnapshot[];
};

type InstallPlanOperation =
  | {
      position: number;
      resourceType: "content_type";
      resourceKey: string;
      payload: {
        slug: string;
        name: string;
        schema: JsonRecord;
        taxonomy: {
          categories?: SolutionKitTaxonomyTerm[];
          tags?: SolutionKitTaxonomyTerm[];
        };
      };
    }
  | {
      position: number;
      resourceType: "form";
      resourceKey: string;
      payload: {
        slug: string;
        name: string;
        status: "draft" | "published";
        description: string | null;
        successMessage: string | null;
        successRedirectUrl: string | null;
        submissionAccess: "public" | "internal";
        settings: JsonRecord;
        fields: FormFieldDesired[];
      };
    }
  | {
      position: number;
      resourceType: "page";
      resourceKey: string;
      payload: {
        slug: string;
        title: string;
        status: "draft" | "published";
        currentData: JsonRecord;
        seo: SolutionKitSeoDefaults | null;
      };
    }
  | {
      position: number;
      resourceType: "menu";
      resourceKey: string;
      payload: {
        location: string | null;
        name: string;
        items: Array<{
          key: string;
          label: string;
          href: string | null;
          pageSlug: string | null;
          parentKey: string | null;
          orderIndex: number;
          settings: JsonRecord;
        }>;
      };
    };

type InstallOperationResult = {
  operation: SolutionKitInstallItemOperation;
  beforeSnapshot: JsonRecord | null;
  afterSnapshot: JsonRecord | null;
  rollbackAction: JsonRecord | null;
};

type RollbackOperationResult = InstallOperationResult & {
  status: SolutionKitInstallItemStatus;
  error: string | null;
};

type QueryExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type SolutionKitInstallRunRecord = {
  id: string;
  kitId: string;
  mode: SolutionKitInstallMode;
  status: SolutionKitInstallStatus;
  actorId: string | null;
  rollbackOfRunId: string | null;
  options: JsonRecord;
  summary: JsonRecord;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
};

export type SolutionKitInstallItemRecord = {
  id: string;
  runId: string;
  position: number;
  resourceType: SolutionKitInstallResourceType;
  resourceKey: string;
  operation: SolutionKitInstallItemOperation;
  status: SolutionKitInstallItemStatus;
  beforeSnapshot: JsonRecord | null;
  afterSnapshot: JsonRecord | null;
  rollbackAction: JsonRecord | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SolutionKitInstallSummary = {
  total: number;
  success: number;
  failed: number;
  planned: number;
  skipped: number;
  operations: Record<SolutionKitInstallItemOperation, number>;
};

export type ApplySolutionKitInstallInput = {
  kitId: SolutionKitId;
  actorId?: string | null;
  dryRun?: boolean;
  continueOnError?: boolean;
  kitDefinitionOverride?: SolutionKitDefinition;
  runOptions?: JsonRecord;
};

export type RollbackSolutionKitInstallInput = {
  sourceRunId?: string;
  kitId?: SolutionKitId;
  actorId?: string | null;
  continueOnError?: boolean;
};

export type SolutionKitInstallResult = {
  run: SolutionKitInstallRunRecord;
  items: SolutionKitInstallItemRecord[];
  summary: SolutionKitInstallSummary;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord =>
  isRecord(value) ? (value as JsonRecord) : {};

const toIsoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePageSlug = (value: unknown) => {
  if (typeof value !== "string") throw new Error("solution_kit_page_slug_invalid");
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "/") return "/";
  const withoutLead = trimmed.replace(/^\/+/, "");
  const withoutTrail = withoutLead.replace(/\/+$/, "");
  return withoutTrail.length > 0 ? withoutTrail : "/";
};

const pageSlugCandidates = (slug: string) =>
  slug === "/" ? ["/", ""] : [slug, `/${slug}`];

const defaultContentTypeSchema = (): JsonRecord => ({
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
  },
  required: [],
});

const defaultFormSettings = (): JsonRecord => ({
  layoutMode: "single",
  saveProgress: false,
  stepTitles: [],
  preset: "custom",
  automationRetry: {
    enabled: false,
    maxAttempts: 1,
    baseDelayMs: 300,
    maxDelayMs: 2000,
  },
});

const defaultPageData = (): JsonRecord => ({
  blocks: [],
  settings: {
    showInNav: true,
  },
});

const normalizeTaxonomyTerms = (items?: SolutionKitTaxonomyTerm[]) => {
  if (!Array.isArray(items) || items.length === 0) return [] as SolutionKitTaxonomyTerm[];
  const seen = new Set<string>();
  const normalized: SolutionKitTaxonomyTerm[] = [];
  for (const item of items) {
    const name = normalizeString(item?.name);
    if (!name) continue;
    const slug = normalizeString(item?.slug);
    const key = `${name.toLowerCase()}::${slug?.toLowerCase() ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ name, ...(slug ? { slug } : {}) });
  }
  return normalized;
};

const normalizeContentTypeBlueprint = (value: SolutionKitContentTypeBlueprint) => ({
  slug: normalizeString(value.slug),
  name: normalizeString(value.name),
  schema: isRecord(value.schema) ? asRecord(value.schema) : defaultContentTypeSchema(),
  taxonomy: {
    categories: normalizeTaxonomyTerms(value.taxonomy?.categories),
    tags: normalizeTaxonomyTerms(value.taxonomy?.tags),
  },
});

const normalizeFormFieldsBlueprint = (
  value: SolutionKitFormBlueprint["fields"]
): FormFieldDesired[] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((field, index) => ({
      id: typeof field.id === "string" ? normalizeString(field.id) : null,
      type: normalizeString(field.type) ?? "text",
      label: normalizeString(field.label) ?? `Field ${index + 1}`,
      name:
        normalizeString(field.name) ??
        `field_${index + 1}`,
      required: Boolean(field.required),
      orderIndex:
        typeof field.orderIndex === "number" && Number.isFinite(field.orderIndex)
          ? Math.round(field.orderIndex)
          : index,
      settings: isRecord(field.settings) ? asRecord(field.settings) : {},
    }))
    .sort((left, right) => left.orderIndex - right.orderIndex);
};

const normalizeFormBlueprint = (value: SolutionKitFormBlueprint) => {
  const status: "draft" | "published" =
    value.status === "published" ? "published" : "draft";
  const submissionAccess: "public" | "internal" =
    value.submissionAccess === "internal" ? "internal" : "public";
  return {
    slug: normalizeString(value.slug),
    name: normalizeString(value.name),
    status,
    description:
      typeof value.description === "string" ? normalizeString(value.description) : null,
    successMessage:
      typeof value.successMessage === "string" ? normalizeString(value.successMessage) : null,
    successRedirectUrl:
      typeof value.successRedirectUrl === "string"
        ? normalizeString(value.successRedirectUrl)
        : null,
    submissionAccess,
    settings: isRecord(value.settings) ? asRecord(value.settings) : defaultFormSettings(),
    fields: normalizeFormFieldsBlueprint(value.fields),
  };
};

const normalizeSeoDefaults = (value: SolutionKitSeoDefaults | undefined | null) => {
  if (!value || !isRecord(value)) return null;
  const title = typeof value.title === "string" ? normalizeString(value.title) : null;
  const description =
    typeof value.description === "string" ? normalizeString(value.description) : null;
  const canonicalUrl =
    typeof value.canonicalUrl === "string" ? normalizeString(value.canonicalUrl) : null;
  const robots = typeof value.robots === "string" ? normalizeString(value.robots) : null;
  if (!title && !description && !canonicalUrl && !robots) return null;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(canonicalUrl ? { canonicalUrl } : {}),
    ...(robots ? { robots } : {}),
  } satisfies SolutionKitSeoDefaults;
};

const normalizePageBlueprint = (value: SolutionKitPageBlueprint) => {
  const status: "draft" | "published" =
    value.status === "published" ? "published" : "draft";
  return {
    slug: normalizePageSlug(value.slug),
    title: normalizeString(value.title),
    status,
    currentData: isRecord(value.data) ? asRecord(value.data) : defaultPageData(),
    seo: normalizeSeoDefaults(value.seo),
  };
};

const normalizeMenuItemsBlueprint = (value: SolutionKitMenuBlueprint["items"]) => {
  if (!Array.isArray(value) || value.length === 0) return [] as Array<{
    key: string;
    label: string;
    href: string | null;
    pageSlug: string | null;
    parentKey: string | null;
    orderIndex: number;
    settings: JsonRecord;
  }>;

  return value
    .map((item, index) => {
      const key = normalizeString(item?.key);
      const label = normalizeString(item?.label);
      const href = typeof item?.href === "string" ? normalizeString(item.href) : null;
      const pageSlug =
        typeof item?.pageSlug === "string" ? normalizePageSlug(item.pageSlug) : null;
      const parentKey =
        typeof item?.parentKey === "string" ? normalizeString(item.parentKey) : null;
      const orderIndex =
        typeof item?.orderIndex === "number" && Number.isFinite(item.orderIndex)
          ? Math.round(item.orderIndex)
          : index;
      if (!key || !label || (!href && !pageSlug)) {
        throw new Error("solution_kit_blueprint_menu_item_invalid");
      }
      return {
        key,
        label,
        href: href ?? null,
        pageSlug: pageSlug ?? null,
        parentKey: parentKey ?? null,
        orderIndex,
        settings: isRecord(item?.settings) ? asRecord(item?.settings) : {},
      };
    })
    .sort((left, right) => left.orderIndex - right.orderIndex);
};

const normalizeMenuBlueprint = (value: SolutionKitMenuBlueprint) => ({
  name: normalizeString(value.name),
  location: normalizeString(value.location),
  items: normalizeMenuItemsBlueprint(value.items),
});

const snapshotSeo = (row: SeoDocumentRow): SeoSnapshot => ({
  id: row.id,
  title: row.title ?? null,
  description: row.description ?? null,
  canonicalUrl: row.canonicalUrl ?? null,
  robots: row.robots ?? null,
});

const getSeoForPage = async (executor: QueryExecutor, pageId: string): Promise<SeoSnapshot | null> => {
  const [row] = await executor
    .select()
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, pageId)));
  return row ? snapshotSeo(row) : null;
};

const listTaxonomyState = async (executor: QueryExecutor, typeId: string) => {
  const taxonomyRows = await executor
    .select()
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, typeId))
    .orderBy(asc(contentTaxonomies.kind), asc(contentTaxonomies.name));

  if (taxonomyRows.length === 0) {
    return {
      categories: [] as Array<{ id: string; name: string; slug: string }>,
      tags: [] as Array<{ id: string; name: string; slug: string }>,
    };
  }

  const taxonomyIds = taxonomyRows.map((row) => row.id);
  const termRows = await executor
    .select()
    .from(contentTerms)
    .where(inArray(contentTerms.taxonomyId, taxonomyIds))
    .orderBy(asc(contentTerms.name), asc(contentTerms.slug));
  const termsByTaxonomy = new Map<string, ContentTermRow[]>();
  for (const row of termRows) {
    const existing = termsByTaxonomy.get(row.taxonomyId) ?? [];
    existing.push(row);
    termsByTaxonomy.set(row.taxonomyId, existing);
  }

  const toTerms = (kind: "category" | "tag") =>
    taxonomyRows
      .filter((row) => row.kind === kind)
      .flatMap((taxonomy) =>
        (termsByTaxonomy.get(taxonomy.id) ?? []).map((term) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
        }))
      );

  return {
    categories: toTerms("category"),
    tags: toTerms("tag"),
  };
};

const listFormFieldSnapshots = async (
  executor: QueryExecutor,
  formId: string
): Promise<FormFieldSnapshot[]> => {
  const rows = await executor
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.orderIndex), asc(formFields.label));
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    label: row.label,
    name: row.name,
    required: row.required,
    orderIndex: row.orderIndex,
    settings: asRecord(row.settings),
  }));
};

const listMenuItemSnapshots = async (
  executor: QueryExecutor,
  menuId: string
): Promise<MenuItemSnapshot[]> => {
  const rows = await executor
    .select()
    .from(menuItems)
    .where(eq(menuItems.menuId, menuId))
    .orderBy(asc(menuItems.orderIndex), asc(menuItems.label));
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href ?? null,
    pageId: row.pageId ?? null,
    parentId: row.parentId ?? null,
    orderIndex: row.orderIndex,
    settings: asRecord(row.settings),
  }));
};

const snapshotContentType = async (
  executor: QueryExecutor,
  row: ContentTypeRow
): Promise<ContentTypeSnapshot> => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  schema: asRecord(row.schema),
  taxonomy: await listTaxonomyState(executor, row.id),
});

const snapshotForm = async (
  executor: QueryExecutor,
  row: FormRow
): Promise<FormSnapshot> => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status,
  description: row.description,
  successMessage: row.successMessage,
  successRedirectUrl: row.successRedirectUrl,
  submissionAccess: row.submissionAccess,
  settings: asRecord(row.settings),
  fields: await listFormFieldSnapshots(executor, row.id),
});

const snapshotPage = async (
  executor: QueryExecutor,
  row: PageRow
): Promise<PageSnapshot> => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  status: row.status,
  authorId: row.authorId,
  currentData: asRecord(row.currentData),
  publishedData: isRecord(row.publishedData) ? (row.publishedData as JsonRecord) : null,
  publishedAt: toIsoOrNull(row.publishedAt),
  seo: await getSeoForPage(executor, row.id),
});

const snapshotMenu = async (
  executor: QueryExecutor,
  row: MenuRow
): Promise<MenuSnapshot> => ({
  id: row.id,
  name: row.name,
  location: row.location,
  items: await listMenuItemSnapshots(executor, row.id),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeTermSlug = (name: string, slug?: string | null) =>
  slugify(slug && slug.trim().length > 0 ? slug : name) || "term";

const toSnapshotTerms = (
  items: SolutionKitTaxonomyTerm[],
  prefix: string
): Array<{ id: string; name: string; slug: string }> =>
  sortTermsBySlug(
    items.map((item) => ({
      id: `${prefix}:${normalizeTermSlug(item.name, item.slug)}`,
      name: item.name,
      slug: normalizeTermSlug(item.name, item.slug),
    }))
  );

const sortTermsBySlug = <T extends { name: string; slug: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const slugCompare = left.slug.localeCompare(right.slug);
    if (slugCompare !== 0) return slugCompare;
    return left.name.localeCompare(right.name);
  });

const compareTermSets = (
  left: Array<{ name: string; slug: string }>,
  right: Array<{ name: string; slug: string }>
) => {
  if (left.length !== right.length) return false;
  const leftSorted = sortTermsBySlug(left);
  const rightSorted = sortTermsBySlug(right);
  return leftSorted.every(
    (item, index) =>
      item.name === rightSorted[index]?.name && item.slug === rightSorted[index]?.slug
  );
};

const compareTaxonomyState = (
  left: ContentTypeSnapshot["taxonomy"],
  right: ContentTypeSnapshot["taxonomy"]
) =>
  compareTermSets(
    left.categories.map((item) => ({ name: item.name, slug: item.slug })),
    right.categories.map((item) => ({ name: item.name, slug: item.slug }))
  ) &&
  compareTermSets(
    left.tags.map((item) => ({ name: item.name, slug: item.slug })),
    right.tags.map((item) => ({ name: item.name, slug: item.slug }))
  );

const compareFormFields = (left: FormFieldDesired[], right: FormFieldDesired[]) => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedRight = [...right].sort((a, b) => a.orderIndex - b.orderIndex);
  return sortedLeft.every((item, index) => {
    const target = sortedRight[index];
    if (!target) return false;
    return (
      item.type === target.type &&
      item.label === target.label &&
      item.name === target.name &&
      item.required === target.required &&
      item.orderIndex === target.orderIndex &&
      isDeepStrictEqual(item.settings, target.settings)
    );
  });
};

const compareSeo = (left: SeoSnapshot | null, right: SolutionKitSeoDefaults | null) => {
  const normalizedRight = normalizeSeoDefaults(right);
  if (!left && !normalizedRight) return true;
  if (!left || !normalizedRight) return false;
  return (
    (left.title ?? null) === (normalizedRight.title ?? null) &&
    (left.description ?? null) === (normalizedRight.description ?? null) &&
    (left.canonicalUrl ?? null) === (normalizedRight.canonicalUrl ?? null) &&
    (left.robots ?? null) === (normalizedRight.robots ?? null)
  );
};

const compareMenuItems = (left: MenuItemDesired[], right: MenuItemDesired[]) => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedRight = [...right].sort((a, b) => a.orderIndex - b.orderIndex);
  return sortedLeft.every((item, index) => {
    const target = sortedRight[index];
    if (!target) return false;
    return (
      item.label === target.label &&
      (item.href ?? null) === (target.href ?? null) &&
      (item.pageId ?? null) === (target.pageId ?? null) &&
      (item.parentId ?? null) === (target.parentId ?? null) &&
      item.orderIndex === target.orderIndex &&
      isDeepStrictEqual(item.settings, target.settings)
    );
  });
};

const getTaxonomyByKind = (
  rows: ContentTaxonomyRow[],
  kind: "category" | "tag"
) => rows.find((row) => row.kind === kind);

const ensureTaxonomyRow = async (
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

const syncTaxonomyTermsForKind = async (
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
      await executor
        .delete(contentTaxonomies)
        .where(eq(contentTaxonomies.id, currentTaxonomy.id));
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

    await executor
      .insert(contentTerms)
      .values({
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

const syncContentTypeTaxonomy = async (
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

const replaceFormFieldsTx = async (
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

const upsertPageSeoTx = async (
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

const restorePageSeoTx = async (
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

const resolvePageIdBySlug = async (
  executor: QueryExecutor,
  slug: string
): Promise<string | null> => {
  const [page] = await executor
    .select({ id: pages.id })
    .from(pages)
    .where(inArray(pages.slug, pageSlugCandidates(slug)));
  return page?.id ?? null;
};

const resolveMenuDesiredItems = async (
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
    parentId: item.parentKey ? idByKey.get(item.parentKey) ?? null : null,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));
};

const replaceMenuItemsTx = async (
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

const toMenuDesiredFromSnapshot = (items: MenuItemSnapshot[]): MenuItemDesired[] =>
  items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    pageId: item.pageId,
    parentId: item.parentId,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));

const toMenuSnapshotFromDesired = (items: MenuItemDesired[]): MenuItemSnapshot[] =>
  items.map((item, index) => ({
    id: item.id && item.id.trim().length > 0 ? item.id : `predicted:${index + 1}`,
    label: item.label,
    href: item.href ?? null,
    pageId: item.pageId ?? null,
    parentId: item.parentId ?? null,
    orderIndex: item.orderIndex,
    settings: item.settings,
  }));

const normalizeRunRow = (row: SolutionKitInstallRunRow): SolutionKitInstallRunRecord => ({
  id: row.id,
  kitId: row.kitId,
  mode: row.mode as SolutionKitInstallMode,
  status: row.status as SolutionKitInstallStatus,
  actorId: row.actorId,
  rollbackOfRunId: row.rollbackOfRunId,
  options: asRecord(row.options),
  summary: asRecord(row.summary),
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  finishedAt: row.finishedAt,
});

const normalizeItemRow = (row: SolutionKitInstallItemRow): SolutionKitInstallItemRecord => ({
  id: row.id,
  runId: row.runId,
  position: row.position,
  resourceType: row.resourceType as SolutionKitInstallResourceType,
  resourceKey: row.resourceKey,
  operation: row.operation as SolutionKitInstallItemOperation,
  status: row.status as SolutionKitInstallItemStatus,
  beforeSnapshot: isRecord(row.beforeSnapshot)
    ? (row.beforeSnapshot as JsonRecord)
    : null,
  afterSnapshot: isRecord(row.afterSnapshot)
    ? (row.afterSnapshot as JsonRecord)
    : null,
  rollbackAction: isRecord(row.rollbackAction)
    ? (row.rollbackAction as JsonRecord)
    : null,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const buildSummary = (
  items: Pick<SolutionKitInstallItemRecord, "operation" | "status">[]
): SolutionKitInstallSummary => {
  const summary: SolutionKitInstallSummary = {
    total: 0,
    success: 0,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: {
      create: 0,
      update: 0,
      noop: 0,
      delete: 0,
      restore: 0,
    },
  };

  for (const item of items) {
    summary.total += 1;
    summary.operations[item.operation] += 1;
    if (item.status === "success") summary.success += 1;
    if (item.status === "failed") summary.failed += 1;
    if (item.status === "planned") summary.planned += 1;
    if (item.status === "skipped") summary.skipped += 1;
  }
  return summary;
};

const resolveKitDefinition = (
  kitId: SolutionKitId,
  override?: SolutionKitDefinition
) => {
  if (override) return override;
  const kit = getSolutionKitFromCatalog(kitId);
  if (!kit) throw new Error("solution_kit_not_found");
  return kit;
};

const createInstallRun = async (input: {
  kitId: string;
  mode: SolutionKitInstallMode;
  actorId?: string | null;
  rollbackOfRunId?: string | null;
  options?: JsonRecord;
}) => {
  const [row] = await db
    .insert(solutionKitInstallRuns)
    .values({
      kitId: input.kitId,
      mode: input.mode,
      status: "running",
      actorId: input.actorId ?? null,
      rollbackOfRunId: input.rollbackOfRunId ?? null,
      options: input.options ?? {},
      summary: {},
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: null,
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_run_create_failed");
  return normalizeRunRow(row);
};

const appendInstallItem = async (runId: string, input: {
  position: number;
  resourceType: SolutionKitInstallResourceType;
  resourceKey: string;
  operation: SolutionKitInstallItemOperation;
  status: SolutionKitInstallItemStatus;
  beforeSnapshot?: JsonRecord | null;
  afterSnapshot?: JsonRecord | null;
  rollbackAction?: JsonRecord | null;
  error?: string | null;
}) => {
  const [row] = await db
    .insert(solutionKitInstallItems)
    .values({
      runId,
      position: input.position,
      resourceType: input.resourceType,
      resourceKey: input.resourceKey,
      operation: input.operation,
      status: input.status,
      beforeSnapshot: input.beforeSnapshot ?? null,
      afterSnapshot: input.afterSnapshot ?? null,
      rollbackAction: input.rollbackAction ?? null,
      error: input.error ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("solution_kit_install_item_create_failed");
  return normalizeItemRow(row);
};

const finalizeInstallRun = async (
  runId: string,
  input: {
    status: SolutionKitInstallStatus;
    summary: SolutionKitInstallSummary;
    error?: string | null;
  }
) => {
  const [row] = await db
    .update(solutionKitInstallRuns)
    .set({
      status: input.status,
      summary: input.summary,
      error: input.error ?? null,
      updatedAt: new Date(),
      finishedAt: new Date(),
    })
    .where(eq(solutionKitInstallRuns.id, runId))
    .returning();
  if (!row) throw new Error("solution_kit_install_run_finalize_failed");
  return normalizeRunRow(row);
};

const planOperations = (blueprint: SolutionKitResourceBlueprint): InstallPlanOperation[] => {
  const operations: InstallPlanOperation[] = [];
  const keys = new Set<string>();
  let position = 0;

  const push = (op: InstallPlanOperation) => {
    const dedupeKey = `${op.resourceType}:${op.resourceKey}`;
    if (keys.has(dedupeKey)) {
      throw new Error("solution_kit_blueprint_duplicate_resource");
    }
    keys.add(dedupeKey);
    operations.push(op);
  };

  for (const type of blueprint.contentTypes) {
    const normalized = normalizeContentTypeBlueprint(type);
    const slug = normalized.slug;
    const name = normalized.name;
    if (!slug || !name) throw new Error("solution_kit_blueprint_content_type_invalid");
    push({
      position,
      resourceType: "content_type",
      resourceKey: slug,
      payload: {
        slug,
        name,
        schema: normalized.schema,
        taxonomy: normalized.taxonomy,
      },
    });
    position += 1;
  }

  for (const form of blueprint.forms) {
    const normalized = normalizeFormBlueprint(form);
    const slug = normalized.slug;
    const name = normalized.name;
    if (!slug || !name) throw new Error("solution_kit_blueprint_form_invalid");
    push({
      position,
      resourceType: "form",
      resourceKey: slug,
      payload: {
        slug,
        name,
        status: normalized.status,
        description: normalized.description,
        successMessage: normalized.successMessage,
        successRedirectUrl: normalized.successRedirectUrl,
        submissionAccess: normalized.submissionAccess,
        settings: normalized.settings,
        fields: normalized.fields,
      },
    });
    position += 1;
  }

  for (const page of blueprint.pages) {
    const normalized = normalizePageBlueprint(page);
    const slug = normalized.slug;
    const title = normalized.title;
    if (!title) throw new Error("solution_kit_blueprint_page_invalid");
    push({
      position,
      resourceType: "page",
      resourceKey: slug,
      payload: {
        slug,
        title,
        status: normalized.status,
        currentData: normalized.currentData,
        seo: normalized.seo,
      },
    });
    position += 1;
  }

  for (const menu of blueprint.menus) {
    const normalized = normalizeMenuBlueprint(menu);
    const name = normalized.name;
    if (!name) throw new Error("solution_kit_blueprint_menu_invalid");
    const location = normalized.location;
    push({
      position,
      resourceType: "menu",
      resourceKey: location ? `location:${location}` : `name:${name.toLowerCase()}`,
      payload: {
        location,
        name,
        items: normalized.items,
      },
    });
    position += 1;
  }

  return operations;
};

const executeContentTypeOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "content_type" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const [existing] = await executor
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, op.payload.slug));

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
          id: `predicted:${op.payload.slug}`,
          name: op.payload.name,
          slug: op.payload.slug,
          schema: op.payload.schema,
          taxonomy: predictedTaxonomy,
        },
        rollbackAction: { strategy: "delete_created" },
      };
    }

    const [created] = await executor
      .insert(contentTypes)
      .values({
        name: op.payload.name,
        slug: op.payload.slug,
        schema: op.payload.schema,
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

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
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

const executeFormOperation = async (
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

const executePageOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "page" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  const candidates = pageSlugCandidates(op.payload.slug);
  const rows = await executor
    .select()
    .from(pages)
    .where(inArray(pages.slug, candidates));
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
          currentData: op.payload.currentData,
          publishedData:
            op.payload.status === "published" ? op.payload.currentData : null,
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
        currentData: op.payload.currentData,
        publishedData:
          op.payload.status === "published" ? op.payload.currentData : null,
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
  if (!isDeepStrictEqual(asRecord(existing.currentData), op.payload.currentData)) {
    patch.currentData = op.payload.currentData;
  }
  if (op.payload.status === "published" && existing.status !== "published") {
    patch.status = "published";
    patch.publishedData = op.payload.currentData;
    patch.publishedAt = existing.publishedAt ?? now;
  } else if (op.payload.status === "published" && !isDeepStrictEqual(asRecord(existing.publishedData), op.payload.currentData)) {
    patch.publishedData = op.payload.currentData;
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
        ...(patch.publishedData
          ? { publishedData: asRecord(patch.publishedData) }
          : {}),
        ...(patch.publishedAt
          ? {
              publishedAt:
                patch.publishedAt instanceof Date
                  ? patch.publishedAt.toISOString()
              : null,
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

const executeMenuOperation = async (
  executor: QueryExecutor,
  op: Extract<InstallPlanOperation, { resourceType: "menu" }>,
  dryRun: boolean
): Promise<InstallOperationResult> => {
  let existing: MenuRow | undefined;
  if (op.payload.location) {
    [existing] = await executor
      .select()
      .from(menus)
      .where(eq(menus.location, op.payload.location));
  } else {
    [existing] = await executor
      .select()
      .from(menus)
      .where(eq(menus.name, op.payload.name));
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
  const desiredItems = await resolveMenuDesiredItems(executor, op.payload.items);
  const itemsChanged = !compareMenuItems(
    toMenuDesiredFromSnapshot(beforeSnapshot.items),
    desiredItems
  );
  const patch: Partial<typeof menus.$inferInsert> = {};

  if (existing.name !== op.payload.name) patch.name = op.payload.name;
  if ((existing.location ?? null) !== (op.payload.location ?? null)) {
    patch.location = op.payload.location;
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
        ...(typeof patch.location !== "undefined"
          ? { location: patch.location }
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

const executeInstallOperation = async (
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

const parseSnapshot = <T extends JsonRecord>(
  value: JsonRecord | null,
  parser: (payload: JsonRecord) => T
) => {
  if (!value) return null;
  return parser(value);
};

const parseContentTypeSnapshot = (payload: JsonRecord): ContentTypeSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  slug: String(payload.slug ?? ""),
  schema: asRecord(payload.schema),
  taxonomy: {
    categories: Array.isArray(asRecord(payload.taxonomy).categories)
      ? (asRecord(payload.taxonomy).categories as unknown[])
          .filter((value) => isRecord(value))
          .map((value) => ({
            id: String(value.id ?? ""),
            name: String(value.name ?? ""),
            slug: String(value.slug ?? ""),
          }))
      : [],
    tags: Array.isArray(asRecord(payload.taxonomy).tags)
      ? (asRecord(payload.taxonomy).tags as unknown[])
          .filter((value) => isRecord(value))
          .map((value) => ({
            id: String(value.id ?? ""),
            name: String(value.name ?? ""),
            slug: String(value.slug ?? ""),
          }))
      : [],
  },
});

const parseFormSnapshot = (payload: JsonRecord): FormSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  slug: String(payload.slug ?? ""),
  status: String(payload.status ?? "draft"),
  description:
    payload.description === null || typeof payload.description === "string"
      ? payload.description
      : null,
  successMessage:
    payload.successMessage === null || typeof payload.successMessage === "string"
      ? payload.successMessage
      : null,
  successRedirectUrl:
    payload.successRedirectUrl === null ||
    typeof payload.successRedirectUrl === "string"
      ? payload.successRedirectUrl
      : null,
  submissionAccess: String(payload.submissionAccess ?? "public"),
  settings: asRecord(payload.settings),
  fields: Array.isArray(payload.fields)
    ? (payload.fields as unknown[])
        .filter((value) => isRecord(value))
        .map((value) => ({
          id: String(value.id ?? ""),
          type: String(value.type ?? "text"),
          label: String(value.label ?? ""),
          name: String(value.name ?? ""),
          required: Boolean(value.required),
          orderIndex:
            typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex)
              ? Math.round(value.orderIndex)
              : 0,
          settings: asRecord(value.settings),
        }))
        .sort((left, right) => left.orderIndex - right.orderIndex)
    : [],
});

const parseSeoSnapshot = (payload: JsonRecord): SeoSnapshot => ({
  id: String(payload.id ?? ""),
  title: typeof payload.title === "string" ? payload.title : null,
  description: typeof payload.description === "string" ? payload.description : null,
  canonicalUrl: typeof payload.canonicalUrl === "string" ? payload.canonicalUrl : null,
  robots: typeof payload.robots === "string" ? payload.robots : null,
});

const parsePageSnapshot = (payload: JsonRecord): PageSnapshot => ({
  id: String(payload.id ?? ""),
  title: String(payload.title ?? ""),
  slug: String(payload.slug ?? ""),
  status: String(payload.status ?? "draft"),
  authorId:
    payload.authorId === null || typeof payload.authorId === "string"
      ? payload.authorId
      : null,
  currentData: asRecord(payload.currentData),
  publishedData: isRecord(payload.publishedData)
    ? (payload.publishedData as JsonRecord)
    : null,
  publishedAt:
    payload.publishedAt === null || typeof payload.publishedAt === "string"
      ? payload.publishedAt
      : null,
  seo: isRecord(payload.seo) ? parseSeoSnapshot(payload.seo) : null,
});

const parseMenuSnapshot = (payload: JsonRecord): MenuSnapshot => ({
  id: String(payload.id ?? ""),
  name: String(payload.name ?? ""),
  location:
    payload.location === null || typeof payload.location === "string"
      ? payload.location
      : null,
  items: Array.isArray(payload.items)
    ? (payload.items as unknown[])
        .filter((value) => isRecord(value))
        .map((value) => ({
          id: String(value.id ?? ""),
          label: String(value.label ?? ""),
          href: value.href === null || typeof value.href === "string" ? value.href : null,
          pageId:
            value.pageId === null || typeof value.pageId === "string"
              ? value.pageId
              : null,
          parentId:
            value.parentId === null || typeof value.parentId === "string"
              ? value.parentId
              : null,
          orderIndex:
            typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex)
              ? Math.round(value.orderIndex)
              : 0,
          settings: asRecord(value.settings),
        }))
        .sort((left, right) => left.orderIndex - right.orderIndex)
    : [],
});

const rollbackCreatedResource = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
): Promise<RollbackOperationResult> => {
  const afterSnapshot = item.afterSnapshot;
  const id = typeof afterSnapshot?.id === "string" ? afterSnapshot.id : null;
  if (!id) {
    return {
      operation: "delete",
      status: "failed",
      error: "solution_kit_rollback_missing_created_id",
      beforeSnapshot: null,
      afterSnapshot: null,
      rollbackAction: { strategy: "none" },
    };
  }

  switch (item.resourceType) {
    case "content_type": {
      const [deleted] = await executor
        .delete(contentTypes)
        .where(eq(contentTypes.id, id))
        .returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotContentType(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "form": {
      const [deleted] = await executor.delete(forms).where(eq(forms.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotForm(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "page": {
      await executor
        .delete(seoDocuments)
        .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, id)));
      const [deleted] = await executor.delete(pages).where(eq(pages.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotPage(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "menu": {
      const [deleted] = await executor.delete(menus).where(eq(menus.id, id)).returning();
      return {
        operation: "delete",
        status: deleted ? "success" : "skipped",
        error: null,
        beforeSnapshot: deleted ? await snapshotMenu(executor, deleted) : null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
    default: {
      return {
        operation: "delete",
        status: "failed",
        error: "solution_kit_rollback_resource_type_invalid",
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
    }
  }
};

const rollbackUpdatedResource = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
): Promise<RollbackOperationResult> => {
  if (!item.beforeSnapshot) {
    return {
      operation: "restore",
      status: "failed",
      error: "solution_kit_rollback_missing_before_snapshot",
      beforeSnapshot: null,
      afterSnapshot: null,
      rollbackAction: { strategy: "none" },
    };
  }

  switch (item.resourceType) {
    case "content_type": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseContentTypeSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_content_type_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.id, snapshot.id));

      const beforeSnapshot = current ? await snapshotContentType(executor, current) : null;
      let restored: ContentTypeRow | undefined;
      const restoreTaxonomy = {
        categories: snapshot.taxonomy.categories.map((item) => ({
          name: item.name,
          slug: item.slug,
        })),
        tags: snapshot.taxonomy.tags.map((item) => ({
          name: item.name,
          slug: item.slug,
        })),
      };

      if (current) {
        [restored] = await executor
          .update(contentTypes)
          .set({
            name: snapshot.name,
            slug: snapshot.slug,
            schema: snapshot.schema,
            updatedAt: new Date(),
          })
          .where(eq(contentTypes.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(contentTypes)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            slug: snapshot.slug,
            schema: snapshot.schema,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      if (restored) {
        await syncContentTypeTaxonomy(executor, restored.id, restoreTaxonomy);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_content_type_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotContentType(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "form": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseFormSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_form_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(forms).where(eq(forms.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotForm(executor, current) : null;
      const now = new Date();
      let restored: FormRow | undefined;

      if (current) {
        [restored] = await executor
          .update(forms)
          .set({
            name: snapshot.name,
            slug: snapshot.slug,
            status: snapshot.status,
            description: snapshot.description,
            successMessage: snapshot.successMessage,
            successRedirectUrl: snapshot.successRedirectUrl,
            submissionAccess: snapshot.submissionAccess,
            settings: snapshot.settings,
            updatedAt: now,
          })
          .where(eq(forms.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(forms)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            slug: snapshot.slug,
            status: snapshot.status,
            description: snapshot.description,
            successMessage: snapshot.successMessage,
            successRedirectUrl: snapshot.successRedirectUrl,
            submissionAccess: snapshot.submissionAccess,
            settings: snapshot.settings,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }

      if (restored) {
        await replaceFormFieldsTx(executor, restored.id, snapshot.fields);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_form_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotForm(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "page": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parsePageSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_page_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(pages).where(eq(pages.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotPage(executor, current) : null;
      const now = new Date();
      const publishedAt = snapshot.publishedAt ? new Date(snapshot.publishedAt) : null;
      let restored: PageRow | undefined;

      if (current) {
        [restored] = await executor
          .update(pages)
          .set({
            title: snapshot.title,
            slug: snapshot.slug,
            status: snapshot.status,
            authorId: snapshot.authorId,
            currentData: snapshot.currentData,
            publishedData: snapshot.publishedData,
            publishedAt,
            updatedAt: now,
          })
          .where(eq(pages.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(pages)
          .values({
            id: snapshot.id,
            title: snapshot.title,
            slug: snapshot.slug,
            status: snapshot.status,
            authorId: snapshot.authorId,
            currentData: snapshot.currentData,
            publishedData: snapshot.publishedData,
            publishedAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
      }

      if (restored) {
        await restorePageSeoTx(executor, restored.id, snapshot.seo);
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_page_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotPage(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    case "menu": {
      const snapshot = parseSnapshot(item.beforeSnapshot, parseMenuSnapshot);
      if (!snapshot || !snapshot.id) {
        return {
          operation: "restore",
          status: "failed",
          error: "solution_kit_rollback_menu_snapshot_invalid",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: { strategy: "none" },
        };
      }

      const [current] = await executor.select().from(menus).where(eq(menus.id, snapshot.id));
      const beforeSnapshot = current ? await snapshotMenu(executor, current) : null;
      let restored: MenuRow | undefined;

      if (current) {
        [restored] = await executor
          .update(menus)
          .set({
            name: snapshot.name,
            location: snapshot.location,
          })
          .where(eq(menus.id, snapshot.id))
          .returning();
      } else {
        [restored] = await executor
          .insert(menus)
          .values({
            id: snapshot.id,
            name: snapshot.name,
            location: snapshot.location,
            createdAt: new Date(),
          })
          .returning();
      }

      if (restored) {
        await replaceMenuItemsTx(executor, restored.id, toMenuDesiredFromSnapshot(snapshot.items));
      }

      return {
        operation: "restore",
        status: restored ? "success" : "failed",
        error: restored ? null : "solution_kit_rollback_menu_restore_failed",
        beforeSnapshot,
        afterSnapshot: restored ? await snapshotMenu(executor, restored) : null,
        rollbackAction: { strategy: "none" },
      };
    }
    default:
      return {
        operation: "restore",
        status: "failed",
        error: "solution_kit_rollback_resource_type_invalid",
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: { strategy: "none" },
      };
  }
};

const executeRollbackForItem = async (
  executor: QueryExecutor,
  item: SolutionKitInstallItemRecord
) => {
  if (item.status !== "success") {
    return {
      operation: "noop" as const,
      status: "skipped" as const,
      error: null,
      beforeSnapshot: item.beforeSnapshot,
      afterSnapshot: item.afterSnapshot,
      rollbackAction: { strategy: "none" },
    };
  }

  if (item.operation === "create") {
    return rollbackCreatedResource(executor, item);
  }

  if (item.operation === "update") {
    return rollbackUpdatedResource(executor, item);
  }

  return {
    operation: "noop" as const,
    status: "skipped" as const,
    error: null,
    beforeSnapshot: item.beforeSnapshot,
    afterSnapshot: item.afterSnapshot,
    rollbackAction: { strategy: "none" },
  };
};

export async function listSolutionKitInstallRuns(options?: {
  kitId?: string;
  mode?: SolutionKitInstallMode;
  limit?: number;
}) {
  const filters = [];
  if (options?.kitId) filters.push(eq(solutionKitInstallRuns.kitId, options.kitId));
  if (options?.mode) filters.push(eq(solutionKitInstallRuns.mode, options.mode));

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(Math.round(options.limit), 200))
      : 50;

  const rows = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(limit);

  return rows.map(normalizeRunRow);
}

export async function getSolutionKitInstallRun(runId: string) {
  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.id, runId));
  return row ? normalizeRunRow(row) : null;
}

export async function listSolutionKitInstallItems(runId: string) {
  const rows = await db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.createdAt));

  return rows.map(normalizeItemRow);
}

export async function applySolutionKitInstall(
  input: ApplySolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const definition = resolveKitDefinition(input.kitId, input.kitDefinitionOverride);
  const operations = planOperations(definition.resourceBlueprint);
  const mode: SolutionKitInstallMode = input.dryRun ? "dry_run" : "apply";
  const continueOnError = input.continueOnError ?? true;
  const run = await createInstallRun({
    kitId: definition.id,
    mode,
    actorId: input.actorId ?? null,
    options: {
      continueOnError,
      operationCount: operations.length,
      ...asRecord(input.runOptions),
    },
  });

  const items: SolutionKitInstallItemRecord[] = [];
  let failureCount = 0;

  for (const operation of operations) {
    try {
      const result = input.dryRun
        ? await executeInstallOperation(db, operation, true)
        : await db.transaction((tx) =>
            executeInstallOperation(tx as QueryExecutor, operation, false)
          );

      const item = await appendInstallItem(run.id, {
        position: operation.position,
        resourceType: operation.resourceType,
        resourceKey: operation.resourceKey,
        operation: result.operation,
        status: input.dryRun ? "planned" : "success",
        beforeSnapshot: result.beforeSnapshot,
        afterSnapshot: result.afterSnapshot,
        rollbackAction: result.rollbackAction,
        error: null,
      });
      items.push(item);
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error ? error.message : "solution_kit_operation_failed";
      const item = await appendInstallItem(run.id, {
        position: operation.position,
        resourceType: operation.resourceType,
        resourceKey: operation.resourceKey,
        operation: "noop",
        status: "failed",
        error: message,
      });
      items.push(item);
      if (!continueOnError) break;
    }
  }

  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  const finalizedRun = await finalizeInstallRun(run.id, {
    status: finalStatus,
    summary,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.apply",
    targetType: "solution_kit",
    targetId: definition.id,
    metadata: {
      runId: finalizedRun.id,
      mode,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}

const resolveRollbackSourceRun = async (input: RollbackSolutionKitInstallInput) => {
  if (input.sourceRunId) {
    const [row] = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, input.sourceRunId));
    if (!row) throw new Error("solution_kit_install_run_not_found");
    if (row.mode !== "apply") throw new Error("solution_kit_rollback_invalid_source");
    return normalizeRunRow(row);
  }

  if (!input.kitId) throw new Error("solution_kit_rollback_source_required");

  const [row] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(
      and(
        eq(solutionKitInstallRuns.kitId, input.kitId),
        eq(solutionKitInstallRuns.mode, "apply"),
        eq(solutionKitInstallRuns.status, "success")
      )
    )
    .orderBy(desc(solutionKitInstallRuns.createdAt))
    .limit(1);

  if (!row) throw new Error("solution_kit_rollback_source_not_found");
  return normalizeRunRow(row);
};

export async function rollbackSolutionKitInstall(
  input: RollbackSolutionKitInstallInput
): Promise<SolutionKitInstallResult> {
  const sourceRun = await resolveRollbackSourceRun(input);
  const sourceItems = await listSolutionKitInstallItems(sourceRun.id);
  const continueOnError = input.continueOnError ?? true;
  const rollbackRun = await createInstallRun({
    kitId: sourceRun.kitId,
    mode: "rollback",
    actorId: input.actorId ?? null,
    rollbackOfRunId: sourceRun.id,
    options: {
      sourceRunId: sourceRun.id,
      continueOnError,
      operationCount: sourceItems.length,
    },
  });

  const items: SolutionKitInstallItemRecord[] = [];
  let failureCount = 0;

  const ordered = [...sourceItems].sort((left, right) => right.position - left.position);

  for (let index = 0; index < ordered.length; index += 1) {
    const sourceItem = ordered[index];
    try {
      const result = await db.transaction((tx) =>
        executeRollbackForItem(tx as QueryExecutor, sourceItem)
      );
      if (result.status === "failed") failureCount += 1;

      const item = await appendInstallItem(rollbackRun.id, {
        position: index,
        resourceType: sourceItem.resourceType,
        resourceKey: sourceItem.resourceKey,
        operation: result.operation,
        status: result.status,
        beforeSnapshot: result.beforeSnapshot,
        afterSnapshot: result.afterSnapshot,
        rollbackAction: result.rollbackAction,
        error: result.error,
      });
      items.push(item);

      if (result.status === "failed" && !continueOnError) break;
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error ? error.message : "solution_kit_rollback_operation_failed";

      const failedItem = await appendInstallItem(rollbackRun.id, {
        position: index,
        resourceType: sourceItem.resourceType,
        resourceKey: sourceItem.resourceKey,
        operation: "restore",
        status: "failed",
        error: message,
      });
      items.push(failedItem);
      if (!continueOnError) break;
    }
  }

  const summary = buildSummary(items);
  const finalStatus: SolutionKitInstallStatus = failureCount > 0 ? "failed" : "success";
  const finalizedRun = await finalizeInstallRun(rollbackRun.id, {
    status: finalStatus,
    summary,
    error: failureCount > 0 ? `failed_operations:${failureCount}` : null,
  });

  await logAudit({
    actorId: input.actorId ?? null,
    action: "solution_kits.rollback",
    targetType: "solution_kit_install_run",
    targetId: sourceRun.id,
    metadata: {
      rollbackRunId: finalizedRun.id,
      status: finalizedRun.status,
      summary,
    },
  });

  return {
    run: finalizedRun,
    items,
    summary,
  };
}
