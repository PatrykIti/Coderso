import React from "react";
// @vitest-environment happy-dom

import { expect, test } from "vitest";
import type { ComponentType } from "react";

import {
  renderPublicPageHtml,
  renderPublicPageRuntimeHtml,
} from "../../../core/site/renderPublicPage";
import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  createContentListWidget,
  type ContentListData,
} from "../../../core/widgets/core/contentList";
import { createPostsFeedWidget, type PostsFeedData } from "../../../core/widgets/core/postsFeed";
import {
  createEntryTeaserWidget,
  type EntryTeaserData,
} from "../../../core/widgets/core/entryTeaser";
import {
  createTemplateSectionWidget,
  type TemplateSectionData,
} from "../../../core/widgets/core/templateSection";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const StubContentListEditor: ComponentType<WidgetEditorProps<ContentListData>> = () => null;
const StubPostsFeedEditor: ComponentType<WidgetEditorProps<PostsFeedData>> = () => null;
const StubEntryTeaserEditor: ComponentType<WidgetEditorProps<EntryTeaserData>> = () => null;

const StubTemplateSectionEditor: ComponentType<WidgetEditorProps<TemplateSectionData>> = () => null;

const DummyWidgetEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

test("renderPublicPageHtml renders title and preview banner", () => {
  const html = renderPublicPageHtml({
    title: "About Us",
    blocks: [],
    cssHref: "/site/assets/site.css",
    inlineCss: ":root{--color-bg:#ffffff;}",
    isPreview: true,
  });

  expect(html).toContain("<title>About Us</title>");
  expect(html).toContain("Preview mode");
  expect(html).toContain("/site/assets/site.css");
  expect(html).toContain('rel="preload"');
  expect(html).toContain('as="style"');
  expect(html).toContain("body{opacity:0}");
  expect(html).toContain("--color-bg:#ffffff");
});

test("renderPublicPageHtml includes dev module scripts when provided", () => {
  const html = renderPublicPageHtml({
    title: "Dev preview",
    blocks: [],
    inlineCss: ":root{--color-bg:#fff;}",
    devModuleScripts: [
      "http://localhost:5174/site/@vite/client",
      "http://localhost:5174/site/main.ts",
    ],
  });

  expect(html).toContain("http://localhost:5174/site/@vite/client");
  expect(html).toContain("http://localhost:5174/site/main.ts");
  expect(html).toContain('type="module"');
});

test("renderPublicPageHtml hides preview until load when using dev modules", () => {
  const html = renderPublicPageHtml({
    title: "Dev preview",
    blocks: [],
    inlineCss: ":root{--color-bg:#fff;}",
    isPreview: true,
    devModuleScripts: [
      "http://localhost:5174/site/@vite/client",
      "http://localhost:5174/site/main.ts",
    ],
  });

  expect(html).toContain("body{opacity:0}");
  expect(html).toContain('window.addEventListener("load"');
});

test("renderPublicPageHtml applies wrapper settings and inherited block defaults", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Home",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: heroDefaults,
        layout: {
          container: "inherit",
          padding: { top: "inherit", bottom: "inherit" },
          margin: { top: "none", bottom: "none" },
          background: { color: "transparent", image: null },
        },
      },
    ],
    layoutSettings: {
      wrapper: {
        container: "default",
        maxWidth: "5xl",
        padding: { top: "md", bottom: "lg" },
        background: {
          color: "#fafafa",
          image: null,
          media: {
            type: "none",
            source: "external",
            src: null,
          },
        },
      },
      sections: {
        gap: "xl",
        defaults: {
          container: "narrow",
          padding: { top: "sm", bottom: "sm" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  });

  expect(html).toContain("max-w-5xl");
  expect(html).toContain("gap-12");
  expect(html).toContain("pt-6");
  expect(html).toContain("pb-8");
  expect(html).toContain("background-color:#fafafa");
  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-4");
});

test("renderPublicPageHtml renders wrapper background video when configured", () => {
  const html = renderPublicPageHtml({
    title: "Home",
    blocks: [],
    layoutSettings: {
      wrapper: {
        container: "full",
        padding: { top: "none", bottom: "none" },
        background: {
          color: "transparent",
          image: null,
          media: {
            type: "video",
            source: "external",
            src: "https://cdn.example.com/background.mp4",
          },
        },
      },
      sections: {
        gap: "none",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  });

  expect(html).toContain("<video");
  expect(html).toContain("https://cdn.example.com/background.mp4");
  expect(html).toContain("absolute inset-0 h-full w-full object-cover");
});

test("renderPublicPageHtml filters blocks by preview device visibility", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Home",
    previewDevice: "tablet",
    blocks: [
      {
        id: "hero-desktop",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Desktop Hero" },
        visibility: { enabled: true, devices: ["desktop"] },
      },
      {
        id: "hero-tablet",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Tablet Hero" },
        visibility: { enabled: true, devices: ["tablet"] },
      },
    ],
  });

  expect(html).not.toContain("Desktop Hero");
  expect(html).toContain("Tablet Hero");
});

test("renderPublicPageHtml renders content list resolved payload deterministically", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubContentListEditor,
      visual: StubContentListEditor,
      advanced: StubContentListEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Blog",
    blocks: [
      {
        id: "content-list-1",
        type: "content-list",
        variant: "cards",
        data: {
          source: {
            contentTypeId: "blog-type-id",
            statusScope: "published",
            limit: 6,
            sort: "published-desc",
          },
          filters: {},
          fields: {
            showImage: false,
            showExcerpt: true,
            showMeta: true,
            showCta: true,
          },
          emptyState: {
            title: "No posts",
            description: "Publish your first post.",
          },
          style: {
            columns: "2",
            gap: "md",
            cardStyle: "outlined",
            ctaLabel: "Read post",
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            textColor: "var(--color-text)",
          },
          resolved: {
            items: [
              {
                id: "post-1",
                title: "First post",
                href: "/blog/first-post",
                excerpt: "Post summary.",
                status: "published",
                publishedAt: "2026-02-08T10:00:00.000Z",
              },
            ],
            total: 1,
            sourceTypeId: "blog-type-id",
            sourceTypeSlug: "blog",
            resolvedAt: "2026-02-08T10:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain("First post");
  expect(html).toContain("Read post");
  expect(html).toContain('dateTime="2026-02-08T10:00:00.000Z"');
  expect(html).toContain("Feb 8, 2026");
  expect(html).toContain('aria-label="Read post: First post"');
  expect(html).toContain('data-content-list-variant="cards"');
  expect(html).toContain('data-content-list-items="1"');
  expect(html).toContain('data-content-list-state="ready"');
});

test("renderPublicPageHtml renders content list image aspect and CTA fallback markers", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubContentListEditor,
      visual: StubContentListEditor,
      advanced: StubContentListEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Blog",
    blocks: [
      {
        id: "content-list-2",
        type: "content-list",
        variant: "cards",
        data: {
          source: {
            contentTypeId: "blog-type-id",
            statusScope: "published",
            limit: 6,
            sort: "published-desc",
          },
          filters: {},
          fields: {
            showImage: true,
            showExcerpt: true,
            showMeta: true,
            showCta: true,
          },
          emptyState: {
            title: "No posts",
            description: "Publish your first post.",
          },
          style: {
            columns: "2",
            gap: "md",
            cardStyle: "outlined",
            imageAspect: "wide",
            ctaLabel: "Read post",
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
          },
          resolved: {
            items: [
              {
                id: "post-1",
                title: "First post",
                excerpt: "Post summary.",
                imageSrc: "/media/first-post.jpg",
                status: "published",
                publishedAt: "2026-02-08T10:00:00.000Z",
              },
            ],
            total: 1,
            sourceTypeId: "blog-type-id",
            sourceTypeSlug: "blog",
            resolvedAt: "2026-02-08T10:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain("aspect-[16/9]");
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain("Read post");
  expect(html).not.toContain('href="/blog/first-post"');
});

test("renderPublicPageHtml renders content list section context and listing empty copy", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubContentListEditor,
      visual: StubContentListEditor,
      advanced: StubContentListEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Blog",
    blocks: [
      {
        id: "content-list-3",
        type: "content-list",
        variant: "cards",
        data: {
          title: "Latest work",
          description: "Fresh additions from the listing query.",
          source: {
            mode: "listing",
            listingQueryId: "query-1",
            listingTemplateId: "template-1",
            contentTypeId: "",
            statusScope: "published",
            limit: 6,
            sort: "published-desc",
          },
          filters: {},
          fields: {
            showImage: false,
            showExcerpt: true,
            showMeta: true,
            showCta: true,
          },
          emptyState: {
            title: "No posts",
            description: "Adjust filters or publish entries for this content type.",
          },
          style: {
            columns: "2",
            gap: "md",
            cardStyle: "outlined",
            ctaLabel: "Read post",
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
          },
          resolved: {
            items: [],
            total: 0,
            listingQueryId: "query-1",
            listingTemplateId: "template-1",
            resolvedAt: "2026-02-08T10:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain('aria-labelledby="content-list-3-title"');
  expect(html).toContain("Latest work");
  expect(html).toContain("Fresh additions from the listing query.");
  expect(html).toContain("Adjust the listing query or publish matching entries.");
  expect(html).not.toContain("Adjust filters or publish entries for this content type.");
});

test("renderPublicPageHtml renders content list tag badges when configured", () => {
  clearWidgets();
  registerWidget(
    createContentListWidget({
      wizard: StubContentListEditor,
      visual: StubContentListEditor,
      advanced: StubContentListEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Blog",
    blocks: [
      {
        id: "content-list-4",
        type: "content-list",
        variant: "cards",
        data: {
          source: {
            contentTypeId: "blog-type-id",
            statusScope: "published",
            limit: 6,
            sort: "published-desc",
          },
          filters: {},
          fields: {
            showImage: false,
            showExcerpt: true,
            showMeta: true,
            showCta: true,
          },
          emptyState: {
            title: "No posts",
            description: "Publish your first post.",
          },
          style: {
            columns: "2",
            gap: "md",
            cardStyle: "outlined",
            tagMode: "badges",
            tagLimit: 1,
            ctaLabel: "Read post",
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            textColor: "var(--color-text)",
          },
          resolved: {
            items: [
              {
                id: "post-1",
                title: "First post",
                href: "/blog/first-post",
                excerpt: "Post summary.",
                tags: ["featured", "news"],
                status: "published",
                publishedAt: "2026-02-08T10:00:00.000Z",
              },
            ],
            total: 1,
            sourceTypeId: "blog-type-id",
            sourceTypeSlug: "blog",
            resolvedAt: "2026-02-08T10:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain("featured");
  expect(html).not.toContain("featured, news");
});

test("renderPublicPageHtml renders entry teaser resolved payload deterministically", () => {
  clearWidgets();
  registerWidget(
    createEntryTeaserWidget({
      wizard: StubEntryTeaserEditor,
      visual: StubEntryTeaserEditor,
      advanced: StubEntryTeaserEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "Blog",
    blocks: [
      {
        id: "entry-teaser-1",
        type: "entry-teaser",
        variant: "horizontal",
        data: {
          sourceMode: "manual",
          source: {
            contentTypeId: "blog-type-id",
            entryId: "entry-1",
          },
          fields: {
            showImage: true,
            showExcerpt: true,
            showMeta: true,
            showTags: true,
            tagLimit: 2,
          },
          section: {
            title: "Featured article",
            headingLevel: "h2",
          },
          title: {
            headingLevel: "h4",
          },
          media: {
            mode: "image",
            aspect: "16:9",
            height: "sm",
            fit: "cover",
          },
          layout: {
            maxWidth: "full",
          },
          cta: {
            label: "Read post",
            hrefMode: "auto",
            href: "",
          },
          style: {
            surface: "var(--color-bg)",
            border: "var(--color-border)",
            radius: "lg",
            spacing: "md",
          },
          fallback: {
            title: "No entry",
            description: "Pick an entry",
            fallbackToLatest: true,
          },
          resolved: {
            item: {
              id: "entry-1",
              title: "Quarterly update",
              href: "/blog/quarterly-update",
              excerpt: "Highlights from this quarter.",
              imageSrc: "https://cdn.example.com/quarterly-update.jpg",
              tags: ["news", "featured", "ops"],
              status: "published",
              publishedAt: "2026-02-09T12:00:00.000Z",
            },
            sourceTypeId: "blog-type-id",
            sourceTypeSlug: "blog",
            resolvedAt: "2026-02-09T12:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain("Featured article");
  expect(html).toContain("Quarterly update");
  expect(html).toContain("Read post");
  expect(html).toContain("max-w-none");
  expect(html).toContain('data-entry-teaser-tag-limit="2"');
  expect(html).toContain('data-entry-teaser-media-mode="image"');
  expect(html).toContain('width="640"');
  expect(html).toContain('height="360"');
  expect(html).toContain("featured");
  expect(html).not.toContain(">ops<");
  expect(html).toContain("<h2");
  expect(html).toContain("Featured article</h2>");
  expect(html).toContain("<h4");
  expect(html).toContain("Quarterly update</h4>");
  expect(html).toContain('data-entry-teaser-variant="horizontal"');
  expect(html).toContain('data-entry-teaser-source-mode="manual"');
  expect(html).toContain('data-entry-teaser-state="ready"');
});

test("renderPublicPageHtml renders posts feed resolved payload deterministically", () => {
  clearWidgets();
  registerWidget(
    createPostsFeedWidget({
      wizard: StubPostsFeedEditor,
      visual: StubPostsFeedEditor,
      advanced: StubPostsFeedEditor,
    })
  );

  const html = renderPublicPageHtml({
    title: "News",
    blocks: [
      {
        id: "posts-feed-1",
        type: "posts-feed",
        variant: "cards",
        data: {
          source: {
            mode: "latest",
            limit: 3,
            sort: "published-desc",
          },
          fields: {
            showExcerpt: true,
            showAuthor: true,
            showDate: true,
            showCta: true,
          },
          emptyState: {
            title: "No posts found",
            description: "Publish your first post.",
          },
          style: {
            columns: "2",
            gap: "md",
            cardStyle: "outlined",
            ctaLabel: "Read post",
            backgroundColor: "var(--color-bg)",
            borderColor: "var(--color-border)",
            textColor: "var(--color-text)",
          },
          resolved: {
            items: [
              {
                id: "post-1",
                title: "Latest update",
                href: "/news/latest-update",
                excerpt: "Highlights from this week.",
                status: "published",
                authorName: "Editor",
                publishedAt: "2026-02-22T08:00:00.000Z",
              },
            ],
            total: 1,
            sourceMode: "latest",
            resolvedAt: "2026-02-22T08:01:00.000Z",
          },
        },
      },
    ],
  });

  expect(html).toContain("Latest update");
  expect(html).toContain("Read post");
  expect(html).toContain('dateTime="2026-02-22T08:00:00.000Z"');
  expect(html).toContain("Feb 22, 2026");
  expect(html).toContain('aria-label="Read post: Latest update"');
  expect(html).toContain('data-content-list-source="post"');
  expect(html).toContain('data-content-list-items="1"');
  expect(html).toContain('data-content-list-state="ready"');
});

test("renderPublicPageRuntimeHtml renders deterministic template marker", async () => {
  const html = await renderPublicPageRuntimeHtml({
    title: "Home",
    blocks: [],
    inlineCss: ":root{--color-bg:#ffffff;}",
    themeName: "default",
    templateKey: "landing",
  });

  expect(html).toContain('data-template="page-landing"');
  expect(html).toContain("This page has no content yet.");
});

test("renderPublicPageRuntimeHtml normalizes template keys for runtime markers", async () => {
  const html = await renderPublicPageRuntimeHtml({
    title: "About",
    blocks: [],
    inlineCss: ":root{--color-bg:#ffffff;}",
    themeName: "default",
    templateKey: " About us ",
  });

  expect(html).toContain('data-template="page-about-us"');
});

test("renderPublicPageHtml renders template sections deterministically", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubTemplateSectionEditor,
      visual: StubTemplateSectionEditor,
      advanced: StubTemplateSectionEditor,
    })
  );
  registerWidget({
    type: "dummy",
    title: "Dummy",
    description: "Test widget",
    category: "layout",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: {
      wizard: DummyWidgetEditor,
      visual: DummyWidgetEditor,
      advanced: DummyWidgetEditor,
    },
    render: () => <div data-dummy="true" />,
  });

  const html = renderPublicPageHtml({
    title: "Home",
    blocks: [
      {
        id: "template-section-1",
        type: "template-section",
        variant: "default",
        data: {
          templateId: "template-1",
          templateName: "Hero Cluster",
          resolved: {
            blocks: [{ id: "dummy-1", type: "dummy", variant: "default", data: {} }],
          },
        },
      },
    ],
  });

  expect(html).toContain('data-template-section-state="ready"');
  expect(html).toContain('data-dummy="true"');
});
