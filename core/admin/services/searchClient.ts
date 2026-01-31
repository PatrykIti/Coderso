import { apiRequest } from "./apiClient";

export type SearchResultItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: "page" | "entry" | "media";
  updatedAt: string;
  categoryId?: string;
  categoryLabel?: string;
};

export type SearchResponse = {
  items: SearchResultItem[];
  categories?: Array<{
    id: string;
    label: string;
    count: number;
  }>;
};

export type RecentSearchItem = {
  query: string;
  createdAt: string;
};

export async function searchAll(
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (options?.limit) params.set("limit", String(options.limit));
  const suffix = params.toString();
  const path = suffix ? `/search?${suffix}` : "/search";
  return apiRequest<SearchResponse>(path, {
    method: "GET",
    signal: options?.signal,
  });
}

export async function listRecentSearches() {
  const response = await apiRequest<{ items: RecentSearchItem[] }>(
    "/search/recent",
    { method: "GET" }
  );
  return response.items ?? [];
}
