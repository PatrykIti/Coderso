import { and, desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { contentEntries, pages, seoDocuments } from "../../db/schema";
import {
  type SeoDocument,
  type SeoIssue,
  type SeoListItem,
  type SeoStatus,
  type SeoTargetType,
  type SeoUpsertInput,
} from "./seoTypes";

type TargetRow = {
  id: string;
  title: string;
  slug: string | null;
  targetType: SeoTargetType;
};

const normalizeSlug = (value: string | null) => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
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
  return 10;
};

const robotsScore = (robots: string | null, issues: SeoIssue[]) => {
  if (!robots) {
    issues.push(toIssue("robots_missing", "warning", "Robots tag is missing."));
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

  results.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return results;
}

export async function listExistingSeoDocuments(): Promise<SeoListItem[]> {
  const [targets, rows] = await Promise.all([
    loadTargets(),
    db.select().from(seoDocuments).orderBy(desc(seoDocuments.updatedAt)),
  ]);
  const targetByKey = new Map(
    targets.map((target) => [`${target.targetType}:${target.id}`, target])
  );

  return rows.map((row) => {
    const doc = mapDocument(row);
    const target = targetByKey.get(`${doc.targetType}:${doc.targetId}`);
    return {
      ...doc,
      targetTitle: target?.title ?? doc.title ?? doc.slug ?? doc.targetId,
    };
  });
}

export async function getSeoDocument(id: string): Promise<SeoDocument | null> {
  const [row] = await db.select().from(seoDocuments).where(eq(seoDocuments.id, id));
  return row ? mapDocument(row) : null;
}

export async function getSeoDocumentByTarget(
  targetType: SeoTargetType,
  targetId: string
): Promise<SeoDocument | null> {
  const [row] = await db
    .select()
    .from(seoDocuments)
    .where(and(eq(seoDocuments.targetType, targetType), eq(seoDocuments.targetId, targetId)));
  return row ? mapDocument(row) : null;
}

export async function upsertSeoDocument(input: SeoUpsertInput) {
  const existing = await getSeoDocumentByTarget(input.targetType, input.targetId);
  if (existing) {
    const [row] = await db
      .update(seoDocuments)
      .set({
        slug: input.slug ?? existing.slug,
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        canonicalUrl: input.canonicalUrl ?? existing.canonicalUrl,
        robots: input.robots ?? existing.robots,
        updatedAt: new Date(),
      })
      .where(eq(seoDocuments.id, existing.id))
      .returning();
    return row ? mapDocument(row) : null;
  }

  const [row] = await db
    .insert(seoDocuments)
    .values({
      targetType: input.targetType,
      targetId: input.targetId,
      slug: input.slug ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      robots: input.robots ?? null,
      status: "warning",
      issues: [],
    })
    .returning();
  return row ? mapDocument(row) : null;
}

export async function updateSeoDocumentById(
  id: string,
  input: Pick<SeoUpsertInput, "title" | "description" | "canonicalUrl" | "robots">
): Promise<SeoDocument | null> {
  const [row] = await db
    .update(seoDocuments)
    .set({
      title: input.title ?? null,
      description: input.description ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      robots: input.robots ?? null,
      updatedAt: new Date(),
    })
    .where(eq(seoDocuments.id, id))
    .returning();
  return row ? mapDocument(row) : null;
}

export async function deleteSeoDocument(id: string): Promise<SeoDocument | null> {
  const [row] = await db.delete(seoDocuments).where(eq(seoDocuments.id, id)).returning();
  return row ? mapDocument(row) : null;
}

export async function runSeoAudit(targetType?: SeoTargetType, targetId?: string) {
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
    const issues: SeoIssue[] = [];
    let score = 0;
    score += titleScore(row.title ?? null, issues);
    score += descriptionScore(row.description ?? null, issues);
    score += canonicalScore(row.canonicalUrl ?? null, issues);
    score += robotsScore(row.robots ?? null, issues);

    const status = deriveStatus(issues);
    await db
      .update(seoDocuments)
      .set({
        score,
        status,
        issues,
        lastAuditAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(seoDocuments.id, row.id));
    audited += 1;
  }

  return { audited };
}
