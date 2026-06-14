import type { ListingFacetMetric } from "./filterContract";

export type ListingFiltersRuntimeResult = {
  listingQueryId: string;
  metrics: ListingFacetMetric[];
  searchQuery?: string;
  rejectedTokens: string[];
  total: number;
  error?: string;
};

export type ListingSearchRuntimeState = {
  searchQuery?: string;
  rejectedTokens: string[];
};
