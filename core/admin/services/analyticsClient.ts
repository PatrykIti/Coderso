import { apiRequest } from "./apiClient";

export type AnalyticsTotals = {
  pages: number;
  publishedPages: number;
  entries: number;
  media: number;
  users: number;
};

export type TrendPoint = {
  date: string;
  value: number;
};

export type AnalyticsOverview = {
  rangeDays: number;
  generatedAt: string;
  totals: AnalyticsTotals;
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  trend: TrendPoint[];
};

export type TopContentItem = {
  id: string;
  type: "page" | "entry";
  title: string;
  slug: string | null;
  updatedAt: string;
  score: number;
};

export type TopContentExport = {
  fileName: string;
  contentType: "text/csv";
  content: string;
  rangeDays: number;
  totalRows: number;
};

export type TopContentRequest = {
  limit: number;
  rangeDays: number;
  type?: "page" | "entry";
};

export async function getOverview(rangeDays: number) {
  const params = new URLSearchParams({ rangeDays: String(rangeDays) });
  return apiRequest<AnalyticsOverview>(`/analytics/overview?${params}`, {
    method: "GET",
  });
}

export async function getTopContent(options: TopContentRequest) {
  const params = new URLSearchParams({
    limit: String(options.limit),
    rangeDays: String(options.rangeDays),
  });
  if (options.type) params.set("type", options.type);
  return apiRequest<TopContentItem[]>(`/analytics/top-content?${params}`, {
    method: "GET",
  });
}

export async function exportTopContent(options: TopContentRequest) {
  const params = new URLSearchParams({
    limit: String(options.limit),
    rangeDays: String(options.rangeDays),
    format: "csv",
  });
  if (options.type) params.set("type", options.type);
  return apiRequest<TopContentExport>(`/analytics/top-content/export?${params}`, {
    method: "GET",
  });
}
