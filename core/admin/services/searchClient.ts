import { apiRequest } from "./apiClient";

export type SearchResultItem = {
  id: string;
  title: string;
  slug?: string | null;
  type: "page" | "entry" | "media";
  updatedAt: string;
};

export type SearchResponse = {
  items: SearchResultItem[];
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
