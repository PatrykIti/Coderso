import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import { preparePageRuntimeDocument } from "../../../core/services/pages/pageRuntimeDataPreparation";
import { renderPublicPageV2RuntimeHtml } from "../../../core/site/renderPublicPage";
import {
  createListingFiltersWidget,
  listingFiltersDefaults,
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../../core/widgets/core/listingFilters";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<ListingFiltersData>> = () => null;

afterEach(() => clearWidgets());

const registerListingFilters = () =>
  registerWidget(
    createListingFiltersWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

const createListingDocument = () => {
  const filters = createPageBlockV2("filters", {
    id: "projects-filters",
    props: {
      queryId: "published-projects",
      autoApply: true,
      showSearch: true,
      showCount: false,
      searchLabel: "Szukaj projektu",
      searchPlaceholder: "Wpisz nazwę projektu...",
      applyLabel: "Pokaż projekty",
      facets: [
        {
          id: "style",
          kind: "checkbox",
          label: "Styl",
          field: "data.style",
          op: "in",
          options: [{ value: "minimal", label: "Minimalistyczny" }],
        },
      ],
    },
  });
  const collection = createPageBlockV2("collection", {
    id: "projects-collection",
    props: {
      contentTypeId: "house-project",
      queryId: "published-projects",
      templateId: "project-cards",
      limit: 24,
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
    searchQuery: "aurora",
    rejectedTokens: ["unknown.invalid"],
    metrics: [
      {
        id: "style",
        kind: "checkbox" as const,
        label: "Styl",
        token: "data.style.in",
        options: [
          {
            value: "minimal",
            label: "Minimalistyczny",
            count: 1,
            active: true,
          },
        ],
        range: null,
      },
    ],
  }),
  resolveContentListRuntimeData: async () => ({
    items: [
      {
        id: "aurora",
        title: "Aurora",
        slug: "aurora",
        href: "/projekty/aurora",
        excerpt: "Nowoczesny dom dla rodziny.",
        status: "published",
      },
    ],
    total: 1,
    sourceTypeId: "house-project",
    sourceTypeSlug: "house-project",
    listingQueryId: "published-projects",
    listingTemplateId: "project-cards",
    resolvedAt: "2026-07-23T12:00:00.000Z",
  }),
};

describe("FormaDom listing locale contract", () => {
  it("keeps localized visitor copy present-only, bounded, and strict", () => {
    const absent = normalizeListingFiltersData({ ...listingFiltersDefaults });
    expect(absent).not.toHaveProperty("copy");

    const longLabel = `  ${"x".repeat(300)}  `;
    const localized = normalizeListingFiltersData({
      ...listingFiltersDefaults,
      copy: {
        loadingLabel: longLabel,
        clearAllLabel: "  Wyczyść wszystko  ",
      },
    });
    expect(localized.copy).toEqual({
      loadingLabel: "x".repeat(240),
      clearAllLabel: "Wyczyść wszystko",
    });
    expect(normalizeListingFiltersData(localized)).toEqual(localized);

    registerListingFilters();
    expect(() =>
      normalizeWidgetBlock({
        id: "localized-filters",
        type: "listing-filters",
        variant: "default",
        data: {
          listingQueryId: "published-projects",
          copy: { loadingLabel: "Aktualizowanie wyników..." },
        },
      })
    ).not.toThrow();
    expect(() =>
      normalizeWidgetBlock({
        id: "invalid-localized-filters",
        type: "listing-filters",
        variant: "default",
        data: {
          listingQueryId: "published-projects",
          copy: {
            loadingLabel: "Aktualizowanie wyników...",
            unknownLabel: "not allowed",
          },
        } as unknown as ListingFiltersData,
      })
    ).toThrow(/additional properties/i);
  });

  it("renders Polish filter states and collection copy while preserving absent-locale defaults", async () => {
    const document = createListingDocument();
    const polish = await preparePageRuntimeDocument(
      document,
      {
        preview: false,
        breakpoint: "desktop",
        contentRoutes: [],
        siteLocale: "pl-PL",
      },
      runtimeDeps
    );
    const polishFilters = polish.runtimeDataByBlockId["projects-filters"];
    const polishCollection = polish.runtimeDataByBlockId["projects-collection"];
    expect(polishFilters).toMatchObject({
      kind: "filters",
      data: {
        title: "Filtruj wyniki",
        description: "Zawęź wyniki za pomocą dostępnych filtrów.",
        searchLabel: "Szukaj projektu",
        searchPlaceholder: "Wpisz nazwę projektu...",
        applyLabel: "Pokaż projekty",
        copy: {
          autoApplyLabel: "Wyniki aktualizują się automatycznie.",
          loadingLabel: "Aktualizowanie wyników...",
          rejectedLabel: "Pominięto nieprawidłowe parametry filtrów.",
        },
      },
    });
    expect(polishCollection).toMatchObject({
      kind: "collection",
      data: {
        style: { ctaLabel: "Zobacz szczegóły" },
        emptyState: {
          title: "Brak wyników",
          description: "Zmień filtry lub opublikuj pasujące treści.",
        },
      },
    });

    const polishHtml = renderPublicPageV2RuntimeHtml({
      title: "Projekty — FormaDom",
      document: polish.document,
      runtimeDataByBlockId: polish.runtimeDataByBlockId,
      siteLocale: "pl-PL",
    });
    expect(polishHtml).toContain('<html lang="pl-PL">');
    expect(polishHtml).toContain("Filtruj wyniki");
    expect(polishHtml).toContain("Wyniki aktualizują się automatycznie.");
    expect(polishHtml).toContain("Aktualizowanie wyników...");
    expect(polishHtml).toContain("Pominięto nieprawidłowe parametry filtrów.");
    expect(polishHtml).toContain("Zobacz szczegóły");
    expect(polishHtml).not.toMatch(
      /Filter results|Updates automatically|Updating linked results|Ignored invalid filter|Read more/
    );

    const legacy = await preparePageRuntimeDocument(
      document,
      { preview: false, breakpoint: "desktop", contentRoutes: [] },
      runtimeDeps
    );
    expect(legacy.runtimeDataByBlockId["projects-filters"]).not.toHaveProperty("data.copy");
    const legacyHtml = renderPublicPageV2RuntimeHtml({
      title: "Legacy listing",
      document: legacy.document,
      runtimeDataByBlockId: legacy.runtimeDataByBlockId,
    });
    expect(legacyHtml).toContain("Filter results");
    expect(legacyHtml).toContain("Updates automatically when values change.");
    expect(legacyHtml).toContain("Updating linked results...");
    expect(legacyHtml).toContain("Ignored invalid filter parameters.");
    expect(legacyHtml).toContain("Read more");
  });
});
