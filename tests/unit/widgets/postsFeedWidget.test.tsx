import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  PostsFeedAdvancedEditor,
  PostsFeedVisualEditor,
  PostsFeedWizardEditor,
} from "../../../core/admin/ui/widgets/editors/PostsFeedEditors";
import { resolvePostsFeedRuntimeData } from "../../../core/services/content/postsFeedResolver";
import type { PostSummary } from "../../../core/services/content/postsService";
import {
  createPostsFeedWidget,
  mapPostsFeedToContentListData,
  normalizePostsFeedData,
  postsFeedDefaults,
  PostsFeedBlock,
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

test("posts feed editors render source and runtime sections", () => {
  const wizardHtml = renderToString(
    <PostsFeedWizardEditor
      value={postsFeedDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Source setup");
  expect(wizardHtml).toContain("Display");

  const visualHtml = renderToString(
    <PostsFeedVisualEditor
      value={postsFeedDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Layout and style");
  expect(visualHtml).toContain("Empty state");
  expect(visualHtml).toContain("Runtime status");

  const advancedHtml = renderToString(
    <PostsFeedAdvancedEditor
      value={postsFeedDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime payload");
  expect(advancedHtml).toContain("Runtime status");
});
