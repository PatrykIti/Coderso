import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { contentEntries, pages, seoDocuments } from "../../db/schema";
import { clearSiteCache } from "../../site/cache/siteCache";
import {
  type PublicSeoMetadata,
  type SeoAuditCheckId,
  type SeoDocument,
  type SeoIssue,
  type SeoListItem,
  type SeoStatus,
  type SeoTargetType,
  type SeoUpsertInput,
  seoAuditCheckIds,
} from "./seoTypes";

type TargetRow = {
  id: string;
  title: string;
  slug: string | null;
  targetType: SeoTargetType;
};

type SeoExecutor = Pick<typeof db, "select" | "insert" | "update">;

const SEO_DOCUMENT_FIELDS = {
  id: seoDocuments.id,
  targetType: seoDocuments.targetType,
  targetId: seoDocuments.targetId,
  slug: seoDocuments.slug,
  title: seoDocuments.title,
  description: seoDocuments.description,
  canonicalUrl: seoDocuments.canonicalUrl,
  robots: seoDocuments.robots,
  score: seoDocuments.score,
  status: seoDocuments.status,
  issues: seoDocuments.issues,
  lastAuditAt: seoDocuments.lastAuditAt,
  createdAt: seoDocuments.createdAt,
  updatedAt: seoDocuments.updatedAt,
} as const;

const normalizeSlug = (value: string | null) => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
};

const normalizeNullableText = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePublicCanonicalUrl = (value: string | null | undefined) => {
  const trimmed = normalizeNullableText(value);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return null;
};

const normalizePublicRobots = (value: string | null | undefined) => {
  const trimmed = normalizeNullableText(value);
  if (!trimmed) return null;
  if (trimmed.length > 120 || /[<>"']/.test(trimmed)) return null;
  return trimmed;
};

const normalizeCanonicalForStorage = (value: string | null | undefined) => {
  const trimmed = normalizeNullableText(value);
  if (!trimmed) return null;
  const normalized = normalizePublicCanonicalUrl(trimmed);
  if (!normalized) throw new Error("seo_canonical_invalid");
  return normalized;
};

const normalizeRobotsForStorage = (value: string | null | undefined) => {
  const trimmed = normalizeNullableText(value);
  if (!trimmed) return null;
  const normalized = normalizePublicRobots(trimmed);
  if (!normalized) throw new Error("seo_robots_invalid");
  return normalized;
};

const targetLookupKeys = (target: TargetRow) => {
  const keys = new Set([`${target.targetType}:${target.id}`]);
  if (target.slug) {
    keys.add(`${target.targetType}:${target.slug}`);
    keys.add(`${target.targetType}:${target.slug.replace(/^\//, "")}`);
  }
  return [...keys];
};

const toIssue = (code: string, severity: SeoIssue["severity"], message: string): SeoIssue => ({
  code,
  severity,
  message,
});

const titleScore = (title: string | null, issues: SeoIssue[]) => {
  if (!title || title.trim().length === 0) {
    issues.push(toIssue("title_missing", "error", "Missing title."));
    return 0;
  }
  const length = title.trim().length;
  if (length < 30) {
    issues.push(toIssue("title_short", "warning", "Title is shorter than recommended."));
    return 20;
  }
  if (length > 60) {
    issues.push(toIssue("title_long", "warning", "Title is longer than recommended."));
    return 20;
  }
  return 40;
};

const descriptionScore = (description: string | null, issues: SeoIssue[]) => {
  if (!description || description.trim().length === 0) {
    issues.push(toIssue("description_missing", "error", "Missing description."));
    return 0;
  }
  const length = description.trim().length;
  if (length < 70) {
    issues.push(toIssue("description_short", "warning", "Description too short."));
    return 20;
  }
  if (length > 160) {
    issues.push(toIssue("description_long", "warning", "Description too long."));
    return 20;
  }
  return 40;
};

const canonicalScore = (canonicalUrl: string | null, issues: SeoIssue[]) => {
  if (!canonicalUrl) {
    issues.push(toIssue("canonical_missing", "warning", "Canonical URL is missing."));
    return 0;
  }
  if (!normalizePublicCanonicalUrl(canonicalUrl)) {
    issues.push(toIssue("canonical_invalid", "warning", "Canonical URL is invalid."));
    return 0;
  }
  return 10;
};

const robotsScore = (robots: string | null, issues: SeoIssue[]) => {
  if (!robots) {
    issues.push(toIssue("robots_missing", "warning", "Robots tag is missing."));
    return 0;
  }
  if (!normalizePublicRobots(robots)) {
    issues.push(toIssue("robots_invalid", "warning", "Robots directive is invalid."));
    return 0;
  }
  return 10;
};

const deriveStatus = (issues: SeoIssue[]): SeoStatus => {
  if (issues.some((issue) => issue.severity === "error")) return "issue";
  if (issues.length > 0) return "warning";
  return "ok";
};

const mapDocument = (row: typeof seoDocuments.$inferSelect): SeoDocument => ({
  id: row.id,
  targetType: row.targetType as SeoTargetType,
  targetId: row.targetId,
  slug: row.slug ?? null,
  title: row.title ?? null,
  description: row.description ?? null,
  canonicalUrl: row.canonicalUrl ?? null,
  robots: row.robots ?? null,
  score: row.score ?? null,
  status: row.status as SeoStatus,
  issues: (row.issues as SeoIssue[]) ?? [],
  lastAuditAt: row.lastAuditAt ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const defaultSeoAuditChecks = [...seoAuditCheckIds];

export const isSeoAuditCheckId = (value: unknown): value is SeoAuditCheckId =>
  typeof value === "string" && seoAuditCheckIds.includes(value as SeoAuditCheckId);

export const normalizeSeoAuditChecks = (
  checks?: readonly SeoAuditCheckId[] | null
): SeoAuditCheckId[] => {
  if (!checks) return [...defaultSeoAuditChecks];
  if (checks.length === 0) throw new Error("seo_audit_checks_required");
  const selected = [...new Set(checks.filter(isSeoAuditCheckId))];
  if (selected.length === 0) {
    throw new Error("seo_audit_checks_required");
  }
  return selected;
};

export function analyzeSeoDocument(
  input: Pick<SeoUpsertInput, "title" | "description" | "canonicalUrl" | "robots">,
  checks: readonly SeoAuditCheckId[] = defaultSeoAuditChecks
) {
  const selectedChecks = normalizeSeoAuditChecks(checks);
  const issues: SeoIssue[] = [];
  let score = 0;
  let maxScore = 0;

  if (selectedChecks.includes("meta")) {
    maxScore += 80;
    score += titleScore(normalizeNullableText(input.title), issues);
    score += descriptionScore(normalizeNullableText(input.description), issues);
  }

  if (selectedChecks.includes("links")) {
    maxScore += 10;
    score += canonicalScore(normalizeNullableText(input.canonicalUrl), issues);
  }

  if (selectedChecks.includes("robots")) {
    maxScore += 10;
    score += robotsScore(normalizeNullableText(input.robots), issues);
  }

  const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score: normalizedScore,
    status: deriveStatus(issues),
    issues,
  };
}

type MutableSeoAnalysis = ReturnType<typeof analyzeSeoDocument>;

export type SeoAnalysis = Readonly<
  Omit<MutableSeoAnalysis, "issues"> & {
    readonly issues: readonly SeoIssue[];
  }
>;

export type PreparedSeoMutation = Readonly<{
  targetType: SeoTargetType;
  targetId: string;
  existingId: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  analysis: SeoAnalysis;
}>;

const freezeSeoAnalysis = (input: MutableSeoAnalysis): SeoAnalysis =>
  Object.freeze({
    ...input,
    issues: Object.freeze(input.issues.map((issue) => Object.freeze({ ...issue }))),
  });

export function prepareSeoMutation(
  input: SeoUpsertInput,
  existing: SeoDocument | null
): PreparedSeoMutation {
  const slug = existing ? (input.slug ?? existing.slug) : (input.slug ?? null);
  const title =
    existing && input.title === undefined ? existing.title : normalizeNullableText(input.title);
  const description =
    existing && input.description === undefined
      ? existing.description
      : normalizeNullableText(input.description);
  const canonicalUrl =
    existing && input.canonicalUrl === undefined
      ? existing.canonicalUrl
      : normalizeCanonicalForStorage(input.canonicalUrl);
  const robots =
    existing && input.robots === undefined
      ? existing.robots
      : normalizeRobotsForStorage(input.robots);
  const analysis = freezeSeoAnalysis(
    analyzeSeoDocument({ title, description, canonicalUrl, robots })
  );

  return Object.freeze({
    targetType: input.targetType,
    targetId: input.targetId,
    existingId: existing?.id ?? null,
    slug,
    title,
    description,
    canonicalUrl,
    robots,
    analysis,
  });
}

const resolvePublicSeoValue = (
  documentValue: string | null | undefined,
  fallbackValue: string | null | undefined,
  normalizer: (value: string | null | undefined) => string | null = normalizeNullableText
) => normalizer(documentValue) ?? normalizer(fallbackValue);

async function loadTargets(): Promise<TargetRow[]> {
  const pagesRows = await db
    .select({ id: pages.id, title: pages.title, slug: pages.slug })
    .from(pages);
  const entryRows = await db
    .select({ id: contentEntries.id, title: contentEntries.title, slug: contentEntries.slug })
    .from(contentEntries);

  return [
    ...pagesRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: normalizeSlug(row.slug),
      targetType: "page" as const,
    })),
    ...entryRows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: normalizeSlug(row.slug),
      targetType: "entry" as const,
    })),
  ];
}

async function ensureSeoDocuments(targets: TargetRow[]) {
  const rows = await db.select().from(seoDocuments);
  const byTarget = new Map<string, typeof seoDocuments.$inferSelect>();

  for (const row of rows) {
    byTarget.set(`${row.targetType}:${row.targetId}`, row);
  }

  const inserts: Array<typeof seoDocuments.$inferInsert> = [];
  const slugUpdates: Array<{ id: string; slug: string | null }> = [];

  for (const target of targets) {
    const key = `${target.targetType}:${target.id}`;
    const existing = byTarget.get(key);
    if (!existing) {
      inserts.push({
        targetType: target.targetType,
        targetId: target.id,
        slug: target.slug,
        title: target.title,
        description: null,
        canonicalUrl: null,
        robots: null,
        status: "warning",
        issues: [],
      });
      continue;
    }
    if ((existing.slug ?? null) !== target.slug) {
      slugUpdates.push({ id: existing.id, slug: target.slug });
    }
  }

  if (inserts.length > 0) {
    const inserted = await db.insert(seoDocuments).values(inserts).returning();
    for (const row of inserted) {
      byTarget.set(`${row.targetType}:${row.targetId}`, row);
    }
  }

  for (const update of slugUpdates) {
    await db
      .update(seoDocuments)
      .set({ slug: update.slug, updatedAt: new Date() })
      .where(eq(seoDocuments.id, update.id));
  }

  return byTarget;
}

export async function listSeoDocuments(): Promise<SeoListItem[]> {
  const targets = await loadTargets();
  const byTarget = await ensureSeoDocuments(targets);

  const results: SeoListItem[] = targets
    .map((target) => {
      const doc = byTarget.get(`${target.targetType}:${target.id}`);
      if (!doc) return null;
      return {
        ...mapDocument(doc),
        targetTitle: target.title,
      } satisfies SeoListItem;
    })
    .filter((item): item is SeoListItem => item !== null);

  results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return results;
}

export async function listExistingSeoDocuments(): Promise<SeoListItem[]> {
  const [targets, rows] = await Promise.all([
    loadTargets(),
    db.select().from(seoDocuments).orderBy(desc(seoDocuments.updatedAt)),
  ]);
  const targetByKey = new Map<string, TargetRow>();
  for (const target of targets) {
    for (const key of targetLookupKeys(target)) {
      targetByKey.set(key, target);
    }
  }

  return rows
    .map((row) => {
      const doc = mapDocument(row);
      const target =
        targetByKey.get(`${doc.targetType}:${doc.targetId}`) ??
        (doc.slug ? targetByKey.get(`${doc.targetType}:${doc.slug}`) : undefined) ??
        (doc.slug
          ? targetByKey.get(`${doc.targetType}:${doc.slug.replace(/^\//, "")}`)
          : undefined);
      return {
        ...doc,
        targetTitle: target?.title ?? doc.title ?? doc.slug ?? doc.targetId,
        targetFound: Boolean(target),
      };
    })
    .sort((left, right) => {
      if (left.targetFound !== right.targetFound) return left.targetFound ? -1 : 1;
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .map(({ targetFound: _targetFound, ...item }) => item);
}

export async function getSeoDocument(id: string): Promise<SeoDocument | null> {
  const [row] = await db.select().from(seoDocuments).where(eq(seoDocuments.id, id));
  return row ? mapDocument(row) : null;
}

export async function getSeoDocumentByTargetWithExecutor(
  executor: SeoExecutor,
  targetType: SeoTargetType,
  targetId: string
): Promise<SeoDocument | null> {
  const [row] = await executor
    .select(SEO_DOCUMENT_FIELDS)
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, targetType), eq(seoDocuments.targetId, targetId)));
  return row ? mapDocument(row) : null;
}

export async function getSeoDocumentByTarget(
  targetType: SeoTargetType,
  targetId: string
): Promise<SeoDocument | null> {
  return getSeoDocumentByTargetWithExecutor(db, targetType, targetId);
}

export async function resolvePublicSeoMetadata(input: {
  targetType: SeoTargetType;
  targetId?: string | null;
  slug?: string | null;
  fallback?: Partial<PublicSeoMetadata> | null;
}): Promise<PublicSeoMetadata> {
  const normalizedSlug = normalizeSlug(input.slug ?? null);
  const conditions = [];
  if (input.targetId) {
    conditions.push(
      and(eq(seoDocuments.targetType, input.targetType), eq(seoDocuments.targetId, input.targetId))
    );
  } else if (normalizedSlug) {
    conditions.push(
      and(eq(seoDocuments.targetType, input.targetType), eq(seoDocuments.slug, normalizedSlug))
    );
    conditions.push(
      and(
        eq(seoDocuments.targetType, input.targetType),
        eq(seoDocuments.slug, normalizedSlug.replace(/^\//, ""))
      )
    );
  }

  let document: SeoDocument | null = null;
  for (const condition of conditions) {
    if (!condition) continue;
    const [row] = await db.select().from(seoDocuments).where(condition).limit(1);
    if (row) {
      document = mapDocument(row);
      break;
    }
  }

  const fallback = input.fallback ?? null;
  return {
    title: resolvePublicSeoValue(document?.title, fallback?.title),
    description: resolvePublicSeoValue(document?.description, fallback?.description),
    canonicalUrl: resolvePublicSeoValue(
      document?.canonicalUrl,
      fallback?.canonicalUrl,
      normalizePublicCanonicalUrl
    ),
    robots: resolvePublicSeoValue(document?.robots, fallback?.robots, normalizePublicRobots),
  };
}

export async function prepareSeoMutationWithExecutor(
  executor: SeoExecutor,
  input: SeoUpsertInput
): Promise<PreparedSeoMutation> {
  const existing = await getSeoDocumentByTargetWithExecutor(
    executor,
    input.targetType,
    input.targetId
  );
  return prepareSeoMutation(input, existing);
}

export async function applyPreparedSeoMutationWithExecutor(
  executor: SeoExecutor,
  plan: PreparedSeoMutation
): Promise<SeoDocument | null> {
  const values = {
    slug: plan.slug,
    title: plan.title,
    description: plan.description,
    canonicalUrl: plan.canonicalUrl,
    robots: plan.robots,
    score: plan.analysis.score,
    status: plan.analysis.status,
    issues: plan.analysis.issues,
  };

  if (plan.existingId) {
    const [row] = await executor
      .update(seoDocuments)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(seoDocuments.id, plan.existingId))
      .returning(SEO_DOCUMENT_FIELDS);
    return row ? mapDocument(row) : null;
  }

  const [row] = await executor
    .insert(seoDocuments)
    .values({
      targetType: plan.targetType,
      targetId: plan.targetId,
      ...values,
    })
    .returning(SEO_DOCUMENT_FIELDS);
  return row ? mapDocument(row) : null;
}

export async function upsertSeoDocumentWithExecutor(
  executor: SeoExecutor,
  input: SeoUpsertInput
): Promise<SeoDocument | null> {
  const plan = await prepareSeoMutationWithExecutor(executor, input);
  return applyPreparedSeoMutationWithExecutor(executor, plan);
}

export async function upsertSeoDocument(input: SeoUpsertInput): Promise<SeoDocument | null> {
  const plan = await prepareSeoMutationWithExecutor(db, input);
  const result = await applyPreparedSeoMutationWithExecutor(db, plan);
  if (result) clearSiteCache();
  return result;
}

export async function updateSeoDocumentById(
  id: string,
  input: Pick<SeoUpsertInput, "title" | "description" | "canonicalUrl" | "robots">
): Promise<SeoDocument | null> {
  const existing = await getSeoDocument(id);
  if (!existing) return null;
  const next = {
    title: input.title !== undefined ? normalizeNullableText(input.title) : existing.title,
    description:
      input.description !== undefined
        ? normalizeNullableText(input.description)
        : existing.description,
    canonicalUrl:
      input.canonicalUrl !== undefined
        ? normalizeCanonicalForStorage(input.canonicalUrl)
        : existing.canonicalUrl,
    robots: input.robots !== undefined ? normalizeRobotsForStorage(input.robots) : existing.robots,
  };
  const analysis = analyzeSeoDocument(next);
  const [row] = await db
    .update(seoDocuments)
    .set({
      ...next,
      ...analysis,
      updatedAt: new Date(),
    })
    .where(eq(seoDocuments.id, id))
    .returning();
  if (row) clearSiteCache();
  return row ? mapDocument(row) : null;
}

export async function deleteSeoDocument(id: string): Promise<SeoDocument | null> {
  const [row] = await db.delete(seoDocuments).where(eq(seoDocuments.id, id)).returning();
  if (row) clearSiteCache();
  return row ? mapDocument(row) : null;
}

export async function runSeoAudit(
  targetType?: SeoTargetType,
  targetId?: string,
  checks?: readonly SeoAuditCheckId[]
) {
  const selectedChecks = normalizeSeoAuditChecks(checks);
  const targets = await loadTargets();
  await ensureSeoDocuments(targets);

  const baseQuery = db.select().from(seoDocuments);
  const rows =
    targetType && targetId
      ? await baseQuery.where(
          and(eq(seoDocuments.targetType, targetType), eq(seoDocuments.targetId, targetId))
        )
      : await baseQuery;

  let audited = 0;
  for (const row of rows) {
    const analysis = analyzeSeoDocument(
      {
        title: row.title ?? null,
        description: row.description ?? null,
        canonicalUrl: row.canonicalUrl ?? null,
        robots: row.robots ?? null,
      },
      selectedChecks
    );
    await db
      .update(seoDocuments)
      .set({
        ...analysis,
        lastAuditAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(seoDocuments.id, row.id));
    audited += 1;
  }

  return { audited };
}
