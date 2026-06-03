import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { resolvePostsFeedRuntimeData } from "../../../core/services/content/postsFeedResolver";
import type { PostSummary } from "../../../core/services/content/postsService";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import {
  createPostsFeedWidget,
  mapPostsFeedToContentListData,
  normalizePostsFeedData,
  postsFeedDefaults,
  PostsFeedBlock,
  resolvePostsFeedActiveSourceFilterLabels,
  resolvePostsFeedRouteState,
  type PostsFeedData,
} from "../../../core/widgets/core/postsFeed";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";

const StubEditor: ComponentType<WidgetEditorProps<PostsFeedData>> = () => null;

const createPost = (patch: Partial<PostSummary>): PostSummary => ({
  id: "post-1",
  typeId: "post",
  title: "Post one",
  slug: "post-one",
  status: "published",
  tags: [],
  data: {
    excerpt: "Post one excerpt",
  },
  createdAt: new Date("2026-02-22T10:00:00.000Z"),
  updatedAt: new Date("2026-02-22T10:00:00.000Z"),
  publishedAt: new Date("2026-02-22T10:00:00.000Z"),
  scheduledAt: null,
  author: {
    id: "author-1",
    name: "Editor",
    email: "editor@example.com",
  },
  seo: null,
  ...patch,
});

test("posts feed renders empty state without missing-source placeholder", () => {
  const html = renderToString(
    <PostsFeedBlock data={postsFeedDefaults} variant="cards" blockId="posts-feed-1" />
  );

  expect(html).toContain("No posts found");
  expect(html).toContain('data-content-list-state="empty"');
  expect(html).toContain('data-content-list-source="post"');
});

test("posts feed normalizer deduplicates manual IDs and maps to content list contract", () => {
  const normalized = normalizePostsFeedData({
    source: {
      mode: "manual",
      manualPostIds: [" post-1 ", "post-1", "post-2"],
      authorId: " author-2 ",
      featuredFirst: true,
      dateRange: {
        from: "2026-02-01",
        to: "2026-02-29",
      },
      limit: 999,
      sort: "title-asc",
    },
    title: "Latest releases",
    description: "Fresh product updates.",
    pagination: {
      mode: "view-all",
      pageSize: 5,
      viewAllHref: "",
      viewAllLabel: "Browse posts",
      loadMoreLabel: "More",
    },
    fields: {
      showImage: true,
      showExcerpt: true,
      showAuthor: false,
      showDate: false,
      showCta: true,
    },
    resolved: {
      items: [
        {
          id: "post-1",
          title: "Post one",
          imageSrc: "/media/post-one.jpg",
          authorName: "Editor",
          publishedAt: "2026-02-22T10:00:00.000Z",
          tags: ["news"],
        },
      ],
      total: 1,
      sourceMode: "manual",
      listPath: "/updates",
      resolvedAt: "2026-02-22T10:05:00.000Z",
    },
  });

  expect(normalized.source?.manualPostIds).toEqual(["post-1", "post-2"]);
  expect(normalized.source?.authorId).toBe("author-2");
  expect(normalized.source?.dateRange?.from).toBe("2026-02-01");
  expect(normalized.source?.dateRange?.to).toBe("");
  expect(normalized.source?.limit).toBe(24);
  expect(normalized.pagination?.mode).toBe("view-all");
  expect(normalized.fields?.showImage).toBe(true);

  const mapped = mapPostsFeedToContentListData(normalized);
  expect(mapped.source?.contentTypeId).toBe("post");
  expect(mapped.fields?.showMeta).toBe(true);
  expect(mapped.fields?.showImage).toBe(true);
  expect(mapped.resolved?.items?.[0]?.authorName).toBeUndefined();
  expect(mapped.resolved?.items?.[0]?.imageSrc).toBe("/media/post-one.jpg");
  expect(mapped.resolved?.items?.[0]?.tags).toEqual(["news"]);
  expect(mapped.title).toBe("Latest releases");
  expect(mapped.pagination?.viewAllLabel).toBe("Browse posts");
});

test("posts feed preserves none gap token through content list mapping", () => {
  const normalized = normalizePostsFeedData({
    ...postsFeedDefaults,
    style: {
      ...postsFeedDefaults.style,
      gap: "none",
    },
    resolved: {
      items: [
        {
          id: "post-1",
          title: "Post one",
          href: "/blog/post-one",
          excerpt: "Post one excerpt",
          status: "published",
        },
      ],
      total: 1,
      sourceMode: "latest",
      resolvedAt: "2026-02-22T10:05:00.000Z",
    },
  });

  expect(normalized.style?.gap).toBe("none");
  expect(mapPostsFeedToContentListData(normalized).style?.gap).toBe("none");
  expect(renderToString(<PostsFeedBlock data={normalized} variant="cards" />)).toContain("gap-0");
});

test("posts feed active source filter labels match runtime source-mode semantics", () => {
  const source: NonNullable<PostsFeedData["source"]> = {
    mode: "category",
    category: "audit-category",
    manualPostIds: ["post-1"],
    authorId: "author-1",
    featuredFirst: true,
    dateRange: {
      from: "2026-03-01",
      to: "2026-03-31",
    },
    limit: 3,
    sort: "published-desc",
  };

  expect(resolvePostsFeedActiveSourceFilterLabels(source)).toEqual([
    "Category: audit-category",
    "Author: author-1",
    "From: 2026-03-01",
    "To: 2026-03-31",
    "Featured first",
  ]);
  expect(resolvePostsFeedActiveSourceFilterLabels({ ...source, mode: "latest" })).toEqual([
    "Author: author-1",
    "From: 2026-03-01",
    "To: 2026-03-31",
    "Featured first",
  ]);
  expect(resolvePostsFeedActiveSourceFilterLabels({ ...source, mode: "featured" })).toEqual([
    "Author: author-1",
    "From: 2026-03-01",
    "To: 2026-03-31",
  ]);
  expect(resolvePostsFeedActiveSourceFilterLabels({ ...source, mode: "manual" })).toEqual([]);
});

test("posts feed cleared card background stays absent through content list mapping", () => {
  const normalized = normalizePostsFeedData({
    ...postsFeedDefaults,
    style: {},
    resolved: {
      items: [
        {
          id: "post-1",
          title: "Post one",
          href: "/blog/post-one",
          excerpt: "Post one excerpt",
          status: "published",
        },
      ],
      total: 1,
      sourceMode: "latest",
      resolvedAt: "2026-02-22T10:05:00.000Z",
    },
  });
  const mapped = mapPostsFeedToContentListData(normalized);
  const html = renderToString(<PostsFeedBlock data={normalized} variant="cards" />);

  expect(normalized.style?.backgroundColor).toBeUndefined();
  expect(mapped.style?.backgroundColor).toBeUndefined();
  expect(html).toContain('data-content-list-state="ready"');
  expect(html).not.toContain("background-color:");
});

test("posts feed renders section chrome, view-all fallback, and bounded motion", () => {
  const html = renderToString(
    <PostsFeedBlock
      data={{
        ...postsFeedDefaults,
        title: "Latest releases",
        description: "Fresh product updates.",
        pagination: {
          ...postsFeedDefaults.pagination,
          mode: "view-all",
        },
        style: {
          ...postsFeedDefaults.style,
          motion: "fade",
        },
        resolved: {
          items: [
            {
              id: "post-1",
              title: "Post one",
              href: "/news/post-one",
              excerpt: "Post one excerpt",
              status: "published",
            },
          ],
          total: 1,
          sourceMode: "latest",
          listPath: "/news",
          resolvedAt: "2026-02-22T10:05:00.000Z",
        },
      }}
      variant="cards"
      blockId="posts-feed-1"
    />
  );

  expect(html).toContain("Latest releases");
  expect(html).toContain("Fresh product updates.");
  expect(html).toContain('href="/news"');
  expect(html).toContain("View all posts");
  expect(html).toContain('data-posts-feed-motion="fade"');
});

test("posts feed makes missing route and view-all destination states explicit", () => {
  const data = normalizePostsFeedData({
    ...postsFeedDefaults,
    pagination: {
      ...postsFeedDefaults.pagination,
      mode: "view-all",
      viewAllHref: "",
      viewAllLabel: "All posts",
    },
    fields: {
      ...postsFeedDefaults.fields,
      showCta: true,
    },
    resolved: {
      items: [
        {
          id: "post-1",
          title: "Post without route",
          excerpt: "No linked destination yet.",
          status: "published",
        },
      ],
      total: 1,
      sourceMode: "latest",
      listPath: "",
      resolvedAt: "2026-02-22T10:05:00.000Z",
    },
  });
  const routeState = resolvePostsFeedRouteState(data);
  const html = renderToString(
    <PostsFeedBlock data={data} variant="cards" blockId="posts-feed-1" />
  );

  expect(routeState.cardLinks.mode).toBe("missing_detail_route");
  expect(routeState.viewAll.mode).toBe("missing_view_all_destination");
  expect(html).toContain('data-content-list-link-unavailable="1"');
  expect(html).toContain("Links unavailable until a detail route is configured.");
  expect(html).toContain('data-content-list-cta-disabled="missing-route"');
  expect(html).toContain('data-content-list-view-all-unavailable="1"');
  expect(html).toContain(
    "View all is unavailable until a destination or list route is configured."
  );
  expect(html).not.toContain('href="/post-without-route"');
});

test("posts feed smoke inventory targets the Posts Feed fixture and not the stale audit route", async () => {
  const inventory = JSON.parse(
    await Bun.file("_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json").text()
  ) as {
    widgets?: Array<{
      widgetType?: string;
      adminFixtureSlug?: string;
      publicPath?: string | null;
      publicFixtureStatus?: string;
    }>;
  };

  const postsFeedEntry = inventory.widgets?.find((entry) => entry.widgetType === "posts-feed");

  expect(postsFeedEntry).toEqual(
    expect.objectContaining({
      adminFixtureSlug: "/posts-feed-test-page",
      publicPath: "/posts-feed-test-page",
      publicFixtureStatus: "published",
    })
  );
  expect(postsFeedEntry?.adminFixtureSlug).not.toBe("/ctr-listing-filters-2305");
  expect(postsFeedEntry?.publicPath).not.toBe("/test-posts-feed-0516");
});

test("posts feed resolver filters by preview visibility and route mapping", async () => {
  const resolved = await resolvePostsFeedRuntimeData(
    {
      ...postsFeedDefaults,
      source: {
        ...postsFeedDefaults.source,
        mode: "latest",
        limit: 10,
        sort: "published-desc",
      },
    },
    {
      preview: false,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
        },
      ],
    },
    {
      listPosts: async () => [
        createPost({
          id: "post-published",
          title: "Published",
          slug: "published",
          status: "published",
          publishedAt: new Date("2026-02-22T12:00:00.000Z"),
        }),
        createPost({
          id: "post-draft",
          title: "Draft",
          slug: "draft",
          status: "draft",
          publishedAt: null,
        }),
      ],
    }
  );

  expect(resolved.total).toBe(1);
  expect(resolved.items).toHaveLength(1);
  expect(resolved.items[0]?.title).toBe("Published");
  expect(resolved.items[0]?.href).toBe("/news/published");
  expect(resolved.listPath).toBe("/news");
});

test("posts feed resolver supports featured, category and manual source modes", async () => {
  const dataset = [
    createPost({
      id: "post-featured",
      title: "Featured",
      slug: "featured",
      tags: ["featured", "updates"],
    }),
    createPost({
      id: "post-automotive",
      title: "Automotive",
      slug: "automotive",
      tags: ["automotive"],
    }),
    createPost({
      id: "post-manual",
      title: "Manual",
      slug: "manual",
      tags: ["custom"],
    }),
  ];

  const featured = await resolvePostsFeedRuntimeData(
    {
      ...postsFeedDefaults,
      source: {
        ...postsFeedDefaults.source,
        mode: "featured",
        limit: 5,
      },
    },
    {
      preview: true,
      contentRoutes: [],
    },
    {
      listPosts: async () => dataset,
    }
  );
  expect(featured.items.map((item) => item.id)).toEqual(["post-featured"]);

  const category = await resolvePostsFeedRuntimeData(
    {
      ...postsFeedDefaults,
      source: {
        ...postsFeedDefaults.source,
        mode: "category",
        category: "auto",
        limit: 5,
      },
    },
    {
      preview: true,
      contentRoutes: [],
    },
    {
      listPosts: async () => dataset,
    }
  );
  expect(category.items.map((item) => item.id)).toEqual(["post-automotive"]);

  const manual = await resolvePostsFeedRuntimeData(
    {
      ...postsFeedDefaults,
      source: {
        ...postsFeedDefaults.source,
        mode: "manual",
        manualPostIds: ["post-manual", "post-featured"],
        limit: 5,
      },
    },
    {
      preview: true,
      contentRoutes: [],
    },
    {
      listPosts: async () => dataset,
    }
  );
  expect(manual.items.map((item) => item.id)).toEqual(["post-manual", "post-featured"]);
});

test("posts feed clears impossible calendar dates during normalization", () => {
  const normalized = normalizePostsFeedData({
    source: {
      ...postsFeedDefaults.source,
      dateRange: {
        from: "2026-02-31",
        to: "2026-13-02",
      },
    },
  });

  expect(normalized.source?.dateRange?.from).toBe("");
  expect(normalized.source?.dateRange?.to).toBe("");
});

test("posts feed resolver maps images, tags, author/date filters, featured-first ordering, and paged navigation", async () => {
  const dataset = [
    createPost({
      id: "post-1",
      title: "Draft roadmap",
      slug: "draft-roadmap",
      status: "draft",
      tags: ["operations"],
      author: {
        id: "author-2",
        name: "Ops",
        email: "ops@example.com",
      },
      data: {
        featuredImage: "media-1",
        featuredImageAlt: "Roadmap preview",
      },
      publishedAt: null,
      updatedAt: new Date("2026-02-26T10:00:00.000Z"),
    }),
    createPost({
      id: "post-2",
      title: "Launch note",
      slug: "launch-note",
      tags: ["featured", "news"],
      author: {
        id: "author-1",
        name: "Editor",
        email: "editor@example.com",
      },
      data: {
        featuredImage: "media-2",
      },
      publishedAt: new Date("2026-02-25T10:00:00.000Z"),
      updatedAt: new Date("2026-02-25T10:00:00.000Z"),
    }),
    createPost({
      id: "post-3",
      title: "Weekly memo",
      slug: "weekly-memo",
      tags: ["news"],
      author: {
        id: "author-1",
        name: "Editor",
        email: "editor@example.com",
      },
      data: {
        coverImage: "/media/weekly-memo.jpg",
      },
      publishedAt: new Date("2026-02-24T10:00:00.000Z"),
      updatedAt: new Date("2026-02-24T10:00:00.000Z"),
    }),
  ];

  const resolved = await resolvePostsFeedRuntimeData(
    {
      ...postsFeedDefaults,
      source: {
        ...postsFeedDefaults.source,
        mode: "latest",
        authorId: "author-1",
        featuredFirst: true,
        dateRange: {
          from: "2026-02-20",
          to: "2026-02-26",
        },
      },
      pagination: {
        ...postsFeedDefaults.pagination,
        mode: "paged",
        pageSize: 1,
      },
      fields: {
        ...postsFeedDefaults.fields,
        showImage: true,
      },
    },
    {
      preview: true,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
        },
      ],
      runtimeSearchParams: new URLSearchParams("cl.posts-feed-1.page=2"),
      blockId: "posts-feed-1",
    },
    {
      listPosts: async () => dataset,
    }
  );

  expect(resolved.total).toBe(2);
  expect(resolved.items).toHaveLength(1);
  expect(resolved.items[0]).toEqual(
    expect.objectContaining({
      id: "post-3",
      href: "/blog/weekly-memo",
      imageSrc: "/media/weekly-memo.jpg",
      tags: ["news"],
    })
  );
  expect(resolved.listPath).toBe("/blog");
  expect(resolved.runtime).toEqual(
    expect.objectContaining({
      page: 2,
      pageSize: 1,
      totalPages: 2,
      previousPageHref: "?",
    })
  );
});

test("posts feed load-more grows cumulatively and view-all ignores stale page params", async () => {
  const dataset = [
    createPost({
      id: "post-1",
      slug: "launch-note",
      publishedAt: new Date("2026-02-25T10:00:00.000Z"),
      updatedAt: new Date("2026-02-25T10:00:00.000Z"),
    }),
    createPost({
      id: "post-2",
      slug: "weekly-memo",
      publishedAt: new Date("2026-02-24T10:00:00.000Z"),
      updatedAt: new Date("2026-02-24T10:00:00.000Z"),
    }),
    createPost({
      id: "post-3",
      slug: "ops-update",
      publishedAt: new Date("2026-02-23T10:00:00.000Z"),
      updatedAt: new Date("2026-02-23T10:00:00.000Z"),
    }),
  ];

  const baseInput: PostsFeedData = {
    ...postsFeedDefaults,
    source: {
      ...postsFeedDefaults.source,
      mode: "latest",
      limit: 3,
      sort: "published-desc",
    },
    pagination: {
      ...postsFeedDefaults.pagination,
      pageSize: 1,
    },
  };

  const runtimeOptions = {
    preview: true,
    contentRoutes: [
      {
        type: "posts",
        listPath: "/news",
        detailPath: "/news/:slug",
        enabled: true,
      },
    ],
    runtimeSearchParams: new URLSearchParams("cl.posts-feed-1.page=2"),
    blockId: "posts-feed-1",
  };

  const loadMore = await resolvePostsFeedRuntimeData(
    {
      ...baseInput,
      pagination: {
        ...baseInput.pagination,
        mode: "load-more",
      },
    },
    runtimeOptions,
    {
      listPosts: async () => dataset,
    }
  );

  expect(loadMore.items.map((item) => item.id)).toEqual(["post-1", "post-2"]);
  expect(loadMore.runtime).toEqual(
    expect.objectContaining({
      page: 2,
      pageSize: 1,
      totalPages: 3,
      nextPageHref: "?cl.posts-feed-1.page=3",
    })
  );

  const viewAll = await resolvePostsFeedRuntimeData(
    {
      ...baseInput,
      pagination: {
        ...baseInput.pagination,
        mode: "view-all",
      },
    },
    runtimeOptions,
    {
      listPosts: async () => dataset,
    }
  );

  expect(viewAll.items.map((item) => item.id)).toEqual(["post-1"]);
  expect(viewAll.runtime).toEqual(
    expect.objectContaining({
      page: 1,
      pageSize: 1,
      totalPages: 3,
      nextPageHref: "?cl.posts-feed-1.page=2",
    })
  );
});

test("posts feed omits CTA hrefs when no detail route exists", async () => {
  const resolved = await resolvePostsFeedRuntimeData(
    postsFeedDefaults,
    {
      preview: true,
      contentRoutes: [],
    },
    {
      listPosts: async () => [createPost({ id: "post-no-route", slug: "no-route" })],
    }
  );

  expect(resolved.items[0]?.href).toBeUndefined();
});

test("posts feed validator accepts normalized payload and visual owns variant", () => {
  clearWidgets();
  const widget = createPostsFeedWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "posts-feed-1",
      type: "posts-feed",
      variant: "cards",
      data: {
        ...postsFeedDefaults,
        source: {
          ...postsFeedDefaults.source,
          mode: "latest",
          limit: 6,
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("posts feed exposes a strict source, visual, and readonly advanced editor contract", () => {
  const widget = createPostsFeedWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });
  const writableOwners = new Map<string, string>();

  for (const section of widget.editorContract?.sections ?? []) {
    for (const path of section.writablePaths) {
      expect(writableOwners.has(path)).toBe(false);
      writableOwners.set(path, section.mode);
    }
  }

  expect(validation.valid).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "posts-feed.wizard.source-setup",
    "posts-feed.visual.display",
    "posts-feed.visual.section-header",
    "posts-feed.visual.layout-style",
    "posts-feed.visual.pagination",
    "posts-feed.visual.empty-state",
    "posts-feed.advanced.resolved-query",
    "posts-feed.advanced.runtime-status",
    "posts-feed.advanced.contract-summary",
  ]);
  expect(writableOwners.get("source.mode")).toBe("wizard");
  expect(writableOwners.get("source.manualPostIds")).toBe("wizard");
  expect(writableOwners.get("variant")).toBe("visual");
  expect(writableOwners.get("pagination.mode")).toBe("visual");
  expect(writableOwners.get("style.cardStyle")).toBe("visual");
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .flatMap((section) => section.writablePaths)
  ).toEqual([]);
});

test("posts feed validator rejects unknown nested keys", () => {
  clearWidgets();
  registerWidget(
    createPostsFeedWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "posts-feed-invalid-source",
      type: "posts-feed",
      variant: "cards",
      data: {
        ...postsFeedDefaults,
        source: {
          ...postsFeedDefaults.source,
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "posts-feed-invalid-runtime",
      type: "posts-feed",
      variant: "cards",
      data: {
        ...postsFeedDefaults,
        pagination: {
          ...postsFeedDefaults.pagination,
          extra: "nope",
        },
        style: {
          ...(postsFeedDefaults.style ?? {}),
          extra: "#000000",
        },
        resolved: {
          items: [],
          total: 1,
          sourceMode: "latest",
          listPath: "/updates",
          resolvedAt: "2026-02-22T10:05:00.000Z",
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});
