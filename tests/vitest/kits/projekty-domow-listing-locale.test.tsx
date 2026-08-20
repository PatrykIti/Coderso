import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  preparePageRuntimeDocument,
  resolvePageListingRuntimeCopy,
} from "../../../core/services/pages/pageRuntimeDataPreparation";
import { renderPublicPageV2RuntimeHtml } from "../../../core/site/renderPublicPage";
import {
  LISTING_FILTERS_COPY_MAX_LENGTH,
  listingFiltersCopyKeys,
  listingFiltersSchema,
  normalizeListingFiltersCopy,
  type ListingFiltersCopy,
  type ListingFiltersData,
} from "../../../core/services/renderContracts/listingFiltersContract";

const POLISH_FILTER_COPY = {
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
} as const satisfies Required<ListingFiltersCopy>;

const POLISH_PAGE_FILTER_COPY = {
  title: "Filtruj wyniki",
  description: "Zawęź wyniki za pomocą dostępnych filtrów.",
  searchLabel: "Szukaj",
  searchPlaceholder: "Szukaj w wynikach...",
  applyLabel: "Zastosuj filtry",
  copy: POLISH_FILTER_COPY,
};

const validateListingFilters = new Ajv({ allErrors: true, strict: true }).compile(
  listingFiltersSchema
);

const createListingDocument = (input?: {
  searchLabel?: string;
  searchPlaceholder?: string;
  applyLabel?: string;
}): PageDocumentV2 => {
  const filters = createPageBlockV2("filters", {
    id: "projects-filters",
    props: {
      queryId: "published-projects",
      autoApply: false,
      showSearch: false,
      showCount: false,
      facets: [
        {
          id: "category",
          kind: "radio",
          label: "Kategoria",
          field: "data.categories",
          op: "eq",
          options: [
            { value: "barn", label: "Nowoczesna stodoła" },
            { value: "villa", label: "Wille" },
            { value: "single", label: "Parterowe" },
            { value: "eco", label: "Energooszczędne" },
          ],
        },
      ],
      layout: "horizontal",
      ...(input?.searchLabel !== undefined ? { searchLabel: input.searchLabel } : {}),
      ...(input?.searchPlaceholder !== undefined
        ? { searchPlaceholder: input.searchPlaceholder }
        : {}),
      ...(input?.applyLabel !== undefined ? { applyLabel: input.applyLabel } : {}),
    },
  });
  if (input?.searchLabel === undefined) delete filters.props.searchLabel;
  if (input?.searchPlaceholder === undefined) delete filters.props.searchPlaceholder;
  if (input?.applyLabel === undefined) delete filters.props.applyLabel;

  const collection = createPageBlockV2("collection", {
    id: "projects-collection",
    props: {
      contentTypeId: "house-project",
      queryId: "published-projects",
      templateId: "project-cards",
      limit: 24,
      paginationMode: "none",
      pageSize: null,
      showCta: false,
    },
  });
  const document = createDefaultPageDocumentV2();
  document.sections = [
    createPageSectionV2("collection", {
      id: "projects-browser",
      blocks: [filters, collection],
    }),
  ];
  return document;
};

const runtimeDeps = {
  resolveListingFiltersRuntimeData: async () => ({
    listingQueryId: "published-projects",
    total: 1,
    searchQuery: "",
    rejectedTokens: ["unknown.invalid"],
    metrics: [
      {
        id: "category",
        kind: "radio" as const,
        label: "Kategoria",
        token: "data.categories.eq",
        options: [
          { value: "barn", label: "Nowoczesna stodoła", count: 2, active: true },
          { value: "villa", label: "Wille", count: 2, active: false },
          { value: "single", label: "Parterowe", count: 2, active: false },
          { value: "eco", label: "Energooszczędne", count: 3, active: false },
        ],
        range: null,
      },
    ],
  }),
  resolveContentListRuntimeData: async () => ({
    items: [
      {
        id: "aurora",
        title: "Dom Aurora",
        slug: "aurora",
        href: "/projekty/aurora",
        excerpt: "142 m² · stodoła · eko",
        status: "published",
      },
    ],
    total: 1,
    sourceTypeId: "house-project",
    sourceTypeSlug: "house-project",
    listingQueryId: "published-projects",
    listingTemplateId: "project-cards",
    resolvedAt: "2026-07-23T12:00:00.000Z",
    templateStyle: { columns: 3, gap: "lg", cardVariant: "default" },
    templateEmptyState: {
      title: "Brak wyników",
      description: "Zmień filtry, aby zobaczyć inne projekty.",
      ctaLabel: null,
      ctaHref: null,
    },
  }),
};

const prepare = (document: PageDocumentV2, siteLocale?: string) =>
  preparePageRuntimeDocument(
    document,
    {
      preview: false,
      breakpoint: "desktop",
      contentRoutes: [],
      ...(siteLocale !== undefined ? { siteLocale } : {}),
    },
    runtimeDeps
  );

describe("FormaDom listing locale contract", () => {
  it("selects the exact Polish copy by primary language only", () => {
    expect(listingFiltersCopyKeys).toEqual(Object.keys(POLISH_FILTER_COPY));
    expect(listingFiltersCopyKeys).toHaveLength(22);
    expect(resolvePageListingRuntimeCopy("pl")).toEqual(POLISH_PAGE_FILTER_COPY);
    expect(resolvePageListingRuntimeCopy("pl-PL")).toEqual(POLISH_PAGE_FILTER_COPY);
    expect(resolvePageListingRuntimeCopy("en")).toBeNull();
    expect(resolvePageListingRuntimeCopy("../pl")).toBeNull();
    expect(resolvePageListingRuntimeCopy(undefined)).toBeNull();
    expect(resolvePageListingRuntimeCopy({ locale: "pl" })).toBeNull();
  });

  it("keeps direct copy normalization present-only, ordered, bounded and idempotent", () => {
    expect(listingFiltersSchema.properties.copy.additionalProperties).toBe(false);
    expect(Object.keys(listingFiltersSchema.properties.copy.properties)).toEqual(
      listingFiltersCopyKeys
    );
    for (const schema of Object.values(listingFiltersSchema.properties.copy.properties)) {
      expect(schema).toEqual({ type: "string", maxLength: 240 });
    }
    expect(normalizeListingFiltersCopy(undefined)).toBeUndefined();
    expect(normalizeListingFiltersCopy(null)).toBeUndefined();
    expect(normalizeListingFiltersCopy([] as unknown as ListingFiltersCopy)).toBeUndefined();
    expect(normalizeListingFiltersCopy({ loadingLabel: "   " })).toBeUndefined();
    expect(normalizeListingFiltersCopy({ loadingLabel: "x" })).toEqual({ loadingLabel: "x" });
    expect(
      normalizeListingFiltersCopy({ loadingLabel: "x".repeat(LISTING_FILTERS_COPY_MAX_LENGTH) })
    ).toEqual({ loadingLabel: "x".repeat(240) });
    expect(
      normalizeListingFiltersCopy({
        loadingLabel: `  ${"x".repeat(LISTING_FILTERS_COPY_MAX_LENGTH + 1)}  `,
      })
    ).toEqual({ loadingLabel: "x".repeat(240) });
    const normalized = normalizeListingFiltersCopy({
      ...POLISH_FILTER_COPY,
      unknownLabel: "ignored by the direct known-key normalizer",
    } as ListingFiltersCopy);
    expect(normalized).toEqual(POLISH_FILTER_COPY);
    expect(Object.keys(normalized ?? {})).toEqual(listingFiltersCopyKeys);
    expect(normalizeListingFiltersCopy(normalized)).toEqual(normalized);
  });

  it("rejects unknown, wrong-type and overlong copy at the real schema boundary", () => {
    const validateCopy = (copy: unknown) =>
      validateListingFilters({
        listingQueryId: "published-projects",
        copy,
      } as unknown as ListingFiltersData);

    expect(validateCopy(POLISH_FILTER_COPY)).toBe(true);
    expect(validateCopy({ ...POLISH_FILTER_COPY, unknownLabel: "no" })).toBe(false);
    expect(validateCopy({ ...POLISH_FILTER_COPY, loadingLabel: 1 })).toBe(false);
    expect(validateCopy({ ...POLISH_FILTER_COPY, loadingLabel: "x".repeat(241) })).toBe(false);
  });

  it("localizes filter chrome while preserving authored labels and all query data", async () => {
    const prepared = await prepare(
      createListingDocument({
        searchLabel: "Szukaj projektu",
        searchPlaceholder: "Wpisz nazwę projektu...",
        applyLabel: "Pokaż projekty",
      }),
      "pl-PL"
    );
    const binding = prepared.runtimeDataByBlockId["projects-filters"];
    expect(binding).toMatchObject({
      kind: "filters",
      data: {
        listingQueryId: "published-projects",
        title: "Filtruj wyniki",
        description: "Zawęź wyniki za pomocą dostępnych filtrów.",
        searchLabel: "Szukaj projektu",
        searchPlaceholder: "Wpisz nazwę projektu...",
        applyLabel: "Pokaż projekty",
        copy: POLISH_FILTER_COPY,
        facets: [{ id: "category", label: "Kategoria", field: "data.categories" }],
        resolved: {
          listingQueryId: "published-projects",
          searchQuery: undefined,
          rejectedTokens: ["unknown.invalid"],
        },
      },
      total: 1,
    });
  });

  it("uses locale fallbacks only for blank Page labels and preserves absent/non-Polish data", async () => {
    const blank = await prepare(
      createListingDocument({ searchLabel: " ", searchPlaceholder: " ", applyLabel: " " }),
      "pl"
    );
    expect(blank.runtimeDataByBlockId["projects-filters"]).toMatchObject({
      kind: "filters",
      data: {
        searchLabel: "Szukaj",
        searchPlaceholder: "Szukaj w wynikach...",
        applyLabel: "Zastosuj filtry",
      },
    });

    const authored = createListingDocument({
      searchLabel: "Project search",
      searchPlaceholder: "Search project names...",
      applyLabel: "Show projects",
    });
    for (const locale of [undefined, "en-US", "../pl"] as const) {
      const prepared = await prepare(authored, locale);
      const binding = prepared.runtimeDataByBlockId["projects-filters"];
      expect(binding).toMatchObject({
        kind: "filters",
        data: {
          title: "Filter results",
          description: "Narrow down listing results with reusable facets.",
          searchLabel: "Project search",
          searchPlaceholder: "Search project names...",
          applyLabel: "Show projects",
        },
      });
      expect(binding).not.toHaveProperty("data.copy");
    }
  });

  it("never rewrites listing-template empty state or the Page CTA suppression", async () => {
    const document = createListingDocument({ applyLabel: "Pokaż projekty" });
    const [polish, legacy] = await Promise.all([prepare(document, "pl"), prepare(document)]);
    const polishCollection = polish.runtimeDataByBlockId["projects-collection"];
    const legacyCollection = legacy.runtimeDataByBlockId["projects-collection"];
    expect(polishCollection).toEqual(legacyCollection);
    expect(polishCollection).toMatchObject({
      kind: "collection",
      data: {
        fields: { showCta: false },
        emptyState: {
          title: "Brak wyników",
          description: "Zmień filtry, aby zobaczyć inne projekty.",
        },
      },
    });
    expect(polishCollection).not.toHaveProperty("data.emptyState.ctaLabel");
    expect(polishCollection).not.toHaveProperty("data.emptyState.ctaHref");
  });

  it("renders Polish shell/filter state with no visible card CTA copy", async () => {
    const prepared = await prepare(createListingDocument({ applyLabel: "Pokaż projekty" }), "pl");
    const html = renderPublicPageV2RuntimeHtml({
      title: "Projekty domów — FormaDom Studio",
      document: prepared.document,
      runtimeDataByBlockId: prepared.runtimeDataByBlockId,
      siteLocale: "pl",
    });
    const visibleHtml = html.replaceAll("<!-- -->", "");
    expect(html).toContain('<html lang="pl">');
    expect(visibleHtml).toContain("Filtruj wyniki");
    expect(visibleHtml).toContain("Zawęź wyniki za pomocą dostępnych filtrów.");
    expect(visibleHtml).toContain("1 aktywny filtr");
    expect(visibleHtml).toContain("Wyczyść wszystko");
    expect(visibleHtml).toContain("Kategoria: Nowoczesna stodoła");
    expect(visibleHtml).toContain("Pokaż projekty");
    expect(visibleHtml).not.toContain("Wyniki aktualizują się automatycznie.");
    expect(visibleHtml).toContain("Pominięto nieprawidłowe parametry filtrów.");
    expect(html).toContain('href="/projekty/aurora"');
    expect(html).toContain("grid-cols-1 md:grid-cols-2 lg:grid-cols-3");
    expect(html).not.toMatch(/Zobacz szczegóły|Read more/);
    expect(html).not.toMatch(/opublikuj pasujące treści/i);
  });

  it("keeps absent-locale normalized data and rendered bytes on the legacy path", async () => {
    const document = createListingDocument({
      searchLabel: "Search",
      searchPlaceholder: "Search results...",
      applyLabel: "Apply filters",
    });
    const first = await prepare(document);
    const second = await prepare(document);
    expect(first).toEqual(second);
    expect(first.runtimeDataByBlockId["projects-filters"]).not.toHaveProperty("data.copy");
    const html = renderPublicPageV2RuntimeHtml({
      title: "Legacy listing",
      document: first.document,
      runtimeDataByBlockId: first.runtimeDataByBlockId,
    });
    const visibleHtml = html.replaceAll("<!-- -->", "");
    expect(html).toContain('<html lang="en">');
    expect(visibleHtml).toContain("Filter results");
    expect(visibleHtml).toContain("Apply filters");
    expect(visibleHtml).not.toContain("Updates automatically when values change.");
    expect(visibleHtml).toContain("Ignored invalid filter parameters.");
  });
});
