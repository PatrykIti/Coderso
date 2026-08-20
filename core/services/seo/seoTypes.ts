import type { SeoIndexingState } from "./seoSearchPerformanceTypes"; // 01-L01

export type SeoTargetType = "page" | "entry";
export type SeoStatus = "ok" | "warning" | "issue";
export type SeoIssueSeverity = "error" | "warning";
export const seoAuditCheckIds = ["meta", "links", "robots"] as const;
export type SeoAuditCheckId = (typeof seoAuditCheckIds)[number];

export type SeoIssue = {
  code: string;
  severity: SeoIssueSeverity;
  message: string;
};

export type SeoDocument = {
  id: string;
  targetType: SeoTargetType;
  targetId: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  score: number | null;
  status: SeoStatus;
  issues: SeoIssue[];
  lastAuditAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SeoListItem = SeoDocument & {
  targetTitle: string;
};

export type SeoUpsertInput = {
  targetType: SeoTargetType;
  targetId: string;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type PublicSeoMetadata = {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
};

// --- TASK-493-04-L01: SEO search-performance aggregation shapes -----------------
// Additive extension only. Existing types above (SeoDocument, SeoListItem,
// SeoUpsertInput, PublicSeoMetadata, seoAuditCheckIds) are untouched.

export type SeoOverview = {
  indexedPages: number; // count of seo_indexed_pages where indexingState === "INDEXED"
  totalPages: number;
  notIndexedPages: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number; // 0..1
  averagePosition: number;
  averageScore: number; // existing meta-heuristic average (seo_documents.score)
  sitemap: {
    status: string | null;
    urlCount: number | null;
    lastSubmittedAt: Date | null;
  };
};

export type SeoTopQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoSearchPerformance = {
  range: { startDate: string; endDate: string };
  totals: Pick<SeoOverview, "totalImpressions" | "totalClicks" | "averageCtr" | "averagePosition">;
  series: Array<{ date: string; clicks: number; impressions: number }>;
  topQueries: SeoTopQuery[];
};

export type SeoDocumentPerformance = {
  indexingState: SeoIndexingState; // enum from 01-L01, never a plain string
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

// performance is non-optional (SeoDocumentPerformance | null): documents
// without index rows carry explicit null, never a missing key.
export type SeoListItemWithPerformance = SeoListItem & {
  performance: SeoDocumentPerformance | null;
};
