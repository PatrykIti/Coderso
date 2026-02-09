export type DashboardStatus = "ok" | "warning" | "critical";

export type DashboardSecurityCheckId =
  | "csrf"
  | "rateLimit"
  | "headers"
  | "sessionPolicy";

export type DashboardSecurityCheck = {
  id: DashboardSecurityCheckId;
  label: string;
  status: DashboardStatus;
  detail: string;
};

export type DashboardSecuritySummary = {
  status: DashboardStatus;
  issues: number;
  checks: DashboardSecurityCheck[];
};

export type DashboardRecentEditType = "page" | "entry" | "media";

export type DashboardRecentEditStatus =
  | "draft"
  | "published"
  | "scheduled"
  | "archived"
  | "active";

export type DashboardRecentEditAuthor = {
  id: string | null;
  name: string | null;
  email: string | null;
};

export type DashboardRecentEdit = {
  id: string;
  type: DashboardRecentEditType;
  title: string;
  path: string | null;
  status: DashboardRecentEditStatus;
  updatedAt: string;
  author: DashboardRecentEditAuthor;
};

export type DashboardTotals = {
  pages: number;
  entries: number;
  media: number;
  users: number;
};

export type DashboardStorageSummary = {
  usedBytes: number;
  limitBytes: number | null;
  usedPercent: number | null;
};

export type DashboardPayload = {
  generatedAt: string;
  totals: DashboardTotals;
  storage: DashboardStorageSummary;
  security: DashboardSecuritySummary;
  recentEdits: DashboardRecentEdit[];
};
