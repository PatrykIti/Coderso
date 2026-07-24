import { isDeepStrictEqual } from "node:util";
import { and, asc, eq, inArray } from "drizzle-orm";
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
import {
  createDefaultPageDocumentV2,
  normalizePageDocumentV2ForWrite,
} from "../pages/pageDocumentV2";
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
import type { FullSiteInstallResourceKind } from "./fullSiteInstallTypes";

export type JsonRecord = Record<string, unknown>;

export type SolutionKitInstallMode = "dry_run" | "apply" | "rollback";

export type SolutionKitInstallStatus = "running" | "success" | "failed";

export type SolutionKitInstallItemStatus = "planned" | "success" | "failed" | "skipped";

export type SolutionKitInstallItemOperation = "create" | "update" | "noop" | "delete" | "restore";

export type SolutionKitInstallResourceType = Extract<
  FullSiteInstallResourceKind,
  "content_type" | "form" | "page" | "menu"
>;

export type SolutionKitInstallRunRow = typeof solutionKitInstallRuns.$inferSelect;

export type SolutionKitInstallItemRow = typeof solutionKitInstallItems.$inferSelect;

export type ContentTypeRow = typeof contentTypes.$inferSelect;

export type ContentTaxonomyRow = typeof contentTaxonomies.$inferSelect;

export type ContentTermRow = typeof contentTerms.$inferSelect;

export type FormRow = typeof forms.$inferSelect;

export type PageRow = typeof pages.$inferSelect;

export type SeoDocumentRow = typeof seoDocuments.$inferSelect;

export type MenuRow = typeof menus.$inferSelect;

export type ContentTypeSnapshot = {
  id: string;
  name: string;
  slug: string;
  schema: JsonRecord;
  status: "draft" | "published";
  taxonomy: {
    categories: Array<{ id: string; name: string; slug: string }>;
    tags: Array<{ id: string; name: string; slug: string }>;
  };
};

export type FormFieldSnapshot = {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: JsonRecord;
};

export type FormFieldDesired = {
  id?: string | null;
  type: string;
  label: string;
  name: string;
  required: boolean;
  orderIndex: number;
  settings: JsonRecord;
};

export type FormSnapshot = {
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

export type SeoSnapshot = {
  id: string;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
};

export type PageSnapshot = {
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

export type MenuItemSnapshot = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings: JsonRecord;
};

export type MenuItemDesired = {
  id?: string | null;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  settings: JsonRecord;
};

export type MenuSnapshot = {
  id: string;
  name: string;
  location: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  items: MenuItemSnapshot[];
};

export type InstallPlanOperation =
  | {
      position: number;
      resourceType: "content_type";
      resourceKey: string;
      payload: {
        slug: string;
        name: string;
        status: "draft" | "published";
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

export type InstallOperationResult = {
  operation: SolutionKitInstallItemOperation;
  beforeSnapshot: JsonRecord | null;
  afterSnapshot: JsonRecord | null;
  rollbackAction: JsonRecord | null;
};

export type RollbackOperationResult = InstallOperationResult & {
  status: SolutionKitInstallItemStatus;
  error: string | null;
};

export type QueryExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

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

export const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const asRecord = (value: unknown): JsonRecord =>
  isRecord(value) ? (value as JsonRecord) : {};

export const toIsoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

export const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizePageSlug = (value: unknown) => {
  if (typeof value !== "string") throw new Error("solution_kit_page_slug_invalid");
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "/") return "/";
  const withoutLead = trimmed.replace(/^\/+/, "");
  const withoutTrail = withoutLead.replace(/\/+$/, "");
  return withoutTrail.length > 0 ? withoutTrail : "/";
};

export const pageSlugCandidates = (slug: string) => (slug === "/" ? ["/", ""] : [slug, `/${slug}`]);

export const defaultContentTypeSchema = (): JsonRecord => ({
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
  },
  required: [],
});

export const defaultFormSettings = (): JsonRecord => ({
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

export const toJsonRecord = (value: unknown): JsonRecord => value as JsonRecord;

export const normalizeKitPageData = (value: unknown): JsonRecord =>
  toJsonRecord(normalizePageDocumentV2ForWrite(value));

export const defaultPageData = (): JsonRecord => toJsonRecord(createDefaultPageDocumentV2());

export const normalizeTaxonomyTerms = (items?: SolutionKitTaxonomyTerm[]) => {
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

export const normalizeContentTypeBlueprint = (value: SolutionKitContentTypeBlueprint) => ({
  slug: normalizeString(value.slug),
  name: normalizeString(value.name),
  status: (value.status === "published" ? "published" : "draft") as "draft" | "published",
  schema: isRecord(value.schema) ? asRecord(value.schema) : defaultContentTypeSchema(),
  taxonomy: {
    categories: normalizeTaxonomyTerms(value.taxonomy?.categories),
    tags: normalizeTaxonomyTerms(value.taxonomy?.tags),
  },
});

export const normalizeFormFieldsBlueprint = (
  value: SolutionKitFormBlueprint["fields"]
): FormFieldDesired[] => {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((field, index) => ({
      id: typeof field.id === "string" ? normalizeString(field.id) : null,
      type: normalizeString(field.type) ?? "text",
      label: normalizeString(field.label) ?? `Field ${index + 1}`,
      name: normalizeString(field.name) ?? `field_${index + 1}`,
      required: Boolean(field.required),
      orderIndex:
        typeof field.orderIndex === "number" && Number.isFinite(field.orderIndex)
          ? Math.round(field.orderIndex)
          : index,
      settings: isRecord(field.settings) ? asRecord(field.settings) : {},
    }))
    .sort((left, right) => left.orderIndex - right.orderIndex);
};

export const normalizeFormBlueprint = (value: SolutionKitFormBlueprint) => {
  const status: "draft" | "published" = value.status === "published" ? "published" : "draft";
  const submissionAccess: "public" | "internal" =
    value.submissionAccess === "internal" ? "internal" : "public";
  return {
    slug: normalizeString(value.slug),
    name: normalizeString(value.name),
    status,
    description: typeof value.description === "string" ? normalizeString(value.description) : null,
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

export const normalizeSeoDefaults = (value: SolutionKitSeoDefaults | undefined | null) => {
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

export const normalizePageBlueprint = (value: SolutionKitPageBlueprint) => {
  const status: "draft" | "published" = value.status === "published" ? "published" : "draft";
  const sourceData = isRecord(value.data) ? asRecord(value.data) : defaultPageData();
  return {
    slug: normalizePageSlug(value.slug),
    title: normalizeString(value.title),
    status,
    currentData: normalizeKitPageData(sourceData),
    seo: normalizeSeoDefaults(value.seo),
  };
};

export const collectFormIdReferences = (value: unknown, refs: Set<string>) => {
  if (Array.isArray(value)) {
    for (const item of value) collectFormIdReferences(item, refs);
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    if (key === "formId" && typeof nested === "string") {
      const formId = normalizeString(nested);
      if (formId) refs.add(formId);
    }
    collectFormIdReferences(nested, refs);
  }
};

export const replaceFormIdReferences = (
  value: unknown,
  replacements: Map<string, string>
): unknown => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const replaced = replaceFormIdReferences(item, replacements);
      if (replaced !== item) changed = true;
      return replaced;
    });
    return changed ? next : value;
  }

  if (!isRecord(value)) return value;

  let changed = false;
  const next: JsonRecord = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "formId" && typeof nested === "string") {
      const normalized = normalizeString(nested);
      const replacement = normalized ? replacements.get(normalized) : undefined;
      next[key] = replacement ?? nested;
      if (next[key] !== nested) changed = true;
      continue;
    }

    const replaced = replaceFormIdReferences(nested, replacements);
    next[key] = replaced;
    if (replaced !== nested) changed = true;
  }

  return changed ? next : value;
};

export const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const resolvePageFormReferences = async (
  executor: QueryExecutor,
  currentData: JsonRecord
): Promise<JsonRecord> => {
  const refs = new Set<string>();
  collectFormIdReferences(currentData, refs);
  const candidates = [...refs];
  if (candidates.length === 0) return currentData;

  const idCandidates = candidates.filter(isUuidLike);
  const formRowsById =
    idCandidates.length > 0
      ? await executor
          .select({ id: forms.id, slug: forms.slug })
          .from(forms)
          .where(inArray(forms.id, idCandidates))
      : [];
  const knownIds = new Set(formRowsById.map((row) => row.id));
  const slugCandidates = candidates.filter((candidate) => !knownIds.has(candidate));
  if (slugCandidates.length === 0) return currentData;

  const formRowsBySlug = await executor
    .select({ id: forms.id, slug: forms.slug })
    .from(forms)
    .where(inArray(forms.slug, slugCandidates));
  if (formRowsBySlug.length === 0) return currentData;

  const replacements = new Map(formRowsBySlug.map((row) => [row.slug, row.id]));
  const replaced = replaceFormIdReferences(currentData, replacements);
  return isRecord(replaced) ? replaced : currentData;
};

export const normalizeMenuItemsBlueprint = (value: SolutionKitMenuBlueprint["items"]) => {
  if (!Array.isArray(value) || value.length === 0)
    return [] as Array<{
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
      const pageSlug = typeof item?.pageSlug === "string" ? normalizePageSlug(item.pageSlug) : null;
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

export const normalizeMenuBlueprint = (value: SolutionKitMenuBlueprint) => ({
  name: normalizeString(value.name),
  location: normalizeString(value.location),
  items: normalizeMenuItemsBlueprint(value.items),
});

export const snapshotSeo = (row: SeoDocumentRow): SeoSnapshot => ({
  id: row.id,
  title: row.title ?? null,
  description: row.description ?? null,
  canonicalUrl: row.canonicalUrl ?? null,
  robots: row.robots ?? null,
});

export const getSeoForPage = async (
  executor: QueryExecutor,
  pageId: string
): Promise<SeoSnapshot | null> => {
  const [row] = await executor
    .select()
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, pageId)));
  return row ? snapshotSeo(row) : null;
};

export const listTaxonomyState = async (executor: QueryExecutor, typeId: string) => {
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

export const listFormFieldSnapshots = async (
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

export const listMenuItemSnapshots = async (
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

export const snapshotContentType = async (
  executor: QueryExecutor,
  row: ContentTypeRow
): Promise<ContentTypeSnapshot> => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  schema: asRecord(row.schema),
  status: row.status as "draft" | "published",
  taxonomy: await listTaxonomyState(executor, row.id),
});

export const snapshotForm = async (
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

export const snapshotPage = async (
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

export const snapshotMenu = async (
  executor: QueryExecutor,
  row: MenuRow
): Promise<MenuSnapshot> => ({
  id: row.id,
  name: row.name,
  location: row.location,
  status: row.status === "published" ? "published" : "draft",
  publishedAt: toIsoOrNull(row.publishedAt),
  items: await listMenuItemSnapshots(executor, row.id),
});

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const normalizeTermSlug = (name: string, slug?: string | null) =>
  slugify(slug && slug.trim().length > 0 ? slug : name) || "term";

export const toSnapshotTerms = (
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

export const sortTermsBySlug = <T extends { name: string; slug: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const slugCompare = left.slug.localeCompare(right.slug);
    if (slugCompare !== 0) return slugCompare;
    return left.name.localeCompare(right.name);
  });

export const compareTermSets = (
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

export const compareTaxonomyState = (
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

export const compareFormFields = (left: FormFieldDesired[], right: FormFieldDesired[]) => {
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

export const compareSeo = (left: SeoSnapshot | null, right: SolutionKitSeoDefaults | null) => {
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

export const compareMenuItems = (left: MenuItemDesired[], right: MenuItemDesired[]) => {
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

export const getTaxonomyByKind = (rows: ContentTaxonomyRow[], kind: "category" | "tag") =>
  rows.find((row) => row.kind === kind);

export const planOperations = (blueprint: SolutionKitResourceBlueprint): InstallPlanOperation[] => {
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
        status: normalized.status,
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
