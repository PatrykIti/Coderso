import {
  contentListDefaults,
  mapListingTemplatePresentationToContentList,
  normalizeContentListData,
} from "../../widgets/core/contentList";
import {
  normalizeListingFiltersData,
  type ListingFiltersCopy,
} from "../../widgets/core/listingFilters";
import { getDefaultFormSettings } from "../forms/formSettings";
import type { FormRuntimeResolution } from "../forms/formRuntimeContract";
import type { ContentListResolvedRuntimeData } from "./pageRuntimeBindingContract";
import {
  mapPageCollectionBlockToContentListData,
  mapPageFiltersBlockToListingFiltersData,
  sanitizePageEmbedHtml,
  type PageRuntimeCollectionBinding,
  type PageRuntimeDataBindingDeps,
  type PageRuntimeDataByBlockId,
  type PageRuntimeEmbedBinding,
  type PageRuntimeFiltersBinding,
  type PageRuntimeFormBinding,
  type PreparePageRuntimeOptions,
  type PreparedPageRuntimeDocument,
} from "./pageRuntimeBindingContract";
import {
  getPageBlockActiveSlotKeys,
  resolvePageDocumentForBreakpoint,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
  type PageSectionVisibilityV2,
} from "./pageDocumentV2";
import { toYoutubeEmbedUrl } from "../posts/shared/videoEmbed";
import type { ListingFiltersRuntimeResult } from "../search/listingRuntimeContract";
import {
  normalizeListingRuntimeAliases,
  type ListingRuntimeAliasMap,
} from "../search/filterContract";
import { resolvePrimarySiteLanguage } from "../settings/siteLocale";

export type PageListingRuntimeCopy = {
  title: string;
  description: string;
  searchLabel: string;
  searchPlaceholder: string;
  applyLabel: string;
  copy: ListingFiltersCopy;
};

const polishPageListingRuntimeCopy: PageListingRuntimeCopy = {
  title: "Filtruj wyniki",
  description: "Zawęź wyniki za pomocą dostępnych filtrów.",
  searchLabel: "Szukaj",
  searchPlaceholder: "Szukaj w wynikach...",
  applyLabel: "Zastosuj filtry",
  copy: {
    configurationAriaLabel: "Konfiguracja filtrów wyników",
    configurationHint: "Wybierz zapisane zapytanie, aby włączyć filtry.",
    activeFilterSingular: "aktywny filtr",
    activeFilterPlural: "aktywne filtry",
    activeRangeFromLabel: "Od",
    activeRangeUpToLabel: "Do",
    activeSearchLabel: "Szukaj",
    clearAllLabel: "Wyczyść wszystko",
    autoApplyLabel: "Wyniki aktualizują się automatycznie.",
    loadingLabel: "Aktualizowanie wyników...",
    errorLabel: "Nie udało się odświeżyć wyników. Spróbuj ponownie.",
    rejectedLabel: "Pominięto nieprawidłowe parametry filtrów.",
    drawerLabel: "Panel filtrów",
    emptyOptionsLabel: "Brak dostępnych opcji.",
    optionSearchTemplate: "Szukaj w opcjach: {facet}",
    defaultOrderLabel: "Domyślna kolejność",
    dateFromLabel: "Od",
    dateToLabel: "Do",
    rangeMinLabel: "Minimum",
    rangeMaxLabel: "Maksimum",
    rangeMinSliderLabel: "Suwak minimum",
    rangeMaxSliderLabel: "Suwak maksimum",
  },
};

export const resolvePageListingRuntimeCopy = (
  siteLocale: unknown
): PageListingRuntimeCopy | null =>
  resolvePrimarySiteLanguage(siteLocale) === "pl" ? polishPageListingRuntimeCopy : null;

const readOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isWithinSectionSchedule = (visibility: PageSectionVisibilityV2, now: Date) => {
  const startsAt = readOptionalText(visibility.startsAt);
  if (startsAt) {
    const startsAtMs = Date.parse(startsAt);
    if (Number.isFinite(startsAtMs) && now.getTime() < startsAtMs) return false;
  }

  const endsAt = readOptionalText(visibility.endsAt);
  if (endsAt) {
    const endsAtMs = Date.parse(endsAt);
    if (Number.isFinite(endsAtMs) && now.getTime() > endsAtMs) return false;
  }

  return true;
};

const sectionAllowsPublicRender = (
  section: PageSectionV2,
  options: { preview: boolean; now: Date }
) => {
  if (!section.visibility.visible) return false;
  if (options.preview) return true;
  if (section.visibility.authOnly) return false;
  return isWithinSectionSchedule(section.visibility, options.now);
};

const pruneSectionsForRuntime = (
  document: PageDocumentV2,
  options: { preview: boolean; now: Date }
): { document: PageDocumentV2; hasPublicGates: boolean } => {
  let hasPublicGates = false;
  const sections = document.sections.filter((section) => {
    const allowed = sectionAllowsPublicRender(section, options);
    if (!options.preview && !allowed && section.visibility.visible) {
      hasPublicGates = true;
    }
    return allowed;
  });
  return {
    document: { ...document, sections },
    hasPublicGates,
  };
};

const walkVisibleBlocks = function* (blocks: readonly PageBlockV2[]): Generator<PageBlockV2> {
  for (const block of blocks) {
    if (!block.visibility.visible) continue;
    yield block;
    for (const slotKey of getPageBlockActiveSlotKeys(block)) {
      yield* walkVisibleBlocks(block.slots?.[slotKey] ?? []);
    }
  }
};

const walkDocumentBlocks = function* (document: PageDocumentV2): Generator<PageBlockV2> {
  for (const section of document.sections) {
    yield* walkVisibleBlocks(section.blocks);
  }
};

const resolveCollectionBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveContentListRuntimeData">>
): Promise<PageRuntimeCollectionBinding> => {
  const baseData = mapPageCollectionBlockToContentListData(block);
  const listingQueryId = baseData.source?.listingQueryId?.trim() ?? "";
  let resolved: ContentListResolvedRuntimeData;
  try {
    resolved = await deps.resolveContentListRuntimeData(baseData, {
      preview: options.preview,
      contentRoutes: options.contentRoutes,
      runtimeSearchParams: options.runtimeSearchParams,
      runtimeAliases: listingQueryId
        ? options.listingRuntimeAliasesByQueryId?.[listingQueryId]
        : undefined,
      blockId: block.id,
    });
  } catch {
    resolved = {
      items: [],
      total: 0,
      sourceTypeId: "",
      sourceTypeSlug: "",
      resolvedAt: new Date().toISOString(),
      error: "content_list_unavailable",
    };
  }
  const presentation =
    resolved.templateStyle || resolved.templateEmptyState
      ? mapListingTemplatePresentationToContentList({
          style: resolved.templateStyle ?? null,
          emptyState: resolved.templateEmptyState ?? null,
        })
      : null;
  return {
    kind: "collection",
    data: normalizeContentListData({
      ...baseData,
      ...(presentation
        ? {
            style: {
              ...contentListDefaults.style,
              ...presentation?.style,
            },
            emptyState: {
              ...contentListDefaults.emptyState,
              ...presentation?.emptyState,
            },
          }
        : {}),
      resolved,
    }),
    ...(presentation ? { variant: presentation.variant } : {}),
  };
};

const resolveFiltersBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveListingFiltersRuntimeData">>
): Promise<PageRuntimeFiltersBinding> => {
  const baseData = mapPageFiltersBlockToListingFiltersData(block);
  const localeCopy = resolvePageListingRuntimeCopy(options.siteLocale);
  const data = localeCopy
    ? normalizeListingFiltersData({
        ...baseData,
        title: localeCopy.title,
        description: localeCopy.description,
        searchLabel: readOptionalText(block.props.searchLabel) ?? localeCopy.searchLabel,
        searchPlaceholder:
          readOptionalText(block.props.searchPlaceholder) ?? localeCopy.searchPlaceholder,
        applyLabel: readOptionalText(block.props.applyLabel) ?? localeCopy.applyLabel,
        copy: localeCopy.copy,
      })
    : baseData;
  let resolved: ListingFiltersRuntimeResult;
  try {
    resolved = await deps.resolveListingFiltersRuntimeData({
      listingQueryId: data.listingQueryId,
      facets: data.facets,
      aliases: data.aliases,
      preview: options.preview,
      runtimeSearchParams: options.runtimeSearchParams,
    });
  } catch {
    resolved = {
      listingQueryId: data.listingQueryId ?? "",
      metrics: [],
      rejectedTokens: [],
      total: 0,
      error: "Failed to resolve runtime filters.",
    };
  }
  return {
    kind: "filters",
    data: normalizeListingFiltersData({
      ...data,
      resolved: {
        listingQueryId: resolved.listingQueryId,
        metrics: resolved.metrics,
        searchQuery: resolved.searchQuery,
        rejectedTokens: resolved.rejectedTokens,
        ...(resolved.error ? { error: resolved.error } : {}),
      },
    }),
    total: resolved.total,
  };
};

const resolveFormBinding = async (
  block: PageBlockV2,
  options: PreparePageRuntimeOptions,
  deps: Required<Pick<PageRuntimeDataBindingDeps, "resolveFormRuntimeData">>
): Promise<PageRuntimeFormBinding | null> => {
  const formId = readOptionalText(block.props.formId);
  if (!formId) return null;
  let resolution: FormRuntimeResolution;
  try {
    resolution = await deps.resolveFormRuntimeData(formId, { preview: options.preview });
  } catch {
    resolution = {
      formId: "",
      formName: "",
      description: null,
      status: "missing",
      successMessage: null,
      successRedirectUrl: null,
      settings: getDefaultFormSettings(),
      submissionAccess: "public",
      submissionNonce: null,
      botProtection: null,
      fields: [],
      error: "form_not_found",
    };
  }
  return {
    kind: "form",
    formId,
    title: readOptionalText(block.props.title),
    resolution,
  };
};

const resolveEmbedBinding = (block: PageBlockV2): PageRuntimeEmbedBinding => {
  const html = readOptionalText(block.props.html) ?? "";
  const url = readOptionalText(block.props.url) ?? "";
  const iframeSrc = url && isHttpUrl(url) ? toYoutubeEmbedUrl(url) : null;
  return {
    kind: "embed",
    sanitizedHtml: sanitizePageEmbedHtml(html),
    iframeSrc,
    iframeTitle: iframeSrc ? "Embedded YouTube content" : "Embedded content",
  };
};

const collectListingRuntimeAliasesByQueryId = (
  document: PageDocumentV2
): Record<string, ListingRuntimeAliasMap> => {
  const result: Record<string, ListingRuntimeAliasMap> = {};
  for (const block of walkDocumentBlocks(document)) {
    if (block.type !== "filters") continue;
    const data = mapPageFiltersBlockToListingFiltersData(block);
    const queryId = data.listingQueryId?.trim();
    if (!queryId) continue;
    const aliases = normalizeListingRuntimeAliases(data.aliases);
    if (Object.keys(aliases).length === 0) continue;
    result[queryId] = aliases;
  }
  return result;
};

export async function preparePageRuntimeDocument(
  document: PageDocumentV2,
  options: PreparePageRuntimeOptions,
  deps: PageRuntimeDataBindingDeps = {}
): Promise<PreparedPageRuntimeDocument> {
  const now = deps.now?.() ?? new Date();
  const resolvedDocument = resolvePageDocumentForBreakpoint(document, options.breakpoint);
  const pruned = pruneSectionsForRuntime(resolvedDocument, {
    preview: options.preview,
    now,
  });
  const resolveCollection =
    deps.resolveContentListRuntimeData ??
    (await import("../content/contentListResolver")).resolveContentListRuntimeData;
  const resolveForm =
    deps.resolveFormRuntimeData ??
    (await import("../forms/formRuntimeResolver")).resolveFormRuntimeData;
  const hasFiltersBlock = [...walkDocumentBlocks(pruned.document)].some(
    (block) => block.type === "filters"
  );
  const resolveFilters = hasFiltersBlock
    ? (deps.resolveListingFiltersRuntimeData ??
      (await import("../search/listingRuntimeService")).resolveListingFiltersRuntimeData)
    : deps.resolveListingFiltersRuntimeData;

  let hasDynamicBinding = pruned.hasPublicGates;
  let hasListingBinding = false;
  let hasUncacheableBinding = pruned.hasPublicGates;
  let needsListingRuntimeScript = false;
  const runtimeDataByBlockId: PageRuntimeDataByBlockId = {};
  const runtimeOptions: PreparePageRuntimeOptions = {
    ...options,
    listingRuntimeAliasesByQueryId: collectListingRuntimeAliasesByQueryId(pruned.document),
  };

  for (const block of walkDocumentBlocks(pruned.document)) {
    if (block.type === "collection") {
      const binding = await resolveCollectionBinding(block, runtimeOptions, {
        resolveContentListRuntimeData: resolveCollection,
      });
      runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasListingBinding = true;
      if (
        binding.data.pagination?.mode === "paged" &&
        (binding.data.source?.listingQueryId ?? "").length > 0 &&
        !binding.data.resolved?.error
      ) {
        needsListingRuntimeScript = true;
      }
      continue;
    }
    if (block.type === "filters" && resolveFilters) {
      const binding = await resolveFiltersBinding(block, runtimeOptions, {
        resolveListingFiltersRuntimeData: resolveFilters,
      });
      runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasListingBinding = true;
      if ((binding.data.listingQueryId ?? "").length > 0 && !binding.data.resolved?.error) {
        needsListingRuntimeScript = true;
      }
      continue;
    }
    if (block.type === "form") {
      const binding = await resolveFormBinding(block, options, {
        resolveFormRuntimeData: resolveForm,
      });
      if (binding) runtimeDataByBlockId[block.id] = binding;
      hasDynamicBinding = true;
      hasUncacheableBinding = true;
      continue;
    }
    if (block.type === "embed") {
      runtimeDataByBlockId[block.id] = resolveEmbedBinding(block);
    }
  }

  const cacheMode = hasUncacheableBinding ? "none" : hasListingBinding ? "short-ttl" : "full";

  return {
    document: pruned.document,
    runtimeDataByBlockId,
    cacheable: !hasDynamicBinding,
    cacheMode,
    needsListingRuntimeScript,
  };
}
