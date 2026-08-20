/**
 * Domain types and normalization helpers for the SEO search-performance
 * pipeline: indexing state, sitemap submission status, and coercion helpers
 * for GSC-sourced numeric and status columns.
 *
 * Owns the status enums and `normalize*` helpers for the
 * `seo_indexed_pages`, `seo_search_metrics`, `seo_search_queries`, and
 * `seo_sitemap_submissions` tables. Routes and services import from here and
 * never re-declare the enum values or coercion logic.
 */

export const seoIndexingStates = ["INDEXED", "NOT_INDEXED", "EXCLUDED", "UNKNOWN"] as const;
export type SeoIndexingState = (typeof seoIndexingStates)[number];

export const seoSitemapStatuses = ["pending", "submitted", "processed", "error"] as const;
export type SeoSitemapStatus = (typeof seoSitemapStatuses)[number];

export type SeoSitemapSubmissionRow = {
  sitemapUrl: string;
  source: string;
  status: SeoSitemapStatus;
  urlCount: number | null;
  warnings: number;
  errors: number;
  lastSubmittedAt: Date | null;
  lastErrorMessage: string | null;
};

export type SeoIndexedPage = {
  url: string;
  targetType: "page" | "entry" | null;
  targetId: string | null;
  indexingState: SeoIndexingState;
  coverageState: string | null;
  verdict: string | null;
  lastCrawledAt: Date | null;
};

export type SeoSearchMetricPoint = {
  url: string;
  date: Date;
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number;
};

export type SeoSearchQueryRow = {
  url: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export const isSeoIndexingState = (v: unknown): v is SeoIndexingState =>
  typeof v === "string" && (seoIndexingStates as readonly string[]).includes(v);

// Coerce a raw GSC indexingState/coverageState string into our enum.
export function normalizeIndexingState(raw: string | null | undefined): SeoIndexingState {
  if (!raw) return "UNKNOWN";
  if (isSeoIndexingState(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower.includes("indexed") && !lower.includes("not")) return "INDEXED";
  if (lower.includes("excluded")) return "EXCLUDED";
  if (lower.includes("not")) return "NOT_INDEXED";
  return "UNKNOWN";
}

// numeric columns come back as strings; coerce defensively.
export const toNumber = (v: number | string | null | undefined, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};
