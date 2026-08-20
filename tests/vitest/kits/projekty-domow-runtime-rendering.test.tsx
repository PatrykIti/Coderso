import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  resolveDetailPageBlocks,
  type DetailPageBindingResolverEntry,
} from "../../../core/services/content/detailPageBindingResolver";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import type { PageBlockV2, PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import { mapPageFiltersBlockToListingFiltersData } from "../../../core/services/pages/pageRuntimeBindingContract";
import {
  collectPrehydratedDetailBlockIds,
  resolveDetailPageRuntimeSeo,
} from "../../../core/server/publicSiteEntryRuntime";
import { buildDetailPageRenderDocument } from "../../../core/services/content/detailPageV2Conversion";
import { preparePageRuntimeDocument } from "../../../core/services/pages/pageRuntimeDataPreparation";
import { renderPublicPageV2RuntimeHtml } from "../../../core/site/renderPublicPage";
import { ListingFiltersBlock } from "../../../core/services/renderContracts/listingFiltersRenderer";
import { buildProjectDetailDesired } from "../../../scripts/projekty-domow/content/projectDetail";
import { PROJECT_FIXTURES } from "../../../scripts/projekty-domow/content/projectFixtures";
import { HOUSE_PROJECT_SCHEMA } from "../../../scripts/projekty-domow/content/projectSchema";
import { buildFormaDomPages } from "../../../scripts/projekty-domow/pages";
import { buildFooterTemplate } from "../../../scripts/projekty-domow/shell";

const refs = {
  contentType: { ref: "content_type", key: "house-project" } as const,
  listingQuery: { ref: "listing_query", key: "published-projects" } as const,
  listingTemplate: { ref: "listing_template", key: "project-cards" } as const,
  form: { ref: "form", key: "project-brief" } as const,
};

describe("Projekty Domów public runtime rendering", () => {
  it("renders the source-ordered native category facet and reset contract", () => {
    const projects = buildFormaDomPages(refs).find((seed) => seed.key === "projekty");
    const document = projects?.desired.data as {
      sections: Array<{ blocks: PageBlockV2[] }>;
    };
    const blocks = document.sections.flatMap((section) => section.blocks);
    const source = blocks.find((block) => block.type === "filters");
    expect(source).toBeDefined();
    expect(source?.props).toMatchObject({
      autoApply: false,
      showSearch: false,
      showCount: false,
      applyLabel: "Pokaż projekty",
    });
    expect(blocks.find((block) => block.id === "projects-reset")?.props).toMatchObject({
      label: "Wszystkie",
      href: "/projekty",
    });
    expect(blocks.find((block) => block.id === "projects-collection")?.props).toMatchObject({
      showCta: false,
      paginationMode: "none",
    });

    const filtersBlock = structuredClone(source!);
    filtersBlock.props.queryId = "query-projects";
    const data = mapPageFiltersBlockToListingFiltersData(filtersBlock);
    const html = renderToStaticMarkup(
      <ListingFiltersBlock
        data={data}
        variant="default"
        blockId="projects-filters"
        withRuntimeScript={false}
      />
    );

    expect(data.facets).toEqual([
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
    ]);
    expect(html).toContain('name="lq.query-projects.data.categories.eq"');
    for (const value of ["barn", "villa", "single", "eco"]) {
      expect(html).toContain(`value="${value}"`);
    }
    expect(html).not.toContain('value="all"');
  });

  it("paints advanced Page-v2 composition styles and real section anchors", () => {
    const built = buildFormaDomPages(refs);
    const render = (key: string) => {
      const seed = built.find((entry) => entry.key === key)!;
      return renderPublicPageV2RuntimeHtml({
        title: String(seed.desired.title),
        document: seed.desired.data as unknown as PageDocumentV2,
        siteLocale: "pl",
        activePath: String(seed.desired.slug),
      });
    };

    const homeHtml = render("home");
    expect(homeHtml).toContain('<html lang="pl">');
    expect(homeHtml).toContain('data-section-id="home-hero"');
    expect(homeHtml).toContain("radial-gradient(circle at 82% 10%");
    expect(homeHtml).toContain("linear-gradient(145deg,#07111f,#0b1628)");
    expect(homeHtml).toContain("font-size:clamp(2.8rem,6vw,6.5rem)");
    expect(homeHtml).toContain("grid-template-columns:minmax(0,1fr) minmax(420px,.9fr)");
    expect(homeHtml).toContain("grid-template-columns:1fr 1.2fr");
    expect(homeHtml).toContain("0px 0px 48px 2px rgba(142,232,255,.28)");
    expect(homeHtml).toContain("border-color:rgba(255,255,255,.14)");
    expect(homeHtml).toContain("border-width:1px");
    expect(homeHtml).toContain('data-surface="ambient-orbs"');
    expect(homeHtml).toContain('role="tablist"');
    expect(homeHtml).toContain('aria-label="Wybór stylu domu"');
    expect(homeHtml).toContain("Nowoczesna stodoła");
    expect(homeHtml).toContain("Modern Barn");
    expect(homeHtml).toContain("Miejska willa");
    expect(homeHtml).toContain("Urban Villa");
    expect(homeHtml).toContain("Dom eko");
    expect(homeHtml).toContain("Eco Soft");

    const pricingHtml = render("cennik");
    expect(pricingHtml).toContain('data-section-id="pricing-packages"');
    expect(pricingHtml).toContain("rgba(173,255,216,.28)");
    expect(pricingHtml).toContain("Najczęściej wybierane");

    const contactHtml = render("kontakt");
    expect(contactHtml).toContain('data-section-id="contact-form-section"');
    expect(contactHtml).toContain('data-page-section="lead-form"');
    expect(contactHtml).toContain('aria-label="Abstrakcyjna mapa lokalizacji"');
  });

  it("renders the bound detail composition through the Page v2 runtime inside the shared responsive site shell", async () => {
    const aurora = PROJECT_FIXTURES[0]!;
    const detail = buildProjectDetailDesired(
      refs.contentType,
      refs.listingQuery
    ) as unknown as DetailPageDocument;
    expect(collectPrehydratedDetailBlockIds(detail)).toEqual(new Set());
    const entry = {
      id: "aurora-entry",
      typeId: "house-project-type",
      title: aurora.title,
      slug: aurora.slug,
      status: "published",
      visibility: "public",
      hasPassword: false,
      tags: [],
      data: {
        cardDescription: aurora.cardDescription,
        cardHref: aurora.cardHref,
        area: aurora.area,
        categories: [...aurora.categories],
        referenceOrder: aurora.referenceOrder,
        seoDescription: aurora.seoDescription,
        detailEyebrow: aurora.detailEyebrow,
        detailLead: aurora.detailLead,
        detailStats: aurora.detailStats?.map((stat) => ({ ...stat })),
        assumptionsEyebrow: aurora.assumptionsEyebrow,
        assumptionsTitle: aurora.assumptionsTitle,
        assumptionsLead: aurora.assumptionsLead,
        assumptions: aurora.assumptions?.map((assumption) => ({ ...assumption })),
      },
      publishedAt: new Date("2026-07-23T10:00:00.000Z"),
      scheduledAt: null,
      createdAt: new Date("2026-07-23T09:00:00.000Z"),
      updatedAt: new Date("2026-07-23T10:00:00.000Z"),
      author: null,
    } as DetailPageBindingResolverEntry;
    const sections = await resolveDetailPageBlocks(
      {
        document: detail,
        entry,
        contentType: {
          id: "house-project-type",
          slug: "house-project",
          schema: HOUSE_PROJECT_SCHEMA,
        },
        preview: false,
      },
      {}
    );
    expect(sections.map((section) => section.id)).toEqual([
      "project-back-link",
      "project-hero",
      "project-hero-art",
      "project-statistics",
      "project-contact-cta",
      "project-assumptions",
      "project-gallery",
    ]);
    const hero = sections.find((section) => section.id === "project-hero");
    expect(hero?.type).toBe("hero");
    expect(hero?.blocks.find((block) => block.id === "project-hero-heading")).toMatchObject({
      type: "heading",
      props: { text: "Dom Aurora" },
    });
    expect(hero?.blocks.find((block) => block.id === "project-hero-text")).toMatchObject({
      type: "text",
      props: { text: aurora.detailLead },
    });
    expect(hero?.blocks.find((block) => block.id === "project-hero-badge")).toMatchObject({
      type: "badge",
      props: { text: aurora.detailEyebrow },
    });
    expect(
      sections
        .find((section) => section.id === "project-hero-art")
        ?.blocks.find((block) => block.id === "project-hero-art-columns")
    ).toMatchObject({
      type: "columns",
      props: { count: 2 },
    });
    const statistics = sections.find((section) => section.id === "project-statistics");
    for (const [index, stat] of (aurora.detailStats ?? []).entries()) {
      expect(
        statistics?.blocks.find((block) => block.id === `project-statistics-card-${index}`)
      ).toMatchObject({
        type: "card",
        props: { title: stat.value, text: stat.label },
      });
    }
    expect(
      sections
        .find((section) => section.id === "project-contact-cta")
        ?.blocks.find((block) => block.id === "project-contact-cta-button")
    ).toMatchObject({
      type: "button",
      props: { label: "Chcę podobny dom", href: "/kontakt" },
    });
    const assumptions = sections.find((section) => section.id === "project-assumptions");
    for (const [index, assumption] of (aurora.assumptions ?? []).entries()) {
      expect(
        assumptions?.blocks.find((block) => block.id === `project-assumptions-card-${index}`)
      ).toMatchObject({
        type: "card",
        props: { title: assumption.title, text: assumption.description },
      });
    }
    expect(
      sections
        .find((section) => section.id === "project-gallery")
        ?.blocks.find((block) => block.id === "project-gallery-columns")
    ).toMatchObject({
      type: "columns",
      props: { count: 3 },
    });
    const detailSeo = resolveDetailPageRuntimeSeo({
      document: detail,
      entry,
      contentTypeName: "Projekty domów",
    });
    expect(detailSeo).toMatchObject({
      title: "Dom Aurora — projekt pokazowy — FormaDom Studio",
      metaDescription: aurora.seoDescription,
    });
    const footerDocument = buildFooterTemplate().desired.document as unknown as NonNullable<
      Parameters<typeof renderPublicPageV2RuntimeHtml>[0]["siteShell"]
    >["footerDocument"];

    // The kit detail document carries no collection/form/filters blocks, so the
    // preparation stubs below are never invoked; they keep this Bun-free lane
    // free of db/runtime imports.
    const prepared = await preparePageRuntimeDocument(
      buildDetailPageRenderDocument(detail, sections),
      {
        preview: false,
        breakpoint: "desktop",
        contentRoutes: [],
      },
      {
        resolveContentListRuntimeData: async () => {
          throw new Error("kit detail document has no collection block");
        },
        resolveFormRuntimeData: async () => {
          throw new Error("kit detail document has no form block");
        },
      }
    );
    expect(prepared.cacheable).toBe(true);
    expect(prepared.cacheMode).toBe("full");

    const html = renderPublicPageV2RuntimeHtml({
      title: detailSeo.title,
      document: prepared.document,
      runtimeDataByBlockId: prepared.runtimeDataByBlockId,
      templateKey: "project-detail",
      inlineCss: ":root{--color-bg:#07111f;--color-text:#f7fbff}",
      responsiveCss: '@media(max-width:767px){[data-site-footer="true"]{--detail-footer-mobile:1}}',
      siteLocale: "pl",
      siteName: "FormaDom Studio",
      activePath: "/projekty/aurora",
      metaDescription: detailSeo.metaDescription,
      canonicalUrl: "http://127.0.0.1:3000/projekty/aurora",
      siteShell: {
        navigation: {
          label: "Menu główne FormaDom",
          items: [
            { label: "Start", href: "/" },
            { label: "Projekty", href: "/projekty" },
            { label: "Kontakt", href: "/kontakt" },
          ],
        },
        navigationDocument: null,
        footerDocument,
      },
    });

    expect(html).toContain('<html lang="pl">');
    expect(html).toContain('data-site-header="true"');
    expect(html).toContain('href="/projekty"');
    expect(html).toContain('data-site-footer="true"');
    expect(html).toContain('data-page-responsive="true"');
    expect(html).toContain('[data-site-header="true"]{border-bottom:');
    expect(html).toContain('[data-site-footer="true"]{border-top:');
    expect(html).toContain("--detail-footer-mobile:1");
    expect(html).toContain("<title>Dom Aurora — projekt pokazowy — FormaDom Studio</title>");
    expect(html).toContain(`name="description" content="${aurora.seoDescription}"`);
    expect(html).toContain('rel="canonical" href="http://127.0.0.1:3000/projekty/aurora"');
    // Hero headline bound from the entry renders as visible heading text.
    expect(html).toContain('data-block-id="project-hero-heading"');
    expect(html).toContain("Dom Aurora");
    expect(html).toContain(aurora.detailLead);
    // hero-art grid columns
    expect(html).toContain('data-page-layout-columns-count="2"');
    expect(html).toContain('data-block-id="project-hero-art-columns"');
    // feature cards bound from the entry stats
    for (const stat of aurora.detailStats ?? []) {
      expect(html).toContain(stat.value);
      expect(html).toContain(stat.label);
    }
    // CTA
    expect(html).toContain("Chcę podobny dom");
    expect(html).toContain('href="/kontakt"');
    for (const assumption of aurora.assumptions ?? []) {
      expect(html).toContain(assumption.title);
      expect(html).toContain(assumption.description);
    }
    // gallery grid columns
    expect(html).toContain('data-page-layout-columns-count="3"');
    expect(html).toContain('data-block-id="project-gallery-columns"');
    // TASK-580-03-L04: the converted kit doc renders through the v2 pipeline;
    // no v1 legacy-widget placeholder data, no unknown-widget fallback, and no
    // kit authoring placeholders. (Unbound v2 block defaults such as the hero
    // "Learn more" button and "Heading" section heads are intentional section
    // defaults from the kit's authored sections, not v1 leakage.)
    expect(html).not.toContain("data-legacy-widget");
    expect(html).not.toContain("widget_unknown_type");
    expect(html).not.toMatch(
      /Build your system with Coderso|Launch modern sites|Get started|Untitled|Read more|Media [1-4]|Content list|Choose a listing query/
    );
  });
});
