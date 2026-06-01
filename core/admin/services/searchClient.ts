import { apiRequest } from "./apiClient";
import type { SearchDateRange, SearchResponseMeta } from "../../services/search/searchContract";

export {
  DEFAULT_SEARCH_DATE_RANGE,
  normalizeSearchDateRange,
  searchDateRanges,
} from "../../services/search/searchContract";
export type { SearchDateRange, SearchResponseMeta } from "../../services/search/searchContract";

export type SearchResultItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: "page" | "entry" | "media" | "user";
  updatedAt: string;
  categoryId?: string;
  categoryLabel?: string;
  entryTypeSlug?: string;
};

export type SearchResponse = {
  items: SearchResultItem[];
  categories?: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  meta?: SearchResponseMeta;
};

export type RecentSearchItem = {
  query: string;
  createdAt: string;
};

export async function searchAll(
  query: string,
  options?: { limit?: number; dateRange?: SearchDateRange; signal?: AbortSignal }
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.dateRange) params.set("dateRange", options.dateRange);
  const suffix = params.toString();
  const path = suffix ? `/search?${suffix}` : "/search";
  return apiRequest<SearchResponse>(path, {
    method: "GET",
    signal: options?.signal,
  });
}

export async function listRecentSearches() {
  const response = await apiRequest<{ items: RecentSearchItem[] }>("/search/recent", {
    method: "GET",
  });
  return response.items ?? [];
}
