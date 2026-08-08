import { expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries } from "../../../core/db/schema";
import { createEntry } from "../../../core/services/content/entryService";
import { createContentType } from "../../../core/services/content/typeService";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { getSiteCacheStats } from "../../../core/site/cache/siteCache";
import {
  createActor,
  dbRuntimeTimeout,
  pageData,
  requestPublicPath,
  setTestSetting,
  testIfDbWithOptions,
  trackContentEntry,
  trackContentType,
  trackPage,
} from "./pages-runtime-test-support";

testIfDbWithOptions(
  "public page runtime resolves collection blocks with published-only content",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Collection ${token}`,
      slug: `runtime-collection-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    const publishedEntry = await createEntry(contentType.id, {
      title: `Published collection item ${token}`,
      slug: `published-collection-item-${token}`,
      authorId: actor.id,
      data: { summary: `Published summary ${token}` },
    });
    trackContentEntry(publishedEntry?.id);
    if (!publishedEntry?.id) throw new Error("missing_published_entry");
    await db
      .update(contentEntries)
      .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
      .where(eq(contentEntries.id, publishedEntry.id));

    const draftEntry = await createEntry(contentType.id, {
      title: `Draft collection item ${token}`,
      slug: `draft-collection-item-${token}`,
      authorId: actor.id,
      data: { summary: `Draft summary ${token}` },
    });
    trackContentEntry(draftEntry?.id);
    if (!draftEntry?.id) throw new Error("missing_draft_entry");

    const slug = `/runtime-collection-page-${token}`;
    const pageDocument = {
      ...pageData(`Runtime Collection Page ${token}`),
      sections: [
        {
          ...pageData(`Runtime Collection Page ${token}`).sections[0]!,
          blocks: [
            {
              id: `runtime-collection-block-${token}`,
              type: "collection",
              props: {
                contentTypeId: contentType.id,
                limit: 6,
              },
              visibility: { visible: true },
            },
          ],
        },
      ],
    };
    const created = await createPage({
      title: `Runtime Collection Page ${token}`,
      slug,
      authorId: actor.id,
      data: pageDocument,
    });
    trackPage(created?.id);
    if (!created?.id) throw new Error("missing_collection_page");
    await publishPage(created.id, actor.id, pageDocument);

    const firstResponse = await requestPublicPath(slug);
    expect(firstResponse.status).toBe(200);
    const firstHtml = await firstResponse.text();
    expect(firstHtml).toContain('data-content-list-state="ready"');
    expect(firstHtml).toContain(`Published collection item ${token}`);
    expect(firstHtml).toContain(`Published summary ${token}`);
    expect(firstHtml).not.toContain(`Draft collection item ${token}`);
    expect(firstHtml).not.toContain(`Draft summary ${token}`);

    const statsAfterFirstRender = getSiteCacheStats();
    expect(statsAfterFirstRender.size).toBe(1);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "public v2 filters block renders facets, applies lq filters and sort, and ships the runtime script only when needed (TASK-459-02)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Filters ${token}`,
      slug: `runtime-filters-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
          rooms: { type: "number" },
        },
      },
    });
    trackContentType(contentType.id);

    const seedEntry = async (title: string, slug: string, rooms: number) => {
      const entry = await createEntry(contentType.id, {
        title,
        slug,
        authorId: actor.id,
        data: { summary: `${title} summary`, rooms },
      });
      trackContentEntry(entry?.id);
      if (!entry?.id) throw new Error("missing_filters_entry");
      await db
        .update(contentEntries)
        .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
        .where(eq(contentEntries.id, entry.id));
      return entry;
    };
    await seedEntry(`Alpha filtered ${token}`, `alpha-filtered-${token}`, 3);
    await seedEntry(`Beta filtered ${token}`, `beta-filtered-${token}`, 2);

    const { createListingQuery, deleteListingQuery } =
      await import("../../../core/services/content/listingQueriesService");
    const listingQuery = await createListingQuery({
      name: `Runtime filters query ${token}`,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: contentType.id },
        filters: [],
        sort: [{ field: "title", dir: "asc" }],
        pagination: { limit: 20, offset: 0 },
        fields: ["id", "title", "slug", "status", "publishedAt", "updatedAt"],
      },
    });

    try {
      const queryId = listingQuery.id;
      const buildPage = (headline: string, blocks: unknown[]) => ({
        ...pageData(headline),
        sections: [
          {
            ...pageData(headline).sections[0]!,
            blocks,
          },
        ],
      });

      const filtersPageData = buildPage(`Runtime Filters Page ${token}`, [
        {
          id: `runtime-filters-block-${token}`,
          type: "filters",
          props: {
            queryId,
            autoApply: true,
            showSearch: true,
            showCount: true,
            facets: [
              {
                id: "rooms",
                kind: "checkbox",
                label: "Rooms",
                field: "data.rooms",
                op: "in",
                options: [
                  { value: "2", label: "Two rooms" },
                  { value: "3", label: "Three rooms" },
                ],
              },
              {
                id: "sort",
                kind: "sort",
                label: "Sort",
                sortOptions: [
                  {
                    value: "data.rooms:asc",
                    label: "Rooms ascending",
                    field: "data.rooms",
                    dir: "asc",
                  },
                  {
                    value: "data.rooms:desc",
                    label: "Rooms descending",
                    field: "data.rooms",
                    dir: "desc",
                  },
                ],
              },
            ],
          },
          visibility: { visible: true },
        },
        {
          id: `runtime-filters-collection-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const filtersSlug = `/runtime-filters-page-${token}`;
      const filtersPage = await createPage({
        title: `Runtime Filters Page ${token}`,
        slug: filtersSlug,
        authorId: actor.id,
        data: filtersPageData,
      });
      trackPage(filtersPage?.id);
      if (!filtersPage?.id) throw new Error("missing_filters_page");
      await publishPage(filtersPage.id, actor.id, filtersPageData);

      // 1) Unfiltered render: the facet GET form (no-JS fallback), the sort
      // control, the result count, and exactly one runtime script tag.
      const baseResponse = await requestPublicPath(filtersSlug);
      expect(baseResponse.status).toBe(200);
      const baseHtml = await baseResponse.text();
      expect(baseHtml).toContain("data-listing-runtime-form");
      expect(baseHtml).toContain('method="get"');
      expect(baseHtml).toContain(`name="lq.${queryId}.data.rooms.in"`);
      expect(baseHtml).toContain(`name="lq.${queryId}.__sort"`);
      expect(baseHtml).toContain(`name="lq.${queryId}.__q"`);
      expect(baseHtml).toContain('data-page-filters-count="2"');
      expect(baseHtml).toContain(`Alpha filtered ${token}`);
      expect(baseHtml).toContain(`Beta filtered ${token}`);
      expect(baseHtml.split('data-coderso-runtime-script="listing-runtime"')).toHaveLength(2);

      // 2) Filtered render through the existing lq.* server pipeline: the
      // collection narrows, the count updates, the facet shows applied state.
      const filteredResponse = await requestPublicPath(
        `${filtersSlug}?lq.${queryId}.data.rooms.in=3`
      );
      expect(filteredResponse.status).toBe(200);
      const filteredHtml = await filteredResponse.text();
      expect(filteredHtml).toContain(`Alpha filtered ${token}`);
      expect(filteredHtml).not.toContain(`Beta filtered ${token}`);
      expect(filteredHtml).toContain('data-page-filters-count="1"');
      // Applied state: the matching facet option renders checked and the
      // active-filters chip row (with its clear-all affordance) appears.
      expect(filteredHtml).toContain('checked="" value="3"');
      expect(filteredHtml).toContain('data-listing-clear-all="1"');

      // 3) Visitor sort: lq.<id>.__sort reorders the listing both ways.
      const ascHtml = await (
        await requestPublicPath(`${filtersSlug}?lq.${queryId}.__sort=data.rooms%3Aasc`)
      ).text();
      expect(ascHtml.indexOf(`Beta filtered ${token}`)).toBeLessThan(
        ascHtml.indexOf(`Alpha filtered ${token}`)
      );
      const descHtml = await (
        await requestPublicPath(`${filtersSlug}?lq.${queryId}.__sort=data.rooms%3Adesc`)
      ).text();
      expect(descHtml.indexOf(`Alpha filtered ${token}`)).toBeLessThan(
        descHtml.indexOf(`Beta filtered ${token}`)
      );

      // 4) Pages without a filters block stay script-free (seam gating).
      const plainPageData = buildPage(`Runtime Filters Plain ${token}`, [
        {
          id: `runtime-filters-plain-collection-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const plainSlug = `/runtime-filters-plain-${token}`;
      const plainPage = await createPage({
        title: `Runtime Filters Plain ${token}`,
        slug: plainSlug,
        authorId: actor.id,
        data: plainPageData,
      });
      trackPage(plainPage?.id);
      if (!plainPage?.id) throw new Error("missing_plain_page");
      await publishPage(plainPage.id, actor.id, plainPageData);
      const plainHtml = await (await requestPublicPath(plainSlug)).text();
      expect(plainHtml).toContain(`Alpha filtered ${token}`);
      expect(plainHtml).not.toContain('data-coderso-runtime-script="listing-runtime"');
    } finally {
      await deleteListingQuery(listingQuery.id);
    }
  },
  // Five full public renders plus scoped DB cleanup; keep the budget aligned
  // with the comparable pagination runtime test below.
  { timeout: dbRuntimeTimeout * 2 }
);

testIfDbWithOptions(
  "public v2 collection pagination pages through lq page params with the numbered pager; default none and dangling routes stay guarded (TASK-459-03)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime Pagination ${token}`,
      slug: `runtime-pagination-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    const seedEntry = async (title: string, slug: string) => {
      const entry = await createEntry(contentType.id, {
        title,
        slug,
        authorId: actor.id,
        data: { summary: `${title} summary` },
      });
      trackContentEntry(entry?.id);
      if (!entry?.id) throw new Error("missing_pagination_entry");
      await db
        .update(contentEntries)
        .set({ status: "published", publishedAt: new Date("2026-06-01T10:00:00.000Z") })
        .where(eq(contentEntries.id, entry.id));
      return entry;
    };
    await seedEntry(`Aurora paged ${token}`, `aurora-paged-${token}`);
    await seedEntry(`Borealis paged ${token}`, `borealis-paged-${token}`);
    await seedEntry(`Cascade paged ${token}`, `cascade-paged-${token}`);

    const { createListingQuery, deleteListingQuery } =
      await import("../../../core/services/content/listingQueriesService");
    const listingQuery = await createListingQuery({
      name: `Runtime pagination query ${token}`,
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: contentType.id },
        filters: [],
        sort: [{ field: "title", dir: "asc" }],
        pagination: { limit: 20, offset: 0 },
        fields: ["id", "title", "slug", "status", "publishedAt", "updatedAt"],
      },
    });

    try {
      const queryId = listingQuery.id;
      const buildPage = (headline: string, blocks: unknown[]) => ({
        ...pageData(headline),
        sections: [
          {
            ...pageData(headline).sections[0]!,
            blocks,
          },
        ],
      });

      const pagedPageData = buildPage(`Runtime Pagination Page ${token}`, [
        {
          id: `runtime-pagination-block-${token}`,
          type: "collection",
          props: {
            contentTypeId: contentType.id,
            queryId,
            limit: 6,
            paginationMode: "paged",
            pageSize: 2,
          },
          visibility: { visible: true },
        },
      ]);
      const pagedSlug = `/runtime-pagination-page-${token}`;
      const pagedPage = await createPage({
        title: `Runtime Pagination Page ${token}`,
        slug: pagedSlug,
        authorId: actor.id,
        data: pagedPageData,
      });
      trackPage(pagedPage?.id);
      if (!pagedPage?.id) throw new Error("missing_pagination_page");
      await publishPage(pagedPage.id, actor.id, pagedPageData);

      // 1) Page 1: two of three entries, the numbered pager with totals, the
      // lq page-token next href, and the fetch-swap script (paged + listing).
      const firstResponse = await requestPublicPath(pagedSlug);
      expect(firstResponse.status).toBe(200);
      const firstHtml = await firstResponse.text();
      expect(firstHtml).toContain(`Aurora paged ${token}`);
      expect(firstHtml).toContain(`Borealis paged ${token}`);
      expect(firstHtml).not.toContain(`Cascade paged ${token}`);
      expect(firstHtml).toContain('data-content-list-pagination="paged"');
      expect(firstHtml).toContain('data-content-list-total="3"');
      expect(firstHtml.replace(/<!-- -->/g, "")).toContain("3 results");
      expect(firstHtml).toContain(`href="?lq.${queryId}.__page=2"`);
      expect(firstHtml).toContain('data-listing-page-link="1"');
      expect(firstHtml.split('data-coderso-runtime-script="listing-runtime"')).toHaveLength(2);

      // 2) Page 2 via the validated lq grammar: the remaining entry, the
      // canonical previous href (page 1 drops the param), current page marked.
      const secondResponse = await requestPublicPath(`${pagedSlug}?lq.${queryId}.__page=2`);
      expect(secondResponse.status).toBe(200);
      const secondHtml = await secondResponse.text();
      expect(secondHtml).toContain(`Cascade paged ${token}`);
      expect(secondHtml).not.toContain(`Aurora paged ${token}`);
      expect(secondHtml).toContain('aria-current="page"');
      expect(secondHtml).toContain('data-content-list-page="2"');
      expect(secondHtml).toContain('href="?"');

      // 3) Dangling-route guard (frozen policy): no content route is
      // registered, so cards render unlinked with the explicit note instead
      // of `/${typeSlug}/:slug` hrefs the matcher cannot match.
      expect(firstHtml).toContain('data-content-list-link-unavailable="1"');
      expect(firstHtml).not.toContain(`href="/runtime-pagination-${token}/`);

      // 4) Legacy documents (no pagination props) keep the default "none":
      // no pager, no runtime script — byte-for-byte today's render contract.
      const legacyPageData = buildPage(`Runtime Pagination Legacy ${token}`, [
        {
          id: `runtime-pagination-legacy-${token}`,
          type: "collection",
          props: { contentTypeId: contentType.id, queryId, limit: 6 },
          visibility: { visible: true },
        },
      ]);
      const legacySlug = `/runtime-pagination-legacy-${token}`;
      const legacyPage = await createPage({
        title: `Runtime Pagination Legacy ${token}`,
        slug: legacySlug,
        authorId: actor.id,
        data: legacyPageData,
      });
      trackPage(legacyPage?.id);
      if (!legacyPage?.id) throw new Error("missing_legacy_pagination_page");
      await publishPage(legacyPage.id, actor.id, legacyPageData);
      const legacyHtml = await (await requestPublicPath(legacySlug)).text();
      expect(legacyHtml).toContain(`Cascade paged ${token}`);
      expect(legacyHtml).not.toContain('data-content-list-pagination="paged"');
      expect(legacyHtml).not.toContain('data-coderso-runtime-script="listing-runtime"');
    } finally {
      await deleteListingQuery(listingQuery.id);
    }
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "auto entry-list routes paginate and sort through searchParams (TASK-459-03)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);

    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Runtime List Route ${token}`,
      slug: `runtime-list-route-${token}`,
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
        },
      },
    });
    trackContentType(contentType.id);

    // 25 published entries: one more than the contract page size (24).
    // Bulk-seeded in one statement to keep the fixture inside the runtime
    // test budget; ids are tracked for the standard scoped cleanup.
    const seededEntries = await db
      .insert(contentEntries)
      .values(
        Array.from({ length: 25 }, (_, offset) => {
          const label = String(offset + 1).padStart(2, "0");
          return {
            typeId: contentType.id,
            authorId: actor.id,
            slug: `listed-entry-${label}-${token}`,
            title: `Listed entry ${label} ${token}`,
            status: "published",
            data: { summary: `Listed entry ${label}` },
            publishedAt: new Date(`2026-05-01T10:${label}:00.000Z`),
          };
        })
      )
      .returning({ id: contentEntries.id });
    seededEntries.forEach((row) => trackContentEntry(row.id));
    if (seededEntries.length !== 25) throw new Error("missing_list_route_entries");

    await setTestSetting("site.contentRoutes", [
      {
        type: contentType.slug,
        listPath: `/listed-${token}`,
        detailPath: `/listed-${token}/:slug`,
        enabled: true,
      },
    ]);

    try {
      // Page 1: the newest 24 entries (published-desc default) + the pager.
      // Entry 01 (the oldest) belongs to page 2.
      const firstResponse = await requestPublicPath(`/listed-${token}`);
      expect(firstResponse.status).toBe(200);
      const firstHtml = await firstResponse.text();
      expect(firstHtml).toContain(`Listed entry 25 ${token}`);
      expect(firstHtml).toContain(`Listed entry 02 ${token}`);
      expect(firstHtml).not.toContain(`Listed entry 01 ${token}`);
      expect(firstHtml).toContain('data-content-list-pagination="paged"');
      expect(firstHtml).toContain('data-content-list-total="25"');
      expect(firstHtml).toContain('href="?page=2"');

      // Page 2 via searchParams: the remaining entry only.
      const secondHtml = await (await requestPublicPath(`/listed-${token}?page=2`)).text();
      expect(secondHtml).toContain(`Listed entry 01 ${token}`);
      expect(secondHtml).not.toContain(`Listed entry 25 ${token}`);

      // Sort rides the same validated grammar (title-asc puts entry 01 on
      // page 1); unknown sort values fall back to the default ordering.
      const sortedHtml = await (await requestPublicPath(`/listed-${token}?sort=title-asc`)).text();
      expect(sortedHtml).toContain(`Listed entry 01 ${token}`);
      expect(sortedHtml).not.toContain(`Listed entry 25 ${token}`);
      const fallbackHtml = await (await requestPublicPath(`/listed-${token}?sort=__nope__`)).text();
      expect(fallbackHtml).toContain(`Listed entry 25 ${token}`);
      expect(fallbackHtml).not.toContain(`Listed entry 01 ${token}`);

      // Out-of-range pages clamp into range instead of 404ing.
      const clampedHtml = await (await requestPublicPath(`/listed-${token}?page=99`)).text();
      expect(clampedHtml).toContain(`Listed entry 01 ${token}`);
    } finally {
      await setTestSetting("site.contentRoutes", []);
    }
  },
  // Five full public renders over a 25-entry corpus: double the standard
  // runtime budget.
  { timeout: dbRuntimeTimeout * 2 }
);
