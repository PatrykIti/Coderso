import type {
  ListingExecutionResult,
  ListingCorpusResult,
  ListingQuery,
} from "../content/listingQueryContract";
import {
  normalizeListingFacetConfigs,
  resolveFacetToken,
  type ListingFacetConfig,
  type ListingFacetMetric,
  type ListingRuntimeAliasMap,
} from "./filterContract";
import type {
  ListingFiltersRuntimeResult,
  ListingSearchRuntimeState,
} from "./listingRuntimeContract";
import {
  computeListingFacetMetrics,
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
  type ListingRuntimeOverrideDraft,
} from "./filterEngine";

type ListingRuntimeResolverDeps = {
  getListingQueryById: (id: string) => Promise<{ query: ListingQuery } | null>;
  executeListing: (input: unknown) => Promise<ListingExecutionResult>;
  /**
   * Full filtered corpus executor (TASK-459-04): backs corpus-wide facet
   * counts, range bounds, and totals. Optional in injected deps for
   * backward compatibility — when absent, metrics degrade to the rows the
   * injected `executeListing` returns (page-slice shape used by legacy
   * tests), while the default runtime deps always provide the real corpus
   * executor.
   */
  executeListingCorpus?: (input: unknown) => Promise<ListingCorpusResult>;
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
      executeListingCorpus: queryBuilderModule.executeListingCorpus,
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
  aliases?: ListingRuntimeAliasMap;
  preview: boolean;
  runtimeSearchParams?: URLSearchParams;
};

export function resolveListingSearchRuntimeState(
  listingQueryId: string,
  runtimeSearchParams?: URLSearchParams,
  aliases?: ListingRuntimeAliasMap
): ListingSearchRuntimeState {
  const id = listingQueryId.trim();
  if (!id) return { rejectedTokens: [] };
  const draft = parseListingRuntimeOverrides(
    runtimeSearchParams ?? new URLSearchParams(),
    id,
    aliases
  );
  return {
    searchQuery: draft.searchQuery ?? undefined,
    rejectedTokens: draft.rejectedTokens,
  };
}

const buildContextDraftWithoutToken = (
  draft: ListingRuntimeOverrideDraft,
  token: string
): ListingRuntimeOverrideDraft => {
  const rawTokens: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(draft.rawTokens)) {
    if (key !== token) rawTokens[key] = values;
  }
  return {
    ...draft,
    rawTokens,
    filters: draft.filters.filter((filter) => filter.token !== token),
  };
};

/**
 * Corpus-wide facet metrics (TASK-459-04): counts, range bounds, and the
 * sort-option totals are computed over the FULL filtered corpus instead of
 * the current page slice, with each facet's OWN predicate excluded from its
 * counting context (standard faceting semantics — selecting "3 rooms" must
 * not collapse the other room counts to zero). Facets without an applied
 * filter share the full-context corpus; each actively filtered facet gets a
 * dedicated context execution without its own token.
 */
const computeCorpusFacetMetrics = async (options: {
  baseQuery: ListingQuery;
  runtimeDraft: ListingRuntimeOverrideDraft;
  facets: ListingFacetConfig[];
  fullCorpus: ListingCorpusResult;
  rejectedTokens: string[];
  executeCorpus: (input: unknown) => Promise<ListingCorpusResult>;
}): Promise<ListingFacetMetric[]> => {
  const contextRowsByToken = new Map<string, Array<Record<string, unknown>>>();
  const metrics: ListingFacetMetric[] = [];

  for (const facet of options.facets) {
    const token = resolveFacetToken(facet);
    const hasOwnAppliedFilter =
      token.length > 0 &&
      facet.kind !== "sort" &&
      !options.rejectedTokens.includes(token) &&
      options.runtimeDraft.filters.some((filter) => filter.token === token);

    let contextRows = options.fullCorpus.rows as Array<Record<string, unknown>>;
    if (hasOwnAppliedFilter) {
      const cached = contextRowsByToken.get(token);
      if (cached) {
        contextRows = cached;
      } else {
        try {
          const contextDraft = buildContextDraftWithoutToken(options.runtimeDraft, token);
          const contextRuntime = resolveListingRuntimeOverrides(options.baseQuery, contextDraft);
          const contextCorpus = await options.executeCorpus(contextRuntime.query);
          contextRows = contextCorpus.rows as Array<Record<string, unknown>>;
        } catch {
          // Degrade to the full-context corpus instead of failing the render:
          // counts for this facet ignore the own-predicate exclusion.
          contextRows = options.fullCorpus.rows as Array<Record<string, unknown>>;
        }
        contextRowsByToken.set(token, contextRows);
      }
    }

    metrics.push(...computeListingFacetMetrics(contextRows, [facet], options.runtimeDraft));
  }

  return metrics;
};

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
  const executeCorpus =
    runtimeDeps.executeListingCorpus ??
    (async (corpusInput: unknown): Promise<ListingCorpusResult> => {
      const execution = await runtimeDeps.executeListing(corpusInput);
      return { source: execution.source, total: execution.total, rows: execution.rows };
    });

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
    listingQueryId,
    input.aliases
  );
  const baseQuery = normalizeListingQueryForRuntime(listingQuery.query, input.preview);
  const runtime = resolveListingRuntimeOverrides(baseQuery, runtimeDraft);

  try {
    const fullCorpus = await executeCorpus(runtime.query);
    const metrics = await computeCorpusFacetMetrics({
      baseQuery,
      runtimeDraft,
      facets,
      fullCorpus,
      rejectedTokens: runtime.rejectedTokens,
      executeCorpus,
    });
    return {
      listingQueryId,
      metrics,
      searchQuery: runtime.searchQuery ?? undefined,
      rejectedTokens: runtime.rejectedTokens,
      total: fullCorpus.total,
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
