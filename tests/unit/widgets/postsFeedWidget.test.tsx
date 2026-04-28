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
      limit: 999,
      sort: "title-asc",
    },
    fields: {
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
          authorName: "Editor",
          publishedAt: "2026-02-22T10:00:00.000Z",
          tags: ["news"],
        },
      ],
      total: 1,
      sourceMode: "manual",
      resolvedAt: "2026-02-22T10:05:00.000Z",
    },
  });

  expect(normalized.source?.manualPostIds).toEqual(["post-1", "post-2"]);
  expect(normalized.source?.limit).toBe(24);

  const mapped = mapPostsFeedToContentListData(normalized);
  expect(mapped.source?.contentTypeId).toBe("post");
  expect(mapped.fields?.showMeta).toBe(false);
  expect(mapped.resolved?.items?.[0]?.authorName).toBeUndefined();
  expect(mapped.resolved?.items?.[0]?.tags).toEqual([]);
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

  const advancedHtml = renderToString(
    <PostsFeedAdvancedEditor
      value={postsFeedDefaults}
      onChange={() => undefined}
      variant="cards"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime payload");
});
