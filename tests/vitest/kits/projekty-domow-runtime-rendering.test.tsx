import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  resolveDetailPageBlocks,
  type DetailPageBindingResolverEntry,
} from "../../../core/services/content/detailPageBindingResolver";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import type { PageBlockV2, PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import { mapPageFiltersBlockToListingFiltersData } from "../../../core/services/pages/pageRuntimeBindingContract";
import { collectPrehydratedDetailBlockIds } from "../../../core/server/publicSiteEntryRuntime";
import {
  renderPublicPageRuntimeHtml,
  renderPublicPageV2RuntimeHtml,
} from "../../../core/site/renderPublicPage";
import { ListingFiltersBlock } from "../../../core/widgets/core/listingFilters";
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
  it("renders three native facet groups with canonical query controls", () => {
    const projects = buildFormaDomPages(refs).find((seed) => seed.key === "projekty");
    const document = projects?.desired.document as {
      sections: Array<{ blocks: PageBlockV2[] }>;
    };
    const source = document.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "filters");
    expect(source).toBeDefined();
    expect(source?.props).toMatchObject({
      autoApply: true,
      showSearch: true,
      showCount: false,
      searchLabel: "Szukaj projektu",
      searchPlaceholder: "Wpisz nazwę projektu...",
      applyLabel: "Pokaż projekty",
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

    expect(data.facets).toHaveLength(3);
    expect(data.facets?.map((facet) => facet.id)).toEqual(["style", "storeys", "energy"]);
    expect(html).toContain('name="lq.query-projects.data.style.in"');
    expect(html).toContain('name="lq.query-projects.data.storeys.in"');
    expect(html).toContain('name="lq.query-projects.data.energyClass.in"');
    expect(html).toContain('value="minimal"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="A+"');
  });

  it("paints advanced Page-v2 composition styles and real section anchors", () => {
    const built = buildFormaDomPages(refs);
    const render = (key: string) => {
      const seed = built.find((entry) => entry.key === key)!;
      return renderPublicPageV2RuntimeHtml({
        title: String(seed.desired.title),
        document: seed.desired.document as unknown as PageDocumentV2,
        siteLocale: "pl",
        activePath: String(seed.desired.slug),
      });
    };

    const homeHtml = render("home");
    expect(homeHtml).toContain('<html lang="pl">');
    expect(homeHtml).toContain('id="start"');
    expect(homeHtml).toContain("radial-gradient(circle at 82% 10%");
    expect(homeHtml).toContain("linear-gradient(145deg,#07111f,#163c4b)");
    expect(homeHtml).toContain("font-size:clamp(2.8rem,6vw,6.5rem)");
    expect(homeHtml).toContain("grid-template-columns:minmax(0,1fr) minmax(420px,.9fr)");
    expect(homeHtml).toContain("grid-template-columns:1fr 1.2fr");
    expect(homeHtml).toContain("grid-column:span 2");
    expect(homeHtml).toContain("grid-row:span 2");
    expect(homeHtml).toContain("box-shadow:0px 0px 80px 8px rgba(142,232,255,0.2)");
    expect(homeHtml).toContain("border-top-color:rgba(255,255,255,0.1)");
    expect(homeHtml).toContain("border-right-width:2px");
    expect(homeHtml).toContain('data-surface="ambient-orbs"');

    const pricingHtml = render("cennik");
    expect(pricingHtml).toContain('id="pakiety"');
    expect(pricingHtml).toContain("rgba(216,255,122,0.3)");
    expect(pricingHtml).toContain("NAJCZĘŚCIEJ WYBIERANY");

    const contactHtml = render("kontakt");
    expect(contactHtml).toContain('id="formularz"');
    expect(contactHtml).toContain('data-page-section="lead-form"');
    expect(contactHtml).toContain("MAPA POGLĄDOWA");
  });

  it("renders the bound detail composition inside the shared responsive site shell", async () => {
    const aurora = PROJECT_FIXTURES[0]!;
    const detail = buildProjectDetailDesired(
      refs.contentType,
      refs.listingQuery
    ) as unknown as DetailPageDocument;
    expect(collectPrehydratedDetailBlockIds(detail)).toEqual(new Set(["project-related"]));
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
        summary: aurora.summary,
        area: aurora.area,
        style: aurora.style,
        storeys: aurora.storeys,
        rooms: aurora.rooms,
        energyClass: aurora.energyClass,
        category: aurora.category,
        assumptions: [...aurora.assumptions],
        zones: [...aurora.zones],
        visualLabel: aurora.visualLabel,
      },
      publishedAt: new Date("2026-07-23T10:00:00.000Z"),
      scheduledAt: null,
      createdAt: new Date("2026-07-23T09:00:00.000Z"),
      updatedAt: new Date("2026-07-23T10:00:00.000Z"),
      author: null,
    } as DetailPageBindingResolverEntry;
    const blocks = await resolveDetailPageBlocks(
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
      {
        resolveListingContentListRuntimeData: async () => ({
          items: ["linea", "nova", "mono"].map((slug) => ({
            id: `${slug}-entry`,
            title: slug[0]!.toUpperCase() + slug.slice(1),
            slug,
            href: `/projekty/${slug}`,
            excerpt: `Projekt ${slug}`,
            status: "published",
          })),
        }),
      }
    );
    expect(blocks.find((block) => block.id === "project-specifications")).toMatchObject({
      type: "stats-kpi",
      variant: "cards",
      data: {
        items: [
          { id: "area", value: "148", label: "Powierzchnia" },
          { id: "storeys", value: "2", label: "Kondygnacje" },
          { id: "rooms", value: "5", label: "Pokoje" },
          { id: "energy", value: "A+", label: "Klasa energii" },
        ],
        style: {
          maxWidth: "xl",
          padding: "lg",
          minHeight: "compact",
          cardBackground: "#13233a",
        },
      },
    });
    expect(blocks.find((block) => block.id === "project-gallery")).toMatchObject({
      type: "gallery-mosaic",
      variant: "feature-left",
      data: {
        header: { description: aurora.visualLabel },
        items: [
          { id: "project-view-main", ratio: "16:9" },
          { id: "project-view-day", ratio: "4:3" },
          { id: "project-view-night", ratio: "4:3" },
          { id: "project-view-detail", ratio: "4:3" },
        ],
        style: {
          ratio: "4:3",
          gap: "lg",
          layoutDensity: "balanced",
          motionPreset: "slide-up",
        },
      },
    });
    expect(blocks.find((block) => block.id === "project-assumptions")).toMatchObject({
      data: {
        items: aurora.assumptions.map((title, index) => ({
          id: `assumption-${index + 1}`,
          title,
        })),
      },
    });
    expect(blocks.find((block) => block.id === "project-related")).toMatchObject({
      type: "content-list",
      variant: "cards",
      data: {
        source: { mode: "listing", limit: 3 },
        fields: { showImage: false, showExcerpt: true, showMeta: false, showCta: true },
        style: { columns: "3", gap: "lg", cardStyle: "elevated" },
        resolved: {
          items: [
            { title: "Linea", href: "/projekty/linea" },
            { title: "Nova", href: "/projekty/nova" },
            { title: "Mono", href: "/projekty/mono" },
          ],
        },
      },
    });
    const footerDocument = buildFooterTemplate().desired.document as unknown as NonNullable<
      Parameters<typeof renderPublicPageRuntimeHtml>[0]["siteShell"]
    >["footerDocument"];

    const html = await renderPublicPageRuntimeHtml({
      title: "Aurora — FormaDom",
      blocks,
      templateKey: "project-detail",
      inlineCss: ":root{--color-bg:#07111f;--color-text:#f7fbff}",
      responsiveCss: '@media(max-width:767px){[data-site-footer="true"]{--detail-footer-mobile:1}}',
      siteLocale: "pl",
      siteName: "FormaDom Studio",
      activePath: "/projekty/aurora",
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
    expect(html).toContain("linear-gradient(135deg");
    expect(html).toContain('data-stats-kpi-count="4"');
    expect(html).toContain('data-stats-kpi-variant="cards"');
    expect(html).toContain('data-stats-kpi-max-width="xl"');
    expect(html).toContain('data-stats-kpi-padding="lg"');
    expect(html).toContain('data-stats-kpi-min-height="compact"');
    expect(html).toContain("148");
    expect(html).toContain("A+");
    expect(html).toContain('data-gallery-mosaic-variant="feature-left"');
    expect(html).toContain('data-gallery-mosaic-count="4"');
    expect(html).toContain('data-gallery-mosaic-gap="lg"');
    expect(html).toContain('data-gallery-mosaic-ratio="4:3"');
    expect(html).toContain('data-gallery-mosaic-layout-density="balanced"');
    expect(html).toContain('data-gallery-mosaic-motion="slide-up"');
    expect(html).toContain(aurora.visualLabel);
    for (const assumption of aurora.assumptions) {
      expect(html).toContain(assumption);
    }
    expect(html).toContain('data-content-list-items="3"');
    expect(html).toContain('data-content-list-variant="cards"');
    expect(html).toContain("grid-cols-1 md:grid-cols-2 lg:grid-cols-3");
    expect(html).toContain('href="/projekty/linea"');
    expect(html).toContain('href="/oferta"');
    expect(html).toContain('href="/kontakt"');
    expect(html).not.toMatch(
      /Build your system with Coderso|Launch modern sites|Get started|Learn more|Untitled|Read more|Media [1-4]|Content list|Choose a listing query/
    );
  });
});
