export type SeoTargetType = "page" | "entry";
export type SeoStatus = "ok" | "warning" | "issue";
export type SeoIssueSeverity = "error" | "warning";

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
