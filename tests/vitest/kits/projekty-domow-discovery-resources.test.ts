import { describe, expect, it } from "vitest";

import {
  type DetailPageBindingResolverEntry,
  resolveDetailPageBlocks,
} from "../../../core/services/content/detailPageBindingResolver";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import { matchContentRoute } from "../../../core/site/contentRouteMatcher";
import { normalizeWidgetBlocks } from "../../../core/widgets/validator";
import { buildProjectDiscoveryResources } from "../../../scripts/projekty-domow/content/buildProjectDiscoveryResources";
import { HOUSE_PROJECT_RESOURCE_KEY } from "../../../scripts/projekty-domow/content/constants";
import {
  buildContentRouteSettingDesired,
  buildProjectDetailDesired,
  PROJECT_DETAIL_KEY,
  PROJECT_DETAIL_PATH,
  PROJECT_LIST_PATH,
} from "../../../scripts/projekty-domow/content/projectDetail";
import {
  buildPublishedProjectQueryDesired,
  normalizeProjectFacetFields,
  PROJECT_FACET_FIELDS,
  PROJECT_LISTING_QUERY_KEY,
} from "../../../scripts/projekty-domow/content/projectListing";
import { PROJECT_FIXTURES } from "../../../scripts/projekty-domow/content/projectFixtures";
import { HOUSE_PROJECT_SCHEMA } from "../../../scripts/projekty-domow/content/projectSchema";

const contentRef = { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY } as const;
const queryRef = { ref: "listing_query", key: PROJECT_LISTING_QUERY_KEY } as const;
const detailRef = { ref: "detail_page", key: PROJECT_DETAIL_KEY } as const;

describe("Projekty Domów discovery resources", () => {
  it("builds four strict seeds with closed reference paths", () => {
    const resources = buildProjectDiscoveryResources();
    expect(resources.listingTemplates).toHaveLength(1);
    expect(resources.listingQueries[0]?.desired.query).toMatchObject({
      source: "entries",
      sourceConfig: { contentTypeId: contentRef, includeDrafts: false },
      filters: [{ field: "status", op: "eq", value: "published" }],
    });
    expect(resources.detailPages[0]?.desired).toMatchObject({
      contentTypeId: contentRef,
      status: "published",
      related: [{ kind: "listing-query", listingQueryId: queryRef }],
    });
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

  it("uses one /projekty route family for the Page v2 catalogue and dynamic details", () => {
    const setting = buildContentRouteSettingDesired(detailRef);
    const routes = setting.value as Parameters<typeof matchContentRoute>[1];

    expect(PROJECT_LIST_PATH).toBe("/projekty");
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

  it("keeps listing template lifecycle-free and pins three facet fields", () => {
    const desired = buildProjectDiscoveryResources().listingTemplates[0]!.desired;
    expect(desired).not.toHaveProperty("status");
    expect(desired).toMatchObject({
      layout: "grid",
      config: { style: { columns: 3 }, fields: expect.any(Array) },
    });
    const query = buildProjectDiscoveryResources().listingQueries[0]!.desired.query as {
      fields: string[];
    };
    expect(query.fields).toEqual(expect.arrayContaining([...PROJECT_FACET_FIELDS]));
  });

  it("round-trips the full Aurora composition through native widget bindings", async () => {
    const detail = buildProjectDetailDesired(contentRef, queryRef);
    expect(detail.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockId: "project-hero",
          propPath: "headline",
          source: { kind: "entry-meta", field: "title" },
        }),
        expect.objectContaining({
          blockId: "project-hero",
          propPath: "body",
          source: { kind: "entry-field", field: "summary" },
        }),
        expect.objectContaining({
          blockId: "project-specifications",
          propPath: "items.0.value",
          source: { kind: "entry-field", field: "area" },
        }),
        expect.objectContaining({
          blockId: "project-gallery",
          propPath: "header.description",
          source: { kind: "entry-field", field: "visualLabel" },
        }),
        expect.objectContaining({
          blockId: "project-related",
          propPath: "resolved.items",
          source: { kind: "computed", resolver: "relatedItems" },
        }),
      ])
    );

    const aurora = PROJECT_FIXTURES[0]!;
    const entry: DetailPageBindingResolverEntry = {
      id: "aurora-entry",
      typeId: "house-project-type",
      title: aurora.title,
      slug: aurora.slug,
      status: "published",
      visibility: "public",
      hasPassword: false,
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
      tags: [],
      publishedAt: new Date("2026-07-23T10:00:00.000Z"),
      scheduledAt: null,
      createdAt: new Date("2026-07-23T09:00:00.000Z"),
      updatedAt: new Date("2026-07-23T10:00:00.000Z"),
      author: null,
    };
    const resolved = await resolveDetailPageBlocks(
      {
        document: detail as unknown as DetailPageDocument,
        entry,
        contentType: {
          id: "house-project-type",
          slug: HOUSE_PROJECT_RESOURCE_KEY,
          schema: HOUSE_PROJECT_SCHEMA,
        },
        preview: false,
      },
      {
        resolveListingContentListRuntimeData: async () => ({
          items: [
            {
              id: "linea-entry",
              title: "Linea",
              slug: "linea",
              href: "/projekty/linea",
              excerpt: "Parterowy układ z czytelną osią.",
              status: "published",
            },
            {
              id: "nova-entry",
              title: "Nova",
              slug: "nova",
              href: "/projekty/nova",
              excerpt: "Zwarty dom miejski.",
              status: "published",
            },
            {
              id: "mono-entry",
              title: "Mono",
              slug: "mono",
              href: "/projekty/mono",
              excerpt: "Nowoczesna stodoła.",
              status: "published",
            },
          ],
        }),
      }
    );
    const normalized = normalizeWidgetBlocks(resolved);
    expect(normalized.find((block) => block.id === "project-hero")?.data).toMatchObject({
      headline: "Aurora",
      body: aurora.summary,
    });
    expect(normalized.find((block) => block.id === "project-specifications")?.data).toMatchObject({
      items: [
        expect.objectContaining({ value: "148", suffix: " m²" }),
        expect.objectContaining({ value: "2", suffix: "kond." }),
        expect.objectContaining({ value: "5", suffix: "pok." }),
        expect.objectContaining({ value: "A+", suffix: "standard" }),
      ],
    });
    expect(normalized.find((block) => block.id === "project-gallery")?.data).toMatchObject({
      header: { description: aurora.visualLabel },
    });
    expect(normalized.find((block) => block.id === "project-assumptions")?.data).toMatchObject({
      items: aurora.assumptions.map((title) => expect.objectContaining({ title })),
    });
    expect(normalized.find((block) => block.id === "project-related")?.data).toMatchObject({
      resolved: {
        items: expect.arrayContaining([expect.objectContaining({ href: "/projekty/linea" })]),
      },
    });
    expect(normalized[0]?.data).not.toHaveProperty("data");
    expect(JSON.stringify(normalized)).not.toMatch(
      /Build your system with Coderso|Launch modern sites|Get started|Learn more/
    );
    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
    expect(JSON.stringify(detail)).not.toMatch(/00000000-0000-4000/);
    expect(detail).not.toHaveProperty("id");
  });

  it.each([
    undefined,
    { ref: "page", key: HOUSE_PROJECT_RESOURCE_KEY },
    { ref: "content_type", key: "other" },
  ])("rejects a missing or wrong project content ref", (ref) => {
    expect(() => buildPublishedProjectQueryDesired(ref)).toThrow(
      "house_project_listing_content_ref_invalid"
    );
    expect(() => buildProjectDetailDesired(ref, queryRef)).toThrow(
      "house_project_detail_content_ref_invalid"
    );
  });

  it("rejects a missing related query or wrong detail route ref", () => {
    expect(() => buildProjectDetailDesired(contentRef, undefined)).toThrow(
      "house_project_detail_query_ref_invalid"
    );
    expect(() =>
      buildContentRouteSettingDesired({ ref: "detail_page", key: "other-detail" })
    ).toThrow("house_project_route_detail_ref_invalid");
  });

  it("rejects facet fields outside the project allowlist", () => {
    expect(() => normalizeProjectFacetFields(["data.style", "data.secret"])).toThrow(
      "house_project_facet_field_invalid"
    );
  });

  it("is deterministic and contains no database ids", () => {
    const first = buildProjectDiscoveryResources();
    expect(buildProjectDiscoveryResources()).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/00000000-0000-4000/);
  });
});
