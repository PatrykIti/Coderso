import { describe, expect, it } from "vitest";

import {
  DetailPageBindingResolverError,
  type DetailPageBindingResolverEntry,
  resolveDetailPageBlocks,
} from "../../../core/services/content/detailPageBindingResolver";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import type { JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { matchContentRoute } from "../../../core/site/contentRouteMatcher";
import { buildProjectDiscoveryResources } from "../../../scripts/projekty-domow/content/buildProjectDiscoveryResources";
import { buildProjectResources } from "../../../scripts/projekty-domow/content/buildProjectResources";
import {
  HOUSE_PROJECT_CATEGORIES,
  HOUSE_PROJECT_RESOURCE_KEY,
} from "../../../scripts/projekty-domow/content/constants";
import {
  buildContentRouteSettingDesired,
  buildProjectDetailDesired,
  buildProjectDetailV2Bindings,
  PROJECT_DETAIL_KEY,
  PROJECT_DETAIL_PATH,
  PROJECT_LIST_PATH,
} from "../../../scripts/projekty-domow/content/projectDetail";
import { PROJECT_FIXTURES } from "../../../scripts/projekty-domow/content/projectFixtures";
import {
  buildPublishedProjectQueryDesired,
  normalizeProjectFacetFields,
  PROJECT_CATEGORY_FILTERS,
  PROJECT_FACET_FIELDS,
  PROJECT_LISTING_QUERY_KEY,
} from "../../../scripts/projekty-domow/content/projectListing";
import { HOUSE_PROJECT_SCHEMA } from "../../../scripts/projekty-domow/content/projectSchema";

const contentRef = { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY } as const;
const detailRef = { ref: "detail_page", key: PROJECT_DETAIL_KEY } as const;

const entryFor = (index: number): DetailPageBindingResolverEntry => {
  const fixture = PROJECT_FIXTURES[index]!;
  const data = buildProjectResources().entries[index]!.desired.data as JsonObject;
  return {
    id: `${fixture.key}-entry`,
    typeId: "house-project-type",
    title: fixture.title,
    slug: fixture.slug,
    status: "published",
    visibility: "public",
    hasPassword: false,
    data,
    tags: [],
    publishedAt: new Date("2026-07-23T10:00:00.000Z"),
    scheduledAt: null,
    createdAt: new Date("2026-07-23T09:00:00.000Z"),
    updatedAt: new Date("2026-07-23T10:00:00.000Z"),
    author: null,
  };
};

const resolveBlocksFor = (index: number) => {
  const detail = buildProjectDetailDesired(contentRef);
  return resolveDetailPageBlocks({
    document: detail as unknown as DetailPageDocument,
    entry: entryFor(index),
    contentType: {
      id: "house-project-type",
      slug: HOUSE_PROJECT_RESOURCE_KEY,
      schema: HOUSE_PROJECT_SCHEMA,
    },
    preview: false,
  });
};

describe("Projekty Domów listing resources", () => {
  it("pins exact public filter presentation and the sole native facet field", () => {
    expect(PROJECT_CATEGORY_FILTERS).toEqual([
      { value: "all", label: "Wszystkie" },
      { value: "barn", label: "Nowoczesna stodoła" },
      { value: "villa", label: "Wille" },
      { value: "single", label: "Parterowe" },
      { value: "eco", label: "Energooszczędne" },
    ]);
    expect(HOUSE_PROJECT_CATEGORIES).toEqual(
      PROJECT_CATEGORY_FILTERS.slice(1).map(({ value }) => value)
    );
    expect(PROJECT_FACET_FIELDS).toEqual(["data.categories"]);
    expect(normalizeProjectFacetFields(PROJECT_FACET_FIELDS)).toEqual(["data.categories"]);
    expect(() => normalizeProjectFacetFields(["data.categories", "data.secret"])).toThrow(
      "house_project_facet_field_invalid"
    );
    expect(() => normalizeProjectFacetFields([])).toThrow("house_project_facet_field_invalid");
  });

  it("builds the exact published-only deterministic query", () => {
    expect(buildPublishedProjectQueryDesired(contentRef).query).toEqual({
      source: "entries",
      sourceConfig: { contentTypeId: contentRef, includeDrafts: false },
      filters: [{ field: "status", op: "eq", value: "published" }],
      sort: [
        { field: "data.referenceOrder", dir: "asc" },
        { field: "id", dir: "asc" },
      ],
      pagination: { limit: 24, offset: 0 },
      fields: [
        "id",
        "title",
        "slug",
        "data.cardDescription",
        "data.area",
        "data.categories",
        "data.referenceOrder",
        "data.cardHref",
      ],
    });
  });

  it("pins the semantic title, description and href card bindings", () => {
    const desired = buildProjectDiscoveryResources().listingTemplates[0]!.desired;
    expect(desired).not.toHaveProperty("status");
    expect(desired.config).toEqual({
      fields: [
        {
          key: "title",
          source: "title",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
        {
          key: "description",
          source: "data.cardDescription",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
        {
          key: "href",
          source: "data.cardHref",
          label: null,
          fallback: null,
          format: "text",
          conditions: [],
        },
      ],
      itemActions: [],
      emptyState: {
        title: "Brak wyników",
        description: "Zmień filtry, aby zobaczyć inne projekty.",
        ctaLabel: null,
        ctaHref: null,
      },
      style: { columns: 3, gap: "lg", cardVariant: "default" },
    });
    expect(PROJECT_FIXTURES.map(({ key, cardHref }) => [key, cardHref])).toEqual([
      ["aurora", "/projekty/aurora"],
      ["linea", "/projekty"],
      ["nova", "/projekty"],
      ["mono", "/projekty"],
      ["vista", "/projekty"],
      ["calm", "/projekty"],
    ]);
  });
});

describe("Projekty Domów Aurora detail", () => {
  it("registers the exact seven-section native composition", () => {
    const detail = buildProjectDetailDesired(contentRef);
    const sections = detail.sections as Array<Record<string, unknown>>;
    expect(sections.map(({ id, type, variant }) => ({ id, type, variant }))).toEqual([
      { id: "project-back-link", type: "content", variant: "default" },
      { id: "project-hero", type: "hero", variant: "centered" },
      { id: "project-hero-art", type: "content", variant: "default" },
      { id: "project-statistics", type: "feature-grid", variant: "cards" },
      { id: "project-contact-cta", type: "cta", variant: "centered" },
      { id: "project-assumptions", type: "feature-grid", variant: "cards" },
      { id: "project-gallery", type: "content", variant: "default" },
    ]);

    const blocksOf = (index: number) =>
      (sections[index] as { blocks: Array<Record<string, unknown>> }).blocks;

    expect(blocksOf(0).map(({ id, type }) => ({ id, type }))).toEqual([
      { id: "project-back-link-heading", type: "heading" },
      { id: "project-back-link-text", type: "text" },
    ]);
    expect(blocksOf(0)[1]?.props).toMatchObject({
      text: '<p><a href="/projekty">← Wróć do projektów</a></p>',
    });

    const heroBlocks = blocksOf(1);
    expect(heroBlocks.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: "project-hero-heading", type: "heading" },
      { id: "project-hero-text", type: "text" },
      { id: "project-hero-badge", type: "badge" },
      { id: "project-hero-button", type: "button" },
      { id: "project-hero-image", type: "image" },
    ]);
    expect(heroBlocks[0]?.props).toMatchObject({ text: "—" });
    expect(heroBlocks[1]?.props).toMatchObject({ text: "—" });
    expect(heroBlocks[2]?.props).toMatchObject({ text: "—" });
    expect(heroBlocks[3]?.props).toMatchObject({ label: "", href: null });

    const heroArt = blocksOf(2)[0] as { props: JsonObject; slots: JsonObject };
    expect(heroArt).toMatchObject({ id: "project-hero-art-columns", type: "columns" });
    expect(heroArt.props).toMatchObject({ count: 2 });
    expect(heroArt.slots).toEqual({
      "column:1": [],
      "column:2": [],
    });

    const statisticsBlocks = blocksOf(3);
    expect(statisticsBlocks[3]).toMatchObject({
      id: "project-statistics-card-0",
      type: "card",
      props: { title: "—" },
    });
    expect(statisticsBlocks[4]).toMatchObject({
      id: "project-statistics-card-1",
      type: "card",
      props: { title: "—" },
    });
    expect(statisticsBlocks[5]).toMatchObject({
      id: "project-statistics-card-2",
      type: "card",
      props: { title: "—" },
    });
    expect(statisticsBlocks[6]).toMatchObject({
      id: "project-statistics-card-3",
      type: "card",
      props: { title: "—" },
    });

    expect(blocksOf(4).find(({ id }) => id === "project-contact-cta-button")?.props).toMatchObject({
      label: "Chcę podobny dom",
      href: "/kontakt",
    });

    const assumptionCards = blocksOf(5).filter(({ type }) => type === "card");
    expect(assumptionCards.map(({ id }) => id)).toEqual([
      "project-assumptions-card-0",
      "project-assumptions-card-1",
      "project-assumptions-card-2",
    ]);

    const gallery = blocksOf(6)[0] as { props: JsonObject; slots: JsonObject };
    expect(gallery).toMatchObject({ id: "project-gallery-columns", type: "columns" });
    expect(gallery.props).toMatchObject({ count: 3 });
    expect(gallery.slots).toEqual({
      "column:1": [],
      "column:2": [],
      "column:3": [],
    });
  });

  it("pins every required no-fallback Aurora binding and removes related dependencies", () => {
    const detail = buildProjectDetailDesired(contentRef);
    expect(detail.bindings).toEqual(buildProjectDetailV2Bindings());
    for (const binding of detail.bindings as JsonObject[]) {
      expect(binding.required).toBe(true);
      expect(binding).not.toHaveProperty("fallback");
      if ((binding.source as JsonObject).kind === "entry-field") {
        expect(binding.transform).toBe("text");
      }
    }
    expect(detail).not.toHaveProperty("related");
    expect(JSON.stringify(detail)).not.toContain("listing_query");
    expect(JSON.stringify(detail)).not.toContain("relatedItems");
    expect(JSON.stringify(detail)).not.toContain("project-related");
  });

  it("resolves Aurora completely and rejects every non-Aurora fixture", async () => {
    const resolved = await resolveBlocksFor(0);
    const hero = resolved.find(({ id }) => id === "project-hero")!;
    expect(hero.type).toBe("hero");
    const heroByRole = new Map(
      (hero.blocks as Array<{ id: string; props: JsonObject }>).map(({ id, props }) => [id, props])
    );
    expect(heroByRole.get("project-hero-heading")).toMatchObject({
      text: "Dom Aurora",
    });
    expect(heroByRole.get("project-hero-text")).toMatchObject({
      text: PROJECT_FIXTURES[0]!.detailLead,
    });
    expect(heroByRole.get("project-hero-badge")).toMatchObject({
      text: "Projekt pokazowy",
    });
    const serialized = JSON.stringify(resolved);
    expect(serialized).not.toContain('"—"');
    expect(serialized).not.toMatch(/Fast setup|Get started|Contact sales|Learn more/);

    for (let index = 1; index < PROJECT_FIXTURES.length; index += 1) {
      await expect(resolveBlocksFor(index)).rejects.toMatchObject({
        code: "detail_page_binding_missing_required",
      } satisfies Partial<DetailPageBindingResolverError>);
    }
  });

  it("pins neutral document title and exact dynamic Aurora SEO", () => {
    const detail = buildProjectDetailDesired(contentRef);
    expect(detail.titlePattern).toBe("{{ title }}");
    expect(detail.seo).toEqual({
      titlePattern: "{{ title }} — projekt pokazowy — FormaDom Studio",
      descriptionField: "seoDescription",
    });
    expect(
      String((detail.seo as JsonObject).titlePattern).replace("{{ title }}", "Dom Aurora")
    ).toBe("Dom Aurora — projekt pokazowy — FormaDom Studio");
    expect(PROJECT_FIXTURES[0]!.seoDescription).toBe(
      "Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy."
    );
  });
});

describe("Projekty Domów discovery resource graph", () => {
  it("builds four exact resource seeds and the content-route setting", () => {
    const resources = buildProjectDiscoveryResources();
    expect(resources.listingTemplates).toHaveLength(1);
    expect(resources.listingQueries).toEqual([
      { key: PROJECT_LISTING_QUERY_KEY, desired: buildPublishedProjectQueryDesired(contentRef) },
    ]);
    expect(resources.detailPages).toEqual([
      { key: PROJECT_DETAIL_KEY, desired: buildProjectDetailDesired(contentRef) },
    ]);
    expect(resources.settings).toEqual([
      {
        key: "site.contentRoutes",
        desired: {
          value: [
            {
              type: HOUSE_PROJECT_RESOURCE_KEY,
              listPath: PROJECT_LIST_PATH,
              detailPath: PROJECT_DETAIL_PATH,
              enabled: true,
              detailPageId: detailRef,
            },
          ],
        },
      },
    ]);
  });

  it("matches the exact list/detail route family", () => {
    const setting = buildContentRouteSettingDesired(detailRef);
    const routes = setting.value as Parameters<typeof matchContentRoute>[1];
    expect(matchContentRoute(PROJECT_LIST_PATH, routes)).toMatchObject({
      mode: "list",
      type: HOUSE_PROJECT_RESOURCE_KEY,
    });
    expect(matchContentRoute("/projekty/aurora", routes)).toMatchObject({
      mode: "detail",
      type: HOUSE_PROJECT_RESOURCE_KEY,
      params: { slug: "aurora" },
    });
    expect(matchContentRoute("/projekty-katalog", routes)).toBeNull();
  });

  it.each([
    undefined,
    { ref: "page", key: HOUSE_PROJECT_RESOURCE_KEY },
    { ref: "content_type", key: "other" },
  ])("rejects a missing or wrong project content ref", (ref) => {
    expect(() => buildPublishedProjectQueryDesired(ref)).toThrow(
      "house_project_listing_content_ref_invalid"
    );
    expect(() => buildProjectDetailDesired(ref)).toThrow(
      "house_project_detail_content_ref_invalid"
    );
  });

  it("rejects a wrong detail route ref and remains deterministic/id-free", () => {
    expect(() =>
      buildContentRouteSettingDesired({ ref: "detail_page", key: "other-detail" })
    ).toThrow("house_project_route_detail_ref_invalid");
    const first = buildProjectDiscoveryResources();
    expect(buildProjectDiscoveryResources()).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/00000000-0000-4000|mediaId|"assetId":(?!\s*null)/);
  });
});
