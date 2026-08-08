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
  PROJECT_DETAIL_BINDINGS,
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
  it("registers the exact seven-block native composition", () => {
    const detail = buildProjectDetailDesired(contentRef);
    const blocks = detail.blocks as Array<Record<string, unknown>>;
    expect(blocks.map(({ id, type, variant }) => ({ id, type, variant }))).toEqual([
      { id: "project-back-link", type: "rich-text-section", variant: "single-column" },
      { id: "project-hero", type: "hero", variant: "centered" },
      { id: "project-hero-art", type: "grid-columns", variant: "asymmetric" },
      { id: "project-statistics", type: "feature-grid", variant: "cards-4" },
      { id: "project-contact-cta", type: "cta-banner", variant: "centered" },
      { id: "project-assumptions", type: "feature-grid", variant: "cards-3" },
      { id: "project-gallery", type: "grid-columns", variant: "asymmetric" },
    ]);
    expect(blocks[0]?.data).toMatchObject({
      titleBlock: {},
      body: { html: '<p><a href="/projekty">← Wróć do projektów</a></p>' },
      options: { dropcap: false, toc: false, maxWidth: "full", outputMode: "html" },
    });
    expect(blocks[1]?.data).toMatchObject({
      headline: "—",
      subhead: "",
      body: "—",
      badge: { enabled: true, label: "—", tone: "primary", placement: "above-headline" },
      primaryCta: { label: "", href: "" },
      media: { type: "none", source: "external" },
    });

    const heroArt = blocks[2] as { data: JsonObject; slots: JsonObject };
    expect(heroArt.data.columns).toEqual([
      expect.objectContaining({
        id: "hero-art-main",
        desktopSpan: "8",
        tabletSpan: "12",
        mobileSpan: "12",
        minHeight: "xl",
        style: expect.objectContaining({ background: "var(--color-primary)" }),
      }),
      expect.objectContaining({
        id: "hero-art-accent",
        desktopSpan: "4",
        tabletSpan: "12",
        mobileSpan: "12",
        minHeight: "xl",
        style: expect.objectContaining({ background: "var(--color-secondary)" }),
      }),
    ]);
    expect(heroArt.slots).toEqual({
      "column:hero-art-main": [],
      "column:hero-art-accent": [],
    });

    const statistics = blocks[3]!.data as JsonObject;
    expect(statistics).toMatchObject({
      header: { eyebrow: "", title: "", description: "" },
      items: [
        { id: "area", title: "—", description: "" },
        { id: "bedrooms", title: "—", description: "" },
        { id: "bathrooms", title: "—", description: "" },
        { id: "energy", title: "—", description: "" },
      ],
      style: { columns: "4", cardPadding: "compact", hoverEffect: "none" },
    });
    expect(JSON.stringify(statistics)).not.toMatch(/"(?:image|icon|ctaLabel|ctaHref)"/);

    expect(blocks[4]!.data).toMatchObject({
      content: { badge: "", title: "", description: "", showDescription: false },
      actions: {
        primaryCta: {
          label: "Chcę podobny dom",
          href: "/kontakt",
          enabled: true,
          openInNewTab: false,
          icon: "none",
        },
        secondaryCta: { label: "", href: "", enabled: false },
        tertiaryCta: { label: "", href: "", enabled: false },
      },
    });

    const assumptions = blocks[5]!.data as JsonObject;
    expect(assumptions).toMatchObject({
      header: { eyebrow: "—", title: "—", description: "—" },
      items: [
        { id: "living-zone", title: "—", description: "" },
        { id: "private-zone", title: "—", description: "" },
        { id: "facade", title: "—", description: "" },
      ],
      style: { columns: "3", cardPadding: "spacious", hoverEffect: "none" },
    });

    const gallery = blocks[6] as { data: JsonObject; slots: JsonObject };
    expect(
      (gallery.data.columns as JsonObject[]).map(({ id, desktopSpan, minHeight }) => ({
        id,
        desktopSpan,
        minHeight,
      }))
    ).toEqual([
      { id: "gallery-tall", desktopSpan: "5", minHeight: "xl" },
      { id: "gallery-default", desktopSpan: "4", minHeight: "md" },
      { id: "gallery-warm", desktopSpan: "3", minHeight: "md" },
    ]);
    expect(gallery.slots).toEqual({
      "column:gallery-tall": [],
      "column:gallery-default": [],
      "column:gallery-warm": [],
    });
  });

  it("pins every required no-fallback Aurora binding and removes related dependencies", () => {
    const detail = buildProjectDetailDesired(contentRef);
    expect(detail.bindings).toEqual(PROJECT_DETAIL_BINDINGS);
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
    expect(hero.data).toMatchObject({
      headline: "Dom Aurora",
      body: PROJECT_FIXTURES[0]!.detailLead,
      badge: { label: "Projekt pokazowy" },
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
    expect(JSON.stringify(first)).not.toMatch(/00000000-0000-4000|mediaId|assetId/);
  });
});
