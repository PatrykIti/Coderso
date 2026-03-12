import type {
  ListingExecutionResult,
  ListingQuery,
} from "../content/queryBuilderService";
import {
  normalizeListingFacetConfigs,
  type ListingFacetConfig,
  type ListingFacetMetric,
} from "./filterContract";
import {
  computeListingFacetMetrics,
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
} from "./filterEngine";

type ListingRuntimeResolverDeps = {
  getListingQueryById: (
    id: string
  ) => Promise<{ query: ListingQuery } | null>;
  executeListing: (input: unknown) => Promise<ListingExecutionResult>;
};

let defaultDepsPromise: Promise<ListingRuntimeResolverDeps> | null = null;

const getDefaultDeps = async (): Promise<ListingRuntimeResolverDeps> => {
  if (!defaultDepsPromise) {
    defaultDepsPromise = Promise.all([
      import("../content/listingQueriesService"),
      import("../content/queryBuilderService"),
    ]).then(([listingQueriesModule, queryBuilderModule]) => ({
      getListingQueryById: listingQueriesModule.getListingQuery,
      executeListing: queryBuilderModule.executeListingQuery,
    }));
  }

  return defaultDepsPromise;
};

const normalizeListingQueryForRuntime = (query: ListingQuery, preview: boolean): ListingQuery => {
  if (preview) return query;
  if (query.source !== "entries" && query.source !== "posts") return query;
  return {
    ...query,
    sourceConfig: {
      ...query.sourceConfig,
      includeDrafts: false,
    },
  };
};

export type ListingFiltersRuntimeInput = {
  listingQueryId?: string;
  facets?: ListingFacetConfig[];
  preview: boolean;
  runtimeSearchParams?: URLSearchParams;
};

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

export function resolveListingSearchRuntimeState(
  listingQueryId: string,
  runtimeSearchParams?: URLSearchParams
): ListingSearchRuntimeState {
  const id = listingQueryId.trim();
  if (!id) return { rejectedTokens: [] };
  const draft = parseListingRuntimeOverrides(runtimeSearchParams ?? new URLSearchParams(), id);
  return {
    searchQuery: draft.searchQuery ?? undefined,
    rejectedTokens: draft.rejectedTokens,
  };
}

export async function resolveListingFiltersRuntimeData(
  input: ListingFiltersRuntimeInput,
  deps: Partial<ListingRuntimeResolverDeps> = {}
): Promise<ListingFiltersRuntimeResult> {
  const listingQueryId = (input.listingQueryId ?? "").trim();
  const facets = normalizeListingFacetConfigs(input.facets);
  if (!listingQueryId) {
    return {
      listingQueryId: "",
      metrics: [],
      rejectedTokens: [],
      total: 0,
    };
  }
  const runtimeDeps: ListingRuntimeResolverDeps =
    deps.getListingQueryById && deps.executeListing
      ? (deps as ListingRuntimeResolverDeps)
      : {
          ...(await getDefaultDeps()),
          ...deps,
        };

  const listingQuery = await runtimeDeps.getListingQueryById(listingQueryId);
  if (!listingQuery) {
    return {
      listingQueryId,
      metrics: [],
      rejectedTokens: [],
      total: 0,
      error: "Selected listing query no longer exists.",
    };
  }

  const runtimeDraft = parseListingRuntimeOverrides(
    input.runtimeSearchParams ?? new URLSearchParams(),
    listingQueryId
  );
  const runtime = resolveListingRuntimeOverrides(
    normalizeListingQueryForRuntime(listingQuery.query, input.preview),
    runtimeDraft
  );

  try {
    const execution = await runtimeDeps.executeListing(runtime.query);
    return {
      listingQueryId,
      metrics: computeListingFacetMetrics(
        execution.rows as Array<Record<string, unknown>>,
        facets,
        runtimeDraft
      ),
      searchQuery: runtime.searchQuery ?? undefined,
      rejectedTokens: runtime.rejectedTokens,
      total: execution.total,
    };
  } catch {
    return {
      listingQueryId,
      metrics: [],
      searchQuery: runtime.searchQuery ?? undefined,
      rejectedTokens: runtime.rejectedTokens,
      total: 0,
      error: "Failed to resolve runtime filters.",
    };
  }
}
