export const searchDateRanges = [
  "last-7-days",
  "last-30-days",
  "last-12-months",
  "all-time",
] as const;

export type SearchDateRange = (typeof searchDateRanges)[number];

export const DEFAULT_SEARCH_DATE_RANGE: SearchDateRange = "last-7-days";

const dateRangeSet = new Set<string>(searchDateRanges);

export function isSearchDateRange(value: unknown): value is SearchDateRange {
  return typeof value === "string" && dateRangeSet.has(value);
}

export function normalizeSearchDateRange(value: unknown): SearchDateRange {
  return isSearchDateRange(value) ? value : DEFAULT_SEARCH_DATE_RANGE;
}

export function resolveSearchDateRangeSince(range: SearchDateRange, now = new Date()) {
  if (range === "all-time") return null;

  const days = range === "last-7-days" ? 7 : range === "last-30-days" ? 30 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export type SearchResponseMeta = {
  dateRange: SearchDateRange;
  hasSearchableContent: boolean | null;
  hasQueryMatches: boolean;
  hasMatchesOutsideDateRange: boolean;
  returnedItems: number;
};
