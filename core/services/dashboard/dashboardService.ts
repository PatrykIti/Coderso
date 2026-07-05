import { and, asc, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

import { db } from "../../db/client";
import { contentEntries, contentTypes, media, pages, users } from "../../db/schema";
import { getSecuritySettings } from "../settings/securitySettings";
import type { SecuritySettings } from "../settings/securitySettings";
import { resolveEmailValue } from "../security/piiEmail";
import type {
  DashboardPayload,
  DashboardRecentEdit,
  DashboardRecentEditAuthor,
  DashboardRecentEditStatus,
  DashboardSecurityCheck,
  DashboardSecuritySummary,
  DashboardStatus,
  DashboardStorageSummary,
  DashboardTotals,
  DashboardContentQueryConfig,
  DashboardContentTypeCount,
  DashboardTimeBucket,
} from "./dashboardTypes";

const RECENT_EDITS_LIMIT = 10;

const knownContentStatuses = new Set<DashboardRecentEditStatus>([
  "draft",
  "published",
  "scheduled",
  "archived",
  "active",
]);

const ensurePath = (value: string | null | undefined) => {
  if (!value) return null;
  return value.startsWith("/") ? value : `/${value}`;
};

const toIsoString = (value: Date | string) => {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
};

const resolveAuthorEmail = (row: { authorEmailEncrypted?: unknown; authorEmail?: string | null }) =>
  resolveEmailValue({ emailEncrypted: row.authorEmailEncrypted, email: row.authorEmail });

const toStatus = (value: string | null | undefined): DashboardRecentEditStatus => {
  if (!value) return "draft";
  if (knownContentStatuses.has(value as DashboardRecentEditStatus)) {
    return value as DashboardRecentEditStatus;
  }
  return "draft";
};

const toAuthor = (
  id: string | null,
  name: string | null,
  email: string | null
): DashboardRecentEditAuthor => ({
  id,
  name,
  email,
});

async function countRows(table: AnyPgTable, where?: SQL): Promise<number> {
  const base = db.select({ count: sql<number>`count(*)` }).from(table);
  const query = where ? base.where(where) : base;
  const [row] = await query;
  return Number(row?.count ?? 0);
}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  return {
    pages: await countRows(pages),
    entries: await countRows(contentEntries),
    media: await countRows(media),
    users: await countRows(users),
  };
}

export async function getStorageSummary(): Promise<DashboardStorageSummary> {
  const [row] = await db
    .select({
      usedBytes: sql<number>`coalesce(sum(${media.size}), 0)`,
    })
    .from(media);

  const usedBytes = Number(row?.usedBytes ?? 0);
  const limitBytes = null;

  return {
    usedBytes,
    limitBytes,
    usedPercent: calculateUsedPercent(usedBytes, limitBytes),
  };
}

async function getRecentPages(limit: number): Promise<DashboardRecentEdit[]> {
  const rows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      updatedAt: pages.updatedAt,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(pages)
    .leftJoin(users, eq(pages.authorId, users.id))
    .orderBy(desc(pages.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: "page",
    title: row.title,
    path: ensurePath(row.slug),
    status: toStatus(row.status),
    updatedAt: toIsoString(row.updatedAt),
    author: toAuthor(row.authorId ?? null, row.authorName ?? null, resolveAuthorEmail(row)),
  }));
}

async function getRecentEntries(limit: number): Promise<DashboardRecentEdit[]> {
  const rows = await db
    .select({
      id: contentEntries.id,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      updatedAt: contentEntries.updatedAt,
      typeSlug: contentTypes.slug,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(contentEntries)
    .leftJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .orderBy(desc(contentEntries.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: "entry",
    title: row.title,
    path: row.typeSlug ? ensurePath(`${row.typeSlug}/${row.slug}`) : null,
    status: toStatus(row.status),
    updatedAt: toIsoString(row.updatedAt),
    author: toAuthor(row.authorId ?? null, row.authorName ?? null, resolveAuthorEmail(row)),
  }));
}

async function getRecentMedia(limit: number): Promise<DashboardRecentEdit[]> {
  const rows = await db
    .select({
      id: media.id,
      url: media.url,
      key: media.key,
      originalName: media.originalName,
      title: media.title,
      createdAt: media.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(media)
    .leftJoin(users, eq(media.createdBy, users.id))
    .orderBy(desc(media.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: "media",
    title: row.title ?? row.originalName ?? row.key,
    path: row.url ?? null,
    status: "active",
    updatedAt: toIsoString(row.createdAt),
    author: toAuthor(row.authorId ?? null, row.authorName ?? null, resolveAuthorEmail(row)),
  }));
}

export async function getRecentEdits(limit: number): Promise<DashboardRecentEdit[]> {
  const [recentPages, recentEntries, recentMedia] = await Promise.all([
    getRecentPages(limit),
    getRecentEntries(limit),
    getRecentMedia(limit),
  ]);

  const merged = [...recentPages, ...recentEntries, ...recentMedia];
  merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return merged.slice(0, limit);
}

const getOverallStatus = (issues: number): DashboardStatus => {
  if (issues <= 0) return "ok";
  if (issues <= 2) return "warning";
  return "critical";
};

const buildCheck = (
  id: DashboardSecurityCheck["id"],
  label: string,
  ok: boolean,
  okDetail: string,
  warningDetail: string
): DashboardSecurityCheck => ({
  id,
  label,
  status: ok ? "ok" : "warning",
  detail: ok ? okDetail : warningDetail,
});

export function buildSecuritySummary(security: SecuritySettings): DashboardSecuritySummary {
  const csrfEnabled = security.csrf.enabled;
  const buckets = security.rateLimit.buckets;
  const rateLimitEnabled =
    security.rateLimit.enabled &&
    buckets.auth.maxRequests > 0 &&
    buckets.public_write.maxRequests > 0;
  const headersEnabled =
    security.headers.enabled &&
    security.headers.contentTypeOptions &&
    (security.headers.frameOptions === "DENY" || security.headers.frameOptions === "SAMEORIGIN");
  const sessionPolicyOk = security.session.ttlDays <= 30 && security.session.maxPerUser <= 5;

  const checks: DashboardSecurityCheck[] = [
    buildCheck(
      "csrf",
      "CSRF protection",
      csrfEnabled,
      `Enabled (${security.csrf.headerName}).`,
      "Disabled."
    ),
    buildCheck(
      "rateLimit",
      "Rate limiting",
      rateLimitEnabled,
      `Enabled (auth ${buckets.auth.maxRequests}/min, public write ${buckets.public_write.maxRequests}/min).`,
      "Disabled or invalid thresholds."
    ),
    buildCheck(
      "headers",
      "Security headers",
      headersEnabled,
      `Enabled (${security.headers.frameOptions}, nosniff on).`,
      "Disabled or incomplete policy."
    ),
    buildCheck(
      "sessionPolicy",
      "Session policy",
      sessionPolicyOk,
      `TTL ${security.session.ttlDays}d, max ${security.session.maxPerUser} sessions/user.`,
      `TTL ${security.session.ttlDays}d or max ${security.session.maxPerUser} sessions/user is too permissive.`
    ),
  ];

  const issues = checks.filter((check) => check.status !== "ok").length;
  return {
    status: getOverallStatus(issues),
    issues,
    checks,
  };
}

export function calculateUsedPercent(usedBytes: number, limitBytes: number | null): number | null {
  if (limitBytes === null || !Number.isFinite(limitBytes) || limitBytes <= 0) {
    return null;
  }
  if (!Number.isFinite(usedBytes) || usedBytes <= 0) {
    return 0;
  }
  const value = Math.round((usedBytes / limitBytes) * 100);
  return Math.min(100, Math.max(0, value));
}

export async function getDashboardSecuritySummary(): Promise<DashboardSecuritySummary> {
  return buildSecuritySummary(await getSecuritySettings());
}

export async function getContentTypeCounts(
  limit = 20,
  contentTypeIds?: string[]
): Promise<DashboardContentTypeCount[]> {
  const countExpr = sql<number>`count(${contentEntries.id})`;
  const query = db
    .select({
      id: contentTypes.id,
      slug: contentTypes.slug,
      label: contentTypes.name,
      count: countExpr,
    })
    .from(contentTypes)
    .leftJoin(contentEntries, eq(contentEntries.typeId, contentTypes.id))
    .$dynamic();

  if (contentTypeIds?.length) {
    query.where(inArray(contentTypes.id, contentTypeIds));
  }

  const rows = await query
    .groupBy(contentTypes.id, contentTypes.slug, contentTypes.name)
    .orderBy(desc(countExpr))
    .limit(Math.min(Math.max(Math.trunc(limit), 1), 50));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    count: Number(row.count ?? 0),
  }));
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatBucketDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

export async function getContentOverTime(
  rangeDays = 30,
  bucket: "day" | "week" = "day"
): Promise<DashboardTimeBucket[]> {
  const days = Math.min(Math.max(Math.trunc(rangeDays), 1), 365);
  const now = new Date();
  const start = addDays(now, -(days - 1));
  const trunc = bucket === "week" ? sql.raw("'week'") : sql.raw("'day'");
  const bucketExpr = sql<string>`date_trunc(${trunc}, ${contentEntries.createdAt})`;

  const rows = await db
    .select({
      bucket: bucketExpr,
      created: sql<number>`count(*)`,
      updated: sql<number>`count(*) filter (where ${contentEntries.updatedAt} > ${contentEntries.createdAt})`,
    })
    .from(contentEntries)
    .where(gte(contentEntries.createdAt, start))
    .groupBy(bucketExpr)
    .orderBy(bucketExpr);

  return rows.map((row) => ({
    bucket: formatBucketDate(row.bucket),
    created: Number(row.created ?? 0),
    updated: Number(row.updated ?? 0),
  }));
}

export async function resolveContentQueryWidget(
  config: DashboardContentQueryConfig
): Promise<DashboardRecentEdit[]> {
  const limit = Math.min(Math.max(Math.trunc(config.limit ?? 10), 1), 50);
  const conditions: SQL[] = [];
  if (config.contentTypeId) conditions.push(eq(contentEntries.typeId, config.contentTypeId));
  if (config.status) conditions.push(eq(contentEntries.status, config.status));

  const sortColumn =
    config.sort === "createdAt"
      ? contentEntries.createdAt
      : config.sort === "title"
        ? contentEntries.title
        : contentEntries.updatedAt;
  const direction = config.order === "asc" ? asc : desc;

  const query = db
    .select({
      id: contentEntries.id,
      title: contentEntries.title,
      slug: contentEntries.slug,
      status: contentEntries.status,
      updatedAt: contentEntries.updatedAt,
      typeSlug: contentTypes.slug,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(contentEntries)
    .leftJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .$dynamic();

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const rows = await query.orderBy(direction(sortColumn)).limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: "entry",
    title: row.title,
    path: row.typeSlug ? ensurePath(`${row.typeSlug}/${row.slug}`) : null,
    status: toStatus(row.status),
    updatedAt: toIsoString(row.updatedAt),
    author: toAuthor(row.authorId ?? null, row.authorName ?? null, resolveAuthorEmail(row)),
  }));
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const [totals, storage, recentEdits, securitySettings] = await Promise.all([
    getDashboardTotals(),
    getStorageSummary(),
    getRecentEdits(RECENT_EDITS_LIMIT),
    getDashboardSecuritySummary(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totals,
    storage,
    recentEdits,
    security: securitySettings,
  };
}
