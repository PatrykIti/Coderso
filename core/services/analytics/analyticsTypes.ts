export type TrendPoint = {
  date: string;
  value: number;
};

export type AnalyticsTotals = {
  pages: number;
  publishedPages: number;
  entries: number;
  media: number;
  users: number;
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

export type TopContentType = TopContentItem["type"];

export type TopContentQuery = {
  limit: number;
  rangeDays: number;
  type?: TopContentType;
  now?: Date;
};

export type TopContentExport = {
  fileName: string;
  contentType: "text/csv";
  content: string;
  rangeDays: number;
  totalRows: number;
};
